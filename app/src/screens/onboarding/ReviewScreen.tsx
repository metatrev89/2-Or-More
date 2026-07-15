import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton, Label, PillButton, Serif, Wordmark } from '../../components/ui';
import { PencilIcon, RewordIcon } from '../../components/brandIcons';
import { affText, useStore } from '../../store';

/** Affirmation review — the "want → I am" reveal (design screen 5). */
export default function ReviewScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Review'>) {
  const { affirmations, reviewIndex, reworded, edits, set } = useStore();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const aff = affirmations[reviewIndex];
  if (!aff) return null;
  const text = affText({ affirmations, edits, reworded }, reviewIndex);
  const isReworded = !!reworded[reviewIndex] && !edits[reviewIndex];

  const keepIt = () => {
    if (reviewIndex >= affirmations.length - 1) navigation.navigate('Schedule');
    else { set({ reviewIndex: reviewIndex + 1 }); setEditing(false); }
  };

  const rewordIt = () => {
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
      <View style={{ flexDirection: 'row', gap: 7, paddingTop: 20, paddingBottom: 34 }}>
        {affirmations.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: i <= reviewIndex ? colors.gold : colors.border }} />
        ))}
      </View>
    </Animated.View>
  );
}
