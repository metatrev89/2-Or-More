/**
 * Supabase client (Stage 2 live wiring).
 *
 * Config comes from EXPO_PUBLIC_* env vars — set locally in app/.env (see
 * .env.example) and in CI via GitHub repo variables (inlined at publish time
 * by the EAS Update workflow). The URL + anon key are publishable values;
 * row security lives in RLS. The service-role key NEVER ships in the app —
 * backend only.
 *
 * When env is missing the app stays fully in mock mode (isLiveMode false),
 * so design iteration keeps working without a network or project.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isLiveMode = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Lazily-created singleton; only call when isLiveMode is true. */
export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error('Supabase env missing — app is in mock mode (set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).');
    }
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // RN: no browser URL to inspect
      },
    });
  }
  return client;
}
