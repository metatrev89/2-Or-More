import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { BackButton, PillButton } from '../../components/ui';

/** The design's phone-with-contact illustration (96px, verbatim paths). */
function ContactsIllustration() {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96" fill="none">
      <Rect x={33} y={14} width={30} height={58} rx={6} stroke={colors.ink} strokeWidth={2.5} />
      <Rect x={40} y={26} width={18} height={22} rx={3} fill={colors.gold} />
      <Circle cx={49} cy={33} r={3.4} fill={colors.ink} />
      <Path d="M43.5 43.5c0-2.8 2.5-4.4 5.5-4.4s5.5 1.6 5.5 4.4" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
      <Rect x={39} y={54} width={20} height={10} rx={5} stroke={colors.teal} strokeWidth={2} />
      <Circle cx={54} cy={59} r={3.2} fill={colors.teal} />
      <Path d="M24 26l-6-4M23 38h-8M70 26l6-4M72 38h8" stroke={colors.gold} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M27 18l-3-5M69 18l3-5" stroke={colors.teal} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M40 80h16" stroke={colors.sand} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Connect contacts permission primer (design section 15). Mock mode: both
 * actions return to Discover; production wires "Go to settings" to the OS
 * contacts permission flow.
 */
export default function ContactsScreen() {
  const nav = useNavigation();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 60, paddingHorizontal: 26, paddingBottom: 30 }}>
        <BackButton onPress={() => nav.goBack()} />
        <View style={{ alignItems: 'center', paddingTop: 34, paddingBottom: 30 }}>
          <ContactsIllustration />
        </View>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 27, color: colors.ink, letterSpacing: -0.5, lineHeight: 32 }}>
          Allow 2<Text style={{ color: colors.gold }}>+</Text> to access your contacts
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, color: '#5C5142', lineHeight: 24, marginTop: 16 }}>
          We'll use your contacts to help you find people you know, so you can practice alongside the people already in your corner.
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, color: '#5C5142', lineHeight: 24, marginTop: 14 }}>
          Your contacts are synced privately and stored securely.
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, color: '#5C5142', lineHeight: 24, marginTop: 14 }}>
          You can turn off syncing anytime in settings.
        </Text>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.teal, marginTop: 16 }}>Learn more</Text>
        <View style={{ flex: 1 }} />
        <PillButton
          label="Go to settings" height={56}
          bg={colors.gold} color={colors.ink}
          onPress={() => nav.goBack()}
          style={{ marginTop: 24 }}
        />
        <Pressable onPress={() => nav.goBack()} style={{ paddingTop: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15.5, color: colors.teal }}>Skip</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}
