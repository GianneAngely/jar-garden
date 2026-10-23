"""Fit a few pixel sprites to their place in the jar, after tools/make_pixel.py.

In the jar every art pixel is 2 screen pixels (the room around it is 4). The soil-life tufts came out of the sheet
twice as detailed as a 20-slot floor needs, and the soil strip is taller than the jar's soil band, so:
- moss, leaves, mould: halved (2x2 blocks -> the block's most common opaque colour), alpha kept binary
- soil: top 16 rows of earth + bottom 27 rows of pebbles = 43 rows, which is the 86 px soil band at 2x

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


if __name__ == "__main__":
    for n in ["moss", "leaves", "mould"]:
        halve(n)
    soil_band()
