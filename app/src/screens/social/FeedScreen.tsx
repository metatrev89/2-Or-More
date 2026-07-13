import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { colors, fonts } from '../../theme';
import { Mono, Wordmark } from '../../components/ui';
import { AVATAR_STYLES, FEED_ITEMS, initials, NOTIFS } from '../../api/socialMock';
import { useStore } from '../../store';

/**
 * Feed (design screen: Feed) — creations + experiences from connections,
 * positive-only interactions: "Affirm" (no dislikes) and comments.
 */
export default function FeedScreen() {
  const { feedAffirmed, set } = useStore();
  const [commentOpen, setCommentOpen] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [myComments, setMyComments] = useState<Record<number, { name: string; text: string }[]>>({});
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleAffirm = (i: number) =>
    set({ feedAffirmed: { ...feedAffirmed, [i]: !feedAffirmed[i] } });

  const send = (i: number) => {
    const d = (drafts[i] || '').trim();
    if (!d) return;
    setMyComments({ ...myComments, [i]: [...(myComments[i] || []), { name: 'Trevor', text: d }] });
    setDrafts({ ...drafts, [i]: '' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 }}>
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink }}>Feed</Text>
          <Pressable onPress={() => setNotifOpen(true)} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20, color: colors.ink }}>🔔</Text>
            <View style={{ position: 'absolute', top: 4, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
          </Pressable>
        </View>

        {FEED_ITEMS.map((f, i) => {
          const av = AVATAR_STYLES[i % AVATAR_STYLES.length]!;
          const affirmed = !!feedAffirmed[i];
          const comments = [...f.comments, ...(myComments[i] || [])];
          return (
            <View key={i} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, marginHorizontal: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: av.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: av.ink }}>{initials(f.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>
                    <Text style={{ fontFamily: fonts.sansMedium }}>{f.name}</Text> {f.phrase}
                  </Text>
                  <Mono size={11.5}>{f.time} ago</Mono>
                </View>
              </View>

              {f.type === 'affirmation' ? (
                <View style={{ marginTop: 14, borderLeftWidth: 3, borderLeftColor: colors.gold, paddingLeft: 14 }}>
                  <Mono size={11}>{f.area}</Mono>
                  <Text style={{ fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 25, color: colors.ink, marginTop: 4 }}>{f.text}</Text>
                </View>
              ) : (
                <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream, borderRadius: 14, padding: 12 }}>
                  <Text style={{ fontSize: 20, color: f.type === 'medal' ? colors.gold : colors.teal }}>
                    {f.type === 'medal' ? '✦' : '◔'}
                  </Text>
                  <View>
                    <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink }}>{f.label}</Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.warmGray }}>{f.detail}</Text>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable onPress={() => toggleAffirm(i)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14,
                  backgroundColor: affirmed ? colors.teal : colors.white,
                  borderWidth: 1, borderColor: affirmed ? colors.teal : colors.sand,
                }}>
                  <Text style={{ fontSize: 13, color: affirmed ? colors.white : colors.teal }}>✦</Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: affirmed ? colors.white : colors.teal }}>
                    Affirm · {f.affirms + (affirmed ? 1 : 0)}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setCommentOpen({ ...commentOpen, [i]: !commentOpen[i] })} style={{
                  borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14,
                  borderWidth: 1, borderColor: colors.sand,
                }}>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray }}>
                    Comment{comments.length ? ` · ${comments.length}` : ''}
                  </Text>
                </Pressable>
              </View>

              {commentOpen[i] && (
                <View style={{ marginTop: 12, gap: 10 }}>
                  {comments.map((c, j) => (
                    <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink }}>{c.name}</Text>
                      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, flex: 1 }}>{c.text}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={drafts[i] || ''}
                      onChangeText={t => setDrafts({ ...drafts, [i]: t })}
                      placeholder="Stand in agreement…"
                      placeholderTextColor={colors.inactive}
                      onSubmitEditing={() => send(i)}
                      style={{
                        flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.cream,
                        borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
                        fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink,
                      }}
                    />
                    <Pressable onPress={() => send(i)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: colors.cream }}>↑</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {notifOpen && (
        <Pressable onPress={() => setNotifOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38,32,26,0.4)' }}>
          <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8, backgroundColor: colors.cream, borderRadius: 30, padding: 22, gap: 4 }}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.ink, marginBottom: 10 }}>Notifications</Text>
            {NOTIFS.map((n, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i < NOTIFS.length - 1 ? 1 : 0, borderBottomColor: colors.borderSoft }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: AVATAR_STYLES[i % AVATAR_STYLES.length]!.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: AVATAR_STYLES[i % AVATAR_STYLES.length]!.ink }}>{initials(n.name)}</Text>
                </View>
                <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink, lineHeight: 19 }}>
                  <Text style={{ fontFamily: fonts.sansMedium }}>{n.name}</Text> {n.text}
                </Text>
                <Mono size={11}>{n.time}</Mono>
              </View>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}
