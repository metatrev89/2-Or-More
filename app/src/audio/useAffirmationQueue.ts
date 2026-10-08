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
import { invalidateAudioUrl, resolveAudioSources } from './affirmationAudio';
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

/**
 * How often the reconciler may re-issue `play()` on a track that should be
 * running but isn't. Slow enough not to hammer the player, fast enough that a
 * stalled start recovers before the user notices.
 */
const PLAY_RETRY_MS = 400;

/**
 * How often the watchdog looks at the player (Oct 8). It runs on a TIMER, not
 * on status events — see the watchdog effect for why that is the whole point.
 */
const WATCHDOG_MS = 500;

/**
 * A track that hasn't loaded in this long isn't loading. Generous, because a
 * signed URL on a slow connection legitimately takes a few seconds.
 */
const LOAD_TIMEOUT_MS = 8000;

/**
 * How long we keep retrying `play()` against a session that won't activate
 * (a phone call, Siri, another app holding exclusive audio) before letting go
 * of the intent. Long enough to ride out a notification sound; short enough
 * that we never fight a real phone call.
 */
const GIVE_UP_MS = 10_000;

/**
 * Resolved sources older than this are re-resolved before a session starts.
 * Signed Storage URLs live one hour and `affirmationAudio` caches them for 45
 * minutes, so anything resolved this long ago may already be dead.
 */
const SOURCE_MAX_AGE_MS = 30 * 60 * 1000;

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
  const speedRef = useRef(speed); speedRef.current = speed;
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
   * What we INTEND — are we supposed to be playing right now?
   *
   * `player.replace()` loads asynchronously (the same lesson as `seekTo()`,
   * Sept 9), so the `play()` immediately after it is frequently a no-op. Rather
   * than track "a load is pending" with a flag that can get stuck, we record
   * the intent and let the reconciler below keep reality matching it. A user
   * pause clears the intent, so this never fights them.
   */
  const wantPlayingRef = useRef(false);
  /** Last time the reconciler poked `play()`, so it can't spam on every tick. */
  const retryAtRef = useRef(0);
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
  /** Bumped by every start/stop, so a start awaiting fresh sources can tell it was superseded. */
  const startSeqRef = useRef(0);
  /** When `play()` first started failing for the current intent; 0 = not failing. */
  const failingSinceRef = useRef(0);
  /** Index whose load failure we've already retried once with fresh sources. */
  const retriedIdxRef = useRef(-1);
  /** When the current track's source was handed to the player. */
  const loadStartRef = useRef(0);
  /** When the player last REPORTED an error. Compared to loadStartRef so a
   *  stale error from the previous source can't condemn the new one. */
  const errorAtRef = useRef(0);
  /** Last recovery attempt — one per LOAD_TIMEOUT_MS window, not one per tick. */
  const recoverAtRef = useRef(0);

  /**
   * Ask the player to play WITHOUT treating failure as fatal (Oct 8).
   *
   * Native `play()` begins with `AVAudioSession.setActive(true)`, which throws
   * whenever iOS won't hand us the audio session — a call, Siri, an app holding
   * exclusive audio, a brief window around backgrounding. `playAt` used to wrap
   * this in `catch { stop(); }`, so ONE refused activation wiped the queue to
   * index -1: no autoplay, and the play button went back through the same
   * throw into the same `stop()`. Now a failure just leaves the intent standing
   * and the watchdog tries again.
   */
  const tryPlay = useCallback((): boolean => {
    try {
      player.setPlaybackRate(speedRef.current || 1, 'high'); // replace() resets the rate
      player.play();
      failingSinceRef.current = 0;
      return true;
    } catch {
      if (!failingSinceRef.current) failingSinceRef.current = Date.now();
      return false;
    }
  }, [player]);

  const ids = useMemo(() => items.map(i => i.id).join('|'), [items]);

  /** Latest player status, for code that runs off a timer rather than a render. */
  const statusRef = useRef(status); statusRef.current = status;
  useEffect(() => { if (status.error) errorAtRef.current = Date.now(); }, [status]);
  /** Latest inputs, so an async resolve can tell whether it is still current. */
  const inputsRef = useRef({ items, recordings, ids }); inputsRef.current = { items, recordings, ids };
  /** What `sources` was resolved FOR, and when. */
  const resolvedRef = useRef<{ ids: string; recordings: Record<string, string> | null; at: number }>(
    { ids: '', recordings: null, at: 0 },
  );
  const inflightRef = useRef<{ ids: string; recordings: Record<string, string>; p: Promise<void> } | null>(null);

  /**
   * Resolve every affirmation to a local file or a signed Storage URL — and
   * know when that answer has gone stale (Oct 8).
   *
   * This used to run once per change of ids/recordings and then be trusted
   * forever. But this hook lives in the app-level provider, so "forever" is the
   * life of the app process — hours, across background/foreground. Signed URLs
   * die after one hour, so a Play All tapped later replaced the player onto a
   * dead URL. The item failed to load, `isLoaded` never went true, the old
   * reconciler bailed on `!isLoaded`, and the play button re-replaced the SAME
   * dead URL. Silent, unclickable, and cured only by killing the app — which
   * is exactly why it looked intermittent.
   *
   * `force` drops cached signed URLs too, for when one has actually failed.
   */
  const resolveNow = useCallback((force = false): Promise<void> => {
    const { items: its, recordings: recs, ids: key } = inputsRef.current;
    const r = resolvedRef.current;
    const aged = Date.now() - r.at >= SOURCE_MAX_AGE_MS;
    const current = r.ids === key && r.recordings === recs;
    if (!force && current && !aged) return Promise.resolve();
    const inflight = inflightRef.current;
    if (!force && inflight && inflight.ids === key && inflight.recordings === recs) return inflight.p;
    // An aged answer may be holding URLs the cache would hand straight back.
    if (force || aged) its.forEach(i => invalidateAudioUrl(i.id));
    const p = resolveAudioSources(its, recs).then(next => {
      if (inflightRef.current?.p === p) inflightRef.current = null;
      const now = inputsRef.current;
      // Inputs moved on while we were resolving — a newer resolve owns this.
      if (now.ids !== key || now.recordings !== recs) return;
      srcRef.current = next;
      resolvedRef.current = { ids: key, recordings: recs, at: Date.now() };
      setSources(next);
    }).catch(() => {
      if (inflightRef.current?.p === p) inflightRef.current = null;
    });
    inflightRef.current = { ids: key, recordings: recs, p };
    return p;
  }, []);

  useEffect(() => { void resolveNow(); }, [ids, recordings, resolveNow]);

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
    wantPlayingRef.current = false;
    startSeqRef.current += 1;     // cancels a start still waiting on sources
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
    } catch { stop(); return; }
    wantPlayingRef.current = true;
    swapAtRef.current = Date.now();
    loadStartRef.current = Date.now();
    if (target !== retriedIdxRef.current) retriedIdxRef.current = -1;
    // A new track has, by definition, not finished. It must earn the right to
    // finish again by actually playing — see armedRef.
    armedRef.current = false;
    maxPosRef.current = 0;
    setIndex(target);
    idxRef.current = target;
    // Optimistic start: instant when the source happens to be ready already.
    // If it isn't — or the session refuses — the watchdog finishes the job.
    tryPlay();
    publishLockScreen(target);
  }, [player, nextPlayable, stop, publishLockScreen, tryPlay]);

  /**
   * THE WATCHDOG — keeps reality matching intent (Oct 8; supersedes the Sept 22
   * status-driven reconciler).
   *
   * The Sept 22 reconciler was the right idea on the wrong clock: it was a
   * `useEffect` on `status`, so it could only act when the player EMITTED a
   * status. On iOS the player emits on a handful of events (item ready, seek,
   * end) and on a periodic tick that only runs WHILE PLAYING. A player that
   * is loaded but not playing goes completely silent — and the one event it
   * does send, "ready", usually lands inside the 350ms swap guard, where the
   * reconciler deliberately ignored it. So if the optimistic `play()` didn't
   * take, nothing ever tried again. The Player sat there, and nothing moved
   * until the user found a way to make the player emit.
   *
   * A timer can't be starved. Every WATCHDOG_MS, while we intend to play:
   *
   *   - playing            → healthy; clear any failure bookkeeping
   *   - load failed / timed out → re-resolve sources (a dead signed URL is
   *     the usual cause) and retry the track ONCE; if it fails again, skip it
   *     rather than sit on it
   *   - loaded, not playing → `play()` again, throttled
   *   - `play()` refused for GIVE_UP_MS → let go of the intent so we never
   *     fight a phone call; the play button picks it straight back up
   */
  const recoverTrack = useCallback((i: number) => {
    if (retriedIdxRef.current !== i) {
      retriedIdxRef.current = i;
      const seq = startSeqRef.current;
      void resolveNow(true).then(() => {
        if (seq !== startSeqRef.current || idxRef.current !== i || !wantPlayingRef.current) return;
        playAt(i);
      });
      return;
    }
    // Already retried with fresh sources and it still won't load: skip it.
    const next = nextPlayable(i + 1);
    if (next >= 0 && next !== i) { playAt(next); return; }
    stop();
  }, [resolveNow, playAt, nextPlayable, stop]);
  const recoverRef = useRef(recoverTrack); recoverRef.current = recoverTrack;

  useEffect(() => {
    const id = setInterval(() => {
      const i = idxRef.current;
      if (i < 0 || !wantPlayingRef.current) return;
      const st = statusRef.current;
      if (st.playing) { failingSinceRef.current = 0; return; }
      const sinceSwap = Date.now() - swapAtRef.current;
      // Mid-swap silence is expected, not a stall.
      if (sinceSwap < SWAP_GUARD_MS) return;

      const failed = errorAtRef.current > loadStartRef.current;
      const timedOut = !st.isLoaded && Date.now() - loadStartRef.current >= LOAD_TIMEOUT_MS;
      if (failed || timedOut) {
        if (Date.now() - recoverAtRef.current < LOAD_TIMEOUT_MS) return;
        recoverAtRef.current = Date.now();
        recoverRef.current(i);
        return;
      }
      if (!st.isLoaded) return; // still loading — give it time

      if (failingSinceRef.current && Date.now() - failingSinceRef.current >= GIVE_UP_MS) {
        failingSinceRef.current = 0;
        wantPlayingRef.current = false; // the session isn't ours; stop asking
        return;
      }
      const now = Date.now();
      if (now - retryAtRef.current < PLAY_RETRY_MS) return;
      retryAtRef.current = now;
      tryPlay();
    }, WATCHDOG_MS);
    return () => clearInterval(id);
  }, [tryPlay]);

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

  /**
   * Begin a session. If the sources are stale (old signed URLs, or resolved
   * for a different set) this waits for a fresh resolve first, so a session
   * never starts on a URL that died an hour ago. A later start or stop wins.
   */
  const start = useCallback((from = 0) => {
    passRef.current = 0;
    wantPlayingRef.current = true;
    failingSinceRef.current = 0;
    const seq = ++startSeqRef.current;
    void resolveNow().then(() => {
      if (seq !== startSeqRef.current || !wantPlayingRef.current) return;
      playAt(from);
    });
  }, [resolveNow, playAt]);
  /**
   * The play button must always be able to recover.
   *
   * It used to call a bare `player.play()`, which does nothing at all if the
   * current source never finished loading — so a stalled track left the button
   * visually fine and functionally dead (Trevor, Sept 22). If the player isn't
   * loaded, we re-issue the whole `playAt` (a fresh `replace()` + play) rather
   * than poking a source that isn't there.
   */
  const toggle = useCallback(() => {
    // Read the LIVE status: a toggle built from an old render's status could
    // pause a player that has since stopped, eating the user's tap.
    const st = statusRef.current;
    if (st.playing) {
      wantPlayingRef.current = false;
      try { player.pause(); } catch { /* not loaded */ }
      return;
    }
    wantPlayingRef.current = true;
    failingSinceRef.current = 0;
    const i = idxRef.current;
    if (i < 0) { start(0); return; }
    // A track that failed or never loaded gets a fresh source, not a re-poke.
    if (errorAtRef.current > loadStartRef.current || !st.isLoaded) {
      retriedIdxRef.current = -1;
      recoverAtRef.current = Date.now();
      recoverTrack(i);
      return;
    }
    tryPlay();
  }, [player, start, recoverTrack, tryPlay]);

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
