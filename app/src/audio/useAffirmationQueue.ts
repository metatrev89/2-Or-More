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
import { configureForPlayback, ensureMediaNotificationPermission } from './audioMode';

export type LoopMode = 'off' | 'once' | 'infinite';

/**
 * How long after a track swap we distrust the player's status. It still
 * describes the OUTGOING track for a moment: a `didJustFinish` in this window
 * is stale, and `currentTime`/`duration` can be mismatched, which made a ring
 * briefly inherit the previous track's near-full fill.
 *
 * No affirmation is a third of a second long, so nothing genuine falls in here.
 */
const SWAP_GUARD_MS = 350;

/**
 * How much of a track must actually have played before we believe it is really
 * this track playing. See `armedRef` — this is the "positive evidence" bar.
 */
const ARM_MIN_SEC = 0.15;

/**
 * How close to the end a STOPPED player has to have got for that stop to mean
 * "finished" rather than "the user paused". Generous, because a track's real
 * audio often runs a little short of its reported duration.
 */
const END_EPSILON_SEC = 0.35;

/**
 * How close the playhead has to get to the duration to count as finished while
 * the player still claims to be playing. Tight, because this one fires mid-
 * playback and must not clip the end of a statement.
 */
const END_TOUCH_SEC = 0.06;

export interface QueueItem { id: string }

export function useAffirmationQueue(opts: {
  items: QueueItem[];
  recordings: Record<string, string>;
  speed: number;
  /** Lock-screen metadata per track: what the user sees on a locked phone. */
  lockScreenMeta?: (index: number) => { title: string; artist?: string; albumTitle?: string };
  /** Fired when a track finishes playing through (used to close rings). */
  onFinished?: (index: number) => void;
  /** Fired when the queue ends and will not loop again. */
  onQueueEnd?: () => void;
}) {
  const { items, recordings, speed, onFinished, onQueueEnd, lockScreenMeta } = opts;

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Background playback + lock-screen controls need the session configured
  // before anything plays. Once per mount; the provider mounts once.
  useEffect(() => {
    void configureForPlayback();
    void ensureMediaNotificationPermission();
  }, []);

  const metaRef = useRef(lockScreenMeta); metaRef.current = lockScreenMeta;
  /** True once this player owns the lock screen, so we only claim/clear once. */
  const lockHeldRef = useRef(false);

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
  /**
   * THE FINISH LATCH (Trevor, Sept 22 — fourth report of chimes misfiring).
   *
   * A track can only "finish" once it has been ARMED, and it is armed only by
   * positive evidence that it is genuinely playing its own audio: loaded,
   * playing, past ARM_MIN_SEC, and `didJustFinish` currently false. Arming
   * consumes nothing and can be retried on every status tick, so nothing is
   * lost if the evidence arrives late.
   *
   * This replaces the hand-rolled rising-edge detection that shipped on Sept
   * 20, which had a hole big enough to explain the remaining misfires. It read:
   *
   *     sawFinishRef.current = finished;           // consume the edge
   *     if (Date.now() - swapAtRef.current < SWAP_GUARD_MS) return;   // discard it
   *
   * The edge was marked as seen BEFORE the swap-window guard threw it away. A
   * stale `didJustFinish` from the OUTGOING track — the exact event that guard
   * exists for — therefore burned the latch: `sawFinishRef` was left true, so
   * when the incoming track genuinely ended there was no transition left to
   * detect, and that ring never closed and never chimed. Whether it happened
   * depended on whether the stale event landed inside the 350ms window, which
   * is why the failures looked random rather than systematic.
   *
   * Simply not consuming the edge is NOT a fix: `replace()` does not reliably
   * clear `didJustFinish`, so a latched `true` would then fire the instant the
   * swap window expired and skip the new track outright — the Sept 14 bug
   * again. The flag is unreliable in BOTH directions, so no amount of edge
   * detection on it is safe. Arming keys off playback progress instead, which
   * is a value the player cannot lie about.
   */
  const armedRef = useRef(false);
  /** Furthest the playhead has reached since arming — see the finish effect. */
  const maxPosRef = useRef(0);
  /**
   * Source we've asked the player to load but haven't confirmed playing yet.
   *
   * `player.replace()` loads asynchronously — the same lesson as `seekTo()`
   * (Sept 9). Calling `play()` on the very next line often did nothing because
   * nothing was loaded, which is why track 2 sat there paused. Worse, while the
   * swap was in flight the status still belonged to track 1, so a lingering
   * `didJustFinish` could fire advance() AGAIN — closing track 2's ring and
   * jumping to track 3 without ever playing it (Trevor, Sept 14).
   */
  const pendingSrcRef = useRef<string | null>(null);
  /**
   * When the current swap started. The finish guard is keyed off THIS, not off
   * `pendingSrcRef` alone (Sept 15).
   *
   * A boolean-only guard is unbounded: if the load-confirmed effect never fires
   * — status already loaded, duration unchanged — the flag sticks and EVERY
   * later finish is swallowed, so rings stop closing and chimes stop firing.
   * That's the "some don't have the chime" failure mode, caused by the fix for
   * the previous one. A time window can't get stuck, and no real affirmation
   * ends within it, so nothing genuine is ever discarded.
   */
  const swapAtRef = useRef(0);

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
    // Give the lock screen back — a stale "now playing" for a session that
    // ended is worse than no controls at all.
    if (lockHeldRef.current) {
      lockHeldRef.current = false;
      try { player.clearLockScreenControls(); } catch { /* not claimed */ }
    }
    pendingSrcRef.current = null;
    armedRef.current = false;
    maxPosRef.current = 0;
    setIndex(-1);
    idxRef.current = -1;
  }, [player]);

  /** Claim the lock screen on the first track, then just retitle on each swap. */
  const publishLockScreen = useCallback((i: number) => {
    const meta = metaRef.current?.(i);
    if (!meta) return;
    try {
      if (!lockHeldRef.current) {
        lockHeldRef.current = true;
        // Seek buttons only — expo-audio's single-player lock screen has no
        // next/previous, and offering seek is truer than offering nothing.
        player.setActiveForLockScreen(true, meta, { showSeekForward: true, showSeekBackward: true });
      } else {
        player.updateLockScreenMetadata(meta);
      }
    } catch { /* controls are a nicety; never let them break playback */ }
  }, [player]);

  const playAt = useCallback((i: number) => {
    const target = srcRef.current[i] ? i : nextPlayable(i);
    if (target < 0) { stop(); return; }
    const src = srcRef.current[target];
    if (!src) { stop(); return; }
    try {
      player.replace(src);
      pendingSrcRef.current = src;
      swapAtRef.current = Date.now();
      // A new track has, by definition, not finished. It must earn the right to
      // finish again by actually playing — see armedRef.
      armedRef.current = false;
      maxPosRef.current = 0;
      setIndex(target);
      idxRef.current = target;
      // Optimistic start: instant when the source happens to be ready already.
      // The load-confirmed effect below is what guarantees it either way.
      player.setPlaybackRate(speed || 1, 'high');
      player.play();
      publishLockScreen(target);
    } catch { stop(); }
  }, [player, speed, nextPlayable, stop, publishLockScreen]);

  // The track we swapped to has finished loading — make sure it's actually
  // running. Without this, a slow load left the optimistic play() above with
  // nothing to play and the queue simply stalled between tracks.
  useEffect(() => {
    if (!pendingSrcRef.current) return;
    if (!status.isLoaded) return;
    pendingSrcRef.current = null;
    try {
      player.setPlaybackRate(speed || 1, 'high'); // replace() resets the rate
      if (!status.playing) player.play();
    } catch { /* swapped again already */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded, status.duration]);

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

  /**
   * Arm, then finish. One ring and one chime per track, every track.
   *
   * The effect depends on the whole `status` object so it re-runs on every
   * player tick — which is also what keeps `advance` as the current closure
   * rather than one captured whenever some boolean last flipped.
   *
   * NOTHING HERE TRIGGERS ON `didJustFinish`, and that is the actual fix.
   *
   * Three rounds of bugs all came from treating that flag as an event. It fires
   * late (Sept 14: stale finishes from the outgoing track skipped the incoming
   * one), it fails to clear (Sept 20: latched `true` meant tracks 2..N never
   * chimed), and — as a simulation of this very fix showed — it can stay
   * latched for the whole of the NEXT track, which defeats any scheme that
   * requires it to be false. A signal that is unreliable in both directions
   * cannot be made reliable by edge detection. So it is out.
   *
   * Position and `playing` are ground truth; the player cannot misreport where
   * the playhead is. ARM waits for the track to show real progress. FINISH then
   * accepts either of two end-states, split so each can be tuned for what it
   * actually is:
   *
   *   - stopped near the end → finished (generous window; real audio often runs
   *     shorter than the reported duration, and a `didJustFinish` alongside the
   *     stop is accepted outright for the same reason)
   *   - still playing but the playhead has reached the duration → finished
   *     (tight window, because this one fires mid-playback and must not clip
   *     the last word of a statement)
   *
   * `maxPosRef` carries the furthest point reached, so a player that zeroes
   * `currentTime` on ending is still recognised as having got there.
   */
  useEffect(() => {
    if (idxRef.current < 0) return;

    const playing = !!status.playing;
    const pos = status.currentTime ?? 0;
    const dur = status.duration ?? 0;

    if (!armedRef.current) {
      if (status.isLoaded && playing && pos > ARM_MIN_SEC) {
        armedRef.current = true;
        maxPosRef.current = pos;
      }
      return;
    }
    if (pos > maxPosRef.current) maxPosRef.current = pos;

    const stoppedAtEnd = !playing
      && (!!status.didJustFinish || (dur > 0 && maxPosRef.current >= dur - END_EPSILON_SEC));
    const playedOut = dur > 0 && pos >= dur - END_TOUCH_SEC;
    if (!stoppedAtEnd && !playedOut) return;

    // Disarm BEFORE advancing: advance() re-enters playAt synchronously, and a
    // second finish for this same track must find nothing to act on.
    armedRef.current = false;
    maxPosRef.current = 0;
    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  /**
   * Progress through the CURRENT track, 0 while a swap is settling.
   *
   * Computed here rather than in each screen because only this hook knows a
   * swap is in flight. During one, `index` has already moved to the new track
   * while `currentTime`/`duration` still describe the old one — so a screen
   * dividing one by the other painted the incoming ring nearly full for a
   * frame before snapping back to empty (Trevor, Sept 15: rings not lining up
   * with their affirmations).
   */
  const settled = Date.now() - swapAtRef.current >= SWAP_GUARD_MS;
  const dur = status.duration || 0;
  const trackFrac = settled && dur > 0 ? Math.min(1, (status.currentTime ?? 0) / dur) : 0;

  return {
    index,
    playing: status.playing,
    position: settled ? status.currentTime ?? 0 : 0,
    duration: settled ? dur : 0,
    trackFrac,
    isLoaded: status.isLoaded,
    sources,
    hasAudio,
    playableCount,
    loop, setLoop,
    timerMin, setTimerMin, remainingSec,
    start, stop, toggle, skip, playAt,
  };
}
