import React from 'react';
import { View, Text, Image } from 'react-native';
import { colors, fonts } from '../theme';
import { AVATARS, initials } from '../api/socialMock';

/**
 * Social avatar (design's avatarFor): a colored disc with serif initials,
 * overlaid by the person's photo when the AVATARS map has one — initials
 * stay visible while the image loads. Optional ring (gold = active streak).
 */
export default function SocialAvatar({ name, size, bg, ink, ringColor, ringWidth = 0, photoUri, fontSize }: {
  name: string;
  size: number;
  bg: string;
  ink: string;
  ringColor?: string;
  ringWidth?: number;
  /** Explicit photo override (e.g. the user's own profile picture). */
  photoUri?: string | null;
  fontSize?: number;
}) {
  const uri = photoUri ?? AVATARS[name];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
      borderWidth: ringWidth, borderColor: ringColor ?? colors.border,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <Text style={{ fontFamily: fonts.serifItalic, fontSize: fontSize ?? Math.round(size * 0.37), color: ink }}>
        {initials(name)}
      </Text>
      {uri ? (
        <Image source={{ uri }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      ) : null}
    </View>
  );
}
