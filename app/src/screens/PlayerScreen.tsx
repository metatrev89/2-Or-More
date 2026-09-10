import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, PanResponder } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts, timing } from '../theme';
import { Mono, Serif } from '../components/ui';
import { ChevronDownIcon, DoneMark, PauseFill, PlayFill, StarBurst } from '../components/brandIcons';
import { BurstRing, CelebStar, ChipPop, Confetti } from '../components/Celebration';
import MoodCheckIn from '../components/MoodCheckIn';
import { affText, useStore } from '../store';
import { api } from '../api/client';
import { MOCK_AFFS } from '../api/mockData';
import { playCelebrationLarge, playCelebrationSmall } from '../audio/sfx';

const AUDIO_DUR = 34;
/** Mock daily-progress figure shown in the session-complete chip (live: from stats/summary). */
const SESSIONS_TODAY = '3 of 7';
const SESSION_CHIP_MS = 5200; // linger through the celebration, then slip away
const sceneDur = (i: number) => 9 + ((i * 7) % 5); // design's illustrative timings; real scenes are audio-driven 3-8s
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
 * The "all complete" celebration overlay (audio: ink chip; movie: cream chip).
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
 * passes; completion closes the ring. Movie: ink theater with scene canvas,
 * auto-hiding chrome, and a scene list (maps to backend scene_clip assets).
 */
export default function PlayerScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Player'>) {
  const store = useStore();
  const { audioSpeed, setSpeed } = store;
  const affs = store.affirmations.length ? store.affirmations : MOCK_AFFS;
  const [mode, setMode] = useState<'audio' | 'movie'>(route.params.mode);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [watched, setWatched] = useState<number[]>(store.movieWatched);
  const [celebSeg, setCelebSeg] = useState(-1);
  const [movieCelebIdx, setMovieCelebIdx] = useState(-1);
  const [ringClosed, setRingClosed] = useState(false);
  const [sessionChip, setSessionChip] = useState(false);
  const [bigCeleb, setBigCeleb] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [speedSheet, setSpeedSheet] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const posRef = useRef(0);
  const sceneRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const movie = mode === 'movie';
  const dur = movie ? sceneDur(sceneIdx) : AUDIO_DUR;

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => () => { stop(); if (chromeTimer.current) clearTimeout(chromeTimer.current); }, []);

  const showSessionChip = () => {
    setSessionChip(true);
    setTimeout(() => setSessionChip(false), SESSION_CHIP_MS);
  };

  const showChrome = (isPlaying: boolean) => {
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    setChrome(true);
    if (isPlaying) chromeTimer.current = setTimeout(() => setChrome(false), timing.chromeHideMs);
  };

  const tick = () => {
    const isMovie = modeRef.current === 'movie';
    const d = isMovie ? sceneDur(sceneRef.current) : AUDIO_DUR;
    const p = posRef.current + 0.25 * (useStore.getState().audioSpeed || 1);
    if (p >= d) {
      if (isMovie) {
        const idx = sceneRef.current;
        setWatched(w => {
          const nw = w.includes(idx) ? w : [...w, idx];
          useStore.getState().set({ movieWatched: nw });
          return nw;
        });
        if (idx < affs.length - 1) {
          sceneRef.current = idx + 1; posRef.current = 0;
          setSceneIdx(idx + 1); setPos(0);
          setMovieCelebIdx(idx);
          playCelebrationSmall();
          setTimeout(() => setMovieCelebIdx(c => (c === idx ? -1 : c)), 1100);
          showChrome(true);
        } else {
          stop();
          posRef.current = d; setPos(d); setPlaying(false);
          setRingClosed(true); setMovieCelebIdx(idx); setBigCeleb(true);
          showSessionChip();
          playCelebrationLarge();
          setTimeout(() => setMovieCelebIdx(-1), 4200);
          showChrome(false);
          api.recordExperience('me', null, 'watched_movie');
        }
      } else {
        stop();
        posRef.current = d; setPos(d); setPlaying(false);
        setRingClosed(true); setCelebSeg(affs.length - 1); setBigCeleb(true);
        showSessionChip();
        playCelebrationLarge();
        setTimeout(() => setCelebSeg(-1), 4200);
        api.recordExperience('me', null, 'listened');
      }
    } else {
      if (!isMovie) {
        const unit = AUDIO_DUR / affs.length;
        const before = Math.floor(posRef.current / unit);
        const after = Math.floor(p / unit);
        if (after > before && after < affs.length) {
          setCelebSeg(after - 1);
          playCelebrationSmall();
          setTimeout(() => setCelebSeg(c => (c === after - 1 ? -1 : c)), 1100);
        }
      }
      posRef.current = p;
      setPos(p);
    }
  };

  const togglePlay = () => {
    if (playing) {
      stop(); setPlaying(false);
      if (movie) showChrome(false);
      return;
    }
    const d = modeRef.current === 'movie' ? sceneDur(sceneRef.current) : AUDIO_DUR;
    if (posRef.current >= d) { posRef.current = 0; setPos(0); }
    setPlaying(true);
    if (modeRef.current === 'movie') showChrome(true);
    timer.current = setInterval(tick, 250);
  };

  // Autoplay on entry — the notification landing behavior.
  useEffect(() => {
    const t = setTimeout(() => { if (!timer.current) togglePlay(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const switchMode = (m: 'audio' | 'movie') => {
    if (m === mode) return;
    stop(); setPlaying(false);
    posRef.current = 0; setPos(0);
    sceneRef.current = 0; setSceneIdx(0);
    setRingClosed(false); setChrome(true);
    setMode(m);
  };

  const selectScene = (i: number) => {
    stop(); setPlaying(false);
    sceneRef.current = i; posRef.current = 0;
    setSceneIdx(i); setPos(0);
    togglePlay();
  };

  const skip = (fwd: boolean) => {
    if (movie) {
      selectScene(fwd ? Math.min(affs.length - 1, sceneIdx + 1) : Math.max(0, sceneIdx - 1));
    } else {
      const unit = AUDIO_DUR / affs.length;
      const cur = Math.floor(posRef.current / unit);
      const target = fwd ? Math.min(affs.length - 1, cur + 1) : Math.max(0, cur - 1);
      posRef.current = target * unit; setPos(target * unit);
    }
  };

  const frac = Math.min(1, pos / dur);
  const audioFrac = Math.min(1, pos / AUDIO_DUR);
  const curAffIdx = movie ? sceneIdx : Math.min(affs.length - 1, Math.floor(audioFrac * affs.length));
  const ink = movie ? colors.cream : colors.ink;
  const muted = movie ? 'rgba(250,244,232,0.55)' : colors.warmGray;
  const playerCount = movie ? sceneIdx + 1 : Math.min(affs.length, Math.floor(audioFrac * affs.length) + 1);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: movie ? colors.ink : colors.cream, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 }}>
      {/* header: close chevron · mode toggle · count */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Pressable onPress={() => { stop(); navigation.goBack(); }} hitSlop={8} style={{ marginLeft: -4, padding: 4 }}>
          <ChevronDownIcon size={24} color={ink} />
        </Pressable>
        <View style={{ flexDirection: 'row', backgroundColor: movie ? 'rgba(250,244,232,0.12)' : '#EFE6D2', borderRadius: 20, padding: 3 }}>
          <Pressable onPress={() => switchMode('audio')} style={{
            height: 34, paddingHorizontal: 18, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
            backgroundColor: !movie ? colors.ink : 'transparent',
          }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: !movie ? colors.cream : 'rgba(250,244,232,0.7)' }}>Audio</Text>
          </Pressable>
          <Pressable onPress={() => switchMode('movie')} style={{
            height: 34, paddingHorizontal: 18, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
            backgroundColor: movie ? colors.gold : 'transparent',
          }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: movie ? colors.ink : colors.warmGray }}>Mind movie</Text>
          </Pressable>
        </View>
        <Mono size={13} color={muted}>{playerCount}/{affs.length}</Mono>
      </View>

      {mode === 'audio' ? (
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
                  const unit = AUDIO_DUR / affs.length;
                  const segFrac = Math.max(0, Math.min(1, (pos - i * unit) / unit));
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
              Voice: your own · recorded July 9
            </Text>
          </View>

          {/* waveform + transport */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.5, height: 52 }}>
              {PLAYER_HEIGHTS.map((h, i) => (
                <View key={i} style={{
                  width: 4, height: h, borderRadius: 2,
                  backgroundColor: i / PLAYER_HEIGHTS.length < audioFrac ? colors.teal : colors.sand,
                }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Mono size={13}>{fmt(pos)}</Mono>
              <Mono size={13}>0:34</Mono>
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
              <View style={{ width: 46 }} />
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
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          {/* scene canvas */}
          <Pressable onPress={() => showChrome(playing)} style={{ height: 230, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2E2820' }}>
            {/* approximated design gradients: warm gold top-right, teal bottom-left over dark */}
            <View style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 200, borderRadius: 130, backgroundColor: 'rgba(233,184,76,0.28)' }} />
            <View style={{ position: 'absolute', bottom: -70, left: -50, width: 260, height: 200, borderRadius: 130, backgroundColor: 'rgba(21,122,110,0.22)' }} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38,32,26,0.25)' }} />
            {chrome && (
              <Animated.View entering={FadeIn.duration(300)} style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(38,32,26,0.75)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 11 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.gold }}>
                  {sceneIdx + 1} of {affs.length} · {affs[sceneIdx]?.area}
                </Text>
              </Animated.View>
            )}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable onPress={togglePlay} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
                {playing ? <PauseFill size={20} /> : <View style={{ marginLeft: 3 }}><PlayFill size={22} /></View>}
              </Pressable>
            </View>
            {chrome && (
              <Animated.View entering={FadeIn.duration(300)} style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(250,244,232,0.25)' }}>
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.gold, width: `${Math.round(frac * 100)}%` }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                  <Mono size={12} color={colors.gold}>{fmt(pos)}</Mono>
                  <Mono size={12} color="rgba(250,244,232,0.6)">{fmt(sceneDur(sceneIdx))}</Mono>
                </View>
              </Animated.View>
            )}
          </Pressable>

          <Serif size={19} color={colors.cream} style={{ textAlign: 'center', marginTop: 24, lineHeight: 28 }}>
            “{affText(store, sceneIdx) || affs[sceneIdx]?.statement}”
          </Serif>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: 'rgba(250,244,232,0.55)', textAlign: 'center', marginTop: 8 }}>
            Audio: your voice · overlaid
          </Text>

          {/* scene list */}
          <View style={{ gap: 8, marginTop: 26, marginBottom: 12 }}>
            {affs.map((a, i) => {
              const isWatched = watched.includes(i);
              const isCur = i === sceneIdx;
              return (
                <Pressable key={a.id} onPress={() => selectScene(i)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14,
                  paddingVertical: 12, paddingHorizontal: 14,
                  backgroundColor: isCur ? 'rgba(233,184,76,0.14)' : isWatched ? 'rgba(21,122,110,0.14)' : 'rgba(250,244,232,0.05)',
                }}>
                  {movieCelebIdx === i && (
                    <View pointerEvents="none" style={{ position: 'absolute', left: 26, top: 2, zIndex: 2 }}>
                      <CelebStar size={16} durMs={1000} />
                    </View>
                  )}
                  {isWatched ? (
                    <DoneMark size={18} />
                  ) : (
                    <Mono size={12} color={isCur ? colors.gold : 'rgba(250,244,232,0.4)'} style={{ width: 16 }}>{i + 1}</Mono>
                  )}
                  <Text numberOfLines={1} style={{
                    flex: 1, fontFamily: fonts.sans, fontSize: 14,
                    color: isCur ? colors.cream : isWatched ? 'rgba(250,244,232,0.85)' : 'rgba(250,244,232,0.6)',
                  }}>
                    “{affText(store, i) || a.statement}”
                  </Text>
                  <Mono size={12} color={isCur ? colors.gold : isWatched ? colors.teal : 'rgba(250,244,232,0.4)'}>
                    {fmt(sceneDur(i))}
                  </Mono>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* session-complete chip in the movie theater (audio mode has its inline slot) */}
      {movie && sessionChip && (
        <Animated.View
          entering={FadeInUp.duration(500)}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center', zIndex: 30 }}
        >
          <SessionChip onDark />
        </Animated.View>
      )}

      {/* all-complete celebration */}
      {bigCeleb && (
        <PlayerCeleb
          dark={movie}
          sessionKey={`${mode}-${new Date().toDateString()}`}
          autoDismiss={store.moods[`${mode}-${new Date().toDateString()}`] !== undefined}
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
