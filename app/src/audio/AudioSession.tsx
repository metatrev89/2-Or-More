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
import { affSet, affText, useStore } from '../store';
import { recordExperience } from '../api/sessionsRepo';
import { useTracking } from '../tracking/useTracking';
import type { AffirmationDTO } from '../api/client';

interface AudioSessionValue {
  affs: AffirmationDTO[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  /** Progress through the current track — 0 while a swap settles. */
  trackFrac: number;
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
  /** Close a ring without audio — the read-it-yourself path. */
  completeAffirmation: (i: number, kind?: 'listened' | 'read') => void;
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

  // Read through a ref: completeAffirmation must see the CURRENT slot without
  // re-creating itself (and the queue) every minute when the tick fires.
  const tracking = useTracking();
  const trackingRef = useRef(tracking); trackingRef.current = tracking;

  const [active, setActive] = useState(false);
  const [celebIndex, setCelebIndex] = useState(-1);
  const [bigCeleb, setBigCeleb] = useState(false);
  const celebTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const affsRef = useRef(affs); affsRef.current = affs;

  /**
   * One affirmation was experienced — listened through, or deliberately marked
   * read by tapping its ring. Both close the ring identically; only the logged
   * `kind` differs. Kept here rather than in a screen so it behaves the same
   * whichever surface triggered it.
   *
   * The big celebration fires on the LAST ring rather than on "queue ended",
   * because with looping on the queue never ends — and because reading through
   * the set never involves the queue at all.
   */
  const completeAffirmation = useCallback((i: number, kind: 'listened' | 'read' = 'listened') => {
    const list = affsRef.current;
    const id = list[i]?.id;
    if (!id) return;

    /*
      Tracking is real as of Sept 17. Two things changed here:

      - "done" is now scoped to the CURRENT session slot and keyed by
        affirmation id. It used to be a flat array of indexes that never reset,
        so a ring closed on Monday still read as closed on Friday.
      - the durable write goes straight to Supabase. `api.recordExperience`
        POSTed to `/events/record`, a Worker route that does not exist — every
        event 404'd into a silent catch.

      Local state first, network second: a closed ring must never depend on a
      request succeeding.
    */
    const track = trackingRef.current;
    // "Done" is scoped to the OPEN pass now, so a second lap round the set
    // counts again instead of being swallowed as a repeat (Sept 22).
    const wasDone = track.currentDoneIds.includes(id);
    if (!wasDone) {
      useStore.getState().logExperience(id, track.currentSlot, list.length);
      void recordExperience(id, kind);
    }

    /**
     * ONE ring, ONE chime, ONE star — and only when a ring actually closes
     * (Trevor, Sept 15).
     *
     * This used to chime on every completion including repeats, so a second
     * pass with loop on re-chimed all eight tracks while closing nothing. A
     * sound that doesn't correspond to a ring teaches the user the sound means
     * nothing, and it's indistinguishable from a misfire. Replays are now
     * silent: the set is already won.
     */
    if (wasDone) return;

    setCelebIndex(i);
    if (celebTimer.current) clearTimeout(celebTimer.current);
    celebTimer.current = setTimeout(() => setCelebIndex(-1), 1100);

    // The big celebration marks a SESSION completed — the last affirmation of
    // this pass, not of all time. `+ 1` because the log write above hasn't
    // re-rendered the hook yet.
    if (track.currentDoneIds.length + 1 >= list.length) {
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
    onFinished: i => completeAffirmation(i, 'listened'),
    /**
     * What a locked phone shows. The statement is the title because that IS
     * the content — an affirmation, not a track name. Trimmed because the lock
     * screen gives one line and these run 3-4 sentences; the area carries the
     * context the truncation loses.
     */
    lockScreenMeta: i => {
      const a = affsRef.current[i];
      const text = affText(useStore.getState(), i) || a?.statement || '';
      return {
        title: text.length > 84 ? `${text.slice(0, 83).trimEnd()}…` : text,
        artist: '2+',
        albumTitle: a?.area ?? 'Your affirmations',
      };
    },
  });

  const close = useCallback(() => {
    queue.stop();
    queue.setTimerMin(null);
    setActive(false);
  }, [queue]);

  const start = useCallback((from = 0) => { setActive(true); queue.start(from); }, [queue]);
  const playAt = useCallback((i: number) => { setActive(true); queue.playAt(i); }, [queue]);

  /**
   * Celebration dismissed.
   *
   * It used to unconditionally `close()`, which the Sept 22 lap model turned
   * into a bug: on loop (or a sleep timer) the queue keeps playing into the
   * next lap, and closing the session would have stopped the audio the user
   * explicitly asked to repeat — the celebration killing the very thing it was
   * celebrating. `queue.playing` is the honest signal for "is this session
   * actually over", so the bar and the session only go away when the audio has
   * genuinely stopped. A second lap gets its own celebration when it closes.
   */
  const stillRunningRef = useRef(false);
  stillRunningRef.current = queue.playing;
  const dismissBigCeleb = useCallback(() => {
    setBigCeleb(false);
    if (!stillRunningRef.current) close();
  }, [close]);

  const value = useMemo<AudioSessionValue>(() => ({
    affs,
    index: queue.index,
    playing: queue.playing,
    position: queue.position,
    duration: queue.duration,
    trackFrac: queue.trackFrac,
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
    completeAffirmation,
    toggle: queue.toggle,
    skip: queue.skip,
    close,
  }), [affs, queue, active, celebIndex, bigCeleb, dismissBigCeleb, start, playAt, completeAffirmation, close]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
