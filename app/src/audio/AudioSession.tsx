/**
 * The app's ONE audio session, lifted above the navigator (Sept 12, 2026).
 *
 * Playback used to live inside PlayerScreen, so navigating away unmounted the
 * hook and killed the audio. It now lives here, which is what lets a session
 * keep running while the user moves between Home, Progress, Profile — and what
 * lets the minimized bar exist at all.
 *
 * Deliberately ONE queue shared by Home and the Player. Two `useAffirmationQueue`
 * instances would each own an expo-audio player and happily play over each other.
 *
 * Ring bookkeeping lives here too, not in a screen: finishing an affirmation
 * closes its ring no matter where playback was started from or which screen the
 * user happens to be looking at.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAffirmationQueue, type LoopMode } from './useAffirmationQueue';
import { playCelebrationLarge, playCelebrationSmall } from './sfx';
import { affSet, useStore } from '../store';
import { api } from '../api/client';
import type { AffirmationDTO } from '../api/client';

interface AudioSessionValue {
  affs: AffirmationDTO[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  sources: (string | null)[];
  hasAudio: boolean;
  playableCount: number;
  loop: LoopMode;
  setLoop: (m: LoopMode) => void;
  timerMin: number | null;
  setTimerMin: (m: number | null) => void;
  remainingSec: number;
  /** A session is running — the minimized bar may show. */
  active: boolean;
  /** Index that just completed, for the star. -1 when idle. */
  celebIndex: number;
  bigCeleb: boolean;
  dismissBigCeleb: () => void;
  start: (from?: number) => void;
  playAt: (i: number) => void;
  toggle: () => void;
  skip: (forward: boolean) => void;
  /** X on the mini bar — stop and end the session. */
  close: () => void;
}

const Ctx = createContext<AudioSessionValue | null>(null);

export function useAudioSession(): AudioSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAudioSession must be used inside <AudioSessionProvider>');
  return v;
}

export function AudioSessionProvider({ children }: { children: React.ReactNode }) {
  const affirmations = useStore(s => s.affirmations);
  const voiceRecordings = useStore(s => s.voiceRecordings);
  const audioSpeed = useStore(s => s.audioSpeed);
  const set = useStore(s => s.set);

  const affs = useMemo(() => affSet(affirmations), [affirmations]);

  const [active, setActive] = useState(false);
  const [celebIndex, setCelebIndex] = useState(-1);
  const [bigCeleb, setBigCeleb] = useState(false);
  const celebTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const affsRef = useRef(affs); affsRef.current = affs;

  /**
   * One affirmation played through. Closes its ring, and when that completes
   * the whole set, fires the big celebration — triggered here on the LAST ring
   * rather than on "queue ended", because with looping on the queue never ends.
   */
  const onFinished = useCallback((i: number) => {
    const list = affsRef.current;
    const doneNow = useStore.getState().homeReadDone;
    const wasDone = doneNow.includes(i);
    const nd = wasDone ? doneNow : [...doneNow, i];
    set({ homeReadDone: nd });

    setCelebIndex(i);
    if (celebTimer.current) clearTimeout(celebTimer.current);
    celebTimer.current = setTimeout(() => setCelebIndex(-1), 1100);

    api.recordExperience('me', list[i]?.id ?? null, 'listened');

    if (!wasDone && nd.length === list.length) {
      setBigCeleb(true);
      playCelebrationLarge();
    } else {
      playCelebrationSmall();
    }
  }, [set]);

  const queue = useAffirmationQueue({
    items: affs,
    recordings: voiceRecordings,
    speed: audioSpeed,
    onFinished,
  });

  const close = useCallback(() => {
    queue.stop();
    queue.setTimerMin(null);
    setActive(false);
  }, [queue]);

  const start = useCallback((from = 0) => { setActive(true); queue.start(from); }, [queue]);
  const playAt = useCallback((i: number) => { setActive(true); queue.playAt(i); }, [queue]);

  /** Celebration dismissed — the session is over, so the bar goes away too. */
  const dismissBigCeleb = useCallback(() => {
    setBigCeleb(false);
    close();
  }, [close]);

  const value = useMemo<AudioSessionValue>(() => ({
    affs,
    index: queue.index,
    playing: queue.playing,
    position: queue.position,
    duration: queue.duration,
    sources: queue.sources,
    hasAudio: queue.hasAudio,
    playableCount: queue.playableCount,
    loop: queue.loop,
    setLoop: queue.setLoop,
    timerMin: queue.timerMin,
    setTimerMin: queue.setTimerMin,
    remainingSec: queue.remainingSec,
    active,
    celebIndex,
    bigCeleb,
    dismissBigCeleb,
    start,
    playAt,
    toggle: queue.toggle,
    skip: queue.skip,
    close,
  }), [affs, queue, active, celebIndex, bigCeleb, dismissBigCeleb, start, playAt, close]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
