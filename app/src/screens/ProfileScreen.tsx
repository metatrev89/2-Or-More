import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { colors, fonts } from '../theme';
import { Label, Mono, Wordmark } from '../components/ui';
import { affText, useStore } from '../store';
import { MOCK_AFFS } from '../api/mockData';

const SHARE_KEYS = ['text', 'audio', 'video', 'rings'] as const;

/**
 * Profile (design screen: Profile) — the personal affirmation feed with
 * per-affirmation, per-format sharing controls (v2 social privacy model:
 * affirmations.visibility + share_settings in the social migration).
 */
export default function ProfileScreen() {
  const store = useStore();
  const { profilePhotoUri, streakDays, shareSel, set } = store;
  const affs = store.affirmations.length ? store.affirmations : MOCK_AFFS;
  const [privacyMode, setPrivacyMode] = useState(false);

  const toggle = (i: number, k: string) => {
    const key = `${i}-${k}`;
    set({ shareSel: { ...shareSel, [key]: !shareSel[key] } });
  };

  const onCount = (i: number) => SHARE_KEYS.filter(k => shareSel[`${i}-${k}`]).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ paddingTop: 60, paddingBottom: 40, paddingHorizontal: 22 }}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}><Wordmark /></View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
        {profilePhotoUri ? (
          <Image source={{ uri: profilePhotoUri }} style={{ width: 58, height: 58, borderRadius: 29 }} />
        ) : (
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 22, color: colors.cream }}>T</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 20, color: colors.ink }}>Trevor</Text>
          <Mono size={12.5}>{streakDays}-day streak · 7 affirmations</Mono>
        </View>
        <Pressable onPress={() => setPrivacyMode(!privacyMode)} style={{
          borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14,
          backgroundColor: privacyMode ? colors.ink : colors.white,
          borderWidth: 1, borderColor: privacyMode ? colors.ink : colors.border,
        }}>
          <Text style={{ fontFamily: privacyMode ? fonts.sansMedium : fonts.sans, fontSize: 13, color: privacyMode ? colors.cream : colors.warmGray }}>
            {privacyMode ? 'Done' : 'Privacy'}
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <Label>My affirmations</Label>
      </View>

      {affs.map((a, i) => (
        <View key={a.id} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mono size={11.5}>{a.area}</Mono>
            {privacyMode && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: onCount(i) ? colors.teal : colors.warmGray }}>
                {onCount(i) === 0 ? 'Private' : onCount(i) === SHARE_KEYS.length ? 'Everything' : `${onCount(i)} of ${SHARE_KEYS.length}`}
              </Text>
            )}
          </View>
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 25, color: colors.ink, marginTop: 8 }}>
            “{affText(store, i)}”
          </Text>
          {privacyMode && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {SHARE_KEYS.map(k => {
                const on = !!shareSel[`${i}-${k}`];
                return (
                  <Pressable key={k} onPress={() => toggle(i, k)} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12,
                    backgroundColor: on ? colors.teal : colors.white,
                    borderWidth: 1, borderColor: on ? colors.teal : colors.sand,
                  }}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: on ? colors.white : colors.warmGray, textTransform: 'capitalize' }}>
                      {k}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}

      <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.warmGray, textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
        Everything is private by default. Sharing a format lets friends stand in agreement with it.
      </Text>
    </ScrollView>
  );
}
