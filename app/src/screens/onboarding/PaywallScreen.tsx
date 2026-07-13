import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { PAY_FRAGMENTS } from '../../api/mockData';
import { Label, Mono, PillButton, Serif } from '../../components/ui';
import { useStore } from '../../store';

/**
 * Paywall (design screen 7) — HARD paywall per the July 12 decision:
 * the design's "Continue with text only" decline path is intentionally
 * removed. Trial starts here; RevenueCat runs the purchase in production.
 */
export default function PaywallScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Paywall'>) {
  const { payPlan, set } = useStore();
  const { width, height } = useWindowDimensions();

  const benefits = [
    'Every affirmation as audio — AI voice or your own',
    'Photo-real images of your goals — with you in them',
    'Your mind movie, recut as your vision grows',
    'Scheduled delivery with 60-second quick-play',
  ];

  const planCard = (plan: 'annual' | 'monthly', label: string, price: string, per: string, note: string, noteColor: string) => (
    <Pressable onPress={() => set({ payPlan: plan })} style={{
      flex: 1, borderRadius: 16, padding: 14,
      borderWidth: payPlan === plan ? 2 : 1,
      borderColor: payPlan === plan ? colors.ink : colors.border,
    }}>
      <Label>{label}</Label>
      <Text style={{ marginTop: 6 }}>
        <Mono size={19} color={colors.ink}>{price}</Mono>
        <Mono size={12}>{per}</Mono>
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: noteColor, marginTop: 4 }}>{note}</Text>
    </Pressable>
  );

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, backgroundColor: colors.ink, padding: 24, paddingTop: 70, paddingBottom: 30 }}>
      {PAY_FRAGMENTS.map(f => (
        <Text key={f.text} style={{
          position: 'absolute', left: f.left * width, top: f.top * height,
          fontFamily: fonts.serifItalic, fontSize: f.size, color: 'rgba(250,244,232,0.13)',
          transform: [{ rotate: f.rot }],
        }}>
          {f.text}
        </Text>
      ))}

      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 30, color: colors.cream, letterSpacing: -0.5 }}>
          2<Text style={{ color: colors.gold }}>+</Text>
        </Text>
        <Serif size={27} color={colors.cream} style={{ marginTop: 12, lineHeight: 36 }}>
          Your vision, living{'\n'}and spoken.
        </Serif>
        <View style={{ gap: 10, marginTop: 20, marginBottom: 22 }}>
          {benefits.map(b => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <Text style={{ color: colors.gold, fontSize: 14 }}>✓</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.creamOnDark }}>{b}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: colors.white, borderRadius: 24, padding: 18 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {planCard('annual', 'Annual', '$59.99', '/yr', '7-day free trial', colors.tealDeep)}
          {planCard('monthly', 'Monthly', '$9.99', '/mo', 'Cancel anytime', colors.warmGray)}
        </View>
        <PillButton
          label="Start my practice"
          bg={colors.gold} color={colors.ink}
          onPress={() => navigation.navigate('Creation')}
          style={{ marginTop: 14 }}
        />
        <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 11.5, color: colors.warmGray, marginTop: 10 }}>
          Free for 7 days, then auto-renews. Cancel anytime in Settings.
        </Text>
      </View>
    </Animated.View>
  );
}
