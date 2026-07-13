import type {
  IntakeLLM, RewriteLLM, TTSProvider, ImageProvider, VideoProvider, StorageProvider,
} from './types.js';
import type { IntakeTurn } from '../types.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Mock providers: deterministic, instant, zero-cost. They let the entire
 * pipeline (intake -> rewrite -> stage1 -> stage2 -> stitch) run locally
 * with no accounts. Media mocks emit tiny valid placeholder bytes; the
 * stitch step generates real test clips via ffmpeg when available.
 */

const AREA_QUESTIONS: Record<string, string[]> = {
  spiritual: ['What does your spiritual life look like at its best?', 'Why does that matter to you?'],
  financial: ['What are you aiming for financially this season?', 'Who are you building that for?'],
  relationships: ['What relationship do you most want to strengthen?', 'What would "strengthened" feel like day to day?'],
  family: ['What do you want your family life to look like?', 'Why now?'],
  social: ['What kind of community do you want around you?', 'What would that change for you?'],
  fitness_health: ['Where is your health journey headed?', 'What does the finish line look like?'],
  business: ['What are you building in your work or business?', 'What would delight your customers most?'],
};

export class MockIntakeLLM implements IntakeLLM {
  async nextMessage(turns: IntakeTurn[], area: string): Promise<string> {
    const qs = AREA_QUESTIONS[area] ?? ['Tell me about this area of your life.', 'Why does it matter?'];
    const asked = turns.filter(t => t.role === 'assistant').length;
    return qs[Math.min(asked, qs.length - 1)]!;
  }
  async extractGoal(turns: IntakeTurn[], area: string) {
    const userText = turns.filter(t => t.role === 'user').map(t => t.content).join(' ');
    return {
      rawText: userText || `A meaningful ${area} goal`,
      whyText: 'Because it matters to who I am becoming.',
      actionItems: ['Take one small step this week'],
    };
  }
}

export class MockRewriteLLM implements RewriteLLM {
  async toIAmStatement(rawGoal: string): Promise<string> {
    // Deliberately simple transformation demonstrating the want -> identity move.
    const cleaned = rawGoal
      .replace(/^i want to /i, '')
      .replace(/^i want /i, '')
      .replace(/^my goal is to /i, '')
      .trim();
    return `I am living it now: ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).replace(/\.$/, '')}.`;
  }
  async encouragement(stats: { completed: number; target: number }): Promise<string> {
    return `Great job today — you experienced your affirmations ${stats.completed} of ${stats.target} times. Way to tune into this reality.`;
  }
}

// 1x1 transparent PNG
const TINY_PNG = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
), c => c.charCodeAt(0));

export class MockTTS implements TTSProvider {
  async cloneVoice(): Promise<{ voiceId: string; costUsd: number }> {
    return { voiceId: `mock-voice-${Date.now()}`, costUsd: 0 };
  }
  async synthesize(text: string): Promise<{ audio: Uint8Array; format: 'wav'; costUsd: number }> {
    // Marker bytes; the demo stitch generates real audio via ffmpeg lavfi instead.
    return { audio: new TextEncoder().encode(`MOCKWAV:${text.slice(0, 32)}`), format: 'wav', costUsd: 0 };
  }
  async deleteVoice(): Promise<void> { /* no-op */ }
}

export class MockImage implements ImageProvider {
  async generate(): Promise<{ image: Uint8Array; format: 'png'; costUsd: number }> {
    return { image: TINY_PNG, format: 'png', costUsd: 0 };
  }
}

export class MockVideo implements VideoProvider {
  readonly vendorName = 'mock';
  async imageToVideo(_img: Uint8Array, prompt: string): Promise<{ video: Uint8Array; format: 'mp4'; costUsd: number }> {
    return { video: new TextEncoder().encode(`MOCKMP4:${prompt.slice(0, 32)}`), format: 'mp4', costUsd: 0 };
  }
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private baseDir: string) {}
  async put(key: string, data: Uint8Array): Promise<void> {
    const path = join(this.baseDir, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }
  async getUrl(key: string): Promise<string> {
    return `file://${join(this.baseDir, key)}`;
  }
  async delete(key: string): Promise<void> {
    await rm(join(this.baseDir, key), { force: true });
  }
}
