/**
 * Auth service (Stage 2). Live mode talks to Supabase Auth; mock mode
 * (no env config) succeeds instantly so the design flow keeps working.
 * Apple/Google SSO stays stubbed until Stage 3 native builds.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLiveMode, supabase } from './supabase';

/** Project ref parsed from the Supabase URL — used for the local session storage key. */
const projectRef = (() => {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
  return m?.[1];
})();

export type AuthOutcome =
  | { ok: true; needsEmailConfirm?: boolean; displayName?: string }
  | { ok: false; message: string };

const OFFLINE_MSG = "Couldn't reach the server. Check your connection and try again.";

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthOutcome> {
  if (!isLiveMode) return { ok: true };
  try {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) return { ok: false, message: error.message };
    if (data.session && data.user) {
      // RLS "own profile" (FOR ALL, auth.uid() = id) permits this self-insert.
      await supabase().from('profiles').upsert({ id: data.user.id, display_name: name });
      return { ok: true };
    }
    // Email confirmation enabled on the project: user exists, no session yet.
    return { ok: true, needsEmailConfirm: true };
  } catch {
    return { ok: false, message: OFFLINE_MSG };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthOutcome> {
  if (!isLiveMode) return { ok: true };
  try {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    return { ok: true, displayName: (data.user?.user_metadata?.display_name as string) || undefined };
  } catch {
    return { ok: false, message: OFFLINE_MSG };
  }
}

/**
 * App-launch session restore — LOCAL ONLY, never blocks on network.
 *
 * Aug fix: getSession() refreshes expired tokens over the network, and a slow
 * or paused Supabase project turned that into a 30-45s blank-screen hang on
 * cold open. Now we read supabase-js's persisted session straight from
 * AsyncStorage (instant), route optimistically, and let the client refresh
 * the token in the background. If the refresh ultimately fails, API calls
 * error and the user can sign in again — but launch is always instant.
 */
export async function restoreSession(): Promise<{ signedIn: boolean; displayName?: string }> {
  if (!isLiveMode) return { signedIn: false };
  try {
    const raw = projectRef ? await AsyncStorage.getItem(`sb-${projectRef}-auth-token`) : null;
    if (!raw) return { signedIn: false };
    let displayName: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { user?: { user_metadata?: { display_name?: string } } };
      displayName = parsed.user?.user_metadata?.display_name;
    } catch { /* unreadable session blob — still treat as signed in; refresh will sort it */ }
    supabase().auth.getSession().catch(() => {}); // background token refresh, fire-and-forget
    return { signedIn: true, displayName };
  } catch {
    return { signedIn: false };
  }
}

export async function signOutUser(): Promise<void> {
  if (!isLiveMode) return;
  try { await supabase().auth.signOut(); } catch { /* stale session — proceed */ }
}
