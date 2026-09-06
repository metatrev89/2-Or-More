/**
 * API client for the 2+ backend (backend/src/api/app.ts).
 *
 * Live mode activates when EXPO_PUBLIC_API_URL is set (same pattern as
 * Supabase's isLiveMode): requests carry the Supabase access token and the
 * real user id. With no URL configured, the design bundle's canned
 * experience replays offline. Same interface either way, so screens never
 * know the difference.
 */
import { MOCK_SCRIPT, MOCK_AFFS } from './mockData';
import { isLiveMode as supabaseLive, supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

/** True when intake/affirmations run against the real backend (→ Spark). */
export const apiLive = Boolean(BASE_URL);

export interface IntakeStep {
  area: number;
  ai: string[];
  chips: string[] | null;
  done: boolean;
}

export interface AffirmationDTO {
  id: string;
  goalId?: string;
  area: string;
  youSaid: string;
  statement: string;
  alt: string;
  isIdentity: boolean;
}

/** Backend life_area → display names used across the app. */
const AREA_LABELS: Record<string, string> = {
  spiritual: 'Spiritual',
  financial: 'Financial',
  relationships: 'Relationships',
  family: 'Family',
  social: 'Social',
  fitness_health: 'Fitness & health',
  business: 'Business',
  identity: 'Identity',
};

async function authHeader(): Promise<Record<string, string>> {
  if (!supabaseLive) return {};
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    return token ? { authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Real Supabase user id when signed in; falls back to the caller's id. */
async function resolveUserId(fallback: string): Promise<string> {
  if (!supabaseLive) return fallback;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session?.user.id ?? fallback;
  } catch {
    return fallback;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async intakeStart(userId: string): Promise<IntakeStep> {
    if (!apiLive) {
      const s = MOCK_SCRIPT[0]!;
      return { area: s.area, ai: s.ai, chips: s.chips, done: false };
    }
    const uid = await resolveUserId(userId);
    const r = await post<{ areaIndex: number; question: string }>('/intake/start', { userId: uid });
    return { area: r.areaIndex, ai: [r.question], chips: null, done: false };
  },

  async intakeAnswer(userId: string, answer: string, stepIdx: number, skip = false): Promise<IntakeStep> {
    if (!apiLive) {
      const next = MOCK_SCRIPT[stepIdx + 1];
      if (!next) return { area: 6, ai: [], chips: null, done: true };
      return { area: next.area, ai: next.ai, chips: next.chips, done: !next.user };
    }
    const uid = await resolveUserId(userId);
    const r = await post<{ completed: boolean; areaIndex?: number; question?: string }>(
      '/intake/answer', { userId: uid, answer, skip });
    if (r.completed) return { area: 6, ai: [], chips: null, done: true };
    return { area: r.areaIndex ?? 0, ai: [r.question ?? ''], chips: null, done: false };
  },

  async generateAffirmations(userId: string): Promise<AffirmationDTO[]> {
    if (!apiLive) return MOCK_AFFS;
    const uid = await resolveUserId(userId);
    const r = await post<{ affirmations: {
      id: string; goalId?: string; statement: string; isIdentity: boolean; area?: string; youSaid?: string;
    }[] }>('/affirmations/generate', { userId: uid });
    return r.affirmations.map(a => ({
      id: a.id,
      goalId: a.goalId,
      statement: a.statement,
      isIdentity: a.isIdentity,
      area: AREA_LABELS[a.area ?? ''] ?? a.area ?? '',
      youSaid: a.youSaid ?? '',
      alt: a.statement, // replaced lazily via rewordAffirmation
    }));
  },

  /** Fresh alternative phrasing (review screen's Reword). Mock: screens use the canned alt. */
  async rewordAffirmation(userId: string, goalId: string): Promise<string | null> {
    if (!apiLive) return null;
    try {
      const uid = await resolveUserId(userId);
      const r = await post<{ statement: string }>('/affirmations/reword', { userId: uid, goalId });
      return r.statement;
    } catch {
      return null; // reword is enhancement, never a blocker
    }
  },

  async recordExperience(userId: string, affirmationId: string | null, kind: string): Promise<void> {
    if (!apiLive) return;
    try {
      const uid = await resolveUserId(userId);
      await post('/events/record', { userId: uid, affirmationId, kind });
    } catch {
      // experience logging must never break a session
    }
  },
};
