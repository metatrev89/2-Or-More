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

// Chakra-mapped areas, root→crown — order matches theme.ts AREAS and backend LIFE_AREAS.
export const MOCK_SCRIPT: ScriptStep[] = [
  { area: 0, ai: ["I'm going to walk you through seven areas of the life you're building — from foundation to spirit. The more you share, the more powerful your affirmations become. Speak freely — voice works best.", 'Your foundation first: Health & Body. Where is it headed in the next 12 months?'], chips: null, user: "I've lost 70 pounds these past two years. Lose 20 more, then maintain — and keep my bloodwork immaculate." },
  { area: 0, ai: ['Why does that matter to you — who are you doing it for?'], chips: ['My kids', 'Energy', 'Longevity', 'Confidence'], user: "My kids. I want energy at 70 that most people don't have at 40." },
  { area: 1, ai: ["That's a foundation worth building on. Emotions next — how do you want to feel and flow day to day?"], chips: ['Peace', 'Patience', 'Presence', 'Joy'], user: "Steady. I want my peace to be mine — not handed to whoever tests it that day." },
  { area: 2, ai: ['Now your drive: career, purpose, and power. What are you building this year?'], chips: null, user: 'Seven figures from my business — a small team, clients who rave, and six months of living expenses banked.' },
  { area: 2, ai: ['What does that number unlock for you?'], chips: ['Freedom', 'My kids', 'Security', 'Options'], user: 'Freedom. A body and a bank account that both say abundance.' },
  { area: 3, ai: ['The heart now — love and your closest relationships. What season are you calling in?'], chips: null, user: 'Date nights that actually happen. Us as partners, not co-managers of a household. And my kids remembering that Dad was present.' },
  { area: 4, ai: ['Your voice: what message do you want to bring into the world this year?'], chips: null, user: 'I want to write and speak about what I believe — confidently, to the people looking for it.' },
  { area: 5, ai: ['Third eye — clarity and growth. What does the next level of you look like?'], chips: ['Discipline', 'Wisdom', 'Legacy', 'Momentum'], user: 'A mindset of continual growth I can hand down — so my kids start further along than I did.' },
  { area: 6, ai: ['Last one, the crown: Spirit & Purpose. When do you feel most connected — and what does that look like on an ordinary day?'], chips: null, user: 'Daily prayer and stillness before the house wakes up. I want that every morning, not just some mornings.' },
  // Catch-all (area 7): asked once after the seven, answer becomes the 8th affirmation.
  { area: 7, ai: ["That's all seven captured. Before I write these — is there anything else you want to hold in this practice that we didn't cover? Tell me what it is and why it matters, or just say that's it."], chips: ["That's it", 'One more thing'], user: 'One more thing — I want to finish writing my book this year. It’s the message I owe people.' },
  { area: 7, ai: ["Beautiful — that's everything I need. Give me a moment to write you into it."], chips: null, user: null },
];

export const MOCK_AFFS = [
  { id: 'a1', area: 'Health & Body', youSaid: 'Lose 20 more, then maintain and keep my bloodwork immaculate.', statement: 'I AM strong and light, my bloodwork immaculate, twenty pounds released and maintained with ease. I have this because it gives me energy at 70 that most people don’t have at 40 — fully present for my kids and my mission.', alt: 'I AM living in a strong, light body with immaculate bloodwork. I keep this strength because my kids deserve a father with energy for decades to come.', isIdentity: false },
  { id: 'a2', area: 'Emotions & Creativity', youSaid: 'I want my peace to be mine — not handed to whoever tests it that day.', statement: 'I AM steady and at peace, and my peace belongs to me. I live this way because no one’s choices decide my emotions — I flow, I create, and I attract what is for me.', alt: 'I AM in charge of me — steady, peaceful, creative. My calm is my own because I no longer hand it to whoever tests it.', isIdentity: false },
  { id: 'a3', area: 'Career, Purpose & Power', youSaid: 'Seven figures from my business, and six months of living expenses banked.', statement: 'I AM leading a seven-figure business with a small team and clients who rave, six months of living banked. I have this because it buys freedom — a body and a bank account that both say abundance.', alt: 'I AM running a business that earns seven figures because every client raves about the work — and my savings hold six months of freedom.', isIdentity: false },
  { id: 'a4', area: 'Relationships & Love', youSaid: 'Date nights that actually happen. That Dad was present.', statement: 'I AM a devoted partner and a present father. Our date nights are sacred and kept, my children feel my full attention daily — because home receives my best hours, not my leftovers.', alt: 'I AM the partner at the table and the father in the room — present, playful, unhurried — because family is the point of all of it.', isIdentity: false },
  { id: 'a5', area: 'Communication & Expression', youSaid: 'Write and speak about what I believe — confidently, to the people looking for it.', statement: 'I AM a confident voice for what I believe, writing and speaking boldly. I share it because the people searching for this path deserve to find it lit.', alt: 'I AM speaking my message clearly and without apology — because someone out there is looking for exactly these words.', isIdentity: false },
  { id: 'a6', area: 'Mindset, Vision & Growth', youSaid: 'A mindset of continual growth I can hand down.', statement: 'I AM in a mindset of continual growth, already moving past today’s vision and setting new levels. I live this way because it is my legacy — my kids start further down the road than I did.', alt: 'I AM growing past every version of my vision — because each level I reach is inheritance for my children.', isIdentity: false },
  { id: 'a7', area: 'Spirit & Purpose', youSaid: 'I want that stillness every morning, not just some mornings.', statement: 'I AM anchored in morning stillness and prayer, aligned before the world asks anything of me. I begin here because when I start the day in alignment, the whole day follows.', alt: 'I AM in daily communion — stillness and prayer before the house wakes — because alignment is how every one of my days begins.', isIdentity: false },
  // The optional 8th — only present when the catch-all question gets a real answer.
  { id: 'a8', area: 'Anything Else', youSaid: 'I want to finish writing my book this year.', statement: 'I AM finishing my book this year, chapter by chapter, and it is good. I write it because the message inside it was never mine to keep — delivering it is part of who I am.', alt: 'I AM an author with a finished book in hand this year, because the people it was written for are still waiting on it.', isIdentity: false },
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
  { text: 'growth I can hand down', left: 0.56, top: 0.64, size: 14 },
  { text: 'bloodwork immaculate', left: 0.08, top: 0.48, size: 13 },
];

export const PAY_FRAGMENTS = [
  { text: 'I AM leading a seven-figure business…', left: 0.06, top: 0.09, size: 16, rot: '-3deg' },
  { text: 'I AM a present father…', left: 0.48, top: 0.15, size: 14, rot: '2deg' },
  { text: 'I AM anchored in morning stillness…', left: 0.12, top: 0.22, size: 13, rot: '-1deg' },
  { text: 'I AM strong and light…', left: 0.55, top: 0.27, size: 15, rot: '3deg' },
];
