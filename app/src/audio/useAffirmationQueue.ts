/**
 * Sequential affirmation playback — the real audio engine behind Home and the
 * play-all Player. Replaces the setInterval simulation that used to fake
 * progress bars against no audio at all.
 *
 * Only recorded affirmations are playable in v1 (no AI voice yet), so the queue
 * silently skips un-recorded entries rather than stalling on silence, and
 * exposes `playableCount` so the UI can tell the user why.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { resolveAudioSources } from './affirmationAudio';

export type LoopMode = 'off' | 'once' | 'infinite';

export interface QueueItem { id: string }

export function useAffirmationQueue(opts: {
  items: QueueItem[];
  recordings: Record<string, string>;
  speed: number;
  /** Fired when a track finishes playing through (used to close rings). */
  onFinished?: (index: number) => void;
  /** Fired when the queue ends and will not loop again. */
  onQueueEnd?: () => void;
}) {
  const { items, recordings, speed, onFinished, onQueueEnd } = opts;

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [sources, setSources] = useState<(string | null)[]>([]);
  const [index, setIndex] = useState(-1);
  const [loop, setLoop] = useState<LoopMode>('off');
  const [timerMin, setTimerMin] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  // Refs so the didJustFinish handler always sees current values without
  // re-subscribing (and without stale-closure bugs on advance).
  const idxRef = useRef(-1); idxRef.current = index;
  const loopRef = useRef<LoopMode>('off'); loopRef.current = loop;
  const srcRef = useRef<(string | null)[]>([]); srcRef.current = sources;
  const passRef = useRef(0);            // completed passes through the queue
  const timerDoneRef = useRef(false);   // stop at the next track boundary
  const finishedAtRef = useRef(-1);     // de-dupe didJustFinish

  const ids = useMemo(() => items.map(i => i.id).join('|'), [items]);

  // Resolve every affirmation to a local file or a signed Storage URL.
  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await resolveAudioSources(items, recordings);
      if (alive) setSources(next);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, recordings]);

  const playableCount = sources.filter(Boolean).length;
  const hasAudio = playableCount > 0;

  /** Next index at or after `from` that actually has audio; -1 if none. */
  const nextPlayable = useCallback((from: number): number => {
    for (let i = from; i < srcRef.current.length; i++) if (srcRef.current[i]) return i;
    return -1;
  }, []);

  const stop = useCallback(() => {
    try { player.pause(); } catch { /* player may be unloaded */ }
    setIndex(-1);
    idxRef.current = -1;
  }, [player]);

  const playAt = useCallback((i: number) => {
    const target = srcRef.current[i] ? i : nextPlayable(i);
    if (target < 0) { stop(); return; }
    const src = srcRef.current[target];
    if (!src) { stop(); return; }
    try {
      player.replace(src);
      // Rate must be re-applied per track — replace() resets it.
      player.setPlaybackRate(speed || 1, 'high');
      player.play();
      finishedAtRef.current = -1;
      setIndex(target);
      idxRef.current = target;
    } catch { stop(); }
  }, [player, speed, nextPlayable, stop]);

  /** Advance past a finished track, honouring loop mode and the sleep timer. */
  const advance = useCallback(() => {
    const from = idxRef.current;
    if (from < 0) return;
    onFinished?.(from);

    if (timerDoneRef.current) { timerDoneRef.current = false; stop(); onQueueEnd?.(); return; }

    const next = nextPlayable(from + 1);
    if (next >= 0) { playAt(next); return; }

    // Queue exhausted.
    passRef.current += 1;
    const mode = loopRef.current;
    const again = mode === 'infinite' || (mode === 'once' && passRef.current < 2) || timerMin !== null;
    if (again) {
      const first = nextPlayable(0);
      if (first >= 0) { playAt(first); return; }
    }
    stop();
    onQueueEnd?.();
  }, [nextPlayable, playAt, stop, onFinished, onQueueEnd, timerMin]);

  // expo-audio raises didJustFinish once per track; de-dupe by index.
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (finishedAtRef.current === idxRef.current) return;
    finishedAtRef.current = idxRef.current;
    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Speed changes apply to the track already playing.
  useEffect(() => {
    if (index < 0) return;
    try { player.setPlaybackRate(speed || 1, 'high'); } catch { /* not loaded yet */ }
  }, [speed, index, player]);

  // Sleep timer: counts down in real time and stops at the next boundary so a
  // statement is never cut off mid-sentence.
  useEffect(() => {
    if (timerMin === null) { setRemainingSec(0); timerDoneRef.current = false; return; }
    setRemainingSec(timerMin * 60);
    timerDoneRef.current = false;
    const id = setInterval(() => {
      setRemainingSec(s => {
        if (s <= 1) { timerDoneRef.current = true; clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerMin]);

  const start = useCallback((from = 0) => { passRef.current = 0; playAt(from); }, [playAt]);
  const toggle = useCallback(() => {
    if (status.playing) { player.pause(); return; }
    if (index < 0) { start(0); return; }
    player.play();
  }, [status.playing, player, index, start]);

  const skip = useCallback((forward: boolean) => {
    const cur = idxRef.current < 0 ? 0 : idxRef.current;
    if (forward) {
      const n = nextPlayable(cur + 1);
      playAt(n >= 0 ? n : nextPlayable(0));
    } else {
      for (let i = cur - 1; i >= 0; i--) if (srcRef.current[i]) { playAt(i); return; }
      playAt(cur); // already at the first — restart it
    }
  }, [nextPlayable, playAt]);

  return {
    index,
    playing: status.playing,
    position: status.currentTime ?? 0,
    duration: status.duration || 0,
    isLoaded: status.isLoaded,
    sources,
    hasAudio,
    playableCount,
    loop, setLoop,
    timerMin, setTimerMin, remainingSec,
    start, stop, toggle, skip, playAt,
  };
}
