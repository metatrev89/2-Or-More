/**
 * User voice recordings — capture, storage, lookup.
 *
 * VOICE POLICY (v1, Sept 2026): there is NO cloning. A recording is stored
 * media and nothing else — it is played back exactly as recorded, never
 * analyzed, never feature-extracted, never sent to an AI vendor. That is what
 * keeps 2+ outside the BIPA voiceprint regime by design rather than by consent
 * management. Do not add analysis of these files without reopening legal review.
 *
 * Because there is no clone to synthesize from, playback IS the recording —
 * so we capture ONE file per affirmation, keyed by affirmation id. Anything the
 * user skips falls back to the preset AI voice (Trevor, Sept 11).
 */
import { AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

/** Where finished recordings live. Recorder output is a cache temp file. */
const VOICE_DIR = `${FileSystem.documentDirectory}voice/`;

export const RECORDING_OPTIONS = RecordingPresets.HIGH_QUALITY;

/** Ask for the mic once. Returns false if the user declined. */
export async function ensureMicPermission(): Promise<boolean> {
  try {
    const res = await AudioModule.requestRecordingPermissionsAsync();
    return !!res.granted;
  } catch {
    return false;
  }
}

/**
 * iOS records silently unless the audio session allows it. Call before record()
 * and pass playsInSilentMode so a muted phone can still monitor playback.
 */
export async function enterRecordingMode(): Promise<void> {
  try {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  } catch { /* non-fatal: recording may still work */ }
}

/** Hand the audio session back so celebration chimes behave normally after. */
export async function exitRecordingMode(): Promise<void> {
  try {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
  } catch { /* non-fatal */ }
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(VOICE_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VOICE_DIR, { intermediates: true });
}

/**
 * Move a finished recording out of the cache into permanent app storage.
 * Returns the durable file:// uri. The recorder's own uri is temporary and can
 * be reclaimed by the OS, so this must run before we persist anything.
 */
export async function saveRecording(tempUri: string, affirmationId: string): Promise<string> {
  await ensureDir();
  // New filename per take so a re-record never collides with a cached player.
  const ext = tempUri.split('.').pop()?.split('?')[0] || 'm4a';
  const dest = `${VOICE_DIR}${safeId(affirmationId)}-${Date.now()}.${ext}`;
  await FileSystem.moveAsync({ from: tempUri, to: dest });
  return dest;
}

/** Delete a recording file; missing files are not an error. */
export async function deleteRecording(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch { /* already gone */ }
}

/** Affirmation ids are uuids or mock ids; keep the filename filesystem-safe. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '');
}

/** Seconds -> "0:07", for the live recording timer. */
export function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
