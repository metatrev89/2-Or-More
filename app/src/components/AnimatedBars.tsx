import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { colors } from '../theme';

/**
 * Dancing audio bars (design: barDance keyframes — scaleY 0.5→1→0.5, 0.7s,
 * staggered 0.15s per bar). Used for the listening state and voice samples.
 */
function Bar({ height, width, color, delay }: { height: number; width: number; color: string; delay: number }) {
  const scale = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }), -1, true,
    ));
  }, [scale, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return <Animated.View style={[{ width, height, borderRadius: width / 2, backgroundColor: color }, style]} />;
}

export function DancingBars({ heights, color, width = 3, gap = 3 }: {
  heights: number[]; color: string; width?: number; gap?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {heights.map((h, i) => <Bar key={i} height={h} width={width} color={color} delay={i * 150} />)}
    </View>
  );
}

/** Static voice bars (design: the Aria/James avatar marks — three fixed bars). */
export function StaticBars({ heights, color, width = 2.5, gap = 2.5 }: {
  heights: number[]; color: string; width?: number; gap?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width, height: h, borderRadius: width / 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

/** Pulsing halo behind the listening mic (design: listenPulse box-shadow ring). */
export function PulseRing({ size, color, children }: { size: number; color: string; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.7, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
  }, [scale, opacity]);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      }, halo]} />
      {children}
    </View>
  );
}

/** The AI typing indicator — three 6px teal dots (design dotBlink keyframes: 0.25→1→0.25, staggered). */
export function BlinkingDots({ color = colors.teal, size = 6, gap = 5 }: { color?: string; size?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {[0, 200, 400].map(delay => <BlinkDot key={delay} color={color} size={size} delayMs={delay} />)}
    </View>
  );
}

function BlinkDot({ color, size, delayMs }: { color: string; size: number; delayMs: number }) {
  const op = useSharedValue(0.25);
  useEffect(() => {
    op.value = withDelay(delayMs, withRepeat(
      withSequence(
        withTiming(1, { duration: 480 }),
        withTiming(0.25, { duration: 720 }),
      ), -1, false));
  }, [op, delayMs]);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}
