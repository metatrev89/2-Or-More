import type { SchedulePlan } from '../types.js';

/**
 * Cadence engine (US-7): the "Prime protocol" — 10x/day for 14 days,
 * 5x/day through day 30, steady 3x/day after — or a custom frequency.
 * Slots are staggered evenly through the user's active window.
 */

export function primeProtocolPerDay(daysSinceStart: number): number {
  if (daysSinceStart < 14) return 10;
  if (daysSinceStart < 30) return 5;
  return 3;
}

export function computeSlots(perDay: number, windowStart: string, windowEnd: string): string[] {
  const start = toMinutes(windowStart);
  const end = toMinutes(windowEnd);
  if (perDay <= 0 || end <= start) return [];
  if (perDay === 1) return [toHHMM(Math.round((start + end) / 2))];

  const step = (end - start) / (perDay - 1);
  const slots: string[] = [];
  for (let i = 0; i < perDay; i++) {
    slots.push(toHHMM(Math.round(start + step * i)));
  }
  return slots;
}

export function buildPlan(opts: {
  plan: 'prime' | 'custom';
  daysSinceStart: number;
  customPerDay?: number;
  windowStart?: string;
  windowEnd?: string;
}): SchedulePlan {
  const windowStart = opts.windowStart ?? '07:00';
  const windowEnd = opts.windowEnd ?? '22:00';
  const perDay = opts.plan === 'prime'
    ? primeProtocolPerDay(opts.daysSinceStart)
    : Math.min(Math.max(opts.customPerDay ?? 3, 1), 12);
  return { perDay, windowStart, windowEnd, slots: computeSlots(perDay, windowStart, windowEnd) };
}

/** Which slot (if any) is due in the minute containing `now` (user-local time). */
export function dueSlot(plan: SchedulePlan, nowHHMM: string): string | null {
  return plan.slots.includes(nowHHMM) ? nowHHMM : null;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
