# Palette snapshot — "Golden hour 2.0"

**Saved Sept 17, 2026, before exploring a chakra-spectrum palette.**
This is the complete, restorable record of the palette as shipped. If the new
direction doesn't land, everything needed to revert is here — the values *and*
the roles, which matter more than the hexes.

Source of truth in code: `app/src/theme.ts` (`colors`).
Design origin: `design-handoff/2-first-design-pass/project/2+ First-Run.dc.html`.

---

## Values

| Token | Hex | Role |
|---|---|---|
| `cream` | `#FAF4E8` | App canvas. Every screen background. |
| `canvasBehind` | `#ECE3D0` | The surface behind the canvas (sheets, depth). |
| `ink` | `#26201A` | Primary text; the "you" voice; active Home/Profile tab. |
| `gold` | `#E9B84C` | **ACHIEVEMENT ONLY.** Stars, medals, streak flame, week bars, the primary CTA. Never decorative. |
| `goldSoft` | `#F5E7C4` | Earned-but-secondary medal fill. |
| `teal` | `#157A6E` | **AI ACTIONS ONLY** (rule as written) — in practice also every progress ring, play control and completion mark. |
| `tealDeep` | `#0E5A50` | Teal text on tint; pressed states. |
| `aiTint` | `#DFF0ED` | Background behind AI output and active toggles. |
| `warmGray` | `#8A7A66` | Secondary text. |
| `border` | `#E8DEC9` | Card borders. |
| `borderSoft` | `#F0E8D8` | Row dividers inside cards. |
| `sand` | `#D9CBB0` | Inactive control outlines; empty week bars. |
| `inactive` | `#B5A88F` | Disabled text, unselected tabs, placeholders. |
| `white` | `#FFFFFF` | Card surfaces. |
| `terracotta` | `#C25E4C` | The palette's "red" — earthy, deliberately not alarm-red. Bottom third of session completion; "Sign out". |
| `creamOnDark` | `rgba(250,244,232,0.85)` | Text on ink. |
| `creamOnDarkDim` | `rgba(250,244,232,0.6)` | Secondary text on ink. |
| `creamOnDarkFaint` | `rgba(250,244,232,0.16)` | Hairlines on ink. |

## Per-tab active tints (MainTabs `ACTIVE`)

Home `#26201A` · Feed `#E9B84C` · Progress `#157A6E` · Friends `#5C5142` ·
Profile `#26201A` · inactive `#B5A88F`

## The rules that came with it

1. **No red anywhere.** Feedback is encouraging, never condemning — streaks
   *pause*, never "break". Terracotta exists because it reads as earth, not alarm.
2. **Gold = achievement only.** Spending it on decoration devalues the moment it
   is supposed to mark.
3. **Teal = AI actions, never decorative.** (Progress rings have long been teal
   too; that precedent was accepted, not a loosening of the rule.)
4. **Terracotta → gold → teal is the red/yellow/green scale** for session
   completion thirds (`pctColor()` in ProgressScreen).
5. Serif italic = affirmation voice · sans = UI · mono = numbers/timestamps.

## How to restore

Revert `app/src/theme.ts` to the table above, restore the `ACTIVE` map in
`app/src/screens/MainTabs.tsx`, and reinstate rules 1–4 in `CLAUDE.md` under
"Non-negotiable design rules". Git history also holds it: the last commit before
any palette change is the clean reference.

---

## What prompted the exploration

Trevor's logo concept (`uploads/highnoon-linkedin-square-640x640.png`): a gold
sun ringed by seven dots in the chakra spectrum — which is exactly the app's
seven life areas, root → crown. Sampled values:

| Area (root → crown) | Hex |
|---|---|
| Health & Body (Root) | `#E81B1B` |
| Emotions & Creativity (Sacral) | `#F07020` |
| Career, Purpose & Power (Solar Plexus) | `#FFE020` |
| Relationships & Love (Heart) | `#18B835` |
| Communication & Expression (Throat) | `#1E90F0` |
| Mindset, Vision & Growth (Third Eye) | `#5B1090` |
| Spirit & Purpose (Crown) | `#9040C8` |
| Centre sun | `#F7AE00` |
| Background | `#FDF4D3` → `#FDEAB0` |
