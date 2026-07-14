import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton, Label, Mono, PillButton, Wordmark } from '../../components/ui';
import { GoldCheckCircle } from '../../components/brandIcons';
import { useStore } from '../../store';

function fmtHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const d = hr % 12 === 0 ? 12 : hr % 12;
  return `${d} ${hr < 12 ? 'AM' : 'PM'}`;
}

function Stepper({ value, onDown, onUp, small = false }: { value: string; onDown: () => void; onUp: () => void; small?: boolean }) {
  const s = small ? 26 : 36;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 6 : 14 }}>
      <Pressable onPress={onDown} style={{ width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: small ? 14 : 18, color: colors.ink }}>−</Text>
      </Pressable>
      <Mono size={small ? 14 : 18} color={colors.ink} style={{ width: small ? 46 : 36, textAlign: 'center' }}>{value}</Mono>
      <Pressable onPress={onUp} style={{ width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: small ? 14 : 18, color: colors.ink }}>+</Text>
      </Pressable>
    </View>
  );
}

/** Scheduling (design screen 6): Prime protocol + custom cadence w/ quiet hours. */
export default function ScheduleScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Schedule'>) {
  const { schedPlan, freq, awStart, awEnd, qStart, qEnd, set } = useStore();
  const prime = schedPlan === 'prime';

  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const };
  const rowLabel = { fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 52, paddingBottom: 36 }}>
        <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 26, color: colors.ink, lineHeight: 33, marginTop: 8 }}>
          When should your affirmations find you?
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.warmGray, lineHeight: 22, marginTop: 10 }}>
          Repetition is how identity settles in. Small minutes, staggered right, compound.
        </Text>

        <Pressable onPress={() => set({ schedPlan: 'prime' })} style={{
          marginTop: 24, backgroundColor: colors.white, borderRadius: 22, padding: 22,
          borderWidth: prime ? 2 : 1, borderColor: prime ? colors.ink : colors.border,
        }}>
          <View style={row}>
            <Label>Recommended</Label>
            <GoldCheckCircle checked={prime} />
          </View>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 21, color: colors.ink, marginTop: 10 }}>Prime protocol</Text>
          <View style={{ gap: 9, marginTop: 14 }}>
            {[['10×', 'a day for your first two weeks'], ['5×', 'as the practice takes hold'], ['3×', 'a day, steady, for the long walk']].map(([n, d]) => (
              <View key={n} style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
                <Mono size={15} color={colors.ink} style={{ width: 34 }}>{n}</Mono>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray }}>
              Staggered wake to wind-down · about <Mono size={13.5} color={colors.ink}>6 min</Mono> of your day
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => set({ schedPlan: 'custom' })} style={{
          marginTop: 14, backgroundColor: colors.white, borderRadius: 22, padding: 22,
          borderWidth: !prime ? 2 : 1, borderColor: !prime ? colors.ink : colors.border,
        }}>
          <View style={row}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink }}>Custom cadence</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
              {!prime ? `${freq}× a day` : 'Set your own'}
            </Text>
          </View>
          {!prime && (
            <View style={{ marginTop: 18, gap: 16 }}>
              <View style={row}>
                <Text style={rowLabel}>Times per day</Text>
                <Stepper value={`${freq}×`}
                  onDown={() => set({ freq: Math.max(1, freq - 1) })}
                  onUp={() => set({ freq: Math.min(12, freq + 1) })} />
              </View>
              <View style={row}>
                <Text style={rowLabel}>Active window</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Stepper small value={fmtHour(awStart)}
                    onDown={() => { const v = Math.max(0, awStart - 1); set({ awStart: v, qEnd: v }); }}
                    onUp={() => { const v = Math.min(awEnd - 1, awStart + 1); set({ awStart: v, qEnd: v }); }} />
                  <Text style={{ color: colors.inactive }}>–</Text>
                  <Stepper small value={fmtHour(awEnd)}
                    onDown={() => { const v = Math.max(awStart + 1, awEnd - 1); set({ awEnd: v, qStart: v }); }}
                    onUp={() => { const v = Math.min(23, awEnd + 1); set({ awEnd: v, qStart: v }); }} />
                </View>
              </View>
              <View style={row}>
                <Text style={rowLabel}>Quiet hours</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Mono size={14} color={colors.ink}>{fmtHour(qStart)}</Mono>
                  <Text style={{ color: colors.inactive }}>–</Text>
                  <Mono size={14} color={colors.ink}>{fmtHour(qEnd)}</Mono>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 18, backgroundColor: colors.aiTint, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={colors.tealDeep} strokeWidth={1.5} strokeLinecap="round" style={{ marginTop: 2 }}>
            <Path d="M7 1v12M1 7h12M2.8 2.8l8.4 8.4M11.2 2.8l-8.4 8.4" />
          </Svg>
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13.5, color: colors.tealDeep, lineHeight: 19 }}>
            2+ staggers each delivery through your day automatically — you never get two at once.
          </Text>
        </View>

        <View style={{ paddingTop: 22 }}>
          <PillButton label="Set my schedule" onPress={() => navigation.navigate('Paywall')} />
        </View>
      </ScrollView>
    </Animated.View>
  );
}
