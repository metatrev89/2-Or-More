import { getImageProvider, getStorage, getTTS, getVideoProvider } from '../adapters/index.js';
import { MediaPipeline } from '../services/mediaPipeline.js';
import type { GenerationJob } from '../types.js';

/**
 * Portable queue worker. Locally / on Railway-Fly this is a poll loop
 * against generation_jobs; on Cloudflare the same handlers are invoked
 * by the Workflow (src/cf/workflow.ts) instead — one implementation of
 * the job logic, two schedulers.
 */

export async function handleJob(job: GenerationJob): Promise<void> {
  const pipeline = new MediaPipeline(await getTTS(), await getImageProvider(), await getVideoProvider(), await getStorage());

  switch (job.type) {
    case 'media_stage1': {
      const p = job.payload as {
        affirmations: { id: string; userId: string; statement: string; isIdentity: boolean }[];
        voiceConsentVerified: boolean;
      };
      await pipeline.runStage1({
        userId: job.userId,
        affirmations: p.affirmations,
        voiceSample: null,                       // production: fetched from storage by key in payload
        voiceConsentVerified: p.voiceConsentVerified,
        referencePhoto: null,                    // production: fetched if photo_consent_at is set
      });
      break;
    }
    case 'media_stage2': {
      const p = job.payload as {
        affirmations: { id: string; userId: string; statement: string; isIdentity: boolean }[];
        imageKeys: { affirmationId: string; key: string }[];
        sceneAudioKeys: { affirmationId: string; key: string; seconds: number }[];
        fullAudioKey: string | null;
      };
      // production: load images + per-scene audio + full track from storage, then:
      await pipeline.runStage2({
        userId: job.userId,
        affirmations: p.affirmations,
        images: [],       // loaded from p.imageKeys
        sceneAudio: [],   // loaded from p.sceneAudioKeys (durations set scene lengths)
        fullAudio: null,  // loaded from p.fullAudioKey
      });
      break;
    }
    case 'regen_asset':
      // Single-asset regeneration after user edit — image or audio only; movie regens are explicit.
      break;
  }
}

/**
 * Local poll loop (not used on Cloudflare). Claims one queued job at a time:
 * UPDATE generation_jobs SET status='running', started_at=now()
 * WHERE id = (SELECT id FROM generation_jobs WHERE status='queued' AND run_after <= now()
 *             ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *;
 * Failures increment attempts and requeue with exponential backoff until max_attempts.
 */
export async function pollLoop(claimNext: () => Promise<GenerationJob | null>): Promise<void> {
  for (;;) {
    const job = await claimNext();
    if (!job) { await sleep(2000); continue; }
    try {
      await handleJob(job);
      // mark succeeded
    } catch (err) {
      // increment attempts; requeue with backoff or mark failed at max_attempts
      console.error(`job ${job.id} failed:`, err);
    }
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('2+ worker: no live queue configured in local mode. Run `npm run demo` for the end-to-end pipeline demo.');
}
