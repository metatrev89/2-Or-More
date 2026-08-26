#!/usr/bin/env python3
"""
2+ campaign asset: pixel-accurate iOS notification mockups.

Outputs (campaign-assets/, all @3x iPhone scale):
  notification-banner.png          transparent-bg banner (title + body) for compositing
  notification-banner-minimal.png  transparent-bg banner, title only
  notification-lockscreen.png      full 1179x2556 lock screen w/ golden-hour wallpaper

Fonts: Inter (SF-adjacent) from node_modules; Instrument Sans for the 2+ icon.
Regenerate: python3 tools/make_notification_mockup.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
FONTS = os.path.join(ROOT, 'app', 'node_modules', '@expo-google-fonts')
OUT = os.path.join(ROOT, 'campaign-assets')
os.makedirs(OUT, exist_ok=True)

def F(path, size):
    return ImageFont.truetype(os.path.join(FONTS, path), size)

INTER_THIN = 'inter/100Thin/Inter_100Thin.ttf'
INTER_REG = 'inter/400Regular/Inter_400Regular.ttf'
INTER_MED = 'inter/500Medium/Inter_500Medium.ttf'
INTER_SEMI = 'inter/600SemiBold/Inter_600SemiBold.ttf'
INSTR_SEMI = 'instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'

CREAM, INK, GOLD = (250, 244, 232, 255), (38, 32, 26, 255), (233, 184, 76, 255)

W_BANNER = 1131  # 377pt * 3 (393pt screen − 8pt margins)
TITLE = 'Time to align with your vision'
BODY = 'Your 12:00 affirmation is ready.'


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def app_icon(size=114):
    icon = Image.new('RGBA', (size, size), CREAM)
    d = ImageDraw.Draw(icon)
    f = F(INSTR_SEMI, int(size * 0.56))
    two, plus = '2', '+'
    w2 = d.textlength(two, font=f)
    wp = d.textlength(plus, font=f)
    total = w2 + wp + int(size * 0.01)
    x = (size - total) / 2
    cy = size / 2 - int(size * 0.02)
    d.text((x, cy), two, font=f, fill=INK, anchor='lm')
    d.text((x + w2 + int(size * 0.01), cy), plus, font=f, fill=GOLD, anchor='lm')
    icon.putalpha(rounded_mask((size, size), int(size * 0.23)))
    return icon


def banner(body_text=None, frosted_bg=None):
    """iOS notification banner. frosted_bg: RGB Image region behind the banner (enables glass effect)."""
    pad_x, icon_s, gap = 42, 114, 30
    title_f, body_f, now_f = F(INTER_SEMI, 46), F(INTER_REG, 45), F(INTER_REG, 38)
    h = 198 if body_text else 168
    radius = 72

    if frosted_bg is not None:
        base = frosted_bg.resize((W_BANNER, h)).filter(ImageFilter.GaussianBlur(60)).convert('RGBA')
        veil = Image.new('RGBA', (W_BANNER, h), (250, 249, 246, 205))
        base = Image.alpha_composite(base, veil)
    else:
        base = Image.new('RGBA', (W_BANNER, h), (245, 244, 241, 247))
    d = ImageDraw.Draw(base)

    icon = app_icon(icon_s)
    base.paste(icon, (pad_x, (h - icon_s) // 2), icon)

    tx = pad_x + icon_s + gap
    title_c, body_c, now_c = (28, 28, 30, 255), (60, 60, 67, 210), (60, 60, 67, 150)
    if body_text:
        d.text((tx, h // 2 - 6), TITLE, font=title_f, fill=title_c, anchor='ls')
        d.text((tx, h // 2 + 52), body_text, font=body_f, fill=body_c, anchor='ls')
    else:
        d.text((tx, h // 2), TITLE, font=title_f, fill=title_c, anchor='lm')
    d.text((W_BANNER - pad_x, 58), 'now', font=now_f, fill=now_c, anchor='rs')

    base.putalpha(Image.composite(base.getchannel('A'), Image.new('L', base.size, 0), rounded_mask(base.size, radius)))
    return base


def wallpaper(w=1179, h=2556):
    """Golden-hour gradient: warm gold sky settling into ink, with a soft sun glow."""
    y = np.linspace(0, 1, h)[:, None, None]
    top = np.array([244, 216, 150])     # pale gold
    mid = np.array([233, 184, 76])      # brand gold
    low = np.array([120, 84, 46])       # warm umber
    ink = np.array([38, 32, 26])        # ink
    img = np.where(y < 0.32, top + (mid - top) * (y / 0.32),
          np.where(y < 0.62, mid + (low - mid) * ((y - 0.32) / 0.30),
                   low + (ink - low) * np.clip((y - 0.62) / 0.38, 0, 1)))
    img = np.tile(img, (1, w, 1))
    # sun glow
    yy, xx = np.mgrid[0:h, 0:w]
    glow = np.exp(-(((xx - w * 0.5) ** 2) / (2 * (w * 0.42) ** 2) + ((yy - h * 0.24) ** 2) / (2 * (h * 0.16) ** 2)))
    img = np.clip(img + glow[:, :, None] * np.array([28, 22, 14]), 0, 255)
    return Image.fromarray(img.astype('uint8'), 'RGB')


def lockscreen():
    wp = wallpaper()
    img = wp.convert('RGBA')
    d = ImageDraw.Draw(img)
    white = (255, 255, 255)

    d.text((1179 // 2, 310), 'Monday, August 24', font=F(INTER_MED, 66), fill=white + (235,), anchor='mm')
    d.text((1179 // 2, 560), '9:41', font=F(INTER_THIN, 340), fill=white + (245,), anchor='mm')

    # notification
    bx, by = (1179 - W_BANNER) // 2, 1500
    bnr = banner(BODY, frosted_bg=wp.crop((bx, by, bx + W_BANNER, by + 198)))
    img.paste(bnr, (bx, by), bnr)

    # bottom quick-action circles (flashlight / camera) + home indicator.
    # Drawn on an overlay + alpha_composite so translucency actually blends
    # (ImageDraw writes raw RGBA — it does not blend).
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for cx, glyph in ((165, 'torch'), (1179 - 165, 'cam')):
        cy = 2286
        od.ellipse([cx - 75, cy - 75, cx + 75, cy + 75], fill=(255, 255, 255, 46))
        if glyph == 'torch':
            od.rounded_rectangle([cx - 16, cy - 34, cx + 16, cy - 6], radius=8, outline=white + (225,), width=6)
            od.rounded_rectangle([cx - 11, cy - 2, cx + 11, cy + 34], radius=8, fill=white + (225,))
        else:
            od.rounded_rectangle([cx - 34, cy - 24, cx + 34, cy + 26], radius=14, outline=white + (225,), width=6)
            od.ellipse([cx - 13, cy - 12, cx + 13, cy + 14], outline=white + (225,), width=6)
    od.rounded_rectangle([1179 // 2 - 210, 2556 - 40, 1179 // 2 + 210, 2556 - 25], radius=8, fill=white + (170,))
    img = Image.alpha_composite(img, ov)
    return img.convert('RGB')


if __name__ == '__main__':
    banner(BODY).save(os.path.join(OUT, 'notification-banner.png'))
    banner(None).save(os.path.join(OUT, 'notification-banner-minimal.png'))
    lockscreen().save(os.path.join(OUT, 'notification-lockscreen.png'))
    for f in sorted(os.listdir(OUT)):
        print(f, f'{os.path.getsize(os.path.join(OUT, f)) // 1024}KB')
