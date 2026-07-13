# 2+ — System Architecture & Cost Model

**Purpose:** financial planning — what it costs to get 2+ live, cost per user, and how costs scale by user tier.
**Date:** July 9, 2026. All AI pricing verified against current published rates; everything else is estimate ranges. Marked assumptions throughout — update as real usage data arrives.

---

## 1. System Architecture (v1)

```
┌─────────────────────────────────────────────────────────┐
│  MOBILE APP — React Native (Expo)                       │
│  iOS App Store + Google Play                            │
│  Onboarding chat · player · notifications · profile     │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────┐
│  BACKEND — Supabase (Postgres + Auth + Edge Functions)  │
│  Users, affirmations, schedules, entitlements, stats    │
│  Job queue for media generation (async worker)          │
└───┬──────────────┬───────────────┬──────────────────────┘
    │              │               │
┌───▼────────┐ ┌───▼──────────┐ ┌──▼───────────────────────┐
│ AI GATEWAY │ │ MEDIA STORE  │ │ SERVICES                 │
│ LLM: intake│ │ Cloudflare R2│ │ RevenueCat (IAP subs)    │
│  + rewrite │ │ + CDN (zero  │ │ APNs / FCM push (free)   │
│ TTS: audio │ │  egress fees)│ │ Sentry (crash)           │
│ Image: FLUX│ │ audio/images │ │ PostHog (analytics)      │
│ Video: Wan │ │ /mind movies │ │ Expo EAS (build/deploy)  │
└────────────┘ └──────────────┘ └──────────────────────────┘
```

**Key design decisions that control cost:**
- **Generate once, serve forever.** All media (audio, images, mind movie) is generated at onboarding/edit time, stored in R2, and served from CDN. Daily notifications replay cached media — near-zero marginal cost per daily ritual.
- **Hard paywall with auto-billing free trial.** No free tier. Users must start a free trial (7-day, auto-bills) at the paywall to get their content. Media generation (the expensive part) happens at *trial start* — so trial users who cancel still incur the media build. This is the main COGS leak in the model; §3b quantifies it and §8 lists the mitigation lever.
- **Serverless AI, no GPUs owned.** Every model runs via pay-per-call APIs (fal, Replicate, Fish Audio, DeepSeek) until volume justifies self-hosting (threshold in §5).

## 2. AI Model Stack & Unit Prices

| Job | Model / vendor | Price (verified July 2026) |
|---|---|---|
| Intake conversation | Frontier API (Claude Sonnet-class) | ~$3 in / $15 out per 1M tokens |
| "I am" rewriting, daily copy | DeepSeek V4 Flash (open) | $0.14 in / $0.28 out per 1M tokens |
| Voice clone (one-time) | Fish Audio API | $0.10 per voice |
| TTS audio | Fish Audio s2-pro | ~$15 per 1M characters |
| Goal images | FLUX.2 via fal/Replicate | ~$0.03 per image (1MP) |
| Mind movie video | Wan 2.5 I2V via fal | ~$0.05 per second of video |

Rationale: frontier model only where quality is *felt* (the intake conversation — once per user); cheap open models everywhere else. FLUX.2 supports multi-reference identity personalization (user's profile photo → them living the goal). Wan I2V animates the generated goal images into mind-movie clips.

## 3. Cost Per User (unit economics)

### 3a. Onboarding COGS — user who starts a trial (full media build)

| Item | Assumption | Cost |
|---|---|---|
| Intake conversation | ~20 turns, ~70K tokens frontier API | $0.35 |
| "I am" rewriting + identity statements | DeepSeek Flash | $0.01 |
| Voice clone | Fish Audio, one-time | $0.10 |
| Affirmation audio (~90 sec, incl. retakes) | ~1,500 chars TTS | $0.05 |
| 7 goal images + 3 regens | 10 × $0.03 FLUX.2 | $0.30 |
| Mind movie — 45 sec | Wan @ $0.05/s | $2.25 |
| Buffer (failed generations, retries ~20%) | | $0.60 |
| **Total per trial start** | | **≈ $3.65** |

### 3b. Trial funnel — blended acquisition COGS per paying subscriber

Hard paywall, 7-day free trial, auto-bills. Funnel assumptions (industry-typical for hard paywalls; replace with real data ASAP):

| Stage | Rate | Per 100 intake completers | COGS |
|---|---|---|---|
| Completes intake (costs $0.36 each) | 100% | 100 users | $36.00 |
| Starts free trial at paywall (media build $3.65 each) | 30% | 30 trials | $109.50 |
| Trial converts to paid (auto-bill sticks) | 50% | 15 paying subs | — |
| **Blended acquisition COGS per paying subscriber** | | ($36.00 + $109.50) / 15 | **≈ $9.70** |

The two leaks: intake users who never start a trial (~$0.36 each — cheap, acceptable) and **trial users who cancel (~$3.65 each — half of all trials)**. Trial cancellers are ~37% of total acquisition spend.

**Scenario — Muse Spark 1.1 intake (added July 10, 2026, pending validation):** Meta's Spark 1.1 API ($1.25/$4.25 per 1M tokens, ~4x under frontier) would run the same 70K-token intake for ~$0.12 vs $0.35. Because intake is spent on every user including non-trial-starters, blended acquisition COGS drops ~$9.70 → ~$8.20 (unstaged) or ~$6.60 → ~$5.35 (staged). Gates before adopting: (1) intake warmth feel-test vs Claude Sonnet-class — Spark's benchmark strength is tool-use, not emotional intelligence; (2) review Meta Model API data retention/training terms (API launched July 9, 2026); (3) consider user-trust optics of Meta processing intimate goal data. Note: use Spark (or any LLM) for the conversation only — the media pipeline is a fixed sequence that deterministic backend code should run, not an agentic orchestrator.

**Mitigation lever (recommended):** stage the media build across the trial. Generate audio + goal images at trial start (~$0.45); generate the mind movie on day 2–3 after an engagement signal (opened the app twice, played audio) or at first billing. Early cancellers then cost ~$0.81 instead of $3.65, cutting blended COGS per subscriber from ~$9.70 to **~$6.60** — and the day-2 mind-movie delivery doubles as a trial-retention moment ("your mind movie is ready").

### 3c. Ongoing monthly COGS — active subscriber

| Item | Assumption | Cost/mo |
|---|---|---|
| Media serving | ~80MB stored (R2, zero egress) + CDN | $0.01 |
| Push notifications | APNs/FCM | $0.00 |
| Edits/regens (audio + images) | ~4 events/mo | $0.10 |
| Mind-movie refresh | 1 per quarter, amortized | $0.75 |
| Daily/weekly encouragement copy | DeepSeek Flash | $0.01 |
| **Total per active subscriber** | | **≈ $0.87/mo** |

### 3d. Revenue per subscriber (placeholder pricing)

Assume **$12.99/mo or $69.99/yr, both with 7-day free trial, auto-billing** (blend ≈ $9.50/mo effective). App store commission at 15% (Small Business Program, under $1M/yr revenue) → **≈ $8.08/mo net**. Ongoing gross margin: ($8.08 − $0.87) / $8.08 ≈ **89%**.

Payback on acquisition COGS: at $9.70 blended (unstaged media build), a monthly subscriber pays back mid-month-two; an annual subscriber ($59.49 net, collected at first bill) pays back instantly. With the staged-build mitigation (~$6.60 blended), monthly subs pay back in month one. Pushing annual as the default plan at the paywall materially de-risks the trial model.

> At >$1M/yr store revenue, commission rises to 30% (Apple) — net drops to ~$6.65/mo; margin still ~87%. US external-payment options exist post-2025 rulings; treat as upside, not plan.

## 4. Cost Tiers by User Count

"Subscribers" = paying. Assumes 10% of downloads convert. AI variable costs from §3; fixed costs are monthly.

### Tier 0 — Build (pre-launch, $0 revenue)
| | |
|---|---|
| Fixed | Apple Dev $99/yr · Google Play $25 once · Expo EAS $99/mo · Supabase $25/mo · domain/email ~$20/mo |
| One-time | LLC + legal + compliance: $3K–$9K (see §7) · AI tooling during build (Claude Max etc.): ~$200/mo |
| **Burn** | **≈ $400–600/mo + one-time $3–9K** |

### Tier 1 — Launch: up to 1,000 subscribers (~6,700 intake completers at 15% intake→paid)
| | |
|---|---|
| Fixed | ~$250/mo (Supabase Pro, EAS, Sentry, domain; RevenueCat & PostHog free tiers) |
| Variable | Acquisition ~85 new subs/mo × $9.70 ≈ $825 · ongoing 1,000 × $0.87 ≈ $870 |
| **Total ≈ $1,950/mo** | Revenue at 1,000 subs ≈ $8,080/mo net → **break-even ~240 subscribers** (~210 with staged media build) |

### Tier 2 — Growth: 1,000–10,000 subscribers (~100K downloads)
| | |
|---|---|
| Fixed | ~$800–1,500/mo (Supabase compute upgrades, PostHog/RevenueCat paid, support tooling) |
| Variable | Acquisition ~800 new/mo × $9.70 ≈ $7.8K · ongoing 10K × $0.87 ≈ $8.7K |
| **Total ≈ $17–18K/mo** | Revenue ≈ $80K/mo net → ~78% operating margin before people costs |
| People | First hire likely: part-time support / community (~$2–4K/mo) |

### Tier 3 — Scale: 10,000–100,000 subscribers
| | |
|---|---|
| Fixed | Infra $3–8K/mo · support/ops team 2–4 people $15–30K/mo |
| Variable | At 100K subs: ongoing ≈ $87K/mo + onboarding ~8K new/mo ≈ $55K/mo on serverless |
| **Inflection point** | When sustained media-generation spend passes **~$15–20K/mo** (≈ 3–5K new subscribers/mo), dedicated GPU inference (rented H100/B200 nodes, ~$15–25K/mo for a small cluster) cuts video/image COGS 50–70%. LLM self-hosting breaks even around 50–100M tokens/mo — you hit the media threshold long before the LLM one. |
| **Total ≈ $120–180K/mo** | Revenue at 100K subs ≈ $665–808K/mo net (30% commission tier) |

### Tier 4 — 100K+ subscribers
Dedicated inference cluster + engineering team; COGS per user drops toward $0.30–0.40/mo ongoing and ~$1.50 onboarding. This is a "good problem" tier — model it when Tier 3 is real.

## 5. Self-Hosting Decision Rule

Stay serverless until **media-gen spend > ~$15–20K/mo sustained** (≈ 3–5K new subscribers/month). Then rent dedicated GPUs for video/image inference (Wan + FLUX are open-weight — no vendor lock). Keep the intake LLM on a frontier API indefinitely; it's low-volume and quality-critical. TTS moves to self-hosted Fish Speech/XTTS at the same threshold if desired.

## 6. Get-to-Live Budget (React Native app)

Two build paths:

### Path A — Founder-built with AI tooling (your current trajectory)
| Item | Cost |
|---|---|
| Claude Max + Claude Code (build assistant) | ~$200/mo × 4 mo ≈ $800 |
| Expo EAS (builds, OTA updates, store submission) | $99/mo × 4 ≈ $400 |
| Supabase, domain, misc dev services | ~$300 |
| Design (already largely done via Claude Design) | $0–1K (icon/wordmark polish) |
| Apple $99 + Google $25 | $124 |
| Legal/compliance package (§7) | $3K–9K |
| **Total cash to launch** | **≈ $5K–12K** + your time (est. 3–5 months part-time) |

### Path B — Contracted build
| Item | Cost |
|---|---|
| RN contractor/small studio — MVP of this scope (chat onboarding, media pipeline, IAP, notifications, player) | $30K–80K (US freelance → small agency; offshore can halve it, with management overhead) |
| Everything else from Path A | ~$4–10K |
| **Total** | **≈ $35K–90K**, 3–4 months |

The genuinely hard engineering is the **async media pipeline** (queue → generate 7 images + video + audio → stitch → store → notify), not the app UI. Scope that carefully in either path.

## 7. Compliance & Legal (with costs)

| Requirement | What it is | Cost |
|---|---|---|
| Business entity | LLC formation + registered agent + EIN | $150–800 + ~$150/yr |
| Terms of Service + Privacy Policy | Template service (Termly-class) or attorney-drafted | $200–500/yr (template) or $2.5–7.5K (attorney) |
| **Voice biometrics consent (BIPA)** | Voice clones = biometric identifiers under Illinois BIPA (+ TX/WA analogs). Requires explicit written consent in-app, published retention & deletion policy. **Highest legal-risk item — real litigation history. Get attorney review of this flow.** | $1.5–3K review |
| Apple/Google requirements | Privacy nutrition labels, in-app account deletion, IAP for digital subscriptions, auto-renew disclosures | $0 (build time) |
| GDPR/UK (if distributing in EU/UK) | DPAs with every AI vendor, data map, user export/delete. Simplest v1 move: launch US-first, expand deliberately | $0–3K |
| US state privacy (CCPA/CPRA etc.) | Thresholds unlikely to apply pre-scale; template policies cover disclosures | included above |
| AI content disclosure | Label AI-generated media in-app; only allow the user's *own* photo for personalization (no generating other real people) — policy + build time | $0 |
| Age rating | 13+/17+ rating; not child-directed (COPPA avoided by design) | $0 |
| FTC subscription rules | Click-to-cancel, clear renewal terms — largely satisfied by IAP flow | $0 |
| v2/v3 forward flags | Social feed → moderation + CSAM reporting obligations; coach marketplace → payments to third parties (1099s, possibly money-transmitter analysis, Stripe Connect-class infra) | budget when v2/v3 are real |
| **Compliance total to launch** | | **≈ $3K–9K one-time + ~$500/yr** |

## 8. Financial Planning Summary

- **Model:** hard paywall, no free tier; 7-day free trial that auto-bills. Funnel assumption: 30% of intake completers start a trial, 50% of trials convert → 15% intake→paid.
- **Cash to launch (founder-built):** ~$5K–12K + time. Contracted: ~$35K–90K.
- **Cost per subscriber:** ~$9.70 blended acquisition COGS (~$6.60 with staged media build) + ~$0.87/mo ongoing. Trial cancellers are the main COGS leak (~37% of acquisition spend if media is built fully at trial start).
- **Unit economics at placeholder $12.99/mo pricing:** ~$8 net/mo per sub → ~89% ongoing gross margin; monthly subs pay back in month one-to-two, annual subs instantly. Default the paywall to annual.
- **Operating break-even:** ~240 subscribers (~210 with staged build).
- **Architecture shift:** move video/image generation to dedicated GPUs at ~3–5K new subs/month; per-user COGS then drops by half or more.
- **Biggest cost levers:** (1) stage the media build across the trial — mind movie on day 2–3 after engagement, not at trial start; (2) mind-movie length/resolution (45s @ $0.05/s dominates the build; 30s cuts it ~30%); (3) trial→paid rate — every point matters more than any infra choice.
- **Biggest legal lever:** the voice-clone consent flow (BIPA). Do it right before launch, not after. (Auto-billing trials also require clear pre-trial disclosure of billing date/amount — standard IAP flows handle this.)

## Sources (pricing verified July 9, 2026)

- fal pricing (Wan $0.05/s, FLUX): https://fal.ai/pricing · https://pricepertoken.com/image
- Replicate pricing: https://checkthat.ai/brands/replicate/pricing
- Fish Audio API (TTS $15/1M bytes, $0.10/voice clone): https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits
- DeepSeek API pricing: https://api-docs.deepseek.com/quick_start/pricing/
- Self-hosting vs API break-even analysis: https://www.aipricingmaster.com/blog/self-hosting-ai-models-cost-vs-api
- App store fees: Apple Developer Program $99/yr, Google Play $25 one-time; 15% Small Business commission tier under $1M/yr.
