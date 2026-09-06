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

## Done

- Instant client-side welcome on intake screen (Sept 5, 2026) — code-authored greeting
  renders immediately; typing dots now only cover Spark's first question.
