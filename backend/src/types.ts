/**
 * Chakra-mapped life areas (Trevor, Sept 2026 — adopted from his Meta AI
 * reference conversation, backend/reference/meta-intake-reference.json).
 * Canonical order is root→crown: foundation first, unity last. The app's
 * AREAS list (app/src/theme.ts) MUST match this order — areaIndex crosses
 * the API as a plain number.
 */
export type LifeArea =
  | 'health_body' | 'emotions_creativity' | 'career_purpose' | 'relationships_love'
  | 'communication_expression' | 'mindset_growth' | 'spirit_purpose'
  /**
   * The catch-all (added Sept 9, 2026). NOT a chakra and deliberately NOT in
   * LIFE_AREAS — after the seven areas the interviewer asks once whether
   * anything else belongs in the practice. An answer becomes the optional 8th
   * goal; a decline ends the intake at seven. Keeping it out of LIFE_AREAS is
   * what preserves the 7-segment progress bar and the areaIndex contract.
   */
  | 'open_capture';

export const LIFE_AREAS: LifeArea[] = [
  'health_body', 'emotions_creativity', 'career_purpose', 'relationships_love',
  'communication_expression', 'mindset_growth', 'spirit_purpose',
];

/** Display metadata per area — label + chakra framing used in prompts and UI. */
export const AREA_META: Record<LifeArea, { label: string; chakra: string }> = {
  health_body: { label: 'Health & Body', chakra: 'Root · Foundation' },
  emotions_creativity: { label: 'Emotions & Creativity', chakra: 'Sacral · Flow' },
  career_purpose: { label: 'Career, Purpose & Power', chakra: 'Solar Plexus · Drive' },
  relationships_love: { label: 'Relationships & Love', chakra: 'Heart · Connection' },
  communication_expression: { label: 'Communication & Expression', chakra: 'Throat · Voice' },
  mindset_growth: { label: 'Mindset, Vision & Growth', chakra: 'Third Eye · Clarity' },
  spirit_purpose: { label: 'Spirit & Purpose', chakra: 'Crown · Unity' },
  open_capture: { label: 'Anything Else', chakra: '' },
};

export interface Goal {
  id: string;
  userId: string;
  area: LifeArea;
  rawText: string;
  whyText?: string;
  actionItems: string[];
}

export interface Affirmation {
  id: string;
  userId: string;
  goalId?: string;
  statement: string;
  isIdentity: boolean;
}

export interface MediaAsset {
  id: string;
  userId: string;
  affirmationId?: string;
  format: 'text' | 'audio' | 'image' | 'scene_clip' | 'mind_movie';
  storageKey: string;
  durationSeconds?: number;
  vendor?: string;
  generationCostUsd?: number;
}

export interface IntakeTurn {
  role: 'assistant' | 'user';
  content: string;
}

export interface IntakeSession {
  userId: string;
  /** Display name from profile creation — used for the personalized welcome. */
  name?: string;
  areaIndex: number;
  turns: IntakeTurn[];
  goals: Goal[];
  completed: boolean;
}

export type JobType = 'media_stage1' | 'media_stage2' | 'regen_asset';

export interface GenerationJob {
  id: string;
  userId: string;
  type: JobType;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
}

export interface SchedulePlan {
  perDay: number;
  windowStart: string; // "07:00"
  windowEnd: string;   // "22:00"
  slots: string[];     // computed HH:MM delivery times
}
