import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { StarBurst } from './brandIcons';

/**
 * Celebration primitives from the design (confettiFall + burstRing keyframes).
 * Constants mirror the prototype's CONFETTI generator exactly.
 */

const CONF_COLORS = [colors.gold, colors.teal, colors.sand, colors.gold, colors.tealDeep, colors.gold];

function FallingStar({ left, size, color, durMs, delayMs, screenH }: {
  left: string; size: number; color: string; durMs: number; delayMs: number; screenH: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: Easing.bezier(0.2, 0.5, 0.6, 1) }));
  }, [t, durMs, delayMs]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -30 + t.value * (screenH + 60) },
      { rotate: `${t.value * 280}deg` },
    ],
    opacity: t.value < 0.82 ? 1 : Math.max(0, (1 - t.value) / 0.18),
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: left as never }, style]}>
      <StarBurst size={size} color={color} />
    </Animated.View>
  );
}

/** 26 falling 4-point stars — the design's confettiFall shower. */
export function Confetti() {
  const { height } = useWindowDimensions();
  const items = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    left: `${3 + (i * 37) % 94}%`,
    size: 10 + (i * 11) % 14,
    color: CONF_COLORS[i % CONF_COLORS.length],
    durMs: (1.6 + ((i * 13) % 10) / 8) * 1000,
    delayMs: (((i * 17) % 12) / 14) * 1000,
  })), []);
  return (
    <>
      {items.map((c, i) => <FallingStar key={i} {...c} screenH={height} />)}
    </>
  );
}

/** Expanding ring for the all-complete moment (burstRing keyframes). */
export function BurstRing({ color, borderWidth, durMs, delayMs = 0 }: {
  color: string; borderWidth: number; durMs: number; delayMs?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: Easing.out(Easing.ease) }));
  }, [t, durMs, delayMs]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.25 + t.value * 0.9 }],
    opacity: Math.max(0, 1 - t.value),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 300, height: 300, borderRadius: 150, borderColor: color, borderWidth }, style]}
    />
  );
}
