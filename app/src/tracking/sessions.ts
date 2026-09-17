/**
 * Session tracking — the real thing (Trevor, Sept 17, 2026).
 *
 * THE MODEL, in Trevor's words: "individual affirmations as one data point,
 * then sessions as another data set. Sessions are the user's total number of
 * affirmations. So I can do a session and only complete say 5/8 individual
 * affirmations — that would be my progress percentage for that session."
 *
 *   affirmation  — one experience (read or listened through)
 *   session      — one pass over the WHOLE set; partial is normal (5/8 = 63%)
 *   day          — `perDay` sessions, from the schedule (prime opens at 5)
 *
 * A session is anchored to a scheduled SLOT, so "which session was that?" has a
 * deterministic answer instead of depending on when the app happened to be
 * open. Events are attributed to the most recent slot at or before the event
 * time; anything before the first slot belongs to the first.
 *
 * Everything here is pure and date-injectable so it can be tested without
 * mocking a clock. Nothing in this file touches storage or the network.
 *
 * NOTE ON DUPLICATION: `backend/src/services/gamification.ts` has its own
 * `summarize()`. It stays because server-side scheduling will need it, but the
 * APP computes its own numbers — rings have to be correct offline and instant,
 * and the Worker has no auth to call anyway. If the streak rule changes, change
 * BOTH or delete one.
 */

/** Affirmation ids experienced in one session slot. Ids, never indexes — indexes shift. */
export type SlotLog = Record<number, string[]>;
/** YYYY-MM-DD (user-local) → slot index → affirmation ids. */
export type DayLog = Record<string, SlotLog>;

export interface DaySummary {
  date: string;
  /** One entry per scheduled slot: fraction of the set experienced, 0..1. */
  sessions: number[];
  /** Sessions at 100% — the "session rings today" numerator. */
  ringsClosed: number;
  /** Scheduled sessions that day. */
  target: number;
  /** Mean session completion across the day, 0..1 — drives the week bars. */
  dayPct: number;
}

/** A day counts toward the streak at half its sessions or better. */
export const STREAK_THRESHOLD = 0.5;

/** Matches what `pruneLog` keeps — a streak can't outrun its own history. */
const MAX_STREAK_LOOKBACK = 400;

/** Local calendar date, NOT UTC — a 9pm session must not land on tomorrow. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Minutes since local midnight. */
export function minutesOfDay(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "07:00" → 420. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Slot start times across the active window, evenly staggered.
 * Mirrors the backend's `computeSlots` so the app and the scheduler agree on
 * what "session 3 of 5" means.
 */
export function slotTimes(perDay: number, windowStartHour: number, windowEndHour: number): number[] {
  const start = windowStartHour * 60;
  const end = windowEndHour * 60;
  if (perDay <= 0 || end <= start) return [];
  if (perDay === 1) return [Math.round((start + end) / 2)];
  const step = (end - start) / (perDay - 1);
  return Array.from({ length: perDay }, (_, i) => Math.round(start + step * i));
}

/**
 * Which session an event at `mins` belongs to.
 *
 * The LAST slot at or before the time — so engaging late still credits the
 * session you were nudged for, rather than silently opening a new one. Before
 * the first slot (an early riser ahead of their window) credits session 0
 * rather than being discarded; practice done early is still practice.
 */
export function slotIndexFor(mins: number, slots: number[]): number {
  if (slots.length === 0) return 0;
  let idx = 0;
  for (let i = 0; i < slots.length; i++) if (mins >= (slots[i] ?? 0)) idx = i;
  return idx;
}

/** Roll one day's log into per-session percentages. */
export function summarizeDay(
  date: string,
  log: SlotLog | undefined,
  perDay: number,
  affCount: number,
): DaySummary {
  const target = Math.max(1, perDay);
  const sessions = Array.from({ length: target }, (_, i) => {
    if (!log || affCount <= 0) return 0;
    const ids = log[i] ?? [];
    // Distinct guard: replaying an affirmation must not push a session past 100%.
    const distinct = new Set(ids).size;
    return Math.min(1, distinct / affCount);
  });
  const ringsClosed = sessions.filter(s => s >= 1).length;
  const dayPct = sessions.reduce((a, b) => a + b, 0) / target;
  return { date, sessions, ringsClosed, target, dayPct };
}

/** The last `count` calendar dates ending at `end`, oldest first. */
export function recentDates(count: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

/**
 * Consecutive days meeting the threshold, counting back from today.
 *
 * TODAY IS EXEMPT while it's still incomplete: a streak must not appear broken
 * at 6am just because the day hasn't happened yet. That matches the brand rule
 * that streaks pause rather than break — the day only counts against you once
 * it's over. (Same rule as the backend's `summarize()`.)
 */
export function streakFrom(summaries: DaySummary[], today: string): number {
  const byDate = new Map(summaries.map(s => [s.date, s]));
  let streak = 0;
  /*
    Walks CALENDAR days backwards, not the log's own keys.

    Iterating the keys was wrong and would have inflated every streak: a day
    with no practice isn't in the log at all, so [Mon, Thu, Fri] read as three
    consecutive days and the missing Tue/Wed were never noticed. Caught by the
    "a gap breaks it" test, which returned 3 instead of 2.

    Midday cursor so adding/subtracting a day can't land on the same date or
    skip one across a daylight-saving boundary.
  */
  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < MAX_STREAK_LOOKBACK; i++) {
    const key = dayKey(cursor);
    const met = (byDate.get(key)?.dayPct ?? 0) >= STREAK_THRESHOLD;
    if (met) streak += 1;
    else if (key !== today) break; // today is still in progress; it can't break anything
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface TrackingSummary {
  today: DaySummary;
  /** Oldest → newest, always 7 entries, for the week sparkline. */
  week: DaySummary[];
  weekPct: number;
  streakDays: number;
  /** Total affirmation experiences this calendar month. */
  monthExperiences: number;
  /** Sessions closed at 100% this calendar month. */
  monthRings: number;
  /**
   * Most recent day in the last week that fell short, excluding today — for
   * the "streak paused" note. null when the week is unbroken.
   */
  pausedDate: string | null;
}

/** One call that turns the raw log into everything the screens render. */
export function summarizeTracking(opts: {
  log: DayLog;
  perDay: number;
  affCount: number;
  now?: Date;
}): TrackingSummary {
  const now = opts.now ?? new Date();
  const today = dayKey(now);
  const week = recentDates(7, now).map(d => summarizeDay(d, opts.log[d], opts.perDay, opts.affCount));
  const todaySummary = week[week.length - 1]!;

  const weekPct = Math.round((week.reduce((a, d) => a + d.dayPct, 0) / week.length) * 100);

  // Streak needs history beyond the visible week, so it walks the whole log.
  const allDates = Object.keys(opts.log).sort();
  const allSummaries = allDates.map(d => summarizeDay(d, opts.log[d], opts.perDay, opts.affCount));
  if (!allDates.includes(today)) allSummaries.push(todaySummary);

  const monthPrefix = today.slice(0, 7);
  const monthDays = Object.entries(opts.log).filter(([d]) => d.startsWith(monthPrefix));
  const monthExperiences = monthDays.reduce((total, [, slots]) =>
    total + Object.values(slots).reduce((n, ids) => n + new Set(ids).size, 0), 0);
  const monthRings = monthDays.reduce((total, [d, slots]) =>
    total + summarizeDay(d, slots, opts.perDay, opts.affCount).ringsClosed, 0);

  // A "pause" is only meaningful once there's practice on BOTH sides of it —
  // otherwise every day before someone started would read as a lapse.
  const pastWeek = week.slice(0, -1);
  const firstActive = pastWeek.findIndex(d => d.dayPct > 0);
  const pausedDate = firstActive === -1
    ? null
    : [...pastWeek.slice(firstActive)].reverse().find(d => d.dayPct < STREAK_THRESHOLD)?.date ?? null;

  return {
    today: todaySummary,
    week,
    weekPct,
    streakDays: streakFrom(allSummaries, today),
    monthExperiences,
    monthRings,
    pausedDate,
  };
}

/** Add one experience to the log, without mutating the input. */
export function withExperience(
  log: DayLog,
  affirmationId: string,
  opts: { date: string; slot: number },
): DayLog {
  const day = log[opts.date] ?? {};
  const ids = day[opts.slot] ?? [];
  if (ids.includes(affirmationId)) return log; // already counted this session
  return { ...log, [opts.date]: { ...day, [opts.slot]: [...ids, affirmationId] } };
}

/**
 * Drop days older than `keep` so the stored log can't grow without bound.
 * 400 days keeps a full year of streak history plus slack.
 */
export function pruneLog(log: DayLog, keep = 400, now: Date = new Date()): DayLog {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - keep);
  const min = dayKey(cutoff);
  const out: DayLog = {};
  for (const [d, slots] of Object.entries(log)) if (d >= min) out[d] = slots;
  return out;
}
