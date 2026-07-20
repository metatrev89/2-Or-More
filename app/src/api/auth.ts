/**
 * Auth service (Stage 2). Live mode talks to Supabase Auth; mock mode
 * (no env config) succeeds instantly so the design flow keeps working.
 * Apple/Google SSO stays stubbed until Stage 3 native builds.
 */
import { isLiveMode, supabase } from './supabase';

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

/** App-launch session restore (persisted in AsyncStorage by supabase-js). */
export async function restoreSession(): Promise<{ signedIn: boolean; displayName?: string }> {
  if (!isLiveMode) return { signedIn: false };
  try {
    const { data } = await supabase().auth.getSession();
    const u = data.session?.user;
    return { signedIn: !!u, displayName: (u?.user_metadata?.display_name as string) || undefined };
  } catch {
    return { signedIn: false };
  }
}

export async function signOutUser(): Promise<void> {
  if (!isLiveMode) return;
  try { await supabase().auth.signOut(); } catch { /* stale session — proceed */ }
}
