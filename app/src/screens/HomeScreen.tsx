import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Animated, {
  Easing, Extrapolation, FadeIn, FadeInUp, interpolate,
  useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { Mono, Serif } from '../components/ui';
import {
  BellIcon, ChevronDownIcon, DoneMark, FilmIcon, FlameIcon, HeadphonesIcon,
  MicIcon, PauseFill, PencilIcon, PlayFill, StarBurst, VideoIcon, XIcon,
} from '../components/brandIcons';
import { DancingBars } from '../components/AnimatedBars';
import { BurstRing, CelebStar, ChipPop, Confetti } from '../components/Celebration';
import MoodCheckIn from '../components/MoodCheckIn';
import { affSet, affText, useStore } from '../store';
import { api } from '../api/client';
import { MOCK_AFFS } from '../api/mockData';
import { NOTIFS } from '../api/socialMock';
import SocialAvatar from '../components/Avatar';
import { playCelebrationLarge, playCelebrationSmall } from '../audio/sfx';

const AI_SPARK_PATH = 'M7 1v12M1 7h12M2.8 2.8l8.4 8.4M11.2 2.8l-8.4 8.4';

const NOTIF_AV = [
  { bg: colors.teal, ink: colors.cream }, { bg: '#EFE6D2', ink: colors.ink },
  { bg: colors.gold, ink: colors.ink }, { bg: colors.tealDeep, ink: colors.cream },
  { bg: colors.sand, ink: colors.ink },
];

/** Notification badge glyphs — verbatim design paths (like / comment / friend request). */
function NotifBadge({ type }: { type: string }) {
  if (type === 'like') return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill={colors.ink}>
      <Path d="M12 21s-7.5-4.7-10-9.2C.5 8 2.5 4.5 6 4.5c2.1 0 3.6 1.1 4.5 2.6h3c.9-1.5 2.4-2.6 4.5-2.6 3.5 0 5.5 3.5 4 7.3C19.5 16.3 12 21 12 21z" />
    </Svg>
  );
  if (type === 'comment') return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
    </Svg>
  );
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M15 20v-1.5a4 4 0 0 0-4-4H5.5a4 4 0 0 0-4 4V20M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 6v6M22 9h-6" />
    </Svg>
  );
}

const RING_R = 9;
const RING_C = 2 * Math.PI * RING_R;

/** Module-scoped: resets only when the JS bundle reloads, i.e. once per app session. */
let streakCelebFired = false;

/** Small progress ring (design's per-affirmation ring + rings-today segments). */
function Ring({ size, frac, stroke = colors.teal, track = colors.border, width = 3, fill = 'none' }: {
  size: number; frac?: number; stroke?: string; track?: string; width?: number; fill?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={RING_R} fill={fill} stroke={track} strokeWidth={width} />
      {frac !== undefined && (
        <Circle
          cx={12} cy={12} r={RING_R} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round"
          strokeDasharray={`${(RING_C * frac).toFixed(1)} ${(RING_C * (1 - frac)).toFixed(1)}`}
          transform="rotate(-90 12 12)"
        />
      )}
    </Svg>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/**
 * Home (design section 9). Affirmation rows are tracked sessions: audio,
 * video, or an explicit ring-tap completes a card; all 7 triggers the big
 * celebration + mood check-in. Browsing the list itself is untracked.
 */
export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useStore();
  const { affirmations, homeReadDone, streakDays, userName, welcome, schedPlan, freq, edits, voiceRecordings, set } = store;

  const [expanded, setExpanded] = useState(-1);
  const [audioIdx, setAudioIdx] = useState(-1);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [videoIdx, setVideoIdx] = useState(-1);
  const [videoPos, setVideoPos] = useState(0);
  const [celebIdx, setCelebIdx] = useState(-1);
  const [bigCeleb, setBigCeleb] = useState(false);
  const [streakCeleb, setStreakCeleb] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const [notifAccepted, setNotifAccepted] = useState<Record<number, boolean>>({});
  const audioTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPosRef = useRef(0);
  const videoPosRef = useRef(0);

  const affs = affSet(affirmations);
  // Voice coverage drives the record-all prompt. MUST count against `affs`, not
  // the store array: signing in without running onboarding leaves the store
  // empty and Home falls back to the mock, which made the prompt never render.
  const recordedCount = affs.filter(a => voiceRecordings[a.id]).length;
  const unrecordedCount = Math.max(0, affs.length - recordedCount);
  useEffect(() => {
    if (!affirmations.length) set({ affirmations: MOCK_AFFS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Streak pill pop — design: chipPop 0.8s bezier(0.34,1.56,0.64,1) 0.3s both.
  const pillT = useSharedValue(1);
  useEffect(() => {
    if (!streakCeleb) return;
    pillT.value = 0;
    pillT.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }));
  }, [streakCeleb, pillT]);
  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pillT.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pillT.value, [0, 0.6, 1], [0.5, 1.1, 1], Extrapolation.CLAMP) }],
  }));

  // Streak confetti on the first Home landing of each app session (per Trevor, July 13 —
  // session-scoped, not day-scoped; tabbing away and back does NOT re-fire).
  useEffect(() => {
    if (streakCelebFired) return;
    streakCelebFired = true;
    let alive = true;
    setTimeout(() => { if (alive) { setStreakCeleb(true); playCelebrationLarge(); } }, 400);
    setTimeout(() => { if (alive) setStreakCeleb(false); }, 4600);
    return () => { alive = false; };
  }, []);

  // Repeat all-seven completions (mood already recorded today) auto-dismiss the
  // celebration after a few seconds; tap-outside always dismisses (July 13 fix).
  const moodKey = `home-${new Date().toDateString()}`;
  const moodAlreadyPicked = store.moods[moodKey] !== undefined;
  useEffect(() => {
    if (!bigCeleb || !moodAlreadyPicked) return;
    const t = setTimeout(() => setBigCeleb(false), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bigCeleb]);

  const clearTimers = () => {
    if (audioTimer.current) clearInterval(audioTimer.current);
    if (videoTimer.current) clearInterval(videoTimer.current);
    audioTimer.current = null; videoTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  const cardDur = (i: number) => 14 + ((i * 7) % 12);

  const completeCard = (i: number, autoplay: boolean, video: boolean) => {
    clearTimers();
    const done = useStore.getState().homeReadDone;
    const wasDone = done.includes(i);
    const nd = wasDone ? done : [...done, i];
    const next = i < affs.length - 1 ? i + 1 : -1;
    set({ homeReadDone: nd });
    audioPosRef.current = 0; videoPosRef.current = 0;
    setAudioIdx(-1); setAudioPlaying(false); setAudioPos(0);
    setVideoIdx(-1); setVideoPos(0);
    setExpanded(next);
    setCelebIdx(i);
    setTimeout(() => setCelebIdx(c => (c === i ? -1 : c)), 1100);
    api.recordExperience('me', affs[i]?.id ?? null, video ? 'watched' : 'listened');
    // Session celebration fires only when THIS completion newly closes the final
    // ring — replaying an already-completed card never re-triggers it.
    if (!wasDone && nd.length === affs.length) {
      setBigCeleb(true);
      playCelebrationLarge();
    } else {
      playCelebrationSmall();
      if (autoplay && next !== -1 && nd.length < affs.length) (video ? playVideo : playAudio)(next);
    }
  };

  const playAudio = (i: number) => {
    clearTimers();
    videoPosRef.current = 0;
    setVideoIdx(-1); setVideoPos(0);
    if (audioIdx !== i) { audioPosRef.current = 0; setAudioPos(0); } // resume keeps position
    setAudioIdx(i); setAudioPlaying(true); setExpanded(i);
    const dur = cardDur(i);
    audioTimer.current = setInterval(() => {
      audioPosRef.current += 0.25;
      if (audioPosRef.current >= dur) completeCard(i, true, false);
      else setAudioPos(audioPosRef.current);
    }, 250);
  };

  const toggleAudio = (i: number, playing: boolean) => {
    if (playing) { clearTimers(); setAudioPlaying(false); }
    else playAudio(i);
  };

  const playVideo = (i: number) => {
    clearTimers();
    audioPosRef.current = 0; videoPosRef.current = 0;
    setAudioIdx(-1); setAudioPlaying(false); setAudioPos(0);
    setVideoIdx(i); setVideoPos(0); setExpanded(i);
    videoTimer.current = setInterval(() => {
      videoPosRef.current += 0.25;
      if (videoPosRef.current >= 45) completeCard(i, true, true);
      else setVideoPos(videoPosRef.current);
    }, 250);
  };

  const toggleVideo = (i: number) => {
    if (videoIdx === i) {
      clearTimers();
      videoPosRef.current = 0;
      setVideoIdx(-1); setVideoPos(0);
      setExpanded(e => (e === i ? -1 : e));
    } else playVideo(i);
  };

  const startEdit = () => {
    if (editing) { setEditing(false); return; }
    clearTimers();
    setAudioIdx(-1); setAudioPlaying(false); setAudioPos(0);
    setVideoIdx(-1); setVideoPos(0); setExpanded(-1);
    setDrafts(affs.map((_, i) => affText(store, i)));
    setEditing(true);
  };

  const saveEdit = () => {
    const ne = { ...edits };
    drafts.forEach((t, i) => { const v = (t || '').trim(); if (v) ne[i] = v; });
    set({ edits: ne });
    setEditing(false);
  };

  const readCount = homeReadDone.length;
  const dailyRings = schedPlan === 'custom' ? freq : 10;
  const ringsDone = Math.min(4, dailyRings);
  // 2nd ring rendered terracotta in the design — a session done out of alignment.
  const ringStroke = (i: number) => (i < ringsDone ? (i === 1 ? colors.terracotta : colors.teal) : colors.border);
  const ringFill = (i: number) => (i < ringsDone ? (i === 1 ? 'rgba(194,94,76,0.25)' : 'rgba(21,122,110,0.25)') : 'none');
  const weekHeights = [14, 20, 10, 26, 21, 17, 8];

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      {/* frozen header — everything above the greeting stays pinned on scroll (Trevor, July 13) */}
      <View style={{ paddingTop: 64, paddingHorizontal: 22, paddingBottom: 8, backgroundColor: colors.cream }}>
        {/* day-one welcome banner */}
        {welcome && (
          <Animated.View entering={FadeInUp.duration(500)} style={{
            backgroundColor: colors.aiTint, borderRadius: 16, padding: 14, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18,
          }}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={colors.tealDeep} strokeWidth={1.5} strokeLinecap="round" style={{ marginTop: 3 }}>
              <Path d={AI_SPARK_PATH} />
            </Svg>
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.tealDeep, lineHeight: 20 }}>
              Your practice starts now — first affirmation arrives at <Mono size={13.5} color={colors.tealDeep}>12:00</Mono>.
            </Text>
            <Pressable onPress={() => set({ welcome: false })} hitSlop={8}>
              <XIcon size={14} color={colors.tealDeep} strokeWidth={1.8} />
            </Pressable>
          </Animated.View>
        )}

        {/* header (pinned, greeting included — freeze line sits below it, July 13) */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.warmGray }}>{dateLabel}</Text>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 28, lineHeight: 34, color: colors.ink, letterSpacing: -0.5, marginTop: 2 }}>
              {greeting()},{'\n'}{userName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Animated.View
              style={[pillStyle, {
                backgroundColor: colors.ink, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 15,
                flexDirection: 'row', alignItems: 'center', gap: 8,
              }]}
            >
              <FlameIcon size={15} />
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 16, color: colors.cream }}>{streakDays}</Text>
              {streakCeleb && (
                <View pointerEvents="none" style={{ position: 'absolute', top: -12, left: '50%', marginLeft: -8 }}>
                  <CelebStar size={16} durMs={1200} delayMs={500} />
                </View>
              )}
            </Animated.View>
            <Pressable onPress={() => { setNotifOpen(true); setNotifSeen(true); }} style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
              borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
            }}>
              <BellIcon />
              {!notifSeen && (
                <View style={{
                  position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
                  backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.cream,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
                }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11, color: colors.ink }}>{NOTIFS.length}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12 }}>
        {/* stat cards — first scrolling element */}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 }}>
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 24, color: colors.ink }}>{ringsDone}/{dailyRings}</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, marginTop: 3 }}>Session rings today</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 14 }}>
              {Array.from({ length: dailyRings }, (_, i) => (
                <Svg key={i} width={13} height={13} viewBox="0 0 24 24">
                  <Circle cx={12} cy={12} r={9} fill={ringFill(i)} stroke={ringStroke(i)} strokeWidth={3.6} />
                </Svg>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 }}>
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 24, color: colors.ink }}>
              92<Text style={{ fontSize: 16 }}>%</Text>
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, marginTop: 3 }}>This week</Text>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 26, marginTop: 10 }}>
              {weekHeights.map((h, i) => (
                <View key={i} style={{ flex: 1, height: h, borderRadius: 4, backgroundColor: i < 6 ? colors.gold : colors.sand }} />
              ))}
            </View>
          </View>
        </View>

        {/* affirmations card */}
        <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => nav.navigate('Player', { mode: 'audio' })} style={{
              flexDirection: 'row', alignItems: 'center', gap: 7,
              backgroundColor: colors.teal, borderRadius: 17, paddingVertical: 8, paddingHorizontal: 14,
            }}>
              <PlayFill size={11} />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white }}>Play all</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: colors.warmGray }}>YOUR AFFIRMATIONS</Text>
              <Pressable onPress={startEdit} style={{
                width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: editing ? colors.gold : 'transparent',
              }}>
                <PencilIcon size={14} color={editing ? colors.ink : colors.inactive} />
              </Pressable>
            </View>
          </View>

          {/* Record-all prompt — the way back in for anyone who skipped the
              onboarding recorder. Disappears once the whole set is recorded. */}
          {!editing && unrecordedCount > 0 && (
            <Pressable
              onPress={() => nav.navigate('VoiceRecorder')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
                backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
                borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14,
              }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                <MicIcon size={15} color={colors.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14.5, color: colors.ink }}>
                  {recordedCount === 0 ? 'Record these in your own voice' : `Record the other ${unrecordedCount}`}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.warmGray, marginTop: 1 }}>
                  {recordedCount === 0
                    ? 'Your own voice is the strongest signal'
                    : `${recordedCount} of ${affs.length} already in your voice`}
                </Text>
              </View>
              <ChevronDownIcon size={16} />
            </Pressable>
          )}

          {!editing ? (
            <View style={{ marginTop: 8 }}>
              {affs.map((a, i) => {
                const text = affText(store, i);
                const done = homeReadDone.includes(i);
                const active = audioIdx === i;
                const playing = active && audioPlaying;
                const videoOpen = videoIdx === i;
                const isExpanded = expanded === i;
                const frac = active ? Math.min(1, audioPos / cardDur(i))
                  : videoOpen ? Math.min(1, videoPos / 45)
                  : readCount / affs.length;
                return (
                  <View key={a.id}>
                    <Pressable onPress={() => setExpanded(isExpanded ? -1 : i)} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
                      borderBottomWidth: 1, borderBottomColor: i < affs.length - 1 ? colors.borderSoft : 'transparent',
                    }}>
                      {/* completion star — design celebStar: rise 18px, overshoot, fade */}
                      {celebIdx === i && (
                        <View pointerEvents="none" style={{ position: 'absolute', right: 38, top: 4, zIndex: 2 }}>
                          <CelebStar size={16} durMs={1000} />
                        </View>
                      )}
                      {/* audio scrub along the row's bottom edge */}
                      {active && (
                        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, borderRadius: 2, backgroundColor: colors.borderSoft }}>
                          <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.teal, width: `${Math.round(Math.min(1, audioPos / cardDur(i)) * 100)}%` }} />
                        </View>
                      )}
                      <Pressable onPress={() => toggleAudio(i, playing)} style={{
                        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: playing ? colors.teal : colors.white,
                        borderWidth: 1, borderColor: playing ? colors.teal : colors.sand,
                      }}>
                        {playing ? <PauseFill size={12} /> : <HeadphonesIcon size={14} />}
                      </Pressable>
                      <Pressable onPress={() => toggleVideo(i)} style={{
                        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: videoOpen ? colors.gold : colors.white,
                        borderWidth: 1, borderColor: videoOpen ? colors.gold : colors.sand,
                      }}>
                        <VideoIcon size={14} color={videoOpen ? colors.ink : colors.teal} />
                      </Pressable>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text numberOfLines={isExpanded ? undefined : 1} style={{
                          fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22,
                          color: done ? colors.teal : colors.ink,
                        }}>
                          “{text}”
                        </Text>
                        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 1.4, color: colors.inactive, textTransform: 'uppercase' }}>
                          {a.area}
                        </Text>
                      </View>
                      {isExpanded || playing || videoOpen ? (
                        <Pressable onPress={() => completeCard(i, false, false)} hitSlop={5} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                          <Ring size={26} frac={frac} />
                        </Pressable>
                      ) : done ? (
                        <DoneMark size={18} />
                      ) : (
                        <ChevronDownIcon size={16} />
                      )}
                    </Pressable>

                    {/* voice row — record this one, or hear which voice carries it.
                        Present for anyone who skipped some (or all) of the
                        onboarding recorder (Trevor, Sept 11). */}
                    {isExpanded && (
                      <Animated.View entering={FadeInUp.duration(280)} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, paddingTop: 2,
                      }}>
                        <Pressable
                          onPress={() => nav.navigate('VoiceRecorder', { affirmationId: a.id })}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 7,
                            backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand,
                            borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13,
                          }}
                        >
                          <MicIcon size={13} color={colors.ink} />
                          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}>
                            {voiceRecordings[a.id] ? 'Re-record' : 'Record in my voice'}
                          </Text>
                        </Pressable>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.inactive }}>
                          {voiceRecordings[a.id] ? 'Your voice' : 'AI voice'}
                        </Text>
                      </Animated.View>
                    )}

                    {/* inline scene video */}
                    {videoOpen && (
                      <Animated.View entering={FadeInUp.duration(350)} style={{ marginTop: 4, marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.ink }}>
                        <View style={{ aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
                          <View style={{ position: 'absolute', top: -80, left: -60, width: 300, height: 220, borderRadius: 150, backgroundColor: '#3A4A2E', opacity: 0.55 }} />
                          {/* design: text fades in over 1.2s as the "scene" opens */}
                          <Animated.View entering={FadeIn.duration(1200)}>
                            <Serif size={17} color={colors.cream} style={{ textAlign: 'center', lineHeight: 25 }}>“{text}”</Serif>
                          </Animated.View>
                          <View style={{ position: 'absolute', top: 12, right: 12 }}>
                            <DancingBars heights={[11, 11, 11]} color={colors.gold} width={2.5} gap={2.5} />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
                          <Pressable onPress={() => toggleVideo(i)} style={{
                            width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(250,244,232,0.12)',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <PauseFill size={11} color={colors.cream} />
                          </Pressable>
                          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(250,244,232,0.18)', overflow: 'hidden' }}>
                            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.gold, width: `${Math.round(Math.min(1, videoPos / 45) * 100)}%` }} />
                          </View>
                          <Mono size={12} color={colors.inactive}>0:45</Mono>
                        </View>
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 14, marginTop: 16 }}>
              {affs.map((a, i) => (
                <View key={a.id} style={{ gap: 6 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 1.4, color: colors.inactive, textTransform: 'uppercase' }}>
                    {a.area}
                  </Text>
                  <TextInput
                    value={drafts[i] ?? ''}
                    onChangeText={t => setDrafts(d => { const nd = [...d]; nd[i] = t; return nd; })}
                    multiline
                    style={{
                      borderRadius: 12, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white,
                      paddingVertical: 10, paddingHorizontal: 12, minHeight: 68,
                      fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22, color: colors.ink, textAlignVertical: 'top',
                    }}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Pressable onPress={() => setEditing(false)} style={{
                  flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.sand,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.ink }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveEdit} style={{
                  flex: 1, height: 46, borderRadius: 23, backgroundColor: colors.teal,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.cream }}>Save changes</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* full mind movie */}
        <Pressable onPress={() => nav.navigate('Player', { mode: 'movie' })} style={{
          backgroundColor: colors.ink, borderRadius: 20, padding: 18, marginTop: 14,
          flexDirection: 'row', alignItems: 'center', gap: 14,
        }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <FilmIcon size={19} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 17, color: colors.cream }}>Full Mind Movie</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.inactive, marginTop: 3 }}>New scene generated from goal 3</Text>
          </View>
          <Mono size={14} color={colors.gold}>0:45</Mono>
        </Pressable>
      </ScrollView>

      {/* once-a-day streak confetti */}
      {streakCeleb && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 40 }}>
          <Confetti />
        </View>
      )}

      {/* all-seven celebration + mood check-in */}
      {bigCeleb && (
        <View pointerEvents="box-none" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', zIndex: 40,
        }}>
          <Pressable onPress={() => setBigCeleb(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <Confetti />
          <BurstRing color={colors.gold} borderWidth={4} durMs={1100} />
          <BurstRing color={colors.teal} borderWidth={3} durMs={1300} delayMs={200} />
          <BurstRing color={colors.gold} borderWidth={2} durMs={1500} delayMs={400} />
          <ChipPop durMs={600} delayMs={200} style={{
            backgroundColor: colors.ink, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 26,
            flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '90%',
            shadowColor: colors.ink, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
          }}>
            <StarBurst size={22} />
            <Text style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 17, color: colors.cream }}>
              Congratulations! All {affs.length} affirmations complete!
            </Text>
          </ChipPop>
          <ChipPop durMs={600} delayMs={450} style={{
            backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 22,
            paddingVertical: 16, paddingHorizontal: 22, marginTop: 14,
          }}>
            <MoodCheckIn sessionKey={moodKey} onDone={() => setBigCeleb(false)} />
          </ChipPop>
        </View>
      )}

      {/* notifications sheet */}
      {notifOpen && (
        <>
          <Animated.View entering={FadeIn.duration(250)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38,32,26,0.4)', zIndex: 40 }}>
            <Pressable onPress={() => setNotifOpen(false)} style={{ flex: 1 }} />
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(300)} style={{
            position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 41,
            backgroundColor: colors.cream, borderRadius: 30, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 12,
            maxHeight: '75%',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 10 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.ink }}>Notifications</Text>
              <Pressable onPress={() => setNotifOpen(false)} hitSlop={8}>
                <XIcon size={16} />
              </Pressable>
            </View>
            <ScrollView>
              {NOTIFS.map((n, i) => {
                const av = NOTIF_AV[i % NOTIF_AV.length];
                const accepted = !!notifAccepted[i];
                return (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 4,
                    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
                  }}>
                    <View>
                      <SocialAvatar name={n.name} size={46} bg={av.bg} ink={av.ink} fontSize={17} />
                      <View style={{
                        position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10,
                        backgroundColor: n.type === 'like' ? colors.gold : n.type === 'comment' ? colors.teal : colors.ink,
                        borderWidth: 2, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center',
                      }}>
                        <NotifBadge type={n.type} />
                      </View>
                    </View>
                    <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: '#5C5142', lineHeight: 20 }}>
                      <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>{n.name}</Text> {n.text}{' '}
                      <Text style={{ color: colors.inactive }}>· {n.time}</Text>
                    </Text>
                    {n.type === 'request' && !accepted && (
                      <Pressable onPress={() => setNotifAccepted(a => ({ ...a, [i]: true }))} style={{
                        height: 32, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.teal,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white }}>Add back</Text>
                      </Pressable>
                    )}
                    {n.type === 'request' && accepted && (
                      <View style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, backgroundColor: '#EFE6D2', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>Added</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}
