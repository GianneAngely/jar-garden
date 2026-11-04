# Images for README.md: pixel pipeline, cast sheet, neighbours, day/night. Whole-number scales only.
import shutil
import numpy as np
from PIL import Image, ImageDraw
PX = "assets/px/"; OUT = "docs/readme/"
CREAM, INK = (255, 248, 239), (107, 74, 58)
def sp(n, k):
    im = Image.open(PX + n + ".png").convert("RGBA"); return im.resize((im.width * k, im.height * k), Image.NEAREST)
def label(d, x, y, t, size=22, anchor="mt"): d.text((x, y), t, fill=INK, font_size=size, anchor=anchor)

shutil.copy("docs/preview/pixel-wow.gif", OUT + "hero.gif")

# pipeline: Flow JPG crop -> green key mask -> fitted pixel sprite
src = Image.open("art/flow/pixel/jgp-creatures-a.jpg").convert("RGB").crop((60, 110, 295, 300))
a = np.asarray(src).astype(int); g = (a[..., 1] > 150) & (a[..., 0] < 120) & (a[..., 2] < 120)
mask = Image.fromarray(np.where(g, 255, 40).astype("uint8")).convert("RGB")
k = 2; P = (src.width * k, src.height * k)
panels = [src.resize(P, Image.NEAREST), mask.resize(P, Image.NEAREST)]
snail = sp("snail", 8); fit = Image.new("RGBA", P, CREAM + (255,)); fit.alpha_composite(snail, ((P[0] - snail.width) // 2, (P[1] - snail.height) // 2)); panels.append(fit)
W = 3 * P[0] + 4 * 30; H = P[1] + 110
pl = Image.new("RGB", (W, H), CREAM); d = ImageDraw.Draw(pl)
names = ["1. Google Flow render (JPEG, soft edges)", "2. #00FF00 keyed to a mask", "3. fitted grid: 50 x 40 art pixels"]
for i, (p, t) in enumerate(zip(panels, names)):
    x = 30 + i * (P[0] + 30); pl.paste(p.convert("RGB"), (x, 30)); label(d, x + P[0] // 2, P[1] + 50, t, 20)
pl.save(OUT + "pipeline.png")

# cast: the six species at their in-jar 2x and the room scale they are drawn at, cost under each
cast = [("moss", "Moss", 1), ("springtail", "Springtail", 2), ("fern", "Fern", 3), ("mushroom", "Mushroom", 3), ("snail", "Snail", 4), ("firefly", "Firefly", 6)]
cw, ch = 190, 260; c = Image.new("RGB", (cw * 6 + 40, ch), CREAM); d = ImageDraw.Draw(c)
for i, (n, t, cost) in enumerate(cast):
    s = sp(n, 3); x = 20 + i * cw + (cw - s.width) // 2; c.paste(s, (x, 170 - s.height), s)
    label(d, 20 + i * cw + cw // 2, 190, t, 24); label(d, 20 + i * cw + cw // 2, 222, f"{cost} seed" + ("s" if cost > 1 else ""), 18)
c.save(OUT + "cast.png")

# neighbours: who sends the notes
nb = [("hedgehog", "Hazel"), ("mole", "Mo"), ("owl", "Olive"), ("frog", "Fen")]
nw, nh = 230, 330; n_ = Image.new("RGB", (nw * 4 + 40, nh), CREAM); d = ImageDraw.Draw(n_)
for i, (n, t) in enumerate(nb):
    s = sp(n, 2); x = 20 + i * nw + (nw - s.width) // 2; n_.paste(s, (x, 270 - s.height), s); label(d, 20 + i * nw + nw // 2, 285, t, 26)
n_.save(OUT + "neighbours.png")

# day / night: the same jar idea at noon and after dark
dn = Image.new("RGB", (1300, 380), CREAM); d = ImageDraw.Draw(dn)
for i, (f, t) in enumerate([("docs/m5/shots/2-moss-carpet.png", "Day 5, 1:15 PM: moss grows, fireflies rest"), ("docs/m5/shots/3-light-show.png", "Night: fireflies glow when light < 0.15")]):
    im = Image.open(f).convert("RGB").resize((640, 360), Image.LANCZOS); dn.paste(im, (6 + i * 648, 0))
dn = dn.crop((0, 0, 1300, 360)); dn.save(OUT + "day-night.png")
print("ok")
