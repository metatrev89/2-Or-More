import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Mono } from '../components/ui';
import { FlameIcon, PencilIcon } from '../components/brandIcons';
import { useStore } from '../store';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_BIG_HEIGHTS = [30, 42, 12, 52, 44, 36, 16];

/** Design's daySessions: 7 scheduled sessions, per-session ring completion. */
const DAY_SESSIONS = ['7:00 AM', '9:30 AM', '12:00 PM', '3:00 PM', '5:30 PM', '8:00 PM', '9:45 PM']
  .map((time, i) => ({ time, done: [7, 7, 7, 7, 3, 0, 0][i]! }));

const NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

function fmtHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const d = hr % 12 === 0 ? 12 : hr % 12;
  return `${d} ${hr < 12 ? 'AM' : 'PM'}`;
}

const CardLabel = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11.5, letterSpacing: 1.8, color: colors.warmGray }}>{children}</Text>
);

const card = {
  backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  borderRadius: 20, padding: 20, marginTop: 14,
} as const;

/** Alignment legend marks (teal check / gold star / terracotta circle-slash). */
function AlignMark({ kind, size = 13 }: { kind: 'aligned' | 'aligning' | 'disconnected' | 'upcoming'; size?: number }) {
  if (kind === 'aligned') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 12.5l4.2 4.2 8.8-10.2" stroke={colors.teal} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  if (kind === 'aligning') return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3c.55 3 1.3 4.9 2.7 6.3C16.1 10.7 18 11.45 21 12c-3 .55-4.9 1.3-6.3 2.7C13.3 16.1 12.55 18 12 21c-.55-3-1.3-4.9-2.7-6.3C7.9 13.3 6 12.55 3 12c3-.55 4.9-1.3 6.3-2.7C10.7 7.9 11.45 6 12 3z" fill={colors.gold} />
    </Svg>
  );
  if (kind === 'disconnected') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={colors.terracotta} strokeWidth={2.2} />
      <Path d="M6.5 17.5L17.5 6.5" stroke={colors.terracotta} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} fill="none" stroke={colors.border} strokeWidth={2.4} />
    </Svg>
  );
}

/** Progress medal (52px disc, ribbon glyph — design's three-state row). */
function Medal({ label, bg, border, ink, labelC }: { label: string; bg: string; border: string | null; ink: string; labelC: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26, backgroundColor: bg,
        borderWidth: border ? 1 : 0, borderColor: border ?? undefined,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={9} r={5.5} />
          <Path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
        </Svg>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: labelC, textAlign: 'center', lineHeight: 15 }}>{label}</Text>
    </View>
  );
}

function Stepper({ value, width, small, onDown, onUp }: { value: string; width: number; small?: boolean; onDown: () => void; onUp: () => void }) {
  const s = small ? 26 : 36;
  const btn = {
    width: s, height: s, borderRadius: s / 2, borderWidth: 1, borderColor: colors.sand,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 6 : 14 }}>
      <Pressable onPress={onDown} style={btn}><Text style={{ fontSize: small ? 14 : 18, color: colors.ink }}>−</Text></Pressable>
      <Mono size={small ? 14 : 18} color={colors.ink} style={{ width, textAlign: 'center' }}>{value}</Mono>
      <Pressable onPress={onUp} style={btn}><Text style={{ fontSize: small ? 14 : 18, color: colors.ink }}>+</Text></Pressable>
    </View>
  );
}

/** Progress (design section 11): daily ring hero, alignment, sessions, week, medals, month. */
export default function ProgressScreen() {
  const { homeReadDone, streakDays, freq, awStart, awEnd, qStart, qEnd, set } = useStore();
  const [editing, setEditing] = useState(false);
  const readCount = homeReadDone.length;
  const frac = readCount / 7;
  const remaining = 7 - readCount;
  const r = 52, circ = 2 * Math.PI * r;
  const sessionsComplete = DAY_SESSIONS.filter(d => d.done === 7).length;

  const sessionMark = (done: number, i: number): 'aligned' | 'aligning' | 'disconnected' | 'upcoming' => {
    const complete = done === 7;
    if (complete && i === 1) return 'disconnected'; // design: 9:30 completed out of alignment
    if (complete) return 'aligned';
    if (done > 0) return 'aligning';
    return 'upcoming';
  };

  const rowBetween = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 22, paddingBottom: 12 }}>
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 28, color: colors.ink, letterSpacing: -0.5 }}>Progress</Text>

        {/* hero: today ring + streak */}
        <View style={[card, { marginTop: 18, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 22 }]}>
          <View style={{ width: 120, height: 120 }}>
            <Svg width={120} height={120} viewBox="0 0 120 120">
              <Circle cx={60} cy={60} r={r} fill="none" stroke={colors.border} strokeWidth={9} />
              <Circle
                cx={60} cy={60} r={r} fill="none" stroke={colors.teal} strokeWidth={9} strokeLinecap="round"
                strokeDasharray={`${(circ * frac).toFixed(1)} ${(circ * (1 - frac)).toFixed(1)}`}
                transform="rotate(-90 60 60)"
              />
            </Svg>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 23, color: colors.ink }}>{readCount}/7</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.warmGray }}>today</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            {/* flame sized to the streak numeral per Trevor's July 13 design update (was 17px) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 32, color: colors.ink }}>{streakDays}</Text>
              <FlameIcon size={26} />
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.warmGray, marginTop: 2 }}>day streak</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.warmGray, lineHeight: 20, marginTop: 10 }}>
              {remaining > 0
                ? `${NUM_WORDS[remaining]} more experience${remaining === 1 ? '' : 's'} close${remaining === 1 ? 's' : ''} today's ring.`
                : "Today's ring is closed."}
            </Text>
          </View>
        </View>

        {/* alignment */}
        <View style={card}>
          <View style={rowBetween}>
            <CardLabel>ALIGNMENT</CardLabel>
            <Mono size={15} color={colors.teal}>60%</Mono>
          </View>
          <View style={{ flexDirection: 'row', height: 10, gap: 2, marginTop: 14 }}>
            <View style={{ flex: 60, backgroundColor: colors.teal, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 }} />
            <View style={{ flex: 20, backgroundColor: colors.gold }} />
            <View style={{ flex: 20, backgroundColor: colors.terracotta, borderTopRightRadius: 5, borderBottomRightRadius: 5 }} />
          </View>
          <View style={[rowBetween, { marginTop: 12 }]}>
            {([
              ['aligned', 'Fully aligned', 3],
              ['aligning', 'Aligning', 1],
              ['disconnected', 'Disconnected', 1],
            ] as const).map(([kind, label, n]) => (
              <View key={kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlignMark kind={kind} />
                <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.warmGray }}>
                  {label} · <Mono size={12} color={colors.ink}>{n}</Mono>
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* today's sessions */}
        <View style={card}>
          <View style={rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CardLabel>TODAY'S SESSIONS</CardLabel>
              <Pressable onPress={() => setEditing(!editing)} style={{
                width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: editing ? colors.gold : 'transparent',
              }}>
                <PencilIcon size={14} color={editing ? colors.ink : colors.inactive} />
              </Pressable>
            </View>
            <Mono size={15} color={colors.ink}>{sessionsComplete}/7</Mono>
          </View>

          {!editing ? (
            <View style={{ marginTop: 8 }}>
              {DAY_SESSIONS.map((d, i) => {
                const mark = sessionMark(d.done, i);
                const complete = d.done === 7;
                return (
                  <View key={d.time} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
                    borderBottomWidth: 1, borderBottomColor: i < DAY_SESSIONS.length - 1 ? colors.borderSoft : 'transparent',
                  }}>
                    <Mono size={12} color={d.done > 0 ? colors.ink : colors.inactive} style={{ width: 60 }}>{d.time}</Mono>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
                      {Array.from({ length: 7 }, (_, j) => (
                        <Svg key={j} width={12} height={12} viewBox="0 0 24 24">
                          <Circle
                            cx={12} cy={12} r={9} strokeWidth={3.6}
                            fill={j < d.done ? 'rgba(21,122,110,0.25)' : 'none'}
                            stroke={j < d.done ? colors.teal : colors.border}
                          />
                        </Svg>
                      ))}
                    </View>
                    <Mono size={12.5} color={complete ? colors.teal : d.done > 0 ? colors.gold : colors.inactive} style={{ width: 40, textAlign: 'right' }}>
                      {Math.round((d.done / 7) * 100)}%
                    </Mono>
                    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                      <AlignMark kind={mark} size={14} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(350)} style={{ marginTop: 16 }}>
              <View style={rowBetween}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>Times per day</Text>
                <Stepper value={`${freq}×`} width={36}
                  onDown={() => set({ freq: Math.max(1, freq - 1) })}
                  onUp={() => set({ freq: Math.min(12, freq + 1) })} />
              </View>
              <View style={[rowBetween, { marginTop: 16 }]}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>Active window</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Stepper small value={fmtHour(awStart)} width={46}
                    onDown={() => { const v = Math.max(0, awStart - 1); set({ awStart: v, qEnd: v }); }}
                    onUp={() => { const v = Math.min(awEnd - 1, awStart + 1); set({ awStart: v, qEnd: v }); }} />
                  <Text style={{ fontSize: 13, color: colors.inactive }}>–</Text>
                  <Stepper small value={fmtHour(awEnd)} width={46}
                    onDown={() => { const v = Math.max(awStart + 1, awEnd - 1); set({ awEnd: v, qStart: v }); }}
                    onUp={() => { const v = Math.min(23, awEnd + 1); set({ awEnd: v, qStart: v }); }} />
                </View>
              </View>
              <View style={[rowBetween, { marginTop: 14 }]}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray }}>Quiet hours</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Mono size={14} color={colors.ink} style={{ width: 46, textAlign: 'center' }}>{fmtHour(qStart)}</Mono>
                  <Text style={{ fontSize: 13, color: colors.inactive }}>–</Text>
                  <Mono size={14} color={colors.ink} style={{ width: 46, textAlign: 'center' }}>{fmtHour(qEnd)}</Mono>
                </View>
              </View>
              <View style={{ marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.warmGray, lineHeight: 19 }}>
                  Staggered wake to wind-down · takes effect tomorrow
                </Text>
              </View>
              <Pressable onPress={() => setEditing(false)} style={{
                height: 44, borderRadius: 22, backgroundColor: colors.teal,
                alignItems: 'center', justifyContent: 'center', marginTop: 16,
              }}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white }}>Done</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* this week */}
        <View style={card}>
          <View style={rowBetween}>
            <CardLabel>THIS WEEK</CardLabel>
            <Mono size={15} color={colors.ink}>92%</Mono>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 56, marginTop: 16 }}>
            {WEEK_BIG_HEIGHTS.map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                <View style={{ width: '100%', height: h, borderRadius: 5, backgroundColor: i < 6 ? colors.gold : colors.border }} />
                <Mono size={10.5} color={colors.inactive}>{DAYS[i]}</Mono>
              </View>
            ))}
          </View>
        </View>

        {/* medals */}
        <View style={card}>
          <CardLabel>MEDALS</CardLabel>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
            <Medal label="First week" bg={colors.gold} border={null} ink={colors.ink} labelC={colors.ink} />
            <Medal label="Perfect day" bg={colors.goldSoft} border={colors.gold} ink={colors.ink} labelC={colors.ink} />
            <Medal label="Early riser" bg={colors.white} border={colors.border} ink={colors.inactive} labelC={colors.inactive} />
          </View>
        </View>

        {/* streak pause note — encouraging, never condemning */}
        <View style={[card, { paddingVertical: 18 }]}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray, lineHeight: 22 }}>
            Tuesday paused your streak — no shame in a full day. You picked it right back up Wednesday morning.
          </Text>
        </View>

        {/* month so far */}
        <View style={[card, { marginBottom: 10 }]}>
          <CardLabel>JULY SO FAR</CardLabel>
          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Experiences</Text>
              <Mono size={15} color={colors.ink}>132</Mono>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Minutes in practice</Text>
              <Mono size={15} color={colors.ink}>96</Mono>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Most heard</Text>
              <Text style={{ flex: 1, fontFamily: fonts.serifItalic, fontSize: 14, color: colors.warmGray, textAlign: 'right' }}>
                "I am a present father…"
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
