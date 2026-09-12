import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { BackButton, Label, Mono, PillButton, SegmentBar, Serif, Wordmark } from '../components/ui';
import { MicIcon } from '../components/brandIcons';
import { PulseRing } from '../components/AnimatedBars';
import { CelebStar } from '../components/Celebration';
import { playCelebrationSmall } from '../audio/sfx';
import {
  ensureMicPermission, enterRecordingMode, exitRecordingMode,
  saveRecording, deleteRecording, fmtDuration, RECORDING_OPTIONS,
} from '../audio/voiceRecordings';
import { uploadVoiceRecording } from '../api/voiceUpload';
import { affSet, affText, useStore } from '../store';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

/** Hard stop so a forgotten recording can't fill the disk. */
const MAX_MS = 90_000;

function PlayIcon({ playing, size = 19, color = colors.cream }: { playing: boolean; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {playing
        ? <Path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        : <Path d="M8 5.5v13l11-6.5z" />}
    </Svg>
  );
}

/**
 * Card-by-card voice recorder (Trevor, Sept 11).
 *
 * v1 has no voice cloning, so playback IS the recording — every affirmation
 * needs its own take rather than one 60-second sample. Any card the user skips
 * keeps playing in the preset AI voice, which is what makes skipping safe.
 *
 * Entered two ways: with an `affirmationId` to re-record exactly one, or with
 * nothing to walk the whole set starting at the first un-recorded card.
 */
export default function VoiceRecorderScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'VoiceRecorder'>) {
  const singleId = route.params?.affirmationId;
  const { affirmations, edits, reworded, voiceRecordings, setVoiceRecording, set } = useStore();

  // Same set Home renders — falls back to the mock when the store is empty, so
  // arriving from Home's prompt never lands on an empty recorder.
  const set0 = affSet(affirmations);
  const cards = singleId ? set0.filter(a => a.id === singleId) : set0;
  const firstUnrecorded = Math.max(0, cards.findIndex(a => !voiceRecordings[a.id]));
  const [idx, setIdx] = useState(singleId ? 0 : firstUnrecorded);
  const [savedCeleb, setSavedCeleb] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recState = useAudioRecorderState(recorder);

  const aff = cards[idx];
  const existing = aff ? voiceRecordings[aff.id] : undefined;
  const player = useAudioPlayer(existing ?? null);
  // Drive the play/pause glyph off the PLAYER, not local state — otherwise the
  // button sticks on "pause" forever once a clip finishes on its own.
  const playerStatus = useAudioPlayerStatus(player);
  const previewing = playerStatus.playing;

  // Release the audio session on the way out, whatever route the user took.
  useEffect(() => () => { void exitRecordingMode(); }, []);

  // Safety stop — never let a take run away.
  useEffect(() => {
    if (recState.isRecording && recState.durationMillis >= MAX_MS) void stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.isRecording, recState.durationMillis]);

  if (!aff) {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, backgroundColor: colors.cream, paddingTop: 90, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.warmGray }}>
          No affirmations to record yet.
        </Text>
        <View style={{ marginTop: 20 }}>
          <PillButton label="Go back" onPress={() => navigation.goBack()} />
        </View>
      </Animated.View>
    );
  }

  const statement = affText({ affirmations: set0, edits, reworded }, set0.indexOf(aff));
  const recordedCount = set0.filter(a => voiceRecordings[a.id]).length;

  const startRecording = async () => {
    if (busy || recState.isRecording) return;
    setBusy(true);
    try {
      if (previewing) player.pause();
      const granted = await ensureMicPermission();
      if (!granted) {
        Alert.alert(
          'Microphone access needed',
          'Enable microphone access in Settings to record your affirmations in your own voice.',
        );
        return;
      }
      await enterRecordingMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Recording didn’t start', 'Give it another try in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await recorder.stop();
      const temp = recorder.uri;
      if (temp) {
        const prev = existing;
        const dest = await saveRecording(temp, aff.id);
        setVoiceRecording(aff.id, dest);
        if (prev) void deleteRecording(prev); // re-record: drop the old take
        // Sync in the background — the local file is what plays, so a failed
        // or offline upload must never block or undo the save.
        void uploadVoiceRecording(dest, aff.id);
        playCelebrationSmall();
        setSavedCeleb(true);
        setTimeout(() => setSavedCeleb(false), 1100);
      }
    } catch {
      Alert.alert('Recording didn’t save', 'Give it another try.');
    } finally {
      await exitRecordingMode();
      setBusy(false);
    }
  };

  const togglePreview = () => {
    if (!existing) return;
    if (previewing) { player.pause(); return; }
    // seekTo is async — it MUST be awaited before play(), or a clip that already
    // ran to the end replays from its own end and you hear nothing (the same
    // trap that silenced the celebration chimes).
    player.seekTo(0).catch(() => {}).finally(() => player.play());
  };

  const leave = () => {
    if (previewing) player.pause();
    navigation.goBack();
  };

  const advance = () => {
    if (previewing) player.pause();
    if (idx < cards.length - 1) {
      setIdx(idx + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      leave();
    }
  };

  /** Per-card skip — this affirmation keeps the AI voice for now. */
  const skipCard = () => {
    set({ recordLater: true });
    advance();
  };

  const last = idx === cards.length - 1;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, paddingTop: 52 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 4 }}>
        <BackButton onPress={leave} />
        <View style={{ flex: 1 }}>
          <SegmentBar total={cards.length} activeCount={idx + 1} />
        </View>
        <Mono>{idx + 1}/{cards.length}</Mono>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 8 }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.8, color: colors.warmGray, textTransform: 'uppercase' }}>
          {singleId ? 'Re-record' : 'Your voice'}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
          {recordedCount} of {set0.length} recorded
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 10 }}>
        <View style={{ marginTop: 6 }}>
          <Label>{aff.area}</Label>
        </View>

        <Animated.View
          key={aff.id}
          entering={FadeInUp.duration(320)}
          style={{
            backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
            borderRadius: 24, paddingVertical: 26, paddingHorizontal: 24, marginTop: 12,
          }}
        >
          <Serif size={24}>“{statement}”</Serif>
        </Animated.View>

        <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: colors.warmGray, marginTop: 16 }}>
          {existing
            ? 'Saved. Play it back, re-record it, or move on.'
            : 'Read it out loud, slowly, like you already mean it.'}
        </Text>
      </ScrollView>

      {/* recorder controls */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 30, paddingTop: 4 }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <View style={{ height: 22, justifyContent: 'center' }}>
            {recState.isRecording ? (
              <Mono size={15} color={colors.ink}>{fmtDuration(recState.durationMillis)}</Mono>
            ) : existing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12l5 5L20 7" />
                </Svg>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.ink }}>Recorded in your voice</Text>
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.inactive }}>Not recorded — plays in the AI voice</Text>
            )}
          </View>

          <View style={{ marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
            {/* Gold mic matches Home's record prompt; ink + stop square while
                recording. MicIcon defaults to WHITE — always pass a color. */}
            <PulseRing size={78} color={recState.isRecording ? colors.gold : 'transparent'}>
              <Pressable
                onPress={() => (recState.isRecording ? stopRecording() : startRecording())}
                style={{
                  width: 78, height: 78, borderRadius: 39,
                  backgroundColor: recState.isRecording ? colors.ink : colors.gold,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {recState.isRecording
                  ? <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: colors.cream }} />
                  : <MicIcon size={30} color={colors.ink} />}
              </Pressable>
            </PulseRing>
            {savedCeleb && (
              <View pointerEvents="none" style={{ position: 'absolute', top: -6, right: 2, zIndex: 2 }}>
                <CelebStar size={18} durMs={1000} />
              </View>
            )}
          </View>

          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, marginTop: 10 }}>
            {recState.isRecording ? 'Tap to stop' : existing ? 'Tap to re-record' : 'Tap to record'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {existing && !recState.isRecording && (
            <Pressable
              onPress={togglePreview}
              style={{
                width: 58, height: 58, borderRadius: 29, backgroundColor: colors.teal,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <PlayIcon playing={previewing} size={21} color={colors.cream} />
            </Pressable>
          )}
          <PillButton
            label={last ? (existing ? 'Done' : 'Finish') : 'Next affirmation'}
            height={58}
            onPress={advance}
            disabled={recState.isRecording}
            bg={recState.isRecording ? colors.sand : colors.ink}
            color={recState.isRecording ? colors.warmGray : colors.cream}
            style={{ flex: 1 }}
          />
        </View>

        {!existing && !recState.isRecording && (
          <Pressable onPress={skipCard} style={{ paddingTop: 14 }}>
            <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray }}>
              Record in my own voice later
            </Text>
          </Pressable>
        )}

        <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18, color: colors.inactive, marginTop: 12 }}>
          Your own voice is the strongest signal to your subconscious.{'\n'}You can re-record anytime.
        </Text>
      </View>
    </Animated.View>
  );
}
