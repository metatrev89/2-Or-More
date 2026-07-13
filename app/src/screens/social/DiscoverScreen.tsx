import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../../theme';
import { Label, Mono } from '../../components/ui';
import { AVATAR_STYLES, DISC_FOLLOWBACK, DISC_SUGGESTED, initials } from '../../api/socialMock';

/** Discover people (design screen: Discover) — suggestions + add-backs. */
export default function DiscoverScreen() {
  const nav = useNavigation();
  const [added, setAdded] = useState<Record<string, boolean>>({ 'sug-1': true });
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const section = (title: string, list: { name: string; sub: string }[], keyPrefix: string, cta: string) => (
    <View style={{ marginTop: 22 }}>
      <Label>{title}</Label>
      <View style={{ gap: 12, marginTop: 12 }}>
        {list.map((p, i) => {
          const k = `${keyPrefix}-${i}`;
          if (dismissed[k]) return null;
          const av = AVATAR_STYLES[(keyPrefix === 'fb' ? i + 3 : i) % AVATAR_STYLES.length]!;
          const isAdded = !!added[k];
          return (
            <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: av.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: av.ink }}>{initials(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink }}>{p.name}</Text>
                <Mono size={11.5}>{p.sub}</Mono>
              </View>
              <Pressable onPress={() => setAdded({ ...added, [k]: !isAdded })} style={{
                borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14,
                backgroundColor: isAdded ? colors.white : colors.ink,
                borderWidth: 1, borderColor: isAdded ? colors.sand : colors.ink,
              }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: isAdded ? colors.warmGray : colors.cream }}>
                  {isAdded ? 'Added' : cta}
                </Text>
              </Pressable>
              <Pressable onPress={() => setDismissed({ ...dismissed, [k]: true })}>
                <Text style={{ fontSize: 16, color: colors.inactive }}>×</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => nav.goBack()}><Text style={{ fontSize: 22, color: colors.ink }}>‹</Text></Pressable>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink }}>Discover people</Text>
      </View>
      {section('Suggested for you', DISC_SUGGESTED, 'sug', 'Add')}
      {section('Added you', DISC_FOLLOWBACK, 'fb', 'Add back')}
    </ScrollView>
  );
}
