/** Social mock data — verbatim from the design bundle. Replaced by the social API when backend social lands. */

export const FRIENDS = [
  { name: 'Marcus Hale', sub: 'Business & fitness · 21-day streak', pending: true, streak: true, followsYou: true },
  { name: 'Danielle Reyes', sub: 'Spiritual · practicing daily', pending: true, streak: false, followsYou: true },
  { name: 'Sam Whitfield', sub: 'Family · 12-day streak', pending: false, streak: true, followsYou: true },
  { name: 'Priya Natarajan', sub: 'Financial · new this week', pending: false, streak: false, followsYou: false },
  { name: 'Jon Castellano', sub: 'Fitness & health · 34-day streak', pending: false, streak: true, followsYou: true },
  { name: 'Grace Okafor', sub: 'Relationships · practicing daily', pending: false, streak: false, followsYou: false },
  { name: 'Tom Beckett', sub: 'Social · 8-day streak', pending: false, streak: true, followsYou: true },
  { name: 'Alena Petrov', sub: 'Spiritual · 5-day streak', pending: false, streak: false, followsYou: false },
];

export interface FeedItem {
  name: string; time: string;
  type: 'affirmation' | 'session' | 'medal' | 'daily';
  phrase: string; area?: string; text?: string; label?: string; detail?: string;
  pct?: number; affirms: number;
  comments: { name: string; text: string }[];
}

export const FEED_ITEMS: FeedItem[] = [
  { name: 'Marcus Hale', time: '12m', type: 'affirmation', phrase: 'wrote a new affirmation', area: 'Business', text: '“I lead my team with calm certainty, and the right clients find us.”', affirms: 4, comments: [{ name: 'Grace Okafor', text: 'Speaking this one with you.' }] },
  { name: 'Grace Okafor', time: '1h', type: 'session', phrase: 'closed a session ring', label: 'Session ring closed', detail: 'Morning session · 3 of 3 experiences', pct: 1, affirms: 7, comments: [] },
  { name: 'Jon Castellano', time: '3h', type: 'medal', phrase: 'earned a progress medal', label: '30-day medal', detail: 'Thirty straight days of practice', affirms: 12, comments: [{ name: 'Sam Whitfield', text: 'A machine. Congrats, Jon.' }] },
  { name: 'Sam Whitfield', time: '5h', type: 'daily', phrase: 'nearly closed the day', label: 'Daily ring at 85%', detail: '6 of 7 affirmations today', pct: 0.85, affirms: 3, comments: [] },
  { name: 'Danielle Reyes', time: '1d', type: 'affirmation', phrase: 'wrote a new affirmation', area: 'Spiritual', text: '“I move through today unhurried, grateful, and led.”', affirms: 5, comments: [] },
  { name: 'Tom Beckett', time: '1d', type: 'session', phrase: 'closed a session ring', label: 'Session ring closed', detail: 'Evening session · 3 of 3 experiences', pct: 1, affirms: 2, comments: [] },
];

export const NOTIFS = [
  { type: 'request', name: 'Marcus Hale', text: 'sent you a friend request.', time: '2m' },
  { type: 'like', name: 'Grace Okafor', text: 'encouraged your affirmation “I am a present father…”', time: '1h' },
  { type: 'comment', name: 'Sam Whitfield', text: 'commented on your post: “This one hit home.”', time: '3h' },
  { type: 'like', name: 'Jon Castellano', text: 'celebrated your 12-day streak.', time: '5h' },
  { type: 'request', name: 'Danielle Reyes', text: 'sent you a friend request.', time: '1d' },
];

export const DISC_SUGGESTED = [
  { name: 'Jordan Ellis', sub: '2 mutual friends' },
  { name: 'Craig Judd', sub: 'Suggested for you', added: true },
  { name: 'Maya Lindqvist', sub: '1 mutual friend' },
  { name: 'Robert Nguyen', sub: 'Suggested for you' },
  { name: 'Braeden Spencer', sub: 'Suggested for you' },
];

export const DISC_FOLLOWBACK = [
  { name: 'Jess Abara', sub: 'Added you' },
  { name: 'Modou Sonko', sub: 'Added you' },
  { name: 'Shapour Azari', sub: 'Added you' },
  { name: 'Lena Barnes', sub: 'Added you' },
];

export const AVATAR_STYLES = [
  { bg: '#157A6E', ink: '#FAF4E8' }, { bg: '#E9B84C', ink: '#26201A' },
  { bg: '#26201A', ink: '#FAF4E8' }, { bg: '#EFE6D2', ink: '#26201A' },
  { bg: '#0E5A50', ink: '#FAF4E8' }, { bg: '#D9CBB0', ink: '#26201A' },
];

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('');
}
