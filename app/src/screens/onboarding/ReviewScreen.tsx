import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton, Label, PillButton, Serif, Wordmark } from '../../components/ui';
import { PencilIcon, RewordIcon } from '../../components/brandIcons';
import { BurstRing, CelebStar, ChipPop, Confetti } from '../../components/Celebration';
import { StarBurst } from '../../components/brandIcons';
import { playCelebrationLarge, playCelebrationSmall } from '../../audio/sfx';
import { api, apiLive } from '../../api/client';
import { affText, useStore } from '../../store';

/** Affirmation review — the "want → I am" reveal (design screen 5). */
export default function ReviewScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Review'>) {
  const { affirmations, reviewIndex, reworded, edits, set } = useStore();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [dotCeleb, setDotCeleb] = useState(-1);
  const [doneCeleb, setDoneCeleb] = useState(false);
  const advanced = useRef(false);

  const goNext = () => {
    if (advanced.current) return;
    advanced.current = true;
    setDoneCeleb(false);
    navigation.navigate('Schedule');
  };

  const aff = affirmations[reviewIndex];
  if (!aff) return null;
  const text = affText({ affirmations, edits, reworded }, reviewIndex);
  const isReworded = !!reworded[reviewIndex] && !edits[reviewIndex];

  const keepIt = () => {
    if (reviewIndex >= affirmations.length - 1) {
      // 7 of 7 kept — big celebration first, then on to scheduling
      // (auto-advances when it ends, or on tap; Trevor, Jul 20).
      advanced.current = false;
      setEditing(false);
      setDoneCeleb(true);
      playCelebrationLarge();
      setTimeout(goNext, 4200);
    } else {
      // Each confirmed affirmation earns its star + chime (voice note, Jul 20).
      playCelebrationSmall();
      set({ reviewIndex: reviewIndex + 1 });
      setEditing(false);
      setDotCeleb(reviewIndex);
      setTimeout(() => setDotCeleb(c => (c === reviewIndex ? -1 : c)), 1100);
    }
  };

  const rewordIt = async () => {
    // Live: first reword fetches a fresh Spark phrasing into `alt`; after that
    // the button toggles between versions exactly like mock mode.
    if (apiLive && aff.goalId && !reworded[reviewIndex]) {
      const fresh = await api.rewordAffirmation('me', aff.goalId);
      if (fresh) {
        const affs = [...affirmations];
        affs[reviewIndex] = { ...aff, alt: fresh };
        set({ affirmations: affs });
      }
    }
    set({ reworded: { ...reworded, [reviewIndex]: !reworded[reviewIndex] }, edits: { ...edits, [reviewIndex]: undefined as never } });
    setEditing(false);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream, paddingHorizontal: 24, paddingTop: 52 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
        <BackButton onPress={() => reviewIndex > 0 ? set({ reviewIndex: reviewIndex - 1 }) : navigation.goBack()} />
        <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink }}>
          Affirmation {reviewIndex + 1} of {affirmations.length}
        </Text>
        <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 14, maxWidth: 132 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.ink }}>{aff.area}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.sand, paddingLeft: 16, paddingVertical: 4, marginTop: 22 }}>
          <Label>You said</Label>
          <Text style={{ fontFamily: fonts.sans, fontSize: 18, lineHeight: 26, color: colors.warmGray, marginTop: 8 }}>
            “{aff.youSaid}”
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 26 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <View style={{ backgroundColor: colors.aiTint, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.tealDeep }}>+ Rewritten as I am</Text>
          </View>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {isReworded && (
          <Animated.Text entering={FadeIn.duration(400)} style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.tealDeep, textAlign: 'center', marginTop: -14, marginBottom: 10 }}>
            Reworded just now — version 2
          </Animated.Text>
        )}

        <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingTop: 26, paddingHorizontal: 24, paddingBottom: 20 }}>
          {!editing ? (
            <Serif size={26}>“{text}”</Serif>
          ) : (
            <>
              <TextInput
                value={editText} onChangeText={setEditText} multiline
                style={{
                  fontFamily: fonts.serifItalic, fontSize: 22, lineHeight: 33, color: colors.ink,
                  borderWidth: 1, borderColor: colors.sand, borderRadius: 14, padding: 14,
                  backgroundColor: colors.cream, minHeight: 120, textAlignVertical: 'top',
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <PillButton label="Save" height={42} onPress={() => {
                  set({ edits: { ...edits, [reviewIndex]: editText.trim() || text } });
                  setEditing(false);
                }} style={{ paddingHorizontal: 22 }} />
                <PillButton label="Cancel" height={42} bg="transparent" color={colors.warmGray} onPress={() => setEditing(false)} style={{ paddingHorizontal: 18 }} />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PillButton label="Keep it" height={58} onPress={keepIt} style={{ flex: 1 }} />
        <Pressable onPress={rewordIt} style={{
          width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: colors.teal,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <RewordIcon />
        </Pressable>
        <Pressable onPress={() => { setEditing(true); setEditText(text); }} style={{
          width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: colors.sand,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <PencilIcon />
        </Pressable>
      </View>
      <Text style={{ textAlign: 'center', fontFamily: fonts.sans, fontSize: 13, color: colors.inactive, marginTop: 10 }}>
        Reword · Edit
      </Text>
      <View style={{ paddingTop: 20, paddingBottom: 34 }}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {affirmations.map((_, i) => (
            <View key={i} style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: i <= reviewIndex ? colors.gold : colors.border }} />
          ))}
        </View>
        {dotCeleb >= 0 && (
          <View pointerEvents="none" style={{
            position: 'absolute', top: 6, left: `${((dotCeleb + 0.5) / affirmations.length) * 100}%`, marginLeft: -8, zIndex: 2,
          }}>
            <CelebStar key={dotCeleb} size={16} durMs={1000} />
          </View>
        )}
      </View>

      {/* 7-of-7 celebration — auto-advances to Schedule, or tap anywhere to continue */}
      {doneCeleb && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <Pressable onPress={goNext} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View pointerEvents="none" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
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
                All 7 affirmations — yours. Let's set your schedule.
              </Text>
            </ChipPop>
          </View>
        </View>
      )}
    </Animated.View>
  );
}
