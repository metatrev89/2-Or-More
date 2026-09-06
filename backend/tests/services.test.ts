import { describe, it, expect } from 'vitest';
import { MockIntakeLLM, MockRewriteLLM } from '../src/adapters/mock.js';
import { IntakeService } from '../src/services/intake.js';
import { AffirmationService } from '../src/services/affirmations.js';
import { buildPlan, computeSlots, primeProtocolPerDay } from '../src/services/scheduling.js';
import { summarize } from '../src/services/gamification.js';
import { LIFE_AREAS } from '../src/types.js';

describe('IntakeService', () => {
  it('walks all 7 life areas and completes with goals', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    let guard = 0;
    while (!session.completed && guard++ < 50) {
      await svc.nextQuestion(session);
      await svc.submitAnswer(session, 'I want to make seven figures this year');
    }
    expect(session.completed).toBe(true);
    expect(session.goals.length).toBe(LIFE_AREAS.length);
  });

  it('skipping an area records no goal', async () => {
    const svc = new IntakeService(new MockIntakeLLM());
    const session = svc.newSession('u1');
    await svc.nextQuestion(session);
    await svc.skipArea(session);
    expect(session.goals.length).toBe(0);
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

  it('appends identity statements', () => {
    const svc = new AffirmationService(new MockRewriteLLM());
    const ids = svc.identityStatements('u1');
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(a => a.isIdentity)).toBe(true);
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
