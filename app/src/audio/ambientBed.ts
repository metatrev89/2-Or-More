/**
 * Ambient chakra beds for the 2+ audio player.
 *
 * One looping crystal-bowl bed per life area, tuned to that chakra's Solfeggio
 * frequency. Plays underneath the affirmation voice; crossfades when the player
 * moves to an affirmation in a different area.
 *
 * Assets live in app/assets/audio/beds/. Keys match LifeArea (theme.ts AREAS
 * + open_capture).
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type BedKey =
  | 'health_body'
  | 'emotions_creativity'
  | 'career_purpose'
  | 'relationships_love'
  | 'communication_expression'
  | 'mindset_growth'
  | 'spirit_purpose'
  | 'open_capture';

const SOURCES: Record<BedKey, number> = {
  health_body: require('../../assets/audio/beds/bed-health_body-396hz.m4a'),
  emotions_creativity: require('../../assets/audio/beds/bed-emotions_creativity-417hz.m4a'),
  career_purpose: require('../../assets/audio/beds/bed-career_purpose-528hz.m4a'),
  relationships_love: require('../../assets/audio/beds/bed-relationships_love-639hz.m4a'),
  communication_expression: require('../../assets/audio/beds/bed-communication_expression-741hz.m4a'),
  mindset_growth: require('../../assets/audio/beds/bed-mindset_growth-852hz.m4a'),
  spirit_purpose: require('../../assets/audio/beds/bed-spirit_purpose-963hz.m4a'),
  open_capture: require('../../assets/audio/beds/bed-open_capture-blend.m4a'),
};

export const BED_ENABLED = true;
const BED_VOLUME = 0.22;      // level under the voice — tune by ear on device
const FADE_MS = 1400;         // in/out and crossfade time
const FADE_STEP_MS = 60;

/**
 * Escape hatch, deliberately NOT wired to `store.chimesMuted` — that toggle is
 * about ring-completion chimes, and someone who silenced those may still want
 * the bed (or the reverse). A UI for choosing/disabling beds is deferred
 * (Trevor, Sept 21: play them automatically for now), so this exists to switch
 * them off in one place if they prove distracting on device.
 */
let muted = false;
export function setBedMuted(v: boolean): void {
  muted = v;
  if (v) pauseBed();
}

const players = new Map<BedKey, AudioPlayer>();
const fades = new Map<BedKey, ReturnType<typeof setInterval>>();
let current: BedKey | null = null;

/**
 * Bed keys in AREAS order (root → crown), with the catch-all last.
 *
 * REQUIRED because `AffirmationDTO.area` carries the DISPLAY LABEL — "Health &
 * Body", not `health_body`. Passing that straight to `isBedKey` fails every
 * lookup and the whole feature silently plays nothing, which is exactly the
 * kind of miss that looks like "the audio didn't work" rather than a bug.
 *
 * Index-aligned with `AREAS`/`AREA_ACCENTS` in theme.ts and with the backend's
 * `LIFE_AREAS` — the same contract those already depend on, so if that order
 * ever changes this moves with it.
 */
const BED_KEYS: BedKey[] = [
  'health_body',
  'emotions_creativity',
  'career_purpose',
  'relationships_love',
  'communication_expression',
  'mindset_growth',
  'spirit_purpose',
];

/** Display labels, mirroring AREA_LABELS in api/client.ts. */
const LABEL_TO_KEY: Record<string, BedKey> = {
  'Health & Body': 'health_body',
  'Emotions & Creativity': 'emotions_creativity',
  'Career, Purpose & Power': 'career_purpose',
  'Relationships & Love': 'relationships_love',
  'Communication & Expression': 'communication_expression',
  'Mindset, Vision & Growth': 'mindset_growth',
  'Spirit & Purpose': 'spirit_purpose',
  'Anything Else': 'open_capture',
};

function isBedKey(k: string | null | undefined): k is BedKey {
  return !!k && k in SOURCES;
}

/**
 * Accepts whatever an area happens to be at the call site — the snake_case
 * key, the display label, or the numeric index — and returns a bed key.
 *
 * Deliberately permissive: three different representations of "which area" are
 * already in circulation (backend key, display label, AREAS index), and a bed
 * that silently doesn't play is worse than one that resolves loosely.
 */
export function bedKeyFor(area: string | number | null | undefined): BedKey | null {
  if (typeof area === 'number') return BED_KEYS[area] ?? null;
  if (!area) return null;
  if (isBedKey(area)) return area;
  return LABEL_TO_KEY[area] ?? null;
}

function getPlayer(key: BedKey): AudioPlayer {
  let p = players.get(key);
  if (!p) {
    p = createAudioPlayer(SOURCES[key]);
    p.loop = true;
    p.volume = 0;
    players.set(key, p);
  }
  return p;
}

function fadeTo(key: BedKey, target: number, done?: () => void) {
  const p = getPlayer(key);
  const existing = fades.get(key);
  if (existing) clearInterval(existing);

  const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
  const delta = (target - p.volume) / steps;
  let i = 0;

  const id = setInterval(() => {
    i += 1;
    const next = i >= steps ? target : p.volume + delta;
    try {
      p.volume = Math.max(0, Math.min(1, next));
    } catch {
      // player was released mid-fade
    }
    if (i >= steps) {
      clearInterval(id);
      fades.delete(key);
      done?.();
    }
  }, FADE_STEP_MS);

  fades.set(key, id);
}

/** Start the bed for `area`, or crossfade to it if a different bed is playing. */
export function playBed(area: string | number | null | undefined) {
  if (!BED_ENABLED || muted) return;
  const key = bedKeyFor(area);
  if (!key) return;
  if (current === key) {
    const p = getPlayer(key);
    if (!p.playing) p.play();
    fadeTo(key, BED_VOLUME);
    return;
  }

  const previous = current;
  current = key;

  const next = getPlayer(key);
  try {
    next.play();
  } catch {
    return;
  }
  fadeTo(key, BED_VOLUME);

  if (previous && previous !== key) {
    fadeTo(previous, 0, () => {
      const p = players.get(previous);
      if (p && current !== previous) p.pause();
    });
  }
}

/** Fade the bed down and pause it — for the player's pause button. */
export function pauseBed() {
  if (!current) return;
  const key = current;
  fadeTo(key, 0, () => {
    const p = players.get(key);
    if (p && current === key) p.pause();
  });
}

/** Resume whatever bed was last active (after pause). */
export function resumeBed() {
  if (!current) return;
  const p = getPlayer(current);
  if (!p.playing) p.play();
  fadeTo(current, BED_VOLUME);
}

/** Fade out and release everything — call when leaving the player screen. */
export function stopBed() {
  const keys = Array.from(players.keys());
  current = null;
  keys.forEach((key) => {
    fadeTo(key, 0, () => {
      const p = players.get(key);
      if (!p) return;
      try {
        p.pause();
        p.remove();
      } catch {
        // already released
      }
      players.delete(key);
    });
  });
}

/** Optional: duck the bed further during a spoken line, then bring it back. */
export function duckBed(ducked: boolean) {
  if (!current) return;
  fadeTo(current, ducked ? BED_VOLUME * 0.55 : BED_VOLUME);
}
