#!/usr/bin/env python3
"""
2+ campaign asset: liquid-glass notification composited onto Trevor's REAL
lock screen screenshot (iOS 26 dark-glass style per his MyQ reference:
heavy wallpaper blur + dark tint, near-pill radius, hairline light border,
white text, dimmed time).

Source: campaign-assets/source-lockscreen.png (copied from his upload).
Output: campaign-assets/notification-lockscreen-real.png
Regenerate: python3 tools/make_notification_glass.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
FONTS = os.path.join(ROOT, 'app', 'node_modules', '@expo-google-fonts')
OUT = os.path.join(ROOT, 'campaign-assets')

def F(path, size):
    return ImageFont.truetype(os.path.join(FONTS, path), size)

INTER_REG = 'inter/400Regular/Inter_400Regular.ttf'
INTER_SEMI = 'inter/600SemiBold/Inter_600SemiBold.ttf'
INSTR_SEMI = 'instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'

CREAM, INK, GOLD = (250, 244, 232, 255), (38, 32, 26, 255), (233, 184, 76, 255)
TITLE = 'Time to Align...'
BODY = 'Your 11:18am affirmation session is waiting.'


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def app_icon(size):
    icon = Image.new('RGBA', (size, size), CREAM)
    d = ImageDraw.Draw(icon)
    f = F(INSTR_SEMI, int(size * 0.56))
    w2 = d.textlength('2', font=f)
    x = (size - (w2 + d.textlength('+', font=f) + size * 0.01)) / 2
    cy = size / 2 - int(size * 0.02)
    d.text((x, cy), '2', font=f, fill=INK, anchor='lm')
    d.text((x + w2 + size * 0.01, cy), '+', font=f, fill=GOLD, anchor='lm')
    icon.putalpha(rounded_mask((size, size), int(size * 0.23)))
    return icon


def glass_banner(bg_region, s):
    """Dark liquid-glass banner sized to bg_region; s = scale factor (device px / 1179)."""
    w, h = bg_region.size
    base = bg_region.filter(ImageFilter.GaussianBlur(int(70 * s))).convert('RGBA')
    base = Image.alpha_composite(base, Image.new('RGBA', (w, h), (22, 22, 28, 118)))  # dark tint
    d = ImageDraw.Draw(base)

    radius = int(h * 0.40)  # near-pill, per the reference cards
    pad_x, icon_s, gap = int(46 * s), int(116 * s), int(32 * s)
    icon = app_icon(icon_s)
    base.paste(icon, (pad_x, (h - icon_s) // 2), icon)

    tx = pad_x + icon_s + gap
    title_baseline = h // 2 - int(8 * s)
    d.text((tx, title_baseline), TITLE, font=F(INTER_SEMI, int(47 * s)), fill=(255, 255, 255, 250), anchor='ls')
    # body auto-fits the available width so long copy never clips
    max_w = w - tx - pad_x
    body_size = int(46 * s)
    body_f = F(INTER_REG, body_size)
    while d.textlength(BODY, font=body_f) > max_w and body_size > int(30 * s):
        body_size -= 1
        body_f = F(INTER_REG, body_size)
    d.text((tx, h // 2 + int(52 * s)), BODY, font=body_f, fill=(255, 255, 255, 215), anchor='ls')
    # time shares the title's baseline (per reference: "MyQ's Home ... 2h ago")
    d.text((w - pad_x, title_baseline), 'now', font=F(INTER_REG, int(38 * s)), fill=(235, 235, 245, 150), anchor='rs')

    # soft glass edge: slightly thicker light border, gently blurred so it reads
    # as a frosted rim rather than a crisp hairline (per reference cards)
    edge = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(edge).rounded_rectangle(
        [1, 1, w - 2, h - 2], radius=radius, outline=(255, 255, 255, 88), width=int(3 * s))
    edge = edge.filter(ImageFilter.GaussianBlur(1.6 * s))
    base = Image.alpha_composite(base, edge)

    base.putalpha(rounded_mask((w, h), radius))
    return base


if __name__ == '__main__':
    src = Image.open(os.path.join(OUT, 'source-lockscreen.png')).convert('RGBA')
    W, H = src.size
    s = W / 1179  # scale everything relative to a 393pt@3x reference

    bw, bh = W - int(72 * s), int(204 * s)
    bx = (W - bw) // 2
    by = int(H * 0.775)  # bottom-stack position, clear of the flashlight/camera buttons
    banner = glass_banner(src.crop((bx, by, bx + bw, by + bh)).convert('RGB'), s)
    src.paste(banner, (bx, by), banner)

    out = os.path.join(OUT, 'notification-lockscreen-real.png')
    src.convert('RGB').save(out)
    print('notification-lockscreen-real.png', f'{os.path.getsize(out) // 1024}KB', f'{W}x{H}')
