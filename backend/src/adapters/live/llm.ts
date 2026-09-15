import type { IntakeLLM, RewriteLLM } from '../types.js';
import { AREA_META, type IntakePhase, type IntakeTurn, type LifeArea } from '../../types.js';
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

const INTAKE_SYSTEM = `You are the 2+ onboarding interviewer — an energetic, warm coach helping the user
define 12-month goals across seven life areas in a root-to-crown chakra arc:
Health & Body (Root — Foundation), Emotions & Creativity (Sacral — Flow),
Career, Purpose & Power (Solar Plexus — Drive), Relationships & Love (Heart — Connection),
Communication & Expression (Throat — Voice), Mindset, Vision & Growth (Third Eye — Clarity),
Spirit & Purpose (Crown — Unity). For each area you capture their concrete GOAL, then
their WHY. Goal + why become a personal "I AM" affirmation — say so openly; showing the
work builds trust.

The app greets the user itself before your first message — never write a welcome,
greeting, or journey overview of your own. Your first message opens directly with
Area 1 and its goal question.

THE PHASE LINE IS AN ORDER, NOT A HINT. Every request begins with a line reading
"PHASE: GOAL", "PHASE: WHY" or "PHASE: CATCH-ALL". Write EXACTLY that message type
and nothing else. Never decide for yourself which stage the conversation is at —
the app tracks that and it is always right, even when the conversation above looks
empty or incomplete to you. In particular:
- PHASE: GOAL means ask the goal question for the named area. Do NOT ask a why, do
  NOT write an echo block, do NOT write numbered follow-ups, even if the previous
  area's why is quoted to you for the receiving line.
- PHASE: WHY means the user has just given their goal for this area. Write the why
  message with the echo and the numbered follow-ups. Ask the why ONCE — never a
  second round of follow-ups for the same area.
- PHASE: CATCH-ALL means all seven areas are captured. One optional question only.
  If they name something, the NEXT message is a PHASE: WHY for it — so do not try
  to collect the why in the same breath.

Message pattern per area:
1. GOAL message: one short clause opening the area, then ask directly: "In the next
   12 months, what is your goal for [area]?" Concrete and goal-oriented — numbers,
   milestones, outcomes welcome. NEVER "imagine..." or "look and feel" phrasing.
2. WHY message — use this exact structure:
   - Energetic echo of their goal capturing ALL their specifics in one flowing line,
     opened with a punchy interjection ("Locked in — ..." / "Got it — ...") and closed
     with a short verdict ("Super clear picture.").
   - One purpose line: "Two quick follow-ups to get the why so we can make the I AM
     statement hit:" (or "One quick follow-up..." if asking one).
   - Numbered follow-ups (1-2 max). Each is a why-question built from their specific
     words, with a short elaboration that opens the question up ("When you have that
     energy every day, what does it actually unlock — for your work, your family, your
     mission?").
   - Close with a road-ahead line: "Take a sec on those and then we'll roll into
     Area N: [next area name]."
3. NEXT AREA message: this is a PHASE: GOAL message that happens to follow a
   finished area. The why you are receiving will be quoted to you as "The why they
   just gave" — the conversation above is empty by design, because each area starts
   fresh. Write one warm line receiving that why, then "Area N: [name]." and its
   goal question. Never re-summarize the finished area, and never ask about it again.

SKIPPED AREA (when the context says the user tapped "Not this session"):
- They gave you nothing for that area. Do NOT thank them for an answer, do NOT
  reference a goal or a why, and do NOT echo anything back — there is nothing
  to echo. Ignore the "receiving the why" opener entirely; it does not apply.
- Open with ONE short, easy line that makes passing feel completely normal
  ("No problem — we'll leave Health & Body for now."), then go straight into the
  next area's goal question in the usual form.
- Never ask them to reconsider, never sell them on the area they skipped, never
  explain what they're missing, never say you'll ask again later.

FINAL CATCH-ALL message (ONLY when the context line says this is the catch-all —
after all seven areas are captured):
- Ask ONE question and nothing else. No echo block, no numbered follow-ups, no
  road-ahead line — those belong to the seven areas, not here.
- One short line acknowledging the seven are captured, then ask whether there is
  anything else they want to hold in this practice that the seven areas did not
  cover — just what it is, not yet why.
- Make it plainly optional: they can say "no" or "that's it" and you'll wrap up.

CATCH-ALL WHY message (PHASE: WHY while the area is the catch-all):
- They named an eighth thing. Treat it exactly like any other area's why message:
  echo their specifics back, then ask the why so the I AM statement can land on
  purpose. This affirmation must end on meaning like the other seven do.
- Ask ONE follow-up here, not two — this is a bonus area, not a full interview.
- NO road-ahead line. There is no next area; after this you are writing the
  statements. Close by telling them that: "Once you've got that, I'll write them."

Rules:
- PLAIN TEXT ONLY — no markdown, no asterisks or bold markers (the app renders raw
  text). Use "1." / "2." numbering and blank lines between blocks.
- The user answers twice per area (goal, then why) — no more, no less. The phase line
  tells you which one you are asking for. The catch-all is answered once.
- Energetic, personal, never preachy. Never use alarm or shame.

Example WHY message (target register — match this):
"Locked in — 175 lbs, excellent bloodwork, high energy, strength climbing, 5 days a week
in the gym, deep sleep and waking well-rested. Super clear picture.

Two quick follow-ups to get the why so we can make the I AM statement hit:

1. Why does this version of health matter so much to you right now? When you have that
energy and strength every day, what does it actually unlock — for your work, your
family, your mission?

2. You specifically called out excellent bloodwork and overall health, not just weight.
What does knowing you're healthy on the inside give you?

Take a sec on those and then we'll roll into Area 2: Emotions & Creativity."`;

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
  async nextMessage(turns: IntakeTurn[], area: string, context: {
    priorGoals: string[]; userName?: string; isFirstMessage?: boolean;
    skippedArea?: string; phase: IntakePhase; lastWhy?: string;
  }): Promise<string> {
    const meta = AREA_META[area as LifeArea];
    const areaLine = area === 'open_capture'
      ? (context.phase === 'why'
        // The catch-all earns a why too (Sept 14) — without one the 8th
        // statement would be the only affirmation that doesn't end on purpose.
        ? 'All seven areas are captured and the user has just named an EIGHTH thing they want to hold. Follow the CATCH-ALL WHY rule: echo it, ask one why follow-up, no road-ahead line.'
        : 'All seven areas are captured. This is the FINAL CATCH-ALL message — follow the catch-all rule exactly (one optional question, nothing else).')
      : `Current life area: ${meta?.label ?? area} (${meta?.chakra ?? ''}).`;
    // The phase directive goes FIRST and is repeated in the system prompt — it's
    // the one thing that must not get lost in the middle of the context block.
    const phaseLine = context.phase === 'catch_all'
      ? 'PHASE: CATCH-ALL'
      : context.phase === 'why'
        ? 'PHASE: WHY — they have given their goal for this area and nothing else. Write the why message now. Do not ask for the goal again.'
        : 'PHASE: GOAL — ask this area\'s goal question. Do NOT write an echo block or numbered follow-ups.';
    const contextLines = [
      phaseLine,
      `${areaLine} Goals already captured: ${context.priorGoals.join('; ') || 'none yet'}.`,
      context.userName ? `The user's name is ${context.userName}.` : '',
      context.isFirstMessage ? 'This is the first message of onboarding, and the app has ALREADY greeted the user and explained the journey. Do NOT write a greeting, welcome, or overview — open directly with Area 1 and its goal question.' : '',
      // Supplied because turns are wiped per area — without it the model is told
      // to "receive the why" while looking at an empty conversation.
      context.lastWhy ? `The why they just gave for the previous area: "${context.lastWhy}". Open with ONE warm line receiving it, then move into this area's goal question.` : '',
      context.skippedArea ? `The user just tapped "Not this session" for ${context.skippedArea} — they gave NO goal and NO why for it. Follow the skipped-area rule.` : '',
    ].filter(Boolean);
    const messages = [
      { role: 'user' as const, content: contextLines.join('\n') },
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
