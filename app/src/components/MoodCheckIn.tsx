import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, fonts, timing } from '../theme';
import { useStore } from '../store';
import { api } from '../api/client';

/**
 * Post-session mood check-in (design feature, kept per July 12 decision).
 * Disconnected uses terracotta — earthy, deliberately not alarm-red.
 */
const MOODS = [
  { label: 'Disconnected', color: colors.terracotta, glyph: '⊘' },
  { label: 'Aligning', color: colors.gold, glyph: '✦' },
  { label: 'Fully Aligned', color: colors.teal, glyph: '✓' },
];

export default function MoodCheckIn({ sessionKey, onDone }: { sessionKey: string; onDone: () => void }) {
  const { moods, recordMood } = useStore();
  const picked = moods[sessionKey];

  const pick = (i: number) => {
    if (picked !== undefined) return;
    recordMood(sessionKey, i);
    api.recordExperience('me', null, `mood:${i}`);
    setTimeout(onDone, timing.moodDismissMs);
  };

  return (
    <View style={{ marginTop: 22, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>How aligned do you feel?</Text>
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
        {MOODS.map((m, i) => {
          const on = picked === i;
          return (
            <Pressable key={m.label} onPress={() => pick(i)} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2.5, borderColor: on ? m.color : colors.border, backgroundColor: colors.white,
              }}>
                <Text style={{ fontSize: 20, color: on ? m.color : colors.inactive }}>{m.glyph}</Text>
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: on ? m.color : colors.warmGray }}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
