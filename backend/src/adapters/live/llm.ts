import type { IntakeLLM, RewriteLLM } from '../types.js';
import { AREA_META, type IntakeTurn, type LifeArea } from '../../types.js';
import { config } from '../../config.js';

/**
 * Live LLM adapters.
 * NOTE: Muse Spark 1.1 launched July 9, 2026 (public preview). The endpoint
 * shape below follows the OpenAI-compatible pattern most Model APIs use —
 * VERIFY against Meta's docs (ai.meta.com) before production, and READ THE
 * DATA TERMS before sending real user goals. Fallback: Claude (Anthropic).
 */

/**
 * ── Meta tier guardrail (Sept 2026, see "Meta API Terms Review.md") ──
 * Meta selects its data-training "Contributor" tier VIA THE MODEL ID STRING
 * (e.g. muse-spark-1.3-contributor). Contributor tier grants Meta training
 * rights on prompts/outputs and is categorically banned for 2+ user data.
 * Every Meta call goes through museModel(), which hard-fails on anything
 * outside this allowlist. Update the list deliberately; never interpolate.
 */
const MUSE_ALLOWED_MODELS = ['muse-spark-1.3', 'muse-spark-1.1'] as const;

function museModel(model: string): string {
  if (model.toLowerCase().includes('contributor')) {
    throw new Error(`BLOCKED: Meta Contributor tier (training-rights) model requested: "${model}" — see Meta API Terms Review.md`);
  }
  if (!(MUSE_ALLOWED_MODELS as readonly string[]).includes(model)) {
    throw new Error(`BLOCKED: Meta model "${model}" is not on MUSE_ALLOWED_MODELS — verify its data tier before allowlisting`);
  }
  return model;
}

const SPARK_MODEL = 'muse-spark-1.3'; // standard tier — Trevor's Sept feel-test winner

const INTAKE_SYSTEM = `You are the 2+ onboarding interviewer — a wise, warm coach.
You are guiding the user through seven life areas in a deliberate root-to-crown arc,
each mapped to a chakra: Health & Body (Root — Foundation), Emotions & Creativity
(Sacral — Flow), Career, Purpose & Power (Solar Plexus — Drive), Relationships & Love
(Heart — Connection), Communication & Expression (Throat — Voice), Mindset, Vision &
Growth (Third Eye — Clarity), Spirit & Purpose (Crown — Unity). For each area you are
capturing what they want to experience in the next 12 months, and why. Rules:
- Ask ONE question at a time. At most 2-3 questions per area.
- First question captures the 12-month vision for the area; second captures the why
  (who and what it serves); optional third goes deeper only if invited.
- You may gently reference the area's chakra theme (foundation, flow, drive,
  connection, voice, clarity, unity) to frame the question — lightly, never lecturing.
- Reference what the user already told you (including earlier areas) to show you're listening.
- Warm, direct, never preachy. Never use alarm or shame.`;

const EXTRACT_SYSTEM = `Extract from the conversation a JSON object:
{"rawText": "<the user's goal in their own words>", "whyText": "<their why>", "actionItems": ["<1-2 small starter actions>"]}
Return ONLY JSON.`;

const REWRITE_SYSTEM = `You rewrite goals as present-tense, identity-based "I AM" statements.
Rules:
- First person, present tense, already true. No want/hope/will/trying language; no separation or lack between the person and the goal.
- Write "I AM" fully capitalized when it opens a claim.
- 2-4 sentences. Open with the identity claims, then weave the person's WHY into the statement itself ("I have this because...", "I live this way because...") so the statement ends on purpose and meaning, not on the goal.
- Keep the user's own specifics (numbers, names, phrases) — precision makes it real.
- Beautiful, grounded, never generic. Return only the statement.

Example of the target form:
Goal: In 12 months I would like to be 175 pounds, excellent bloodwork, high energy, working out 5 days a week, waking well rested.
Why: So I have energy and longevity for myself, my children, my work, and life.
Statement: I AM 175 pounds with excellent bloodwork and vibrant health. I AM strong and getting stronger, working out 5 days a week, sleeping deeply and waking well-rested with high energy every day. I have this because it gives me longevity and peace of mind to be fully present for myself, my children, my work, and my mission.`;

async function openAICompatChat(baseUrl: string, apiKey: string, model: string, system: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  if (!res.ok) {
    // Key fingerprint (length + first 4 chars) is safe to log and pinpoints
    // missing/truncated/whitespace-damaged secrets without exposing them.
    console.error(`LLM ${model} HTTP ${res.status}; keyLen=${apiKey.length} keyPrefix=${apiKey.slice(0, 4)}; body=${(await res.clone().text()).slice(0, 300)}`);
    throw new Error(`LLM ${model} error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

export class SparkIntakeLLM implements IntakeLLM {
  async nextMessage(turns: IntakeTurn[], area: string, context: { priorGoals: string[] }): Promise<string> {
    const messages = [
      { role: 'user' as const, content: `Current life area: ${AREA_META[area as LifeArea]?.label ?? area} (${AREA_META[area as LifeArea]?.chakra ?? ''}). Goals already captured: ${context.priorGoals.join('; ') || 'none yet'}.` },
      ...turns.map(t => ({ role: t.role, content: t.content })),
    ];
    return openAICompatChat(config.metaApiBase, config.metaApiKey, museModel(SPARK_MODEL), INTAKE_SYSTEM, messages);
  }
  async extractGoal(turns: IntakeTurn[], area: string) {
    const convo = turns.map(t => `${t.role}: ${t.content}`).join('\n');
    const raw = await openAICompatChat(config.metaApiBase, config.metaApiKey, museModel(SPARK_MODEL), EXTRACT_SYSTEM, [
      { role: 'user', content: `Area: ${area}\n${convo}` },
    ]);
    return JSON.parse(raw) as { rawText: string; whyText: string; actionItems: string[] };
  }
}

/** PRIMARY rewrite adapter (Trevor, Sept 2026): same Spark model as intake —
 *  one voice from interview → "I am" statements. Cost accepted over DeepSeek. */
export class SparkRewriteLLM implements RewriteLLM {
  async toIAmStatement(rawGoal: string, whyText?: string): Promise<string> {
    return openAICompatChat(config.metaApiBase, config.metaApiKey, museModel(SPARK_MODEL), REWRITE_SYSTEM, [
      { role: 'user', content: `Goal: ${rawGoal}\nWhy: ${whyText ?? ''}` },
    ]);
  }
  async encouragement(stats: { completed: number; target: number }): Promise<string> {
    return openAICompatChat(config.metaApiBase, config.metaApiKey, museModel(SPARK_MODEL),
      'Write one short, warm, encouraging end-of-day message. Never condemning, no shame, no red-alert energy.',
      [{ role: 'user', content: `User experienced affirmations ${stats.completed} of ${stats.target} times today.` }]);
  }
}

export class DeepSeekRewriteLLM implements RewriteLLM {
  // COST FALLBACK. Via US host (Together) — never api.deepseek.com for user data.
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
