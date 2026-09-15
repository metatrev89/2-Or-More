import { describe, it, expect } from 'vitest';
import { MockIntakeLLM, MockRewriteLLM } from '../src/adapters/mock.js';
import { IntakeService } from '../src/services/intake.js';
import { AffirmationService } from '../src/services/affirmations.js';
import { buildPlan, computeSlots, primeProtocolPerDay } from '../src/services/scheduling.js';
import { summarize } from '../src/services/gamification.js';
import { LIFE_AREAS } from '../src/types.js';

describe('IntakeService', () => {
  it('walks all 7 life areas, then the catch-all — an answer becomes the 8th goal', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    let guard = 0;
    while (!session.completed && guard++ < 50) {
      await svc.nextQuestion(session);
      await svc.submitAnswer(session, 'I want to make seven figures this year');
    }
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(LIFE_AREAS.length + 1);
    expect(session.goals.at(-1)!.area).toBe('open_capture');
  });

  it('declining the catch-all finishes with the seven areas only', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    let guard = 0;
    while (!session.completed && guard++ < 50) {
      await svc.nextQuestion(session);
      await svc.submitAnswer(session, svc.isCatchAll(session) ? "that's it" : 'A goal for this area');
    }
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(LIFE_AREAS.length);
    expect(session.goals.some(g => g.area === 'open_capture')).toBe(false);
  });

  // Real users don't answer with a bare "no" — they write "No, that's it".
  it.each([
    'no', 'Nope', "No, that's it", "Nope, that's everything", "I'm good, thanks",
    'nothing else for now', 'That covers it', '   ', 'all set',
  ])('treats %j as a decline (no 8th goal)', async (answer) => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    session.areaIndex = LIFE_AREAS.length;
    await svc.nextQuestion(session);
    await svc.submitAnswer(session, answer);
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(0);
  });

  // ...but a real answer that merely starts with "no" is still an answer.
  it.each([
    'No — I want to finish writing my book this year',
    'Yes, I want to buy a home for my family',
    'One more thing: I want to run a marathon',
  ])('treats %j as a real 8th goal', async (answer) => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    session.areaIndex = LIFE_AREAS.length;
    await svc.nextQuestion(session);
    await svc.submitAnswer(session, answer);
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(1);
    expect(session.goals[0]!.area).toBe('open_capture');
  });

  it('the catch-all asks exactly once', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    session.areaIndex = LIFE_AREAS.length; // jump straight to the catch-all
    expect(svc.currentArea(session)).toBe('open_capture');
    await svc.nextQuestion(session);
    await svc.submitAnswer(session, 'I want to finish writing my book this year');
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(1);
  });

  it('skipping an area records no goal', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    await svc.nextQuestion(session);
    await svc.skipArea(session);
    expect(session.goals.length).toBe(0);
    expect(session.areaIndex).toBe(1);
  });

  // A skip must be acknowledged once and then forgotten — otherwise the model
  // opens the next area thanking them for a why they never gave.
  it('a skip is flagged to the next question, then cleared', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    await svc.nextQuestion(session);
    await svc.skipArea(session);
    expect(session.skippedArea).toBe('Health & Body');

    const q = await svc.nextQuestion(session);
    expect(q).toContain('Health & Body');       // acknowledged
    expect(session.skippedArea).toBeUndefined(); // one-shot

    // The following question must not mention it again.
    await svc.submitAnswer(session, 'A goal for this area');
    const next = await svc.nextQuestion(session);
    expect(next).not.toContain('No problem');
  });

  it('skipping the final area still reaches the catch-all', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    session.areaIndex = LIFE_AREAS.length - 1; // last chakra area
    await svc.nextQuestion(session);
    await svc.skipArea(session);
    expect(session.completed).toBe(false);
    expect(svc.isCatchAll(session)).toBe(true);
  });

  // ── Two questions per area, always (Trevor, Sept 14) ───────────────────
  // A live session double-asked the follow-up in area 1 and skipped it in
  // area 2, because the model inferred which message to write from a
  // conversation that gets wiped at every area boundary. Phase is now handed
  // down by the service, and area completion counts USER answers — so neither
  // depends on what the model chooses to say.

  it('asks goal then why in every area, regardless of what the model emits', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    const seen: string[] = [];
    let guard = 0;
    while (!session.completed && guard++ < 50) {
      seen.push(svc.phase(session));
      await svc.nextQuestion(session);
      await svc.submitAnswer(session, 'a real answer with enough words to not read as a decline');
    }
    // Seven areas x (goal, why), then one catch-all.
    const expected = [...LIFE_AREAS.flatMap(() => ['goal', 'why']), 'catch_all'];
    expect(seen).toEqual(expected);
  });

  it('survives a duplicated question — an extra assistant turn must not close the area', async () => {
    // This is the exact shape of Trevor's Sept 14 report: one area asked the
    // follow-up twice, the next area skipped it entirely. A retried or
    // double-fired /intake/answer pushes a SECOND assistant turn with no user
    // answer between. The old rule counted assistant turns, so two questions
    // and one answer looked like a finished area: the area closed early, and
    // the duplicate question surfaced as a second follow-up.
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');

    await svc.nextQuestion(session);
    const r1 = await svc.submitAnswer(session, 'my goal is seven figures');
    expect(r1.areaComplete).toBe(false);

    await svc.nextQuestion(session);
    await svc.nextQuestion(session);              // the duplicate
    expect(session.turns.filter(t => t.role === 'assistant')).toHaveLength(3);
    expect(svc.phase(session)).toBe('why');       // still owed the why
    expect(session.areaIndex).toBe(0);            // and still on area 1

    const r2 = await svc.submitAnswer(session, 'because my family depends on it');
    expect(r2.areaComplete).toBe(true);
    expect(session.areaIndex).toBe(1);
    expect(svc.phase(session)).toBe('goal');      // next area starts at goal
  });

  it('carries the why across the area boundary so the next opener can receive it', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    await svc.nextQuestion(session);
    await svc.submitAnswer(session, 'my goal is to be strong at 70');
    await svc.nextQuestion(session);
    await svc.submitAnswer(session, 'because I want to keep up with my kids');

    expect(session.turns).toHaveLength(0);        // wiped, as designed
    expect(session.lastWhy).toBeTruthy();         // but the why survived

    await svc.nextQuestion(session);
    expect(session.lastWhy).toBeUndefined();      // one-shot, consumed
  });

  it('skipping still lands the next area on its goal question', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    await svc.nextQuestion(session);
    await svc.skipArea(session);
    expect(svc.phase(session)).toBe('goal');
    expect(session.areaIndex).toBe(1);
  });
});

describe('AffirmationService', () => {
  it('never lets want-language reach the user', async () => {
    const svc = new AffirmationService(new MockRewriteLLM());
    const aff = await svc.rewriteGoal({
      id: 'g1', userId: 'u1', area: 'career_purpose',
      rawText: 'I want to make a seven-figure income from my business',
      actionItems: [],
    });
    expect(aff.statement.toLowerCase().startsWith('i want')).toBe(false);
    expect(aff.statement.endsWith('.')).toBe(true);
  });

  // Guards the Sept 9 removal of the two hardcoded "identity" affirmations:
  // the set is exactly what the user said, nothing appended.
  it('produces one affirmation per goal — no appended boilerplate', async () => {
    const svc = new AffirmationService(new MockRewriteLLM());
    const goals = [
      { id: 'g1', userId: 'u1', area: 'health_body' as const, rawText: 'Get to 175 pounds', actionItems: [] },
      { id: 'g2', userId: 'u1', area: 'open_capture' as const, rawText: 'Finish writing my book', actionItems: [] },
    ];
    const affs = await svc.rewriteAll(goals);
    expect(affs.length).toBe(goals.length);
    expect(affs.every(a => !a.isIdentity)).toBe(true);
    expect(affs.map(a => a.goalId)).toEqual(['g1', 'g2']);
  });
});

describe('scheduling', () => {
  it('prime protocol phases: 10 -> 5 -> 3', () => {
    expect(primeProtocolPerDay(0)).toBe(10);
    expect(primeProtocolPerDay(13)).toBe(10);
    expect(primeProtocolPerDay(14)).toBe(5);
    expect(primeProtocolPerDay(29)).toBe(5);
    expect(primeProtocolPerDay(30)).toBe(3);
  });

  it('staggers slots evenly across the window', () => {
    const slots = computeSlots(4, '08:00', '20:00');
    expect(slots).toEqual(['08:00', '12:00', '16:00', '20:00']);
  });

  it('clamps custom cadence to 1..12', () => {
    expect(buildPlan({ plan: 'custom', daysSinceStart: 0, customPerDay: 99 }).perDay).toBe(12);
    expect(buildPlan({ plan: 'custom', daysSinceStart: 0, customPerDay: 0 }).perDay).toBe(1);
  });
});

describe('audio-driven scene length', () => {
  it('scene length tracks audio duration within the 3-8s cost band', async () => {
    const { sceneSecondsForAudio } = await import('../src/services/stitch.js');
    expect(sceneSecondsForAudio(4.2)).toBe(5);   // rounds up to cover the audio
    expect(sceneSecondsForAudio(1.0)).toBe(3);   // floor: minimum scene
    expect(sceneSecondsForAudio(9.5)).toBe(8);   // ceiling: cost guardrail
    expect(sceneSecondsForAudio(6.0)).toBe(6);   // exact fit
  });
});

describe('gamification', () => {
  it('closes rings on a perfect day and tracks streaks', () => {
    const s = summarize([
      { date: '2026-07-08', experiences: 10, target: 10 },
      { date: '2026-07-09', experiences: 10, target: 10 },
      { date: '2026-07-10', experiences: 10, target: 10 },
    ]);
    expect(s.today.ringsClosed).toBe(true);
    expect(s.streakDays).toBe(3);
    expect(s.medals).toContain('perfect_day');
  });

  it('an incomplete today does not end the streak (encouraging, never condemning)', () => {
    const s = summarize([
      { date: '2026-07-08', experiences: 10, target: 10 },
      { date: '2026-07-09', experiences: 10, target: 10 },
      { date: '2026-07-10', experiences: 1, target: 10 },
    ]);
    expect(s.streakDays).toBeGreaterThanOrEqual(2);
  });
});
