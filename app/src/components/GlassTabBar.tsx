import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, isDarkMode } from '../theme';

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
/*
  These were exported string constants; they're palette tokens now
  (colors.glassFill / glassRim / glassSheen / lensFill / lensRim in theme.ts)
  so the capsule goes dusk-dark with the rest of the app (Nov 6). In light mode
  the values are unchanged: cream at 72% over a light blur, the brand border
  softened, a white top sheen, and a brighter lens behind the active tab.
*/

const BAR_H = 62;
const SIDE = 16;
/**
 * Total vertical space the floating bar occupies above the safe-area inset,
 * borders included. Exported so overlays can clear it by arithmetic instead of
 * a hand-tuned number that silently goes stale when BAR_H changes.
 */
export const TAB_BAR_TOTAL_H = BAR_H + 2;
/**
 * Gap between the lens and its slot edges. The lens is deliberately near
 * slot-width: it has to sit comfortably around the LONGEST label ("Progress",
 * ~50pt at 11pt sansMedium). A tighter inset made the pill narrower than that
 * word, so Progress looked cramped while the shorter tabs looked fine. One
 * width for every tab — it's the same pill sliding, not a resizing one.
 */
const LENS_INSET = 8;

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
    // Eased back from 1.28 now the pill nearly fills its slot — at the old
    // value a wider lens would swallow both neighbours mid-flight.
    stretch.value = withSequence(
      withTiming(1.16, { duration: 130, easing: Easing.out(Easing.quad) }),
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
        borderColor: colors.glassRim,
        // A real shadow is what separates a floating capsule from a painted one.
        shadowColor: colors.ink,
        shadowOpacity: 0.18,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
      }}>
        {/* The glass itself — content scrolls visibly beneath this. */}
        <BlurView intensity={38} tint={isDarkMode() ? 'dark' : 'light'} style={{ backgroundColor: colors.glassFill }}>
          {/* specular sheen along the top edge */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: 0, left: 18, right: 18, height: 1,
            backgroundColor: colors.glassSheen,
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
                  position: 'absolute', left: 0, top: 6,
                  width: slot, height: BAR_H - 12,
                  alignItems: 'center', justifyContent: 'center',
                }, lensStyle]}
              >
                <View style={{
                  width: Math.max(0, slot - LENS_INSET), height: '100%',
                  borderRadius: (BAR_H - 12) / 2,
                  backgroundColor: colors.lensFill, borderWidth: 1, borderColor: colors.lensRim,
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
