import type { RewriteLLM } from '../adapters/types.js';
import type { Affirmation, Goal } from '../types.js';

const FORBIDDEN_OPENERS = [/^i want/i, /^i will/i, /^i hope/i, /^i wish/i, /^i'm going to/i, /^i am going to/i];

/**
 * The "I am" statement engine (US-2, US-3).
 * LLM does the language; this service enforces the manifestation-language
 * rules so a bad generation never reaches a user.
 */
export class AffirmationService {
  constructor(private llm: RewriteLLM) {}

  async rewriteGoal(goal: Goal): Promise<Affirmation> {
    let statement = (await this.llm.toIAmStatement(goal.rawText, goal.whyText)).trim();

    // Guardrail: regenerate once if want/future language slipped through.
    if (FORBIDDEN_OPENERS.some(rx => rx.test(statement))) {
      statement = (await this.llm.toIAmStatement(
        `${goal.rawText} (Rewrite strictly in present tense as an established fact — no want/will/hope.)`,
        goal.whyText,
      )).trim();
    }

    return {
      id: crypto.randomUUID(),
      userId: goal.userId,
      goalId: goal.id,
      statement: normalize(statement),
      isIdentity: false,
    };
  }

  async rewriteAll(goals: Goal[]): Promise<Affirmation[]> {
    return Promise.all(goals.map(g => this.rewriteGoal(g)));
  }
}

/**
 * REMOVED Sept 9, 2026 — identityStatements(): two hardcoded "eternal identity"
 * affirmations ("I am positive. I am happy. I am loved." / "I stay in God's
 * presence...") used to be appended to every set, so users saw a generic #8 and
 * #9 they never said (Trevor: "8 & 9 affirmations are just generically added").
 * Every affirmation now traces back to something the user actually told us —
 * including the optional 8th from the intake's catch-all question
 * (LifeArea 'open_capture'). Don't reintroduce set-level boilerplate here; if a
 * universal statement is ever wanted, it belongs in the conversation, not
 * stapled on after it.
 */

function normalize(s: string): string {
  const cleaned = s.replace(/^["']|["']$/g, '').trim();
  return cleaned.endsWith('.') ? cleaned : `${cleaned}.`;
}
