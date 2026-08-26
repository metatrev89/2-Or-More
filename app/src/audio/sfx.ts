/**
 * Celebration sound effects (synthesized in tools/make_celebration_sounds.py).
 * - large: "all-seven-b" chord bloom — home-load confetti + all big celebrations
 * - small: "streak-b" two-note flame — individual ring-close stars
 *
 * expo-audio's default iOS audio mode does NOT play in silent mode, so the
 * hardware mute switch is respected without extra setup. Players are created
 * lazily and reused; failures are swallowed (sound is garnish, never a crash).
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

function play(which: 'large' | 'small') {
  if (HAPTICS_ENABLED) {
    try {
      if (which === 'large') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* haptics unavailable — sound still plays */ }
  }
  try {
    if (which === 'large') {
      if (!large) large = createAudioPlayer(require('../../assets/sounds/celebration-large.wav'));
      large.seekTo(0);
      large.play();
    } else {
      if (!small) small = createAudioPlayer(require('../../assets/sounds/celebration-small.wav'));
      small.seekTo(0);
      small.play();
    }
  } catch {
    // no-op: never let a sound failure break a celebration
  }
}

export const playCelebrationLarge = () => play('large');
export const playCelebrationSmall = () => play('small');
