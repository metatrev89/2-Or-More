import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Keyboard, Platform, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { AREAS, colors, fonts, timing } from '../../theme';
import { MOCK_SCRIPT } from '../../api/mockData';
import { AiSpark, BackButton, Mono, PillButton, SegmentBar, Wordmark } from '../../components/ui';
import { CameraIcon, ClockIcon, LibraryIcon, MicIcon, PaperclipIcon } from '../../components/brandIcons';
import { DancingBars, PulseRing } from '../../components/AnimatedBars';
import { useStore } from '../../store';

/**
 * Conversational intake (design screen 3). Mock mode replays the scripted
 * interview; live mode swaps `advance` for api.intakeAnswer without touching
 * the render tree.
 */
export default function IntakeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Intake'>) {
  const { msgs, scriptIdx, areaIdx, typing, listening, intakeDone, addMsg, set } = useStore();
  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [photoSheet, setPhotoSheet] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  useEffect(() => {
    if (msgs.length === 0) {
      set({ typing: true });
      setTimeout(() => {
        const step = MOCK_SCRIPT[0]!;
        set({ typing: false, msgs: step.ai.map(t => ({ isAi: true, text: t })) });
        setChips(step.chips ?? []);
        scrollDown();
      }, 1100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (text?: string) => {
    const step = MOCK_SCRIPT[scriptIdx];
    if (!step?.user) return;
    addMsg({ isAi: false, text: text || step.user });
    set({ typing: true });
    setChips([]);
    setDraft('');
    scrollDown();
    setTimeout(() => {
      const next = MOCK_SCRIPT[scriptIdx + 1];
      if (!next) { set({ typing: false, intakeDone: true }); return; }
      const st = useStore.getState();
      set({
        typing: false,
        msgs: [...st.msgs, ...next.ai.map(t => ({ isAi: true, text: t }))],
        scriptIdx: scriptIdx + 1,
        areaIdx: next.area,
        intakeDone: !next.user,
        listening: false,
      });
      setChips(next.chips ?? []);
      scrollDown();
    }, timing.typingDelayMs);
  };

  const micTap = () => {
    if (listening || typing || intakeDone) return;
    set({ listening: true });
    setTimeout(() => answer(), 1400);
  };

  const skipArea = () => {
    let j = scriptIdx;
    while (j < MOCK_SCRIPT.length && MOCK_SCRIPT[j]!.area === areaIdx) j++;
    if (j >= MOCK_SCRIPT.length) j = MOCK_SCRIPT.length - 1;
    const next = MOCK_SCRIPT[j]!;
    const st = useStore.getState();
    set({
      msgs: [
        ...st.msgs,
        { isAi: false, text: 'Not this season.' },
        { isAi: true, text: 'No problem — not this season. You can come back to it anytime from your profile.' },
        ...next.ai.map(t => ({ isAi: true, text: t })),
      ],
      scriptIdx: j, areaIdx: next.area, intakeDone: !next.user, typing: false, listening: false,
    });
    setChips(next.chips ?? []);
    scrollDown();
  };

  const attachPhoto = async (source: 'library' | 'camera' = 'library') => {
    setPhotoSheet(false);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Camera access needed', 'Enable camera access in Settings to take a photo.'); return; }
    }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;
    addMsg({ isAi: false, text: '', photoUri: uri });
    set({ typing: true });
    scrollDown();
    setTimeout(() => {
      const st = useStore.getState();
      set({
        typing: false,
        msgs: [...st.msgs, { isAi: true, text: 'What a beautiful photo. I’ll weave it into your mind movie scenes so they feel like your real life.' }],
        profilePhotoUri: uri,
      });
      scrollDown();
    }, timing.typingDelayMs);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, paddingTop: 52 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 2 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <SegmentBar total={7} activeCount={areaIdx + 1} />
        <Mono>{areaIdx + 1}/7</Mono>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 6 }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.8, color: colors.warmGray, textTransform: 'uppercase' }}>
          {AREAS[areaIdx]}
        </Text>
        {!intakeDone && (
          <Pressable onPress={skipArea}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>Not this season</Text>
          </Pressable>
        )}
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 10, gap: 14 }}>
        {msgs.map((m, i) => m.isAi ? (
          <Animated.View key={i} entering={FadeInUp.duration(timing.fadeUpMs)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <AiSpark />
            <View style={{
              backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
              borderRadius: 18, borderTopLeftRadius: 6, padding: 13, paddingHorizontal: 16, maxWidth: '78%',
            }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 22, color: colors.ink }}>{m.text}</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key={i} entering={FadeInUp.duration(timing.fadeUpMs)} style={{ alignItems: 'flex-end' }}>
            <View style={{ backgroundColor: colors.ink, borderRadius: 18, borderBottomRightRadius: 6, padding: 13, paddingHorizontal: 16, maxWidth: '80%' }}>
              {m.photoUri ? <Image source={{ uri: m.photoUri }} style={{ width: 190, height: 190, borderRadius: 12, marginBottom: m.text ? 8 : 0 }} /> : null}
              {m.text ? <Text style={{ fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 22, color: colors.cream }}>{m.text}</Text> : null}
            </View>
          </Animated.View>
        ))}
        {typing && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <AiSpark />
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, paddingHorizontal: 16 }}>
              <Text style={{ color: colors.teal, fontSize: 16, letterSpacing: 2 }}>•••</Text>
            </View>
          </View>
        )}
        {/* quick-reply chips live in the chat flow and scroll with it (design behavior) */}
        {chips.length > 0 && !typing && !intakeDone && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
            {chips.map(c => (
              <Pressable key={c} onPress={() => setDraft(`${c} — `)} style={{
                backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand,
                borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16,
              }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.ink }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!intakeDone ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 30, paddingTop: 6 }}>
            <View style={{
              backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 26,
              padding: 16, paddingBottom: 12, gap: 12,
            }}>
              <TextInput
                value={draft} onChangeText={setDraft}
                placeholder={listening ? 'Listening…' : 'Type or speak…'}
                placeholderTextColor={colors.inactive}
                onSubmitEditing={() => draft.trim() && answer(draft.trim())}
                style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingHorizontal: 4 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => { Keyboard.dismiss(); setPhotoSheet(true); }} style={{
                  width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white,
                  borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20, color: colors.ink }}>+</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                {draft.trim() ? (
                  <Pressable onPress={() => answer(draft.trim())} style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: colors.cream, fontSize: 18 }}>↑</Text>
                  </Pressable>
                ) : listening ? (
                  <PulseRing size={44} color={colors.teal}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealDeep,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DancingBars heights={[12, 18, 10, 15]} color={colors.white} />
                    </View>
                  </PulseRing>
                ) : (
                  <Pressable onPress={micTap} style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MicIcon />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 22, paddingBottom: 34, paddingTop: 6 }}>
            <Animated.View entering={FadeInUp.duration(400)}>
              <PillButton label="Build my affirmations" onPress={() => navigation.navigate('Build')} bg={colors.gold} color={colors.ink} />
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* photo sheet — the design's intermediate step before the system picker */}
      {photoSheet && (
        <>
          <Pressable onPress={() => setPhotoSheet(false)} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(38,32,26,0.4)',
          }} />
          <Animated.View entering={FadeInUp.duration(300)} style={{
            position: 'absolute', left: 8, right: 8, bottom: 8,
            backgroundColor: colors.cream, borderRadius: 30, padding: 22, paddingHorizontal: 16, gap: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.ink }}>Library</Text>
              <Pressable onPress={() => attachPhoto('library')}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.teal }}>See all</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2, overflow: 'hidden' }}>
              <Pressable onPress={() => attachPhoto('camera')} style={{
                width: 88, height: 88, borderRadius: 18, backgroundColor: colors.white,
                borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
              }}>
                <CameraIcon size={26} />
              </Pressable>
              {['#EFE7D6', '#E4EDE9', '#F3E9D3'].map(bg => (
                <Pressable key={bg} onPress={() => attachPhoto('library')} style={{
                  width: 88, height: 88, borderRadius: 18, backgroundColor: bg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <LibraryIcon size={24} />
                </Pressable>
              ))}
            </View>
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 4 }}>
              <Pressable onPress={() => attachPhoto('library')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15,
                borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
              }}>
                <ClockIcon />
                <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink }}>Recently uploaded</Text>
              </Pressable>
              <Pressable onPress={() => attachPhoto('library')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 }}>
                <PaperclipIcon />
                <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink }}>Files</Text>
              </Pressable>
            </View>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}
