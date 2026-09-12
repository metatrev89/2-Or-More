/**
 * Affirmation persistence (Supabase).
 *
 * Until Sept 12, 2026 nothing was ever written to the database — affirmations
 * lived only in the stateless session blob round-tripping through the phone and
 * in the app's in-memory store, so they vanished on relaunch and Home fell back
 * to mock data. (Trevor lost a full real set this way, keeping 7 voice
 * recordings keyed to affirmation ids that existed nowhere.) This module is the
 * fix: generate → save → reload.
 *
 * Writes go through the USER'S OWN JWT, not a service-role key. The RLS
 * policies ("own goals" / "own affirmations", FOR ALL USING auth.uid() =
 * user_id) enforce ownership at the database, which keeps the Worker stateless
 * and keeps a powerful secret off the edge.
 */
import { isLiveMode, supabase } from './supabase';
import type { AffirmationDTO } from './client';

/** Backend life_area enum → display label. Mirrors AREA_LABELS in client.ts. */
const AREA_TO_LABEL: Record<string, string> = {
  health_body: 'Health & Body',
  emotions_creativity: 'Emotions & Creativity',
  career_purpose: 'Career, Purpose & Power',
  relationships_love: 'Relationships & Love',
  communication_expression: 'Communication & Expression',
  mindset_growth: 'Mindset, Vision & Growth',
  spirit_purpose: 'Spirit & Purpose',
  open_capture: 'Anything Else',
};
const LABEL_TO_AREA: Record<string, string> = Object.fromEntries(
  Object.entries(AREA_TO_LABEL).map(([slug, label]) => [label, slug]),
);

async function currentUserId(): Promise<string | null> {
  if (!isLiveMode) return null;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Save a freshly generated set. Goals go first (affirmations reference them),
 * then the affirmations themselves, preserving the ids the backend minted so
 * voice recordings — which are keyed by affirmation id — keep matching.
 *
 * Upserts, so re-running this is safe and editing a statement later just
 * updates the row.
 */
export async function saveAffirmationSet(affs: AffirmationDTO[]): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId || affs.length === 0) return false;
  try {
    const sb = supabase();

    // Goals carry the area + "You said" text the review screen renders.
    const goals = affs
      .filter(a => a.goalId)
      .map((a, i) => ({
        id: a.goalId!,
        user_id: userId,
        area: LABEL_TO_AREA[a.area] ?? 'open_capture',
        raw_text: a.youSaid || a.statement,
        sort_order: i,
      }));
    if (goals.length) {
      const { error } = await sb.from('goals').upsert(goals, { onConflict: 'id' });
      if (error) return false;
    }

    const rows = affs.map(a => ({
      id: a.id,
      user_id: userId,
      goal_id: a.goalId ?? null,
      statement: a.statement,
      is_identity: !!a.isIdentity,
    }));
    const { error } = await sb.from('affirmations').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/** Persist a single edited statement. Best-effort; local state already updated. */
export async function updateAffirmationText(id: string, statement: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase().from('affirmations')
      .update({ statement, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch { /* best-effort */ }
}

/**
 * Load the signed-in user's set, newest-first by creation, joined to goals for
 * the area chip and "You said" line. Returns [] when signed out or empty —
 * callers decide whether to fall back to mock data.
 */
export async function loadAffirmations(): Promise<AffirmationDTO[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  try {
    const { data, error } = await supabase()
      .from('affirmations')
      .select('id, goal_id, statement, is_identity, created_at, goals(area, raw_text, sort_order)')
      .order('created_at', { ascending: true });
    if (error || !data) return [];

    return (data as unknown as DbAffirmationRow[]).map(row => {
      const goal = Array.isArray(row.goals) ? row.goals[0] : row.goals;
      return {
        id: row.id,
        goalId: row.goal_id ?? undefined,
        statement: row.statement,
        isIdentity: !!row.is_identity,
        area: AREA_TO_LABEL[goal?.area ?? ''] ?? 'Anything Else',
        youSaid: goal?.raw_text ?? '',
        // `alt` isn't stored — the reword button fetches a fresh phrasing live.
        alt: row.statement,
      } satisfies AffirmationDTO;
    });
  } catch {
    return [];
  }
}

interface DbAffirmationRow {
  id: string;
  goal_id: string | null;
  statement: string;
  is_identity: boolean;
  created_at: string;
  goals: { area: string; raw_text: string; sort_order: number } | { area: string; raw_text: string; sort_order: number }[] | null;
}
