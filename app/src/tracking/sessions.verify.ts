/**
 * Verification for the session tracking model.
 *
 * The app package has no test runner (the backend uses vitest; adding a
 * dependency to `app/` wasn't mine to decide). `sessions.ts` is pure — no React
 * Native imports — so this runs standalone:
 *
 *     npx tsx src/tracking/sessions.verify.ts
 *
 * It earned its keep immediately: `streakFrom` originally walked the LOG'S OWN
 * KEYS instead of calendar days, so a gap week [Mon, Thu, Fri] counted as a
 * 3-day streak because the missing days simply weren't in the log. Every
 * streak in the app would have been inflated.
 *
 * Move these into a real suite when `app/` gets a runner.
 */
import {
  dayKey, slotTimes, slotIndexFor, summarizeDay, summarizeTracking,
  withExperience, pruneLog, recentDates, type DayLog,
} from './sessions';

let pass = 0, fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

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
const day = { 0: ['a','b','c','d','e'], 1: ['a','b','c','d','e','f','g','h'] };
const d1 = summarizeDay('2026-09-17', day, 5, 8);
eq('session 0 = 5/8', Math.round(d1.sessions[0]! * 100), 63);
eq('session 1 complete', d1.sessions[1], 1);
eq('untouched sessions are 0', [d1.sessions[2], d1.sessions[3], d1.sessions[4]], [0,0,0]);
eq('rings closed counts only 100%', d1.ringsClosed, 1);
eq('day pct = mean of sessions', Math.round(d1.dayPct * 100), 33);

// replays must not inflate past 100%
eq('duplicate ids do not exceed 1', summarizeDay('x', { 0: ['a','a','a','b'] }, 1, 2).sessions[0], 1);

// ── streak ───────────────────────────────────────────────────────────────
const full = (n: number) => Object.fromEntries(Array.from({length: n}, (_, i) => [i, ['a','b','c','d']]));
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

  The four cases above all use days where EVERY session is complete, so they
  passed happily under the old `dayPct >= 0.5` rule and never exercised the
  real failure. These are the shapes an actual user produces — one session out
  of a five-session day, or a partial pass — which the old rule scored at 0.20
  and 0.05 and therefore refused to count at all.
*/
const oneFullSession = (dates: string[]): DayLog =>
  Object.fromEntries(dates.map(d => [d, { 0: ['a', 'b', 'c', 'd'] }]));
const onePartialSession = (dates: string[]): DayLog =>
  Object.fromEntries(dates.map(d => [d, { 0: ['a'] }]));
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

// ── pruning ──────────────────────────────────────────────────────────────
const old: DayLog = { '2020-01-01': { 0: ['a'] }, [today]: { 0: ['a'] } };
eq('prunes ancient days', Object.keys(pruneLog(old)), [today]);

// ── withExperience is immutable + idempotent ─────────────────────────────
const base: DayLog = {};
const once = withExperience(base, 'a1', { date: today, slot: 2 });
const twice = withExperience(once, 'a1', { date: today, slot: 2 });
eq('input not mutated', Object.keys(base).length, 0);
eq('same id twice is a no-op', twice, once);
eq('lands in the right slot', once[today]![2], ['a1']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
