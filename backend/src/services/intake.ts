import type { IntakeLLM } from '../adapters/types.js';
import type { Goal, IntakeSession, IntakeTurn, LifeArea } from '../types.js';
import { LIFE_AREAS } from '../types.js';

const MAX_QUESTIONS_PER_AREA = 3;

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
    return LIFE_AREAS[Math.min(session.areaIndex, LIFE_AREAS.length - 1)]!;
  }

  async nextQuestion(session: IntakeSession): Promise<string> {
    const area = this.currentArea(session);
    const priorGoals = session.goals.map(g => g.rawText);
    const isFirstMessage = session.areaIndex === 0 && session.turns.length === 0;
    const q = await this.llm.nextMessage(session.turns, area, { priorGoals, userName: session.name, isFirstMessage });
    session.turns.push({ role: 'assistant', content: q });
    return q;
  }

  /** Handle a user answer; returns whether the current area is complete. */
  async submitAnswer(session: IntakeSession, answer: string): Promise<{ areaComplete: boolean; sessionComplete: boolean }> {
    session.turns.push({ role: 'user', content: answer });
    const questionsAsked = session.turns.filter(t => t.role === 'assistant').length;
    const areaComplete = questionsAsked >= MAX_QUESTIONS_PER_AREA - 1; // 2 Qs default; 3rd is optional depth
    if (areaComplete) await this.completeArea(session);
    return { areaComplete, sessionComplete: session.completed };
  }

  /** User taps "Not this season" — skip the area with no goal. */
  async skipArea(session: IntakeSession): Promise<void> {
    this.advance(session, null);
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
    if (session.areaIndex >= LIFE_AREAS.length - 1) {
      session.completed = true;
    } else {
      session.areaIndex += 1;
    }
  }
}
