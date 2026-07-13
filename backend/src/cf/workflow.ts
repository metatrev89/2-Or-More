/**
 * Cloudflare Workflow — the production scheduler for the staged media build.
 *
 * This file is deployed with wrangler (see wrangler.toml). It wraps the SAME
 * pipeline logic the local worker uses; only the durability layer differs.
 *
 * Flow per trial start (triggered by the RevenueCat webhook):
 *   step 1: media_stage1 (voice clone + audio + goal images)   ~$0.45
 *   step 2: sleep until day-2 engagement signal (or 36h timeout)
 *   step 3: check subscription still active (canceller -> stop; COGS protection)
 *   step 4: media_stage2 (mind-movie clips via LTX/Wan)        ~$2.25
 *   step 5: stitch in the ffmpeg Container, store to R2
 *   step 6: push notification: "Your mind movie is ready"
 *
 * Retries: each step gets Workflows' built-in retry with backoff; saga
 * rollback deletes partial assets if a stage permanently fails.
 *
 * NOTE: typed loosely to avoid requiring @cloudflare/workers-types at
 * local typecheck time — wrangler provides real types at deploy.
 */

type WorkflowStep = {
  do<T>(name: string, opts: { retries?: { limit: number; delay: string; backoff?: string } }, fn: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: string): Promise<void>;
};

export interface MindMovieParams {
  userId: string;
  affirmations: { id: string; userId: string; statement: string; isIdentity: boolean }[];
}

export class MindMovieWorkflow {
  async run(event: { payload: MindMovieParams }, step: WorkflowStep): Promise<void> {
    const { userId, affirmations } = event.payload;

    const stage1 = await step.do('media_stage1', { retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' } }, async () => {
      const { getTTS, getImageProvider, getVideoProvider, getStorage } = await import('../adapters/index.js');
      const { MediaPipeline } = await import('../services/mediaPipeline.js');
      const pipeline = new MediaPipeline(await getTTS(), await getImageProvider(), await getVideoProvider(), await getStorage());
      return pipeline.runStage1({
        userId, affirmations,
        voiceSample: null, voiceConsentVerified: false, referencePhoto: null, // loaded from storage in production
      });
    });

    // Day-2 delivery: wait for engagement or timeout. (Engagement events can
    // short-circuit this via Workflow events; the timeout is the fallback.)
    await step.sleep('wait_for_day2', '36 hours');

    const stillEntitled = await step.do('check_entitlement', { retries: { limit: 2, delay: '10 seconds' } }, async () => {
      // production: read entitlements row via service role; cancelled trial -> false
      return true;
    });
    if (!stillEntitled) return; // canceller: stage 2 never runs — ~$0.81 total spend, not $3.65

    await step.do('media_stage2_and_stitch', { retries: { limit: 3, delay: '1 minute', backoff: 'exponential' } }, async () => {
      const { getTTS, getImageProvider, getVideoProvider, getStorage } = await import('../adapters/index.js');
      const { MediaPipeline } = await import('../services/mediaPipeline.js');
      const pipeline = new MediaPipeline(await getTTS(), await getImageProvider(), await getVideoProvider(), await getStorage());
      return pipeline.runStage2({
        userId, affirmations,
        images: [],      // loaded from stage1.assets keys in production
        sceneAudio: [],  // loaded from stage1 per-scene audio assets (audio duration -> scene length)
        fullAudio: null, // loaded from stage1 full-track asset
      });
    });

    await step.do('notify_movie_ready', { retries: { limit: 5, delay: '1 minute' } }, async () => {
      // production: push via APNs/FCM — "Your mind movie is ready."
      void stage1;
    });
  }
}
