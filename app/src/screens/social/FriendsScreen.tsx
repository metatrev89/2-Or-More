import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, fonts } from '../../theme';
import { LinkIcon, PersonPlusIcon, SearchIcon, SortIcon, XIcon } from '../../components/brandIcons';
import SocialAvatar from '../../components/Avatar';
import { FRIENDS, FRIEND_AVATAR_STYLES, INVITES, INVITE_AVATAR_STYLES } from '../../api/socialMock';

type Tab = 'following' | 'followers' | 'invites';

/** Friends (design section 17) — Following / Followers / Invites. */
export default function FriendsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('following');
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [dismissed, setDismissed] = useState<Record<number, boolean>>({});
  const [invAccepted, setInvAccepted] = useState<Record<number, boolean>>({});
  const [invCancelled, setInvCancelled] = useState<Record<number, boolean>>({});

  const query = q.trim().toLowerCase();
  const matches = (name: string, sub: string) =>
    !query || name.toLowerCase().includes(query) || sub.toLowerCase().includes(query);

  const rows = FRIENDS
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) =>
      !dismissed[i] &&
      (tab === 'followers' ? f.followsYou : (!f.pending || added[i])) &&
      matches(f.name, f.sub));

  const followingCount = FRIENDS.filter((f, i) => !dismissed[i] && (!f.pending || added[i])).length;
  const followersCount = FRIENDS.filter((f, i) => !dismissed[i] && f.followsYou).length;
  const inviteRows = INVITES.map((v, i) => ({ v, i })).filter(({ i }) => !invCancelled[i]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'following', label: 'Following', count: followingCount },
    { key: 'followers', label: 'Followers', count: followersCount },
    { key: 'invites', label: 'Invites', count: inviteRows.length },
  ];

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      {/* header: title + invite button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 64, paddingHorizontal: 22, paddingBottom: 10 }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink, letterSpacing: -0.5 }}>Friends</Text>
        <Pressable onPress={() => nav.navigate('Discover')} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
          borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
        }}>
          <PersonPlusIcon size={19} />
        </Pressable>
      </View>

      {/* tabs with counts */}
      <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {tabs.map(t => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{
              paddingTop: 8, paddingBottom: 11, paddingHorizontal: 2, marginBottom: -1,
              borderBottomWidth: 2, borderBottomColor: on ? colors.ink : 'transparent',
            }}>
              <Text style={{ fontFamily: on ? fonts.sansSemi : fonts.sans, fontSize: 15, color: on ? colors.ink : colors.warmGray }}>
                {t.label} · {t.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab !== 'invites' ? (
        <>
          {/* search */}
          <View style={{ paddingTop: 14, paddingHorizontal: 22, paddingBottom: 4 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, height: 44,
              backgroundColor: '#EFE6D2', borderRadius: 14, paddingHorizontal: 14,
            }}>
              <SearchIcon size={17} />
              <TextInput
                value={q} onChangeText={setQ}
                placeholder="Search" placeholderTextColor={colors.warmGray}
                style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 0 }}
              />
            </View>
          </View>

          {/* sort row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 22, paddingBottom: 2 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray }}>
              Sort by <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>Recently active</Text>
            </Text>
            <SortIcon size={17} />
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 22, paddingBottom: 108 }}>
            {rows.map(({ f, i }) => {
              const av = FRIEND_AVATAR_STYLES[i % FRIEND_AVATAR_STYLES.length]!;
              const pending = f.pending && !added[i];
              return (
                <View key={f.name} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
                }}>
                  <SocialAvatar
                    name={f.name} size={52} bg={av.bg} ink={av.ink} fontSize={19}
                    ringWidth={f.streak ? 2 : 1} ringColor={f.streak ? colors.gold : colors.border}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.ink }}>{f.name}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>{f.sub}</Text>
                  </View>
                  {pending ? (
                    <>
                      <Pressable onPress={() => setAdded({ ...added, [i]: true })} style={{
                        height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: colors.teal,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.white }}>Follow back</Text>
                      </Pressable>
                      <Pressable onPress={() => setDismissed({ ...dismissed, [i]: true })} hitSlop={6} style={{ padding: 6 }}>
                        <XIcon size={15} />
                      </Pressable>
                    </>
                  ) : (
                    <View style={{
                      height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.sand,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray }}>Following</Text>
                    </View>
                  )}
                </View>
              );
            })}
            {!!query && rows.length === 0 && (
              <Text style={{ textAlign: 'center', paddingVertical: 44, fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>
                No one matches “{q.trim()}”
              </Text>
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 6, paddingHorizontal: 22, paddingBottom: 108 }}>
          {/* invite a friend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 12, paddingBottom: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFE6D2', alignItems: 'center', justifyContent: 'center' }}>
              <LinkIcon size={20} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.ink }}>Invite a friend</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>Share your personal link</Text>
            </View>
            <View style={{ height: 34, paddingHorizontal: 18, borderRadius: 17, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.white }}>Share</Text>
            </View>
          </View>

          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, letterSpacing: 1.2, color: colors.warmGray, textTransform: 'uppercase', paddingTop: 6, paddingBottom: 2 }}>
            Received
          </Text>
          {inviteRows.map(({ v, i }) => {
            const av = INVITE_AVATAR_STYLES[i % INVITE_AVATAR_STYLES.length]!;
            const accepted = !!invAccepted[i];
            return (
              <View key={v.name} style={{
                flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
              }}>
                <SocialAvatar name={v.name} size={52} bg={av.bg} ink={av.ink} fontSize={19} ringWidth={1} ringColor={colors.border} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 15.5, color: colors.ink }}>{v.name}</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>{v.sub}</Text>
                </View>
                {!accepted ? (
                  <Pressable onPress={() => setInvAccepted({ ...invAccepted, [i]: true })} style={{
                    height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: colors.teal,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.white }}>Accept</Text>
                  </Pressable>
                ) : (
                  <View style={{
                    height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#EFE6D2',
                    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray }}>Accepted</Text>
                  </View>
                )}
                <Pressable onPress={() => setInvCancelled({ ...invCancelled, [i]: true })} hitSlop={6} style={{ padding: 6 }}>
                  <XIcon size={15} />
                </Pressable>
              </View>
            );
          })}
          {inviteRows.length === 0 && (
            <Text style={{ textAlign: 'center', paddingVertical: 44, fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>
              No pending invites — share your link above.
            </Text>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}
