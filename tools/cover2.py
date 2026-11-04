# Cover options A-D (630x500), built only from the game's pixel art at whole-number scales.
from PIL import Image, ImageDraw, ImageEnhance
PX = "assets/px/"; OUT = "docs/m5/cover2/"; W, H = 630, 500
def sp(n, k):
    im = Image.open(PX + n + ".png").convert("RGBA"); return im.resize((im.width * k, im.height * k), Image.NEAREST)
def glow(r, col=(255, 214, 110), a0=110):
    g = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    for i in range(r, 0, -2): d.ellipse([r - i, r - i, r + i, r + i], fill=col + (int(a0 * (1 - i / r) ** 1.6),))
    return g
title = Image.open(PX + "title.png").convert("RGBA")
def logo_on(c, k, y):
    lg = sp("logo", k); c.alpha_composite(lg, ((W - lg.width) // 2, y))

# A: sunset key art at 2x along the bottom, sky extended up from the art's top row, logo in that sky
t2 = title.resize((640, 360), Image.NEAREST)
def tall(art):
    c = Image.new("RGBA", (W, H)); top = art.crop((5, 0, 5 + W, 2))
    for y in range(0, H - 360, 2): c.paste(top, (0, y))
    c.paste(art.crop((5, 0, 5 + W, 360)), (0, H - 360)); return c
a = tall(t2); logo_on(a, 2, 24); a.convert("RGB").save(OUT + "A.png")

# B: cream sticker sheet, logo big, the cast standing on a moss strip
b = Image.new("RGBA", (W, H), (243, 230, 211, 255)); wp = Image.open("docs/m5/itch-theme/wallpaper.png").convert("RGBA")
for x in range(0, W, 240):
    for y in range(0, H, 240): b.alpha_composite(wp, (x, y))
d = ImageDraw.Draw(b); d.rounded_rectangle([24, 24, W - 24, H - 24], 28, fill=(255, 248, 239, 255), outline=(107, 74, 58, 255), width=4)
logo_on(b, 2, 56)
ground = 430
moss = sp("moss", 3)
for x in range(40, W - 40 - moss.width + 1, moss.width - 6): b.alpha_composite(moss, (x, ground - moss.height + 18))
cast = [("hedgehog", 3, 52), ("fern", 2, 268), ("snail", 2, 300), ("mushroom", 2, 408), ("springtail", 2, 492)]
for n, k, x in cast:
    s = sp(n, k); b.alpha_composite(s, (x, ground - s.height + 4))
for x, y in [(330, 220), (420, 250), (520, 210), (560, 300)]:
    b.alpha_composite(glow(36), (x - 36 + 11, y - 36 + 13)); b.alpha_composite(sp("firefly", 1), (x, y))
b.convert("RGB").save(OUT + "B.png")

# C: close-up of the jar from the key art, 4x, logo over the sky
t4 = title.resize((1280, 720), Image.NEAREST)
c = t4.crop((410, 720 - H, 410 + W, 720)); logo_on(c, 2, 10); c.convert("RGB").save(OUT + "C.png")

# D: the key art at night: blue multiply, warm window lamp kept low, fireflies glowing in the jar
n3 = t2.copy().convert("RGB")
night = Image.new("RGB", n3.size, (70, 84, 150)); n3 = Image.blend(n3, Image.eval(n3, lambda v: v // 2), 0.35)
from PIL import ImageChops
n3 = ImageChops.multiply(n3, Image.new("RGB", n3.size, (120, 130, 200))); n3 = ImageEnhance.Brightness(n3).enhance(1.35).convert("RGBA")
for x, y, r in [(300, 170, 44), (390, 130, 40), (350, 220, 36), (410, 200, 34)]:
    n3.alpha_composite(glow(r, a0=150), (x - r, y - r)); f = sp("firefly", 1); n3.alpha_composite(f, (x - f.width // 2, y - f.height // 2))
dd = tall(n3)
dsk = ImageDraw.Draw(dd)
for x, y in [(40, 30), (120, 120), (560, 40), (600, 110), (90, 70), (520, 130), (30, 150), (590, 160)]: dsk.rectangle([x, y, x + 3, y + 3], fill=(255, 240, 200))
logo_on(dd, 2, 24); dd.convert("RGB").save(OUT + "D.png")

# sheet: 2x2 at full size with labels, plus a row at the 315x250 itch grid size
sheet = Image.new("RGB", (W * 2 + 60, H * 2 + 120 + 250 + 40), (250, 246, 240)); sd = ImageDraw.Draw(sheet)
for i, k in enumerate("ABCD"):
    im = Image.open(OUT + k + ".png"); x = 20 + (i % 2) * (W + 20); y = 50 + (i // 2) * (H + 50)
    sheet.paste(im, (x, y)); sd.text((x, y - 34), k, fill=(107, 74, 58), font_size=28)
    sm = im.resize((315, 250), Image.LANCZOS); sheet.paste(sm, (20 + i * 325, H * 2 + 170))
sd.text((20, H * 2 + 130), "ukuran kecil di daftar itch (315x250)", fill=(107, 74, 58), font_size=22)
sheet.save(OUT + "cover-ABCD.jpg", quality=90)
print("ok")
