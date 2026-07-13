import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts, timing } from '../../theme';
import { MANIFESTO_LINES } from '../../api/mockData';
import { PillButton, Serif } from '../../components/ui';

/** Drifting serif word from the cold open (design: drift1/2/3 keyframes). */
function DriftWord({ text, top, left, right, bottom, color, size, dur, rot }: {
  text: string; top?: string; left?: number; right?: number; bottom?: string;
  color: string; size: number; dur: number; rot: string;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-14, { duration: dur / 2, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [y, dur]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: rot }] }));
  return (
    <Animated.Text style={[{
      position: 'absolute', top: top as never, left, right, bottom: bottom as never,
      fontFamily: fonts.serifItalic, fontSize: size, color,
    }, style]}>
      {text}
    </Animated.Text>
  );
}

const WORDS = [
  { text: 'visualize', top: '19%', left: 36, color: colors.warmGray, size: 24, dur: 5500, rot: '-2deg' },
  { text: 'experience', top: '31%', right: 40, color: colors.gold, size: 22, dur: 6500, rot: '1.5deg' },
  { text: 'hear', bottom: '24%', left: 52, color: colors.teal, size: 23, dur: 6000, rot: '-1deg' },
  { text: 'scheduled', top: '12%', right: 64, color: colors.teal, size: 21, dur: 7000, rot: '-1deg' },
  { text: 'condition your mind', bottom: '14%', right: 44, color: colors.warmGray, size: 20, dur: 5800, rot: '1.5deg' },
  { text: 'progress', bottom: '33%', right: 56, color: colors.gold, size: 22, dur: 6800, rot: '-2deg' },
  { text: 'maximize results', top: '9%', left: 44, color: colors.teal, size: 20, dur: 7200, rot: '1.5deg' },
  { text: 'minutes per day', bottom: '15%', left: 40, color: colors.gold, size: 20, dur: 6400, rot: '-1deg' },
];

/** Gentle horizontal nudge on the swipe hint chevron. */
function SwipeHint() {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(6, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>Swipe</Text>
      <Animated.Text style={[{ fontSize: 16, color: colors.warmGray }, style]}>›</Animated.Text>
    </View>
  );
}

export default function IntroScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Intro'>) {
  const [showPager, setShowPager] = useState(false);
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowPager(true), timing.introAutoAdvanceMs);
    return () => clearTimeout(t);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const onLast = page === MANIFESTO_LINES.length - 1;
  const toSignup = () => navigation.replace('Signup');

  if (!showPager) {
    return (
      <Pressable onPress={() => setShowPager(true)} style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 44 }}>
        <Animated.View entering={FadeIn.duration(1400)} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {WORDS.map(w => <DriftWord key={w.text} {...w} />)}
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(900)} style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 76, color: colors.ink, letterSpacing: -2 }}>
            2<Text style={{ color: colors.gold }}>+</Text>
          </Text>
          <Serif size={21} color={colors.warmGray} style={{ marginTop: 28, textAlign: 'center', maxWidth: 260 }}>
            “Wherever two or more are in agreement…”
          </Serif>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ flex: 1 }}
      >
        {MANIFESTO_LINES.map((line, i) => (
          <View key={i} style={{ width, alignItems: 'center', justifyContent: 'center', padding: 44 }}>
            <Serif size={32} style={{ textAlign: 'center', maxWidth: 300, lineHeight: 45 }}>
              {line}
            </Serif>
          </View>
        ))}
      </ScrollView>

      <View style={{ alignItems: 'center', paddingHorizontal: 44, paddingBottom: 44, gap: 22 }}>
        {/* page markers */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MANIFESTO_LINES.map((_, i) => (
            <View key={i} style={{
              width: i === page ? 30 : 22, height: 3, borderRadius: 1.5,
              backgroundColor: i <= page ? colors.ink : colors.sand,
            }} />
          ))}
        </View>

        {/* swipe hint until the last card; Begin appears on card 3 */}
        <View style={{ alignSelf: 'stretch', minHeight: 92, justifyContent: 'center' }}>
          {onLast ? (
            <Animated.View entering={FadeInUp.duration(450)}>
              <PillButton label="Begin" onPress={toSignup} />
              <Text style={{ marginTop: 18, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray }}>
                Already have an account?{' '}
                <Text onPress={toSignup} style={{ fontFamily: fonts.sansMedium, color: colors.ink }}>Sign in</Text>
              </Text>
            </Animated.View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <SwipeHint />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
