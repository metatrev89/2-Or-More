import React, { useEffect, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts, timing } from '../../theme';
import { BUILD_FRAGMENTS, BUILD_LINES, MOCK_AFFS } from '../../api/mockData';
import { AiSpark, Mono, PillButton, Serif } from '../../components/ui';
import { saveAffirmationSet } from '../../api/affirmationsRepo';
import { useStore } from '../../store';
import { api } from '../../api/client';

function Shimmer({ children, dur = 1600 }: { children: React.ReactNode; dur?: number }) {
  const op = useSharedValue(0.35);
  useEffect(() => { op.value = withRepeat(withTiming(1, { duration: dur / 2 }), -1, true); }, [op, dur]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** The build moment (design screen 4): ink theater while the AI writes. */
export default function BuildScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Build'>) {
  const set = useStore(s => s.set);
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    const t1 = setTimeout(() => setLineIdx(1), timing.buildLineMs);
    const t2 = setTimeout(() => setLineIdx(2), timing.buildLineMs * 2);
    const load = (async () => {
      const affs = await api.generateAffirmations('me');
      set({ affirmations: affs, reviewIndex: 0 });
      // Persist immediately, while the backend's ids are still in hand — voice
      // recordings are keyed by affirmation id, so losing the set here orphans
      // every recording made against it.
      void saveAffirmationSet(affs);
    })();
    const t3 = setTimeout(async () => { await load; setDone(true); }, timing.buildDoneMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [set]);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 44 }}>
      {BUILD_FRAGMENTS.map(f => (
        <Text key={f.text} style={{
          position: 'absolute', left: f.left * width, top: f.top * height,
          fontFamily: fonts.serifItalic, fontSize: f.size, color: colors.creamOnDarkFaint,
        }}>
          {f.text}
        </Text>
      ))}
      {!done ? (
        <View style={{ alignItems: 'center' }}>
          <Shimmer><AiSpark size={44} /></Shimmer>
          <Shimmer dur={2400}>
            <Serif size={24} color={colors.cream} style={{ marginTop: 30 }}>{BUILD_LINES[lineIdx]}</Serif>
          </Shimmer>
        </View>
      ) : (
        <Animated.View entering={FadeInUp.duration(600)} style={{ alignItems: 'center' }}>
          <Mono size={15} color={colors.gold} style={{ letterSpacing: 2, marginBottom: 16 }}>
            {MOCK_AFFS.length} / {MOCK_AFFS.length}
          </Mono>
          <Serif size={30} color={colors.cream} style={{ textAlign: 'center', lineHeight: 40 }}>
            Your affirmations{'\n'}are ready.
          </Serif>
          <PillButton
            label="See them" height={54}
            onPress={() => navigation.navigate('Review')}
            bg={colors.cream} color={colors.ink}
            style={{ marginTop: 38, paddingHorizontal: 44 }}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}
