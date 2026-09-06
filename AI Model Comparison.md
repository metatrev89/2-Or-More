# 2+ — AI Model Comparison

**Purpose:** side-by-side of every serious candidate for each of the five AI jobs in 2+, so the stack is chosen deliberately. Pricing verified July 9, 2026 (all prices move — re-verify before contracts).
**Companion docs:** Architecture & Cost Model.md (unit economics assume the "recommended" column) · First-Run Experience.md (what each job powers).

---

## ★ FINAL STACK DECISION — September 2026 (supersedes tables below where they differ)

Pricing re-verified Sept 2026. Four of five jobs are **locked**; video needs one eyeball round before production spend.

| Job | LOCKED PICK | Verified price | Backup | Status |
|---|---|---|---|---|
| 1. Intake conversation | **Muse Spark 1.3, STANDARD tier only (Meta Model API)** — Trevor's Sept feel-test passed: warmth + I-am reformatting judged solid on a real intake | $1.25/$4.25 per 1M (~$0.15/user, once) | Claude Sonnet-class (~$0.35) — adapter switch, kept warm as fallback | ✅ FINAL pending ONE gate: read standard-tier data terms (no-training/retention). Contributor tier categorically banned |
| 2. Rewriting + daily copy | **DeepSeek V4 Flash via US host (Together)** | $0.22/$0.66 per 1M; still pennies/user | Qwen3-30B · (Spark here costs ~5x DeepSeek — consolidation not worth it) | ✅ FINAL |
| 3. Affirmation voice | **v1 = user RECORDING (no AI processing — stored media only) + Fish Audio s2-pro for PRESET voices (Aria/James)** — voice CLONING CUT from v1 (Trevor, Sept): recording is the better product ritual AND deletes the BIPA voiceprint regime; zero user voice data ever reaches a vendor | Presets: ~$15/1M chars; recordings: R2 storage only (~free) | ElevenLabs (presets) | ✅ FINAL — cloning deferred to v2 ("your voice, infinitely") behind attorney groundwork; consent flow/schema kept dormant. HARD RULE: recordings are played back, never analyzed — no feature extraction, ours or vendors' |
| 4. Goal images | **FLUX.2 [pro] via fal** | confirmed $0.03/image (1MP), $0.045 @1080p-class | **NEW challenger: Muse Image — dev API opened Sept 1 on fal at $0.01/image** | ✅ FINAL as primary; test Muse Image (3x cheaper) for likeness quality + people-generation policy before any switch |
| 5. Mind movies | **LTX-2.5 Fast @ 720p portrait** | $0.09/s ($4.05 per 45s); 1080p $0.13/s | **Wan 2.7 via fal — flat $0.10/s incl. 1080p ($4.50)** · **Grok Imagine (xAI, added Sept): $0.07/s @720p ≈ $3.62/45s incl. input fees, reference-to-video w/ up to 7 identity images, but 720p max + API-only + xAI policy-drift/brand risk + terms unread** · Kling 3.0 benchmark only | ⚠️ LOCKED PENDING eyeball round — now three-way (see below) |

**What changed since July:**
- **Video repriced upward ~2x at quality tiers.** July's $0.05–0.06/s figures map to 480p/older tiers. Current 45s reality: LTX-2.5 Fast $4.05 (720p) / $5.85 (1080p); Wan 2.5 $4.50 (720p) / $6.75 (1080p); **Wan 2.7 flat $0.10/s = cheapest 1080p at $4.50**; Wan 3 1080p $9.00 (out). LTX-2.3 superseded by LTX-2.5 (Fast/Pro). 480p ($2.25, Wan 3) exists as a budget lever but undercuts the photo-real promise — not recommended.
- **LTX strategic advantages held:** A2V endpoint now $0.10/s, Retake $0.10/s, portrait-native, open weights → self-host path. That plus cheapest-720p keeps LTX the favorite; Wan 2.7 wins if we want 1080p at launch or its motion beats LTX on our content.
- **Muse Image opened its developer API** (Sept 1, via fal, $0.01/image) — the July watch-list item landed. API exposes reference-image conditioning for subject consistency (the consumer-app likeness mechanism). Enters the image bake-off as challenger; FLUX.2's proven multi-reference likeness keeps primary until Muse proves identity quality AND its policy tolerates real-person likeness generation. Muse Video: still preview, no API — watch list (Trevor's consumer-app results suggest it enters the video bake-off on merit whenever it opens).
- **⚠️ Meta "Contributor tier" warning (Sept 2026):** Meta now offers discounted API tiers in exchange for TRAINING RIGHTS on prompts/outputs (seen on Spark 1.3). For 2+ — user selfies + intimate goals — any data-sharing tier is categorically disqualified. If we adopt any Meta API, standard tier only, with the no-training terms read and saved.
- DeepSeek first-party pricing rose (~$0.22/$0.66, off-peak less); job 2 cost impact per user is still ~a penny. No change.
- Fish Audio confirmed at ~$15/1M chars with cloning included in API access — slightly better than July's assumption.

**Intake decision note (Sept 2026):** Trevor personally ran the warmth feel-test via Meta AI (Spark-family) — intake conversation + I-am reformatting judged genuinely solid. Job 1 flipped to Spark 1.3 standard on that evidence (~$0.20/user cheaper as a bonus; savings apply to ALL intake completers → blended acquisition COGS ~$9.70 → ~$8.15 staged). Remaining gate before production keys: read Meta Model API standard-tier retention/training terms and archive them. First live-mode integration should A/B a handful of real intakes against the Claude adapter to confirm API behavior matches the consumer-app feel (system prompts differ from Meta AI's).

**Remaining bake-off (narrowed, ~$50, one afternoon):** (1) Video, three-way: same 45s movie on LTX-2.5 Fast, Wan 2.7, and Grok Imagine 720p (reference-to-video mode w/ user photos) — score identity/motion/portrait/artifacts; also test LTX A2V vs stitched I2V, and read xAI's retention/training terms before sending any real face. (2) Images: FLUX.2 vs Muse Image vs Qwen-Image on the 7 prompts w/ reference photos (diverse faces). Voice round optional. Jobs 1–2 need no further testing. Note: "Grok $0.50/10s @1080p" circulating via Google AI summaries is wrong — that price is 480p; Grok tops out at 720p.

**Disclosure note:** the intake pick is an Anthropic model and this recommendation was written by Claude — but it restates the July analysis, which stands on criteria (warmth, contract maturity, tiny volume) that GPT-class also satisfies; swap freely if a bake-off feel-test disagrees.

---

**Evaluation criteria used throughout:**
1. Quality for our use (not benchmarks — mind movies, warm conversation, identity likeness)
2. Cost per unit → cost per onboarded subscriber
3. License / commercial rights (open-weight vs API-only)
4. Data-control path (can we self-host later? what's retention like now?)
5. 2+-specific fit: portrait video, identity consistency, voice cloning, people-generation policy
6. Vendor risk (maturity, lock-in, policy drift)

---

## Job 1 — Conversational intake (the onboarding interview)

Highest quality bar, lowest volume (~1 conversation per user). The AI must ask emotionally intelligent follow-ups and reference earlier answers. This is also where the most sensitive text (relationships, faith, finances) flows.

| Model | Access | Open? | Price (per 1M tok in/out) | Strengths | Risks / notes |
|---|---|---|---|---|---|
| **Claude Sonnet-class** ✅ | Anthropic API | No | ~$3 / $15 | Best-in-class warmth + instruction following; mature no-training API terms, DPA, zero-retention options | API-only; cost fine at this volume |
| GPT-class | OpenAI API | No | similar | Comparable quality; same contractual maturity | Same |
| Qwen3 235B | Together/Fireworks (US hosts) | Yes (Apache 2.0) | ~$0.20–0.90 blended | Strong open flagship; self-host path | Conversational warmth below frontier; test before trusting the intake to it |
| Muse Spark 1.1 (Meta, added July 10 2026) | Meta Model API (public preview, US; $20 free credits) | No | $1.25 / $4.25 | ~4x cheaper than frontier; agentic orchestrator design (subagents, MCP, 1M context) — could also orchestrate the media pipeline | Launched July 9, 2026 — API terms (retention/training) unread; benchmark strength is tool-use, not warmth — intake needs emotional intelligence (feel-test it); Meta brand association is a user-trust consideration for intimate goal data |
| DeepSeek V4 Pro | US host only | Yes (open weights) | $1.74 / $3.48 (own API; more via US host) | Strong reasoning | **Never use api.deepseek.com for user data (China jurisdiction)** — open weights via US host only |

**Recommendation:** frontier API (Claude Sonnet-class). Quality is felt here, volume is tiny (~$0.35/user), and contract terms are the strongest available. Revisit only if COGS pressure appears where it doesn't matter.

## Job 2 — "I am" rewriting + daily copy

Commodity LLM work: structured rewriting with a good system prompt. High volume over time (daily encouragement, edits), so price matters and quality bar is moderate.

| Model | Access | Open? | Price (per 1M tok) | Strengths | Risks / notes |
|---|---|---|---|---|---|
| **DeepSeek V4 Flash via US host** ✅ | Together / Fireworks | Yes | ~$0.14 / $0.28 (+small host margin) | Cheapest capable tier; portable weights | US-host requirement (above) |
| Qwen3 8–30B | US hosts / self-host | Yes (Apache 2.0) | $0.05–0.40 | Apache license (cleanest); tiny models fine for rewriting | Slightly weaker long-context nuance |
| Llama 4 Scout | US hosts | Yes (community license) | ~$0.20–0.50 | 10M context (irrelevant here); huge ecosystem | License has conditions (fine at our scale) |
| Frontier mini models (Haiku/GPT-mini class) | APIs | No | ~$0.25–1.00 | Zero-setup, great quality | No self-host path |

**Recommendation:** DeepSeek Flash or Qwen3-30B via a US inference host — pennies either way. This is the least consequential choice in the stack; pick whichever the intake prompt-engineering ports to most cleanly.

## Job 3 — TTS + voice cloning ("hear it in your voice")

Voice = biometric data (BIPA). Data control weighs heaviest here, and 2+ needs instant cloning from a short sample.

| Model / vendor | Access | Open? | Price | Strengths | Risks / notes |
|---|---|---|---|---|---|
| **Fish Audio s2-pro** ✅ | API (Fish Speech = open sibling) | Partially (Fish Speech OSS) | ~$15/1M chars (~$0.015/1K) + $0.10/clone | Beats ElevenLabs in blind evals; cheap; open-weight self-host path via Fish Speech | Default 5-yr post-termination retention — negotiate deletion terms or self-host early |
| ElevenLabs | API only | No | $0.05–0.10/1K chars (post-May-2026 cuts); clones billed at standard rates | Best-known quality; mature consent tooling for cloning; strong enterprise terms | 3–7x Fish price; no self-host path, ever |
| Chatterbox (Resemble) | Self-host | Yes (open) | GPU time only | Emotion control, production-grade OSS | You run it (small GPU is enough) |
| XTTS-v2 (Coqui) | Self-host | Weights public, **non-commercial license (CPML)** | — | Great 6-sec cloning | **License blocks commercial use — disqualified** unless terms change |
| Kokoro | Self-host | Yes (Apache 2.0) | Near-zero (runs on CPU) | 82M params, absurdly cheap | No voice cloning — AI-voice tier only |
| OpenAI TTS | API | No | ~$15/1M chars | Simple, cheap | No cloning — disqualified for the signature feature |

**Recommendation:** Fish Audio API at launch *with negotiated retention terms*, self-hosted Fish Speech or Chatterbox as the early migration (TTS needs only a small GPU — this can move in-house long before video does, killing most of the BIPA vendor exposure). ElevenLabs is the fallback if Fish quality disappoints in the bake-off.

## Job 4 — Goal images (photo-realistic, user's own likeness)

The job: 7 photoreal images per user, personalized with their photo. Identity consistency and people-generation policy are the differentiators.

| Model | Access | Open? | Price | Strengths | Risks / notes |
|---|---|---|---|---|---|
| **FLUX.2** ✅ | fal / Replicate / BFL API; some variants self-hostable | Variant-dependent (dev = restricted, pro/klein differ) | ~$0.03/MP image | **Multi-reference identity: up to 10 reference photos for consistent likeness** — exactly US-17 | **Check license per variant before committing**; identity quality needs testing with diverse users |
| Qwen-Image | US hosts / self-host | Yes (Apache 2.0) | ~$0.02–0.04 | Cleanest license; strong photorealism + text rendering | Weaker identity-reference tooling |
| SDXL/SD3.5 fine-tune + per-user LoRA | Self-host | Yes | GPU time (~$0.50–2/user training) | Maximum identity fidelity | Per-user training cost + pipeline complexity — v2 optimization, not v1 |
| gpt-image / Imagen (commercial) | APIs | No | ~$0.02–0.19 | Excellent quality | **Photorealistic real-people generation sits in their restricted-policy zone — your core feature at their discretion.** Disqualifying risk |

**Recommendation:** FLUX.2 via fal (with license check on the exact variant), Qwen-Image as fallback. Commercial APIs are the wrong risk profile for this specific feature regardless of quality.

## Job 5 — Mind movies (video) — THE decision

Dominates onboarding COGS ($2.25 of $3.65). All prices at ~1080p; "45s movie" = cost per full mind movie.

| Model | Access | Open? | $/sec | 45s movie | Strengths | Risks / notes |
|---|---|---|---|---|---|---|
| **LTX-2.3 Fast (Lightricks)** ✅ | API + open weights + on-prem commercial license | Yes | $0.06 | $2.70 | **Native portrait** · **Audio-to-Video endpoint ($0.10/s): affirmation audio + image → synced scene** · Retake endpoint fixes segments, not whole videos · LTX Trainer = per-identity LoRA path · same model API→self-host · Lightricks = decade-old company | Fast-tier quality vs Wan needs bake-off; ~20s/request (fine, we stitch) |
| LTX-2.3 Pro | same | Yes | $0.08 | $3.60 | Higher fidelity tier of the above | |
| **Wan 2.5 (Alibaba)** ✅ | fal (2.5 API); Wan 2.2 = open weights (Apache 2.0) | 2.2 yes / 2.5 API-first | $0.05 | $2.25 | Cheapest quality tier; unified T2V/I2V; 2.2 self-hostable | 2.5 not (yet) open — self-host path is 2.2; landscape-leaning |
| Wan direct via Alibaba Cloud Model Studio | Alibaba Cloud International (region-selectable: US/SG/EU) | same as above | direct pricing, typically ≤ third-party hosts | — | First-party: newest Wan versions first, synced audio+video; **free trial: 50 sec of 1080p per model** (use in bake-off) | Chinese parent-company jurisdiction (softer than api.deepseek.com, but user photos/goals flow through it — prefer US host for production); enterprise-cloud integration overhead |
| HunyuanVideo (Tencent) | Open weights via hosts | Yes | ~$0.07–0.25 (host-dependent) | $3–11 | 13B cinematic; 15s clips with audio; Avatar variant for identity-anchored animation | Hosting price varies wildly; heavier to self-host |
| SkyReels V1 | Open weights | Yes | host-dependent | ~$3–8 | Human-centric motion (people doing things — relevant!) | Smaller ecosystem |
| Kling 3.0 | API only | No | $0.10 | $4.50 | Best quality-per-dollar of the closed models | No self-host path; China-based (Kuaishou) — same jurisdiction concern as DeepSeek for user photos |
| Seedance 2.0 (ByteDance) via Kinovi | API (Kinovi, $17.99 min pack; 200 free credits ≈ one 5s clip) | No | $0.071 | $3.20 | "Omni-Reference" generation (text + image + audio references) — potentially relevant to identity consistency; cinematic 4–15s clips | ByteDance parent — same jurisdiction concern as Kling for user photos; pricier than LTX/Wan; small host |
| Runway Gen-4.5 | API only | No | $0.15 | $6.75 | Best creative-control tooling | 3x cost, no control path |
| Pika 2.2/2.5 | No first-party API — via fal, per-second | No | ~$0.045/clip-sec (≈$0.45 per 10s 1080p clip) | ~$4–5 est. | Fun creative-effects toolkit (Pikaffects, Pikaswaps); good aspect-ratio range incl. 9:16 | Genre skews playful/stylized social content, not photoreal cinematic; closed weights; costs scale unpredictably — outclassed by Kling on realism and LTX/Wan on economics |
| Veo 3.1 (Google) | API only | No | $0.15 (fast+audio) – $0.75 (standard 4K) | $6.75–33.75 | Best realism + lip-sync on the market | 3–15x cost; people-generation policy risk; total lock-in |

**Recommendation:** bake-off between **LTX-2.3 (Fast and Pro) and Wan 2.5**, with Kling 3.0 as the closed-model quality benchmark. LTX enters as the strategic favorite: same cost class as Wan, but native portrait, the A2V endpoint (nearly our whole pipeline in one call), Retake (cuts the 20% retry buffer), a trainable identity path, and one vendor from API to owned weights. Wan wins if its motion quality is clearly better on our content.

---

## Recommended stack (pre-bake-off)

| Job | Primary | Backup | Self-host path |
|---|---|---|---|
| Intake conversation | Claude Sonnet-class API | GPT-class | None needed (stays API) |
| Rewriting + daily copy | DeepSeek Flash via US host | Qwen3-30B | Yes — trivial |
| TTS + voice clone | Fish Audio API | ElevenLabs | Fish Speech / Chatterbox (early — kills BIPA vendor exposure) |
| Goal images | FLUX.2 via fal | Qwen-Image | Yes (license-dependent variant) |
| Mind movies | LTX-2.3 ⚔ Wan 2.5 (bake-off) | Kling 3.0 (quality benchmark) | LTX on-prem license or Wan 2.2 weights |

## Evaluated — not pipeline candidates

| Tool | What it is | Why it's not in the stack | Useful for |
|---|---|---|---|
| **DaVinci (davinci.ai)** | Consumer AI art/video app aggregating 50+ third-party models (Sora, Veo, Kling, FLUX, Ideogram, Seedream…) behind subscription tiers | No developer API — the 2+ backend can't call it; it's a storefront for models, not a model supplier. Also a useful reminder: 2+ competes for attention with slick consumer AI-media apps | **Bake-off playground:** one cheap subscription = hands-on side-by-side quality testing of Kling/FLUX/Veo on our actual prompts before spending API dollars |
| **Shotstack** | Video *assembly* API (stitching clips, audio overlay, captions, rendering) with a free developer sandbox | Doesn't generate video — it edits/combines it. Our stitching step (clips + affirmation audio → final mind movie) defaults to self-hosted ffmpeg (free); Shotstack is the managed alternative if the ffmpeg pipeline becomes a maintenance burden | Pipeline utility candidate for the stitch/overlay step — keep bookmarked |
| **Tavus** | Conversational-video / talking-avatar API (free tier: 25 min conversational + 5 min generation per month) | Wrong genre for mind movies — it animates talking heads and video agents, not cinematic goal scenes | Interesting for a possible v3 feature: an AI or coach *avatar* that speaks affirmations to the user. Parked |
| **Eden AI / Kie.ai** | API aggregators routing to many video models (Kling via Eden; 30+ models via Kie), with free playgrounds/tiers | Aggregators add a middleman markup and another data processor between users and models — for production we contract hosts directly (fal, LTX) | Free playgrounds widen the bake-off cheaply; Eden is a workable access path to Kling for the benchmark round |
| **GeminiGen (geminigen.ai)** | Consumer front-end reselling access to Veo 3.1 / Sora 2 / Imagen with "free unlimited" marketing (actually credit-based per community reports) | Not a model or a real infrastructure vendor — a reseller storefront. "Free unlimited Veo" claims don't survive contact with reality; routing user photos/goals through a third-party reseller of someone else's models is the worst possible privacy posture | Nothing for the pipeline. At most, another consumer playground — but DaVinci covers that role with a more established operator |
| **Meta Muse Image / Muse Video / Audiobox-Voicebox** (watch list, checked July 10 2026) | Muse Image: live July 7 2026 but consumer-only (Meta AI/Instagram/WhatsApp) — **no public API**, Meta "still evaluating" developer access. Muse Video: announced, "coming soon," no API. Audiobox/Voicebox: research models, no API | Can't be called from a backend today — only Spark 1.1 has a developer API. Any cost model quoting per-image/per-second prices for these is speculative | **Watch list:** if Meta opens APIs (likely, given the Spark paid-API pivot under Wang), Muse Image enters the Job 4 bake-off and Muse Video the Job 5 bake-off on merit. Architecture is adapter-based, so swapping in later is an endpoint change |

## Bake-off plan (do this before writing pipeline code)

1. **Fixed test set:** Trevor's real intake — 7 goals, 7 "I am" statements, 7 goal images generated from his profile photo, one 45s affirmation audio track. Same inputs for every model.
2. **Video round:** build the same 45s mind movie on LTX-2.3 Fast, LTX-2.3 Pro, Wan 2.5, and Kling 3.0 (benchmark). Score 1–5 on: identity consistency, motion realism, portrait framing, artifact rate, generation time, actual cost. Also test LTX A2V (audio-driven) vs stitched I2V clips. Free-cost shortcut: Alibaba Cloud Model Studio's trial quota (50 sec 1080p per model) covers the Wan runs; a DaVinci subscription covers eyeball tests of Kling/Veo.
3. **Image round:** FLUX.2 vs Qwen-Image on the 7 prompts with reference photo. Score likeness, photorealism, prompt adherence. Repeat with 2–3 friends' photos (diverse faces — likeness quality must hold for everyone, not just one face).
4. **Voice round:** clone from a 30s sample on Fish Audio and ElevenLabs; generate the same affirmation read; blind-listen with 3–5 people.
5. **Decision gate:** winner per job goes into the Architecture & Cost doc §2 table; loser recorded here as the tested backup. Estimated bake-off spend: **under $100 total.**

## Sources (verified July 9, 2026)

- LTX API pricing & platform: https://ltx.io/model/api/pricing · https://ltx.io/ (open weights: huggingface.co/Lightricks/LTX-2.3)
- fal pricing (Wan, FLUX): https://fal.ai/pricing · https://pricepertoken.com/image
- Commercial video pricing (Veo/Kling/Runway): https://www.buildmvpfast.com/api-costs/ai-video · https://crazyrouter.com/en/blog/ai-video-generation-api-pricing-comparison-2026 · https://docs.dev.runwayml.com/guides/pricing/
- ElevenLabs pricing (post-May-2026 cuts): https://elevenlabs.io/pricing/api · https://texttolab.com/blog/elevenlabs-pricing
- Fish Audio pricing & retention: https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits · https://fish.audio/privacy/
- DeepSeek/Qwen token pricing: https://api-docs.deepseek.com/quick_start/pricing/ · https://pricepertoken.com/pricing-page/provider/qwen
- Open-source model landscape: https://www.bentoml.com/blog/navigating-the-world-of-open-source-large-language-models · https://www.hyperstack.cloud/blog/case-study/best-open-source-video-generation-models
