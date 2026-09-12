# UI/UX Backlog — running list of polish tweaks

Working list of experience improvements to circle back to. Add freely; nothing here
blocks Stage 2. Owner: Trevor. Items get a date + context when added.

## Open

### 1. Token-by-token streaming in the intake chat (added Sept 5, 2026)
The 2+ chat waits for Spark's complete response, then shows it all at once behind
typing dots. Meta AI / Claude / ChatGPT stream tokens as they generate, so the reply
feels immediate even when total time is identical. Trevor: dots feel "longer than
anticipated compared to other AI chat apps."

Implementation sketch:
- Backend: request Meta API with `stream: true`, proxy SSE chunks through the Worker
  (Hono supports streaming responses).
- App: Expo SDK 57's `expo/fetch` supports streaming bodies; append chunks to the
  active AI bubble as they arrive; keep the session round-trip on completion.
- Scope: `/intake/start` + `/intake/answer` first (highest-traffic wait), reword later.
- Watch: stateless session blob still needs to return after the stream completes
  (trailer or final SSE event).

Priority: after media pipeline lands. Perceived-latency win, no cost change.

### 2. Code-author the intake goal questions (added Sept 11, 2026)
The goal question is almost entirely templated — "Area N: [Name] ([Chakra]). In the
next 12 months, what is your goal for [Name]?" Generating it with Spark costs a full
round trip (the shorter of the two message types, but still seconds) for text we
could emit instantly. Moving it client-side would make roughly **half the messages in
the conversation zero-latency** and cut per-intake token cost, leaving Spark to write
only where it earns it: the echo, the why follow-ups, the acknowledgments.

Precedent: the welcome message was moved client-side on Sept 5 for exactly this
reason and went from a 2–4s wait to instant. Same hybrid rule — structural copy =
code, conversation = AI.

Priority: highest-value remaining latency fix. The only change that makes intake
genuinely faster rather than better-disguised.

### 3. Cap `max_tokens` on Spark calls (added Sept 11, 2026)
`openAICompatChat` sets no token ceiling, so an occasionally rambling reply has no
upper bound on generation time. Free insurance, small average win.

## Done

- In-character thinking line in intake (Sept 11, 2026) — replaced the typing-dots
  bubble with staged status copy that tracks real backend work ("Taking that in…" →
  "Noting what matters to you…" → "Opening Relationships & Love…"). A goal answer is
  one step; a why answer also extracts the goal and opens the next area, so it gets
  three. Holds on the last stage rather than looping — the stages must stay tied to
  real work or it's decoration, which would break the brand's "show the work" rule.

- Instant client-side welcome on intake screen (Sept 5, 2026) — code-authored greeting
  renders immediately; typing dots now only cover Spark's first question.
