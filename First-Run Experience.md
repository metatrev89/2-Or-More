# 2+ — First-Run Experience (Download → Home)

Written spec for the v1 first-run flow, from first app open through onboarding and paywall to the home screen. Companion to the Confluence page "2+" (section 6, Golden hour 2.0 palette) and the reference mockups in this folder.

**Emotional arc of the whole flow:** arrival (calm) → opening up (trust) → transformation (the reveal — this is the magic) → commitment (schedule) → investment (paywall) → creation (the app builds your world) → ritual begins (home).

---

## 1. Cold open & welcome

The app opens to a full-bleed cream canvas (#FAF4E8) with the 2+ wordmark and one line, set in the serif voice:

> *"Wherever two or more are in agreement…"*

A short beat, then a three-screen swipe (or auto-advance) manifesto, one sentence each, no UI chrome:

1. "You carry a vision for your life. You shouldn't carry it alone."
2. "2+ turns your goals into daily affirmations — written, spoken, and seen."
3. "An intelligence that agrees with your vision, on a schedule that rewires your mind."

Design notes: this is the only screen sequence allowed to be purely brand. No feature screenshots, no carousel dots screaming "onboarding template." Ink text on cream, one gold accent (the "+" in the wordmark). A single button: **Begin** (ink pill). Below it, quiet: "Already have an account? Sign in."

## 2. Sign up

Standard mobile auth, minimal friction: Apple, Google, then email as third option. One screen. No profile-building here — no name, photo, or birthday collection; the conversation gathers what matters. The only extra element is a single line of reassurance under the buttons: "Your affirmations are private by default."

Design notes: cream canvas, white card, ink buttons. This screen should feel like a doorway, not a form.

## 3. Conversational intake (the interview)

The heart of onboarding. The AI introduces itself in one message, then interviews the user through the areas of their life: spiritual, financial, relationships/family, social, fitness/health, business. Reference mockup: intake screen (chat layout).

**Structure**

- Segmented progress bar at top, one segment per life area, teal fill (3 of 7 style). The user always knows where they are and that this ends.
- Opening AI message sets the contract: "I'm going to ask you about the life you're building. The more you share, the more powerful your affirmations become. Speak freely — voice works best."
- Per area: 2–3 questions maximum. Question one captures the goal ("What are you aiming for financially this year?"). Question two captures the why ("Why does that matter — who are you doing it for?"). Optional third goes deeper only if the user's answer invites it.
- The AI references earlier answers wherever possible ("You mentioned losing 70 pounds — that's huge. What does the finish line look like?"). This proves it's listening and is the single strongest trust-builder in the flow.
- Quick-reply chips appear on why-questions where people freeze (e.g. "My kids · Energy · Longevity · Confidence"). Tapping a chip pre-fills, doesn't send — the user can add to it.
- Starter action items: after each goal, the AI proposes 1–2 first steps conversationally ("Want me to note 'book bloodwork panel' as a starting action?"). Lightweight, skippable — 2+ is not a planner.
- Every area is skippable ("Not this session") and can be revisited later from the profile.

**Input:** the mic button is primary (teal, prominent, right of the text field); keyboard is secondary. Voice transcribes live into the chat.

**Palette use:** AI messages in white bubbles with a teal spark avatar; user messages in ink bubbles. Teal appears only on the AI's presence and the mic — nothing decorative.

## 4. The build moment (transition)

When the last area completes, a short full-screen moment on ink (#26201A): the user's own words drift as muted fragments while the AI works. Copy cycles in serif:

> "Reading your vision…" → "Finding the language…" → "Writing you in the present tense…"

Duration: as long as generation actually takes, minimum ~3 seconds so the work feels real. This is theater, but honest theater — the model genuinely is rewriting their goals. Ends with: "7 affirmations ready."

## 5. Affirmation review (the reveal)

One affirmation at a time, never a list. Reference mockup: review screen.

Each screen shows: the user's raw words small and muted at top ("YOU SAID — 'I want to make seven figures this year'"), the teal **Rewritten as I am** divider chip, then the transformed statement — large, serif, on a white card, the most beautiful text in the app:

> *"I run a profitable business that gives me a seven-figure income, delighting every client I serve."*

Actions: **Keep it** (primary ink pill), reword (teal outline, regenerates), edit (manual). A quiet "Hear it in your voice" row with a speaker icon teases the audio format — tapping it plays a short AI-voice preview and plants the seed for the paywall. Gold progress bar across the bottom (2 of 7).

By the end of review the user has approved their full affirmation set. They are maximally invested — which is exactly why the paywall comes next.

## 6. Scheduling

One screen, one decision. The app leads with a recommended plan rather than a blank cadence picker:

> **Recommended: Prime protocol** — 10× a day for your first two weeks, then 5×, settling at a steady 3× a day. Staggered from wake to wind-down. About 6 minutes of your day.

Below it, a simple customizer for the user who wants control: frequency (1×–12×/day), active window (e.g. 7am–10pm), quiet hours. Data-backed encouragement copy under the recommendation: "Repetition is how identity settles in. Small minutes, staggered right, compound."

Design notes: cream canvas; the recommended plan is a white card with gold accents (it's an achievement plan, not an AI action); a small teal note explains the AI staggers delivery automatically.

## 7. Paywall

Placement: after the reveal and scheduling, before any media is generated. The user has seen their transformed affirmations (free magic already delivered) and committed to a cadence; the paywall gates the *living* version of it.

**What subscription unlocks:** audio tracks (AI voice or record your own), photo-realistic goal images, the mind movie, scheduled delivery with quick-play notifications, and ongoing edits/regenerations.

**Layout:** ink background (the theater), affirmation fragments from *their own set* faintly visible — the paywall shows them their own vision, not stock art. White card with the offer: annual and monthly options, trial if offered, single gold **Start my practice** button. Encouraging, never scarcity-driven — no countdown timers, no red. Decline path: "Continue with text only" keeps the user in-app with their written affirmations and no scheduling — the daily usefulness gap sells the upgrade organically.

(Pricing TBD — leave as placeholder in design.)

## 8. Post-paywall: creation moment

Immediately after subscribing, one more build moment (ink screen): "Recording your affirmations… Painting your goals… Cutting your mind movie." Two interactive beats live here:

1. **Voice choice:** "Whose voice should carry your affirmations?" — AI voice (choose from 2–3) or **record your own** (guided read-through of their approved statements, ~60 seconds).
2. **Photo opt-in:** "Want to see yourself in your goals?" — camera/photo upload feeds image personalization. Skippable; images generate unpersonalized if declined.

Generation continues in background if the user proceeds — never block them from the app.

## 9. Home screen (the daily ritual)

Reference mockup: `mockup-golden-hour-2.png` (attached to Confluence page).

First-ever landing adds a one-time welcome banner: "Your practice starts now — first affirmation arrives at 12:00." Then, and every day after, the screen is:

- **Header:** date in warm gray, "Good morning, Trevor" in ink, streak pill top-right (ink pill, gold dot, count).
- **Current affirmation card** (white): "AFFIRMATION 4 OF 6" label, teal "Rewritten as I am" chip, the statement in serif, teal play button with waveform (teal = played portion, sand = remaining), mono timestamp.
- **Mind movie card** (ink "theater" block): gold movie icon, "Your mind movie," status line that shows the AI's work ("New scene generated from goal 3"), mono duration in gold.
- **Stat cards** (two-up, white): "4/6 Rings today" with teal ring segments; "92% This week" with gold daily bars. Mono numbers.
- **Bottom nav, v1:** three tabs — Home, Progress, Profile. (Social feed and Coaches tabs arrive in v2/v3; don't ship ghost tabs.)

**States:** all-rings-closed day flips the streak pill gold and fires the end-of-day encouragement notification ("You experienced your affirmations 6 of 6 times today. Way to tune into this reality."). Missed day never shames — streak pauses, copy stays warm: "Pick it back up this morning."

---

## Open questions for the Claude Design pass

- Manifesto screens: 3 swipes vs. one screen with the scripture line only.
- Intake length: hard cap total questions (~15) vs. adaptive depth per area.
- Paywall: trial vs. no trial; annual-first vs. equal billing options.
- Voice recording placement: during creation moment (spec above) vs. deferred to first player use.
- v1 nav: 3 tabs (spec above) vs. 4 with a center "+" create button.
