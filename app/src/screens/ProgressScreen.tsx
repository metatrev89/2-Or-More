import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Label, Mono, Wordmark } from '../components/ui';
import { useStore } from '../store';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_HEIGHTS = [30, 42, 12, 52, 44, 36, 16];

/** Progress (design screen: Progress) — big daily ring, week bars, medals. */
export default function ProgressScreen() {
  const { homeReadDone, streakDays } = useStore();
  const frac = homeReadDone.length / 7;
  const r = 52, circ = 2 * Math.PI * r;

  const medals = [
    { label: 'First week', bg: colors.gold, border: 'transparent', ink: colors.ink },
    { label: 'Perfect day', bg: colors.goldSoft, border: colors.gold, ink: colors.ink },
    { label: 'Early riser', bg: colors.white, border: colors.border, ink: colors.inactive },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ paddingTop: 60, paddingBottom: 40, paddingHorizontal: 22 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink, marginTop: 12 }}>Progress</Text>

      {/* daily ring */}
      <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, alignItems: 'center', marginTop: 18 }}>
        <View style={{ width: 130, height: 130 }}>
          <Svg width={130} height={130} viewBox="0 0 130 130">
            <Circle cx={65} cy={65} r={r} stroke={colors.border} strokeWidth={10} fill="none" />
            <Circle
              cx={65} cy={65} r={r}
              stroke={colors.teal} strokeWidth={10} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ * frac} ${circ * (1 - frac)}`}
              transform="rotate(-90 65 65)"
            />
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Mono size={22} color={colors.ink}>{homeReadDone.length}/7</Mono>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.warmGray }}>today</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray }}>
            <Mono size={14} color={colors.ink}>{streakDays}</Mono> day streak — paused days never break it
          </Text>
        </View>
      </View>

      {/* week bars */}
      <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, marginTop: 14 }}>
        <Label>This week</Label>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 18, height: 60 }}>
          {WEEK_HEIGHTS.map((h, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: '100%', height: h, borderRadius: 4, backgroundColor: i < 6 ? colors.gold : colors.border }} />
              <Mono size={11}>{DAYS[i]}</Mono>
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 14 }}>
          <Mono size={13.5} color={colors.ink}>92%</Mono> of sessions experienced this week. Way to stay in agreement.
        </Text>
      </View>

      {/* medals */}
      <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, marginTop: 14 }}>
        <Label>Medals</Label>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {medals.map(m => (
            <View key={m.label} style={{
              flex: 1, alignItems: 'center', gap: 8, borderRadius: 16, paddingVertical: 16,
              backgroundColor: m.bg, borderWidth: 1, borderColor: m.border,
            }}>
              <Text style={{ fontSize: 20, color: m.ink }}>✦</Text>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: m.ink }}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
