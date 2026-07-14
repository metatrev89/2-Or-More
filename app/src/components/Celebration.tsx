import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { StarBurst } from './brandIcons';

/**
 * Celebration primitives matching the design's keyframes exactly:
 *   celebStar    — star rises 18px, overshoots to 1.25, fades out (1s ease)
 *   confettiFall — fall + 620° spin, opacity ramps in by 8%, out after 85%
 *   burstRing    — scale 0.2→1 while opacity 0.9→0 (ease-out)
 *   chipPop      — scale 0.5→1.1@60%→1 with opacity in (bezier 0.34,1.56,0.64,1)
 */

const CONF_COLORS = [colors.gold, colors.teal, colors.sand, colors.gold, colors.tealDeep, colors.gold];
const POP_EASING = Easing.bezier(0.34, 1.56, 0.64, 1);

/** celebStar: the little gold star that marks a closed ring / picked mood. */
export function CelebStar({ size = 16, durMs = 1000, delayMs = 0 }: {
  size?: number; durMs?: number; delayMs?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: Easing.ease }));
  }, [t, durMs, delayMs]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.3, 1], [0, 1, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 0.3, 1], [0, -8, -18]) },
      { scale: interpolate(t.value, [0, 0.3, 1], [0, 1.25, 0.7]) },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={style}>
      <StarBurst size={size} />
    </Animated.View>
  );
}

/** chipPop: pop-in for celebration chips/cards. */
export function ChipPop({ children, durMs = 600, delayMs = 0, style }: {
  children: React.ReactNode; durMs?: number; delayMs?: number; style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: POP_EASING }));
  }, [t, durMs, delayMs]);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [0, 0.6, 1], [0.5, 1.1, 1], Extrapolation.CLAMP) }],
  }));
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

function FallingStar({ left, size, color, durMs, delayMs, screenH }: {
  left: string; size: number; color: string; durMs: number; delayMs: number; screenH: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: Easing.bezier(0.2, 0.5, 0.6, 1) }));
  }, [t, durMs, delayMs]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [-60, screenH + 40]) },
      { rotate: `${t.value * 620}deg` },
    ],
    opacity: interpolate(t.value, [0, 0.08, 0.85, 1], [0, 1, 1, 0]),
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: left as never }, style]}>
      <StarBurst size={size} color={color} />
    </Animated.View>
  );
}

/** 26 falling 4-point stars — constants mirror the prototype's CONFETTI generator. */
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

/** Expanding ring for the all-complete moment. */
export function BurstRing({ color, borderWidth, durMs, delayMs = 0 }: {
  color: string; borderWidth: number; durMs: number; delayMs?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delayMs, withTiming(1, { duration: durMs, easing: Easing.out(Easing.ease) }));
  }, [t, durMs, delayMs]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [0.2, 1]) }],
    opacity: interpolate(t.value, [0, 1], [0.9, 0]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 300, height: 300, borderRadius: 150, borderColor: color, borderWidth }, style]}
    />
  );
}
