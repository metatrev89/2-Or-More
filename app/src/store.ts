/**
 * App state — a zustand mirror of the design prototype's state machine,
 * organized by domain. Screens read/write this; the API layer syncs it.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AffirmationDTO } from './api/client';

export type OnboardingScreen =
  | 'intro' | 'signup' | 'email' | 'intake' | 'build'
  | 'review' | 'schedule' | 'paywall' | 'creation';

interface Msg { isAi: boolean; text: string; photoUri?: string }

interface State {
  // onboarding
  introStep: number;
  emailMode: 'signup' | 'signin';
  msgs: Msg[];
  scriptIdx: number;
  areaIdx: number;
  typing: boolean;
  listening: boolean;
  intakeDone: boolean;
  affirmations: AffirmationDTO[];
  reworded: Record<number, boolean>;
  edits: Record<number, string>;
  reviewIndex: number;
  // schedule
  schedPlan: 'prime' | 'custom';
  freq: number;
  awStart: number; awEnd: number; qStart: number; qEnd: number;
  // paywall / creation
  payPlan: 'annual' | 'monthly';
  voiceSel: 'aria' | 'james' | 'own' | null;
  recState: 'idle' | 'recording' | 'done';
  profilePhotoUri: string | null;
  // daily practice
  userName: string;
  welcome: boolean; // day-one banner on Home, set when entering from creation
  streakDays: number;
  homeReadDone: number[];
  movieWatched: number[];
  moods: Record<string, number>; // sessionKey -> 0 disconnected | 1 aligning | 2 aligned
  audioSpeed: number;
  // social (design scope — mock-backed until social backend lands)
  feedAffirmed: Record<number, boolean>;
  shareSel: Record<string, boolean>;
  // actions
  set: (partial: Partial<State>) => void;
  addMsg: (m: Msg) => void;
  completeCard: (i: number) => void;
  recordMood: (sessionKey: string, mood: number) => void;
  setSpeed: (v: number) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  introStep: 0,
  emailMode: 'signup',
  msgs: [],
  scriptIdx: 0,
  areaIdx: 0,
  typing: false,
  listening: false,
  intakeDone: false,
  affirmations: [],
  reworded: {},
  edits: {},
  reviewIndex: 0,
  schedPlan: 'prime',
  freq: 6,
  awStart: 7, awEnd: 22, qStart: 22, qEnd: 7,
  payPlan: 'annual',
  voiceSel: null,
  recState: 'idle',
  profilePhotoUri: null,
  userName: 'Trevor',
  welcome: false,
  streakDays: 12,
  homeReadDone: [],
  movieWatched: [],
  moods: {},
  audioSpeed: 1,
  feedAffirmed: {},
  shareSel: {},

  set: (partial) => set(partial),
  addMsg: (m) => set({ msgs: [...get().msgs, m] }),

  completeCard: (i) => {
    const done = get().homeReadDone;
    if (!done.includes(i)) set({ homeReadDone: [...done, i] });
  },

  recordMood: (sessionKey, mood) => set({ moods: { ...get().moods, [sessionKey]: mood } }),

  setSpeed: async (v) => {
    const clamped = Math.round(Math.min(2.5, Math.max(0.5, v)) * 100) / 100;
    set({ audioSpeed: clamped });
    await AsyncStorage.setItem('twoplus_audio_speed', String(clamped));
  },

  hydrate: async () => {
    const sp = await AsyncStorage.getItem('twoplus_audio_speed');
    if (sp) {
      const v = parseFloat(sp);
      if (!isNaN(v) && v >= 0.5 && v <= 2.5) set({ audioSpeed: v });
    }
  },
}));

/** Text for affirmation i respecting edits > reword > original (design's currentAff). */
export function affText(s: Pick<State, 'affirmations' | 'edits' | 'reworded'>, i: number): string {
  const a = s.affirmations[i];
  if (!a) return '';
  return s.edits[i] ?? (s.reworded[i] ? a.alt : a.statement);
}
