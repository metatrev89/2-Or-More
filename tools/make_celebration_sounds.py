#!/usr/bin/env python3
"""
2+ celebration sound generator — synthesized "golden hour" chimes.

Brand intent: warm, soft, encouraging. Glockenspiel/bell partials with fast
attacks and long gentle decays; pentatonic F-major material; nothing brash.

Regenerate all candidates:  python3 tools/make_celebration_sounds.py
Output: sound-candidates/*.wav (44.1 kHz, 16-bit mono, normalized to -3 dBFS)

Moments covered (3 candidates each):
  ring-close   — a single affirmation ring closes (celebStar)     ~0.4s
  all-seven    — the big celebration (confetti + burst rings)     ~1.6s
  streak       — streak confetti on first Home landing            ~1.2s
  mood         — mood check-in pick                               ~0.3s
"""
import os
import struct
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'sound-candidates')

# Glockenspiel-ish inharmonic partials: ratio, amplitude, decay multiplier
GLOCK_PARTIALS = [(1.0, 1.0, 1.0), (2.76, 0.35, 1.8), (5.40, 0.14, 2.6), (8.93, 0.05, 3.5)]

# F major pentatonic around the 5th/6th octave — the "golden" palette
F5, G5, A5, C6, D6, F6, A6, C7 = 698.46, 783.99, 880.0, 1046.5, 1174.7, 1396.9, 1760.0, 2093.0


def t(dur):
    return np.arange(int(SR * dur)) / SR


def strike(freq, dur, decay=5.0, amp=1.0, detune=0.0015, partials=GLOCK_PARTIALS):
    """One bell/glock strike: inharmonic partials, exponential decay, subtle chorus."""
    x = t(dur)
    out = np.zeros_like(x)
    for ratio, pamp, dmul in partials:
        f = freq * ratio
        if f > SR / 2 - 2000:
            continue
        env = np.exp(-decay * dmul * x)
        out += pamp * env * (np.sin(2 * np.pi * f * x) + 0.6 * np.sin(2 * np.pi * f * (1 + detune) * x))
    # 4ms attack to avoid click
    a = int(0.004 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return amp * out


def sparkle(dur, amp=0.12, lo=4000, hi=11000, decay=7.0):
    """Airy shimmer: band-limited noise with exponential decay."""
    x = t(dur)
    n = np.random.default_rng(7).standard_normal(len(x))
    spec = np.fft.rfft(n)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    n = np.fft.irfft(spec, len(x))
    n /= max(1e-9, np.max(np.abs(n)))
    return amp * n * np.exp(-decay * x)


def place(canvas, sound, at):
    i = int(at * SR)
    end = min(len(canvas), i + len(sound))
    canvas[i:end] += sound[: end - i]
    return canvas


def render(name, sig, peak_db=-3.0):
    sig = np.asarray(sig, dtype=np.float64)
    # gentle fade-out on the last 30ms, normalize to peak_db
    f = int(0.03 * SR)
    sig[-f:] *= np.linspace(1, 0, f)
    sig = sig / max(1e-9, np.max(np.abs(sig))) * (10 ** (peak_db / 20))
    pcm = (sig * 32767).astype('<i2')
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{name}.wav  {len(sig)/SR:.2f}s  {os.path.getsize(path)//1024}KB')


# ---------- ring-close (one affirmation done) ----------

def ring_close_a():  # single bright glock note + whisper of sparkle
    c = np.zeros(int(0.45 * SR))
    place(c, strike(A6, 0.45, decay=7), 0)
    place(c, sparkle(0.3, amp=0.06), 0.01)
    return c

def ring_close_b():  # quick upward flick, two soft notes
    c = np.zeros(int(0.5 * SR))
    place(c, strike(C6, 0.4, decay=8, amp=0.8), 0)
    place(c, strike(F6, 0.42, decay=7), 0.07)
    return c

def ring_close_c():  # warm low-key "thock" — marimba-ish (rounder partials)
    marimba = [(1.0, 1.0, 1.0), (4.0, 0.25, 2.2), (9.2, 0.06, 3.0)]
    c = np.zeros(int(0.4 * SR))
    place(c, strike(F5, 0.4, decay=9, partials=marimba), 0)
    place(c, strike(C6, 0.3, decay=11, amp=0.4, partials=marimba), 0.05)
    return c


# ---------- all-seven (big celebration) ----------

def all_seven_a():  # rising 4-note bell arpeggio + shimmer bloom
    c = np.zeros(int(1.7 * SR))
    for i, (n, amp) in enumerate([(F5, 0.9), (A5, 0.9), (C6, 0.95), (F6, 1.0)]):
        place(c, strike(n, 1.2, decay=4, amp=amp), i * 0.12)
    place(c, strike(A6, 1.0, decay=4.5, amp=0.5), 0.55)
    place(c, sparkle(1.1, amp=0.10, decay=4), 0.45)
    return c

def all_seven_b():  # chord bloom: gentle stagger into a warm Fadd9
    c = np.zeros(int(1.8 * SR))
    for i, n in enumerate([F5, A5, C6, G5 * 2]):  # F A C G6 = Fadd9
        place(c, strike(n, 1.5, decay=3.2, amp=0.85), i * 0.045)
    # sparkle trimmed per Trevor (Jul 14): was amp 0.08 / 4-11kHz — too hissy
    place(c, sparkle(0.7, amp=0.025, lo=5000, hi=9000, decay=6), 0.15)
    return c

def all_seven_c():  # fast pentatonic cascade up, playful
    c = np.zeros(int(1.6 * SR))
    run = [F5, G5, A5, C6, D6, F6, A6]
    for i, n in enumerate(run):
        place(c, strike(n, 0.8, decay=5.5, amp=0.65 + 0.05 * i), i * 0.075)
    place(c, strike(C7, 1.0, decay=4.5, amp=0.55), len(run) * 0.075)
    return c


# ---------- streak (confetti on first Home landing) ----------

def streak_a():  # falling twinkles — mirrors the confetti drift
    c = np.zeros(int(1.3 * SR))
    rng = np.random.default_rng(12)
    notes = [C7, A6, F6, D6, C6, A5]
    for i, n in enumerate(notes):
        at = 0.05 + i * 0.12 + float(rng.uniform(0, 0.03))
        place(c, strike(n, 0.6, decay=7, amp=0.55), at)
    place(c, sparkle(1.0, amp=0.07, decay=3.5), 0)
    return c

def streak_b():  # two-note "lit flame": low warm + high answer
    c = np.zeros(int(1.1 * SR))
    place(c, strike(F5, 0.9, decay=4.5, amp=0.9), 0)
    place(c, strike(F6, 0.9, decay=5, amp=0.75), 0.14)
    # sparkle trimmed per Trevor (Jul 14): was amp 0.06 — read as background hiss
    place(c, sparkle(0.5, amp=0.02, lo=5000, hi=9000, decay=7), 0.12)
    return c

def streak_c():  # soft shimmer swell only — subtle, nearly ambient
    c = np.zeros(int(1.2 * SR))
    x = t(1.2)
    swell = np.sin(2 * np.pi * A5 * x) * np.exp(-3.5 * x) * (1 - np.exp(-14 * x))
    c += 0.5 * swell
    place(c, strike(A6, 0.9, decay=5, amp=0.5), 0.28)
    place(c, sparkle(1.0, amp=0.09, decay=3), 0.1)
    return c


# ---------- mood pick ----------

def mood_a():  # single tiny dink
    c = np.zeros(int(0.32 * SR))
    place(c, strike(C7, 0.32, decay=10, amp=0.8), 0)
    return c

def mood_b():  # soft double-tap
    c = np.zeros(int(0.38 * SR))
    place(c, strike(A6, 0.25, decay=12, amp=0.7), 0)
    place(c, strike(C7, 0.28, decay=11, amp=0.8), 0.09)
    return c

def mood_c():  # warm low acknowledgment
    marimba = [(1.0, 1.0, 1.0), (4.0, 0.22, 2.2)]
    c = np.zeros(int(0.35 * SR))
    place(c, strike(A5, 0.35, decay=9, partials=marimba), 0)
    return c


# ---------- 963 Hz variants (Trevor, Jul 14) ----------
# Same gestures retuned so 963 Hz is the anchor tone: chords voiced in just
# intonation on a 481.5 Hz root (= 963/2), with 963 Hz ringing on top.
# Originals are untouched — these render to separate *-963 files.

R963 = 963.0 / 2  # 481.5 Hz root; octave = exactly 963 Hz

def all_seven_b_963():  # chord bloom on the 963 root: 481.5 · 601.9 (5/4) · 722.25 (3/2) · 963
    c = np.zeros(int(1.8 * SR))
    for i, n in enumerate([R963, R963 * 1.25, R963 * 1.5, 963.0]):
        place(c, strike(n, 1.5, decay=3.2, amp=0.85), i * 0.045)
    place(c, sparkle(0.7, amp=0.025, lo=5000, hi=9000, decay=6), 0.15)
    return c

def streak_b_963():  # two-note flame: 481.5 low, exactly 963 on the answer
    c = np.zeros(int(1.1 * SR))
    place(c, strike(R963, 0.9, decay=4.5, amp=0.9), 0)
    place(c, strike(963.0, 0.9, decay=5, amp=0.75), 0.14)
    place(c, sparkle(0.5, amp=0.02, lo=5000, hi=9000, decay=7), 0.12)
    return c


if __name__ == '__main__':
    for fn in [ring_close_a, ring_close_b, ring_close_c,
               all_seven_a, all_seven_b, all_seven_c,
               streak_a, streak_b, streak_c,
               mood_a, mood_b, mood_c,
               all_seven_b_963, streak_b_963]:
        render(fn.__name__.replace('_', '-', 1).replace('_', '-'), fn())
    print('\nDone → sound-candidates/')
