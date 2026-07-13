import React from 'react';
import { Text, Pressable, View, TextStyle, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

/** Back chevron matching the design bundle's glyph, with a full 44pt touch target. */
export function BackButton({ onPress, color = colors.ink }: { onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44, height: 44, marginLeft: -10,
        alignItems: 'flex-start', justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M15 18l-6-6 6-6" />
      </Svg>
    </Pressable>
  );
}

export function Wordmark({ size = 22, light = false }: { size?: number; light?: boolean }) {
  return (
    <Text style={{ fontFamily: fonts.sansSemi, fontSize: size, color: light ? colors.cream : colors.ink, letterSpacing: -0.5 }}>
      2<Text style={{ color: colors.gold }}>+</Text>
    </Text>
  );
}

export function PillButton({ label, onPress, bg = colors.ink, color = colors.cream, height = 56, disabled = false, style }: {
  label: string; onPress: () => void; bg?: string; color?: string; height?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [{
        height, borderRadius: height / 2, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed && !disabled ? 0.85 : 1,
      }, style]}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 17, color }}>{label}</Text>
    </Pressable>
  );
}

export function Serif({ children, size = 26, color = colors.ink, style }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[{ fontFamily: fonts.serifItalic, fontSize: size, lineHeight: size * 1.5, color }, style]}>
      {children}
    </Text>
  );
}

export function Mono({ children, size = 13, color = colors.warmGray, style }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>;
}) {
  return <Text style={[{ fontFamily: fonts.mono, fontSize: size, color }, style]}>{children}</Text>;
}

export function Label({ children, color = colors.warmGray }: { children: React.ReactNode; color?: string }) {
  return (
    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 2, color, textTransform: 'uppercase' }}>
      {children}
    </Text>
  );
}

/** The AI spark avatar — teal circle with the 8-point star (AI-only color rule). */
export function AiSpark({ size = 32 }: { size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: colors.teal,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: colors.white, fontSize: size * 0.5, lineHeight: size * 0.62, fontFamily: fonts.sans }}>✦</Text>
    </View>
  );
}

export function SegmentBar({ total, activeCount, activeColor = colors.teal, height = 6 }: {
  total: number; activeCount: number; activeColor?: string; height?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{
          flex: 1, height, borderRadius: height / 2,
          backgroundColor: i < activeCount ? activeColor : colors.border,
        }} />
      ))}
    </View>
  );
}
