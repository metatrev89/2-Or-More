import { Hono } from 'hono';
import { z } from 'zod';
import { getIntakeLLM, getRewriteLLM } from '../adapters/index.js';
import { IntakeService } from '../services/intake.js';
import { AffirmationService } from '../services/affirmations.js';
import { buildPlan } from '../services/scheduling.js';
import { summarize } from '../services/gamification.js';
import type { IntakeSession } from '../types.js';

/**
 * 2+ API — Hono app. Runs on Node locally and on Cloudflare Workers
 * unchanged (Hono is runtime-agnostic), which is the portability story.
 *
 * Auth: in production every route below (except webhooks) sits behind
 * Supabase JWT verification middleware — the mobile app sends the user's
 * access token; verifyAuth() resolves the user id. Stubbed for local dev.
 */

// In-memory session store for local dev. Production: sessions live in
// Postgres (intake_sessions table) keyed by user id.
const sessions = new Map<string, IntakeSession>();

export function createApp() {
  const app = new Hono();

  app.get('/health', c => c.json({ ok: true, service: 'twoplus-backend' }));

  // ── Intake ──────────────────────────────────────────────────────────
  app.post('/intake/start', async c => {
    const { userId } = z.object({ userId: z.string() }).parse(await c.req.json());
    const intake = new IntakeService(await getIntakeLLM());
    const session = intake.newSession(userId);
    const question = await intake.nextQuestion(session);
    sessions.set(userId, session);
    return c.json({ area: intake.currentArea(session), question, areaIndex: session.areaIndex });
  });

  app.post('/intake/answer', async c => {
    const { userId, answer, skip } = z.object({
      userId: z.string(), answer: z.string().default(''), skip: z.boolean().default(false),
    }).parse(await c.req.json());
    const session = sessions.get(userId);
    if (!session) return c.json({ error: 'no active session' }, 404);

    const intake = new IntakeService(await getIntakeLLM());
    if (skip) await intake.skipArea(session);
    else await intake.submitAnswer(session, answer);

    if (session.completed) {
      return c.json({ completed: true, goals: session.goals });
    }
    const question = await intake.nextQuestion(session);
    return c.json({ completed: false, area: intake.currentArea(session), question, areaIndex: session.areaIndex });
  });

  // ── Affirmations (the reveal — pre-paywall, text only) ─────────────
  app.post('/affirmations/generate', async c => {
    const { userId } = z.object({ userId: z.string() }).parse(await c.req.json());
    const session = sessions.get(userId);
    if (!session?.completed) return c.json({ error: 'intake not complete' }, 400);

    const svc = new AffirmationService(await getRewriteLLM());
    const affirmations = await svc.rewriteAll(session.goals);
    const identity = svc.identityStatements(userId);
    return c.json({ affirmations: [...affirmations, ...identity] });
  });

  // ── Scheduling ──────────────────────────────────────────────────────
  app.post('/schedule/preview', async c => {
    const body = z.object({
      plan: z.enum(['prime', 'custom']).default('prime'),
      daysSinceStart: z.number().default(0),
      customPerDay: z.number().optional(),
      windowStart: z.string().optional(),
      windowEnd: z.string().optional(),
    }).parse(await c.req.json());
    return c.json(buildPlan(body));
  });

  // ── Stats / rings ───────────────────────────────────────────────────
  app.post('/stats/summary', async c => {
    const { days } = z.object({
      days: z.array(z.object({ date: z.string(), experiences: z.number(), target: z.number() })),
    }).parse(await c.req.json());
    return c.json(summarize(days));
  });

  // ── RevenueCat webhook: trial start triggers media stage 1 ─────────
  app.post('/webhooks/revenuecat', async c => {
    // Production: verify Authorization header against REVENUECAT_WEBHOOK_SECRET.
    const event = await c.req.json() as { event?: { type?: string; app_user_id?: string } };
    const type = event.event?.type;
    const userId = event.event?.app_user_id;
    if (!type || !userId) return c.json({ ok: false }, 400);

    // INITIAL_PURCHASE with trial -> enqueue media_stage1 now, media_stage2 with run_after=+36h
    // CANCELLATION during trial -> cancel queued stage2 job (COGS protection)
    // Production writes to generation_jobs via service role; local dev just acks.
    return c.json({ ok: true, handled: type, userId });
  });

  return app;
}
