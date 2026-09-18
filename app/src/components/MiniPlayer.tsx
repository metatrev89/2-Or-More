import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { areaAccent, colors, fonts } from '../theme';
import { PauseFill, PlayFill, XIcon } from './brandIcons';
import { CelebStar } from './Celebration';
import { TAB_BAR_TOTAL_H } from './GlassTabBar';
import { useAudioSession } from '../audio/AudioSession';
import { affText, useStore } from '../store';

/** Chevron-up — expands the bar back to the full player. */
function ExpandIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 15l-6-6-6 6" />
    </Svg>
  );
}

/**
 * The minimized player (Trevor, Sept 12): a persistent bar carrying the
 * affirmation title and a live scrub, expand on the left, close on the right.
 *
 * Lives above the navigator so it survives screen changes, and is
 * `pointerEvents="box-none"` at the wrapper so the rest of the UI stays fully
 * interactive around it.
 */
export default function MiniPlayer({ onExpand, liftForTabs }: {
  onExpand: () => void;
  /** Sit above the tab bar on Main; float near the bottom elsewhere. */
  liftForTabs: boolean;
}) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { affs, index, playing, trackFrac, celebIndex, toggle, close } = useAudioSession();

  const aff = index >= 0 ? affs[index] : undefined;
  if (!aff) return null;

  // Shared with the full player so both scrubs agree, and so neither shows the
  // outgoing track's position against the incoming track's duration.
  const frac = trackFrac;
  const text = affText(store, index) || aff.statement;

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 12, right: 12,
        // Sits clear of the floating glass bar rather than on top of it
        // (Trevor, Sept 14). Derived from the bar's own height so the two
        // can't drift apart; 14 is the breathing gap between them.
        bottom: insets.bottom + (liftForTabs ? TAB_BAR_TOTAL_H + 14 : 14),
        zIndex: 50,
      }}
    >
      {/*
        The WHOLE bar expands (Trevor, Sept 17). It used to be a 32pt chevron
        button — the smallest target on a control the user is most likely to
        reach for one-handed, and every other media player on the phone expands
        on a tap anywhere. The chevron stays as the affordance but is now
        decoration; play/pause and close are still their own Pressables and win
        the touch, because in React Native the innermost responder takes it.
      */}
      <Pressable
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel="Expand player"
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.borderSoft : colors.white,
          borderRadius: 18,
          borderWidth: 1, borderColor: colors.border,
          paddingTop: 10, paddingBottom: 8, paddingHorizontal: 10,
          shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View pointerEvents="none" style={{
            width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: colors.sand,
          }}>
            <ExpandIcon />
          </View>

          <Pressable onPress={toggle} hitSlop={6} style={{
            width: 32, height: 32, borderRadius: 16, backgroundColor: colors.teal,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {playing ? <PauseFill size={11} /> : <View style={{ marginLeft: 2 }}><PlayFill size={12} /></View>}
          </Pressable>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.serifItalic, fontSize: 14, color: colors.ink }}>
              “{text}”
            </Text>
            {/* Chakra accent, matching Home / Review / Player / Profile. */}
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 9.5, letterSpacing: 1.3, color: areaAccent(aff.area), textTransform: 'uppercase', marginTop: 1 }}>
              {aff.area}
            </Text>
          </View>

          <Pressable onPress={close} hitSlop={8} style={{
            width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
          }}>
            <XIcon size={14} color={colors.warmGray} />
          </Pressable>
        </View>

        {/* Live scrub — stays TEAL. It's progress, and accents never mark
            progress; that separation is the whole reason the accents could be
            added without touching the existing palette rules. */}
        <View pointerEvents="none" style={{ height: 3, borderRadius: 2, backgroundColor: colors.borderSoft, marginTop: 9, overflow: 'hidden' }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.teal, width: `${Math.round(frac * 100)}%` }} />
        </View>

        {/* a ring closing while minimized still gets its star */}
        {celebIndex >= 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -10, right: 34 }}>
            <CelebStar key={celebIndex} size={16} durMs={1000} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
