import { Platform } from 'react-native';
import { requestNotificationPermissionsAsync, setAudioModeAsync } from 'expo-audio';

/**
 * The one place the global audio session is configured for PLAYBACK
 * (Trevor, Sept 15 — "can I use the player when the screen locks?").
 *
 * Three settings, each load-bearing:
 *
 * - `shouldPlayInBackground` keeps the session alive when the app leaves the
 *   foreground. This is the setting that makes locking the screen not stop the
 *   audio — but it only works if the BINARY declares the audio background mode,
 *   which is a build-time capability, not something JS can turn on. See the
 *   note on Expo Go at the bottom.
 * - `interruptionMode: 'doNotMix'` is REQUIRED for lock-screen controls; the
 *   docs are explicit that without exclusive focus the OS may not associate the
 *   controls with our player. It also means other audio pauses when a session
 *   starts, which is right for this app: an affirmation is not background music.
 * - `playsInSilentMode` makes deliberate playback behave like every other media
 *   app — the ringer switch silences notifications, not the thing you pressed
 *   play on. NOTE the side effect: celebration chimes now also ignore the
 *   silent switch, which is why the mute toggle added the same day matters.
 *
 * Recording flips `allowsRecording` on and must hand the session back through
 * `restorePlaybackMode()` — NOT by setting the flags to false, which is what it
 * used to do and which would quietly undo background playback.
 */
export async function configureForPlayback(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
    });
  } catch { /* non-fatal: playback still works foreground-only */ }
}

/** Alias with intent at the call site — recording is the thing that disturbed it. */
export const restorePlaybackMode = configureForPlayback;

/**
 * Android shows lock-screen/notification controls through a media notification,
 * which needs POST_NOTIFICATIONS. Harmless no-op elsewhere — the function
 * throws on non-Android, so it's guarded rather than caught.
 */
export async function ensureMediaNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try { await requestNotificationPermissionsAsync(); } catch { /* controls degrade, playback still works */ }
}
