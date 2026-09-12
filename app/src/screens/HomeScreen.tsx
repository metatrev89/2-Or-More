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
  BellIcon, ChevronDownIcon, DoneMark, FlameIcon,
  MicIcon, PencilIcon, PlayFill, XIcon,
} from '../components/brandIcons';
import { DancingBars } from '../components/AnimatedBars';
import { CelebStar, Confetti } from '../components/Celebration';
import { affSet, affText, useStore } from '../store';
import { useAudioSession } from '../audio/AudioSession';
import { isLiveMode } from '../api/supabase';
import { loadAffirmations, updateAffirmationText } from '../api/affirmationsRepo';
import { MOCK_AFFS } from '../api/mockData';
import { NOTIFS } from '../api/socialMock';
import SocialAvatar from '../components/Avatar';
import { playCelebrationLarge } from '../audio/sfx';

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
 * Home (design section 9). Affirmation rows are tracked sessions: audio or an
 * explicit ring-tap completes a card; the full set triggers the big celebration
 * + mood check-in. Browsing the list itself is untracked.
 *
 * The mind-movie layer (per-card video, the full-movie tile) was removed here
 * for v1 on Sept 11 — see the deferred list in Confluence §4. Recording lives
 * with editing now: the mic beside "YOUR AFFIRMATIONS" records the whole set,
 * and each row's recorder sits in the edit view.
 */
export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useStore();
  const { affirmations, homeReadDone, streakDays, userName, welcome, schedPlan, freq, edits, voiceRecordings, set } = store;

  const [expanded, setExpanded] = useState(-1);
  const [streakCeleb, setStreakCeleb] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const [notifAccepted, setNotifAccepted] = useState<Record<number, boolean>>({});

  const affs = affSet(affirmations);
  // Voice coverage drives the record-all prompt. MUST count against `affs`, not
  // the store array: signing in without running onboarding leaves the store
  // empty and Home falls back to the mock, which made the prompt never render.
  const recordedCount = affs.filter(a => voiceRecordings[a.id]).length;
  const unrecordedCount = Math.max(0, affs.length - recordedCount);
  // Real set first: signed-in users load their persisted affirmations. Only
  // fall back to the design mock when there's genuinely nothing to show (mock
  // mode, signed out, or an account that hasn't finished onboarding).
  useEffect(() => {
    if (affirmations.length) return;
    let alive = true;
    (async () => {
      const saved = isLiveMode ? await loadAffirmations() : [];
      if (!alive) return;
      set({ affirmations: saved.length ? saved : MOCK_AFFS });
    })();
    return () => { alive = false; };
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

  /**
   * The SHARED app-level session (Sept 12) — not a second queue. Two queues
   * would each own an expo-audio player and play over each other, and a local
   * one would die the moment the user navigated away.
   */
  const queue = useAudioSession();
  const audioIdx = queue.index;
  const audioPlaying = queue.playing;
  const celebIdx = queue.celebIndex;
  const cardFrac = queue.duration > 0 ? Math.min(1, queue.position / queue.duration) : 0;

  /**
   * Reading path (restored Sept 12): tapping an expanded card's ring marks that
   * affirmation experienced — star + chime — then opens the next unread one and
   * closes this one, so the whole set can be read straight through. Reading all
   * of them consecutively closes the last ring, which fires the big celebration
   * exactly like listening through does.
   */
  const markRead = (i: number) => {
    queue.completeAffirmation(i, 'read');
    const doneAfter = [...useStore.getState().homeReadDone, i];
    const unread = (from: number) => affs.findIndex((_, j) => j >= from && !doneAfter.includes(j));
    const next = unread(i + 1) >= 0 ? unread(i + 1) : unread(0);
    setExpanded(next);
  };


  const startEdit = () => {
    if (editing) { setEditing(false); return; }
    queue.close();
    setExpanded(-1);
    setDrafts(affs.map((_, i) => affText(store, i)));
    setEditing(true);
  };

  const saveEdit = () => {
    const ne = { ...edits };
    drafts.forEach((t, i) => {
      const v = (t || '').trim();
      if (!v) return;
      ne[i] = v;
      // Edits are the user's own words — persist them so a relaunch keeps them.
      const id = affs[i]?.id;
      if (id) void updateAffirmationText(id, v);
    });
    set({ edits: ne });
    setEditing(false);
  };

  const readCount = homeReadDone.length;
  const dailyRings = schedPlan === 'custom' ? freq : 10;
  const ringsDone = Math.min(4, dailyRings);
  // Every closed ring reads the same now (Trevor, Sept 11). The 2nd ring used
  // to render terracotta to mean "done, but out of alignment" — alignment is
  // out of v1, and a done session is a done session.
  const ringStroke = (i: number) => (i < ringsDone ? colors.teal : colors.border);
  const ringFill = (i: number) => (i < ringsDone ? 'rgba(21,122,110,0.25)' : 'none');
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 108 }}>
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
            <Pressable onPress={() => nav.navigate('Player')} style={{
              flexDirection: 'row', alignItems: 'center', gap: 7,
              backgroundColor: colors.teal, borderRadius: 17, paddingVertical: 8, paddingHorizontal: 14,
            }}>
              <PlayFill size={11} />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white }}>Play all</Text>
            </Pressable>
            {/* Label, then record-the-set, then edit — same 28px targets so the
                two icons read as a pair rather than competing affordances. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: colors.warmGray }}>YOUR AFFIRMATIONS</Text>
              <Pressable onPress={() => nav.navigate('VoiceRecorder')} style={{
                width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'transparent', marginLeft: 2,
              }}>
                <MicIcon size={15} color={colors.inactive} />
              </Pressable>
              <Pressable onPress={startEdit} style={{
                width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: editing ? colors.gold : 'transparent',
              }}>
                <PencilIcon size={14} color={editing ? colors.ink : colors.inactive} />
              </Pressable>
            </View>
          </View>

          {!editing ? (
            <View style={{ marginTop: 8 }}>
              {affs.map((a, i) => {
                const text = affText(store, i);
                const done = homeReadDone.includes(i);
                const active = audioIdx === i;
                const playing = active && audioPlaying;
                const isExpanded = expanded === i;
                const frac = active ? cardFrac : readCount / affs.length;
                // The divider lives on the wrapper, not the row (Trevor,
                // Sept 11): with it on the row, expanding drew a line BETWEEN
                // an affirmation and its own "Mark as read" control, splitting
                // one card in two. Out here it closes the whole card, control
                // included.
                return (
                  <View key={a.id} style={{
                    borderBottomWidth: 1,
                    borderBottomColor: i < affs.length - 1 ? colors.borderSoft : 'transparent',
                  }}>
                    <Pressable onPress={() => setExpanded(isExpanded ? -1 : i)} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
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
                          <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.teal, width: `${Math.round(cardFrac * 100)}%` }} />
                        </View>
                      )}
                      {/* The per-card headphone button is gone (Trevor, Sept 12) —
                          with recording living in the edit view it had become a
                          re-record shortcut, so the row gives that width back to
                          the affirmation itself: two lines collapsed, full when
                          expanded. Play all / the mini player handle listening. */}
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text numberOfLines={isExpanded ? undefined : 2} style={{
                          fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 22,
                          color: done ? colors.teal : colors.ink,
                        }}>
                          “{text}”
                        </Text>
                        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 1.4, color: colors.inactive, textTransform: 'uppercase' }}>
                          {a.area}
                        </Text>
                      </View>
                      {/* Status only — the labelled control below does the work. */}
                      {done ? (
                        <DoneMark size={18} />
                      ) : isExpanded || playing ? (
                        <Ring size={26} frac={frac} />
                      ) : (
                        <ChevronDownIcon size={16} />
                      )}
                    </Pressable>

                    {/* A bare ring on the right read as chrome, not a control —
                        worst on the first affirmation, where session progress is
                        empty so nothing even moved. Expanding now reveals a
                        labelled pill: the same session ring, plus the words.
                        Ink/sand outline — teal is AI-only and gold is reserved
                        for the achievement moment this tap triggers.

                        Left-aligned under the text — a right-aligned pass read
                        worse and was reverted (Trevor, Sept 11). */}
                    {isExpanded && !done && (
                      <Animated.View entering={FadeInUp.duration(280)} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2, paddingBottom: 12,
                      }}>
                        <Pressable
                          onPress={() => markRead(i)}
                          hitSlop={6}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand,
                            borderRadius: 19, paddingVertical: 8, paddingHorizontal: 14,
                          }}
                        >
                          <Ring size={17} frac={frac} />
                          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink }}>
                            Mark as read
                          </Text>
                        </Pressable>
                        <Text style={{ flexShrink: 1, fontFamily: fonts.sans, fontSize: 12.5, color: colors.inactive }}>
                          {readCount} of {affs.length}
                        </Text>
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
                  {/* Record lives with editing now — the two things you'd do to
                      one affirmation sit together instead of in the dropdown. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
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
                  </View>
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

        {/* The full mind movie tile lived here. Removed for v1 (Sept 11) with
            the rest of the media layer — see the deferred list in Confluence
            §4. Restore from git when the media release is scheduled. */}
      </ScrollView>

      {/* once-a-day streak confetti */}
      {streakCeleb && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 40 }}>
          <Confetti />
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
