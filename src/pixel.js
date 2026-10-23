// Pixel-art look for everything drawn in code (style B, Oct 23). Graphics' rounded boxes and circles are redrawn as
// stepped shapes on a pixel grid, so the panel, cards, bubbles and the jar match the 4x pixel sprites without
// touching every call site. Lines and plain rects are left alone (they are already crisp).
const PX = 4;        // one art pixel on screen (sprites are drawn at 4x)
const PX_LINE = 2;   // thinnest outline step

(function () {
  const G = Phaser.GameObjects.Graphics.prototype;
  const snap = (v, s = PX_LINE) => Math.round(v / s) * s;
  const lineW = w => (w >= 3 ? PX : PX_LINE);

  // remember the current fill and line styles: stepped strokes are drawn as filled rects in the line colour
  const fillStyle = G.fillStyle, lineStyle = G.lineStyle;
  G.fillStyle = function (color, alpha = 1) { this._pxFill = [color, alpha]; return fillStyle.call(this, color, alpha); };
  G.lineStyle = function (width, color, alpha = 1) { this._pxLine = [width, color, alpha]; return lineStyle.call(this, width, color, alpha); };

  // inset of a rounded corner at distance d from the shape's top or bottom edge (a stepped quarter circle)
  const inset = (r, d) => (d >= r ? 0 : snap(r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d)))));

  // the left/right x of a rounded rect's row at offset d from the top (row centre)
  function span(x, w, h, r, d) {
    const e = Math.min(d, h - d), i = inset(r, e);
    return [x + i, x + w - i];
  }

  G.fillRoundedRect = function (x, y, w, h, r = 20) {
    x = snap(x); y = snap(y); w = snap(w); h = snap(h);
    r = Math.min(typeof r === "number" ? r : 20, w / 2, h / 2);
    for (let d = 0; d < h; d += PX_LINE) {
      const [a, b] = span(x, w, h, r, d + PX_LINE / 2);
      this.fillRect(a, y + d, b - a, PX_LINE);
    }
    return this;
  };

  G.strokeRoundedRect = function (x, y, w, h, r = 20) {
    const [lw, color, alpha] = this._pxLine || [1, 0, 1], keep = this._pxFill;
    const t = lineW(lw);
    x = snap(x); y = snap(y); w = snap(w); h = snap(h);
    r = Math.min(typeof r === "number" ? r : 20, w / 2, h / 2);
    fillStyle.call(this, color, alpha);
    for (let d = 0; d < h; d += PX_LINE) {
      const c = d + PX_LINE / 2, [a, b] = span(x, w, h, r, c);
      if (c < t || c > h - t) { this.fillRect(a, y + d, b - a, PX_LINE); continue; }
      const [ia, ib] = span(x + t, w - 2 * t, h - 2 * t, Math.max(0, r - t), c - t);
      this.fillRect(a, y + d, Math.max(t, ia - a), PX_LINE);
      this.fillRect(Math.min(b - t, ib), y + d, Math.max(t, b - ib), PX_LINE);
    }
    if (keep) fillStyle.call(this, keep[0], keep[1]);
    return this;
  };

  G.fillCircle = function (cx, cy, r) {
    cx = snap(cx); cy = snap(cy);
    for (let d = -r; d < r; d += PX_LINE) {
      const yc = d + PX_LINE / 2, hw = snap(Math.sqrt(Math.max(0, r * r - yc * yc)));
      if (hw > 0) this.fillRect(cx - hw, snap(cy + d), hw * 2, PX_LINE);
    }
    return this;
  };

  G.strokeCircle = function (cx, cy, r) {
    const [lw, color, alpha] = this._pxLine || [1, 0, 1], keep = this._pxFill;
    const t = lineW(lw), ri = r - t;
    cx = snap(cx); cy = snap(cy);
    fillStyle.call(this, color, alpha);
    for (let d = -r; d < r; d += PX_LINE) {
      const yc = d + PX_LINE / 2, ho = snap(Math.sqrt(Math.max(0, r * r - yc * yc)));
      if (ho <= 0) continue;
      const hi = Math.abs(yc) < ri ? snap(Math.sqrt(ri * ri - yc * yc)) : 0;
      if (!hi) { this.fillRect(cx - ho, snap(cy + d), ho * 2, PX_LINE); continue; }
      this.fillRect(cx - ho, snap(cy + d), Math.max(t, ho - hi), PX_LINE);
      this.fillRect(cx + Math.min(hi, ho - t), snap(cy + d), Math.max(t, ho - hi), PX_LINE);
    }
    if (keep) fillStyle.call(this, keep[0], keep[1]);
    return this;
  };
})();

// A stepped rounded outline with an optional gap in its top edge (the jar's mouth under the neck).
function pxOutline(g, x, y, w, h, r, t, gap) {
  const snap = v => Math.round(v / PX_LINE) * PX_LINE;
  const ins = (rr, d) => (d >= rr ? 0 : snap(rr - Math.sqrt(Math.max(0, rr * rr - (rr - d) * (rr - d)))));
  const span = (xx, ww, hh, rr, d) => { const i = ins(rr, Math.min(d, hh - d)); return [xx + i, xx + ww - i]; };
  for (let d = 0; d < h; d += PX_LINE) {
    const c = d + PX_LINE / 2, [a, b] = span(x, w, h, r, c);
    if (c < t || c > h - t) {
      if (gap && c < t) { g.fillRect(a, y + d, gap[0] - a, PX_LINE); g.fillRect(gap[1], y + d, b - gap[1], PX_LINE); }
      else g.fillRect(a, y + d, b - a, PX_LINE);
      continue;
    }
    const [ia, ib] = span(x + t, w - 2 * t, h - 2 * t, Math.max(0, r - t), c - t);
    g.fillRect(a, y + d, Math.max(t, ia - a), PX_LINE);
    g.fillRect(Math.min(b - t, ib), y + d, Math.max(t, b - ib), PX_LINE);
  }
  return g;
}

// Whole-number scale that fits a texture into a box: pixel sprites stay crisp (every art pixel the same size).
function fitPx(scene, key, box) {
  const s = scene.textures.get(key).getSourceImage();
  return Math.max(1, Math.round(box / Math.max(s.width, s.height)));
}
// A scale near `want` (in screen pixels per art pixel), snapped to whole steps.
const pxStep = want => Math.max(1, Math.round(want));
