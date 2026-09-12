import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, fonts } from '../theme';
import { Mono } from '../components/ui';
import { CameraFrontIcon, LibraryFrameIcon, XIcon } from '../components/brandIcons';
import { affText, useStore } from '../store';
import { MOCK_AFFS } from '../api/mockData';

const SHARE_OPTS = [
  { key: 'text', label: 'Text', d: 'M4 6h16M4 12h16M4 18h10' },
  { key: 'audio', label: 'Audio', d: 'M11 5L6 9H3v6h3l5 4V5zM16.5 8.5a5 5 0 0 1 0 7' },
  { key: 'video', label: 'Video', d: 'M15.5 10l5-3v10l-5-3M3 6.5h12.5v11H3z' },
  { key: 'rings', label: 'Rings', d: 'M12 3a9 9 0 1 1-6.4 2.6' },
] as const;

/** Settings gear (design's 19px, 1.7 stroke). */
function GearIcon({ size = 19, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3.2} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

/** Small padlock for the privacy chip (design's 11×13 glyph). */
function PrivacyLock({ color }: { color: string }) {
  return (
    <Svg width={11} height={13} viewBox="0 0 13 15" fill="none" stroke={color} strokeWidth={1.4}>
      <Rect x={1} y={6} width={11} height={8} rx={2} />
      <Path d="M3.5 6V4.5a3 3 0 0 1 6 0V6" />
    </Svg>
  );
}

/** 24px share-state circle: teal check (all), teal dot (some), empty (none). */
function ShareCircle({ state }: { state: 'all' | 'some' | 'none' }) {
  return (
    <View style={{
      width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: state === 'all' ? colors.teal : colors.white,
      borderWidth: 1.5, borderColor: state === 'none' ? colors.sand : colors.teal,
    }}>
      {state === 'all' && (
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4.5 12.5l5 5 10-11" />
        </Svg>
      )}
      {state === 'some' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal }} />}
    </View>
  );
}

/**
 * Profile (design section 13) — your affirmation feed with per-affirmation,
 * per-format sharing controls. Everything is private by default.
 */
export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useStore();
  const { profilePhotoUri, userName, shareSel, set, setProfilePhoto } = store;
  const affs = store.affirmations.length ? store.affirmations : MOCK_AFFS;
  const [privacyMode, setPrivacyMode] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  /** Copy the picked image out of the picker's temp cache so it survives restarts. */
  const persistPhoto = async (uri: string) => {
    try {
      const dest = `${FileSystem.documentDirectory}profile-photo-${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      setProfilePhoto(dest);
    } catch {
      setProfilePhoto(uri); // cache path still works for this session
    }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    setPhotoSheet(false);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Camera access needed', 'Enable camera access in Settings to take a selfie.'); return; }
    }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, cameraType: 'front', allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    const uri = res.assets?.[0]?.uri;
    if (uri) persistPhoto(uri);
  };

  const onCount = (i: number) => SHARE_OPTS.filter(o => shareSel[`${i}-${o.key}`]).length;
  const allShared = affs.every((_, i) => onCount(i) === SHARE_OPTS.length);

  const toggleOpt = (i: number, k: string) =>
    set({ shareSel: { ...shareSel, [`${i}-${k}`]: !shareSel[`${i}-${k}`] } });

  const toggleCard = (i: number) => {
    const allOn = onCount(i) === SHARE_OPTS.length;
    const sel = { ...shareSel };
    SHARE_OPTS.forEach(o => { sel[`${i}-${o.key}`] = !allOn; });
    set({ shareSel: sel });
  };

  const toggleShareAll = () => {
    const turnOn = !allShared;
    const sel: Record<string, boolean> = { ...shareSel };
    affs.forEach((_, i) => SHARE_OPTS.forEach(o => { sel[`${i}-${o.key}`] = turnOn; }));
    set({ shareSel: sel });
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 22, paddingBottom: 108 }}>
        {/* header — avatar is tappable; the little camera badge is the edit affordance */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => setPhotoSheet(true)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={{ width: 58, height: 58, borderRadius: 29 }} />
            ) : (
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 23, color: colors.cream }}>
                  {(userName || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{
              position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11,
              backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.cream,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <CameraFrontIcon size={11} color={colors.cream} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 23, color: colors.ink }}>{userName}</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, marginTop: 2 }}>
              Practicing since July 2026
            </Text>
          </View>
          <Pressable onPress={() => nav.navigate('Settings')} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
            borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
          }}>
            <GearIcon />
          </Pressable>
        </View>

        {/* privacy chip + section label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => setPrivacyMode(!privacyMode)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16,
              paddingVertical: 5, paddingHorizontal: 11,
              backgroundColor: privacyMode ? colors.ink : colors.white,
              borderWidth: 1, borderColor: privacyMode ? colors.ink : colors.border,
            }}>
              <PrivacyLock color={privacyMode ? colors.cream : colors.warmGray} />
              <Text style={{
                fontFamily: privacyMode ? fonts.sansMedium : fonts.sans, fontSize: 12,
                color: privacyMode ? colors.cream : colors.warmGray,
              }}>
                {privacyMode ? 'Done' : 'Privacy'}
              </Text>
            </Pressable>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: colors.warmGray }}>
              YOUR AFFIRMATIONS
            </Text>
          </View>
          <Mono size={13}>{affs.length}</Mono>
        </View>

        {/* privacy explainer + share all */}
        {privacyMode && (
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={{ backgroundColor: colors.aiTint, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.tealDeep, lineHeight: 19 }}>
                Choose what each affirmation shares with friends. Anything left off stays private to you.
              </Text>
            </View>
            <Pressable onPress={toggleShareAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <ShareCircle state={allShared ? 'all' : 'none'} />
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.teal }}>
                {allShared ? 'Sharing everything' : 'Share all'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* affirmation cards */}
        <View style={{ gap: 10, marginTop: 12 }}>
          {affs.map((a, i) => {
            const n = onCount(i);
            const cardState = n === SHARE_OPTS.length ? 'all' : n > 0 ? 'some' : 'none';
            return (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                {privacyMode && (
                  <Pressable onPress={() => toggleCard(i)} style={{ marginTop: 16 }}>
                    <ShareCircle state={cardState} />
                  </Pressable>
                )}
                <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.6, color: colors.warmGray, textTransform: 'uppercase' }}>
                    {a.area}
                  </Text>
                  <Text style={{ fontFamily: fonts.serifItalic, fontSize: 16.5, lineHeight: 24, color: colors.ink, marginTop: 9 }}>
                    “{affText(store, i)}”
                  </Text>
                  {privacyMode && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 12, paddingTop: 11 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.4, color: colors.warmGray, textTransform: 'uppercase' }}>
                          Shared with friends
                        </Text>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.inactive }}>
                          {n === 0 ? 'Private' : n === SHARE_OPTS.length ? 'Everything' : `${n} of ${SHARE_OPTS.length}`}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                        {SHARE_OPTS.map(o => {
                          const on = !!shareSel[`${i}-${o.key}`];
                          const ink = on ? colors.white : colors.warmGray;
                          return (
                            <Pressable key={o.key} onPress={() => toggleOpt(i, o.key)} style={{
                              flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16,
                              backgroundColor: on ? colors.teal : colors.white,
                              borderWidth: 1, borderColor: on ? colors.teal : colors.sand,
                            }}>
                              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <Path d={o.d} />
                              </Svg>
                              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12.5, color: ink }}>{o.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* profile photo sheet */}
      {photoSheet && (
        <>
          <Pressable onPress={() => setPhotoSheet(false)} style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(38,32,26,0.4)',
          }} />
          <Animated.View entering={FadeInUp.duration(300)} style={{
            position: 'absolute', left: 8, right: 8, bottom: 8,
            backgroundColor: colors.cream, borderRadius: 30, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 18, color: colors.ink }}>Profile photo</Text>
              <Pressable onPress={() => setPhotoSheet(false)} hitSlop={8}>
                <XIcon size={16} />
              </Pressable>
            </View>
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 4 }}>
              <Pressable onPress={() => pickPhoto('camera')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15,
                borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
              }}>
                <CameraFrontIcon size={20} />
                <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink }}>Take a selfie</Text>
              </Pressable>
              <Pressable onPress={() => pickPhoto('library')} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15,
                borderBottomWidth: profilePhotoUri ? 1 : 0, borderBottomColor: colors.borderSoft,
              }}>
                <LibraryFrameIcon size={20} color={colors.ink} />
                <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.ink }}>Choose from library</Text>
              </Pressable>
              {profilePhotoUri && (
                <Pressable onPress={() => { setProfilePhoto(null); setPhotoSheet(false); }} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15,
                }}>
                  <XIcon size={18} color={colors.warmGray} />
                  <Text style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.warmGray }}>Remove photo</Text>
                </Pressable>
              )}
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12.5, color: colors.warmGray, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
              Your photo stays private to your practice.
            </Text>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}
