import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { BackButton } from '../components/ui';
import { signOutUser } from '../api/auth';
import { isLiveMode } from '../api/supabase';
import { useStore } from '../store';

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

/** Settings (design section 12). Rows are design-faithful; sub-pages come with live wiring. */
export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userName = useStore(s => s.userName);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 22, paddingBottom: 10 }}>
        <BackButton onPress={() => nav.goBack()} />
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink, letterSpacing: -0.5 }}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 22, paddingBottom: 34 }}>
        <SectionLabel>ACCOUNT</SectionLabel>
        <Card>
          <Row label="Name" value={userName} />
          <Row label="Email" value="trevor@twoplus.app" />
          <Row label="Membership" value="2+ Annual" valueColor={colors.teal} last />
        </Card>

        <SectionLabel>PREFERENCES</SectionLabel>
        <Card>
          <Row label="Notifications" chevron />
          <Row label="Voice & playback" chevron />
          <Row label="Privacy & sharing" chevron last />
        </Card>

        <SectionLabel>SUPPORT</SectionLabel>
        <Card>
          <Row label="Help & support" chevron />
          <Row label="Sign out" last onPress={async () => {
            await signOutUser(); // clears the persisted Supabase session in live mode
            nav.reset({ index: 0, routes: [{ name: 'Intro' }] });
          }} />
        </Card>

        {/* Stage 2 diagnostic — shows whether this bundle carries Supabase config */}
        <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 12, color: colors.inactive, marginTop: 20 }}>
          Backend: {isLiveMode ? 'Live (Supabase)' : 'Mock mode'}
        </Text>
      </ScrollView>
    </Animated.View>
  );
}
