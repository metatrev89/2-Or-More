/**
 * Resolving an affirmation to something actually playable.
 *
 * v1 has exactly one audio source: the user's own recording. Preset AI voices
 * (Fish TTS) are not wired yet — PROVIDER_TTS is still "mock" — so an
 * affirmation the user hasn't recorded has NO audio, and the UI must say so
 * rather than pretend to play silence.
 *
 * Lookup order:
 *   1. Local file from this device (instant, works offline)
 *   2. Signed URL from Supabase Storage (a reinstall or a second device)
 *   3. null — nothing recorded yet
 */
import * as FileSystem from 'expo-file-system/legacy';
import { signedVoiceUrl } from '../api/voiceUpload';
import { isLiveMode, supabase } from '../api/supabase';

/** Signed URLs are short-lived; cache per session so playback doesn't re-sign. */
const urlCache = new Map<string, { url: string; at: number }>();
const URL_TTL_MS = 45 * 60 * 1000; // refresh well inside the 1h signature

/** True if the local file is still on disk — cached URIs can go stale. */
async function localExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Playable source for one affirmation, or null when nothing is recorded.
 * `localUri` comes from the store's voiceRecordings map.
 */
export async function resolveAudioSource(
  affirmationId: string,
  localUri: string | undefined,
): Promise<string | null> {
  if (localUri && await localExists(localUri)) return localUri;

  const cached = urlCache.get(affirmationId);
  if (cached && Date.now() - cached.at < URL_TTL_MS) return cached.url;

  if (!isLiveMode) return null;
  try {
    const { data } = await supabase().auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return null;
    // Uploads are keyed <user-id>/<affirmation-id>.<ext> (migration 0005).
    for (const ext of ['m4a', 'mp4', 'wav', 'caf']) {
      const url = await signedVoiceUrl(`${userId}/${affirmationId}.${ext}`);
      if (url) {
        urlCache.set(affirmationId, { url, at: Date.now() });
        return url;
      }
    }
  } catch { /* fall through to null */ }
  return null;
}

/** Resolve a whole set at once, preserving order. Nulls mean "not recorded". */
export async function resolveAudioSources(
  items: { id: string }[],
  recordings: Record<string, string>,
): Promise<(string | null)[]> {
  return Promise.all(items.map(a => resolveAudioSource(a.id, recordings[a.id])));
}

/** Drop a cached signed URL (after a re-record replaces the file). */
export function invalidateAudioUrl(affirmationId: string): void {
  urlCache.delete(affirmationId);
}
