/**
 * Cloudflare Worker entry — Stage 2 API deploy (intake + affirmations +
 * scheduling + stats + webhook). Hono's fetch handler runs unchanged.
 *
 * The media Workflow (MindMovieWorkflow) and its R2/container bindings are
 * deliberately NOT wired yet — they join at the media-pipeline deploy step
 * (re-enable the blocks in wrangler.toml and export the class here).
 *
 * process.env: populated from wrangler vars/secrets (nodejs_compat +
 * compatibility_date ≥ 2025 behavior), which is what src/config.ts reads.
 */
import { createApp } from '../api/app.js';

const app = createApp();

export default {
  fetch: app.fetch,
};
