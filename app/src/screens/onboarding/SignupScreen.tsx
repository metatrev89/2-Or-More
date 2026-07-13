import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { PillButton, Serif, Wordmark } from '../../components/ui';
import { AppleLogo, GoogleLogo, LockIcon } from '../../components/brandIcons';
import { useStore } from '../../store';

/** Auth provider button: brand logo + label, centered as a unit. */
function ProviderButton({ icon, label, onPress, bg, color, border }: {
  icon: React.ReactNode; label: string; onPress: () => void;
  bg: string; color: string; border?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      height: 54, borderRadius: 27, backgroundColor: bg,
      borderWidth: border ? 1 : 0, borderColor: border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      opacity: pressed ? 0.85 : 1,
    })}>
      {icon}
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color }}>{label}</Text>
    </Pressable>
  );
}

export default function SignupScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Signup'>) {
  const { set } = useStore();
  const [email, setEmail] = React.useState('');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const emailContinue = () => {
    if (!emailOk) return;
    set({ emailMode: 'signup' });
    navigation.navigate('Email');
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, padding: 28, paddingTop: 60, paddingBottom: 44 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Wordmark size={40} />
        <Serif size={19} color={colors.warmGray} style={{ textAlign: 'center', maxWidth: 250 }}>
          Step into agreement with your vision.
        </Serif>
      </View>

      <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 22, gap: 12 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.inactive}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            height: 54, borderRadius: 27, backgroundColor: colors.cream,
            borderWidth: 1, borderColor: colors.sand, paddingHorizontal: 20,
            fontFamily: fonts.sans, fontSize: 16, color: colors.ink,
          }}
        />
        <PillButton
          label="Continue"
          height={54}
          onPress={emailContinue}
          disabled={!emailOk}
          bg={emailOk ? colors.ink : colors.border}
          color={emailOk ? colors.cream : colors.inactive}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>
        <ProviderButton
          icon={<AppleLogo />}
          label="Continue with Apple"
          onPress={() => navigation.navigate('Intake')}
          bg={colors.ink} color={colors.cream}
        />
        <ProviderButton
          icon={<GoogleLogo />}
          label="Continue with Google"
          onPress={() => navigation.navigate('Intake')}
          bg={colors.white} color={colors.ink} border={colors.sand}
        />
      </View>

      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <LockIcon />
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
          Your affirmations are private by default.
        </Text>
      </View>
      <Text style={{ marginTop: 14, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray }}>
        Already have an account?{' '}
        <Text
          onPress={() => { set({ emailMode: 'signin' }); navigation.navigate('Email'); }}
          style={{ fontFamily: fonts.sansMedium, color: colors.ink }}
        >Sign in</Text>
      </Text>
    </Animated.View>
  );
}
