# 2+ (Two Plus)

AI-driven affirmations app: conversational goal intake → present-tense "I am" statements →
daily delivery as text, cloned-voice audio, and AI-generated "mind movies," with rings/streaks
gamification and a positive-only social layer. Named for *"wherever two or more are in agreement."*

**Owner:** Trevor Spencer · **Status:** v1 build in progress (July 2026)

## Repository layout

| Path | What it is |
|---|---|
| `app/` | React Native + Expo mobile app (iOS/Android). See `app/README.md` |
| `backend/` | Supabase schema + Cloudflare (Workflows/Containers/R2) media pipeline + Hono API. See `backend/README.md` |
| `design-handoff/` | Claude Design HTML prototype bundle — the design source of truth |
| `CLAUDE.md` | Project brief auto-read by Claude Code sessions |
| `*.md` docs | Architecture & cost model, AI model comparison, first-run spec, market validation |

## Quick start

```bash
# App (mock mode — no accounts needed)
cd app && npm install && npx expo start

# Backend (mock providers, runs the full media pipeline locally)
cd backend && npm install && npm test && npm run demo
```

## Key documents

- `First-Run Experience.md` — product spec for the onboarding → home flow
- `Architecture & Cost Model.md` — system design + unit economics (load-bearing business decisions)
- `AI Model Comparison.md` — model stack selection + bake-off plan
- Confluence page "2+" (Trevor's space) — user stories US-1..US-26, roadmap, design status
