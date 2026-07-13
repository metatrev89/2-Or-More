import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts, timing } from '../theme';
import { Mono, Serif } from '../components/ui';
import { affText, useStore } from '../store';
import { api } from '../api/client';
import { MOCK_AFFS } from '../api/mockData';
import MoodCheckIn from '../components/MoodCheckIn';

const AUDIO_DUR = 34;
const sceneDur = (i: number) => 9 + ((i * 7) % 5); // design's illustrative timings; real scenes are audio-driven 3-8s

/**
 * Player (design screen: Player) — the notification landing spot.
 * Audio mode: full-track playback, 7 segment rings pop as each affirmation
 * passes; completion closes the ring. Movie mode: ink theater, scene-by-scene
 * with per-scene watched state (maps to backend scene_clip assets).
 */
export default function PlayerScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Player'>) {
  const store = useStore();
  const affs = store.affirmations.length ? store.affirmations : MOCK_AFFS;
  const [mode, setMode] = useState<'audio' | 'movie'>(route.params.mode);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [watched, setWatched] = useState<number[]>(store.movieWatched);
  const [celebSeg, setCelebSeg] = useState(-1);
  const [ringClosed, setRingClosed] = useState(false);
  const [bigCeleb, setBigCeleb] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef(0);
  const sceneRef = useRef(0);

  const movie = mode === 'movie';
  const dur = movie ? sceneDur(sceneIdx) : AUDIO_DUR;
  const speed = store.audioSpeed;

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  const finish = (kind: 'listened' | 'watched_movie') => {
    stop();
    setPlaying(false);
    setRingClosed(true);
    setBigCeleb(true);
    api.recordExperience('me', null, kind);
  };

  const tick = () => {
    const isMovie = sceneRef.current >= 0 && mode === 'movie';
    const d = isMovie ? sceneDur(sceneRef.current) : AUDIO_DUR;
    const p = posRef.current + 0.25 * speed;
    if (p >= d) {
      if (isMovie) {
        const idx = sceneRef.current;
        setWatched(w => {
          const nw = w.includes(idx) ? w : [...w, idx];
          useStore.getState().set({ movieWatched: nw });
          return nw;
        });
        if (idx < affs.length - 1) {
          sceneRef.current = idx + 1;
          posRef.current = 0;
          setSceneIdx(idx + 1);
          setPos(0);
          setCelebSeg(idx);
          setTimeout(() => setCelebSeg(-1), timing.celebStarMs);
        } else {
          posRef.current = d;
          setPos(d);
          finish('watched_movie');
        }
      } else {
        posRef.current = d;
        setPos(d);
        setCelebSeg(affs.length - 1);
        finish('listened');
      }
    } else {
      if (!isMovie) {
        const unit = AUDIO_DUR / affs.length;
        const before = Math.floor(posRef.current / unit);
        const after = Math.floor(p / unit);
        if (after > before && after < affs.length) {
          setCelebSeg(after - 1);
          setTimeout(() => setCelebSeg(-1), timing.celebStarMs);
        }
      }
      posRef.current = p;
      setPos(p);
    }
  };

  const togglePlay = () => {
    if (playing) { stop(); setPlaying(false); return; }
    if (posRef.current >= dur) { posRef.current = 0; setPos(0); }
    setPlaying(true);
    timer.current = setInterval(tick, 250);
  };

  useEffect(() => {
    const t = setTimeout(() => togglePlay(), 400); // autoplay on entry (notification landing)
    return () => { clearTimeout(t); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const switchMode = (m: 'audio' | 'movie') => {
    stop(); setPlaying(false);
    posRef.current = 0; setPos(0);
    sceneRef.current = 0; setSceneIdx(0);
    setRingClosed(false);
    setMode(m);
  };

  const curAffIdx = movie ? sceneIdx : Math.min(affs.length - 1, Math.floor((pos / AUDIO_DUR) * affs.length));
  const bg = movie ? colors.ink : colors.cream;
  const ink = movie ? colors.cream : colors.ink;
  const muted = movie ? colors.creamOnDarkDim : colors.warmGray;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: bg, padding: 24, paddingTop: 56, paddingBottom: 40 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: ink }}>×</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', backgroundColor: movie ? 'rgba(250,244,232,0.12)' : '#EFE6D2', borderRadius: 20, padding: 3 }}>
          {(['audio', 'movie'] as const).map(m => (
            <Pressable key={m} onPress={() => switchMode(m)} style={{
              paddingVertical: 7, paddingHorizontal: 16, borderRadius: 17,
              backgroundColor: mode === m ? (m === 'movie' ? colors.gold : colors.ink) : 'transparent',
            }}>
              <Text style={{
                fontFamily: fonts.sansMedium, fontSize: 13,
                color: mode === m ? (m === 'movie' ? colors.ink : colors.cream) : muted,
              }}>
                {m === 'audio' ? 'Audio' : 'Mind movie'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Mono size={13} color={muted}>{movie ? sceneIdx + 1 : Math.min(affs.length, Math.floor((pos / AUDIO_DUR) * affs.length) + 1)}/{affs.length}</Mono>
      </View>

      {/* current affirmation */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: movie ? 'rgba(233,184,76,0.14)' : colors.aiTint, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 18 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: movie ? colors.gold : colors.tealDeep }}>
            {affs[curAffIdx]?.area} · I am
          </Text>
        </View>
        <Serif size={movie ? 24 : 27} color={ink}>
          “{affText(store, curAffIdx) || affs[curAffIdx]?.statement}”
        </Serif>
        {celebSeg >= 0 && (
          <Animated.Text entering={ZoomIn.duration(400)} style={{ fontSize: 22, color: colors.gold, marginTop: 16 }}>✦</Animated.Text>
        )}
      </View>

      {/* segment rings (audio) / scene dots (movie) */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
        {affs.map((_, i) => {
          const filled = movie ? watched.includes(i) || i < sceneIdx : (pos / AUDIO_DUR) * affs.length >= i + 1;
          const activeNow = movie ? i === sceneIdx : Math.floor((pos / AUDIO_DUR) * affs.length) === i;
          return (
            <View key={i} style={{
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: filled ? colors.teal : 'transparent',
              borderWidth: 1.5,
              borderColor: filled ? colors.teal : activeNow ? colors.gold : movie ? 'rgba(250,244,232,0.3)' : colors.sand,
            }} />
          );
        })}
      </View>

      {/* transport */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: movie ? 'rgba(250,244,232,0.15)' : colors.border, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ width: `${Math.min(100, (pos / dur) * 100)}%`, height: 4, backgroundColor: movie ? colors.gold : colors.teal }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Mono size={13} color={muted}>{Math.floor(pos / 60)}:{String(Math.floor(pos % 60)).padStart(2, '0')}</Mono>
        <Pressable onPress={togglePlay} style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: movie ? colors.gold : colors.teal,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 22, color: movie ? colors.ink : colors.cream }}>{playing ? '❚❚' : '▶'}</Text>
        </Pressable>
        <Pressable onPress={() => store.setSpeed(speed >= 2 ? 1 : Math.round((speed + 0.25) * 100) / 100)}>
          <Mono size={13} color={muted}>{speed}×</Mono>
        </Pressable>
      </View>

      {/* completion overlay */}
      {bigCeleb && (
        <Animated.View entering={FadeIn.duration(300)} style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(38,32,26,0.6)', alignItems: 'center', justifyContent: 'center', padding: 32,
        }}>
          <View style={{ backgroundColor: colors.cream, borderRadius: 28, padding: 28, alignItems: 'center', alignSelf: 'stretch' }}>
            <Text style={{ fontSize: 34 }}>✦</Text>
            <Serif size={22} style={{ textAlign: 'center', marginTop: 10 }}>Ring closed.</Serif>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, marginTop: 6, textAlign: 'center' }}>
              {movie ? 'You watched your whole vision.' : 'You heard your whole set.'}
            </Text>
            <MoodCheckIn
              sessionKey={`${mode}-${Date.now()}`}
              onDone={() => { setBigCeleb(false); navigation.goBack(); }}
            />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
