import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { BackButton } from '../../components/ui';
import { ContactsCardIcon, XIcon } from '../../components/brandIcons';
import SocialAvatar from '../../components/Avatar';
import { DISC_FOLLOWBACK, DISC_SUGGESTED, DISCOVER_AVATAR_STYLES } from '../../api/socialMock';

/** Discover people (design section 14) — connect contacts, suggestions, add-backs. */
export default function DiscoverScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [added, setAdded] = useState<Record<string, boolean>>({ 'sug-1': true }); // Craig Judd starts added
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [connectRow, setConnectRow] = useState(true);

  const row = (p: { name: string; sub: string }, i: number, keyPrefix: string, cta: string, ctaPad: number) => {
    const k = `${keyPrefix}-${i}`;
    if (dismissed[k]) return null;
    const av = DISCOVER_AVATAR_STYLES[(keyPrefix === 'fb' ? i + 3 : i) % DISCOVER_AVATAR_STYLES.length]!;
    const isAdded = !!added[k];
    return (
      <View key={p.name} style={{
        flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
      }}>
        <SocialAvatar name={p.name} size={52} bg={av.bg} ink={av.ink} fontSize={19} ringWidth={1} ringColor={colors.border} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.ink }}>{p.name}</Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>{p.sub}</Text>
        </View>
        <Pressable onPress={() => setAdded({ ...added, [k]: !isAdded })} style={{
          height: 34, paddingHorizontal: isAdded ? 16 : ctaPad, borderRadius: 17,
          backgroundColor: isAdded ? '#EFE6D2' : colors.teal,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: isAdded ? fonts.sans : fonts.sansMedium, fontSize: 13.5,
            color: isAdded ? colors.ink : colors.white,
          }}>
            {isAdded ? 'Added' : cta}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDismissed({ ...dismissed, [k]: true })} hitSlop={6} style={{ padding: 6 }}>
          <XIcon size={15} />
        </Pressable>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      {/* header: back + centered title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 22, paddingBottom: 12 }}>
        <BackButton onPress={() => nav.goBack()} />
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 18, color: colors.ink }}>
          Discover people
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 22, paddingBottom: 12 }}>
        {/* connect contacts */}
        {connectRow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 10, paddingBottom: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFE6D2', alignItems: 'center', justifyContent: 'center' }}>
              <ContactsCardIcon size={22} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.ink }}>Connect contacts</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>Find people you know</Text>
            </View>
            <Pressable onPress={() => nav.navigate('Contacts')} style={{
              height: 34, paddingHorizontal: 18, borderRadius: 17, backgroundColor: colors.teal,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.white }}>Connect</Text>
            </Pressable>
            <Pressable onPress={() => setConnectRow(false)} hitSlop={6} style={{ padding: 6 }}>
              <XIcon size={15} />
            </Pressable>
          </View>
        )}

        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink, paddingTop: 8, paddingBottom: 4 }}>
          Suggested for you
        </Text>
        {DISC_SUGGESTED.map((p, i) => row(p, i, 'sug', 'Add', 20))}

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 4 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink }}>Add back</Text>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.teal }}>See all</Text>
        </View>
        {DISC_FOLLOWBACK.map((p, i) => row(p, i, 'fb', 'Add back', 16))}
      </ScrollView>
    </Animated.View>
  );
}
