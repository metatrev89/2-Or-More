/** Social mock data — verbatim from the design bundle. Replaced by the social API when backend social lands. */

/**
 * Connections are TWO-WAY (Trevor, Sept 11) — this replaced the follow /
 * follow-back model. There is no asymmetric state: either both people agreed
 * or the request is still outstanding, which is the whole point of "wherever
 * two or more are in agreement."
 *
 *   connected — accepted by both; appears in Connections
 *   incoming  — they asked, you haven't answered; you Accept or Decline
 *   outgoing  — you asked, they haven't answered; you can only Cancel
 *
 * The old shape carried `pending` AND `followsYou`, which could express
 * "follows you but you don't follow them" — a state that cannot exist now.
 */
export type ConnectionStatus = 'connected' | 'incoming' | 'outgoing';

export interface Connection {
  name: string;
  sub: string;
  streak: boolean;
  status: ConnectionStatus;
}

export const FRIENDS: Connection[] = [
  // ── connected ──────────────────────────────────────────────────────────
  { name: 'Sam Whitfield', sub: 'Family · 12-day streak', streak: true, status: 'connected' },
  { name: 'Jon Castellano', sub: 'Fitness & health · 34-day streak', streak: true, status: 'connected' },
  { name: 'Grace Okafor', sub: 'Relationships · practicing daily', streak: false, status: 'connected' },
  { name: 'Tom Beckett', sub: 'Social · 8-day streak', streak: true, status: 'connected' },
  { name: 'Priya Natarajan', sub: 'Financial · new this week', streak: false, status: 'connected' },
  { name: 'Alena Petrov', sub: 'Spiritual · 5-day streak', streak: true, status: 'connected' },
  { name: 'Marcus Hale', sub: 'Business & fitness · 21-day streak', streak: true, status: 'connected' },
  { name: 'Danielle Reyes', sub: 'Spiritual · practicing daily', streak: false, status: 'connected' },
  { name: 'Elena Vasquez', sub: 'Health & body · 47-day streak', streak: true, status: 'connected' },
  { name: 'Desmond Clarke', sub: 'Career & purpose · practicing daily', streak: false, status: 'connected' },
  { name: 'Hannah Lindgren', sub: 'Mindset & growth · 19-day streak', streak: true, status: 'connected' },
  { name: 'Omar Haddad', sub: 'Spirit & purpose · 6-day streak', streak: true, status: 'connected' },
  { name: 'Rachel Kim', sub: 'Communication · practicing daily', streak: false, status: 'connected' },
  { name: 'Isaiah Brooks', sub: 'Family · 28-day streak', streak: true, status: 'connected' },
  { name: 'Nadia Osei', sub: 'Emotions & creativity · 11-day streak', streak: true, status: 'connected' },
  { name: 'Caleb Moreau', sub: 'Business · new this month', streak: false, status: 'connected' },
  { name: 'Yuki Tanaka', sub: 'Mindset & growth · 52-day streak', streak: true, status: 'connected' },
  { name: 'Bianca Ferreira', sub: 'Relationships · practicing daily', streak: false, status: 'connected' },
  { name: 'Theo Almasi', sub: 'Health & body · 9-day streak', streak: true, status: 'connected' },
  { name: 'Simone Dubois', sub: 'Spirit & purpose · 23-day streak', streak: true, status: 'connected' },
  { name: 'Andre Whitlock', sub: 'Career & purpose · 4-day streak', streak: true, status: 'connected' },
  { name: 'Leah Sorensen', sub: 'Emotions & creativity · practicing daily', streak: false, status: 'connected' },
  { name: 'Malik Johnson', sub: 'Fitness & health · 31-day streak', streak: true, status: 'connected' },
  { name: 'Farrah Nasser', sub: 'Communication · new this week', streak: false, status: 'connected' },
  { name: 'Gustavo Rivas', sub: 'Business & fitness · 15-day streak', streak: true, status: 'connected' },
  { name: 'Ingrid Halvorsen', sub: 'Mindset & growth · practicing daily', streak: false, status: 'connected' },
  { name: 'Devon Pryce', sub: 'Social · 7-day streak', streak: true, status: 'connected' },
  { name: 'Amara Chidi', sub: 'Spirit & purpose · 40-day streak', streak: true, status: 'connected' },
  { name: 'Nathan Boyle', sub: 'Family · practicing daily', streak: false, status: 'connected' },
  { name: 'Sofia Marchetti', sub: 'Health & body · 17-day streak', streak: true, status: 'connected' },

  // ── they asked you ─────────────────────────────────────────────────────
  { name: 'Wesley Tran', sub: 'Career & purpose · 3 mutual connections', streak: true, status: 'incoming' },
  { name: 'Priscilla Achebe', sub: 'Relationships · 1 mutual connection', streak: false, status: 'incoming' },
  { name: 'Duncan Reid', sub: 'Fitness & health · 5 mutual connections', streak: true, status: 'incoming' },
  { name: 'Mei-Ling Chow', sub: 'Mindset & growth · 2 mutual connections', streak: false, status: 'incoming' },
  { name: 'Beatrice Owens', sub: 'Spirit & purpose · 4 mutual connections', streak: true, status: 'incoming' },

  // ── you asked them ─────────────────────────────────────────────────────
  { name: 'Hector Salinas', sub: 'Business · 2 mutual connections', streak: false, status: 'outgoing' },
  { name: 'Clara Bjornsen', sub: 'Emotions & creativity · 1 mutual connection', streak: true, status: 'outgoing' },
  { name: 'Terrence Udoh', sub: 'Communication · 6 mutual connections', streak: false, status: 'outgoing' },
  { name: 'Rosalind Pike', sub: 'Health & body · 3 mutual connections', streak: true, status: 'outgoing' },
];

/**
 * Comments are OUT of this version (Trevor, Sept 11) — Affirm is the only
 * interaction a post carries now. The `comments` field went with the UI rather
 * than lingering as dead data. See `UI-UX Backlog.md` if it comes back.
 */
export interface FeedItem {
  name: string; time: string;
  type: 'affirmation' | 'session' | 'medal' | 'daily';
  phrase: string; area?: string; text?: string; label?: string; detail?: string;
  pct?: number; affirms: number;
}

export const FEED_ITEMS: FeedItem[] = [
  { name: 'Marcus Hale', time: '12m', type: 'affirmation', phrase: 'wrote a new affirmation', area: 'Business', text: '“I lead my team with calm certainty, and the right clients find us.”', affirms: 4 },
  { name: 'Grace Okafor', time: '1h', type: 'session', phrase: 'closed a session ring', label: 'Session ring closed', detail: 'Morning session · 3 of 3 experiences', pct: 1, affirms: 7 },
  { name: 'Jon Castellano', time: '3h', type: 'medal', phrase: 'earned a progress medal', label: '30-day medal', detail: 'Thirty straight days of practice', affirms: 12 },
  { name: 'Sam Whitfield', time: '5h', type: 'daily', phrase: 'nearly closed the day', label: 'Daily ring at 85%', detail: '6 of 7 affirmations today', pct: 0.85, affirms: 3 },
  { name: 'Danielle Reyes', time: '1d', type: 'affirmation', phrase: 'wrote a new affirmation', area: 'Spiritual', text: '“I move through today unhurried, grateful, and led.”', affirms: 5 },
  { name: 'Tom Beckett', time: '1d', type: 'session', phrase: 'closed a session ring', label: 'Session ring closed', detail: 'Evening session · 3 of 3 experiences', pct: 1, affirms: 2 },
];

/**
 * 'request' = an incoming connection request, answerable in place.
 * The old 'comment' notifications went with the Feed's comment thread — a
 * notification for an action the app no longer offers is a dead end.
 */
export const NOTIFS = [
  { type: 'request', name: 'Wesley Tran', text: 'wants to connect with you.', time: '2m' },
  { type: 'like', name: 'Grace Okafor', text: 'encouraged your affirmation “I am a present father…”', time: '1h' },
  { type: 'request', name: 'Priscilla Achebe', text: 'wants to connect with you.', time: '3h' },
  { type: 'like', name: 'Jon Castellano', text: 'celebrated your 12-day streak.', time: '5h' },
  { type: 'request', name: 'Duncan Reid', text: 'wants to connect with you.', time: '1d' },
  { type: 'like', name: 'Amara Chidi', text: 'encouraged your affirmation “I am anchored in morning stillness…”', time: '1d' },
];

export const DISC_SUGGESTED = [
  { name: 'Jordan Ellis', sub: '2 mutual friends' },
  { name: 'Craig Judd', sub: 'Suggested for you', added: true },
  { name: 'Maya Lindqvist', sub: '1 mutual friend' },
  { name: 'Robert Nguyen', sub: 'Suggested for you' },
  { name: 'Braeden Spencer', sub: 'Suggested for you' },
];

/** Incoming requests surfaced in Discover — same two-way model as Friends. */
export const DISC_REQUESTS = [
  { name: 'Jess Abara', sub: 'Wants to connect' },
  { name: 'Modou Sonko', sub: 'Wants to connect' },
  { name: 'Shapour Azari', sub: 'Wants to connect' },
  { name: 'Lena Barnes', sub: 'Wants to connect' },
];

export const AVATAR_STYLES = [
  { bg: '#157A6E', ink: '#FAF4E8' }, { bg: '#E9B84C', ink: '#26201A' },
  { bg: '#26201A', ink: '#FAF4E8' }, { bg: '#EFE6D2', ink: '#26201A' },
  { bg: '#0E5A50', ink: '#FAF4E8' }, { bg: '#D9CBB0', ink: '#26201A' },
];

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('');
}

/** Profile photos — verbatim AVATARS map from the design bundle. Names without an entry render initials. */
export const AVATARS: Record<string, string> = {
  'Marcus Hale': 'https://randomuser.me/api/portraits/men/32.jpg',
  'Danielle Reyes': 'https://randomuser.me/api/portraits/women/65.jpg',
  'Sam Whitfield': 'https://randomuser.me/api/portraits/men/22.jpg',
  'Priya Natarajan': 'https://randomuser.me/api/portraits/women/47.jpg',
  'Jon Castellano': 'https://randomuser.me/api/portraits/men/76.jpg',
  'Grace Okafor': 'https://randomuser.me/api/portraits/women/26.jpg',
  'Tom Beckett': 'https://randomuser.me/api/portraits/men/41.jpg',
  'Alena Petrov': 'https://randomuser.me/api/portraits/women/33.jpg',
  'Jordan Ellis': 'https://randomuser.me/api/portraits/men/57.jpg',
  'Craig Judd': 'https://randomuser.me/api/portraits/men/11.jpg',
  'Maya Lindqvist': 'https://randomuser.me/api/portraits/women/58.jpg',
  'Robert Nguyen': 'https://randomuser.me/api/portraits/men/64.jpg',
  'Braeden Spencer': 'https://randomuser.me/api/portraits/men/86.jpg',
  'Jess Abara': 'https://randomuser.me/api/portraits/women/12.jpg',
  'Modou Sonko': 'https://randomuser.me/api/portraits/men/94.jpg',
  'Shapour Azari': 'https://randomuser.me/api/portraits/men/52.jpg',
  'Lena Barnes': 'https://randomuser.me/api/portraits/women/79.jpg',
  'Kellie Morton': 'https://randomuser.me/api/portraits/women/44.jpg',
  'Dre Walker': 'https://randomuser.me/api/portraits/men/17.jpg',
  'Robin Hale': 'https://randomuser.me/api/portraits/women/68.jpg',
  // Added with the bigger roster (Sept 11). Names left out on purpose fall
  // through to initials — a list where every single row has a photo looks
  // seeded, and the initial discs are a designed state, not a failure state.
  'Elena Vasquez': 'https://randomuser.me/api/portraits/women/8.jpg',
  'Desmond Clarke': 'https://randomuser.me/api/portraits/men/29.jpg',
  'Hannah Lindgren': 'https://randomuser.me/api/portraits/women/21.jpg',
  'Omar Haddad': 'https://randomuser.me/api/portraits/men/45.jpg',
  'Rachel Kim': 'https://randomuser.me/api/portraits/women/90.jpg',
  'Isaiah Brooks': 'https://randomuser.me/api/portraits/men/3.jpg',
  'Nadia Osei': 'https://randomuser.me/api/portraits/women/55.jpg',
  'Yuki Tanaka': 'https://randomuser.me/api/portraits/women/72.jpg',
  'Bianca Ferreira': 'https://randomuser.me/api/portraits/women/39.jpg',
  'Theo Almasi': 'https://randomuser.me/api/portraits/men/68.jpg',
  'Simone Dubois': 'https://randomuser.me/api/portraits/women/16.jpg',
  'Andre Whitlock': 'https://randomuser.me/api/portraits/men/85.jpg',
  'Malik Johnson': 'https://randomuser.me/api/portraits/men/50.jpg',
  'Gustavo Rivas': 'https://randomuser.me/api/portraits/men/14.jpg',
  'Amara Chidi': 'https://randomuser.me/api/portraits/women/61.jpg',
  'Sofia Marchetti': 'https://randomuser.me/api/portraits/women/30.jpg',
  'Wesley Tran': 'https://randomuser.me/api/portraits/men/7.jpg',
  'Priscilla Achebe': 'https://randomuser.me/api/portraits/women/83.jpg',
  'Duncan Reid': 'https://randomuser.me/api/portraits/men/39.jpg',
  'Mei-Ling Chow': 'https://randomuser.me/api/portraits/women/49.jpg',
  'Beatrice Owens': 'https://randomuser.me/api/portraits/women/5.jpg',
  'Hector Salinas': 'https://randomuser.me/api/portraits/men/60.jpg',
  'Clara Bjornsen': 'https://randomuser.me/api/portraits/women/24.jpg',
  'Terrence Udoh': 'https://randomuser.me/api/portraits/men/23.jpg',
  'Rosalind Pike': 'https://randomuser.me/api/portraits/women/7.jpg',
};

export const INVITES = [
  { name: 'Kellie Morton', sub: 'Invited you 3 days ago' },
  { name: 'Dre Walker', sub: 'Invited you 1 week ago' },
  { name: 'Robin Hale', sub: 'Invited you today' },
];

/** Per-screen avatar fallback palettes (design uses a different rotation per list). */
export const FRIEND_AVATAR_STYLES = [
  { bg: '#157A6E', ink: '#FAF4E8' }, { bg: '#EFE6D2', ink: '#26201A' },
  { bg: '#E9B84C', ink: '#26201A' }, { bg: '#26201A', ink: '#FAF4E8' },
  { bg: '#0E5A50', ink: '#FAF4E8' }, { bg: '#D9CBB0', ink: '#26201A' },
];
export const INVITE_AVATAR_STYLES = [
  { bg: '#D9CBB0', ink: '#26201A' }, { bg: '#0E5A50', ink: '#FAF4E8' }, { bg: '#E9B84C', ink: '#26201A' },
];

/** Discover-people avatar rotation (design mapDiscover; follow-back list offsets by 3). */
export const DISCOVER_AVATAR_STYLES = [
  { bg: '#EFE6D2', ink: '#26201A' }, { bg: '#157A6E', ink: '#FAF4E8' },
  { bg: '#D9CBB0', ink: '#26201A' }, { bg: '#E9B84C', ink: '#26201A' },
  { bg: '#0E5A50', ink: '#FAF4E8' }, { bg: '#26201A', ink: '#FAF4E8' },
];
