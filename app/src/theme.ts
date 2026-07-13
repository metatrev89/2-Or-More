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
  terracotta: '#C25E4C', // mood: "Disconnected" — earthy, not alarm-red
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
  moodDismissMs: 1500,
} as const;

export const AREAS = ['Spiritual', 'Financial', 'Fitness & health', 'Business', 'Relationships', 'Family', 'Social'] as const;
