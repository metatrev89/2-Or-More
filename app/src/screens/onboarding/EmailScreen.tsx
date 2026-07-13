import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton, Label, PillButton, Wordmark } from '../../components/ui';
import { EyeIcon } from '../../components/brandIcons';
import { useStore } from '../../store';

export default function EmailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Email'>) {
  const emailMode = useStore(s => s.emailMode);
  const isSignup = emailMode === 'signup';
  const continuingEmail = route.params?.email ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const passRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const valid = isSignup ? pass.length >= 8 && name.trim().length > 0 : emailOk && pass.length > 0;

  const submit = () => {
    if (!valid) return;
    if (isSignup) navigation.navigate('Intake');
    else navigation.replace('Main');
  };

  const field = {
    height: 52, borderRadius: 14, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.sand, paddingHorizontal: 16,
    fontFamily: fonts.sans, fontSize: 16, color: colors.ink,
  } as const;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={12}
      style={{ flex: 1, paddingHorizontal: 28, paddingTop: 52, paddingBottom: Math.max(insets.bottom, 34) + 24 }}
    >
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 26, color: colors.ink, letterSpacing: -0.5, marginTop: 10 }}>
        {isSignup ? 'Finish creating your account' : 'Welcome back'}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.warmGray, lineHeight: 22, marginTop: 8 }}>
        {isSignup
          ? continuingEmail
            ? `Continuing as ${continuingEmail}. Your affirmations stay private to you.`
            : 'Your affirmations stay private to you.'
          : 'Sign in to return to your practice.'}
      </Text>

      <View style={{ gap: 16, marginTop: 26 }}>
        {isSignup ? (
          <View style={{ gap: 7 }}>
            <Label>Name</Label>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="What should we call you?" placeholderTextColor={colors.inactive}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passRef.current?.focus()}
              style={field}
            />
          </View>
        ) : (
          <View style={{ gap: 7 }}>
            <Label>Email</Label>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={colors.inactive}
              autoCapitalize="none" keyboardType="email-address"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passRef.current?.focus()}
              style={field}
            />
          </View>
        )}
        <View style={{ gap: 7 }}>
          <Label>Password</Label>
          <View>
            <TextInput
              ref={passRef}
              value={pass} onChangeText={setPass}
              placeholder={isSignup ? 'Create a password' : 'Your password'}
              placeholderTextColor={colors.inactive}
              secureTextEntry={!showPass}
              returnKeyType="go"
              onSubmitEditing={submit}
              style={[field, { paddingRight: 50 }]}
            />
            <Pressable onPress={() => setShowPass(!showPass)} hitSlop={6} style={{ position: 'absolute', right: 6, top: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <EyeIcon slashed={showPass} />
            </Pressable>
          </View>
          {isSignup && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: pass.length >= 8 ? colors.teal : colors.inactive, marginTop: 2 }}>
              ✓ At least 8 characters
            </Text>
          )}
        </View>
        {!isSignup && <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.teal }}>Forgot password?</Text>}
      </View>

      <View style={{ flex: 1 }} />
      {isSignup && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.warmGray, lineHeight: 18, textAlign: 'center', marginBottom: 12 }}>
          By continuing you agree to the <Text style={{ color: colors.ink }}>Terms</Text> and <Text style={{ color: colors.ink }}>Privacy Policy</Text>.
        </Text>
      )}
      <PillButton
        label={isSignup ? 'Create account' : 'Sign in'}
        onPress={submit}
        disabled={!valid}
        bg={valid ? colors.ink : colors.border}
        color={valid ? colors.cream : colors.inactive}
      />
    </KeyboardAvoidingView>
    </Animated.View>
  );
}
