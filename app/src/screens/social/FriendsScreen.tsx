import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { Mono } from '../../components/ui';
import { AVATAR_STYLES, FRIENDS, initials } from '../../api/socialMock';

/** Friends (design screen: Friends) — following / followers / invites tabs. */
export default function FriendsScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState<'following' | 'followers' | 'invites'>('following');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<Record<number, boolean>>({});

  const rows = FRIENDS
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) =>
      (tab === 'followers' ? f.followsYou : (!f.pending || added[i])) &&
      (!q || f.name.toLowerCase().includes(q.toLowerCase()) || f.sub.toLowerCase().includes(q.toLowerCase())));

  const tabs = [
    { key: 'following' as const, label: 'Following' },
    { key: 'followers' as const, label: 'Followers' },
    { key: 'invites' as const, label: 'Invites' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, paddingTop: 60 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 }}>
        <Pressable onPress={() => nav.goBack()}><Text style={{ fontSize: 22, color: colors.ink }}>‹</Text></Pressable>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink }}>Friends</Text>
      </View>

      <TextInput
        value={q} onChangeText={setQ}
        placeholder="Search friends" placeholderTextColor={colors.inactive}
        style={{
          margin: 22, marginBottom: 8, height: 46, borderRadius: 23,
          backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 18, fontFamily: fonts.sans, fontSize: 15, color: colors.ink,
        }}
      />

      <View style={{ flexDirection: 'row', paddingHorizontal: 22, gap: 20 }}>
        {tabs.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: tab === t.key ? colors.ink : 'transparent' }}>
            <Text style={{ fontFamily: tab === t.key ? fonts.sansSemi : fonts.sans, fontSize: 14.5, color: tab === t.key ? colors.ink : colors.warmGray }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }}>
        {tab === 'invites' ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, textAlign: 'center', marginTop: 20 }}>
            Invite friends to stand in agreement with your vision.
          </Text>
        ) : rows.map(({ f, i }) => {
          const av = AVATAR_STYLES[i % AVATAR_STYLES.length]!;
          const pending = f.pending && !added[i];
          return (
            <View key={f.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22, backgroundColor: av.bg,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: f.streak ? 2 : 0, borderColor: colors.gold,
              }}>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: av.ink }}>{initials(f.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink }}>{f.name}</Text>
                <Mono size={11.5}>{f.sub}</Mono>
              </View>
              {pending && (
                <Pressable onPress={() => setAdded({ ...added, [i]: true })} style={{ backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.cream }}>Add back</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
