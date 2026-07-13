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
- v1 bottom nav: Home, Progress, Profile only. Voice-first intake (mic primary).
- "Show the work": label AI output (e.g. "Rewritten as I am" chips).

## Key implementation facts
- Backend API shape: see `backend/src/api/app.ts` (intake/answer loop, affirmations/generate, schedule/preview, stats/summary, RevenueCat webhook).
- Rings/tracking: any completed session (read / listened / watched) closes a ring — reading is a deliberate full-screen card-by-card session with per-card dwell minimums, not passive scrolling. Home list is untracked library.
- Media: every affirmation has its own scene clip + audio segment; the full mind movie is stitched from the same clips. Scene video length follows its audio duration (clamped 3–8s).
- Paywall placement: after the "I am" reveal, before media generation. 7-day auto-billing trial; mind movie generates ~day 2 of trial (engagement-gated), NOT at trial start.
- Voice cloning requires explicit consent (BIPA) — enforced in `backend/src/services/mediaPipeline.ts`; don't route around it.

## Current status (July 10, 2026)
- Backend v0.1 built + verified (mock providers; live adapters marked VERIFY need doc checks).
- Front-end design finalized in Claude Design; handoff bundle expected in this folder.
- Next: RN/Expo app build against the design bundle + backend API; then live service wiring (Supabase, R2, vendor keys, RevenueCat).
