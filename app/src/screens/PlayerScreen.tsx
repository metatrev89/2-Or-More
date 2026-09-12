import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, PanResponder } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { Mono, Serif } from '../components/ui';
import { ChevronDownIcon, DoneMark, PauseFill, PlayFill, StarBurst } from '../components/brandIcons';
import { BurstRing, CelebStar, ChipPop, Confetti } from '../components/Celebration';
import MoodCheckIn from '../components/MoodCheckIn';
import { affSet, affText, useStore } from '../store';
import { useAffirmationQueue } from '../audio/useAffirmationQueue';
import { api } from '../api/client';
import { MOCK_AFFS } from '../api/mockData';
import { playCelebrationLarge, playCelebrationSmall } from '../audio/sfx';

const AUDIO_DUR = 34;
/** Mock daily-progress figure shown in the session-complete chip (live: from stats/summary). */
const SESSIONS_TODAY = '3 of 7';
const SESSION_CHIP_MS = 5200; // linger through the celebration, then slip away
const PLAYER_HEIGHTS = [10, 22, 15, 34, 20, 42, 26, 14, 30, 18, 38, 24, 12, 28, 16, 36, 22, 10, 26, 15, 33, 19, 12, 24, 40, 17, 29, 13, 35, 21, 11, 25, 16, 31, 18, 12];
const SPEED_CHIPS = [0.7, 1, 1.2, 1.5, 1.7, 2];
const SEG_CIRC = 2 * Math.PI * 9;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtSpeed = (v: number) => `${v % 1 === 0 ? String(v) : String(Math.round(v * 100) / 100)}×`;

/** Skip back / forward glyphs (26px, 1.8 stroke, warm gray). */
function SkipIcon({ forward = false, color = colors.warmGray }: { forward?: boolean; color?: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={forward ? 'M5 4l10 8-10 8V4zM19 5v14' : 'M19 20L9 12l10-8v16zM5 19V5'} />
    </Svg>
  );
}

/** Loop glyph — circular arrows. */
function LoopIcon({ color = colors.warmGray }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 2l4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="M7 22l-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

/** Session-complete chip — the day's progress report (same styling both players). */
function SessionChip({ onDark = false }: { onDark?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink,
      borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16,
      borderWidth: onDark ? 1 : 0, borderColor: 'rgba(250,244,232,0.18)',
    }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.gold }}>
        Session complete — <Mono size={13} color={colors.gold}>{SESSIONS_TODAY}</Mono> sessions today
      </Text>
    </View>
  );
}

/**
 * The "all complete" celebration overlay.
 * Repeat completions (mood already recorded this session-day) auto-dismiss after
 * a few seconds; tapping anywhere outside the mood card always dismisses.
 */
function PlayerCeleb({ dark, sessionKey, autoDismiss, onDone }: {
  dark: boolean; sessionKey: string; autoDismiss: boolean; onDone: () => void;
}) {
  const chipBg = dark ? colors.cream : colors.ink;
  const chipInk = dark ? colors.ink : colors.cream;
  // 7, or 8 when the intake's catch-all was answered — never hardcode the count.
  const affCount = useStore(s => s.affirmations.length) || MOCK_AFFS.length;
  useEffect(() => {
    if (!autoDismiss) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', zIndex: 40,
    }}>
      <Pressable onPress={onDone} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <Confetti />
      <BurstRing color={colors.gold} borderWidth={4} durMs={1100} />
      <BurstRing color={colors.teal} borderWidth={3} durMs={1300} delayMs={200} />
      <BurstRing color={colors.gold} borderWidth={2} durMs={1500} delayMs={400} />
      <ChipPop durMs={600} delayMs={200} style={{
        backgroundColor: chipBg, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 26,
        flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '92%',
        shadowColor: '#000', shadowOpacity: dark ? 0.45 : 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
      }}>
        <StarBurst size={22} />
        <Text style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 17, color: chipInk }}>
          Congratulations! All {affCount} affirmations complete!
        </Text>
      </ChipPop>
      <ChipPop durMs={600} delayMs={450} style={{
        backgroundColor: dark ? colors.cream : colors.white,
        borderWidth: dark ? 0 : 1, borderColor: colors.border,
        borderRadius: 22, paddingVertical: 16, paddingHorizontal: 22, marginTop: 14,
      }}>
        <MoodCheckIn sessionKey={sessionKey} onDone={onDone} />
      </ChipPop>
    </View>
  );
}

/**
 * Player (design section 10) — the notification landing spot.
 * Audio: full-track playback, 7 segment rings fill and pop as each affirmation
 * passes; completion closes the ring.
 *
 * Audio-only as of v1 (Sept 11): the mind-movie theater, the Audio/Mind movie
 * toggle and the scene list were removed with the rest of the media layer.
 * Restore from git when the media release is scheduled.
 */
export default function PlayerScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Player'>) {
  const store = useStore();
  const { audioSpeed, setSpeed, voiceRecordings } = store;
  const affs = affSet(store.affirmations);
  const [celebSeg, setCelebSeg] = useState(-1);
  const [ringClosed, setRingClosed] = useState(false);
  const [sessionChip, setSessionChip] = useState(false);
  const [bigCeleb, setBigCeleb] = useState(false);
  const [speedSheet, setSpeedSheet] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Draggable speed slider: live store update while dragging, persist on release.
  const trackW = useRef(0);
  const dragTo = useRef((x: number, commit: boolean) => {
    if (!trackW.current) return;
    const frac = Math.max(0, Math.min(1, x / trackW.current));
    const v = Math.round((0.5 + frac * 2) * 20) / 20; // 0.5-2.5 in 0.05 steps
    if (commit) useStore.getState().setSpeed(v);
    else useStore.getState().set({ audioSpeed: v });
  }).current;
  const sliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => dragTo(e.nativeEvent.locationX, false),
    onPanResponderMove: e => dragTo(e.nativeEvent.locationX, false),
    onPanResponderRelease: e => dragTo(e.nativeEvent.locationX, true),
    onPanResponderTerminate: e => dragTo(e.nativeEvent.locationX, true),
  })).current;
  const showSessionChip = () => {
    setSessionChip(true);
    setTimeout(() => setSessionChip(false), SESSION_CHIP_MS);
  };

  // Real playback (Sept 12) — replaces the setInterval simulation that advanced
  // progress bars against no audio at all.
  const [done, setDone] = useState<number[]>([]);
  const queue = useAffirmationQueue({
    items: affs,
    recordings: voiceRecordings,
    speed: audioSpeed,
    onFinished: i => {
      setDone(d => (d.includes(i) ? d : [...d, i]));
      setCelebSeg(i);
      playCelebrationSmall();
      setTimeout(() => setCelebSeg(c => (c === i ? -1 : c)), 1100);
    },
    onQueueEnd: () => {
      setRingClosed(true);
      setBigCeleb(true);
      showSessionChip();
      playCelebrationLarge();
      setTimeout(() => setCelebSeg(-1), 4200);
      api.recordExperience('me', null, 'listened');
    },
  });

  const { index: curIdx, playing, position: pos, duration, hasAudio, playableCount } = queue;
  const togglePlay = queue.toggle;
  const skip = (fwd: boolean) => queue.skip(fwd);

  // Autoplay on entry — the notification landing behavior. Waits for sources to
  // resolve, and does nothing at all when the user has recorded nothing yet.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !hasAudio) return;
    autoStarted.current = true;
    const t = setTimeout(() => queue.start(0), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio]);

  // Progress is now the real track position, and the set's progress is "how
  // many have played through" rather than a fraction of a fake 34s track.
  const trackFrac = duration > 0 ? Math.min(1, pos / duration) : 0;
  const curAffIdx = Math.max(0, Math.min(affs.length - 1, curIdx));
  const ink = colors.ink;
  const muted = colors.warmGray;
  const playerCount = Math.min(affs.length, done.length + (curIdx >= 0 ? 1 : 0));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}>
      {/* header: close chevron · label · count */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Pressable onPress={() => { stop(); navigation.goBack(); }} hitSlop={8} style={{ marginLeft: -4, padding: 4 }}>
          <ChevronDownIcon size={24} color={ink} />
        </Pressable>
        {/* The Audio / Mind movie toggle lived here. Removed for v1 (Sept 11)
            with the media layer — the player is audio-only now. */}
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: muted }}>YOUR AFFIRMATIONS</Text>
        <Mono size={13} color={muted}>{playerCount}/{affs.length}</Mono>
      </View>

      <>
          {/* center: badge, segment rings, quote */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              <View style={{ backgroundColor: colors.aiTint, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.tealDeep }}>
                  {affs[curAffIdx]?.area} · I am
                </Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {affs.map((_, i) => {
                  const segFrac = done.includes(i) ? 1 : i === curIdx ? trackFrac : 0;
                  return segFrac >= 1 ? (
                    <DoneMark key={i} size={24} />
                  ) : (
                    <Svg key={i} width={24} height={24} viewBox="0 0 24 24">
                      <Circle cx={12} cy={12} r={9} fill="none" stroke={colors.border} strokeWidth={3} />
                      <Circle
                        cx={12} cy={12} r={9} fill="none" stroke={colors.teal} strokeWidth={3} strokeLinecap="round"
                        strokeDasharray={`${(SEG_CIRC * segFrac).toFixed(1)} ${(SEG_CIRC * (1 - segFrac)).toFixed(1)}`}
                        transform="rotate(-90 12 12)"
                      />
                    </Svg>
                  );
                })}
              </View>
              {celebSeg >= 0 && (
                <View pointerEvents="none" style={{ position: 'absolute', top: -8, left: `${((celebSeg + 0.5) / affs.length) * 100}%`, marginLeft: -8 }}>
                  <CelebStar size={16} durMs={1000} />
                </View>
              )}
            </View>
            <Serif size={27} color={colors.ink} style={{ textAlign: 'center', marginTop: 26, lineHeight: 40 }}>
              “{affText(store, curAffIdx) || affs[curAffIdx]?.statement}”
            </Serif>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, textAlign: 'center', marginTop: 18 }}>
              {hasAudio
                ? `Voice: your own · ${playableCount} of ${affs.length} recorded`
                : 'No recordings yet — record these in your own voice to listen.'}
            </Text>
          </View>

          {/* waveform + transport */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.5, height: 52 }}>
              {PLAYER_HEIGHTS.map((h, i) => (
                <View key={i} style={{
                  width: 4, height: h, borderRadius: 2,
                  backgroundColor: i / PLAYER_HEIGHTS.length < trackFrac ? colors.teal : colors.sand,
                }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Mono size={13}>{fmt(pos)}</Mono>
              <Mono size={13}>{fmt(duration)}</Mono>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 18 }}>
              <Pressable onPress={() => setSpeedSheet(true)} style={{
                width: 46, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.sand,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Mono size={12.5} color={colors.ink}>{fmtSpeed(audioSpeed)}</Mono>
              </Pressable>
              <Pressable onPress={() => skip(false)} hitSlop={6}><SkipIcon /></Pressable>
              <Pressable onPress={togglePlay} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                {playing ? <PauseFill size={22} /> : <View style={{ marginLeft: 3 }}><PlayFill size={24} /></View>}
              </Pressable>
              <Pressable onPress={() => skip(true)} hitSlop={6}><SkipIcon forward /></Pressable>
              {/* Loop: off → once → infinite. Teal = on (an active playback mode). */}
              <Pressable
                onPress={() => queue.setLoop(queue.loop === 'off' ? 'once' : queue.loop === 'once' ? 'infinite' : 'off')}
                style={{
                  width: 46, height: 30, borderRadius: 15,
                  borderWidth: 1, borderColor: queue.loop === 'off' ? colors.sand : colors.teal,
                  backgroundColor: queue.loop === 'off' ? 'transparent' : colors.aiTint,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3,
                }}
              >
                <LoopIcon color={queue.loop === 'off' ? colors.warmGray : colors.tealDeep} />
                {queue.loop === 'once' && <Mono size={10} color={colors.tealDeep}>1</Mono>}
                {queue.loop === 'infinite' && <Mono size={11} color={colors.tealDeep}>∞</Mono>}
              </Pressable>
            </View>

            {/* Sleep timer — 15 / 30 / 60 minutes of looping practice. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              {([15, 30, 60] as const).map(m => {
                const on = queue.timerMin === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => queue.setTimerMin(on ? null : m)}
                    style={{
                      borderRadius: 16, paddingVertical: 6, paddingHorizontal: 13,
                      borderWidth: 1, borderColor: on ? colors.teal : colors.sand,
                      backgroundColor: on ? colors.aiTint : 'transparent',
                    }}
                  >
                    <Mono size={12} color={on ? colors.tealDeep : colors.warmGray}>{m}m</Mono>
                  </Pressable>
                );
              })}
              {queue.timerMin !== null && (
                <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.tealDeep }}>
                  {fmt(queue.remainingSec)} left
                </Text>
              )}
            </View>
            {/* fixed-height slot: hint before completion, daily progress report after (auto-dismisses) */}
            <View style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
              {!ringClosed ? (
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, textAlign: 'center' }}>
                  Listening through closes ring <Mono size={13} color={colors.warmGray}>7</Mono> automatically.
                </Text>
              ) : sessionChip ? (
                <Animated.View entering={FadeInUp.duration(500)}>
                  <SessionChip />
                </Animated.View>
              ) : null}
            </View>
          </View>
        </>

      {/* all-complete celebration */}
      {bigCeleb && (
        <PlayerCeleb
          dark={false}
          sessionKey={`audio-${new Date().toDateString()}`}
          autoDismiss={store.moods[`audio-${new Date().toDateString()}`] !== undefined}
          onDone={() => setBigCeleb(false)}
        />
      )}

      {/* speed sheet */}
      {speedSheet && (
        <>
          <Animated.View entering={FadeIn.duration(250)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38,32,26,0.45)', zIndex: 30 }}>
            <Pressable onPress={() => setSpeedSheet(false)} style={{ flex: 1 }} />
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(300)} style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 31,
            backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingTop: 14, paddingHorizontal: 24, paddingBottom: 34,
          }}>
            <Pressable onPress={() => setSpeedSheet(false)} style={{ alignItems: 'center', paddingVertical: 6, marginVertical: -6 }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.sand }} />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 19, color: colors.ink }}>Speed</Text>
              <Mono size={17} color={colors.ink}>{audioSpeed.toFixed(2)}×</Mono>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 26 }}>
              <Pressable onPress={() => setSpeed(audioSpeed - 0.05)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, color: colors.ink }}>−</Text>
              </Pressable>
              <View
                style={{ flex: 1, height: 44, justifyContent: 'center' }}
                onLayout={e => { trackW.current = e.nativeEvent.layout.width; }}
                {...sliderPan.panHandlers}
              >
                <View pointerEvents="none" style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.teal, width: `${Math.round(((audioSpeed - 0.5) / 2) * 100)}%` }} />
                  <View style={{
                    position: 'absolute', top: -7.5, left: `${Math.round(((audioSpeed - 0.5) / 2) * 100)}%`, marginLeft: -10,
                    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.teal,
                    borderWidth: 3, borderColor: colors.cream,
                    shadowColor: colors.ink, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 3,
                  }} />
                </View>
              </View>
              <Pressable onPress={() => setSpeed(audioSpeed + 0.05)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20, color: colors.ink }}>+</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 28 }}>
              {SPEED_CHIPS.map(v => {
                const sel = Math.abs(audioSpeed - v) < 0.001;
                return (
                  <View key={v} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                    <Pressable onPress={() => setSpeed(v)} style={{
                      width: '100%', height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5, borderColor: sel ? colors.teal : colors.sand,
                      backgroundColor: sel ? colors.aiTint : 'transparent',
                    }}>
                      <Mono size={14} color={sel ? colors.tealDeep : colors.ink}>{v.toFixed(1)}</Mono>
                    </Pressable>
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 9.5, letterSpacing: 1, color: colors.warmGray, height: 12 }}>
                      {sel ? 'DEFAULT' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}
