import type { IntakeLLM, RewriteLLM } from '../types.js';
import type { IntakeTurn } from '../../types.js';
import { config } from '../../config.js';

/**
 * Live LLM adapters.
 * NOTE: Muse Spark 1.1 launched July 9, 2026 (public preview). The endpoint
 * shape below follows the OpenAI-compatible pattern most Model APIs use —
 * VERIFY against Meta's docs (ai.meta.com) before production, and READ THE
 * DATA TERMS before sending real user goals. Fallback: Claude (Anthropic).
 */

const INTAKE_SYSTEM = `You are the 2+ onboarding interviewer — a wise, warm coach.
You are interviewing the user about one life area at a time to understand what they
want to experience and accomplish, and why. Rules:
- Ask ONE question at a time. At most 2-3 questions per area.
- Reference what the user already told you (including earlier areas) to show you're listening.
- First question captures the goal; second captures the why; optional third goes deeper only if invited.
- Warm, direct, never preachy. Never use alarm or shame.`;

const EXTRACT_SYSTEM = `Extract from the conversation a JSON object:
{"rawText": "<the user's goal in their own words>", "whyText": "<their why>", "actionItems": ["<1-2 small starter actions>"]}
Return ONLY JSON.`;

const REWRITE_SYSTEM = `You rewrite goals as present-tense, identity-based "I am" statements.
Rules: no want/hope/will language; no separation or lack between the person and the goal;
succinct and beautiful; first person present tense. Return only the statement.`;

async function openAICompatChat(baseUrl: string, apiKey: string, model: string, system: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  if (!res.ok) throw new Error(`LLM ${model} error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

export class SparkIntakeLLM implements IntakeLLM {
  async nextMessage(turns: IntakeTurn[], area: string, context: { priorGoals: string[] }): Promise<string> {
    const messages = [
      { role: 'user' as const, content: `Current life area: ${area}. Goals already captured: ${context.priorGoals.join('; ') || 'none yet'}.` },
      ...turns.map(t => ({ role: t.role, content: t.content })),
    ];
    return openAICompatChat(config.metaApiBase, config.metaApiKey, 'muse-spark-1.1', INTAKE_SYSTEM, messages);
  }
  async extractGoal(turns: IntakeTurn[], area: string) {
    const convo = turns.map(t => `${t.role}: ${t.content}`).join('\n');
    const raw = await openAICompatChat(config.metaApiBase, config.metaApiKey, 'muse-spark-1.1', EXTRACT_SYSTEM, [
      { role: 'user', content: `Area: ${area}\n${convo}` },
    ]);
    return JSON.parse(raw) as { rawText: string; whyText: string; actionItems: string[] };
  }
}

export class DeepSeekRewriteLLM implements RewriteLLM {
  // Via US host (Together) — never api.deepseek.com for user data.
  async toIAmStatement(rawGoal: string, whyText?: string): Promise<string> {
    return openAICompatChat('https://api.together.xyz/v1', config.togetherApiKey, 'deepseek-ai/deepseek-v4-flash', REWRITE_SYSTEM, [
      { role: 'user', content: `Goal: ${rawGoal}\nWhy: ${whyText ?? ''}` },
    ]);
  }
  async encouragement(stats: { completed: number; target: number }): Promise<string> {
    return openAICompatChat('https://api.together.xyz/v1', config.togetherApiKey, 'deepseek-ai/deepseek-v4-flash',
      'Write one short, warm, encouraging end-of-day message. Never condemning, no shame, no red-alert energy.',
      [{ role: 'user', content: `User experienced affirmations ${stats.completed} of ${stats.target} times today.` }]);
  }
}
