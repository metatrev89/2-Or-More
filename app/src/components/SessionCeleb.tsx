import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { areaAccent, colors, fonts } from '../theme';
import { StarBurst } from './brandIcons';
import { BurstRing, ChipPop, Confetti } from './Celebration';
import { affSet, useStore } from '../store';
import { useTracking } from '../tracking/useTracking';

/**
 * Session-complete celebration — "crown rise" (Trevor, Oct 15, option B2).
 *
 * Replaces the dark ink pill that read "Congratulations! All N affirmations
 * complete!". Two things made that feel flat: the only colour in it was a 22px
 * gold star, and the copy could have belonged to any app in any category.
 *
 * Now a light card with ONE BAR PER AFFIRMATION, rising left to right in the
 * area accents — root → crown, the same direction the intake walks. Design
 * exploration and the live variable playground that settled the timing:
 * `design/session-complete-option-b-animated.html`.
 *
 * WHY THE ACCENTS ARE ALLOWED HERE. The brand rule is that an area accent
 * answers exactly one question — *which area* — and never marks progress,
 * completion or achievement; that is what keeps gold-means-achievement
 * intact. These bars don't break it: each bar is one area the user practised,
 * and the set of them is what a session IS. Gold still carries the
 * achievement, on the star. The confetti deliberately stays gold/teal/sand
 * rather than going spectrum — the bars are what say "which areas", and
 * spreading the hues into the confetti too would turn them back into
 * decoration.
 */
export default function SessionCeleb({ onDone }: { onDone: () => void }) {
  const affirmations = useStore(s => s.affirmations);
  const affs = affSet(affirmations);
  const track = useTracking();

  /**
   * `onDone` is called through a ref, NOT captured in the timeout (Sept 22:
   * the Player's auto-close didn't fire).
   *
   * `setTimeout(onDone, 4000)` froze the very first `onDone` closure. That
   * closure was created in the same commit the celebration appeared in —
   * which is the commit where `advance()` had only just called `pause()`, so
   * expo-audio's status still read `playing: true`. Four seconds later the
   * stale closure asked "is the session still running?", got the answer from a
   * moment that had long passed, and declined to close the Player.
   *
   * A decision made at mount and acted on much later has to re-read the world,
   * not remember it.
   */
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, []);

  const n = affs.length;
  const afterBars = n * BAR_STAGGER_MS + BAR_RISE_MS * 0.4;

  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', zIndex: 60,
    }}>
      <Pressable onPress={onDone} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Kept exactly as they were — same 26 pieces, same gold/teal/gold rings. */}
      <Confetti />
      <BurstRing color={colors.gold} borderWidth={4} durMs={1100} />
      <BurstRing color={colors.teal} borderWidth={3} durMs={1300} delayMs={200} />
      <BurstRing color={colors.gold} borderWidth={2} durMs={1500} delayMs={400} />

      <ChipPop durMs={520} delayMs={0} style={{
        backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
        borderRadius: 22, paddingTop: 22, paddingBottom: 20, paddingHorizontal: 26,
        alignItems: 'center', maxWidth: '86%',
        shadowColor: colors.ink, shadowOpacity: 0.16, shadowRadius: 26,
        shadowOffset: { width: 0, height: 14 }, elevation: 8,
      }}>
        {/* Bars. Container is taller than the tallest bar so the overshoot at
            the end of the rise has somewhere to go instead of clipping. */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
          gap: 7, height: BAR_MAX_H + 5, marginBottom: 16,
        }}>
          {affs.map((a, i) => (
            <Bar key={a.id ?? i} index={i} total={n} color={areaAccent(a.area)} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(afterBars).duration(340)}
                       style={{ alignItems: 'center', gap: 9 }}>
          <StarBurst size={26} />
          <Text style={{
            fontFamily: fonts.sansSemi, fontSize: 17, lineHeight: 22,
            color: colors.ink, textAlign: 'center', letterSpacing: -0.3,
          }}>
            Congratulations — that's your whole vision!
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(afterBars + 90).duration(340)}
                       style={{ alignItems: 'center' }}>
          <Text style={{
            fontFamily: fonts.serifItalic, fontSize: 13.5, lineHeight: 20,
            color: colors.warmGray, textAlign: 'center', marginTop: 9,
          }}>
            {saidLine(n)}
          </Text>
          <Text style={{
            fontFamily: fonts.mono, fontSize: 11.5, color: colors.warmGray, marginTop: 12,
          }}>
            {n} of {n}  ·  Daily session {Math.min(track.today.ringsClosed, track.perDay)} of {track.perDay}
          </Text>
        </Animated.View>
      </ChipPop>
    </View>
  );
}

/** Auto-dismiss, matched to the design's 4s beat. */
const AUTO_DISMISS_MS = 4000;
/** Gap between bars starting to rise — option B2, chosen on device-size mockups. */
const BAR_STAGGER_MS = 75;
const BAR_RISE_MS = 420;
const BAR_MIN_H = 20;
const BAR_MAX_H = 56;

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/**
 * The serif line counts AFFIRMATIONS, not areas.
 *
 * "All seven areas" would be a lie for anyone who skipped an area in intake
 * ("Not this season") or declined the catch-all — and both are normal. The
 * bars already carry which areas; this line carries how many statements.
 */
function saidLine(n: number): string {
  if (n <= 1) return 'Your affirmation, spoken and in agreement.';
  return `All ${NUM_WORDS[n] ?? n} affirmations, in agreement.`;
}

/**
 * One bar = one affirmation, coloured by ITS OWN area.
 *
 * Height is animated rather than scaleY: scaling would squash the 6pt rounded
 * caps on the way up. Heights ramp low→high across however many bars this user
 * actually has, so 7 and 8 both fill the row evenly instead of leaving a hole.
 */
function Bar({ index, total, color }: { index: number; total: number; color: string }) {
  const t = useSharedValue(0);
  const h = total <= 1
    ? BAR_MAX_H
    : Math.round(BAR_MIN_H + (BAR_MAX_H - BAR_MIN_H) * (index / (total - 1)));

  useEffect(() => {
    t.value = withDelay(index * BAR_STAGGER_MS, withTiming(1, {
      duration: BAR_RISE_MS,
      easing: Easing.out(Easing.back(1.4)),
    }));
  }, [t, index]);

  const style = useAnimatedStyle(() => ({ height: h * t.value, opacity: t.value > 0 ? 1 : 0 }));

  return <Animated.View style={[{ width: 12, borderRadius: 6, backgroundColor: color }, style]} />;
}
