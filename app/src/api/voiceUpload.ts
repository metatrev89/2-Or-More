/**
 * Voice recording sync — local file -> Supabase Storage (bucket
 * `voice-recordings`, migration 0005).
 *
 * The local file is the source of truth for playback; this upload exists so a
 * reinstall or a new device doesn't lose the user's voice. Every call is
 * best-effort: a failure leaves the local recording untouched and simply
 * doesn't sync, because losing a take the user just made is far worse than
 * being out of sync for a while.
 *
 * VOICE POLICY: stored media only. The file is uploaded, stored, and played
 * back — never analyzed, never feature-extracted, never sent to an AI vendor.
 * No voiceprint is derived (no cloning in v1). Don't add processing here
 * without reopening the BIPA review.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { isLiveMode, supabase } from './supabase';

const BUCKET = 'voice-recordings';

/**
 * Minimal base64 -> bytes. supabase-js can't take a React Native file path, and
 * fetch().arrayBuffer() on file:// is unreliable on Android, so we read the
 * file as base64 and hand over the raw bytes. Kept inline to avoid pulling in a
 * dependency for ~15 lines.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]!);
    const c1 = B64.indexOf(clean[i + 1]!);
    const c2 = B64.indexOf(clean[i + 2]!);
    const c3 = B64.indexOf(clean[i + 3]!);
    const n = (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3);
    if (p < len) out[p++] = (n >> 16) & 0xff;
    if (p < len && c2 >= 0) out[p++] = (n >> 8) & 0xff;
    if (p < len && c3 >= 0) out[p++] = n & 0xff;
  }
  return out;
}

function contentTypeFor(uri: string): string {
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'caf') return 'audio/x-caf';
  return 'audio/mp4'; // .m4a — expo-audio's HIGH_QUALITY default
}

/**
 * Upload one recording. Returns the storage path on success, null otherwise.
 * The path always begins with the user's id, which is what the RLS policies
 * on storage.objects check.
 */
export async function uploadVoiceRecording(localUri: string, affirmationId: string): Promise<string | null> {
  if (!isLiveMode) return null; // mock mode: nothing to sync to
  try {
    const { data } = await supabase().auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return null; // signed out — the local file still plays

    const b64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = base64ToBytes(b64);
    if (!bytes.length) return null;

    const ext = localUri.split('.').pop()?.split('?')[0] || 'm4a';
    const path = `${userId}/${affirmationId}.${ext}`;

    const { error } = await supabase().storage.from(BUCKET).upload(path, bytes, {
      contentType: contentTypeFor(localUri),
      upsert: true, // re-records replace the previous take
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

/** Remove a synced recording (used when a take is deleted). Best-effort. */
export async function deleteVoiceRecording(path: string): Promise<void> {
  if (!isLiveMode) return;
  try {
    await supabase().storage.from(BUCKET).remove([path]);
  } catch { /* best-effort */ }
}

/**
 * Signed URL for playing a synced recording on a device that doesn't have the
 * local file (fresh install). Short-lived by design — the bucket is private.
 */
export async function signedVoiceUrl(path: string, expiresInSec = 3600): Promise<string | null> {
  if (!isLiveMode) return null;
  try {
    const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, expiresInSec);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
