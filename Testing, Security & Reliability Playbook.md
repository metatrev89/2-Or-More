# 2+ — Testing, Security & Reliability Playbook

**Purpose:** the "invisible scaffolding" a normal engineering team gives you for free, translated into a launch runbook for a solo operator. What to set up, in what order, with the specific tools for the 2+ stack and a realistic cost for each.
**Stack it targets:** React Native/Expo (EAS), Supabase (Postgres/Auth/Edge Functions), Cloudflare (Workflows/Containers/R2), Hono API, RevenueCat.
**Date:** July 19, 2026. Prices verified against current published rates on this date — treat as "general idea," recheck before you buy.

---

## The mental model

Everything here is a *safety net under the trapeze*. On a team, **code review** catches your mistakes before they merge, **CI** catches them before they deploy, and **monitoring** catches them before your customers do. Solo, you're the only person on the trapeze — so you want the nets in the two places that matter most: **before code merges** and **after it's live in front of paying users.**

You do **not** need the full enterprise stack (SOC 2, dedicated SRE, staging parity, load/chaos testing, on-call rotations). Those exist to coordinate large teams. What you need is the high-leverage subset that catches the mistakes you'll actually make moving fast alone, plus the few things that are genuinely existential: a data breach, a payment bug, an app-breaking crash, or a BIPA compliance miss.

---

## The 10 items, in priority order

Items **1–6** are the ones I'd have in place before you take real payment. Items **7–10** make you sleep better and cost almost nothing.

### 1. CI on every pull request

**What it is:** every time you open a PR against `main`, an automated job runs your linter, type-checker, and backend tests. Turn on **branch protection** so nothing merges unless that job is green. Work in PRs even though you're solo — it's the hook everything else hangs on.

**Why it matters for 2+:** you already have a GitHub Action (the EAS Update publish loop), so you're 80% there. Adding `eslint`, `tsc --noEmit`, and `npm test` to a pre-merge check catches the "silly but shipped" class of bug mechanically, before it reaches Expo Go.

**Tools:** GitHub Actions + branch protection rules.

**Setup:** add a `.github/workflows/ci.yml` that runs lint + typecheck + `cd backend && npm test`; in repo Settings → Branches, require it to pass before merge.

> **Cost: $0.** GitHub Actions includes 2,000 free minutes/month on the Free plan (3,000 on Team). Your jobs are small; you won't get near the cap.

### 2. Supabase Row Level Security (RLS), tested

**What it is:** database policies that decide which rows each user is allowed to read/write. Without them, anyone holding your public anon key (which ships in the app) can read *every* user's data.

**Why it matters for 2+:** this is *the* classic Supabase breach and your single highest-leverage security item. Your users' goals, affirmations, and voice-clone references are intimate data — a leak here is existential, not cosmetic.

**Tools:** built into Supabase (Postgres RLS). Optionally write pgTAP tests, or a small script that hits the API as user A and asserts it can't see user B's rows.

**Setup:** enable RLS on **every** table; write an explicit policy per table (default deny, then allow `auth.uid() = user_id`); add one automated test that proves cross-user access is blocked.

> **Cost: $0.** RLS is a native Postgres/Supabase feature. (Supabase Pro at $25/mo is already in your Tier-1 budget for other reasons.)

### 3. Error tracking (crashes + backend exceptions)

**What it is:** a service that captures every app crash and every unhandled server error, with a readable stack trace, and alerts you.

**Why it matters for 2+:** this replaces "a customer emailed to say it's broken." Covers both the RN app and the Hono/Cloudflare backend in one place. Upload **source maps** so RN stack traces are readable instead of minified gibberish.

**Tools:** Sentry (already in your architecture doc).

**Setup:** add the Sentry SDK to the app and the backend; wire source-map upload into your EAS build; set an alert rule so a new or spiking error pings your phone.

> **Cost: $0 to start.** Sentry's free **Developer** tier covers 1 user and 5,000 errors/month — fine through early launch. The **Team** plan is **$26/mo** (50k errors, pay-as-you-go overage) when you outgrow free. ([sentry.io/pricing](https://sentry.io/pricing/))

### 4. RevenueCat webhook tests + server-side entitlement checks

**What it is:** automated tests around the payment/subscription flow, plus a rule that the *server* — never the app — is the source of truth for "is this user paid?"

**Why it matters for 2+:** payment bugs are the worst kind because you won't feel them by using the app yourself — they silently cost you revenue or hand paid features to non-payers. Your whole model is a hard paywall + auto-billing trial, so this flow *is* the business.

**Tools:** Jest/Vitest integration tests against your Hono routes; RevenueCat webhook + a server-side entitlement check on every gated action.

**Setup:** write integration tests for the intake→paywall→entitlement path and the RevenueCat webhook handler (trial start, conversion, cancellation, refund); assert media generation and gated screens check entitlement server-side.

> **Cost: $0.** Your own test code. RevenueCat itself is free until ~$2.5k/mo tracked revenue, then ~1% — already reflected in your cost model.

### 5. Media-pipeline monitoring (failure rate + daily spend)

**What it is:** instrumentation on the async media job queue — how many generations fail, how often they retry, and how much you're spending per day — with alerts on spikes.

**Why it matters for 2+:** your media pipeline is a literal money pump (~$3.65 per full build). A runaway retry loop or a vendor outage is simultaneously a broken experience *and* a surprise bill. This is the monitoring item most specific to your architecture, and the one generic advice would miss.

**Tools:** Cloudflare Workers analytics + logs (native), a daily-spend log/metric, and a threshold alert (reuse Sentry or Better Stack from #3/#7). Rate-limit the generate endpoints so abuse can't run up cost.

**Setup:** log every job's outcome + estimated cost; emit a daily total; alert if failure rate crosses ~10% or daily spend crosses a ceiling you set; add a per-user rate limit on generation.

> **Cost: ~$0.** Cloudflare Workers observability is included in your Workers plan; alerting piggybacks on tools you're already paying for (or their free tiers).

### 6. Staged releases + rehearsed rollback

**What it is:** ship to a small audience first, and be able to *undo* a bad release instantly.

**Why it matters for 2+:** EAS Update is your superpower here — you can push a JS bug fix, or roll one back, **without an App Store review**. That's your fastest incident lever as a solo operator. Combine with phased store rollout so a bad native build reaches 1% of users before 100%.

**Tools:** EAS Update channels (preview → production); Apple phased release + Google Play staged rollout; PostHog feature flags for kill-switches.

**Setup:** publish to a `preview` channel and smoke-test before promoting to `production`; enable phased rollout in both stores; put risky features (e.g. the media pipeline) behind a flag you can flip off without a build. **Rehearse the rollback command once** so you know it cold.

> **Cost: $0 extra.** EAS Update is part of the EAS $99/mo you've already budgeted. Store phased rollout is free. PostHog feature flags are in its free tier.

### 7. Uptime / synthetic monitoring

**What it is:** an external service that pings a health endpoint on your API on a schedule and alerts you the moment it's unreachable.

**Why it matters for 2+:** Sentry tells you about errors *inside* a running system; this tells you when the whole thing is *down* (bad deploy, expired cert, Supabase/Cloudflare incident). It's your "is it up?" alarm.

**Tools:** Better Stack (or UptimeRobot / Checkly).

**Setup:** add a lightweight `/health` route; point a monitor at it every 1–3 min; route alerts to phone/email; optionally publish a status page.

> **Cost: $0 to start.** Better Stack's free tier covers 10 monitors + 1 status page with email/Slack alerts — plenty for one API. The first paid tier is **$25/mo** (adds phone-call/SMS alerts, 30-sec checks). ([betterstack.com/pricing](https://betterstack.com/pricing)) UptimeRobot's free tier is an even cheaper equivalent.

### 8. Dependency + secret scanning

**What it is:** automated scanning for known-vulnerable npm packages and for secrets (API keys) accidentally committed to git.

**Why it matters for 2+:** supply-chain bugs and leaked keys are the breaches you'd *never* catch by hand — and you're juggling a lot of vendor keys (fal, Fish, DeepSeek, RevenueCat, Supabase). Set-and-forget.

**Tools:** Dependabot + GitHub secret scanning (native), `gitleaks` in CI, optionally Snyk or Semgrep for deeper SAST.

**Setup:** enable Dependabot alerts + security updates and secret scanning in repo settings; add a `gitleaks` step to CI; keep real secrets in EAS secrets / Supabase Vault / Cloudflare secrets — never in the bundle or git.

> **Cost: $0.** Dependabot, GitHub secret scanning, and gitleaks are free. Snyk and Semgrep both have free solo tiers if you want deeper scanning later.

### 9. One end-to-end smoke test for the critical path

**What it is:** a single automated test that drives the app through your money path — onboarding → paywall → home — on every build.

**Why it matters for 2+:** it's the cheapest possible insurance that your most important flow still works after a change. One good smoke test beats a giant brittle suite you stop maintaining.

**Tools:** Maestro (simple YAML flows, the pragmatic 2026 choice for Expo) over the heavier Detox.

**Setup:** write one Maestro flow covering first-run → intake → "I am" reveal → paywall → home; run it locally and optionally in CI on each PR.

> **Cost: $0.** Maestro is free and open-source, run locally or in your CI. (Maestro Cloud for hosted device runs is optional and later.)

### 10. AI code review on PRs

**What it is:** an automated reviewer that comments on the logic of every PR — your stand-in for the second engineer you don't have.

**Why it matters for 2+:** solo, no one else reads your diffs. An AI reviewer catches the logic slip you were too close to see, and enforces a review *habit* even when it's just you.

**Tools:** Claude Code review (you already pay for Claude), or a PR-native bot like CodeRabbit.

**Setup:** either ask Claude to review the diff before you merge (zero marginal cost), or install CodeRabbit on the repo for automatic PR comments + inline SAST.

> **Cost: $0 with Claude** (already in your ~$200/mo tooling budget). CodeRabbit is **free for open source** and has a limited free tier; **Pro is $24/mo per developer** if you want the dedicated PR bot. ([coderabbit.ai/pricing](https://www.coderabbit.ai/pricing))

---

## Cost summary

| # | Item | Free path | If/when you pay |
|---|------|-----------|-----------------|
| 1 | CI on every PR | GitHub Actions free minutes | — |
| 2 | Supabase RLS | Native, $0 | — |
| 3 | Error tracking | Sentry Developer (free) | Sentry Team **$26/mo** |
| 4 | Payment/entitlement tests | Your test code, $0 | — |
| 5 | Media-pipeline monitoring | Cloudflare native + reused alerts | — |
| 6 | Staged releases + rollback | In EAS ($99/mo already budgeted) | — |
| 7 | Uptime monitoring | Better Stack free / UptimeRobot free | Better Stack **$25/mo** |
| 8 | Dependency + secret scanning | Dependabot + gitleaks, $0 | Snyk paid (later) |
| 9 | E2E smoke test | Maestro (OSS), $0 | Maestro Cloud (later) |
| 10 | AI code review | Claude (already paying), $0 | CodeRabbit **$24/mo** |

**Bottom line:** you can run the entire launch-critical version of this list for effectively **$0/month on top of infrastructure you've already budgeted** (EAS $99, Supabase $25). As you grow and want phone-call alerts, higher error quotas, and a dedicated PR bot, the realistic add-on is roughly **$25–75/month** total — small next to your ~89% target gross margin. None of this changes your unit economics; it's cheap insurance on a business where a data leak or a silent payment bug would be far more expensive.

---

## What to deliberately skip (for now)

SOC 2 / formal compliance audits, a full staging environment with production parity, load testing and chaos engineering, Kubernetes/container orchestration beyond your Cloudflare setup, on-call rotation tooling, and large automated QA suites. These solve team-coordination and hyperscale problems you don't have yet. Adding them now is cost and drag, not safety. Revisit at Tier 2–3 (thousands of subscribers) in your cost model.

---

## Suggested rollout order

1. **This week (config, mostly free):** CI + branch protection (#1), Dependabot + secret scanning (#8), Sentry on free tier (#3).
2. **Before live payment:** RLS tested (#2), RevenueCat/entitlement tests (#4), media-pipeline spend alerts (#5), staged releases + rehearsed rollback (#6).
3. **Around launch:** uptime monitor (#7), one Maestro smoke test (#9), AI review habit on PRs (#10).
4. **As you grow:** upgrade Sentry/Better Stack off free tiers, add device-farm testing, consider a one-time third-party pen test before scaling, and revisit the "skip" list.

## Related 2+ docs

- `Architecture & Cost Model.md` — unit economics these costs slot into (Tier 0–4).
- `CLAUDE.md` — the BIPA voice-consent flow (#2/security) is flagged there as attorney-review, load-bearing.

---

*Prices current as of July 19, 2026. Sources: [Sentry pricing](https://sentry.io/pricing/), [CodeRabbit pricing](https://www.coderabbit.ai/pricing), [Better Stack pricing](https://betterstack.com/pricing).*
