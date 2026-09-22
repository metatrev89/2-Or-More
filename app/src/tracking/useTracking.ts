/**
 * The one hook screens use for anything ring-, streak- or week-shaped
 * (Trevor, Sept 17, 2026).
 *
 * It owns three things the pure model in `sessions.ts` deliberately doesn't:
 * the user's real schedule, the clock, and the store.
 *
 * ROLLOVER is the reason this exists as a hook rather than a selector. The old
 * `homeReadDone` never reset, so a ring closed on Monday was still closed on
 * Friday and "today" meant "since the last app launch". Here, the current
 * session is derived from the wall clock every minute: cross into the next slot
 * and the session's progress starts at zero, cross midnight and the day does.
 * Nothing is erased — yesterday stays in the log as history.
 */
import { useEffect, useMemo, useState } from 'react';
import { affSet, useStore } from '../store';
import {
  dayKey, minutesOfDay, slotIndexFor, slotTimes, summarizeTracking, trackForNewSession,
  type DayLog, type TrackingSummary,
} from './sessions';

/** Prime's opening cadence — MUST match `primeProtocolPerDay` in the backend. */
const PRIME_OPENING_PER_DAY = 5;

/**
 * Re-evaluated once a minute. Slot boundaries and midnight are the only things
 * that move on their own, and both land on a minute edge.
 */
const TICK_MS = 60_000;

export interface Tracking extends TrackingSummary {
  /** Sessions scheduled per day — the "of 5" in "3 of 5 rings today". */
  perDay: number;
  /** Start time of each session, minutes since local midnight. */
  slots: number[];
  /** Which TRACK a session logged right now belongs to. */
  currentSlot: number;
  /** The track the wall clock is in, before visit-claiming is applied. */
  clockSlot: number;
  /**
   * Affirmation ids in the OPEN pass of the current session — so this goes
   * back to empty the moment a pass closes, which is what makes the rings
   * reset across the app right after the celebration (Trevor, Sept 22).
   */
  currentDoneIds: string[];
  /** Same, as indexes into the current set — what the existing UI wants. */
  currentDoneIdx: number[];
  /** Progress through the open pass, 0..1. */
  sessionFrac: number;
  /** Completed passes in the current slot — drives the "×4" badge. */
  currentReps: number;
}

/** Ticks on a minute boundary so a slot change lands as soon as it happens. */
function useMinuteTick(): number {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN(n => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return Date.now();
}

export function useTracking(): Tracking {
  const now = useMinuteTick();
  const dayLog = useStore(s => s.dayLog);
  const affirmations = useStore(s => s.affirmations);
  const schedPlan = useStore(s => s.schedPlan);
  const freq = useStore(s => s.freq);
  const awStart = useStore(s => s.awStart);
  const awEnd = useStore(s => s.awEnd);
  const visitSeq = useStore(s => s.visitSeq);
  const slotClaim = useStore(s => s.slotClaim);

  return useMemo(() => {
    const affs = affSet(affirmations);
    const affCount = affs.length || 1;
    const perDay = schedPlan === 'custom' ? Math.max(1, freq) : PRIME_OPENING_PER_DAY;
    const slots = slotTimes(perDay, awStart, awEnd);

    const d = new Date(now);
    const clockSlot = slotIndexFor(minutesOfDay(d), slots);

    const summary = summarizeTracking({ log: dayLog as DayLog, perDay, affCount, now: d });

    /*
      Which track does a session started RIGHT NOW belong to?

      A claim from this visit wins, so repeats in one sitting stack on one
      track (4 laps = ×4). The claim dies when the visit changes (app
      relaunched or foregrounded), when the day rolls over, or when the clock
      crosses into a different slot — any of which means "this is a new
      sitting" and earns a fresh track.
    */
    const today = dayKey(d);
    const claim = slotClaim
      && slotClaim.date === today
      && slotClaim.visitSeq === visitSeq
      && slotClaim.clockSlot === clockSlot
      ? slotClaim.slot
      : null;
    const currentSlot = claim ?? trackForNewSession(summary.today, clockSlot);

    // Read the OPEN pass, not the whole slot. `openIds` is empty whenever the
    // last pass finished, so the rings clear themselves between laps.
    const here = summary.today.sessions[currentSlot];
    const currentDoneIds = here?.openIds ?? [];

    // Ids → indexes for the existing row/segment UI. An id that no longer
    // exists (the set was edited) simply drops out rather than marking the
    // wrong affirmation done, which is what index-keying used to do.
    const idToIdx = new Map(affs.map((a, i) => [a.id, i]));
    const currentDoneIdx = currentDoneIds
      .map(id => idToIdx.get(id))
      .filter((i): i is number => i !== undefined);

    return {
      ...summary,
      perDay,
      slots,
      currentSlot,
      clockSlot,
      currentDoneIds,
      currentDoneIdx,
      sessionFrac: Math.min(1, currentDoneIdx.length / affCount),
      currentReps: here?.reps ?? 0,
    };
  }, [now, dayLog, affirmations, schedPlan, freq, awStart, awEnd, visitSeq, slotClaim]);
}

/**
 * Slot resolver for rebuilding history from server timestamps. Takes the
 * schedule as it is TODAY — see the note in `sessionsRepo.loadExperienceLog`.
 */
export function makeSlotResolver(perDay: number, awStart: number, awEnd: number) {
  const slots = slotTimes(perDay, awStart, awEnd);
  return (occurredAt: Date) => ({
    date: dayKey(occurredAt),
    slot: slotIndexFor(minutesOfDay(occurredAt), slots),
  });
}
