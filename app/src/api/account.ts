/**
 * The signed-in user's real account details, from Supabase (Oct 20).
 *
 * Settings used to hardcode all three account rows — `trevor@twoplus.app`,
 * "2+ Annual", and the store's default first name — so every account showed
 * the same placeholder. Sources now:
 *
 *   - email + join date → the auth user (from the persisted session, no network)
 *   - display name      → `profiles.display_name` (RLS "own profile"),
 *                         falling back to the sign-up metadata
 *   - membership        → `entitlements` (RLS "own entitlements read"; written
 *                         only by the RevenueCat webhook via service role)
 *
 * No entitlements row means no subscription has ever been recorded — true for
 * every account until the RevenueCat webhook is live — and that is shown as
 * "Free", not a made-up plan.
 *
 * A 401 gets one refresh-and-retry, the same race that blanked the
 * affirmations load on Oct 18 (token refresh and the first query in flight
 * together on relaunch).
 */
import { useEffect, useState } from 'react';
import { isLiveMode, supabase } from './supabase';

export type MembershipStatus = 'none' | 'in_trial' | 'active' | 'grace' | 'expired';

export interface Account {
  email: string | null;
  displayName: string | null;
  /** When the auth user was created — "Practicing since". */
  joinedAt: string | null;
  membership: {
    status: MembershipStatus;
    productId: string | null;
    trialEndsAt: string | null;
    periodEndsAt: string | null;
  } | null;
}

/** Last successful load, so reopening Settings never flashes placeholders. */
let cached: Account | null = null;

function isAuthRejection(status: number, error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return status === 401 || error.code === 'PGRST301' || /jwt/i.test(error.message ?? '');
}

/**
 * Load the account, or null when signed out / in mock mode / the session
 * can't be read. Profile and membership failures degrade to null fields
 * rather than failing the whole load — the email alone is still worth showing.
 */
export async function loadAccount(): Promise<Account | null> {
  if (!isLiveMode) return null;
  try {
    const { data: { session } } = await supabase().auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const fetchBoth = () => Promise.all([
      supabase().from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
      supabase().from('entitlements')
        .select('status, product_id, trial_ends_at, current_period_ends_at')
        .eq('user_id', user.id).maybeSingle(),
    ]);
    let [profile, ent] = await fetchBoth();
    if (isAuthRejection(profile.status, profile.error) || isAuthRejection(ent.status, ent.error)) {
      await supabase().auth.refreshSession();
      [profile, ent] = await fetchBoth();
    }

    const metaName = (user.user_metadata?.display_name as string | undefined) ?? null;
    const row = ent.error ? null : ent.data;
    const account: Account = {
      email: user.email ?? null,
      displayName: (profile.error ? null : profile.data?.display_name) || metaName,
      joinedAt: user.created_at ?? null,
      membership: row ? {
        status: row.status as MembershipStatus,
        productId: row.product_id ?? null,
        trialEndsAt: row.trial_ends_at ?? null,
        periodEndsAt: row.current_period_ends_at ?? null,
      } : null,
    };
    cached = account;
    return account;
  } catch {
    return null;
  }
}

/** Drop the cached account — call on sign-out so the next user never sees it. */
export function clearAccountCache(): void {
  cached = null;
}

/**
 * The account for screens. Returns the cached value immediately (null on the
 * first ever open) and refreshes on every mount, so a name changed elsewhere
 * or a subscription that just started shows up the next time Settings opens.
 */
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(cached);
  useEffect(() => {
    let alive = true;
    void loadAccount().then(a => { if (alive && a) setAccount(a); });
    return () => { alive = false; };
  }, []);
  return account;
}

/**
 * The Membership row's words. Plan names come from the RevenueCat product id,
 * so they follow whatever the store sells rather than being hardcoded here.
 */
export function membershipLabel(m: Account['membership']): { text: string; current: boolean } {
  if (!m || m.status === 'none') return { text: 'Free', current: false };
  const plan = /annual|year/i.test(m.productId ?? '') ? '2+ Annual'
    : /month/i.test(m.productId ?? '') ? '2+ Monthly'
    : '2+';
  if (m.status === 'in_trial') {
    const ends = m.trialEndsAt ? new Date(m.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    return { text: ends ? `Free trial · ends ${ends}` : 'Free trial', current: true };
  }
  if (m.status === 'active') return { text: plan, current: true };
  // Never condemning: a lapsed card is "renewing", an ended plan simply ended.
  if (m.status === 'grace') return { text: `${plan} · renewing`, current: true };
  return { text: 'Membership ended', current: false };
}

/** "September 2026" for "Practicing since …". */
export function joinedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
