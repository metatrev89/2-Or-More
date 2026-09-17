import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Mono } from '../components/ui';
import { FlameIcon, PencilIcon } from '../components/brandIcons';
import { useStore } from '../store';
import { useTracking } from '../tracking/useTracking';

/**
 * Weekday initials for the week chart, rotated so the last column is TODAY
 * rather than assuming the week starts on Monday — the bars are the last seven
 * days, so the labels have to follow the same window.
 */
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const weekDayLabels = (end: Date): string[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - (6 - i));
    return DAY_INITIALS[d.getDay()]!;
  });

/** "07:00" → "7:00 AM", for the session rows. */
const fmtSlot = (mins: number): string => {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};

const NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
/** Spelled-out where we have a word, numeral beyond — never renders "undefined". */
const numWord = (n: number): string => NUM_WORDS[n] ?? String(n);

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

/**
 * How far through a session the user got, as a colour (Trevor, Sept 11).
 *
 * This replaces the old alignment-driven tint. It is purely completion now —
 * thirds of the set — so it can never disagree with the percentage sitting
 * right next to it, which the alignment version could and did.
 *
 * Terracotta / gold / teal IS the palette's red / yellow / green. Literal
 * traffic-light red is still out under the brand doc's no-red rule.
 */
function pctColor(frac: number) {
  if (frac <= 0) return colors.inactive;
  if (frac < 1 / 3) return colors.terracotta;
  if (frac < 2 / 3) return colors.gold;
  return colors.teal;
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

/** Progress (design section 11): daily ring hero, sessions, week, medals, month. */
export default function ProgressScreen() {
  const { freq, awStart, awEnd, qStart, qEnd, affirmations, set } = useStore();
  const [editing, setEditing] = useState(false);
  // Everything on this screen is real as of Sept 17 — the session list was a
  // hardcoded table of [full, full, full, full, 3, 0, 0] that never moved.
  const track = useTracking();
  const streakDays = track.streakDays;
  // Rings track the user's real affirmation count — 7, or 8 with the catch-all.
  // Falls back to 7 before onboarding has populated the set.
  const affCount = affirmations.length || 7;
  const readCount = track.currentDoneIdx.length;
  const frac = track.sessionFrac;
  const remaining = Math.max(0, affCount - readCount);
  const r = 52, circ = 2 * Math.PI * r;

  /** One row per scheduled slot, with what actually happened in it. */
  const daySessions = track.slots.map((mins, i) => ({
    time: fmtSlot(mins),
    done: Math.round((track.today.sessions[i] ?? 0) * affCount),
    isNow: i === track.currentSlot,
  }));
  const sessionsComplete = track.today.ringsClosed;
  const weekLabels = weekDayLabels(new Date());
  const weekPcts = track.week.map(d => d.dayPct);
  const weekPeak = Math.max(...weekPcts, 0.01);
  const monthLabel = `${new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} SO FAR`;
  const monthRings = track.monthRings;

  /**
   * Names the real paused day instead of the old hardcoded "Tuesday paused your
   * streak…". Brand rule: streaks pause, never break — so this only appears
   * when there's an actual gap with practice on both sides of it, and it never
   * scolds.
   */
  const pauseNote = track.pausedDate
    ? `${new Date(`${track.pausedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })} paused your streak — no shame in a full day. You picked it back up after.`
    : null;

  const rowBetween = { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 22, paddingBottom: 108 }}>
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
              <Text style={{ fontFamily: fonts.monoMedium, fontSize: 23, color: colors.ink }}>{readCount}/{affCount}</Text>
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
                ? `${numWord(remaining)} more experience${remaining === 1 ? '' : 's'} close${remaining === 1 ? 's' : ''} today's ring.`
                : "Today's ring is closed."}
            </Text>
          </View>
        </View>

        {/* The ALIGNMENT card sat here — a 60% bar split across Fully aligned /
            Aligning / Disconnected. Cut with the rest of alignment (Trevor,
            Sept 11); its numbers were design placeholders, never computed. */}

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
            <Mono size={15} color={colors.ink}>{sessionsComplete}/{daySessions.length}</Mono>
          </View>

          {!editing ? (
            <View style={{ marginTop: 8 }}>
              {daySessions.map((d, i) => {
                // Was hardcoded to 7 — an 8-affirmation set (the intake's
                // catch-all) drew 7 dots and reported 114%.
                const frac = Math.min(1, d.done / affCount);
                return (
                  <View key={d.time} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
                    borderBottomWidth: 1, borderBottomColor: i < daySessions.length - 1 ? colors.borderSoft : 'transparent',
                  }}>
                    <Mono size={12} color={d.done > 0 ? colors.ink : colors.inactive} style={{ width: 60 }}>{d.time}</Mono>
                    <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
                      {Array.from({ length: affCount }, (_, j) => (
                        <Svg key={j} width={12} height={12} viewBox="0 0 24 24">
                          <Circle
                            cx={12} cy={12} r={9} strokeWidth={3.6}
                            fill={j < d.done ? 'rgba(21,122,110,0.25)' : 'none'}
                            stroke={j < d.done ? colors.teal : colors.border}
                          />
                        </Svg>
                      ))}
                    </View>
                    <Mono size={12.5} color={pctColor(frac)} style={{ width: 40, textAlign: 'right' }}>
                      {Math.round(frac * 100)}%
                    </Mono>
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
            <Mono size={15} color={colors.ink}>{track.weekPct}%</Mono>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 56, marginTop: 16 }}>
            {/* Last seven days, oldest → today. Scaled to the best day so a
                modest week still has shape; an empty day keeps a visible stub. */}
            {weekPcts.map((p, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                <View style={{
                  width: '100%', borderRadius: 5,
                  height: p <= 0 ? 5 : Math.max(10, Math.round((p / weekPeak) * 52)),
                  backgroundColor: p > 0 ? colors.gold : colors.border,
                }} />
                <Mono size={10.5} color={i === weekPcts.length - 1 ? colors.ink : colors.inactive}>{weekLabels[i]}</Mono>
              </View>
            ))}
          </View>
        </View>

        {/* medals — earned from the real streak, not hardcoded states */}
        <View style={card}>
          <CardLabel>MEDALS</CardLabel>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
            {([
              ['First week', streakDays >= 7],
              ['Perfect day', track.week.some(d => d.ringsClosed >= d.target)],
              ['30 days', streakDays >= 30],
            ] as const).map(([label, earned]) => (
              <Medal
                key={label}
                label={label}
                bg={earned ? colors.gold : colors.white}
                border={earned ? null : colors.border}
                ink={earned ? colors.ink : colors.inactive}
                labelC={earned ? colors.ink : colors.inactive}
              />
            ))}
          </View>
        </View>

        {/* Streak note — encouraging, never condemning. Only shown when there's
            a real pause to speak to; the old copy invented a Tuesday. */}
        {pauseNote && (
          <View style={[card, { paddingVertical: 18 }]}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.warmGray, lineHeight: 22 }}>
              {pauseNote}
            </Text>
          </View>
        )}

        {/* month so far */}
        <View style={[card, { marginBottom: 10 }]}>
          <CardLabel>{monthLabel}</CardLabel>
          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Experiences</Text>
              <Mono size={15} color={colors.ink}>{track.monthExperiences}</Mono>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14.5, color: colors.ink }}>Sessions closed</Text>
              <Mono size={15} color={colors.ink}>{monthRings}</Mono>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
