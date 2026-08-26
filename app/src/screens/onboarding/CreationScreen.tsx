import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts, timing } from '../../theme';
import { CREATION_LINES } from '../../api/mockData';
import { BackButton, Mono, PillButton, Serif } from '../../components/ui';
import { CameraFrontIcon, CheckIcon, LibraryFrameIcon, MicIcon } from '../../components/brandIcons';
import { DancingBars, PulseRing, StaticBars } from '../../components/AnimatedBars';
import { useStore } from '../../store';

type Step = 'voice' | 'photo' | 'photoAdd' | 'building';

const VOICE_BARS: Record<'aria' | 'james', number[]> = {
  aria: [10, 16, 8],
  james: [14, 9, 15],
};

/** Opacity shimmer, matching the design's `shimmer` keyframes. */
function Shimmer({ children, dur = 1600, style }: { children: React.ReactNode; dur?: number; style?: object }) {
  const op = useSharedValue(0.35);
  useEffect(() => { op.value = withRepeat(withTiming(1, { duration: dur / 2 }), -1, true); }, [op, dur]);
  const anim = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

/** The 8-point AI spark from the design bundle (white, stroked). */
function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={colors.white} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M7 1v12M1 7h12M2.8 2.8l8.4 8.4M11.2 2.8l-8.4 8.4" />
    </Svg>
  );
}

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
  const [samplePlaying, setSamplePlaying] = useState<'aria' | 'james' | null>(null);

  const selectPresetVoice = (v: 'aria' | 'james') => {
    set({ voiceSel: v });
    setSamplePlaying(v);
    setTimeout(() => setSamplePlaying(cur => (cur === v ? null : cur)), 2600);
  };

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

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = res.assets?.[0]?.uri;
    if (uri) { useStore.getState().setProfilePhoto(uri); runBuild(); }
  };

  const takeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access for Expo Go in Settings to take a selfie, or choose from your library instead.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, cameraType: 'front' });
    const uri = res.assets?.[0]?.uri;
    if (uri) { useStore.getState().setProfilePhoto(uri); runBuild(); }
  };

  const voiceCard = (key: 'aria' | 'james', name: string, desc: string) => (
    <Pressable key={key} onPress={() => selectPresetVoice(key)} style={{
      backgroundColor: 'rgba(250,244,232,0.07)', borderRadius: 18, padding: 18,
      borderWidth: 1.5, borderColor: voiceSel === key ? colors.gold : 'rgba(250,244,232,0.2)',
      flexDirection: 'row', alignItems: 'center', gap: 14,
    }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
        <StaticBars heights={VOICE_BARS[key]} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: colors.cream }}>{name}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.creamOnDarkDim, marginTop: 2 }}>{desc}</Text>
      </View>
      {samplePlaying === key && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <DancingBars heights={[14, 14, 14]} color={colors.gold} width={2.5} gap={2.5} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.gold }}>Sample</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, backgroundColor: colors.ink, padding: 28, paddingTop: 80, paddingBottom: 44 }}>
      {step === 'voice' && (
        <Animated.View entering={FadeInUp.duration(500)} style={{ flex: 1 }}>
          <Mono size={12} color={colors.gold} style={{ letterSpacing: 2 }}>1 OF 2</Mono>
          <Serif size={28} color={colors.cream} style={{ marginTop: 14, lineHeight: 38 }}>
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
                <MicIcon size={17} color={colors.ink} />
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
                <PulseRing size={46} color={recState === 'recording' ? colors.gold : 'transparent'}>
                  <Pressable onPress={startRec} style={{
                    width: 46, height: 46, borderRadius: 23,
                    backgroundColor: recState === 'done' ? colors.teal : colors.gold,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {recState === 'done'
                      ? <CheckIcon size={20} />
                      : <MicIcon size={19} color={colors.ink} />}
                  </Pressable>
                </PulseRing>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <BackButton onPress={() => setStep('voice')} color={colors.gold} />
            <Mono size={12} color={colors.gold} style={{ letterSpacing: 2 }}>2 OF 2</Mono>
          </View>
          <Serif size={28} color={colors.cream} style={{ marginTop: 14, lineHeight: 38 }}>
            Want to see yourself in your goals?
          </Serif>
          <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: 'rgba(250,244,232,0.65)', lineHeight: 22, marginTop: 14 }}>
            One photo lets the AI paint you into every image and scene — you, checking the balance; you, at the finish line.
          </Text>
          <View style={{ marginTop: 32, gap: 12 }}>
            <Pressable onPress={() => setStep('photoAdd')} style={({ pressed }) => ({
              height: 56, borderRadius: 28, backgroundColor: colors.cream,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}>
              <CameraFrontIcon size={18} />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink }}>Add a photo</Text>
            </Pressable>
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

      {step === 'photoAdd' && (
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <BackButton onPress={() => setStep('photo')} color={colors.gold} />
            <Mono size={12} color={colors.gold} style={{ letterSpacing: 2 }}>2 OF 2</Mono>
          </View>
          <Serif size={28} color={colors.cream} style={{ marginTop: 14, lineHeight: 38 }}>
            Add your photo
          </Serif>
          <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: 'rgba(250,244,232,0.65)', lineHeight: 22, marginTop: 14 }}>
            A clear, front-facing photo works best. It stays private to your practice.
          </Text>
          <View style={{ marginTop: 32, gap: 12 }}>
            <Pressable onPress={takeSelfie} style={({ pressed }) => ({
              height: 56, borderRadius: 28, backgroundColor: colors.cream,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}>
              <CameraFrontIcon size={18} />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink }}>Take a selfie</Text>
            </Pressable>
            <Pressable onPress={pickFromLibrary} style={({ pressed }) => ({
              height: 56, borderRadius: 28, backgroundColor: 'transparent',
              borderWidth: 1, borderColor: 'rgba(250,244,232,0.25)',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}>
              <LibraryFrameIcon size={18} color="rgba(250,244,232,0.85)" />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: 'rgba(250,244,232,0.85)' }}>Choose from library</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {step === 'building' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {!ready ? (
            <View style={{ alignItems: 'center' }}>
              <Shimmer dur={1600} style={{ marginBottom: 30 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <SparkIcon size={18} />
                </View>
              </Shimmer>
              <Shimmer dur={2400}>
                <Serif size={24} color={colors.cream} style={{ textAlign: 'center' }}>{CREATION_LINES[lineIdx]}</Serif>
              </Shimmer>
            </View>
          ) : (
            <Animated.View entering={FadeInUp.duration(600)} style={{ alignItems: 'center' }}>
              <Serif size={30} color={colors.cream} style={{ textAlign: 'center', lineHeight: 40 }}>
                Your practice{'\n'}is ready.
              </Serif>
              <Text style={{
                fontFamily: fonts.sans, fontSize: 14, color: 'rgba(250,244,232,0.6)',
                textAlign: 'center', lineHeight: 21, marginTop: 16,
              }}>
                Images and your mind movie keep rendering{'\n'}in the background.
              </Text>
              <PillButton
                label="Enter 2+" height={54}
                bg={colors.gold} color={colors.ink}
                onPress={() => { set({ welcome: true }); navigation.reset({ index: 0, routes: [{ name: 'Main' }] }); }}
                style={{ marginTop: 36, paddingHorizontal: 48 }}
              />
            </Animated.View>
          )}
        </View>
      )}
    </Animated.View>
  );
}
