# 2+ Backend

Supabase (auth + Postgres + RLS) · Cloudflare (Workflows + Containers + R2) · portable Node worker.
Implements the architecture in `../Architecture & Cost Model.md` with the model stack from `../AI Model Comparison.md`.

## Design decisions encoded here

- **Hard paywall, staged media build.** Intake + "I am" reveal are text-only (pre-paywall, pennies). Trial start fires `media_stage1` (voice + audio + images, ~$0.45). The mind movie (`media_stage2`, ~$2.25) waits ~36h/engagement — cancellers never trigger it.
- **Adapters everywhere.** Every AI vendor sits behind an interface (`src/adapters/types.ts`) with mock + live implementations. `VIDEO_VENDOR=ltx|wan` flips the bake-off winner with zero code change. Meta media APIs slot in the same way if/when they open.
- **Orchestration is code, not LLM.** The pipeline is a deterministic sequence (Cloudflare Workflow in prod, poll-loop locally). Spark is used for conversation only.
- **BIPA enforced in code.** Voice cloning throws without verified consent (`mediaPipeline.runStage1`); `voice_profiles` tracks consent version + deletion; `TTSProvider.deleteVoice` is a required part of the interface.
- **Cost telemetry built-in.** Every generated asset records `generation_cost_usd` — real COGS per user from day one.
- **Portability escape hatch.** The worker is plain Node + Dockerfile — deploys to Cloudflare Containers or Railway/Fly unchanged. The API is Hono — runs on Node or Workers unchanged.

## Run it right now (zero accounts)

```bash
npm install
npm test          # unit tests
npm run demo      # full pipeline: intake -> I am -> stage1 -> stitched demo mp4 (needs ffmpeg for real video)
npm run dev:api   # local API on :8787
```

Demo output lands in `.media/demo/mind-movie-demo.mp4` (portrait, 7 scenes, audio) when ffmpeg is installed.

## Layout

```
supabase/migrations/   schema + RLS (profiles, goals, affirmations, media, jobs, schedules, events, entitlements, voice consent)
src/adapters/          mock + live providers (Spark, DeepSeek/Together, Fish, FLUX/fal, LTX, Wan, R2)
src/services/          intake state machine · I-am engine w/ language guardrails · staged media pipeline · ffmpeg stitch · prime-protocol scheduling · rings/streaks
src/api/               Hono app (Node + Workers) — intake, affirmations, schedule, stats, RevenueCat webhook
src/queue/             portable worker (poll loop locally; job handlers shared with the Workflow)
src/cf/                Cloudflare Workflow (durable staged build w/ retries + entitlement check)
scripts/dev-demo.ts    end-to-end demo
```

## Path to production

1. **Supabase:** create project → run `supabase/migrations/0001_init.sql` → put URL/keys in `.env`.
2. **Cloudflare:** create R2 bucket `twoplus-media` → `wrangler secret put` the vendor keys → `wrangler deploy`. (Account is already connected in Cowork — provisioning can be done from a session.)
3. **Vendors:** create Meta Model API, Together, Fish Audio, fal, LTX accounts; flip `PROVIDER_*=live` per job as keys arrive. **Verify endpoint shapes marked `VERIFY` against current vendor docs** — they drift.
4. **RevenueCat:** create app + webhook → point at `/webhooks/revenuecat` → implement the enqueue logic marked in `src/api/app.ts`.
5. **Before launch:** BIPA consent copy reviewed by attorney; Meta Model API data terms reviewed before `PROVIDER_INTAKE_LLM=live`.

## Deliberately not built yet

- Supabase repository layer (in-memory session store stands in — swap when the Supabase project exists)
- Push notification sender (APNs/FCM via Expo push — trivial once the app exists)
- v2 social feed + v3 coach marketplace (schema fields reserved: `affirmations.visibility`)
