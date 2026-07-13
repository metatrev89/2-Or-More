/**
 * Rings, streaks & encouraging stats (US-9, US-20).
 * Hard rule: language and math are always encouraging — a missed day
 * pauses a streak, it never "breaks" or shames.
 */

export interface DayActivity {
  date: string;          // YYYY-MM-DD (user-local)
  experiences: number;   // read/spoke/listened/watched events
  target: number;        // scheduled deliveries that day
}

export interface RingsSummary {
  today: { completed: number; target: number; ringsClosed: boolean };
  weekPct: number;
  streakDays: number;
  medals: string[];
}

export function summarize(days: DayActivity[]): RingsSummary {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const today = sorted[sorted.length - 1] ?? { date: '', experiences: 0, target: 1 };

  const week = sorted.slice(-7);
  const weekPct = week.length
    ? Math.round(100 * week.reduce((s, d) => s + Math.min(d.experiences / Math.max(d.target, 1), 1), 0) / week.length)
    : 0;

  // Streak: consecutive days (ending today or yesterday) with >= 50% of target — pauses, never punishes.
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i]!;
    if (d.experiences / Math.max(d.target, 1) >= 0.5) streak++;
    else if (i === sorted.length - 1) continue; // today incomplete doesn't end the streak yet
    else break;
  }

  const medals: string[] = [];
  if (streak >= 7) medals.push('week_streak');
  if (streak >= 30) medals.push('month_streak');
  if (today.experiences >= today.target && today.target > 0) medals.push('perfect_day');

  return {
    today: {
      completed: today.experiences,
      target: today.target,
      ringsClosed: today.target > 0 && today.experiences >= today.target,
    },
    weekPct,
    streakDays: streak,
    medals,
  };
}
