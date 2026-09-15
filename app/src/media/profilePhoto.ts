import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Profile photo capture + storage, in one place (Trevor, Sept 14).
 *
 * This existed three times — ProfileScreen, CreationScreen, IntakeScreen — and
 * each copy had a different subset of the same two bugs:
 *
 *   1. THE FIRST ATTEMPT SILENTLY FAILED. On iOS the permission alert is still
 *      animating away when `launchCameraAsync` tries to present, and presenting
 *      a view controller over a dismissing one fails — the promise just resolves
 *      `canceled: true`. The second attempt worked because permission was
 *      already granted, so there was no alert to collide with. Fixed by checking
 *      permission first, only prompting when it's actually undetermined, and
 *      letting the alert settle before presenting.
 *
 *   2. THE PHOTO VANISHED ON RESTART. The picker hands back a URI inside its
 *      own cache, which iOS is free to purge. CreationScreen and IntakeScreen
 *      stored that cache URI verbatim, so a photo set during onboarding — the
 *      main path — was living on borrowed time. ProfileScreen did copy the file
 *      into Documents, but stored the ABSOLUTE path, and on iOS the container
 *      UUID in that path changes on update/reinstall, so the saved string goes
 *      stale even though the file is fine. We store the BASENAME and rebuild the
 *      absolute path at read time.
 *
 * Same lesson as the voice recordings (Sept 11): anything the user creates has
 * to be moved out of the cache and addressed by a name, not by a path.
 */

/** Written to Documents root, not a subdirectory, so legacy files still resolve. */
const PREFIX = 'profile-photo-';

/** Milliseconds to let the permission alert finish dismissing. See note 1. */
const ALERT_SETTLE_MS = 400;

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export type PhotoSource = 'camera' | 'library';

/** Absolute URI for a stored basename — rebuilt every launch, never persisted. */
export function resolvePhotoName(name: string): string {
  return `${FileSystem.documentDirectory}${name}`;
}

/** Basename of a URI, so a legacy absolute path migrates without extra code. */
export function photoNameFrom(uri: string): string {
  return uri.split('/').pop() || uri;
}

/**
 * Ask for the permission this source needs, and DON'T return until the system
 * alert is gone. Returns false only when the user actually refused.
 */
async function ensurePermission(source: PhotoSource): Promise<boolean> {
  const current = source === 'camera'
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const asked = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!asked.granted) return false;

  // Permission was just granted, which means an alert was just on screen.
  // Presenting the picker now is the exact race that ate the first attempt.
  await wait(ALERT_SETTLE_MS);
  return true;
}

/** Copy out of the picker's cache into Documents. Returns the stored basename. */
export async function persistPickedPhoto(srcUri: string): Promise<string> {
  const name = `${PREFIX}${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: srcUri, to: resolvePhotoName(name) });
  return name;
}

export interface PickResult {
  /** Basename to persist; absolute URI is rebuilt from it. */
  name: string;
  uri: string;
}

/**
 * Full capture flow. Returns null when the user cancelled or refused
 * permission — callers should treat those the same way (do nothing).
 *
 * `settleMs` lets a caller wait out its own closing sheet before the picker
 * presents, for the same reason the permission alert needs to settle.
 */
export async function pickProfilePhoto(
  source: PhotoSource,
  // `facing` defaults to the front camera because the common caller is a
  // profile selfie; the intake attach flow wants the rear one.
  opts: { allowsEditing?: boolean; settleMs?: number; facing?: 'front' | 'back' } = {},
): Promise<PickResult | null> {
  if (opts.settleMs) await wait(opts.settleMs);
  if (!(await ensurePermission(source))) return null;

  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ quality: 0.8, cameraType: opts.facing ?? 'front', allowsEditing: opts.allowsEditing })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: opts.allowsEditing });

  const uri = res.assets?.[0]?.uri;
  if (!uri) return null;

  try {
    const name = await persistPickedPhoto(uri);
    return { name, uri: resolvePhotoName(name) };
  } catch {
    // Copy failed — still show it this session rather than losing the capture,
    // but store the basename so hydrate's existence check drops it cleanly.
    return { name: photoNameFrom(uri), uri };
  }
}

/** True when a stored basename still points at a real file. */
export async function photoExists(name: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(resolvePhotoName(name));
    return info.exists;
  } catch {
    return false;
  }
}

/** Whether the user refused permission, for the caller's alert copy. */
export async function permissionRefused(source: PhotoSource): Promise<boolean> {
  const p = source === 'camera'
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync();
  return !p.granted;
}
