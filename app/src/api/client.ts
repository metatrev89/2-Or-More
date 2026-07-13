/**
 * API client for the 2+ backend (backend/src/api/app.ts).
 * MODE=mock replays the design bundle's canned experience offline;
 * MODE=live talks to the real backend. Same interface either way,
 * so screens never know the difference.
 */
import { MOCK_SCRIPT, MOCK_AFFS } from './mockData';

const MODE: 'mock' | 'live' = 'mock';
const BASE_URL = 'http://localhost:8787';

export interface IntakeStep {
  area: number;
  ai: string[];
  chips: string[] | null;
  done: boolean;
}

export interface AffirmationDTO {
  id: string;
  area: string;
  youSaid: string;
  statement: string;
  alt: string;
  isIdentity: boolean;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async intakeStart(userId: string): Promise<IntakeStep> {
    if (MODE === 'mock') {
      const s = MOCK_SCRIPT[0]!;
      return { area: s.area, ai: s.ai, chips: s.chips, done: false };
    }
    const r = await post<{ areaIndex: number; question: string }>('/intake/start', { userId });
    return { area: r.areaIndex, ai: [r.question], chips: null, done: false };
  },

  async intakeAnswer(userId: string, answer: string, stepIdx: number, skip = false): Promise<IntakeStep> {
    if (MODE === 'mock') {
      const next = MOCK_SCRIPT[stepIdx + 1];
      if (!next) return { area: 6, ai: [], chips: null, done: true };
      return { area: next.area, ai: next.ai, chips: next.chips, done: !next.user };
    }
    const r = await post<{ completed: boolean; areaIndex?: number; question?: string }>(
      '/intake/answer', { userId, answer, skip });
    if (r.completed) return { area: 6, ai: [], chips: null, done: true };
    return { area: r.areaIndex ?? 0, ai: [r.question ?? ''], chips: null, done: false };
  },

  async generateAffirmations(userId: string): Promise<AffirmationDTO[]> {
    if (MODE === 'mock') return MOCK_AFFS;
    const r = await post<{ affirmations: { id: string; statement: string; isIdentity: boolean }[] }>(
      '/affirmations/generate', { userId });
    return r.affirmations.map((a, i) => ({
      id: a.id, statement: a.statement, isIdentity: a.isIdentity,
      area: MOCK_AFFS[i]?.area ?? '', youSaid: '', alt: a.statement,
    }));
  },

  async recordExperience(userId: string, affirmationId: string | null, kind: string): Promise<void> {
    if (MODE === 'mock') return;
    await post('/events/record', { userId, affirmationId, kind });
  },
};
