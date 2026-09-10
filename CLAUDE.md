# 2+ — Project Brief for Claude sessions

2+ is a mobile app (React Native/Expo, iOS + Android) for AI-driven affirmations:
conversational goal intake → present-tense "I am" statements → daily delivery as
text, audio in the user's own recorded voice (or a preset AI voice — no cloning in v1),
photo-real goal images, and a stitched "mind movie."
Named for "wherever two or more are in agreement." Owner: Trevor Spencer.

## Read these before building anything
- `UI-UX Backlog.md` — running list of polish tweaks to revisit (e.g. token streaming in intake chat). Add UX items here, don't lose them in chat.
- `First-Run Experience.md` — the product spec: full flow from first open → onboarding → paywall → home.
- `2+ Product Overview.pdf` / Confluence page "2+" (Trevor's personal space) — user stories US-1..US-25, roadmap, brand.
- `Architecture & Cost Model.md` — system design + unit economics. The staged media build and hard paywall are load-bearing business decisions, not suggestions.
- `AI Model Comparison.md` — model stack decisions and the video bake-off status.
- `backend/README.md` — the working backend (schema, adapters, API routes, CF Workflow). Run `npm run demo` in `backend/` for the end-to-end pipeline.

## Non-negotiable design rules (from the brand doc)
- Palette "Golden hour 2.0": cream #FAF4E8 canvas, ink #26201A, gold #E9B84C (achievement ONLY), teal #157A6E (AI actions ONLY — never decorative), AI tint #DFF0ED, warm gray #8A7A66, borders #E8DEC9.
- No red anywhere. Feedback is encouraging, never condemning (streaks pause, never "break").
- Serif italic = affirmation voice; sans = UI; mono = numbers/timestamps.
- Bottom nav (per final design bundle, supersedes the older 3-tab brand-doc note): Home, Feed, Progress, Friends, Profile. Each tab has its own active tint — Home ink, Feed gold, Progress teal, Friends #5C5142, Profile ink (avatar w/ ink ring). Inactive #B5A88F. Voice-first intake (mic primary).
- "Show the work": label AI output (e.g. "Rewritten as I am" chips).

## Key implementation facts
- Life areas (DECIDED Sept 5, 2026 — supersedes the original 7): chakra-mapped, root→crown, per Trevor's Meta AI reference convo (`backend/reference/meta-intake-reference.json`): health_body (Root·Foundation), emotions_creativity (Sacral·Flow), career_purpose (Solar Plexus·Drive), relationships_love (Heart·Connection), communication_expression (Throat·Voice), mindset_growth (Third Eye·Clarity), spirit_purpose (Crown·Unity). Backend `LIFE_AREAS`/`AREA_META` (types.ts) and app `AREAS`/`AREA_CHAKRAS` (theme.ts) MUST stay in the same order — areaIndex crosses the API as a number. DB migration 0003. "I AM" statement style (REWRITE_SYSTEM): 2-4 sentences, "I AM" capitalized, user's specifics kept, the WHY woven in ("I have this because…"), ends on purpose not goal.
- Backend API shape: see `backend/src/api/app.ts` (intake/answer loop, affirmations/generate, schedule/preview, stats/summary, RevenueCat webhook).
- Rings/tracking: any completed session (read / listened / watched) closes a ring — reading is a deliberate full-screen card-by-card session with per-card dwell minimums, not passive scrolling. Home list is untracked library.
- Media: every affirmation has its own scene clip + audio segment; the full mind movie is stitched from the same clips. Scene video length follows its audio duration (clamped 3–8s).
- Paywall placement: after the "I am" reveal, before media generation. 7-day auto-billing trial; mind movie generates ~day 2 of trial (engagement-gated), NOT at trial start.
- Voice (DECIDED Sept 2026): v1 has NO cloning — users either RECORD their own voice (stored media only: played back, never analyzed/feature-extracted, never sent to AI vendors) or pick a preset AI voice (Fish TTS, no user audio involved). This deletes v1's BIPA voiceprint exposure by design — do not add any voice-analysis feature without reopening legal review. Cloning is a possible v2 premium feature; its consent flow (BIPA written release, enforced in `backend/src/services/mediaPipeline.ts`) and schema stay dormant — don't route around them if it returns.

## Current status (July 13, 2026)
- Backend v0.1 built + verified (mock providers; live adapters marked VERIFY need doc checks).
- Design handoff bundle landed: `design-handoff/2-first-design-pass/project/2+ First-Run.dc.html` is the pixel source of truth.
- RN/Expo app (`app/`, **SDK 57** as of Aug 26 — tracks whatever SDK the App Store Expo Go runs; when Expo Go updates again, re-align via expo/bundledNativeModules.json) built in mock mode and iterating to match the design bundle. Ship loop: Trevor commits/pushes on his Mac → GitHub Action publishes via EAS Update → Expo Go.
- Done so far: onboarding flow, auth (incl. forgot-password, mock), Home rebuilt to design, 5-tab nav w/ design icons. Feedback arrives as batched voice notes; fix in batches.
- Gotchas learned: KeyboardAvoidingView (behavior=padding) zeroes its own paddingBottom — keep bottom padding on a parent; SafeAreaProvider must wrap the app root; sandbox can't run git (Trevor runs the commands); **expo-audio `seekTo()` is async — always `await` it before `play()` on a reused player, or every replay after the first starts at the end of the file and is silent** (fixed in `app/src/audio/sfx.ts`, Sept 9).
- July 15 EOD: STAGE 1 COMPLETE (design/mock build). All screens at design fidelity + exactness audit passed; celebration sounds shipped (963 Hz synthesized pair, expo-audio, generator in tools/, candidates preserved in sound-candidates/); session chip = daily progress report w/ auto-dismiss; intake bar celebrations + all-seven celebration + bobbing CTA arrow.
- July 20: STAGE 2 UNDERWAY — Supabase LIVE + verified on device (project created, migrations 0001/0002 run, email auth wired: signup/signin/signout/session-restore, RLS profile self-insert, mock fallback). Env: EXPO_PUBLIC_* in app/.env + GitHub Actions vars/secrets; URL must be bare https://<ref>.supabase.co. Settings screen bottom shows Live/Mock diagnostic.
- Sept 5: Backend DEPLOYED to Cloudflare Workers via dashboard Git integration (Workers Builds, repo metatrev89/2-Or-More, root /backend, deploy `npx wrangler deploy`). Live at https://twoplus-backend.trevorspencer89.workers.dev — /health + stateless intake loop verified. Providers all "mock" vars for now; media Workflow/R2/containers blocks in wrangler.toml stay commented until media-pipeline deploy. Pushes to main touching /backend now auto-build.
- Next (Stage 2 remaining): set EXPO_PUBLIC_API_URL (GitHub Variable + app/.env) → republish app → test live intake; Meta key (console: dev.meta.ai — NOT api.llama.com, that's dead; §4 capture checklist) → flip PROVIDER_INTAKE_LLM/PROVIDER_REWRITE_LLM to "live"; R2 + media pipeline → model bake-off + vendor keys → RevenueCat trial webhook → app live-mode (real playback, push→Player) + Profile settings sub-pages + live forgot-password. Stage 3 = TestFlight/production (incl. Apple/Google SSO).
