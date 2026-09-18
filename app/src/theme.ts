/**
 * Golden hour 2.0 — extracted verbatim from the Claude Design bundle
 * (design-handoff/2-first-design-pass/project/2+ First-Run.dc.html).
 */
export const colors = {
  cream: '#FAF4E8',
  canvasBehind: '#ECE3D0',
  ink: '#26201A',
  gold: '#E9B84C',
  goldSoft: '#F5E7C4',
  teal: '#157A6E',
  tealDeep: '#0E5A50',
  aiTint: '#DFF0ED',
  warmGray: '#8A7A66',
  border: '#E8DEC9',
  borderSoft: '#F0E8D8',
  sand: '#D9CBB0',
  inactive: '#B5A88F',
  white: '#FFFFFF',
  // The palette's "red" — earthy, deliberately not alarm-red, which is how it
  // satisfies the brand doc's no-red rule. Now marks the bottom third of
  // session completion (was the retired "Disconnected" alignment mood).
  terracotta: '#C25E4C',
  creamOnDark: 'rgba(250,244,232,0.85)',
  creamOnDarkDim: 'rgba(250,244,232,0.6)',
  creamOnDarkFaint: 'rgba(250,244,232,0.16)',
} as const;

export const fonts = {
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemi: 'InstrumentSans_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifMediumItalic: 'Newsreader_500Medium_Italic',
  mono: 'SplineSansMono_400Regular',
  monoMedium: 'SplineSansMono_500Medium',
} as const;

/** Animation timings lifted from the design's keyframes/setTimeout choreography. */
export const timing = {
  fadeUpMs: 350,
  fadeInMs: 400,
  screenFadeMs: 400,
  typingDelayMs: 1300,
  introAutoAdvanceMs: 4800,
  buildLineMs: 1400,
  buildDoneMs: 4300,
  celebStarMs: 1100,
  bigCelebMs: 4200,
  chromeHideMs: 2200,
} as const;

/** Chakra-mapped life areas, root→crown — order MUST match backend LIFE_AREAS (areaIndex crosses the API). */
export const AREAS = [
  'Health & Body',
  'Emotions & Creativity',
  'Career, Purpose & Power',
  'Relationships & Love',
  'Communication & Expression',
  'Mindset, Vision & Growth',
  'Spirit & Purpose',
] as const;

/** Chakra framing per area (subtitle line under the area chip). */
export const AREA_CHAKRAS = [
  'Root · Foundation',
  'Sacral · Flow',
  'Solar Plexus · Drive',
  'Heart · Connection',
  'Throat · Voice',
  'Third Eye · Clarity',
  'Crown · Unity',
] as const;

/**
 * The catch-all question asked once after the seven areas (backend areaIndex 7,
 * LifeArea 'open_capture'). Not a chakra — it never lights a progress segment.
 */
export const CATCH_ALL_AREA = { label: 'Anything Else', note: 'Nothing left behind' } as const;

/**
 * Per-area accent colours — the chakra spectrum, root → crown
 * (Trevor, Sept 17, 2026, from his logo concept).
 *
 * ADDITIVE, NOT A REPLACEMENT. Golden hour 2.0 is untouched: cream canvas, ink
 * voice, **gold still means achievement and nothing else**, **teal still means
 * AI and progress**. These accents answer exactly one question — WHICH AREA —
 * and are never used for progress, completion or achievement, so nothing here
 * competes with gold or teal. That containment is what makes it revertible;
 * the full previous palette and its rules are in
 * `design/palette-golden-hour-2.0-SNAPSHOT.md`.
 *
 * Hues come from the logo but are NOT the logo's values. Those were picked
 * against a yellow background — on cream, the logo's Career yellow (#FFE020)
 * measures 1.20:1, i.e. invisible. These are the same chakra hues moved into
 * an aged-pigment register so they sit inside the brand rather than shouting
 * over it. Gates every one of them clears:
 *   · accent on cream ≥ 3.0:1 (bold labels + UI shapes) — lowest is Career 3.35
 *   · ink on tint ≥ 4.5:1 (body text) — lowest 12.34
 *   · ≥ 55 RGB distance from teal / gold / terracotta so no accent reads as a
 *     reserved role. Closest is Heart green ↔ teal at 54.6 — the pair to watch.
 *
 * Colour is ALWAYS redundant here: every accent travels with its area name, so
 * neighbouring hues (red/orange, blue/indigo — adjacent by definition in a
 * spectrum) never have to carry meaning alone.
 *
 * Index-aligned with AREAS. Keep them in the same order.
 */
export const AREA_ACCENTS = [
  '#B33A2B', // Root · Health & Body
  '#C2681C', // Sacral · Emotions & Creativity
  '#9C8418', // Solar Plexus · Career, Purpose & Power
  '#3C8F4E', // Heart · Relationships & Love
  '#2E6F9E', // Throat · Communication & Expression
  '#4A4A96', // Third Eye · Mindset, Vision & Growth
  '#8A56A3', // Crown · Spirit & Purpose
] as const;

/** Soft fills for chips, paired to AREA_ACCENTS. Ink stays ≥12:1 on all of them. */
export const AREA_TINTS = [
  '#F6E0DB', '#F8E6D6', '#F2EED6', '#DEEFE1', '#DCEAF4', '#E0E0F0', '#EDE0F2',
] as const;

/**
 * Accent for an area, by label or by index.
 *
 * The catch-all gets WARM GRAY, deliberately. `open_capture` is not a chakra —
 * it lights no progress segment and earns no star or chime — so giving it a
 * colour from the spectrum would imply an eighth chakra that doesn't exist.
 * Anything unrecognised falls back the same way rather than throwing.
 */
export function areaAccent(area: string | number | undefined): string {
  const i = typeof area === 'number' ? area : AREAS.indexOf(area as typeof AREAS[number]);
  return AREA_ACCENTS[i] ?? colors.warmGray;
}

export function areaTint(area: string | number | undefined): string {
  const i = typeof area === 'number' ? area : AREAS.indexOf(area as typeof AREAS[number]);
  return AREA_TINTS[i] ?? colors.borderSoft;
}
