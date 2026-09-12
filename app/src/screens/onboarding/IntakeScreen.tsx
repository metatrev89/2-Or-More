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
// Wordmark dropped with the compact header — see the header comment below.
import { AiSpark, BackButton, Mono, PillButton, SegmentBar } from '../../components/ui';
import { CameraIcon, ChevronDownIcon, ClockIcon, LibraryIcon, MicIcon, PaperclipIcon, StarBurst } from '../../components/brandIcons';
import { BurstRing, ChipPop, Confetti } from '../../components/Celebration';
import { playCelebrationLarge, playCelebrationSmall, primeCelebrationSounds } from '../../audio/sfx';
import { DancingBars, PulseRing } from '../../components/AnimatedBars';
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
/**
 * In-character status line — replaces the typing-dots bubble (Trevor, Sept 11).
 *
 * The stages track work the backend actually does, which is what keeps this
 * honest rather than decorative: a goal answer is one round trip, while a why
 * answer also extracts the goal into a record AND composes the next area. It
 * holds on the last stage rather than looping — pretending there's more work
 * happening than there is would be theater.
 */
function ThinkingLine({ stages }: { stages: string[] }) {
  const [i, setI] = useState(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.55, { duration: 1150, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    setI(0);
    if (stages.length < 2) return;
    const timers = stages.slice(1).map((_, n) => setTimeout(() => setI(n + 1), (n + 1) * 4000));
    return () => timers.forEach(clearTimeout);
  }, [stages]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const line = stages[Math.min(i, stages.length - 1)] ?? 'Thinking…';

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 }}>
      <AiSpark />
      <Animated.View style={pulseStyle}>
        <Animated.Text
          key={line}
          entering={FadeIn.duration(340)}
          style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}
        >
          {line}
        </Animated.Text>
      </Animated.View>
    </View>
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
  const [stages, setStages] = useState<string[]>([]);
  const [doneCeleb, setDoneCeleb] = useState(false);
  const prevArea = useRef(-1);
  const doneCelebFired = useRef(false);
  const liveStarted = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Submit → dismiss keyboard, pin the sent message to the top ──────────
  // Meta's chat does this on every send and it's the single biggest readability
  // win: the question you just asked parks under the header and the whole
  // screen below it belongs to the answer. We need three measurements for it —
  // where each message sits, how tall the list is, and how tall the window is.
  const msgY = useRef<Record<number, number>>({});
  const [viewportH, setViewportH] = useState(0);
  const [listH, setListH] = useState(0);
  const [pinIdx, setPinIdx] = useState(-1);

  const pinY = pinIdx >= 0 ? msgY.current[pinIdx] ?? 0 : 0;
  // Only as much empty runway as the pin actually needs. `listH - pinY` is what
  // already sits below the pinned message; anything short of a full screen is
  // the gap that would otherwise stop it partway up.
  const tailSpacer = pinIdx >= 0 && viewportH > 0
    ? Math.max(0, viewportH - (listH - pinY) - 28)
    : 0;

  useEffect(() => {
    if (pinIdx < 0) return;
    const y = msgY.current[pinIdx];
    if (y == null) return;
    // One frame after the spacer lands, or scrollTo clamps against the old
    // content height and lands short.
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 6), animated: true }), 60);
    return () => clearTimeout(t);
  }, [pinIdx, listH, tailSpacer]);

  /** Send behaviour: close the keyboard, then park this message at the top. */
  const pinSent = (index: number) => {
    Keyboard.dismiss();
    setPinIdx(index);
  };

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

  // ── What the AI is doing while the user waits ──────────────────────────
  // Which stages to show depends on what kind of answer was just sent, so we
  // count answers within the current area (first = goal, second = why).
  const answersInArea = useRef(0);
  useEffect(() => { answersInArea.current = 0; }, [areaIdx]);

  const nextAreaLabel = (from: number): string =>
    from + 1 >= AREAS.length ? CATCH_ALL_AREA.label : AREAS[from + 1]!;

  const stagesFor = (kind: 'open' | 'goal' | 'why' | 'skip'): string[] => {
    const atCatchAll = areaIdx >= AREAS.length;
    switch (kind) {
      case 'open': return [`Opening ${AREAS[0]}…`];
      case 'goal': return ['Taking that in…'];
      case 'skip': return ['No problem…', `Opening ${nextAreaLabel(areaIdx)}…`];
      case 'why': return atCatchAll
        ? ['Taking that in…', 'Writing that down…']
        : ['Taking that in…', 'Noting what matters to you…', `Opening ${nextAreaLabel(areaIdx)}…`];
    }
  };

  // ── Live path (apiLive): the conversation is Spark, via the backend. ──
  const liveStart = async () => {
    // Code-authored welcome renders INSTANTLY (no waiting on the model) —
    // typing dots then cover only Spark's first question.
    const hello = userName?.trim() ? `Welcome to 2+ (Two or More), ${userName.trim()}.` : 'Welcome to 2+ (Two or More).';
    const welcome = `${hello} We're going to walk through seven areas of your life, root to crown. For each one I'll capture your goal and your why — and turn them into your personal I AM affirmations.`;
    setStages(stagesFor('open'));
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
    const idx = useStore.getState().msgs.length;
    addMsg({ isAi: false, text: skip ? 'Not this session.' : text });
    answersInArea.current += 1;
    // First answer in an area is the goal (one step); the second is the why,
    // which also triggers goal extraction and the next area (three steps).
    setStages(stagesFor(skip ? 'skip' : answersInArea.current >= 2 ? 'why' : 'goal'));
    set({ typing: true, listening: false });
    setChips([]);
    setDraft('');
    pinSent(idx);
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
      // Deliberately NOT scrolling to the end here: the reply should fill the
      // space under the pinned question, not shove it off the top.
    } catch {
      const st = useStore.getState();
      st.set({
        typing: false,
        msgs: [...st.msgs, { isAi: true, text: 'Hmm — that one didn’t reach me. Mind sending it again?' }],
      });
    }
  };

  useEffect(() => {
    primeCelebrationSounds(); // load both chimes before the first star fires at 600ms
    if (msgs.length === 0) {
      if (apiLive) { liveStart(); return; }
      setStages(stagesFor('open'));
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
    const idx = useStore.getState().msgs.length;
    addMsg({ isAi: false, text: text || step.user });
    answersInArea.current += 1;
    setStages(stagesFor(answersInArea.current >= 2 ? 'why' : 'goal'));
    set({ typing: true });
    setChips([]);
    setDraft('');
    pinSent(idx);
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
      // Stays pinned — see liveAnswer.
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
    const idx = st.msgs.length;
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
    pinSent(idx);
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
      {/*
        Header compacted to Meta's proportions (Trevor, Sept 11). It used to be
        three stacked rows — centred wordmark, segment bar, then area + skip —
        costing ~155pt before a single message. Meta's chat gives its header one
        ~48pt row and spends everything else on the conversation.

        The wordmark is the piece that went: this screen is reached from three
        branded screens in a row, so it was repeating something the user had
        just seen, at the cost of the thing they came to read. Progress stayed —
        the segment bar and its stars are the spine of the intake — but it's now
        a hairline strip sharing a row with the skip link.
      */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 16.5, color: colors.ink, letterSpacing: -0.2 }}>
            {isCatchAll ? CATCH_ALL_AREA.label : AREAS[areaIdx]}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: fonts.serifItalic, fontSize: 11.5, color: colors.inactive, marginTop: 0.5 }}>
            {isCatchAll ? CATCH_ALL_AREA.note : AREA_CHAKRAS[areaIdx]}
          </Text>
        </View>
        <Mono>{barIdx + 1}/7</Mono>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8 }}>
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
        {!intakeDone && (
          <Pressable onPress={skipArea} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
              {isCatchAll ? 'Skip' : 'Not this session'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onLayout={e => setViewportH(e.nativeEvent.layout.height)}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10 }}
      >
        <View onLayout={e => setListH(e.nativeEvent.layout.height)} style={{ gap: 16 }}>
          {msgs.map((m, i) => m.isAi ? (
            /*
              AI replies are full-bleed text, not bubbles (Trevor, Sept 11 —
              matching Meta). A bubble capped at 78% and indented past an avatar
              was throwing away roughly a third of every line, which is the
              whole reason the reply felt cramped. The spark marker survives —
              the brand's "show the work" rule needs AI output labelled — but it
              now sits ABOVE the text on its own line rather than beside it,
              which is what buys back the width.

              It only prints on the first message of a run, so a three-message
              answer reads as one voice instead of three stamped fragments.
            */
            <Animated.View
              key={i}
              entering={FadeInUp.duration(timing.fadeUpMs)}
              onLayout={e => { msgY.current[i] = e.nativeEvent.layout.y; }}
              style={{ gap: 8 }}
            >
              {!msgs[i - 1]?.isAi && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AiSpark />
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12.5, letterSpacing: 0.3, color: colors.warmGray }}>2+</Text>
                </View>
              )}
              <Text style={{ fontFamily: fonts.sans, fontSize: 16.5, lineHeight: 25, color: colors.ink }}>{m.text}</Text>
            </Animated.View>
          ) : (
            <Animated.View
              key={i}
              entering={FadeInUp.duration(timing.fadeUpMs)}
              onLayout={e => { msgY.current[i] = e.nativeEvent.layout.y; }}
              style={{ alignItems: 'flex-end' }}
            >
              <View style={{ backgroundColor: colors.ink, borderRadius: 20, borderBottomRightRadius: 8, paddingVertical: 12, paddingHorizontal: 16, maxWidth: '82%' }}>
                {m.photoUri ? <Image source={{ uri: m.photoUri }} style={{ width: 190, height: 190, borderRadius: 12, marginBottom: m.text ? 8 : 0 }} /> : null}
                {m.text ? <Text style={{ fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: colors.cream }}>{m.text}</Text> : null}
              </View>
            </Animated.View>
          ))}
          {typing && <ThinkingLine stages={stages} />}
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
        </View>

        {/*
          Runway so the pinned message can physically reach the top. Without it
          scrollTo clamps at the end of the content and the message stops
          wherever it happens to land — which is exactly the "it barely moved"
          failure. Sized to the shortfall only, so it collapses to nothing once
          the reply is long enough to fill the screen on its own.
        */}
        <View style={{ height: tailSpacer }} />
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!intakeDone ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 22, paddingTop: 6 }}>
            <View style={{
              backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 26,
              paddingTop: 14, paddingRight: 14, paddingBottom: 12, paddingLeft: 18, gap: 10,
              shadowColor: colors.ink, shadowOpacity: 0.07, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4,
            }}>
              {/*
                Multiline so a long answer wraps in place instead of scrolling
                sideways through a one-line slot — intake answers are sentences,
                not search queries. `submitBehavior="blurAndSubmit"` is what
                makes Return send AND drop the keyboard in one gesture, which is
                the behaviour Trevor asked for; the send button below does the
                same thing through pinSent().
              */}
              <TextInput
                ref={inputRef}
                value={draft} onChangeText={setDraft}
                placeholder={listening ? 'Listening…' : 'Type or speak…'}
                placeholderTextColor={colors.inactive}
                multiline
                returnKeyType="send"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={() => draft.trim() && answer(draft.trim())}
                style={{
                  fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.ink,
                  paddingHorizontal: 4, paddingTop: 0, maxHeight: 108,
                }}
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
