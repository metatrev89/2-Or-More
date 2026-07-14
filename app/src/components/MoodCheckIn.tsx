import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, timing } from '../theme';
import { useStore } from '../store';
import { api } from '../api/client';
import { CelebStar } from './Celebration';

/**
 * Post-session mood check-in (design's moodOpts, kept per July 12 decision).
 * SVG icon appears only once picked (design: iconEl = on ? icon : null);
 * picking locks the choice and auto-dismisses after moodDismissMs.
 * Disconnected uses terracotta — earthy, deliberately not alarm-red.
 */
const MOODS = [
  {
    label: 'Disconnected', color: colors.terracotta,
    icon: (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8} stroke={colors.terracotta} strokeWidth={2.2} />
        <Path d="M6.5 17.5L17.5 6.5" stroke={colors.terracotta} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    ),
  },
  {
    label: 'Aligned', color: colors.gold,
    icon: (
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M12 3c.55 3 1.3 4.9 2.7 6.3C16.1 10.7 18 11.45 21 12c-3 .55-4.9 1.3-6.3 2.7C13.3 16.1 12.55 18 12 21c-.55-3-1.3-4.9-2.7-6.3C7.9 13.3 6 12.55 3 12c3-.55 4.9-1.3 6.3-2.7C10.7 7.9 11.45 6 12 3z" fill={colors.gold} />
      </Svg>
    ),
  },
  {
    label: 'Fully Aligned', color: colors.teal,
    icon: (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 12.5l4.2 4.2 8.8-10.2" stroke={colors.teal} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
];

export default function MoodCheckIn({ sessionKey, onDone, title = 'How do you feel?' }: {
  sessionKey: string; onDone: () => void; title?: string;
}) {
  const { moods, recordMood } = useStore();
  const picked = moods[sessionKey];

  const pick = (i: number) => {
    if (picked !== undefined) return;
    recordMood(sessionKey, i);
    api.recordExperience('me', null, `mood:${i}`);
    setTimeout(onDone, timing.moodDismissMs);
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>{title}</Text>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
        {MOODS.map((m, i) => {
          const on = picked === i;
          return (
            <Pressable key={m.label} onPress={() => pick(i)} style={{ alignItems: 'center', gap: 6 }}>
              {on && (
                <View pointerEvents="none" style={{ position: 'absolute', top: -12, left: '50%', marginLeft: -8, zIndex: 2 }}>
                  <CelebStar size={16} durMs={1000} />
                </View>
              )}
              <View style={{
                width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2.5, borderColor: on ? m.color : colors.border,
              }}>
                {on ? m.icon : null}
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: on ? m.color : colors.warmGray }}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
