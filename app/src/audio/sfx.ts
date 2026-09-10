/**
 * Celebration sound effects (synthesized in tools/make_celebration_sounds.py).
 * - large: "all-seven-b" chord bloom — home-load confetti + all big celebrations
 * - small: "streak-b" two-note flame — individual ring-close stars
 *
 * expo-audio's default iOS audio mode does NOT play in silent mode, so the
 * hardware mute switch is respected without extra setup. Players are created
 * lazily and reused; failures are swallowed (sound is garnish, never a crash).
 *
 * REPLAY CORRECTNESS (fixed Sept 9, 2026 — Trevor: "some of the chimes on the
 * conversation intake are not firing"): expo-audio's seekTo() is ASYNC. The old
 * code called seekTo(0) and play() back to back, so only the FIRST play of a
 * given player was reliable — every later one started while the player was still
 * parked at the end of the previous playback and produced silence. The intake
 * fires the small chime seven times in a row (one per life area), so that's
 * where it was most obvious. The rewind is now awaited before play().
 */
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * Haptics ride along with every chime (trial feature, Aug 21 — flip this
 * to false to silence all vibration in one place if Trevor cuts it).
 * small = light tap · large = "success" double-pulse.
 */
const HAPTICS_ENABLED = true;

let large: AudioPlayer | null = null;
let small: AudioPlayer | null = null;

function player(which: 'large' | 'small'): AudioPlayer {
  if (which === 'large') {
    if (!large) large = createAudioPlayer(require('../../assets/sounds/celebration-large.wav'));
    return large;
  }
  if (!small) small = createAudioPlayer(require('../../assets/sounds/celebration-small.wav'));
  return small;
}

/**
 * Create both players up front so the first chime of a screen isn't waiting on
 * asset load. Safe to call repeatedly — players are cached.
 */
export function primeCelebrationSounds(): void {
  try { player('large'); player('small'); } catch { /* garnish */ }
}

async function playSfx(which: 'large' | 'small'): Promise<void> {
  if (HAPTICS_ENABLED) {
    // These return promises — a sync try/catch would miss a rejection, so catch
    // on the promise itself. Haptics failing must never affect the sound.
    const buzz = which === 'large'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Promise.resolve(buzz).catch(() => { /* haptics unavailable */ });
  }
  try {
    const p = player(which);
    if (p.playing) p.pause();          // re-triggered mid-chime: restart cleanly
    await p.seekTo(0).catch(() => { /* unloaded player is already at 0 */ });
    p.play();
  } catch {
    // no-op: never let a sound failure break a celebration
  }
}

export const playCelebrationLarge = () => { void playSfx('large'); };
export const playCelebrationSmall = () => { void playSfx('small'); };
