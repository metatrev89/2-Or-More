import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, fonts } from '../theme';
import { StarBurst } from './brandIcons';
import { BurstRing, ChipPop, Confetti } from './Celebration';
import { useStore } from '../store';
import { MOCK_AFFS } from '../api/mockData';

/**
 * Session-complete celebration. Lifted out of PlayerScreen (Sept 12) so it can
 * render over ANY screen — a session finishing while the player is minimized
 * still gets its full moment wherever the user happens to be.
 *
 * The alignment check-in that used to sit under the banner is gone (Trevor,
 * Sept 11), which also retired the `autoDismiss` prop: it existed only to hold
 * the celebration open while an un-answered mood picker waited for a tap.
 * Nothing here is interactive now, so it always times out on its own — or
 * sooner, if the user taps anywhere.
 */
export default function SessionCeleb({ onDone }: { onDone: () => void }) {
  // 7, or 8 when the intake's catch-all was answered — never hardcode the count.
  const affCount = useStore(s => s.affirmations.length) || MOCK_AFFS.length;

  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', zIndex: 60,
    }}>
      <Pressable onPress={onDone} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Confetti />
      <BurstRing color={colors.gold} borderWidth={4} durMs={1100} />
      <BurstRing color={colors.teal} borderWidth={3} durMs={1300} delayMs={200} />
      <BurstRing color={colors.gold} borderWidth={2} durMs={1500} delayMs={400} />
      <ChipPop durMs={600} delayMs={200} style={{
        backgroundColor: colors.ink, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 26,
        flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '92%',
        shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
      }}>
        <StarBurst size={22} />
        <Text style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 17, color: colors.cream }}>
          Congratulations! All {affCount} affirmations complete!
        </Text>
      </ChipPop>
    </View>
  );
}
