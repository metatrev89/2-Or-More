# Meta Model API — Data Terms Review (for the Spark intake decision)

**Reviewed:** September 2026 · **Reviewer:** Claude session w/ Trevor · **Status: CONDITIONALLY CLEARED for beta** pending account-level verification (checklist below).
**Context:** Job 1 (intake conversation) flipped to Muse Spark 1.3 STANDARD tier after Trevor's warmth feel-test. The intake carries 2+'s most sensitive text — faith, family, finances, relationships. This doc is the archived terms-gate the AI Model Comparison doc requires.
**Caveat:** compiled from Meta's public materials + credible secondary reporting; the authoritative contract text requires a signed-in developer account, and none of this is legal advice — attorney review is already on the pre-launch list (with BIPA).

## 1. What is verifiable today

| Question | Finding | Confidence |
|---|---|---|
| Does standard tier train on our data? | **No** — standard tier ($1.25/$4.25) prompts/outputs are NOT used for training | High (multiple independent reports) |
| Does Contributor tier train on our data? | **Yes — that's the deal.** 12–21x discount ($0.10/$0.20) in exchange for training rights | High |
| How is the tier selected? | ⚠️ **Via the model ID string** (`muse-spark-1.3` vs `muse-spark-1.3-contributor`). Training consent is invisible to DLP tools/API gateways — one wrong string silently flips the tier | High (TechTimes, Sept 4 2026) |
| Does Meta retain standard-tier data? | **Yes.** No-training ≠ no-retention; Meta stores standard-tier prompts/outputs. Retention PERIOD not publicly documented | Medium-high |
| Deletion process / audit controls / ZDR option? | **Not publicly documented** — no unauthenticated page spells out retention length, deletion, regional eligibility, or audits | High (that it's undocumented) |
| Jurisdiction | US company, US processing (unlike the api.deepseek.com concern) | High |
| DPA availability | Unknown at preview; Meta's general Platform Terms §3(d)(i) impose user-deletion obligations on developers, which we inherit regardless | Low-medium |
| Clause map (per Meta AI, Sept — verify in console) | No-training for Standard Services = **ToS §5.1**; Discounted Services train-by-default = **§6.1** (content "disassociated from account/key"); retention = **§4.4** (no public number); official line: "The official Llama API does not use your prompts or model responses to train Meta AI models"; encryption at rest + in transit claimed | Medium until captured |
| "Improve services" license scope | **Open** — rights to use content for service improvement/human review/safety may exist independent of training; capture + attorney flag (checklist §4) | Unknown |

## 2. Verdict against 2+'s requirements

- **No-training (hard requirement):** ✅ met on standard tier — but only as long as every request provably uses the standard model string.
- **Retention (want: short/zero):** ❓ unresolved. This is the open risk: intimate conversations sitting in Meta storage for an unknown period. Anthropic/OpenAI offer ZDR contracts; Meta preview-era equivalent unknown.
- **Practical posture:** acceptable for **beta** with the §3 guardrails; **retention answer required before public launch.** If account-level docs reveal long/no-delete retention, either negotiate, or flip intake back to the Claude adapter (config change) where ZDR terms are mature.

## 3. Engineering guardrails (adopted now, regardless of terms outcome)

1. **Model-ID allowlist in the Spark adapter** — requests hard-fail if the model string isn't exactly the approved standard-tier ID; anything containing `contributor` throws. (Implemented in `backend/src/adapters` — see MUSE_ALLOWED_MODELS.)
2. **Log the model string on every LLM request** so tier compliance is auditable from our side.
3. **Data minimization in the intake prompt:** send first name only, never email/user-id; goals text is inherently sensitive and is the product — but identifiers don't need to ride along.
4. **Terms snapshot:** when the developer account is created, export/PDF the data-usage terms as shown in-console and commit alongside this doc.
5. **Claude adapter stays warm** as the no-code-change fallback (mature ZDR path) if Meta terms disappoint.

## 4. Trevor's console checklist (at API-key creation)

**Updated Sept 2026 with clause-level targets, per guidance obtained from Meta's own assistant (verify everything against the actual console — the assistant's claims are a map, not evidence). Console: **https://dev.meta.ai** (docs at dev.meta.ai/docs; linked from developer.meta.com → Model API). Earlier api.llama.com / llama.developer.meta.com references were the pre-rebrand console and no longer resolve. API base: https://api.meta.ai/v1 (already the backend default). ToS terminology: "Standard Services" (no training) vs "Discounted Services" (training by default) — the latter is what reporting calls the Contributor tier.**

- [ ] **No-training evidence:** Console → Docs → Legal → ToS; screenshot **§5.1** ("Meta will not use Content from Standard Services to train Meta Models") + the Privacy/Data Use page, URL bar visible. PDF both.
- [ ] **Tier + model ID proof:** Dashboard → Project Settings/Billing — screenshot showing **Standard Services** (NOT Discounted); copy the **exact model ID string** from the dashboard/playground. → Then update `MUSE_ALLOWED_MODELS` in `backend/src/adapters/live/llm.ts` to that exact verified string (the guard hard-fails unknown strings until we do — by design).
- [ ] **Retention:** screenshot **ToS §4.4** verbatim — note the exact number of days for Standard-tier prompts/outputs. Also check Docs → Data Handling / Abuse Monitoring for trust-&-safety retention language (~30-day claims circulate; verify). Find the deletion-request mechanism (Privacy Policy footer form/email + console Privacy → Data Controls).
- [ ] **DPA:** llama.com → Legal → Data Processing Addendum + console Settings → Legal. Screenshot the *eligibility* clause — specifically whether preview/free accounts can execute it or if it's paid/Enterprise-only.
- [ ] **ZDR / reduced retention:** search docs for "Zero Data Retention" / "reduced retention" / "enterprise privacy." If absent, record: "No ZDR option found in Standard console as of [date] — Enterprise contact required."
- [ ] **⚠️ "Improve services" license (attorney flag):** ToS → License to Content / Service Improvement / Feedback clauses. Even with training off, wording like "improve services," "develop new products," "human review," "safety systems," "analytics" grants rights beyond training — highlight every instance for the attorney and for our privacy-policy disclosures.
- [ ] Never include the API key in any screenshot.

**Deliverable:** PDFs/screenshots of §4.4, §5.1, §6.1, Privacy page, tier dashboard, DPA eligibility, ZDR result, highlighted improve-services clauses → commit to the repo next to this doc (e.g. `legal/meta-terms-capture-[date]/`). §4.4 + §5.1 verbatim text pasted back to Claude → attorney-ready summary + user-facing privacy-policy language drafted from it.
