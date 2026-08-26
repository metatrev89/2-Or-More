# 2+ Crowdfunding Campaign — Reverse-Outline & Content Organizer

*Built from a teardown of the High Boy Indiegogo/Kickstarter campaign (raised ~$606K on a $7K goal — 8,660% funded, 4,550+ backers, 80+ countries). Part 1 maps exactly how that page is built. Part 2 is your fill-in plan for 2+, with a suggested draft under every section.*

**Two assumptions I made (change either any time):**
1. **Depth:** You get the skeleton *plus* a suggested draft under each section — accept, edit, or ignore.
2. **Perk model:** Built primarily around **founding-member / lifetime** offers (these convert far better on Indiegogo than recurring billing, which the platform handles poorly). Your original "prepaid discounted subscription" idea is included as an alternative under each tier.

**One strategic flag before you read on:** High Boy sells a physical object once. 2+ is a subscription app. That changes three things on a crowdfunding page — (a) your "perks" become *access rights and status*, not a boxed product; (b) your "specs" become *screenshots, demos, and outcomes*, not chips and radios; (c) your biggest trust obstacle isn't "will it ship?" but "will this actually change how I feel/live, and will the app still exist in a year?" Part 2 is written to answer those.

---

# PART 1 — How the High Boy campaign is built (reverse-outline)

## 1.1 Results snapshot (the proof it's worth copying)

| Metric | Value |
|---|---|
| Raised | ~$606,000 |
| Goal | $7,000 (deliberately tiny — see note) |
| % funded | 8,660% |
| Backers | 4,550+ |
| Duration | 45 days (Nov 17, 2025 – Jan 1, 2026) |
| Reach | 80+ countries |
| Community before launch | 20,000+ (Instagram ~20K, Discord ~2,900) |
| Updates during campaign | 29 |
| Comments | 439 |

**Note on the tiny goal:** They set a $7,000 goal they knew they'd smash. This is a deliberate tactic — hitting "100% funded" in hours creates a "FUNDED" badge and momentum story ("8,660% funded!") that becomes its own marketing. Set your 2+ goal to something you are certain to clear in the first day.

## 1.2 Page anatomy — the fixed nav sections (in order)

Every Indiegogo/Kickstarter campaign has the same top-level tabs. High Boy's:

1. **Description** (the main story — the long scrolling pitch; this is where 90% of the work goes)
2. **Rewards / Perks** (the tiers, shown in a right-hand rail on desktop and inline on mobile)
3. **Creator** (who's behind it)
4. **FAQ**
5. **Updates** (29 posts — momentum + "we're alive" signal)
6. **Comments** (439 — social proof + support)
7. **Community / Backers**

## 1.3 The Description story — narrative arc (in scroll order, from the live Indiegogo page)

This is the reverse-outline of the *content* itself — the exact structure of High Boy's actual Indiegogo pitch, top to bottom, and what each block does. Note how much of it is **image-based feature graphics**, not paragraphs.

1. **Hero: headline + subtitle + video.** Headline: *"High Boy: For Security Researchers, Makers, and the Curious."* Subtitle (verbatim): *"Over $600K raised on Kickstarter! Due to massive demand, High Boy is now on Indiegogo. It's an open-source, pocket-sized hardware platform built for security researchers, makers, and students. Packed with Wi-Fi 6, LoRa, Sub-GHz, NFC, and more… Join 25,000+ members and back yours now!"* A 3D-render pitch video sits directly below. → *Job: what it is + who it's for + instant proof (the $600K) in one breath.*
2. **The problem, stated as pain + stakes.** Opens *"Five tools. One job."* — you carry five separate devices, five batteries, five configs, just to audit one environment. Then a stat block for stakes: *"21 billion connected IoT devices… automated attacks probe networks ~820,000 times a day… one in three breaches now involves an unmanaged IoT endpoint."* → *Job: name the pain, then raise the stakes with hard numbers.*
3. **The solution / origin combined — "Meet High Boy: A Generational Leap."** Frames itself as *"a globally distributed open-source collective born out of a shared frustration,"* founded by *"tech students who got tired of closed ecosystems, overpriced proprietary modules, and clunky workarounds."* → *Job: the one big idea + a David-vs-Goliath origin in one move.*
4. **Four proof pillars (each its own block):** *Dual-MCU Brain* (the architecture), *Seven wireless technologies* (Wi-Fi 6, BLE 5.3, Sub-GHz, NFC, RFID, IR + LoRa on-board), *Radical Open-Source Integrity* (*"Security without transparency is just trust"* — auditable on GitHub), *Community Driven* ($600K raised, 4,600+ backers, 80+ countries, 20,000+ members). → *Job: three product reasons + one social-proof reason, each headline-sized.*
5. **Feature showcase — full-width graphic blocks.** Big image panels like *"FULLY COMPATIBLE WITH FLIPPER ZERO MODULES"* with a short "Specs list" of bullet benefits (compatibility, protects your investment, ESD protection). One capability per screen, mostly as designed graphics. → *Job: scannable, beautiful, one reason-to-want per panel.*
6. **Comparison / positioning (vs. Flipper Zero).** Compatibility and "what we add" framed against the category leader. → *Job: borrow the incumbent's context; win on the diff.*
7. **Technical specs + open-source + team + community** continue down the page as further graphic blocks and named team/socials. → *Job: satisfy skeptics, humanize, show the movement.*
8. **Perks/Rewards rail + sticky "BACK THIS PROJECT."** Always-visible CTA in the header; the reward ladder + an **Add-ons** shelf (see 1.4). → *Job: convert, at every scroll depth.*

**The takeaway for you:** the page is ~80% designed image panels, ~20% text. The *words* do the hook (problem → stakes → big idea → four pillars); the *graphics* do the features. Plan your 2+ page the same way — a tight written spine, then beautiful screen/feature panels.

## 1.4 Perk / reward tiers — the EXACT Indiegogo ladder

Here are High Boy's actual live Indiegogo perks. Notice the pattern: **good → better → best → everything → team**, all anchored against a struck-through retail price, all shipping the same month.

| Tier | Price | Retail (struck) | Discount | What's included | Delivery |
|---|---|---|---|---|---|
| **Super Early Bird** | $179 | ~~$249~~ | ~28% | The device — "the ultimate open-source pocket lab. 7 native wireless technologies + Dual-MCU." | Feb 2027 |
| **Field Kit** | $229 | ~~$292.50~~ | ~22% | Device fully protected + field-ready (case/protection). | Feb 2027 |
| **Pro Kit (Pro Bundle)** | $249 | ~~$312~~ | "$63 OFF" | Device + GPS module + NRF24 module + proto-board + 2 NFC/RFID tags. | Feb 2027 |
| **Supreme Tool Kit** | $289 | ~~$355.50~~ | "$66 OFF" | Device + *every* official module and accessory. | Feb 2027 |
| **Squad** | $699 | ~~$1,000~~ | "$300 OFF" | **Four** devices — for a team, lab, or study group. | Feb 2027 |

Below the tiers sits an **"Add-ons"** shelf — individual à-la-carte modules (GPS, proto-board, LoRa/antenna) with "ADD ON" buttons, one tagged **"FEATURED."** Backers pick a base tier, then pile on add-ons.

**Persuasion devices baked into every card (copy these mechanics):**
- **Price anchoring** — the real price shown struck-through next to the deal price, plus a bold **"$X OFF"** badge on the tier art.
- **"Lowest price in last 30 days"** shown under each price (EU pricing-compliance, doubles as a trust cue).
- **Monthly financing** — *"Get it for $35.80/month"* (StretchPay) lowers the commitment barrier.
- **Identity-named tiers** — "Field Kit / Pro Kit / Supreme / Squad" let a buyer pick the version of *themselves*, not just a price.
- **One clear delivery date** on every tier (Feb 2027) — removes ambiguity.
- **Sticky "BACK THIS PROJECT"** button pinned in the header at all times.

The tier *template* to reuse: **name · deal price · struck retail · "$X OFF" · what's included · delivery date · (quantity, if limited).**

## 1.5 Media & asset inventory (what you'll need to produce)

- 1 hero **pitch video** (60–120s) at the top — the single highest-leverage asset.
- 1 hero **product/hero image** (bright, high-res).
- **Per-feature visuals** — an icon or short animation/GIF for each capability block.
- A **comparison table** (you vs. status quo).
- A **spec/facts table**.
- **Team headshots.**
- **Press/"featured in" logos.**
- **Backer/community screenshots** (follower counts, Discord activity).
- Reward-tier **thumbnail images**.

## 1.6 Urgency, CTA & trust devices (the persuasion layer)

- **Urgency:** limited early-bird quantities ("X of 500 left"), countdown timer, stretch-goal thermometer, "back before price goes up."
- **CTA repetition:** "Back this project" appears in the sticky header, after the hero, and again at the bottom.
- **Trust stack:** named team + photos, manufacturing transparency, open-source proof, press coverage, live community counts, honest trade-offs, a "Risks & Challenges" section, and 29 updates showing they communicate.
- **Momentum manufacturing:** tiny goal → instant "FUNDED" → percentage becomes the headline.

---

# PART 2 — Your 2+ campaign content organizer (fill-in + suggested drafts)

*How to use this: each section has (a) **the job** it must do, (b) **prompts** to answer, and (c) a **suggested draft** in your product's voice that you can accept, edit, or bin. Drafts are built from what 2+ actually is — an AI affirmation/manifestation app named for the principle "wherever two or more are in agreement," with voice-first conversational onboarding across 7 life areas, an "I am" engine, personalized audio + "mind-movie" video affirmations, scheduled sessions with progress rings/streaks, and a positive-only social feed.*

> **Translation cheat-sheet (High Boy → 2+):**
> hardware specs → **screenshots + demo clips + the science/outcomes**; "will it ship?" → **"will it work for me + will you still be here?"**; open-source values → **your privacy + positivity values**; mascot (Octobit) → **your visual identity / the "2+" mark**; stretch goals → **feature unlocks the community votes on.**

## ★ FINAL — Approved Indiegogo short description (locked 2026-07-24)

*Trevor's final, approved draft. Use verbatim as the campaign short description / pitch intro.*

> **2+ — Speak it. See it. Become it.**
>
> You become what you repeatedly see, say, believe, and experience. 2+ (Two or More) is a manifestation and mind-training app that helps you tune into the image — the frequency — of the life you actually want, and hold you there until it becomes the reality you experience.
>
> It starts with a short, text/voice-guided conversation. An intelligent companion learns your goals across the areas of your life and turns them into affirmations in your own words — then gives them to you in whatever form lands deepest: read them as text, absorb them in immersive audio, or watch them as short cinematic "mind-movies" that let you see your future before you're living it. A few minutes a day trains your brain to stay in that state, so confidence, calm, and certainty stop being something you chase and start being your default.
>
> You never have to hold the vision alone. 2+ is named for a simple principle — when two or more agree, things move. An intelligence that affirms your vision alongside you, and a positive-only community that agrees with your future, keeps you believing on the days it's hard to believe by yourself.
>
> With scheduled affirmation sessions on your phone each day, you will direct your focus, self awareness, self talk, and vision for your life back to your higher vision. This is the most important time investment of your day, helping you to walk in alignment and be prepared as life's obstacles try to distract you. With your daily energy, you are either manifesting your higher vision or you are manifesting something else.
>
> Train your mind. Become the person. Live the life.

---

## Section 1 — Hero: headline, promise, video

**The job:** In under two seconds, say what 2+ is, who it's for, and the feeling it delivers.

**Prompts:**
- What's the single outcome a backer wants? (to feel it's already true? to actually change a life area?)
- One line, no jargon. Avoid "affirmation app" if a benefit line hits harder.

**Suggested draft:**
> **Headline:** "2+ — Speak it. See it. Become it."
> **Sub-headline:** "The first AI companion that turns your goals into personalized audio and cinematic 'mind-movie' affirmations — built on a simple principle: when two or more agree, things move."
> **Hero video:** 60–90s. Open on the feeling (someone pressing play on a morning session, the mind-movie of their goal playing back), not the tech. End on the founding-member offer + "Back 2+."

*Alt headline options to test: "Your future self, on repeat." / "Affirmations that finally sound like you." / "Agree with your future. Watch it arrive."*

## Section 2 — The 30-second pitch (the "TL;DR" block)

**The job:** A skimmer who won't read the whole page still gets it.

**Prompts:** If you had one paragraph, what are the 3 things they must know? (what it is, why it's different, what backing gets them)

**Suggested draft:**
> 2+ is an AI-guided affirmation and visualization app. You have a short, voice-first conversation about the seven areas of your life; 2+ turns your answers into "I am" affirmations in *your* words, then produces them as personalized audio tracks and short cinematic videos you can play on a schedule. Rings and streaks keep you consistent; a positive-only community keeps you in agreement with people who want you to win. Back the campaign now to lock in **founding-member pricing you'll never see again.**

## Section 3 — The origin / "why I built this"

**The job:** Emotional hook + credibility of motive. High Boy's garage-in-Brazil story did heavy lifting here.

**Prompts:**
- Why does 2+ exist? What personal moment or belief started it?
- Why the name "2+" / the "two or more in agreement" principle — that's a distinctive, ownable story. Tell it.

**Suggested draft (you'll want this in your own voice — this is a placeholder to react to):**
> 2+ started with a line I couldn't stop thinking about: *wherever two or more are in agreement.* I'd tried the affirmation apps — generic scripts read by a stranger's voice, nothing that sounded like me or knew what I was actually working toward. So I set out to build the opposite: something that listens first, speaks in my own words, and never leaves me agreeing alone.

## Section 4 — The problem with what exists

**The job:** Name the status quo you're beating (High Boy: "Wi-Fi is a bolted-on add-on").

**Prompts:** What's broken about current affirmation/manifestation/journaling apps? (generic scripts, someone else's voice, no follow-through, feels like homework, no proof it's working, isolating)

**Suggested draft:**
> Most affirmation apps hand you a generic script and a stranger's voice. They don't know your goals, they don't sound like you, and they give you no reason to come back tomorrow. Manifestation ends up feeling like a chore you do alone — so you stop. The thing that actually makes belief stick — repetition, personalization, and agreement with others — is exactly what they're missing.

## Section 5 — The solution / "What is 2+"

**The job:** The one big idea, stated cleanly (High Boy: "native, not bolted on").

**Suggested draft:**
> 2+ is affirmation and visualization, rebuilt around you. It learns your goals through a natural voice conversation, writes affirmations in your own language, and delivers them in the two formats that make belief stick: **audio you can listen to anywhere**, and **short cinematic "mind-movies"** that let you *see* the outcome. Then it keeps you consistent and connected — because agreement, not willpower, is what carries it.

## Section 6 — Feature showcase (one block per feature, scannable)

**The job:** This is your "specs" equivalent — but shown as screenshots/GIFs, one benefit per block. Aim for 6–8.

**Prompts:** For each: a 2–4 word title, one benefit sentence, one visual (screenshot or 3–5s screen recording).

**Suggested blocks (title → benefit line → asset to shoot):**
1. **Voice-first onboarding** — "A two-minute conversation, not a 40-field form. Just talk." → screen-record the intake.
2. **The 'I am' engine** — "Affirmations written in your words, about your actual goals." → before/after of a spoken goal becoming an affirmation.
3. **Personalized audio** — "Your affirmations, produced as tracks you'll actually want to press play on." → the audio player.
4. **Mind-movies** — "See it, not just say it — short cinematic videos of your goal realized." → a sample mind-movie clip (your highest-impact asset).
5. **Seven life areas** — "Health, relationships, purpose, money, and more — balanced, not random." → the life-areas map.
6. **Rings & streaks** — "Consistency you can watch add up." → the progress rings closing.
7. **Positive-only community** — "A feed where two or more agree with your future. No negativity, by design." → the feed.
8. **Scheduled sessions** — "It shows up when you need it — morning, midday, night." → a session notification landing in the player.

## Section 7 — Who it's for

**The job:** Let the right person self-identify (High Boy: "hackers, makers, and the curious").

**Suggested draft:**
> For the goal-setters, the manifesters, the people rebuilding a life area and the people protecting a good one. For anyone who's tried affirmations and wanted them to feel real — and personal — and shared.

## Section 8 — Show it works (your "spec table" replacement)

**The job:** For a subscription app, "proof it's real" = demos + the *why it works*. Skeptics need this before they'll pay for something invisible.

**Prompts:**
- Embed 2–3 real screen recordings (onboarding → affirmation → mind-movie).
- One short "the science" note: why personalized, repeated, multi-sensory affirmation is more effective than generic scripts (self-affirmation / mental-rehearsal / visualization research). Keep it honest and non-clinical.
- A small facts strip: platforms (iOS first), formats (audio + video), languages, offline listening, privacy stance.

**Suggested facts strip:**
> Available on iPhone at launch · Personalized audio + cinematic video · 7 life areas · Works around your schedule · Your data stays yours (see Values)

## Section 9 — The comparison table (you vs. the status quo)

**The job:** High Boy's Flipper table. Position 2+ against generic affirmation apps — and be honest about one trade-off (builds trust).

**Suggested table:**

| | Generic affirmation apps | **2+** |
|---|---|---|
| Whose words | Pre-written scripts | **Yours, from your goals** |
| Whose voice | A stranger | **Personalized to you** |
| Format | Text / one voice | **Audio + cinematic mind-movies** |
| Personalization | One-size-fits-all | **7 life areas, conversationally learned** |
| Staying power | You're on your own | **Rings, streaks, scheduled sessions** |
| Community | None / public & noisy | **Positive-only, agreement-based** |

*(Honest trade-off to name somewhere — it disarms skeptics: e.g. "We're mobile-first and iPhone-only at launch," or "We're new — here's our roadmap and why we'll be here.")*

## Section 10 — Values / privacy / positivity (your "open-source + safety" equivalent)

**The job:** High Boy used open-source + "no illegal functions" to signal values and defuse objections. Your equivalent is **privacy + positivity by design.**

**Suggested draft:**
> **Two promises.** First, 2+ is a place of agreement — the community is positive-only, by design, with no room for negativity aimed at anyone's goals. Second, your inner life is yours: you control what's private and what's shared, format by format. We built the guardrails in from day one, not as an afterthought.

## Section 11 — Perks / founding-member tiers (the money)

**The job:** Turn "a subscription" into *status + a deal that vanishes.* Below: a founding-member ladder (primary) with your prepaid-subscription idea as the alternative in each tier. Adjust prices to your economics (your standard pricing is $59.99/yr or $9.99/mo — anchor everything against $59.99/yr).

> **Why founding/lifetime beats recurring on crowdfunding:** backers on Indiegogo expect a one-time pledge and a special deal, not to enroll in monthly billing. Sell *access* and *founder status*, then convert to normal subscription pricing for everyone who comes after.
>
> **Map to High Boy's real ladder:** they ran *good → better → best → everything → team (4-pack)* + an add-ons shelf. Your equivalent is *year → year+extras → multi-year → lifetime → gift/squad*, with add-ons like a 1:1 session or a mind-movie pack. Same shape, different goods.

**Suggested tier ladder:**

1. **"Believer" — $5–$10.** *Digital thank-you + your name in the app's founding-supporters wall + campaign updates.* No app access; pads backer count and lets fans support cheaply.
   - *Subscription alt:* one month of access as a thank-you.
2. **⭐ "Founding Member" (hero tier) — ~$39, limited to first N backers.** *One full year of 2+ (all features: audio + mind-movies + community), ~35% under the $59.99 retail, + permanent "Founding Member" badge.* Quantity-limited for urgency.
   - *Subscription alt:* prepaid first year at the launch price, auto-renewing at standard.
3. **"Founding Member — Standard" — ~$49.** *Same one year + badge, unlimited quantity* (for after early-bird sells out).
4. **"Two-Year Believer" — ~$79.** *Two years of access + badge* (per-year discount; your best cash-flow tier).
5. **"Lifetime Founder" — ~$149–$199, limited.** *Lifetime access to 2+, founding badge, early access to every new feature.* Your headline scarcity tier — "you will never see lifetime access again after launch."
   - *Subscription alt:* 3–5 prepaid years if you don't want to sell true lifetime.
6. **"Pair" / gift tier — ~$69.** *Two founding-member years — one for you, one to gift.* Leans directly into "two or more in agreement" — very on-brand.
7. **Whale tier — ~$500–$1,000, very limited.** *Lifetime + a 1:1 goal-setting session with the founder + input on the roadmap + name in credits.*

**Add-ons shelf (à la carte, like High Boy's):** let any backer stack extras onto their tier — e.g. a **1:1 goal-setting session with the founder**, a **premium mind-movie pack** (extra visual styles), a **printed affirmation deck/journal**, or **gift years**. Tag one "Featured."

Each tier must state: **name · price · what's included · % off vs. $59.99/yr · access date (beta vs. public launch) · quantity remaining.** Use High Boy's card mechanics too: struck-through retail, a "$X OFF" badge, one clear access date, and a monthly-price framing if you sell multi-year.

## Section 12 — Roadmap / stretch goals (community unlocks)

**The job:** Give already-backed supporters a reason to keep sharing (High Boy: RFID → LoRa → 5GHz).

**Prompts:** What features are gated behind funding milestones? Frame as things the community unlocks *for everyone.*

**Suggested draft (examples — map to your real backlog):**
> - **Unlocked at [goal]:** Android version.
> - **Unlocked at [goal]:** the verified-coach marketplace (bring your own coach into your agreement).
> - **Unlocked at [goal]:** shareable mind-movies / more visual styles.
> - **Unlocked at [goal]:** additional languages.

## Section 13 — The team

**The job:** Real humans (High Boy: 8 named members). Even solo, put your face and story here.

**Prompts:** Photo, name, one line of role + why-you-care. Add any advisors, designers, or the founding community. Link socials.

**Suggested draft:**
> **[Your name] — Founder.** [One line: who you are + why 2+ is personal to you.] Plus the designers, builders, and early believers who shaped it.

## Section 14 — Community / social proof

**The job:** "You're joining a movement." Show any audience you already have (waitlist size, beta testers, social follows, testimonials from early users).

**Suggested draft:**
> 2+ is already being built with its first believers. [X] on the waitlist · [Y] in the beta · join the ones who are agreeing their futures into being.

*(If you don't have numbers yet, this is the #1 pre-launch job — see checklist. High Boy launched to 20,000+ people. Campaigns are won before they open.)*

## Section 15 — FAQ

**The job:** Kill the objections that stop a pledge.

**Suggested starter questions:**
- When do I get access — at launch or in beta before?
- Which phones? (iPhone at launch; Android via stretch goal?)
- What happens to my founding price when the campaign ends?
- Is my data / my affirmations private? Who can see what?
- What if the app isn't for me — can I get a refund? (state your policy)
- How is this different from [Calm/journaling/other affirmation apps]?
- Lifetime — do you really mean lifetime?
- What if you don't hit your goal?

## Section 16 — Risks & challenges (required on Kickstarter; smart on Indiegogo)

**The job:** Honesty that *builds* trust. Address the two real risks for an app: shipping/timeline and longevity.

**Suggested draft:**
> The core of 2+ is already built and in testing — this isn't a concept, it's an app being polished. The honest risks are timeline (getting through App Store review and scaling the AI generation reliably) and the reality that we're early. Founding-member funds go directly to finishing the AI pipeline, launch, and the first year of servers, so we're here for the long run. We'll post updates every [cadence] so you always know where things stand.

## Section 17 — Closing CTA

**The job:** Final push, urgency restated.

**Suggested draft:**
> Founding-member pricing exists only during this campaign — after launch, 2+ is $59.99/year for everyone. Lock in your year (or your lifetime) now, and let's agree your future into being. **Back 2+.**

---

# Media & asset checklist (produce these)

- [ ] **Hero pitch video** (60–90s) — feeling-first, ends on the offer. *Highest leverage — do this well.*
- [ ] **1 sample mind-movie clip** — your single most differentiating asset; make it beautiful.
- [ ] Screen recordings: onboarding conversation · affirmation being generated · audio player · progress rings closing · the feed.
- [ ] 6–8 feature-block visuals (screenshot or short GIF each).
- [ ] Comparison table (Section 9).
- [ ] Facts strip (Section 8).
- [ ] Founder photo + any team headshots.
- [ ] "Featured in" / testimonial strip (even beta-tester quotes).
- [ ] Reward-tier thumbnail images (one per tier).
- [ ] Community screenshots (waitlist count, beta group, socials).

# Pre-launch checklist (the campaign is won before it opens)

- [ ] **Build an audience first.** High Boy had 20,000+. Start a waitlist / email list / Discord / IG now; drive everyone there before you launch.
- [ ] **Set a goal you'll clear day one** (High Boy: $7K). Momentum → "FUNDED" badge → the % becomes marketing.
- [ ] **Line up "day-one" backers** (friends, beta users) to hit 100% fast.
- [ ] **Decide platform:** Kickstarter (all-or-nothing, requires Risks section, strong for tech) vs. Indiegogo (flexible funding option, your linked example). For a subscription/app, Indiegogo's flexibility is usually safer.
- [ ] **Sort out fulfillment mechanics:** how a backer actually redeems a founding-member year/lifetime in-app (promo codes? account flag? RevenueCat entitlement?). Decide *before* you take money.
- [ ] **Prep 3–4 updates in advance** so you can post momentum on schedule.
- [ ] **Get legal-light clarity** on selling "lifetime" access to a subscription service and any preorder/refund promises.

---

*Sources for the teardown: the High Boy Indiegogo and Kickstarter pages, the High Code product site, and coverage from GizmoCrowd and Hackster.io. Part 2 drafts are starting points in your product's voice — edit freely.*
