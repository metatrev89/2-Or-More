import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

/**
 * Liquid-glass tab bar (Trevor, Sept 12 — from the two reference apps in his
 * screen recording).
 *
 * Combines the two styles he showed:
 *   · Gospel Library — a floating translucent capsule detached from the screen
 *     edges, with content visibly scrolling underneath it and a thin light rim.
 *   · Instagram — a brighter "lens" pill that slides between tabs and stretches
 *     as it travels, then settles.
 *
 * Tinted with the bar's existing colour (cream #FAF4E8) rather than a neutral
 * grey, so it reads as the same surface, now translucent.
 */

/** ── Translucent palette ───────────────────────────────────────────────── */
/** Cream at 72% over a light blur — frosted, but still unmistakably cream. */
export const GLASS_FILL = 'rgba(250, 244, 232, 0.72)';
/** Brand border (#E8DEC9) softened, so the capsule edge reads as glass not card. */
export const GLASS_RIM = 'rgba(232, 222, 201, 0.85)';
/** Specular top highlight — the "lit from above" edge that sells the material. */
export const GLASS_SHEEN = 'rgba(255, 255, 255, 0.55)';
/** The travelling lens behind the active tab: brighter than the bar itself. */
export const LENS_FILL = 'rgba(255, 255, 255, 0.78)';
export const LENS_RIM = 'rgba(255, 255, 255, 0.9)';

const BAR_H = 62;
const SIDE = 16;

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [innerW, setInnerW] = useState(0);
  const count = state.routes.length;
  const slot = innerW > 0 ? innerW / count : 0;

  const x = useSharedValue(0);
  const stretch = useSharedValue(1);

  useEffect(() => {
    if (!slot) return;
    x.value = withSpring(state.index * slot, { damping: 18, stiffness: 170, mass: 0.9 });
    // The liquid part: the lens elongates as it leaves, then relaxes on arrival.
    stretch.value = withSequence(
      withTiming(1.28, { duration: 130, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 190 }),
    );
  }, [state.index, slot, x, stretch]);

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: stretch.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: SIDE, right: SIDE,
        bottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
      <View style={{
        borderRadius: BAR_H / 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: GLASS_RIM,
        // A real shadow is what separates a floating capsule from a painted one.
        shadowColor: colors.ink,
        shadowOpacity: 0.18,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
      }}>
        {/* The glass itself — content scrolls visibly beneath this. */}
        <BlurView intensity={38} tint="light" style={{ backgroundColor: GLASS_FILL }}>
          {/* specular sheen along the top edge */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: 0, left: 18, right: 18, height: 1,
            backgroundColor: GLASS_SHEEN,
          }} />

          <View
            onLayout={e => setInnerW(e.nativeEvent.layout.width)}
            style={{ height: BAR_H, flexDirection: 'row', alignItems: 'center' }}
          >
            {/* travelling lens, behind the icons */}
            {slot > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[{
                  position: 'absolute', left: 0, top: 6, height: BAR_H - 12,
                  width: slot, borderRadius: (BAR_H - 12) / 2,
                  paddingHorizontal: 6,
                }, lensStyle]}
              >
                <View style={{
                  flex: 1, marginHorizontal: 5, borderRadius: (BAR_H - 12) / 2,
                  backgroundColor: LENS_FILL, borderWidth: 1, borderColor: LENS_RIM,
                }} />
              </Animated.View>
            )}

            {state.routes.map((route, i) => {
              const { options } = descriptors[route.key]!;
              const focused = state.index === i;

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                >
                  {options.tabBarIcon?.({ focused, color: '', size: 24 })}
                  {typeof options.tabBarLabel === 'function'
                    ? options.tabBarLabel({ focused, color: '', position: 'below-icon', children: route.name })
                    : <Text>{route.name}</Text>}
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}
