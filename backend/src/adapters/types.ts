import type { IntakeTurn } from '../types.js';

/**
 * Every AI vendor sits behind one of these interfaces.
 * Mock implementations run the whole pipeline with zero API keys;
 * live implementations are selected via PROVIDER_* env vars.
 * Swapping LTX <-> Wan after the bake-off is a config change, not a code change.
 */

export interface IntakeLLM {
  /** Next interviewer message given conversation so far. */
  nextMessage(turns: IntakeTurn[], area: string, context: { priorGoals: string[] }): Promise<string>;
  /** Extract a structured goal from the completed area conversation. */
  extractGoal(turns: IntakeTurn[], area: string): Promise<{ rawText: string; whyText: string; actionItems: string[] }>;
}

export interface RewriteLLM {
  /** Want-language -> present-tense "I am" statement. */
  toIAmStatement(rawGoal: string, whyText: string | undefined): Promise<string>;
  /** Encouraging (never condemning) end-of-day message. */
  encouragement(stats: { completed: number; target: number }): Promise<string>;
}

export interface TTSProvider {
  /** Returns a vendor voice id. Caller MUST have verified consent first (voice_profiles.consent_given_at). */
  cloneVoice(sampleAudio: Uint8Array, userRef: string): Promise<{ voiceId: string; costUsd: number }>;
  synthesize(text: string, voiceId: string | 'default'): Promise<{ audio: Uint8Array; format: 'mp3' | 'wav'; costUsd: number }>;
  deleteVoice(voiceId: string): Promise<void>; // BIPA deletion path — must work
}

export interface ImageProvider {
  /** Photo-real goal image; referenceImages personalize likeness (user consented photo). */
  generate(prompt: string, opts: { referenceImages?: Uint8Array[]; aspect: '9:16' | '1:1' }): Promise<{ image: Uint8Array; format: 'png' | 'jpg'; costUsd: number }>;
}

export interface VideoProvider {
  /** Animate a still into a clip. Portrait-first. */
  imageToVideo(image: Uint8Array, prompt: string, opts: { seconds: number; resolution: '720p' | '1080p' }): Promise<{ video: Uint8Array; format: 'mp4'; costUsd: number }>;
  readonly vendorName: string;
}

export interface StorageProvider {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
