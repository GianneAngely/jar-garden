"""Flow pixel-art renders (art/flow/pixel/*.jpg) -> true pixel-art PNGs (1 art pixel = 1 PNG pixel) in assets/px/.

python3 tools/make_pixel.py

The Flow JPGs only imitate pixel art: an "art pixel" is 3-6 image pixels wide, the grid drifts and JPEG noise
blurs every edge. Per source image:
  1. key the #00FF00 background (and the darker green icon squares) to a binary mask,
  2. pick the art pixel size p: a clean lattice if the image has one (icons, logo), else the nominal 320-px frame,
  3. split sheets into sprites (connected components, small bits merged into their neighbour),
  4. per sprite fit a non-uniform grid of exactly round(size / p) cells that snaps its cuts to real colour edges
     (dynamic programming), take each cell's dominant colour (not the average; thin dark line work wins at 20%)
     and majority alpha; tiny parts (spores) and eye glints that lose every vote get their best cell back,
  5. quantise to a small palette and clean single-pixel noise.
Also writes assets/px/manifest.json and the check sheet art/_pixel-overview.png.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art/flow/pixel"
OUT = ROOT / "assets/px"

# sheet -> keys in reading order (None = item on the sheet we don't use)
SHEETS = {
    "jgp-creatures-a.jpg": ["snail", "snail-sad", "springtail", "firefly", "fern", "mushroom", "moss", "leaves"],
    "jgp-props-a.jpg": ["mould", "cork", "lamp", None, "soil"],   # None: the tiny seed
    "jgp-icons-b.jpg": ["icon-spray", "icon-bulb", "icon-lid", "icon-drop",
                        "icon-seed", "icon-sprout", "icon-air", "icon-heart"],
    "jgp-neighbours-b.jpg": ["hedgehog", "mole", "owl", "frog"],
    "jgp-logo-a.jpg": ["logo"],
}
FRAMES = {"jgp-day-a.jpg": "bg-day", "jgp-night-a.jpg": "bg-night", "jgp-style-ref.jpg": "title"}
NOMINAL_ART_WIDTH = 320          # Flow frames are drawn as ~320 art px across when there is no clean lattice
SPRITE_COLOURS, FRAME_COLOURS = 32, 48
DARK_SHARE = 0.2          # see dominant()


# ---------- keying ----------

def greenness(a):
    return a[..., 1] - np.maximum(a[..., 0], a[..., 2])


def key_mask(a):
    """-> (bg, fringe). bg: key green incl. the darker icon squares (content greens like moss/frog/fern stay
    below ~60). fringe: green-tinted blend pixels hugging the key, not trusted for colour."""
    gr = greenness(a)
    bg = (gr > 90) & (a[..., 1] > 110)
    near = dilate(bg, 2)
    fringe = near & ~bg & (gr > 25)
    return bg, fringe


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


# ---------- art pixel size ----------

def edge_runs(a):
    """lengths between successive strong colour edges along rows and columns"""
    runs = []
    for axis in (1, 0):
        d = np.abs(np.diff(a, axis=axis)).sum(axis=2)
        if axis == 0:
            d = d.T
        pad = np.pad(d, ((0, 0), (1, 1)))
        m = (d > 60) & (d >= pad[:, :-2]) & (d > pad[:, 2:])
        for row in m:
            pos = np.flatnonzero(row)
            if len(pos) > 1:
                runs.append(np.diff(pos))
    r = np.concatenate(runs).astype(float)
    return r[(r >= 2) & (r <= 18)]


def detect_pixel_size(a):
    """A clean lattice puts nearly every edge-to-edge run on a multiple of p. Flow's icon and logo sheets have one
    (score > 0.9); its sprite sheets and rooms mix 3-6 px pixels (score ~0.5), so they get the nominal frame size."""
    runs = edge_runs(a)
    ps = np.arange(3.5, 7.001, 0.05)
    score = np.array([np.mean(np.abs(runs - np.maximum(1, np.round(runs / p)) * p) <= 0.75) for p in ps])
    i = int(score.argmax())
    if score[i] >= 0.8:
        return float(round(ps[i], 2)), "lattice", float(score[i])
    return round(a.shape[1] / NOMINAL_ART_WIDTH, 2), "nominal", float(score[i])


# ---------- grid fitting ----------

def cut_profile(a, axis, valid=None):
    """P[c]: how strongly a pixel boundary sits just before index c (cuts along x for axis=1, along y for axis=0)."""
    d = np.abs(np.diff(a, axis=axis)).sum(axis=2)
    if valid is not None:
        v = valid[:, 1:] | valid[:, :-1] if axis == 1 else valid[1:] | valid[:-1]
        d = d * v
    if axis == 0:
        d = d.T
    pad = np.pad(d, ((0, 0), (1, 1)))
    nms = (d >= pad[:, :-2]) & (d >= pad[:, 2:])
    s = np.clip((d - 15) / 60, 0, 1) * nms
    P = np.zeros(d.shape[1] + 2)
    P[1:-1] = s.sum(0)
    return P


def fit_cuts(P, N, lam=0.15):
    """exactly N cells over n = len(P)-1 px: cuts land on strong edges, widths stay near n/N (the end cells are free)."""
    n = len(P) - 1
    p = n / N
    wmin, wmax = max(2, int(np.floor(p * 0.6))), int(np.ceil(p * 1.5))
    inner = P[1:-1]
    Pn = np.zeros(n + 1) if not (inner > 0).any() else np.minimum(P / (np.percentile(inner[inner > 0], 90) + 1e-6), 1.5)
    NEG = -1e18
    best = np.full(n + 1, NEG)
    best[0] = 0
    back = np.zeros((N + 1, n + 1), np.int16)
    for k in range(1, N + 1):
        end = k in (1, N)
        nb = np.full(n + 1, NEG)
        arg = np.zeros(n + 1, np.int16)
        for w in (range(1, wmax + 1) if end else range(wmin, wmax + 1)):
            v = np.full(n + 1, NEG)
            v[w:] = best[:-w] - (0 if end else lam * (w - p) ** 2)
            upd = v > nb
            nb[upd], arg[upd] = v[upd], w
        if k < N:
            nb = nb + Pn
        best, back[k] = nb, arg
    cuts, c = [n], n
    for k in range(N, 0, -1):
        c -= back[k][c]
        cuts.append(c)
    return np.array(cuts[::-1])


def dominant(px, w, tol=36.0, dark_share=DARK_SHARE):
    """colour of the largest cluster (weighted), not the blurry mean. Thin dark line work (eyes, mouths, outline
    corners) rarely fills half a cell, so a dark cluster wins once it holds dark_share of the cell."""
    close = np.abs(px[:, None, :] - px[None, :, :]).sum(2) < tol
    score = (close * w[None, :]).sum(1)
    k = int(score.argmax())
    lum = px.mean(1)
    dark = (lum < 80) & (lum < lum[k] - 70)
    if dark.any():
        kd = int(np.where(dark, score, -1).argmax())
        if score[kd] >= dark_share * w.sum():
            k = kd
    sel = close[k]
    return (px[sel] * w[sel, None]).sum(0) / w[sel].sum()


def sample_grid(a, cx, cy, fg=None, fringe=None):
    """-> (H, W, 3) colours and (H, W) bool alpha"""
    H, W = len(cy) - 1, len(cx) - 1
    col = np.zeros((H, W, 3), np.float32)
    alpha = np.ones((H, W), bool)
    for j in range(H):
        y0, y1 = cy[j], cy[j + 1]
        for i in range(W):
            x0, x1 = cx[i], cx[i + 1]
            px = a[y0:y1, x0:x1].reshape(-1, 3)
            wt = np.full((y1 - y0, x1 - x0), 0.5, np.float32)   # border ring of a cell is often a JPEG blend
            wt[1 if y1 - y0 >= 4 else 0:y1 - y0 - (1 if y1 - y0 >= 4 else 0),
               1 if x1 - x0 >= 4 else 0:x1 - x0 - (1 if x1 - x0 >= 4 else 0)] = 1.0
            wt = wt.ravel()
            if fg is not None:
                f = fg[y0:y1, x0:x1].ravel()
                fr = fringe[y0:y1, x0:x1].ravel()
                core = f & ~fr
                if (core.sum() + 0.5 * (f & fr).sum()) < 0.5 * len(f):
                    alpha[j, i] = False
                    continue
                use = core if core.any() else f
                px, wt = px[use], wt[use]
            col[j, i] = dominant(px, wt)
    return col, alpha


# ---------- palette + cleanup ----------

def to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T
    xyz /= np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def quantise(col, alpha, k):
    """k-means in Lab (seeded by median cut), no dithering -> uint8 colours on the palette"""
    px = col[alpha]
    if len(px) == 0:
        return col.astype(np.uint8)
    seed = Image.fromarray(px.clip(0, 255).astype(np.uint8)[None]).quantize(min(k, len(px)), Image.Quantize.MEDIANCUT)
    pal = np.array(seed.getpalette()[: 3 * len(seed.getcolors())], np.float32).reshape(-1, 3)
    lab = to_lab(px)
    for _ in range(12):
        idx = ((lab[:, None, :] - to_lab(pal)[None]) ** 2).sum(2).argmin(1)
        pal = np.array([px[idx == c].mean(0) if (idx == c).any() else pal[c] for c in range(len(pal))])
    pal = pal.round().clip(0, 255)
    out = np.zeros(col.shape, np.uint8)
    out[alpha] = pal[idx].astype(np.uint8)
    return out


def neighbours8(img, alpha):
    H, W = alpha.shape
    pi = np.pad(img.astype(np.int32), ((1, 1), (1, 1), (0, 0)))
    pa = np.pad(alpha, 1)
    offs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    return ([pi[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy, dx in offs],
            [pa[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy, dx in offs])


def clean(img, alpha, passes=2):
    """- low-contrast orphans (a colour no 4-neighbour shares, sitting in a field of one other close colour) take the
         field colour; high-contrast singles (eye glints, stars, spores) stay
       - 1-px transparent pinholes inside a sprite are filled"""
    img, alpha = img.copy(), alpha.copy()
    H, W = alpha.shape
    for _ in range(passes):
        cols, als = neighbours8(img, alpha)
        cur = img.astype(np.int32)
        same4 = np.zeros(alpha.shape, bool)
        for n in (1, 3, 4, 6):
            same4 |= als[n] & (np.abs(cols[n] - cur).sum(2) == 0)
        for y, x in zip(*np.nonzero(alpha & ~same4)):
            nb = [tuple(cols[n][y, x]) for n in range(8) if als[n][y, x]]
            if len(nb) < 6:
                continue
            best = max(set(nb), key=nb.count)
            if nb.count(best) >= 5 and np.abs(np.array(best) - cur[y, x]).sum() < 90:
                img[y, x] = best
        n4 = als[1].astype(int) + als[3] + als[4] + als[6]
        holes = ~alpha & (n4 == 4)
        for y, x in zip(*np.nonzero(holes)):
            nb = [tuple(cols[n][y, x]) for n in (1, 3, 4, 6)]
            img[y, x] = max(set(nb), key=nb.count)
        alpha[holes] = True
    img[~alpha] = 0
    return img, alpha


def despill(img, alpha):
    """recolour green-leaning edge pixels that still touch the key (antialias halo the mode didn't reject)"""
    a = img.astype(np.int32)
    _, als = neighbours8(img, alpha)
    edge = alpha & ~np.logical_and.reduce(als)
    gr = greenness(a)
    bad = edge & (gr > 40) & (a[..., 1] > 120)
    a[..., 1] = np.where(bad, np.maximum(a[..., 0], a[..., 2]), a[..., 1])
    return a.astype(np.uint8)


# ---------- sheets ----------

def components(mask, step=4):
    """8-connected components of mask, found on a step-downscaled copy (parts within ~step px join)
    -> [{mask, box: [x0, y0, x1, y1], area}]"""
    H, W = mask.shape
    hb, wb = -(-H // step), -(-W // step)
    m = np.zeros((hb * step, wb * step), bool)
    m[:H, :W] = mask
    blk = m.reshape(hb, step, wb, step).any((1, 3))
    lab = np.zeros(blk.shape, np.int32)
    comps = []
    for y0, x0 in zip(*np.nonzero(blk)):
        if lab[y0, x0]:
            continue
        lab[y0, x0] = len(comps) + 1
        stack, cells = [(y0, x0)], []
        while stack:
            y, x = stack.pop()
            cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < hb and 0 <= xx < wb and blk[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = len(comps) + 1
                        stack.append((yy, xx))
        comps.append(np.array(cells))
    out = []
    for c in comps:
        y0, x0 = c.min(0) * step
        y1, x1 = (c.max(0) + 1) * step
        sub = np.zeros(mask.shape, bool)
        for y, x in c:
            sub[y * step:(y + 1) * step, x * step:(x + 1) * step] = True
        sub &= mask
        out.append({"mask": sub, "box": [x0, y0, min(x1, W), min(y1, H)], "area": int(sub.sum())})
    return out


def box_gap(a, b):
    dx = max(a[0] - b[2], b[0] - a[2], 0)
    dy = max(a[1] - b[3], b[1] - a[3], 0)
    return max(dx, dy)


def merge(c, d):
    return {"mask": c["mask"] | d["mask"], "area": c["area"] + d["area"],
            "box": [min(c["box"][0], d["box"][0]), min(c["box"][1], d["box"][1]),
                    max(c["box"][2], d["box"][2]), max(c["box"][3], d["box"][3])]}


def split_items(fg, n_expected):
    """connected components -> items: drop JPEG specks, glue touching/overlapping big parts, then hang each
    small part (glow, spores, a stray leaf) on its nearest item when it's close."""
    comps = [c for c in components(fg) if c["area"] >= 30]
    if n_expected == 1:   # logo: everything is one item
        item = comps[0]
        for c in comps[1:]:
            item = merge(item, c)
        return [item]
    big_area = max(c["area"] for c in comps)
    big = [c for c in comps if c["area"] >= 0.02 * big_area]
    small = [c for c in comps if c["area"] < 0.02 * big_area]
    changed = True
    while changed:
        changed = False
        for i in range(len(big)):
            for j in range(i + 1, len(big)):
                if box_gap(big[i]["box"], big[j]["box"]) <= 12:
                    big[i] = merge(big[i], big.pop(j))
                    changed = True
                    break
            if changed:
                break
    for c in sorted(small, key=lambda c: -c["area"]):
        gaps = [box_gap(c["box"], b["box"]) for b in big]
        k = int(np.argmin(gaps))
        if gaps[k] <= 48:
            big[k] = merge(big[k], c)
        elif c["area"] >= 300:
            big.append(c)   # a separate small item (the seed on the props sheet)
    # reading order: rows by vertical overlap, then left to right
    big.sort(key=lambda c: (c["box"][1] + c["box"][3]) / 2)
    rows = []
    for c in big:
        cy = (c["box"][1] + c["box"][3]) / 2
        if rows and rows[-1][0][1] <= cy <= rows[-1][0][3]:
            rows[-1][1].append(c)
            rows[-1][0][1] = min(rows[-1][0][1], c["box"][1])
            rows[-1][0][3] = max(rows[-1][0][3], c["box"][3])
        else:
            rows.append([list(c["box"]), [c]])
    items = [c for _, r in rows for c in sorted(r, key=lambda c: c["box"][0])]
    if len(items) != n_expected:
        raise SystemExit(f"expected {n_expected} items, found {len(items)}: {[c['box'] for c in items]}")
    return items


def pixelate_item(a, fg, fringe, item, p):
    H, W = fg.shape
    m = int(np.ceil(p)) + 2
    x0, y0, x1, y1 = item["box"]
    x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(W, x1 + m), min(H, y1 + m)
    crop = a[y0:y1, x0:x1].copy()
    mine = item["mask"][y0:y1, x0:x1]
    f = fg[y0:y1, x0:x1] & mine
    crop[~f & ~fringe[y0:y1, x0:x1]] = (0, 255, 0)   # other items in the box read as key green
    nx, ny = max(1, round((x1 - x0) / p)), max(1, round((y1 - y0) / p))
    cx = fit_cuts(cut_profile(crop, 1), nx)
    cy = fit_cuts(cut_profile(crop, 0), ny)
    col, alpha = sample_grid(crop, cx, cy, f, fringe[y0:y1, x0:x1] & mine)
    rescue_small_parts(crop, cx, cy, f, col, alpha)
    rescue_glints(crop, cx, cy, f, col, alpha, p)
    return col, alpha


def rescue_small_parts(a, cx, cy, f, col, alpha):
    """a part narrower than half a cell (a spore, a sparkle) loses every majority vote; give it its best cell"""
    for c in components(f, step=2):
        ys, xs = np.nonzero(c["mask"])
        ci = np.searchsorted(cx, xs, side="right") - 1
        cj = np.searchsorted(cy, ys, side="right") - 1
        if alpha[cj, ci].any():
            continue
        cell = np.bincount(cj * len(cx) + ci).argmax()
        j, i = divmod(int(cell), len(cx))
        sel = (cj == j) & (ci == i)
        col[j, i] = dominant(a[ys[sel], xs[sel]], np.ones(sel.sum(), np.float32))
        alpha[j, i] = True


def rescue_glints(a, cx, cy, f, col, alpha, p):
    """light specks enclosed by dark line work (eye glints) lose to the dark-detail rule; put each back on its best
    cell when every cell it touches came out dark"""
    lum = a.mean(2)
    dark = f & (lum < 90)
    for c in components(f & ~dark & (lum > 150), step=1):
        if not 0.4 * p * p <= c["area"] <= 3 * p * p:
            continue
        ring = dilate(c["mask"], 1) & ~c["mask"]
        if dark[ring].mean() < 0.75:
            continue
        ys, xs = np.nonzero(c["mask"])
        ci = np.searchsorted(cx, xs, side="right") - 1
        cj = np.searchsorted(cy, ys, side="right") - 1
        if (col[cj, ci].mean(1) > 120).any():
            continue
        cell = np.bincount(cj * len(cx) + ci).argmax()
        j, i = divmod(int(cell), len(cx))
        sel = (cj == j) & (ci == i)
        col[j, i] = dominant(a[ys[sel], xs[sel]], np.ones(sel.sum(), np.float32))


def trim(img, alpha):
    ys, xs = np.nonzero(alpha)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1], alpha[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def finish_sprite(col, alpha):
    img = quantise(col, alpha, SPRITE_COLOURS)
    img = despill(img, alpha)
    img, alpha = clean(img, alpha)
    img, alpha = trim(img, alpha)
    return Image.fromarray(np.dstack([img, alpha.astype(np.uint8) * 255]), "RGBA")


# ---------- main ----------

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, outputs = {}, []
    for src, keys in SHEETS.items():
        a = np.asarray(Image.open(SRC / src).convert("RGB")).astype(np.float32)
        p, how, score = detect_pixel_size(a)
        bg, fringe = key_mask(a)
        items = split_items(~bg, len(keys))
        print(f"{src}: p={p} ({how}, lattice score {score:.2f}), {len(items)} items")
        for key, item in zip(keys, items):
            if key is None:
                continue
            im = finish_sprite(*pixelate_item(a, ~bg, fringe, item, p))
            im.save(OUT / f"{key}.png")
            manifest[key] = {"w": im.width, "h": im.height, "srcPixelSize": p}
            outputs.append(key)
            print(f"  {key}.png {im.width}x{im.height}")
    for src, key in FRAMES.items():
        a = np.asarray(Image.open(SRC / src).convert("RGB")).astype(np.float32)
        p, how, score = detect_pixel_size(a)
        H, W = a.shape[:2]
        cx = fit_cuts(cut_profile(a, 1), round(W / p))
        cy = fit_cuts(cut_profile(a, 0), round(H / p))
        col, alpha = sample_grid(a, cx, cy)
        img = quantise(col, alpha, FRAME_COLOURS)
        img, _ = clean(img, alpha)
        im = Image.fromarray(img, "RGB")
        im.save(OUT / f"{key}.png")
        manifest[key] = {"w": im.width, "h": im.height, "srcPixelSize": p}
        outputs.append(key)
        print(f"{src}: p={p} ({how}, lattice score {score:.2f}) -> {key}.png {im.width}x{im.height}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    overview(outputs)


def overview(keys, scale=4):
    """every output at 4x nearest-neighbour on the light and the dark backdrop, key + native size underneath"""
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    LIGHT, DARK, PAGE = (243, 230, 211), (29, 37, 71), (120, 120, 128)
    tiles = []
    for key in keys:
        im = Image.open(OUT / f"{key}.png").convert("RGBA")
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        pad = 12
        t = Image.new("RGB", (big.width * 2 + pad * 4, big.height + pad * 2 + 30), PAGE)
        for k, c in enumerate((LIGHT, DARK)):
            x = k * (big.width + pad * 2)
            t.paste(c, (x, 0, x + big.width + pad * 2, big.height + pad * 2))
            t.paste(big, (x + pad, pad), big)
        ImageDraw.Draw(t).text((4, big.height + pad * 2 + 5), f"{key}  {im.width}x{im.height}", fill=(255, 255, 255), font=font)
        tiles.append(t)
    maxw = 2700
    rows, row, w = [], [], 0
    for t in tiles:
        if row and w + t.width > maxw:
            rows.append(row)
            row, w = [], 0
        row.append(t)
        w += t.width + 16
    rows.append(row)
    W = max(sum(t.width + 16 for t in r) for r in rows) + 16
    H = sum(max(t.height for t in r) + 16 for r in rows) + 16
    sheet = Image.new("RGB", (W, H), (120, 120, 128))
    y = 16
    for r in rows:
        x = 16
        for t in r:
            sheet.paste(t, (x, y))
            x += t.width + 16
        y += max(t.height for t in r) + 16
    sheet.save(ROOT / "art/_pixel-overview.png")
    print(f"art/_pixel-overview.png {W}x{H}")


if __name__ == "__main__":
    main()
