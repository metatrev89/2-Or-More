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

/**
 * ONE PASS over the affirmation set (Trevor, Sept 22, 2026).
 *
 * The log used to be a flat set of ids per slot, which made a second listen
 * literally unrepresentable: the ids were already there, so the distinct count
 * didn't move and the rings stayed full. Trevor wants to listen on loop and
 * have every pass count, with the rings resetting the moment a pass closes.
 *
 * A pass is therefore the unit, and a slot holds a LIST of them. The last pass
 * in the list is the live one; when it fills up it closes and the next
 * experience opens a fresh, empty pass. Rings read off the open pass, so they
 * reset by construction rather than by anyone remembering to clear them.
 *
 * Ids, never indexes — indexes shift when the set is edited.
 */
export interface SessionPass {
  /** Distinct affirmation ids experienced in this pass. */
  ids: string[];
  /**
   * Minutes since local midnight when this pass CLOSED. Undefined while open.
   * This is what lets "Today's sessions" show the time you actually finished
   * rather than the time the slot was scheduled for.
   */
  closedAt?: number;
}

/** Slot index → the passes made in it, oldest first. */
export type SlotLog = Record<number, SessionPass[]>;
/** YYYY-MM-DD (user-local) → slot index → passes. */
export type DayLog = Record<string, SlotLog>;

export interface SessionSummary {
  /** Passes completed in full. 4 here renders as "×4" and 400%. */
  reps: number;
  /**
   * Total completion, 1.0 per finished pass plus the open pass's fraction.
   * UNCAPPED: four passes is 4.0, and that is the point.
   */
  pct: number;
  /** When the slot first reached a full pass, minutes-of-day. null if never. */
  closedAt: number | null;
  /** Ids in the pass currently open — empty right after one closes. */
  openIds: string[];
}

export interface DaySummary {
  date: string;
  /** One entry per scheduled slot. */
  sessions: SessionSummary[];
  /**
   * Slots holding at least one completed pass — the "rings today" numerator.
   * Repetitions deliberately DON'T raise this: doing four passes at 9am is one
   * slot attended, so the other four slots stay open for their own times.
   */
  ringsClosed: number;
  /** Scheduled sessions that day. */
  target: number;
  /**
   * Total passes (incl. partials) ÷ scheduled sessions. Four full passes on a
   * five-session day is 80%, per Trevor: repetitions carry FULL day credit,
   * and it's the individual slots — not the percentage — that stay open.
   * May exceed 1.0; callers cap it for ring geometry, never for the number.
   */
  dayPct: number;
}

/**
 * A day counts toward the streak if the user PRACTISED AT ALL that day.
 *
 * FIXED Sept 22, 2026 — Trevor: "the day streak counter is not reading
 * accurately." It wasn't a rendering bug; the bar was simply set impossibly
 * high. The old rule was `dayPct >= 0.5`, and `dayPct` is the MEAN completion
 * across every scheduled slot — so on the prime protocol's 5-sessions-a-day
 * opener, finishing one whole session scored 1/5 = 0.20 and the day did not
 * count. You needed two and a half complete passes over the set before the
 * streak would acknowledge you'd shown up, which is why it kept reading 0 or
 * refusing to increment during testing.
 *
 * That also contradicted the model this file is built on: partial sessions are
 * NORMAL (5/8 is a legitimate session), and the brand rule is that feedback is
 * encouraging, never condemning. A streak answers one question — did you show
 * up today — so any practice keeps it alive. Completion quality is already
 * reported honestly elsewhere: per-session percentages, `dayPct` on the week
 * bars, and `ringsClosed` for sessions actually finished.
 */
export const dayCountsForStreak = (d: DaySummary): boolean => d.dayPct > 0;

/**
 * Bar for the "streak paused" note — a day that fell notably short between two
 * active days. Deliberately NOT the streak rule: a quiet day is worth a gentle
 * mention without also cancelling the streak.
 */
export const PAUSE_THRESHOLD = 0.5;

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

/** A pass is complete once it holds the whole set. */
export const isPassClosed = (p: SessionPass, affCount: number): boolean =>
  affCount > 0 && new Set(p.ids).size >= affCount;

/** Roll one day's log into per-session summaries. */
export function summarizeDay(
  date: string,
  log: SlotLog | undefined,
  perDay: number,
  affCount: number,
): DaySummary {
  const target = Math.max(1, perDay);
  const sessions: SessionSummary[] = Array.from({ length: target }, (_, i) => {
    const passes = (log?.[i] ?? []).filter(p => p.ids.length > 0);
    if (affCount <= 0 || passes.length === 0) {
      return { reps: 0, pct: 0, closedAt: null, openIds: [] };
    }
    let reps = 0;
    let pct = 0;
    let closedAt: number | null = null;
    let openIds: string[] = [];
    for (const p of passes) {
      // Distinct guard per pass: replaying one affirmation inside a pass must
      // not push that pass past 100%. Across passes it SHOULD accumulate.
      const distinct = new Set(p.ids).size;
      if (distinct >= affCount) {
        reps += 1;
        pct += 1;
        // First close is when the session was completed; later reps are extra.
        if (closedAt === null && p.closedAt !== undefined) closedAt = p.closedAt;
      } else {
        pct += distinct / affCount;
        openIds = p.ids;
      }
    }
    return { reps, pct, closedAt, openIds };
  });
  const ringsClosed = sessions.filter(s => s.reps >= 1).length;
  const dayPct = sessions.reduce((a, s) => a + s.pct, 0) / target;
  return { date, sessions, ringsClosed, target, dayPct };
}

/**
 * Migrate the pre-Sept-22 log shape (slot → id[]) to passes.
 *
 * Runs on hydrate over whatever is in AsyncStorage, so an existing install
 * keeps its streak instead of starting from zero. A legacy slot becomes ONE
 * pass with no `closedAt` — the completion time was never recorded back then,
 * so those rows fall back to their scheduled label rather than inventing a
 * time. Shape is detected per slot, so a half-migrated log is still safe.
 */
export function migrateLog(raw: unknown): DayLog {
  if (!raw || typeof raw !== 'object') return {};
  const out: DayLog = {};
  for (const [date, slots] of Object.entries(raw as Record<string, unknown>)) {
    if (!slots || typeof slots !== 'object') continue;
    const day: SlotLog = {};
    for (const [slot, val] of Object.entries(slots as Record<string, unknown>)) {
      const n = Number(slot);
      if (!Array.isArray(val)) continue;
      if (val.length === 0) { day[n] = []; continue; }
      day[n] = typeof val[0] === 'string'
        ? [{ ids: val as string[] }]                     // legacy
        : (val as SessionPass[]).filter(p => p && Array.isArray(p.ids));
    }
    out[date] = day;
  }
  return out;
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
    const day = byDate.get(key);
    const met = !!day && dayCountsForStreak(day);
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
    : [...pastWeek.slice(firstActive)].reverse().find(d => d.dayPct < PAUSE_THRESHOLD)?.date ?? null;

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

/**
 * Which TRACK a fresh session should be filed under (Trevor, Sept 22:
 * "whenever the user closes the app and reopens it to do a new session it
 * will count as a new track").
 *
 * The clock alone cannot answer this. Practising four times back-to-back at
 * 9am is ONE track repeated four times, while practising at 9am, closing the
 * app, and returning at 9:20 from a push notification is TWO tracks — and the
 * clock reads the same slot in both cases. What separates them is the VISIT,
 * which is why `useTracking` claims a track once per visit and only calls this
 * when a new visit needs one.
 *
 * Given that, the rule is simple: the clock's track if it's untouched,
 * otherwise the next untouched one. It scans BACKWARD as a last resort, so
 * someone who does all five sessions in the evening fills five tracks instead
 * of stacking them on the final slot — the row shows the real completion time
 * either way, so nothing is misrepresented. Once every track is spoken for,
 * further sessions pile onto the clock's track as repetitions.
 */
export function trackForNewSession(day: DaySummary, clockSlot: number): number {
  const n = day.sessions.length;
  const free = (i: number) => (day.sessions[i]?.reps ?? 0) === 0;
  const start = Math.min(Math.max(clockSlot, 0), Math.max(0, n - 1));
  if (free(start)) return start;
  for (let i = start + 1; i < n; i++) if (free(i)) return i;
  for (let i = start - 1; i >= 0; i--) if (free(i)) return i;
  return start;
}

/**
 * Add one experience to the log, without mutating the input.
 *
 * THIS IS WHERE THE RINGS RESET. The experience joins the slot's last pass if
 * that pass is still open; if the last pass is full — or there are none yet —
 * it opens a new one. So the instant a pass closes, the next affirmation the
 * user experiences starts a fresh pass with empty rings, which is exactly the
 * "listen on loop and have every lap count" behaviour, and it falls out of the
 * data rather than needing a screen to clear anything.
 *
 * Idempotent WITHIN a pass: re-experiencing the same affirmation before the
 * pass closes is a no-op, so scrubbing back doesn't inflate progress. Across
 * passes it counts, because that genuinely is another lap.
 */
export function withExperience(
  log: DayLog,
  affirmationId: string,
  opts: { date: string; slot: number; affCount: number; atMinutes?: number },
): DayLog {
  const day = log[opts.date] ?? {};
  const passes = day[opts.slot] ?? [];
  const last = passes[passes.length - 1];
  const lastIsOpen = !!last && !isPassClosed(last, opts.affCount);

  if (lastIsOpen && last!.ids.includes(affirmationId)) return log;

  let nextPasses: SessionPass[];
  if (lastIsOpen) {
    const updated: SessionPass = { ...last!, ids: [...last!.ids, affirmationId] };
    // Stamp the close time as it happens — it can't be recovered afterwards.
    if (isPassClosed(updated, opts.affCount)) {
      updated.closedAt = opts.atMinutes ?? minutesOfDay();
    }
    nextPasses = [...passes.slice(0, -1), updated];
  } else {
    const fresh: SessionPass = { ids: [affirmationId] };
    // A one-affirmation set closes on its first experience.
    if (isPassClosed(fresh, opts.affCount)) fresh.closedAt = opts.atMinutes ?? minutesOfDay();
    nextPasses = [...passes, fresh];
  }

  return { ...log, [opts.date]: { ...day, [opts.slot]: nextPasses } };
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
