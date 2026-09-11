import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Keyboard, Platform, Alert } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { AREAS, AREA_CHAKRAS, CATCH_ALL_AREA, colors, fonts, timing } from '../../theme';
import { MOCK_SCRIPT } from '../../api/mockData';
import { api, apiLive } from '../../api/client';
import Svg, { Path } from 'react-native-svg';
import { AiSpark, BackButton, Mono, PillButton, SegmentBar, Wordmark } from '../../components/ui';
import { CameraIcon, ChevronDownIcon, ClockIcon, LibraryIcon, MicIcon, PaperclipIcon, StarBurst } from '../../components/brandIcons';
import { BurstRing, ChipPop, Confetti } from '../../components/Celebration';
import { playCelebrationLarge, playCelebrationSmall, primeCelebrationSounds } from '../../audio/sfx';
import { BlinkingDots, DancingBars, PulseRing } from '../../components/AnimatedBars';
import { CelebStar } from '../../components/Celebration';

/** Gentle bobbing chevron directing attention to the CTA below. */
function BobbingArrow() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(6, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style}>
      <ChevronDownIcon size={22} color={colors.ink} />
    </Animated.View>
  );
}
import { useStore } from '../../store';

/**
 * Conversational intake (design screen 3). Mock mode replays the scripted
 * interview; live mode swaps `advance` for api.intakeAnswer without touching
 * the render tree.
 */
export default function IntakeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Intake'>) {
  const { msgs, scriptIdx, areaIdx, typing, listening, intakeDone, addMsg, set } = useStore();
  const userName = useStore(s => s.userName);
  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [barCeleb, setBarCeleb] = useState(-1);
  const [doneCeleb, setDoneCeleb] = useState(false);
  const prevArea = useRef(-1);
  const doneCelebFired = useRef(false);
  const liveStarted = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // All seven areas answered → big celebration (no mood check-in), auto-dismisses.
  useEffect(() => {
    if (!intakeDone || doneCelebFired.current) return;
    doneCelebFired.current = true;
    setDoneCeleb(true);
    playCelebrationLarge();
    const t = setTimeout(() => setDoneCeleb(false), 4200);
    return () => clearTimeout(t);
  }, [intakeDone]);

  // Star fires over each progress bar as it lights — including the first on entry
  // (Trevor, Jul 15: make the intake feel like progress is being won).
  useEffect(() => {
    if (areaIdx === prevArea.current) return;
    const first = prevArea.current === -1;
    prevArea.current = areaIdx;
    // The catch-all lights no segment, so it earns no star and no chime —
    // the big celebration on completion is the payoff instead.
    if (areaIdx >= AREAS.length) return;
    const show = setTimeout(() => { setBarCeleb(areaIdx); playCelebrationSmall(); }, first ? 600 : 0);
    const hide = setTimeout(() => setBarCeleb(c => (c === areaIdx ? -1 : c)), (first ? 600 : 0) + 1100);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [areaIdx]);

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // ── Live path (apiLive): the conversation is Spark, via the backend. ──
  const liveStart = async () => {
    // Code-authored welcome renders INSTANTLY (no waiting on the model) —
    // typing dots then cover only Spark's first question.
    const hello = userName?.trim() ? `Welcome to 2+ (Two or More), ${userName.trim()}.` : 'Welcome to 2+ (Two or More).';
    const welcome = `${hello} We're going to walk through seven areas of your life, root to crown. For each one I'll capture your goal and your why — and turn them into your personal I AM affirmations.`;
    set({ typing: true, msgs: [{ isAi: true, text: welcome }] });
    scrollDown();
    try {
      const step = await api.intakeStart('me', userName);
      liveStarted.current = true;
      const st = useStore.getState();
      st.set({
        typing: false,
        msgs: [...st.msgs, ...step.ai.map(t => ({ isAi: true, text: t }))],
        areaIdx: step.area,
        intakeDone: step.done,
      });
      scrollDown();
    } catch {
      const st = useStore.getState();
      st.set({
        typing: false,
        msgs: [...st.msgs, { isAi: true, text: 'I’m having trouble connecting right now. Check your connection, then send me a message and we’ll pick it up.' }],
      });
    }
  };

  const liveAnswer = async (text: string, skip = false) => {
    if (!liveStarted.current) {
      await liveStart();
      if (!liveStarted.current || skip) return;
    }
    addMsg({ isAi: false, text: skip ? 'Not this session.' : text });
    set({ typing: true, listening: false });
    setChips([]);
    setDraft('');
    scrollDown();
    try {
      const step = await api.intakeAnswer('me', text, scriptIdx, skip);
      const st = useStore.getState();
      st.set({
        typing: false,
        msgs: [...st.msgs, ...step.ai.map(t => ({ isAi: true, text: t }))],
        // On completion hold whatever area we were on (7 = catch-all) so the
        // header doesn't jump back a step under the celebration.
        areaIdx: step.done ? st.areaIdx : step.area,
        intakeDone: step.done,
      });
      scrollDown();
    } catch {
      const st = useStore.getState();
      st.set({
        typing: false,
        msgs: [...st.msgs, { isAi: true, text: 'Hmm — that one didn’t reach me. Mind sending it again?' }],
      });
      scrollDown();
    }
  };

  useEffect(() => {
    primeCelebrationSounds(); // load both chimes before the first star fires at 600ms
    if (msgs.length === 0) {
      if (apiLive) { liveStart(); return; }
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
    if (apiLive) {
      const t = (text ?? draft).trim();
      if (t) liveAnswer(t);
      return;
    }
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
    if (apiLive) {
      // Real dictation lands with the STT pass; until then the keyboard's own
      // mic is the voice path — focus the input so it's one tap away.
      inputRef.current?.focus();
      return;
    }
    set({ listening: true });
    setTimeout(() => answer(), 1400);
  };

  const skipArea = () => {
    if (apiLive) { liveAnswer('', true); return; }
    let j = scriptIdx;
    while (j < MOCK_SCRIPT.length && MOCK_SCRIPT[j]!.area === areaIdx) j++;
    if (j >= MOCK_SCRIPT.length) j = MOCK_SCRIPT.length - 1;
    const next = MOCK_SCRIPT[j]!;
    const st = useStore.getState();
    set({
      msgs: [
        ...st.msgs,
        { isAi: false, text: 'Not this session.' },
        { isAi: true, text: 'No problem — we’ll leave that one for now. You can come back to it anytime from your profile.' },
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
      });
      st.setProfilePhoto(uri);
      scrollDown();
    }, timing.typingDelayMs);
  };

  // The catch-all (areaIdx 7) isn't a chakra: the bar stays full at 7/7 and the
  // header names it rather than indexing past the end of AREAS.
  const isCatchAll = areaIdx >= AREAS.length;
  const barIdx = Math.min(areaIdx, AREAS.length - 1);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, paddingTop: 52 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 2 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <SegmentBar total={7} activeCount={barIdx + 1} />
          {barCeleb >= 0 && (
            <View pointerEvents="none" style={{
              position: 'absolute', top: -14, left: `${((barCeleb + 0.5) / 7) * 100}%`, marginLeft: -8, zIndex: 2,
            }}>
              <CelebStar key={barCeleb} size={16} durMs={1000} />
            </View>
          )}
        </View>
        <Mono>{barIdx + 1}/7</Mono>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 6 }}>
        <View style={{ flexShrink: 1, paddingRight: 8 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.8, color: colors.warmGray, textTransform: 'uppercase' }}>
            {isCatchAll ? CATCH_ALL_AREA.label : AREAS[areaIdx]}
          </Text>
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 11.5, color: colors.inactive, marginTop: 1 }}>
            {isCatchAll ? CATCH_ALL_AREA.note : AREA_CHAKRAS[areaIdx]}
          </Text>
        </View>
        {!intakeDone && (
          <Pressable onPress={skipArea}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
              {isCatchAll ? 'Skip' : 'Not this session'}
            </Text>
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
              <BlinkingDots />
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
              paddingTop: 16, paddingRight: 14, paddingBottom: 12, paddingLeft: 18, gap: 12,
              shadowColor: colors.ink, shadowOpacity: 0.07, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4,
            }}>
              <TextInput
                ref={inputRef}
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
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
                    <Path d="M12 5v14M5 12h14" />
                  </Svg>
                </Pressable>
                <View style={{ flex: 1 }} />
                {draft.trim() ? (
                  <Pressable onPress={() => answer(draft.trim())} style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 19V5M5 12l7-7 7 7" />
                    </Svg>
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
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <BobbingArrow />
              </View>
              <PillButton label="Build my affirmations" onPress={() => navigation.navigate('Build')} bg={colors.gold} color={colors.ink} />
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* all-seven-areas celebration — notification only, hands-off, auto-dismisses */}
      {doneCeleb && (
        <View pointerEvents="none" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <Confetti />
          <BurstRing color={colors.gold} borderWidth={4} durMs={1100} />
          <BurstRing color={colors.teal} borderWidth={3} durMs={1300} delayMs={200} />
          <BurstRing color={colors.gold} borderWidth={2} durMs={1500} delayMs={400} />
          <ChipPop durMs={600} delayMs={200} style={{
            backgroundColor: colors.ink, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 26,
            flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: '88%',
            shadowColor: colors.ink, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
          }}>
            <StarBurst size={22} />
            <Text style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 17, color: colors.cream }}>
              Great job! Now let's build your affirmations.
            </Text>
          </ChipPop>
        </View>
      )}

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
