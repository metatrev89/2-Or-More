import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts, timing } from '../../theme';
import { CREATION_LINES } from '../../api/mockData';
import { Mono, PillButton, Serif } from '../../components/ui';
import { useStore } from '../../store';

type Step = 'voice' | 'photo' | 'building';

/**
 * Creation moment (design screen 8): voice choice (BIPA consent lives in the
 * "own voice" flow), photo opt-in, then the generation theater.
 * Production: recording uploads to backend -> Fish clone; photo -> R2.
 */
export default function CreationScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Creation'>) {
  const { voiceSel, recState, set } = useStore();
  const [step, setStep] = useState<Step>('voice');
  const [lineIdx, setLineIdx] = useState(0);
  const [ready, setReady] = useState(false);

  const voiceOk = voiceSel === 'aria' || voiceSel === 'james' || (voiceSel === 'own' && recState === 'done');

  const startRec = () => {
    if (recState === 'recording') return;
    set({ recState: 'recording' });
    setTimeout(() => set({ recState: 'done' }), 3200);
  };

  const runBuild = () => {
    setStep('building');
    setTimeout(() => setLineIdx(1), timing.buildLineMs);
    setTimeout(() => setLineIdx(2), timing.buildLineMs * 2);
    setTimeout(() => setReady(true), timing.buildDoneMs);
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = res.assets?.[0]?.uri;
    if (uri) set({ profilePhotoUri: uri });
    runBuild();
  };

  const voiceCard = (key: 'aria' | 'james', name: string, desc: string) => (
    <Pressable key={key} onPress={() => set({ voiceSel: key })} style={{
      backgroundColor: 'rgba(250,244,232,0.07)', borderRadius: 18, padding: 18,
      borderWidth: 1.5, borderColor: voiceSel === key ? colors.gold : 'rgba(250,244,232,0.2)',
      flexDirection: 'row', alignItems: 'center', gap: 14,
    }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.white, fontSize: 13 }}>▮▮▮</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: colors.cream }}>{name}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.creamOnDarkDim, marginTop: 2 }}>{desc}</Text>
      </View>
      {voiceSel === key && <Text style={{ color: colors.gold, fontSize: 12 }}>▮▮ Sample</Text>}
    </Pressable>
  );

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, backgroundColor: colors.ink, padding: 28, paddingTop: 80, paddingBottom: 44 }}>
      {step === 'voice' && (
        <Animated.View entering={FadeInUp.duration(500)} style={{ flex: 1 }}>
          <Mono size={12} color={colors.gold} style={{ letterSpacing: 2 }}>1 OF 2</Mono>
          <Serif size={28} color={colors.cream} style={{ marginTop: 14 }}>
            Whose voice should carry your affirmations?
          </Serif>
          <View style={{ gap: 12, marginTop: 28 }}>
            {voiceCard('aria', 'Aria', 'Warm, steady — a morning voice')}
            {voiceCard('james', 'James', 'Low, calm — grounded certainty')}
            <Pressable onPress={() => set({ voiceSel: 'own' })} style={{
              backgroundColor: 'rgba(250,244,232,0.07)', borderRadius: 18, padding: 18,
              borderWidth: 1.5, borderColor: voiceSel === 'own' ? colors.gold : 'rgba(250,244,232,0.2)',
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 17 }}>🎙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: colors.cream }}>My own voice</Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.creamOnDarkDim, marginTop: 2 }}>
                  A guided 60-second read of your set
                </Text>
              </View>
            </Pressable>
            {voiceSel === 'own' && (
              <Animated.View entering={FadeInUp.duration(350)} style={{
                backgroundColor: 'rgba(250,244,232,0.07)', borderWidth: 1, borderColor: 'rgba(250,244,232,0.2)',
                borderRadius: 18, padding: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
              }}>
                <Pressable onPress={startRec} style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: recState === 'done' ? colors.teal : colors.gold,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 18, color: recState === 'done' ? colors.cream : colors.ink }}>
                    {recState === 'done' ? '✓' : '🎙'}
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.cream }}>
                    {recState === 'recording' ? 'Listening…' : recState === 'done' ? 'Recording saved' : 'Record your voice'}
                  </Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.creamOnDarkDim, marginTop: 2, lineHeight: 18 }}>
                    {recState === 'recording' ? 'Read each affirmation slowly — take your time.'
                      : recState === 'done' ? 'Tap the mic to re-record anytime.'
                      : 'A guided 60-second read of your set.'}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: 'rgba(250,244,232,0.5)', marginTop: 16, lineHeight: 19 }}>
            Your own voice is the strongest signal to your subconscious. You can re-record anytime.
          </Text>
          <View style={{ flex: 1 }} />
          <PillButton
            label={!voiceSel ? 'Choose a voice to continue'
              : voiceSel === 'aria' ? 'Continue with Aria'
              : voiceSel === 'james' ? 'Continue with James'
              : recState === 'done' ? 'Continue with my voice' : 'Record above to continue'}
            onPress={() => voiceOk && setStep('photo')}
            disabled={!voiceOk}
            bg={voiceOk ? colors.gold : 'rgba(250,244,232,0.12)'}
            color={voiceOk ? colors.ink : 'rgba(250,244,232,0.45)'}
            style={{ marginTop: 16 }}
          />
        </Animated.View>
      )}

      {step === 'photo' && (
        <Animated.View entering={FadeInUp.duration(500)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => setStep('voice')}><Text style={{ color: colors.gold, fontSize: 20 }}>‹</Text></Pressable>
            <Mono size={12} color={colors.gold} style={{ letterSpacing: 2 }}>2 OF 2</Mono>
          </View>
          <Serif size={28} color={colors.cream} style={{ marginTop: 14 }}>
            Want to see yourself in your goals?
          </Serif>
          <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: 'rgba(250,244,232,0.65)', lineHeight: 22, marginTop: 14 }}>
            One photo lets the AI paint you into every image and scene — you, checking the balance; you, at the finish line.
          </Text>
          <View style={{ marginTop: 32, gap: 12 }}>
            <PillButton label="📷 Add a photo" bg={colors.cream} color={colors.ink} onPress={pickPhoto} />
            <PillButton
              label="Skip for now" bg="transparent" color="rgba(250,244,232,0.7)"
              onPress={runBuild}
              style={{ borderWidth: 1, borderColor: 'rgba(250,244,232,0.25)' }}
            />
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: 'rgba(250,244,232,0.5)', marginTop: 18 }}>
            Your photo never leaves your practice. Images generate either way.
          </Text>
        </Animated.View>
      )}

      {step === 'building' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {!ready ? (
            <Serif size={24} color={colors.cream}>{CREATION_LINES[lineIdx]}</Serif>
          ) : (
            <Animated.View entering={FadeInUp.duration(600)} style={{ alignItems: 'center' }}>
              <Serif size={30} color={colors.cream} style={{ textAlign: 'center' }}>
                Your practice{'\n'}starts now.
              </Serif>
              <PillButton
                label="Enter 2+" height={54}
                bg={colors.gold} color={colors.ink}
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
                style={{ marginTop: 38, paddingHorizontal: 44 }}
              />
            </Animated.View>
          )}
        </View>
      )}
    </Animated.View>
  );
}
