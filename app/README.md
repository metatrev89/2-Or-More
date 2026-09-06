# 2+ Mobile App (React Native / Expo)

Translated from the Claude Design handoff bundle (`../design-handoff/`), wired to the backend API shape in `../backend/`.
Live backend: https://twoplus-backend.trevorspencer89.workers.dev (set `EXPO_PUBLIC_API_URL` to enable live intake).

## Run it

```bash
npm install
npm run typecheck
npx expo start        # scan the QR with Expo Go on your phone
```

Runs fully offline in mock mode (`src/api/client.ts` MODE='mock') replaying the design's canned intake. Flip MODE='live' + set BASE_URL when the backend is deployed.

## What's here

- **Onboarding:** Manifesto cold open (drifting serif words) → Sign up → Email → 7-area conversational intake (voice-first, chips, photo attach, "Not this season" skip) → Build moment (ink theater) → Affirmation review (want → I am reveal, keep/reword/edit) → Scheduling (Prime protocol + custom w/ quiet hours) → **Hard paywall** ($59.99/yr / $9.99/mo, 7-day auto-billing trial — decline path removed per July 12 decision) → Creation moment (voice choice incl. own-voice recording, photo opt-in)
- **Core:** Home (tracked affirmation cards — listen/mark-as-read close rings; all-7 celebration + mood check-in), Player (audio session w/ segment celebrations + mind-movie theater w/ per-scene tracking; autoplays on entry = notification landing), Progress (daily ring, week bars, medals), Profile (personal feed + per-format privacy controls)
- **Social (full design scope):** Feed (affirm + comments, positive-only), Notifications sheet, Friends (tabs), Discover people

## Deliberate deviations from the design bundle

1. "Continue with text only" paywall decline → removed (hard paywall decision)
2. Movie scene lengths → audio-driven 3–8s (design's 9–13s kept as illustrative player timings only)
3. Simulated playback timers stand in for real audio/video until media assets flow from the backend

## Next wiring steps

1. `expo-av`/`expo-video` playback of real R2 media URLs
2. RevenueCat SDK at the paywall; push notifications (quick-play deep link -> Player)
3. Live intake via backend `/intake/*` (Spark 1.1 pending warmth test + data terms)
4. Social endpoints (backend migration 0002 has the schema)
