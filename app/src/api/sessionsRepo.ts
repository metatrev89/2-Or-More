/**
 * Experience persistence — the durable record behind rings, streaks and the
 * week bars (Trevor, Sept 17, 2026: "can we make the sessions tracking data
 * real now?").
 *
 * Before this, `api.recordExperience()` POSTed to `/events/record` — a route
 * that DOES NOT EXIST on the Worker. Every call 404'd and the error was
 * swallowed by a bare catch, so the app had been silently discarding every
 * experience it ever recorded. The `experience_events` table has existed since
 * migration 0001, correct RLS and all, and had never been written to.
 *
 * Writes go DIRECT to Supabase under the user's own JWT, following
 * `affirmationsRepo` — not through the Worker, which is stateless and (still)
 * has no auth. RLS policy "own events" (FOR ALL USING auth.uid() = user_id)
 * enforces ownership at the database.
 *
 * Local state is the source of truth for what the UI renders; this is the
 * durable copy and the multi-device story. A failed write must never cost the
 * user a closed ring, so everything here is best-effort and returns rather than
 * throws — the same rule as voice upload.
 */
import { isLiveMode, supabase } from './supabase';
import { dayKey, type DayLog } from '../tracking/sessions';

export type ExperienceKind = 'read' | 'listened';

async function currentUserId(): Promise<string | null> {
  if (!isLiveMode) return null;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/** UUID check — mock affirmations use ids like 'a1', which would fail the FK. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Record one experience. Fire-and-forget by design: the caller has already
 * updated local state and closed the ring.
 *
 * `affirmation_id` references `affirmations(id)`, so an id that was never saved
 * to Postgres — anything from `MOCK_AFFS` — would fail the foreign key. We send
 * null rather than losing the event: the day still counts, it just isn't
 * attributable to a specific statement.
 */
export async function recordExperience(affirmationId: string, kind: ExperienceKind): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase().from('experience_events').insert({
      user_id: userId,
      affirmation_id: UUID_RE.test(affirmationId) ? affirmationId : null,
      kind,
      occurred_at: new Date().toISOString(),
    });
  } catch { /* best-effort: the ring is already closed locally */ }
}

/**
 * Rebuild the local day-log from the server, for a fresh install or a second
 * device. Returns null when there's nothing to merge (signed out, mock mode, or
 * the query failed) so the caller can tell "no data" from "empty history".
 *
 * Slot attribution is recomputed from `occurred_at` rather than stored, because
 * the user's schedule can change — re-deriving keeps old days consistent with
 * the window they actually have now.
 */
export async function loadExperienceLog(
  sinceDays: number,
  slotFor: (occurredAt: Date) => { date: string; slot: number },
): Promise<DayLog | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  try {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    // No .eq('user_id') — RLS scopes it, same as affirmationsRepo.
    const { data, error } = await supabase()
      .from('experience_events')
      .select('affirmation_id, kind, occurred_at')
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: true });
    if (error || !data) return null;

    const log: DayLog = {};
    for (const row of data as { affirmation_id: string | null; occurred_at: string }[]) {
      const when = new Date(row.occurred_at);
      const { date, slot } = slotFor(when);
      // Null affirmation_id still marks the session as engaged; key it by the
      // timestamp so distinct-counting doesn't collapse separate experiences.
      const id = row.affirmation_id ?? `anon:${row.occurred_at}`;
      const day = log[date] ?? (log[date] = {});
      const ids = day[slot] ?? (day[slot] = []);
      if (!ids.includes(id)) ids.push(id);
    }
    return log;
  } catch {
    return null;
  }
}

/**
 * Merge server history into the local log without losing local-only days.
 * Union per slot — an event recorded offline and one recorded on another device
 * are both real.
 */
export function mergeLogs(local: DayLog, remote: DayLog): DayLog {
  const out: DayLog = { ...local };
  for (const [date, slots] of Object.entries(remote)) {
    const day = { ...(out[date] ?? {}) };
    for (const [slot, ids] of Object.entries(slots)) {
      const n = Number(slot);
      day[n] = [...new Set([...(day[n] ?? []), ...ids])];
    }
    out[date] = day;
  }
  return out;
}

/** Today's key, re-exported so callers don't import two modules for one string. */
export { dayKey };
