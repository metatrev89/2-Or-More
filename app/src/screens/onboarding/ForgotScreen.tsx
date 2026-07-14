import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton, Label, Mono, PillButton, Wordmark } from '../../components/ui';
import { EyeIcon, CheckIcon } from '../../components/brandIcons';

type Step = 'email' | 'code' | 'reset' | 'done';

const RESEND_SECONDS = 30;

/**
 * Forgot password (mock mode). Mirrors the security shape of the real flow:
 * account-agnostic copy ("If an account exists…"), 6-digit single-use code,
 * resend cooldown, same 8-char rule as signup, sessions-revoked note on done.
 * Production: swap the setTimeout mocks for Supabase resetPasswordForEmail /
 * verifyOtp / updateUser — the screens don't need to change.
 */
export default function ForgotScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Forgot'>) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<TextInput>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const codeOk = /^\d{6}$/.test(code);
  const passOk = pass.length >= 8;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Mock send — production calls the backend, which responds identically
  // whether or not the account exists (no enumeration).
  const sendCode = () => {
    if (!emailOk || sending) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setCooldown(RESEND_SECONDS);
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 350);
    }, 900);
  };

  const resend = () => {
    if (cooldown > 0) return;
    setCode('');
    setCooldown(RESEND_SECONDS);
  };

  const verifyCode = () => {
    if (!codeOk) return;
    setStep('reset'); // mock accepts any 6 digits
  };

  const savepass = () => {
    if (!passOk) return;
    setStep('done');
  };

  const field = {
    height: 52, borderRadius: 14, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.sand, paddingHorizontal: 16,
    fontFamily: fonts.sans, fontSize: 16, color: colors.ink,
  } as const;

  const title = {
    email: 'Reset your password',
    code: 'Check your email',
    reset: 'Choose a new password',
    done: 'Password updated',
  }[step];

  const subtitle = {
    email: 'Enter the email you use for 2+ and we’ll send you a 6-digit code.',
    code: `If an account exists for ${email || 'that address'}, we’ve sent a 6-digit code. It expires in 15 minutes.`,
    reset: 'Make it at least 8 characters. You’ll use it from now on.',
    done: 'You’ve been signed out everywhere else for safety. Sign in with your new password.',
  }[step];

  return (
    // Bottom padding on the outer view — KeyboardAvoidingView zeroes its own paddingBottom.
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ flex: 1, backgroundColor: colors.cream, paddingBottom: Math.max(insets.bottom, 34) + 24 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={12}
        style={{ flex: 1, paddingHorizontal: 28, paddingTop: 52 }}
      >
        <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>
        <BackButton onPress={() => {
          if (step === 'code') setStep('email');
          else if (step === 'reset') setStep('code');
          else navigation.goBack();
        }} />

        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 26, color: colors.ink, letterSpacing: -0.5, marginTop: 10 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.warmGray, lineHeight: 22, marginTop: 8 }}>
          {subtitle}
        </Text>

        {step === 'email' && (
          <Animated.View entering={FadeInUp.duration(350)} style={{ gap: 7, marginTop: 26 }}>
            <Label>Email</Label>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor={colors.inactive}
              autoCapitalize="none" keyboardType="email-address" autoFocus
              returnKeyType="go" onSubmitEditing={sendCode}
              style={field}
            />
          </Animated.View>
        )}

        {step === 'code' && (
          <Animated.View entering={FadeInUp.duration(350)} style={{ gap: 7, marginTop: 26 }}>
            <Label>6-digit code</Label>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••" placeholderTextColor={colors.inactive}
              keyboardType="number-pad" maxLength={6}
              returnKeyType="go" onSubmitEditing={verifyCode}
              style={[field, { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 10, textAlign: 'center' }]}
            />
            <Pressable onPress={resend} disabled={cooldown > 0} style={{ marginTop: 10, alignSelf: 'center' }}>
              {cooldown > 0 ? (
                <Mono size={13} color={colors.inactive}>Resend code in {cooldown}s</Mono>
              ) : (
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.teal }}>Resend code</Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {step === 'reset' && (
          <Animated.View entering={FadeInUp.duration(350)} style={{ gap: 7, marginTop: 26 }}>
            <Label>New password</Label>
            <View>
              <TextInput
                value={pass} onChangeText={setPass}
                placeholder="Create a new password" placeholderTextColor={colors.inactive}
                secureTextEntry={!showPass} autoFocus
                returnKeyType="go" onSubmitEditing={savepass}
                style={[field, { paddingRight: 50 }]}
              />
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={6} style={{ position: 'absolute', right: 6, top: 6, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <EyeIcon slashed={showPass} />
              </Pressable>
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: passOk ? colors.teal : colors.inactive, marginTop: 2 }}>
              ✓ At least 8 characters
            </Text>
          </Animated.View>
        )}

        {step === 'done' && (
          <Animated.View entering={FadeInUp.duration(400)} style={{ alignItems: 'center', marginTop: 44 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={26} />
            </View>
          </Animated.View>
        )}

        <View style={{ flex: 1 }} />

        {step === 'email' && (
          <PillButton
            label={sending ? 'Sending…' : 'Send code'}
            onPress={sendCode} disabled={!emailOk || sending}
            bg={emailOk && !sending ? colors.ink : colors.border}
            color={emailOk && !sending ? colors.cream : colors.inactive}
          />
        )}
        {step === 'code' && (
          <PillButton
            label="Verify code"
            onPress={verifyCode} disabled={!codeOk}
            bg={codeOk ? colors.ink : colors.border}
            color={codeOk ? colors.cream : colors.inactive}
          />
        )}
        {step === 'reset' && (
          <PillButton
            label="Save new password"
            onPress={savepass} disabled={!passOk}
            bg={passOk ? colors.ink : colors.border}
            color={passOk ? colors.cream : colors.inactive}
          />
        )}
        {step === 'done' && (
          <PillButton label="Back to sign in" onPress={() => navigation.goBack()} />
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
