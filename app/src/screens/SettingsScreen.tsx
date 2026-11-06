import React from 'react';
import { View, Text, Pressable, ScrollView, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { BackButton } from '../components/ui';
import { signOutUser } from '../api/auth';
import { isLiveMode } from '../api/supabase';
import { apiLive } from '../api/client';
import { useStore, type Appearance } from '../store';
import { clearAccountCache, membershipLabel, useAccount } from '../api/account';

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.inactive} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: colors.warmGray, marginTop: 24 }}>
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
      borderRadius: 18, paddingVertical: 4, paddingHorizontal: 16, marginTop: 10,
    }}>
      {children}
    </View>
  );
}

function Row({ label, value, valueColor, chevron, last, onPress }: {
  label: string; value?: string; valueColor?: string; chevron?: boolean; last?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.borderSoft,
    }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: label === 'Sign out' ? colors.terracotta : colors.ink }}>
        {label}
      </Text>
      {value != null && (
        <Text style={{ fontFamily: valueColor ? fonts.sansMedium : fonts.sans, fontSize: 14, color: valueColor ?? colors.warmGray }}>
          {value}
        </Text>
      )}
      {chevron && <ChevronRight />}
    </Pressable>
  );
}

/**
 * Light / Dark / System (Nov 6). A segmented control rather than a switch,
 * because there are three honest answers: System follows the phone, which a
 * two-state toggle can't express. Selection is ink-on-cream, so the selected
 * pill inverts with the theme instead of needing a colour of its own — no
 * teal (AI only) or gold (achievement only) for a plain preference.
 */
function AppearanceRow() {
  const appearance = useStore(s => s.appearance);
  const setAppearance = useStore(s => s.setAppearance);
  // What System resolves to right now — shown so it's visible at a glance
  // whether the phone's setting is actually reaching the app.
  const phone = useColorScheme() === 'dark' ? 'Dark' : 'Light';
  const opts: { key: Appearance; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
    }}>
      <View>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Appearance</Text>
        {appearance === 'system' && (
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.warmGray, marginTop: 2 }}>
            Following your phone · {phone}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: colors.borderSoft, borderRadius: 16, padding: 3 }}>
        {opts.map(o => {
          const on = appearance === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setAppearance(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: 13, backgroundColor: on ? colors.ink : 'transparent' }}
            >
              <Text style={{ fontFamily: on ? fonts.sansMedium : fonts.sans, fontSize: 13, color: on ? colors.cream : colors.warmGray }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Settings (design section 12). Rows are design-faithful; sub-pages come with live wiring. */
export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userName = useStore(s => s.userName);
  /*
    Real account rows (Oct 20). These were hardcoded — every account read
    "trevor@twoplus.app" and "2+ Annual". Live mode reads Supabase; mock mode
    keeps the design placeholders, since there is no account to show. While
    the first load is in flight the email shows an ellipsis rather than a
    placeholder that looks real.
  */
  const account = useAccount();
  const name = account?.displayName || userName;
  const email = isLiveMode ? (account?.email ?? '…') : 'trevor@twoplus.app';
  const membership = isLiveMode
    ? (account ? membershipLabel(account.membership) : { text: '…', current: false })
    : { text: '2+ Annual', current: true };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 22, paddingBottom: 10 }}>
        <BackButton onPress={() => nav.goBack()} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink, letterSpacing: -0.5 }}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 22, paddingBottom: 34 }}>
        <SectionLabel>ACCOUNT</SectionLabel>
        <Card>
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Membership" value={membership.text} valueColor={membership.current ? colors.teal : undefined} last />
        </Card>

        <SectionLabel>PREFERENCES</SectionLabel>
        <Card>
          <AppearanceRow />
          <Row label="Notifications" chevron />
          <Row label="Voice & playback" chevron />
          <Row label="Privacy & sharing" chevron last />
        </Card>

        <SectionLabel>SUPPORT</SectionLabel>
        <Card>
          <Row label="Help & support" chevron />
          <Row label="Sign out" last onPress={async () => {
            await signOutUser(); // clears the persisted Supabase session in live mode
            clearAccountCache();
            nav.reset({ index: 0, routes: [{ name: 'Intro' }] });
          }} />
        </Card>

        {/* Stage 2 diagnostic — shows whether this bundle carries Supabase config */}
        <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 12, color: colors.inactive, marginTop: 20 }}>
          Auth: {isLiveMode ? 'Live (Supabase)' : 'Mock'} · Intake: {apiLive ? 'Live (Spark)' : 'Mock'}
        </Text>
        {/* Which update this phone is running (Nov 6). Expo Go downloads an
            update in the background and applies it on a LATER launch, so
            "I merged it and nothing changed" has cost three round-trips —
            compare this against the merge commit on GitHub. Local dev reads
            "dev" because the variable is only set by the publish workflow. */}
        <Text style={{ textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, color: colors.inactive, marginTop: 6 }}>
          Build {(process.env.EXPO_PUBLIC_BUILD_SHA ?? 'dev').slice(0, 7)}
        </Text>
      </ScrollView>
    </Animated.View>
  );
}
