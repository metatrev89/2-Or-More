export type LifeArea =
  | 'spiritual' | 'financial' | 'relationships' | 'family'
  | 'social' | 'fitness_health' | 'business';

export const LIFE_AREAS: LifeArea[] = [
  'spiritual', 'financial', 'relationships', 'family', 'social', 'fitness_health', 'business',
];

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
