import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts, timing } from '../theme';
import { Mono, Serif, Wordmark } from '../components/ui';
import { affText, useStore } from '../store';
import { api } from '../api/client';
import { MOCK_AFFS } from '../api/mockData';
import MoodCheckIn from '../components/MoodCheckIn';

/**
 * Home (design screen: Home). The affirmation cards are tracked sessions:
 * completing a card (read via "log ring", listen, or watch) fires an
 * experience event and advances the card ring. Completing all 7 triggers
 * the big celebration + mood check-in. The list itself is the library —
 * browsing is untracked.
 */
export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useStore();
  const { affirmations, homeReadDone, streakDays, set } = store;
  const [expanded, setExpanded] = useState(-1);
  const [audioIdx, setAudioIdx] = useState(-1);
  const [audioPos, setAudioPos] = useState(0);
  const [celebIdx, setCelebIdx] = useState(-1);
  const [bigCeleb, setBigCeleb] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const affs = affirmations.length ? affirmations : MOCK_AFFS;
  useEffect(() => {
    if (!affirmations.length) set({ affirmations: MOCK_AFFS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAudio = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  const completeCard = (i: number, autoplay: boolean) => {
    stopAudio();
    setAudioIdx(-1); setAudioPos(0);
    const done = useStore.getState().homeReadDone;
    const nd = done.includes(i) ? done : [...done, i];
    set({ homeReadDone: nd });
    api.recordExperience('me', affs[i]?.id ?? null, 'listened');
    setCelebIdx(i);
    setTimeout(() => setCelebIdx(-1), timing.celebStarMs);
    const next = i < affs.length - 1 ? i + 1 : -1;
    setExpanded(next);
    if (nd.length === affs.length) setBigCeleb(true);
    else if (autoplay && next !== -1) playAudio(next);
  };

  const playAudio = (i: number) => {
    stopAudio();
    setAudioIdx(i); setExpanded(i); setAudioPos(0);
    const dur = 14 + ((i * 7) % 12);
    let pos = 0;
    timer.current = setInterval(() => {
      pos += 0.25;
      if (pos >= dur) completeCard(i, true);
      else setAudioPos(pos);
    }, 250);
  };

  useEffect(() => () => stopAudio(), []);

  const readCount = homeReadDone.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingBottom: 24 }}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 }}>
          <View>
            <Mono size={12}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Mono>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 20, color: colors.ink, marginTop: 2 }}>
              Good morning, Trevor
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.cream }}>{streakDays}</Text>
          </View>
        </View>

        {/* session players */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 18 }}>
          <Pressable
            onPress={() => nav.navigate('Player', { mode: 'audio' })}
            style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.cream, fontSize: 14 }}>▶</Text>
            </View>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginTop: 10 }}>Audio session</Text>
            <Mono size={11.5}>0:34 · closes a ring</Mono>
          </Pressable>
          <Pressable
            onPress={() => nav.navigate('Player', { mode: 'movie' })}
            style={{ flex: 1, backgroundColor: colors.ink, borderRadius: 18, padding: 16 }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.ink, fontSize: 14 }}>▣</Text>
            </View>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.cream, marginTop: 10 }}>Mind movie</Text>
            <Mono size={11.5} color={colors.gold}>7 scenes · new cut ready</Mono>
          </Pressable>
        </View>

        {/* affirmation cards — the tracked reading/listening session */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 24, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.8, color: colors.warmGray }}>TODAY'S SET</Text>
          <Mono size={12} color={readCount === affs.length ? colors.teal : colors.warmGray}>{readCount}/{affs.length}</Mono>
        </View>
        <View style={{ marginHorizontal: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16 }}>
          {affs.map((a, i) => {
            const done = homeReadDone.includes(i);
            const active = audioIdx === i;
            const dur = 14 + ((i * 7) % 12);
            const text = affText(store, i);
            return (
              <Pressable key={a.id} onPress={() => setExpanded(expanded === i ? -1 : i)} style={{
                paddingVertical: 16, borderBottomWidth: i < affs.length - 1 ? 1 : 0, borderBottomColor: colors.borderSoft,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable onPress={() => active ? (stopAudio(), setAudioIdx(-1)) : playAudio(i)} style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: active ? colors.teal : colors.white,
                    borderWidth: 1, borderColor: active ? colors.teal : colors.sand,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 13, color: active ? colors.cream : colors.teal }}>{active ? '❚❚' : '▶'}</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={expanded === i ? undefined : 1} style={{
                      fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 23,
                      color: done ? colors.teal : colors.ink,
                    }}>
                      “{text}”
                    </Text>
                    <Mono size={11} style={{ marginTop: 3 }}>{a.area} · 0:{dur}</Mono>
                  </View>
                  {celebIdx === i ? (
                    <Animated.Text entering={ZoomIn.duration(400)} style={{ fontSize: 16, color: colors.gold }}>✦</Animated.Text>
                  ) : done ? (
                    <Text style={{ fontSize: 14, color: colors.teal }}>✓</Text>
                  ) : (
                    <Text style={{ fontSize: 14, color: colors.inactive }}>›</Text>
                  )}
                </View>
                {active && (
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 12, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, (audioPos / dur) * 100)}%`, height: 4, backgroundColor: colors.teal }} />
                  </View>
                )}
                {expanded === i && !done && !active && (
                  <Pressable onPress={() => completeCard(i, false)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.teal }}>
                      ○ Mark as read — closes this ring
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* all-seven celebration + mood check-in */}
      {bigCeleb && (
        <Animated.View entering={FadeIn.duration(300)} style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(38,32,26,0.55)', alignItems: 'center', justifyContent: 'center', padding: 32,
        }}>
          <Animated.View entering={FadeInUp.duration(400)} style={{ backgroundColor: colors.cream, borderRadius: 28, padding: 28, alignItems: 'center', alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 34 }}>✦</Text>
            <Serif size={22} style={{ textAlign: 'center', marginTop: 10 }}>
              All seven, experienced.
            </Serif>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, marginTop: 6, textAlign: 'center' }}>
              Way to tune into this reality today.
            </Text>
            <MoodCheckIn sessionKey={`home-${new Date().toDateString()}`} onDone={() => setBigCeleb(false)} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
