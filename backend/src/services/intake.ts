import type { IntakeLLM } from '../adapters/types.js';
import type { Goal, IntakeSession, IntakeTurn, LifeArea } from '../types.js';
import { AREA_META, LIFE_AREAS } from '../types.js';

const MAX_QUESTIONS_PER_AREA = 3;

/**
 * The catch-all phase (added Sept 9, 2026) sits one step past the seven areas,
 * at areaIndex === LIFE_AREAS.length. The interviewer asks ONCE whether
 * anything else belongs in the practice; an answer becomes the optional 8th
 * goal, a decline ends the intake at seven. It is not a chakra and never
 * lights a progress segment.
 */
const OPEN_CAPTURE: LifeArea = 'open_capture';

/**
 * Words that can only ever be part of a brush-off ("no thanks", "nope, that's
 * everything", "I'm good for now"). A whole-answer regex was too brittle here:
 * it caught a bare "no" but not "No, that's it" — the way people actually
 * decline — and would have turned the refusal itself into an 8th affirmation.
 */
const DECLINE_TOKENS = new Set([
  'no', 'nope', 'nah', 'none', 'nothing', 'na', 'not', 'never', 'skip', 'pass',
  'i', 'im', 'we', 're', 'were', 'you', 'my', 'me',
  'that', 'thats', 'this', 'it', 'is', 'was', 'all', 'else', 'everything', 'enough',
  'good', 'great', 'fine', 'ok', 'okay', 'cool', 'set', 'done', 'complete', 'covered', 'covers', 'got',
  'thanks', 'thank', 'appreciate', 'yeah', 'yep', 'yes', 'sure',
  'for', 'now', 'the', 'and', 'but', 'just', 'only', 'right', 'so', 'think', 'guess', 'believe',
]);

/**
 * True when the catch-all answer is a decline rather than a new goal. Words-only
 * comparison: every word must be brush-off vocabulary, and anything longer than
 * a short phrase is treated as a real answer regardless.
 */
function isDecline(answer: string): boolean {
  const words = answer
    .toLowerCase()
    .replace(/['’]/g, '')          // "that's" -> "thats" so it matches as one token
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return true;
  if (words.length > 8) return false; // too much said to be a brush-off
  return words.every(w => DECLINE_TOKENS.has(w));
}

// NOTE (hybrid copy rule): the welcome/greeting is code-authored and rendered
// CLIENT-SIDE (app IntakeScreen) so it appears instantly with no model latency.
// The LLM is instructed never to write its own greeting (see adapter context).

/**
 * Conversational intake state machine (US-1, US-15, US-16).
 * The LLM asks questions; this service owns pacing, area progression,
 * skip handling, and goal extraction. Deterministic control, warm content.
 */
export class IntakeService {
  constructor(private llm: IntakeLLM) {}

  newSession(userId: string, name?: string): IntakeSession {
    return { userId, name, areaIndex: 0, turns: [], goals: [], completed: false };
  }

  currentArea(session: IntakeSession): LifeArea {
    return this.isCatchAll(session) ? OPEN_CAPTURE : LIFE_AREAS[session.areaIndex]!;
  }

  /** True once the seven areas are done and only the catch-all question remains. */
  isCatchAll(session: IntakeSession): boolean {
    return session.areaIndex >= LIFE_AREAS.length;
  }

  async nextQuestion(session: IntakeSession): Promise<string> {
    const area = this.currentArea(session);
    const priorGoals = session.goals.map(g => g.rawText);
    const isFirstMessage = session.areaIndex === 0 && session.turns.length === 0;
    const skippedArea = session.skippedArea;
    const q = await this.llm.nextMessage(session.turns, area, {
      priorGoals, userName: session.name, isFirstMessage, skippedArea,
    });
    session.skippedArea = undefined; // one-shot: acknowledge once, then move on
    session.turns.push({ role: 'assistant', content: q });
    return q;
  }

  /** Handle a user answer; returns whether the current area is complete. */
  async submitAnswer(session: IntakeSession, answer: string): Promise<{ areaComplete: boolean; sessionComplete: boolean }> {
    session.turns.push({ role: 'user', content: answer });

    // Catch-all: exactly one question. Something real becomes the 8th goal;
    // "no thanks" finishes the intake with the seven they already gave.
    if (this.isCatchAll(session)) {
      if (isDecline(answer)) this.advance(session, null);
      else await this.completeArea(session);
      return { areaComplete: true, sessionComplete: session.completed };
    }

    const questionsAsked = session.turns.filter(t => t.role === 'assistant').length;
    const areaComplete = questionsAsked >= MAX_QUESTIONS_PER_AREA - 1; // 2 Qs default; 3rd is optional depth
    if (areaComplete) await this.completeArea(session);
    return { areaComplete, sessionComplete: session.completed };
  }

  /** User taps "Not this session" — skip the area with no goal. */
  async skipArea(session: IntakeSession): Promise<void> {
    const label = AREA_META[this.currentArea(session)]?.label;
    this.advance(session, null);
    // advance() wipes turns, so without this the model would see an empty
    // conversation and open the next area as if a why had just been answered.
    if (!session.completed && label) session.skippedArea = label;
  }

  private async completeArea(session: IntakeSession): Promise<void> {
    const area = this.currentArea(session);
    const extracted = await this.llm.extractGoal(session.turns, area);
    const goal: Goal = {
      id: crypto.randomUUID(),
      userId: session.userId,
      area,
      rawText: extracted.rawText,
      whyText: extracted.whyText,
      actionItems: extracted.actionItems.slice(0, 2), // scope guardrail: starter actions only
    };
    this.advance(session, goal);
  }

  private advance(session: IntakeSession, goal: Goal | null): void {
    if (goal) session.goals.push(goal);
    session.turns = []; // fresh conversation per area; prior goals passed as context
    if (this.isCatchAll(session)) {
      session.completed = true; // the catch-all is the last stop
    } else {
      session.areaIndex += 1; // 6 -> 7 opens the catch-all
    }
  }
}
