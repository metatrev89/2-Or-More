import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/** Password visibility eye (design bundle glyphs): plain eye, or slashed when the password is shown. */
export function EyeIcon({ size = 20, slashed = false, color = colors.warmGray }: {
  size?: number; slashed?: boolean; color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <Circle cx={12} cy={12} r={3} />
      {slashed && <Path d="M4 4l16 16" />}
    </Svg>
  );
}

/** Vector marks extracted verbatim from the design bundle (2+ First-Run.dc.html). */

export function AppleLogo({ size = 18, color = colors.cream }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.298" />
    </Svg>
  );
}

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <Path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <Path d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33z" fill="#FBBC05" />
      <Path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </Svg>
  );
}

/** Microphone (design bundle glyph — used in chat input, voice screens). */
export function MicIcon({ size = 20, color = colors.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={2} width={6} height={12} rx={3} />
      <Path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" />
    </Svg>
  );
}

/** Camera (design bundle glyph). */
export function CameraIcon({ size = 18, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx={12} cy={13} r={4} />
    </Svg>
  );
}

/** Photo library (design bundle glyph). */
export function LibraryIcon({ size = 18, color = colors.warmGray }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={3} />
      <Circle cx={8.5} cy={8.5} r={1.5} />
      <Path d="M21 15l-5-5L5 21" />
    </Svg>
  );
}

/** Reword / regenerate arrow-circle (design bundle glyph — review screen). */
export function RewordIcon({ size = 21, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a9 9 0 1 1-2.6-6.3" />
      <Path d="M21 3v6h-6" />
    </Svg>
  );
}

/** Edit pencil (design bundle glyph — review screen). */
export function PencilIcon({ size = 19, color = colors.warmGray }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Svg>
  );
}

/** Clock (design bundle glyph — photo sheet "Recently uploaded"). */
export function ClockIcon({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

/** Paperclip (design bundle glyph — photo sheet "Files"). */
export function PaperclipIcon({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </Svg>
  );
}

/** Simple check (design bundle glyph). */
export function CheckIcon({ size = 20, color = colors.cream, strokeWidth = 2.2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

/**
 * Prime protocol selector: gold ring, gold check when selected (design:
 * check stroke goes transparent when unselected — the ring stays).
 */
export function GoldCheckCircle({ size = 20, checked }: { size?: number; checked: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.gold} strokeWidth={1.8} />
      <Path d="M8.5 12.5l2.4 2.4 4.6-5.3" stroke={checked ? colors.gold : 'transparent'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = 14, color = colors.warmGray }: { size?: number; color?: string }) {
  const h = size * (15 / 13);
  return (
    <Svg width={size} height={h} viewBox="0 0 13 15" fill="none" stroke={color} strokeWidth={1.4}>
      <Rect x={1} y={6} width={11} height={8} rx={2} />
      <Path d="M3.5 6V4.5a3 3 0 0 1 6 0V6" />
    </Svg>
  );
}

/* ---- Home screen glyphs (design section 9) ---- */

export function FlameIcon({ size = 15, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Svg>
  );
}

export function BellIcon({ size = 19, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

/** The 4-point celebration star (celebStar / confetti / streak). */
export function StarBurst({ size = 16, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c.6 3.2 1.4 5.3 2.9 6.8C16.4 10.3 18.6 11.2 22 12c-3.4.8-5.6 1.7-7.1 3.2C13.4 16.7 12.6 18.8 12 22c-.6-3.2-1.4-5.3-2.9-6.8C7.6 13.7 5.4 12.8 2 12c3.4-.8 5.6-1.7 7.1-3.2C10.6 7.3 11.4 5.2 12 2z" />
    </Svg>
  );
}

export function HeadphonesIcon({ size = 14, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <Rect x={3} y={14} width={4} height={6} rx={1.6} />
      <Rect x={17} y={14} width={4} height={6} rx={1.6} />
    </Svg>
  );
}

export function VideoIcon({ size = 14, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2.5} y={6} width={13} height={12} rx={2.5} />
      <Path d="M15.5 12l6-3.5v7l-6-3.5z" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, color = colors.inactive }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function FilmIcon({ size = 19, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={16} rx={3} />
      <Path d="M3 9h18M8 4v5M16 4v5" />
    </Svg>
  );
}

export function PlayFill({ size = 11, color = colors.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 4l14 8-14 8V4z" />
    </Svg>
  );
}

export function PauseFill({ size = 12, color = colors.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={5} y={4} width={5} height={16} rx={1.5} />
      <Rect x={14} y={4} width={5} height={16} rx={1.5} />
    </Svg>
  );
}

export function XIcon({ size = 16, color = colors.ink, strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

/** Teal filled circle + cream check — the "experienced" done mark. */
export function DoneMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill={colors.teal} />
      <Path d="M17 9l-6.5 6.5L7 12" fill="none" stroke={colors.cream} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---- Feed / Friends glyphs (design sections 13-16) ---- */

export function HeartIcon({ size = 14, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20.5S4.5 15.9 2.5 11.4C1.3 8.3 3 5 6 5c1.9 0 3.2 1 4 2.3h4c.8-1.3 2.1-2.3 4-2.3 3 0 4.7 3.3 3.5 6.4-2 4.5-9.5 9.1-9.5 9.1z" />
    </Svg>
  );
}

export function BubbleIcon({ size = 14, color = colors.teal }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
    </Svg>
  );
}

export function PersonPlusIcon({ size = 19, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={8.5} cy={7} r={4} />
      <Path d="M20 8v6M23 11h-6" />
    </Svg>
  );
}

export function SearchIcon({ size = 17, color = colors.warmGray }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M21 21l-4.3-4.3" />
    </Svg>
  );
}

export function SortIcon({ size = 17, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </Svg>
  );
}

export function LinkIcon({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <Path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Svg>
  );
}

export function MedalIcon({ size = 20, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={9} r={6} />
      <Path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5" />
    </Svg>
  );
}

/** Contacts card (Discover "Connect contacts" row). */
export function ContactsCardIcon({ size = 22, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={2.5} width={15} height={19} rx={2.5} />
      <Path d="M3 7h2M3 12h2M3 17h2" />
      <Circle cx={12.5} cy={9.5} r={2.2} />
      <Path d="M8.8 16.5c0-1.9 1.7-3 3.7-3s3.7 1.1 3.7 3" />
    </Svg>
  );
}
