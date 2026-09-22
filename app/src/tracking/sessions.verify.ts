/**
 * Verification for the session tracking model.
 *
 * The app package has no test runner (the backend uses vitest; adding a
 * dependency to `app/` wasn't mine to decide). `sessions.ts` is pure — no React
 * Native imports — so this runs standalone:
 *
 *     npx tsx src/tracking/sessions.verify.ts
 *
 * It has earned its keep twice. `streakFrom` originally walked the LOG'S OWN
 * KEYS instead of calendar days, so a gap week [Mon, Thu, Fri] counted as a
 * 3-day streak. And on Sept 22 the streak tests all used fully-complete days,
 * which is precisely why they sailed through a bug where a single completed
 * session scored 0.20 and didn't count at all — the lesson being that a test
 * built from a tidy fixture proves nothing about the shapes real users make.
 *
 * Move these into a real suite when `app/` gets a runner.
 */
import {
  dayKey, slotTimes, slotIndexFor, summarizeDay, summarizeTracking,
  withExperience, pruneLog, recentDates, migrateLog, trackForNewSession,
  type DayLog, type SessionPass,
} from './sessions';

let pass = 0, fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

/** One closed pass over a set of `n`. */
const donePass = (n: number, closedAt?: number): SessionPass => ({
  ids: Array.from({ length: n }, (_, i) => `a${i}`),
  ...(closedAt !== undefined ? { closedAt } : {}),
});
/** A partial pass holding the first `k` of `n`. */
const partPass = (k: number): SessionPass => ({ ids: Array.from({ length: k }, (_, i) => `a${i}`) });

// ── slots ────────────────────────────────────────────────────────────────
eq('5 slots across 7am-10pm', slotTimes(5, 7, 22), [420, 645, 870, 1095, 1320]);
eq('1 slot centres in the window (7am-10pm -> 2:30pm)', slotTimes(1, 7, 22), [870]);
eq('0 per day -> no slots', slotTimes(0, 7, 22), []);

// ── slot attribution ─────────────────────────────────────────────────────
const S = slotTimes(5, 7, 22);
eq('7:00am -> session 0', slotIndexFor(420, S), 0);
eq('8:30am (after slot 0) -> still 0', slotIndexFor(510, S), 0);
eq('10:45am -> session 1', slotIndexFor(645, S), 1);
eq('11:59pm -> last session', slotIndexFor(1439, S), 4);
eq('5am, before the window -> session 0, not discarded', slotIndexFor(300, S), 0);

// ── partial sessions (Trevor: "5/8 = my progress for that session") ──────
const day = { 0: [partPass(5)], 1: [donePass(8)] };
const d1 = summarizeDay('2026-09-17', day, 5, 8);
eq('session 0 = 5/8', Math.round(d1.sessions[0]!.pct * 100), 63);
eq('session 1 complete', d1.sessions[1]!.pct, 1);
eq('untouched sessions are 0', d1.sessions.slice(2).map(s => s.pct), [0, 0, 0]);
eq('rings closed counts only finished passes', d1.ringsClosed, 1);
eq('day pct = total passes / target', Math.round(d1.dayPct * 100), 33);

// replays inside ONE pass must not inflate it
eq('duplicate ids inside a pass do not exceed 1',
  summarizeDay('x', { 0: [{ ids: ['a', 'a', 'a', 'b'] }] }, 1, 2).sessions[0]!.pct, 1);

// ── repetitions (Trevor, Sept 22: "400% for 4x on session") ─────────────
const fourLaps = summarizeDay('x', { 0: [donePass(8, 540), donePass(8, 600), donePass(8, 640), donePass(8, 700)] }, 5, 8);
eq('4 passes -> reps 4', fourLaps.sessions[0]!.reps, 4);
eq('4 passes -> 400%', Math.round(fourLaps.sessions[0]!.pct * 100), 400);
eq('closedAt is the FIRST close, not the latest', fourLaps.sessions[0]!.closedAt, 540);
eq('no pass is open after a clean lap', fourLaps.sessions[0]!.openIds, []);
/*
  The two halves of Trevor's answer, and they pull in different directions:
  the DAY gets full credit for every lap (4 laps on a 5-session day = 80%),
  while the SLOTS stay open so the other four sessions can still be practised
  at their own times. So dayPct moves and ringsClosed does not.
*/
eq('4 laps in one slot -> day is 80%', Math.round(fourLaps.dayPct * 100), 80);
eq('4 laps in one slot -> only ONE slot counted closed', fourLaps.ringsClosed, 1);
eq('the other four slots stay open', fourLaps.sessions.slice(1).map(s => s.reps), [0, 0, 0, 0]);
const fiveLaps = summarizeDay('x', { 0: [donePass(4), donePass(4), donePass(4), donePass(4), donePass(4)] }, 5, 4);
eq('5 laps back-to-back -> day reads 100%', Math.round(fiveLaps.dayPct * 100), 100);
eq('...but still only one slot attended', fiveLaps.ringsClosed, 1);

// ── the ring reset: a closed pass opens a fresh one ──────────────────────
const AFF = 3;
let reset: DayLog = {};
for (const id of ['a0', 'a1', 'a2']) reset = withExperience(reset, id, { date: 'D', slot: 0, affCount: AFF, atMinutes: 500 });
eq('a full lap closes the pass', summarizeDay('D', reset.D, 1, AFF).sessions[0]!.reps, 1);
eq('rings are EMPTY right after the lap closes', summarizeDay('D', reset.D, 1, AFF).sessions[0]!.openIds, []);
reset = withExperience(reset, 'a0', { date: 'D', slot: 0, affCount: AFF, atMinutes: 505 });
eq('the next experience opens a NEW pass', summarizeDay('D', reset.D, 1, AFF).sessions[0]!.openIds, ['a0']);
eq('...and re-counts the same id, because it is a new lap',
  Math.round(summarizeDay('D', reset.D, 1, AFF).sessions[0]!.pct * 100), 133);
eq('close time was stamped from the clock passed in', reset.D![0]![0]!.closedAt, 500);

// ── which TRACK a new session claims (Trevor, Sept 22) ──────────────────
/*
  Glossary, Trevor's: affirmation = one statement, SESSION = one full pass
  over the set, TRACK = one of the day's scheduled slots. The code calls a
  session a "pass" and a track a "slot".

  The visit-claim itself lives in useTracking (it needs the store); what's
  pure and testable here is the choice of track once a new one is needed.
*/
const dayWith = (reps: number[], perDay = 5) => summarizeDay('x', Object.fromEntries(
  reps.map((n, i) => [i, Array.from({ length: n }, () => donePass(4))]).filter(([, v]) => (v as SessionPass[]).length),
), perDay, 4);

eq('an untouched track at the clock is used as-is', trackForNewSession(dayWith([0, 0, 0, 0, 0]), 0), 0);
eq('clock track already done -> next one', trackForNewSession(dayWith([1, 0, 0, 0, 0]), 0), 1);
eq('repeats on a track do not change that', trackForNewSession(dayWith([4, 0, 0, 0, 0]), 0), 1);
eq('skips over tracks already done', trackForNewSession(dayWith([1, 1, 1, 0, 0]), 0), 3);
/*
  Backfill walks BACKWARDS from now, so it claims the nearest missed track
  rather than the earliest. Practising at 8pm is closer to the 6pm track than
  to the 7am one, and the row carries the real completion time regardless — so
  five evening sessions fill tracks 4,3,2,1,0 and the day still reads 100%.
*/
eq('evening practice backfills the NEAREST missed track', trackForNewSession(dayWith([0, 0, 0, 0, 1]), 4), 3);
eq('...and keeps walking back as those fill', trackForNewSession(dayWith([0, 0, 0, 1, 1]), 4), 2);
eq('all tracks done -> repeats pile on the clock track', trackForNewSession(dayWith([1, 1, 1, 1, 1]), 2), 2);
eq('a clock slot past the end is clamped', trackForNewSession(dayWith([0, 0, 0, 0, 0]), 99), 4);

// ── streak ───────────────────────────────────────────────────────────────
const full = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, [donePass(4)]]));
const mk = (dates: string[], perDay = 2): DayLog =>
  Object.fromEntries(dates.map(d => [d, full(perDay)]));

const today = dayKey();
const dates = recentDates(5);
const streakOf = (log: DayLog) => summarizeTracking({ log, perDay: 2, affCount: 4 }).streakDays;

eq('4 consecutive days incl. today', streakOf(mk(dates.slice(1))), 4);
eq('empty today does NOT break the streak', streakOf(mk(dates.slice(1, 4))), 3);
eq('a gap breaks it', streakOf(mk([dates[0]!, dates[3]!, dates[4]!])), 2);
eq('no history -> 0', streakOf({}), 0);

/*
  The bug Trevor reported on Sept 22: the streak "not reading accurately".
  These are the shapes an actual user produces — one session out of a
  five-session day, or a partial pass — which the old `dayPct >= 0.5` rule
  scored at 0.20 and 0.05 and therefore refused to count at all.
*/
const oneFullSession = (ds: string[]): DayLog =>
  Object.fromEntries(ds.map(d => [d, { 0: [donePass(4)] }]));
const onePartialSession = (ds: string[]): DayLog =>
  Object.fromEntries(ds.map(d => [d, { 0: [partPass(1)] }]));
const streak5 = (log: DayLog) => summarizeTracking({ log, perDay: 5, affCount: 4 }).streakDays;

eq('ONE full session on a 5-session day counts', streak5(oneFullSession(dates.slice(1))), 4);
eq('a partial session (1 of 4) still counts', streak5(onePartialSession(dates.slice(1))), 4);
eq('partial days still break on a real gap', streak5(onePartialSession([dates[0]!, dates[3]!, dates[4]!])), 2);
eq('a day with zero practice does not count', streak5(onePartialSession(dates.slice(3))), 2);

// ── week + month ─────────────────────────────────────────────────────────
const t = summarizeTracking({ log: mk(dates.slice(1)), perDay: 2, affCount: 4 });
eq('week always has 7 entries', t.week.length, 7);
eq('week ends on today', t.week[6]!.date, today);
eq('4 full days of 7 -> 57%', t.weekPct, 57);
eq('month experiences counted', t.monthExperiences > 0, true);

// ── migration from the pre-Sept-22 shape ─────────────────────────────────
const legacy = { '2026-09-20': { 0: ['a0', 'a1'], 1: ['a0', 'a1', 'a2'] } };
const migrated = migrateLog(legacy);
eq('legacy slot becomes one pass', migrated['2026-09-20']![1], [{ ids: ['a0', 'a1', 'a2'] }]);
eq('migrated history still summarises', summarizeDay('2026-09-20', migrated['2026-09-20'], 2, 3).ringsClosed, 1);
eq('already-migrated logs pass through unchanged', migrateLog(reset).D![0]!.length, 2);
eq('garbage in -> empty, never a crash', migrateLog('nonsense'), {});

// ── pruning ──────────────────────────────────────────────────────────────
const old: DayLog = { '2020-01-01': { 0: [partPass(1)] }, [today]: { 0: [partPass(1)] } };
eq('prunes ancient days', Object.keys(pruneLog(old)), [today]);

// ── withExperience is immutable + idempotent WITHIN a pass ───────────────
const base: DayLog = {};
const once = withExperience(base, 'a1', { date: today, slot: 2, affCount: 8 });
const twice = withExperience(once, 'a1', { date: today, slot: 2, affCount: 8 });
eq('input not mutated', Object.keys(base).length, 0);
eq('same id twice in one pass is a no-op', twice, once);
eq('lands in the right slot', once[today]![2], [{ ids: ['a1'] }]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
