# 2+ — Project Brief for Claude sessions

2+ is a mobile app (React Native/Expo, iOS + Android) for AI-driven affirmations:
conversational goal intake → present-tense "I am" statements → daily delivery as
text, cloned-voice audio, photo-real goal images, and a stitched "mind movie."
Named for "wherever two or more are in agreement." Owner: Trevor Spencer.

## Read these before building anything
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
- Backend API shape: see `backend/src/api/app.ts` (intake/answer loop, affirmations/generate, schedule/preview, stats/summary, RevenueCat webhook).
- Rings/tracking: any completed session (read / listened / watched) closes a ring — reading is a deliberate full-screen card-by-card session with per-card dwell minimums, not passive scrolling. Home list is untracked library.
- Media: every affirmation has its own scene clip + audio segment; the full mind movie is stitched from the same clips. Scene video length follows its audio duration (clamped 3–8s).
- Paywall placement: after the "I am" reveal, before media generation. 7-day auto-billing trial; mind movie generates ~day 2 of trial (engagement-gated), NOT at trial start.
- Voice cloning requires explicit consent (BIPA) — enforced in `backend/src/services/mediaPipeline.ts`; don't route around it.

## Current status (July 13, 2026)
- Backend v0.1 built + verified (mock providers; live adapters marked VERIFY need doc checks).
- Design handoff bundle landed: `design-handoff/2-first-design-pass/project/2+ First-Run.dc.html` is the pixel source of truth.
- RN/Expo app (`app/`, SDK 54 — do NOT upgrade; App Store Expo Go only runs 54) built in mock mode and iterating to match the design bundle. Ship loop: Trevor commits/pushes on his Mac → GitHub Action publishes via EAS Update → Expo Go.
- Done so far: onboarding flow, auth (incl. forgot-password, mock), Home rebuilt to design, 5-tab nav w/ design icons. Feedback arrives as batched voice notes; fix in batches.
- Gotchas learned: KeyboardAvoidingView (behavior=padding) zeroes its own paddingBottom — keep bottom padding on a parent; SafeAreaProvider must wrap the app root; sandbox can't run git (Trevor runs the commands).
- July 15 EOD: STAGE 1 COMPLETE (design/mock build). All screens at design fidelity + exactness audit passed; celebration sounds shipped (963 Hz synthesized pair, expo-audio, generator in tools/, candidates preserved in sound-candidates/); session chip = daily progress report w/ auto-dismiss; intake bar celebrations + all-seven celebration + bobbing CTA arrow.
- Next (Stage 2 — live wiring, starting with Supabase): Trevor creates the Supabase project + keys → run migrations 0001/0002, RLS, real auth in app → R2 + backend deploy → model bake-off + vendor keys → RevenueCat trial webhook → app live-mode (swap mock adapters, real playback, push→Player) + Profile settings sub-pages. Stage 3 = TestFlight/production.
