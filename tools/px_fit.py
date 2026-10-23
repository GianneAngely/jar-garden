"""Fit a few pixel sprites to their place in the jar, after tools/make_pixel.py.

In the jar every art pixel is 2 screen pixels (the room around it is 4). The soil-life tufts came out of the sheet
twice as detailed as a 20-slot floor needs, and the soil strip is taller than the jar's soil band, so:
- moss, leaves, mould: halved (2x2 blocks -> the block's most common opaque colour), alpha kept binary
- soil: top 16 rows of earth + bottom 27 rows of pebbles = 43 rows, which is the 86 px soil band at 2x
Also: half-size "-s" icons and creature minis, a firefly-day colour variant, the room lamp's bulb (on/off) cut from
the room art itself (so the switchable lamp is the room's own lamp), rooms padded to 320x180,
and assets/px/manifest.json refreshed. Run on a fresh make_pixel.py output (halving is not idempotent).

python3 tools/px_fit.py
"""
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

PX = Path(__file__).resolve().parent.parent / "assets/px"


def halve(name):
    a = np.asarray(Image.open(PX / f"{name}.png").convert("RGBA"))
    h, w = a.shape[0] // 2, a.shape[1] // 2
    out = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            block = a[2 * y:2 * y + 2, 2 * x:2 * x + 2].reshape(-1, 4)
            solid = [tuple(p[:3]) for p in block if p[3] > 127]
            if len(solid) >= 2:   # majority (ties count as filled, so thin outlines survive)
                out[y, x, :3] = Counter(solid).most_common(1)[0][0]
                out[y, x, 3] = 255
    Image.fromarray(out, "RGBA").save(PX / f"{name}.png")
    print(f"{name}.png {w}x{h}")


def soil_band():
    a = np.asarray(Image.open(PX / "soil.png").convert("RGBA"))
    band = np.concatenate([a[:16], a[-27:]])
    Image.fromarray(band, "RGBA").save(PX / "soil.png")
    print(f"soil.png {band.shape[1]}x{band.shape[0]}")


def halve_to(name, out):
    """Half-size copy (same block-majority rule as halve) saved under another key."""
    src = PX / f"{name}.png"
    tmp = PX / f"{out}.png"
    Image.open(src).save(tmp)
    halve(out)


def recolor(name, out, test, to):
    """Copy a sprite, repainting the pixels that pass test(r, g, b) with colour `to` (e.g. a switched-off bulb)."""
    a = np.asarray(Image.open(PX / f"{name}.png").convert("RGBA")).copy()
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    m = test(r, g, b) & (a[..., 3] > 0)
    a[m, :3] = to
    Image.fromarray(a, "RGBA").save(PX / f"{out}.png")
    print(f"{out}.png ({int(m.sum())} px repainted)")


# the bulb under the room lamp's shade in bg-day (art pixels): per row, the first and last x inside its outline
BULB = {55: [(22, 23), (32, 33)], 56: [(22, 33)], 57: [(23, 33)], 58: [(23, 32)], 59: [(24, 31)], 60: [(26, 30)]}


def bulbs():
    """bulb-on / bulb-off: the room's bulb pixels repainted lit (warm yellows) or dark (greys), drawn over the room."""
    bg = np.asarray(Image.open(PX / "bg-day.png").convert("RGB")).astype(int)
    x0, y0 = 22, 55
    for out, ramp in [("bulb-on", [(245, 196, 66), (255, 222, 102), (255, 240, 160)]),
                      ("bulb-off", [(150, 142, 128), (176, 168, 152), (198, 190, 174)])]:
        a = np.zeros((6, 12, 4), np.uint8)
        for y, spans in BULB.items():
            for lo, hi in spans:
                for x in range(lo, hi + 1):
                    lum = bg[y, x].sum()
                    a[y - y0, x - x0] = (*ramp[0 if lum < 700 else 1 if lum < 735 else 2], 255)
        Image.fromarray(a, "RGBA").save(PX / f"{out}.png")
        print(f"{out}.png at art ({x0}, {y0})")


def full_height(name, rows=180):
    """Rooms are 320x179; repeat the last row so they cover 720 px at exactly 4x."""
    im = Image.open(PX / f"{name}.png").convert("RGB")
    if im.height >= rows:
        return
    out = Image.new("RGB", (im.width, rows))
    out.paste(im, (0, 0))
    out.paste(im.crop((0, im.height - 1, im.width, im.height)).resize((im.width, rows - im.height), Image.NEAREST), (0, im.height))
    out.save(PX / f"{name}.png")
    print(f"{name}.png {im.width}x{rows}")


def manifest():
    import json
    m = {p.stem: {"w": Image.open(p).width, "h": Image.open(p).height} for p in sorted(PX.glob("*.png"))}
    (PX / "manifest.json").write_text(json.dumps(m, indent=1))


if __name__ == "__main__":
    for n in ["moss", "leaves", "mould"]:
        halve(n)
    soil_band()
    # mini versions: bubble and button icons, the card's species row
    for n in ["spray", "bulb", "lid", "drop", "seed", "sprout", "air", "heart"]:
        halve_to(f"icon-{n}", f"icon-{n}-s")
    for n in ["snail", "springtail", "fern", "mushroom", "firefly"]:
        halve_to(n, f"{n}-s")
    # a firefly that is not glowing (pale tail, for daytime)
    yellow = lambda r, g, b: (r > 200) & (g > 170) & (b < 150)
    recolor("firefly", "firefly-day", yellow, (232, 220, 168))
    for n in ["bg-day", "bg-night", "title"]:
        full_height(n)
    bulbs()
    manifest()
