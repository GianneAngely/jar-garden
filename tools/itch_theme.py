# Itch page theme art: banner (logo + jar friends), tiling wallpaper, section icons. Integer nearest scales only.
from PIL import Image, ImageDraw
import random
PX = "assets/px/"; OUT = "docs/m5/itch-theme/"
def sp(name, k):
    im = Image.open(PX + name + ".png").convert("RGBA")
    return im.resize((im.width * k, im.height * k), Image.NEAREST)
def glow(r, col=(246, 215, 122)):
    g = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    for i in range(r, 0, -2):
        a = int(70 * (1 - i / r) ** 1.5)
        d.ellipse([r - i, r - i, r + i, r + i], fill=col + (a,))
    return g

# banner: 960 x 300, transparent, logo centred with snail, mushroom, fern and fireflies around it
W, H = 960, 300
b = Image.new("RGBA", (W, H), (0, 0, 0, 0))
logo = sp("logo", 3)
b.alpha_composite(logo, ((W - logo.width) // 2, 80))
for name, k, x, y in [("fern", 3, 30, 120), ("snail", 2, 120, 200), ("mushroom", 3, 760, 170), ("moss", 3, 868, 240), ("springtail", 2, 884, 214)]:
    s = sp(name, k); b.alpha_composite(s, (x, y))
for x, y in [(110, 50), (300, 30), (640, 40), (850, 70), (260, 250), (690, 255)]:
    g = glow(34); b.alpha_composite(g, (x - 34 + 12, y - 34 + 13))
    f = sp("firefly", 1); b.alpha_composite(f, (x, y))
b.save(OUT + "banner.png")

# wallpaper tile 240 x 240 on the room wall colour: faint leaf sprigs and firefly dots on a 4 px grid
T = 240; WALL = (243, 230, 211)
t = Image.new("RGBA", (T, T), WALL + (255,))
d = ImageDraw.Draw(t)
leaf = sp("leaves", 1); leaf.putalpha(leaf.getchannel("A").point(lambda a: int(a * 0.14)))
for x, y in [(20, 30), (140, 150)]:
    t.alpha_composite(leaf, (x, y))
random.seed(7)
for x, y in [(110, 40), (200, 90), (60, 170), (180, 210), (30, 110)]:
    d.rectangle([x, y, x + 3, y + 3], fill=(240, 196, 110, 150))
    d.rectangle([x - 4, y, x - 1, y + 3], fill=(240, 196, 110, 60)); d.rectangle([x + 4, y, x + 7, y + 3], fill=(240, 196, 110, 60))
    d.rectangle([x, y - 4, x + 3, y - 1], fill=(240, 196, 110, 60)); d.rectangle([x, y + 4, x + 3, y + 7], fill=(240, 196, 110, 60))
t.convert("RGB").save(OUT + "wallpaper.png")

# section icons, 3x, each on a transparent 96 px square so headings line up
for name in ["icon-sprout", "firefly", "icon-heart", "icon-seed", "snail", "mushroom"]:
    s = sp(name, 3 if name.startswith("icon") or name == "firefly" else 2)
    c = Image.new("RGBA", (max(96, s.width), 96), (0, 0, 0, 0))
    c.alpha_composite(s, ((c.width - s.width) // 2, (96 - s.height) // 2))
    c.save(OUT + "h-" + name + ".png")
print("ok")
