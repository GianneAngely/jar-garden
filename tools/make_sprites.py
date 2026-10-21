"""Flow renders on #00FF00 -> trimmed transparent WebP sprites + background JPGs in assets/.

python3 tools/make_sprites.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FLOW = ROOT / "art/flow"
OUT = ROOT / "assets"

# sprite name: (source file, longest side in px). Game shows them at ~1/2 to 1/3 of this.
SPRITES = {
    "snail": ("jg-snail-a.jpg", 260),
    "snail-sad": ("jg-snail-sad-a.jpg", 260),
    "springtail": ("all/jgall-35.jpg", 120),
    "firefly": ("all/jgall-29.jpg", 150),
    "fern": ("all/jgall-31.jpg", 300),
    "mushroom": ("all/jgall-27.jpg", 170),
    "moss": ("all/jgall-24.jpg", 220),
    "mould": ("all/jgall-23.jpg", 200),
    "leaves": ("all/jgall-20.jpg", 140),
    "lamp": ("all/jgall-15.jpg", 260),
    "cork": ("all/jgall-19.jpg", 420),
    "hedgehog": ("all/jgall-07.jpg", 420),
    "soil": ("all/jgall-03.jpg", 1100),
}
# neighbours: temporary picks from docs/m3/neighbours-ABC.jpg until Angel chooses (owl C, frog B, mole A)
NEIGHBOURS = {
    "owl": ("neighbours/jgn-owl2b.jpg", 420),
    "frog": ("neighbours/jgn-frog2a.jpg", 420),
    "mole": ("neighbours/jgn-mole1a.jpg", 420, 0.3),   # 0.3: grey the green tint seen through the glasses (top 30%)
}
ICONS = ["spray", "bulb", "lid", "drop", "seed", "sprout", "air", "heart"]   # all/jgall-10, 4x2 grid
BACKGROUNDS = {"bg-day": "all/jgall-13.jpg", "bg-night": "all/jgall-09.jpg", "title": "../../docs/m2/keyart-draft.jpg"}
LOGO = ("logo/jgl-logo1b.jpg", 640)   # temporary pick A from docs/m3/title-logo-ABC.jpg until Angel chooses


def key_green(img):
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)
    # .copy(): an image on a numpy buffer is read-only and floodfill would edit a throwaway copy
    strong = Image.fromarray(((greenness > 60) * 255).astype(np.uint8)).copy()
    h, w = greenness.shape
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if strong.getpixel(seed) == 255:
            ImageDraw.floodfill(strong, seed, 128)
    # key-green pockets enclosed by line art; muted plant greens (moss, fern) stay because they're far from #00FF00
    bg = (np.array(strong) == 128) | ((g > 200) & (greenness > 150))
    band = np.asarray(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    band &= ~bg
    alpha = np.ones((h, w), np.float32)
    alpha[bg] = 0
    alpha[band] = np.clip(1 - (greenness[band] - 20) / 80.0, 0, 1)
    out = rgb.copy()
    out[..., 1] = np.where(band | bg, np.minimum(g, np.maximum(r, b) + 6), g)   # despill
    return Image.fromarray(np.dstack([out.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")


def clear_spill(img, top=0):
    """Drop leftover key-green pixels that key_green's pocket rule misses; with top > 0 also grey the pale green
    tint in that top fraction (key green seen through glasses lenses)."""
    a = np.asarray(img).astype(np.int16).copy()
    greenness = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    a[(greenness > 70) & (a[..., 1] > 150), 3] = 0
    if top:
        band = np.zeros(greenness.shape, bool)
        band[: int(a.shape[0] * top)] = True
        tint = band & (greenness > 6)
        a[..., 1] = np.where(tint, np.maximum(a[..., 0], a[..., 2]) + 4, a[..., 1])
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def trim(img):
    return img.crop(img.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox())


def fit(img, side):
    k = side / max(img.size)
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    for name, (src, side) in SPRITES.items():
        s = fit(trim(key_green(Image.open(FLOW / src))), side)
        s.save(OUT / f"{name}.webp", quality=88, method=6)
        print(f"{name}.webp {s.size}")
    for name, (src, side, *top) in NEIGHBOURS.items():
        s = fit(trim(clear_spill(key_green(Image.open(FLOW / src)), *top)), side)
        s.save(OUT / f"{name}.webp", quality=88, method=6)
        print(f"{name}.webp {s.size}")
    s = fit(trim(clear_spill(key_green(Image.open(FLOW / LOGO[0])))), LOGO[1])
    s.save(OUT / "logo.webp", quality=90, method=6)
    print(f"logo.webp {s.size}")
    sheet = key_green(Image.open(FLOW / "all/jgall-10.jpg"))
    cw, ch = sheet.width / 4, sheet.height / 2
    for i, name in enumerate(ICONS):
        cell = sheet.crop((round((i % 4) * cw), round((i // 4) * ch), round((i % 4 + 1) * cw), round((i // 4 + 1) * ch)))
        s = fit(trim(cell), 96)
        s.save(OUT / f"icon-{name}.webp", quality=90, method=6)
        print(f"icon-{name}.webp {s.size}")
    for name, src in BACKGROUNDS.items():
        Image.open(FLOW / src).convert("RGB").resize((1280, 714), Image.LANCZOS).save(OUT / f"{name}.jpg", quality=86)
        print(f"{name}.jpg")
    # overview sheet for checking the cutouts on a dark and a light backdrop
    files = sorted(OUT.glob("*.webp"))
    sheet = Image.new("RGB", (len(files) * 140, 280), (40, 40, 60))
    sheet.paste((245, 236, 220), (0, 140, sheet.width, 280))
    for k, f in enumerate(files):
        im = fit(Image.open(f), 130)
        for y in (5, 145):
            sheet.paste(im, (k * 140 + 5, y), im)
    sheet.save(ROOT / "art/_sprites-overview.png")


if __name__ == "__main__":
    main()
