/**
 * Canned content extracted 1:1 from the design bundle so the app runs the
 * exact experience Trevor approved, offline, before live wiring.
 */

export interface ScriptStep {
  area: number;
  ai: string[];
  chips: string[] | null;
  user: string | null;
}

export const MOCK_SCRIPT: ScriptStep[] = [
  { area: 0, ai: ["I'm going to ask you about the life you're building. The more you share, the more powerful your affirmations become. Speak freely — voice works best.", "Let's start with spirit. When do you feel most connected — and what does that look like on an ordinary day?"], chips: null, user: 'Daily prayer and stillness before the house wakes up. I want that every morning, not just some mornings.' },
  { area: 0, ai: ['Why does that matter to you — what does that stillness change?'], chips: ['Peace', 'Clarity', 'Gratitude', 'Direction'], user: 'Peace. When I start the day in alignment, the whole day follows.' },
  { area: 0, ai: ['Want me to note “phone stays out of the bedroom until after prayer” as a starting action?'], chips: ['Note it', 'Skip'], user: 'Note it.' },
  { area: 1, ai: ['Noted. Money next — what are you aiming for financially this year?'], chips: null, user: 'Seven figures from my business, and six months of living expenses banked.' },
  { area: 1, ai: ['Who does that number serve — what does it unlock?'], chips: ['Freedom', 'My kids', 'Security', 'Options'], user: "Freedom — and energy. I've lost 70 pounds these past two years; I want a body and a bank account that both say abundance." },
  { area: 2, ai: ["You mentioned losing 70 pounds — that's huge. What does the finish line look like for you?"], chips: null, user: 'Lose 20 more, then maintain and keep my bloodwork immaculate.' },
  { area: 2, ai: ['And why does that matter to you — who are you doing it for?'], chips: ['My kids', 'Energy', 'Longevity', 'Confidence'], user: "My kids. I want energy at 70 that most people don't have at 40." },
  { area: 3, ai: ["That's a picture I can write to. Business — beyond the seven figures, what does it look like when it's right?"], chips: null, user: 'A small team, clients who rave, and work that runs without me every hour of the day.' },
  { area: 4, ai: ['Your marriage — what season are you calling in?'], chips: null, user: 'Date nights that actually happen. Us as partners, not co-managers of a household.' },
  { area: 5, ai: ['And home — what do you want your kids to remember about this year?'], chips: null, user: 'That Dad was present. Dinners, games, no phone at the table.' },
  { area: 6, ai: ['Last one. Your circle — who do you want around you?'], chips: ['Builders', 'Believers', 'Mentors', 'Old friends'], user: "Builders and believers. People in agreement with where I'm headed." },
  { area: 6, ai: ["That's everything I need. I can hear the life you're building — give me a moment to write you into it."], chips: null, user: null },
];

export const MOCK_AFFS = [
  { id: 'a1', area: 'Spiritual', youSaid: 'I want that stillness every morning, not just some mornings.', statement: 'I begin every morning in stillness and prayer, aligned before the world asks anything of me.', alt: 'I am anchored in morning prayer; alignment is how every one of my days begins.', isIdentity: false },
  { id: 'a2', area: 'Business', youSaid: 'I want to make seven figures this year from my business.', statement: 'I run a profitable business that gives me a seven-figure income, delighting every client I serve.', alt: 'My business earns seven figures because every client I serve raves about the work.', isIdentity: false },
  { id: 'a3', area: 'Financial', youSaid: 'I want six months of living expenses banked.', statement: 'I am financially free; six months of living rests in savings and my money works while I sleep.', alt: 'I hold six months of freedom in the bank, and abundance moves toward me daily.', isIdentity: false },
  { id: 'a4', area: 'Fitness & health', youSaid: 'Lose 20 more, then maintain and keep my bloodwork immaculate.', statement: 'I am strong and light; my bloodwork is immaculate and my energy outlasts men half my age.', alt: 'I live in a strong, light body — bloodwork immaculate, with energy for decades to come.', isIdentity: false },
  { id: 'a5', area: 'Relationships', youSaid: 'Date nights that actually happen.', statement: 'I am a devoted partner; my marriage receives my best hours, not my leftovers.', alt: 'I show up for my marriage first; our nights together are sacred and kept.', isIdentity: false },
  { id: 'a6', area: 'Family', youSaid: 'That Dad was present.', statement: 'I am a present father; my children feel my full attention every single day.', alt: 'I am the father at the table — present, playful, and unhurried.', isIdentity: false },
  { id: 'a7', area: 'Social', youSaid: 'Builders and believers. People in agreement with where I’m headed.', statement: 'I am surrounded by builders and believers who stand in agreement with my vision.', alt: 'My circle stands in agreement with my vision; I walk with builders and believers.', isIdentity: false },
];

export const BUILD_LINES = ['Reading your vision…', 'Finding the language…', 'Writing you in the present tense…'];
export const CREATION_LINES = ['Recording your affirmations…', 'Painting your goals…', 'Cutting your mind movie…'];

export const MANIFESTO_LINES = [
  "You carry a vision for your life. You shouldn't carry it alone.",
  '2+ turns your goals into daily affirmations — written, spoken, and seen.',
  'An intelligence that agrees with your vision, on a schedule that rewires your mind.',
];

export const BUILD_FRAGMENTS = [
  { text: 'seven figures from my business', left: 0.06, top: 0.14, size: 15 },
  { text: 'stillness before the house wakes', left: 0.18, top: 0.26, size: 13 },
  { text: 'energy at 70', left: 0.62, top: 0.2, size: 16 },
  { text: 'Dad was present', left: 0.14, top: 0.72, size: 17 },
  { text: 'date nights that actually happen', left: 0.38, top: 0.82, size: 13 },
  { text: 'builders and believers', left: 0.56, top: 0.64, size: 14 },
  { text: 'bloodwork immaculate', left: 0.08, top: 0.48, size: 13 },
];

export const PAY_FRAGMENTS = [
  { text: 'I run a profitable business…', left: 0.06, top: 0.09, size: 16, rot: '-3deg' },
  { text: 'I am a present father…', left: 0.48, top: 0.15, size: 14, rot: '2deg' },
  { text: 'I begin every morning in stillness…', left: 0.12, top: 0.22, size: 13, rot: '-1deg' },
  { text: 'I am strong and light…', left: 0.55, top: 0.27, size: 15, rot: '3deg' },
];
