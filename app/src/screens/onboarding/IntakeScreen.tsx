import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { AREAS, colors, fonts, timing } from '../../theme';
import { MOCK_SCRIPT } from '../../api/mockData';
import { AiSpark, Mono, PillButton, SegmentBar, Wordmark } from '../../components/ui';
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

  const attachPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Text style={{ fontSize: 22, color: colors.ink }}>‹</Text></Pressable>
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
      </ScrollView>

      {chips.length > 0 && !typing && !intakeDone && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22, paddingBottom: 12 }}>
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
                <Pressable onPress={attachPhoto} style={{
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
                ) : (
                  <Pressable onPress={micTap} style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: listening ? colors.tealDeep : colors.teal,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: colors.white, fontSize: 18 }}>{listening ? '▮▮' : '🎙'}</Text>
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
    </Animated.View>
  );
}
