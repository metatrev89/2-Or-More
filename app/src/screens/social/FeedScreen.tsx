import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { BubbleIcon, HeartIcon, MedalIcon } from '../../components/brandIcons';
import SocialAvatar from '../../components/Avatar';
import { CelebStar } from '../../components/Celebration';
import { AVATAR_STYLES, FEED_ITEMS } from '../../api/socialMock';
import { useStore } from '../../store';

const RING_CIRC = 2 * Math.PI * 18;

/** Feed post ring (design 44px): teal session / gold daily, check when full else gold spark. */
function FeedRing({ pct, daily }: { pct: number; daily: boolean }) {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={18} fill="none" stroke={colors.border} strokeWidth={4} />
      <Circle
        cx={22} cy={22} r={18} fill="none" stroke={daily ? colors.gold : colors.teal} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${(pct * RING_CIRC).toFixed(1)} ${((1 - pct) * RING_CIRC).toFixed(1)}`}
        transform="rotate(-90 22 22)"
      />
      {pct >= 1 ? (
        <Path d="M15.5 22.5l4.5 4.5 8.5-10" stroke={colors.teal} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <Path d="M22 13.5c.5 3 1.3 4.9 2.6 6.2 1.3 1.3 3.2 2.1 6.2 2.6-3 .5-4.9 1.3-6.2 2.6-1.3 1.3-2.1 3.2-2.6 6.2-.5-3-1.3-4.9-2.6-6.2-1.3-1.3-3.2-2.1-6.2-2.6 3-.5 4.9-1.3 6.2-2.6 1.3-1.3 2.1-3.2 2.6-6.2z" fill={colors.gold} />
      )}
    </Svg>
  );
}

/**
 * Feed (design section 16) — creations + experiences from connections,
 * positive-only interactions: "Affirm" (no dislikes) and comments.
 */
export default function FeedScreen() {
  const { feedAffirmed, userName, profilePhotoUri, set } = useStore();
  const [commentOpen, setCommentOpen] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [myComments, setMyComments] = useState<Record<number, { name: string; text: string }[]>>({});
  const [affirmCeleb, setAffirmCeleb] = useState(-1);
  const [postCeleb, setPostCeleb] = useState(-1);

  const toggleAffirm = (i: number) => {
    const on = !feedAffirmed[i];
    set({ feedAffirmed: { ...feedAffirmed, [i]: on } });
    if (on) {
      setAffirmCeleb(i);
      setTimeout(() => setAffirmCeleb(c => (c === i ? -1 : c)), 1100);
    }
  };

  const send = (i: number) => {
    const d = (drafts[i] || '').trim();
    if (!d) return;
    setMyComments({ ...myComments, [i]: [...(myComments[i] || []), { name: userName, text: d }] });
    setDrafts({ ...drafts, [i]: '' });
    setPostCeleb(i);
    setTimeout(() => setPostCeleb(c => (c === i ? -1 : c)), 1100);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: 64, paddingHorizontal: 22, paddingBottom: 10 }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 24, color: colors.ink, letterSpacing: -0.5 }}>Feed</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingHorizontal: 22, paddingBottom: 14, gap: 12 }}>
        {FEED_ITEMS.map((f, i) => {
          const av = AVATAR_STYLES[i % AVATAR_STYLES.length]!;
          const affirmed = !!feedAffirmed[i];
          const comments = [...f.comments, ...(myComments[i] || [])];
          return (
            <View key={i} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16 }}>
              {/* header: avatar + "name phrase" + time */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <SocialAvatar name={f.name} size={42} bg={av.bg} ink={av.ink} fontSize={16} />
                <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: '#5C5142', lineHeight: 19 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>{f.name}</Text> {f.phrase}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.inactive }}>{f.time}</Text>
              </View>

              {/* affirmation quote */}
              {f.type === 'affirmation' && (
                <View style={{ backgroundColor: colors.cream, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, marginTop: 12 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 1.6, color: colors.warmGray, textTransform: 'uppercase' }}>
                    {f.area}
                  </Text>
                  <Text style={{ fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 23, color: colors.ink, marginTop: 6 }}>
                    {f.text}
                  </Text>
                </View>
              )}

              {/* session/daily ring */}
              {(f.type === 'session' || f.type === 'daily') && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.cream, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginTop: 12 }}>
                  <FeedRing pct={f.pct ?? 0} daily={f.type === 'daily'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.ink }}>{f.label}</Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, marginTop: 2 }}>{f.detail}</Text>
                  </View>
                </View>
              )}

              {/* medal */}
              {f.type === 'medal' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.cream, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginTop: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                    <MedalIcon size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.ink }}>{f.label}</Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, marginTop: 2 }}>{f.detail}</Text>
                  </View>
                </View>
              )}

              {/* actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <Pressable onPress={() => toggleAffirm(i)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 17,
                  backgroundColor: affirmed ? colors.teal : colors.white,
                  borderWidth: 1, borderColor: affirmed ? colors.teal : colors.sand,
                }}>
                  {affirmCeleb === i && (
                    <View pointerEvents="none" style={{ position: 'absolute', top: -10, left: '50%', marginLeft: -8 }}>
                      <CelebStar size={16} durMs={1000} />
                    </View>
                  )}
                  <HeartIcon size={14} color={affirmed ? colors.white : colors.teal} />
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: affirmed ? colors.white : colors.teal }}>
                    Affirm · {f.affirms + (affirmed ? 1 : 0)}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setCommentOpen({ ...commentOpen, [i]: !commentOpen[i] })} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 17,
                  backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand,
                }}>
                  <BubbleIcon size={14} />
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.teal }}>
                    Comment{comments.length ? ` · ${comments.length}` : ''}
                  </Text>
                </Pressable>
              </View>

              {/* comments */}
              {commentOpen[i] && (
                <Animated.View entering={FadeInUp.duration(300)} style={{ borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 12, paddingTop: 11 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={drafts[i] || ''}
                      onChangeText={t => setDrafts({ ...drafts, [i]: t })}
                      placeholder="Add a comment…"
                      placeholderTextColor={colors.inactive}
                      onSubmitEditing={() => send(i)}
                      style={{
                        flex: 1, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.sand,
                        backgroundColor: colors.cream, paddingHorizontal: 14,
                        fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink,
                      }}
                    />
                    <Pressable onPress={() => send(i)} style={{
                      height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.ink,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {postCeleb === i && (
                        <View pointerEvents="none" style={{ position: 'absolute', top: -10, left: '50%', marginLeft: -8 }}>
                          <CelebStar size={16} durMs={1000} />
                        </View>
                      )}
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.cream }}>Post</Text>
                    </Pressable>
                  </View>
                  {comments.length > 0 && (
                    <View style={{ gap: 8, marginTop: 11 }}>
                      {comments.map((c, j) => (
                        <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                          <SocialAvatar
                            name={c.name} size={24} bg={colors.ink} ink={colors.cream} fontSize={11}
                            photoUri={c.name === userName ? profilePhotoUri : undefined}
                          />
                          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 13.5, color: '#5C5142', lineHeight: 19 }}>
                            <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink }}>{c.name}</Text> {c.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}
