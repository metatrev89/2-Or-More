/**
 * Golden hour 2.0 — extracted verbatim from the Claude Design bundle
 * (design-handoff/2-first-design-pass/project/2+ First-Run.dc.html).
 */
const LIGHT = {
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
  // Named Nov 6 so dark mode can reach them — each was a literal repeated
  // across screens.
  /** Linen fill for secondary chips/pills ("Pending", avatar wells). */
  chip: '#EFE6D2',
  /** Umber body text — notification lines, Contacts copy, the Friends tab tint. */
  umber: '#5C5142',
  /** Teal wash filling a completed ring dot. */
  tealWash: 'rgba(21,122,110,0.25)',
  /** Content ON a gold surface. Never inverts: gold stays gold in both modes. */
  onGold: '#26201A',
  /** Glass tab bar (GlassTabBar.tsx). */
  glassFill: 'rgba(250, 244, 232, 0.72)',
  glassRim: 'rgba(232, 222, 201, 0.85)',
  glassSheen: 'rgba(255, 255, 255, 0.55)',
  lensFill: 'rgba(255, 255, 255, 0.78)',
  lensRim: 'rgba(255, 255, 255, 0.9)',
  /** Dim layer behind sheets. */
  scrim: 'rgba(38,32,26,0.4)',
};

export type Palette = { [K in keyof typeof LIGHT]: string };

/**
 * DARK MODE — "Golden hour at dusk" (Nov 6, 2026).
 *
 * The same roles, not new ones: gold still means achievement only, teal still
 * means AI/progress, no red. Every token keeps its JOB and flips its value, so
 * pairs invert together — `ink` text on a `cream` canvas becomes light-on-dark,
 * and an `ink` pill with `cream` text (the streak pill) becomes a light pill
 * with dark text. That is why `white` (card surfaces) becomes a warm dark
 * surface, and text drawn in `white` on teal becomes dark-on-teal (5.5:1).
 *
 * Contrast, measured: ink on canvas 15.5, on cards 14.0 · warmGray 6.1 / 5.6 ·
 * inactive 3.8 (icons, never body text) · teal text 6.1 / 5.5 · dark text on
 * teal 5.5 · tealDeep on aiTint 8.1 · onGold on gold 8.8 · terracotta 5.2.
 */
const DARK: Palette = {
  cream: '#171310',
  canvasBehind: '#100D0A',
  ink: '#F2EADB',
  gold: '#E9B84C',
  goldSoft: '#3B301B',
  teal: '#3FA394',
  tealDeep: '#8ED1C4',
  aiTint: '#18302C',
  warmGray: '#A3927E',
  border: '#3A322A',
  borderSoft: '#2A241E',
  sand: '#4A4034',
  inactive: '#7D7062',
  white: '#221D18',
  terracotta: '#D9735F',
  // On the screens painted in `ink`, which is LIGHT in dark mode — so these
  // become dark text, keeping the inversion consistent.
  creamOnDark: 'rgba(23,19,16,0.85)',
  creamOnDarkDim: 'rgba(23,19,16,0.6)',
  creamOnDarkFaint: 'rgba(23,19,16,0.16)',
  chip: '#2E2720',
  umber: '#BBAA94',
  tealWash: 'rgba(63,163,148,0.3)',
  onGold: '#26201A',
  glassFill: 'rgba(28, 23, 19, 0.78)',
  glassRim: 'rgba(74, 64, 52, 0.85)',
  glassSheen: 'rgba(255, 255, 255, 0.05)',
  lensFill: 'rgba(255, 255, 255, 0.09)',
  lensRim: 'rgba(255, 255, 255, 0.14)',
  scrim: 'rgba(0,0,0,0.55)',
};

/**
 * The live palette. Swapped IN PLACE by `applyPalette` — every screen reads
 * `colors.x` at render time (there is no StyleSheet.create anywhere in the
 * app), so a swap plus a re-render of the navigator repaints everything.
 * Never copy a value out of this into a module-level constant: it would
 * freeze at whichever mode was active at import.
 */
export const colors: Palette = { ...LIGHT };

export type ColorMode = 'light' | 'dark';
let mode: ColorMode = 'light';

export function applyPalette(next: ColorMode): void {
  mode = next;
  Object.assign(colors, next === 'dark' ? DARK : LIGHT);
}

export function isDarkMode(): boolean {
  return mode === 'dark';
}

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
/**
 * Bar shape shared by Home's weekly bars and the session-complete celebration
 * bars (Trevor, Nov 5: they "are different shapes"). The celebration bars were
 * 12pt wide with a 6pt radius — fully rounded pills — beside Home's flat-topped
 * rounded rectangles. One radius, and the celebration keeps Home's
 * width-to-gap proportions, so both read as the same object.
 */
export const BAR_RADIUS = 4;

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

/**
 * Dark-mode accents: each light accent lifted toward white just far enough to
 * clear 4.5:1 on a dark card (lowest 4.50, Throat). Same hues, same order.
 */
export const AREA_ACCENTS_DARK = [
  '#C66B60', '#C57027', '#9C8418', '#469557', '#568AB0', '#8080B6', '#A076B4',
] as const;

/** Dark tints: 28% accent over the dark canvas. Light ink stays ≥10.4:1. */
export const AREA_TINTS_DARK = [
  '#431E18', '#472B13', '#3C3312', '#213621', '#1D2D38', '#252236', '#372639',
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
  return (mode === 'dark' ? AREA_ACCENTS_DARK : AREA_ACCENTS)[i] ?? colors.warmGray;
}

export function areaTint(area: string | number | undefined): string {
  const i = typeof area === 'number' ? area : AREAS.indexOf(area as typeof AREAS[number]);
  return (mode === 'dark' ? AREA_TINTS_DARK : AREA_TINTS)[i] ?? colors.borderSoft;
}
