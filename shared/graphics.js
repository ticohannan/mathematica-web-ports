// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/graphics.js — Mathematica's 2D Graphics language as data, drawn into an svg-plot.js picture.
//
// Write the picture the way the Wolfram Language does: a nested list of primitives and directives.
//
//   Graphics([
//     Gray, EdgeForm(Black),
//     Rotate(Rectangle([-w, -w], [l + w, w], { RoundingRadius: w }), theta1, [0, 0]),
//     [Brown, Disk(p1, w), Disk(p2, w)],               // a nested list scopes its directives
//     [Red, AbsoluteDashing([2, 2]), Line([[0, 0], [1, 1]])],
//     Text(Style(Subscript('θ', 1), Italic, { FontSize: 12 }), [4.8, -2.2]),
//   ], { PlotRange: [[-2.2, 7.1], [-2.4, 2.4]], ImageSize: 600 })
//
// Rules (as in Mathematica): a directive applies to the primitives AFTER it in the same list and in lists nested
// below it; a nested list starts with a copy of the enclosing style, so its directives do not leak out. Colours are
// RGBColor objects (`Red`, `RGBColor(1, 0, 0)`, `Darker(Green)`), never bare arrays, so that a list of primitives and
// a colour cannot be confused.
//
// Additions with no Wolfram Language counterpart (needed for tests, accessibility and speed):
//   Annotation(g, id, attrs)   — Mathematica's Annotation[expr, data]: `id` becomes the element's data-testid, and
//                                attrs (an object) further attributes, e.g. { 'data-color': 'green' }.
//   ImageRaster(image, [[x0, y0], [x1, y1]]) draws an RGBA image {width, height, data} with ROW 1 AT THE TOP (the order
//                                of ArrayPlot and Image; Mathematica's Raster puts row 1 at the bottom, hence the other
//                                name); the encoded picture is cached per image object, so an unchanged image is not
//                                re-encoded on every redraw.
//   Raw(draw)                  — a migration aid: an older SVG drawing helper used inside Graphics data.
//   Clip(g, range, id)          — PlotRangeClipping for one part of a picture.
//   ArrayPlot(m, {DataRange, ColorRules, ColorFunction}) — a matrix as coloured cells (an ImageRaster, made once per matrix).
//   Cases(g, head | pred), annotations(g), annotation(g, id) — read a picture's primitives (pure; for tests and models
//                                that return their picture as Graphics data).
//
// Sizes follow svg-plot.js: Thickness[t] and PointSize[d] are fractions of the plot width; AbsoluteThickness,
// AbsolutePointSize, AbsoluteDashing and font sizes are pixels at the picture's ImageSize.
//
// The data constructors are pure (usable in Node tests); render() needs the DOM.

import { NAMED, blend, css } from './mma-colors.js';
import { svgNode, arcPoints } from './svg-plot.js';

// ---- colours -------------------------------------------------------------------------------------------------------
const color = (rgb) => Object.freeze({ dir: 'color', rgb: Object.freeze([...rgb]) });
/** RGBColor[r, g, b] (0..1). */
export const RGBColor = (r, g, b) => color([r, g, b]);
/** GrayLevel[g]. */
export const GrayLevel = (g) => color([g, g, g]);
export const Black = color(NAMED.Black), White = color(NAMED.White), Gray = color(NAMED.Gray);
export const LightGray = color(NAMED.LightGray), DarkGray = color(NAMED.DarkGray);
export const Red = color(NAMED.Red), Green = color(NAMED.Green), Blue = color(NAMED.Blue);
export const Cyan = color(NAMED.Cyan), Magenta = color(NAMED.Magenta), Yellow = color(NAMED.Yellow);
export const Brown = color(NAMED.Brown), Orange = color(NAMED.Orange), Pink = color(NAMED.Pink), Purple = color(NAMED.Purple);
export const LightRed = color(NAMED.LightRed), LightBlue = color(NAMED.LightBlue), LightGreen = color(NAMED.LightGreen);
/** Darker[c, f] = Blend[{c, Black}, f]; Lighter[c, f] = Blend[{c, White}, f] (default f = 1/3). */
export const Darker = (c, f = 1 / 3) => color(blend(c.rgb, NAMED.Black, f));
export const Lighter = (c, f = 1 / 3) => color(blend(c.rgb, NAMED.White, f));
/** Blend[{a, b}, t]. */
export const Blend = ([a, b], t = 0.5) => color(blend(a.rgb, b.rgb, t));
/** Hue[h, s, b] (v0.1.23): the HSB colour, h taken modulo 1 (Hue[0] and Hue[1] are red), s and b default 1. */
export function Hue(h, sat = 1, bri = 1) {
  const t = ((h % 1) + 1) % 1 * 6, i = Math.floor(t) % 6, f = t - Math.floor(t);
  const p = bri * (1 - sat), q = bri * (1 - sat * f), u = bri * (1 - sat * (1 - f));
  return color([[bri, u, p], [q, bri, p], [p, bri, u], [p, q, bri], [u, p, bri], [bri, p, q]][i]);
}
/** The CSS colour of an RGBColor ("rgb(255,0,0)"). */
export const cssColor = (c) => css(c.rgb);
/** Mathematica's None (no edge, no glyph, no colour). */
export const None = Object.freeze({ dir: 'none' });

// ---- directives ----------------------------------------------------------------------------------------------------
const directive = (dir, value) => Object.freeze({ dir, value });
export const Opacity = (a) => directive('opacity', a);
/** Thickness[t]: fraction of the plot width. */
export const Thickness = (t) => directive('thickness', t);
/** AbsoluteThickness[px]. */
export const AbsoluteThickness = (px) => directive('thickness', { abs: px });
export const Thin = AbsoluteThickness(0.25), Thick = AbsoluteThickness(2); // as documented for Thin and Thick
/** AbsoluteDashing[{d1, d2, …}] in px; Dashed = AbsoluteDashing[{3, 3}] (approximation); Dashing[None] = solid. */
export const AbsoluteDashing = (ds) => directive('dash', ds);
export const Dashed = AbsoluteDashing([3, 3]), Dotted = AbsoluteDashing([0.5, 2]);
/** CapForm["Butt" | "Round" | "Square"]. */
export const CapForm = (c) => directive('cap', c === 'Square' ? 'square' : c === 'Round' ? 'round' : 'butt');
/** PointSize[d] (fraction of the width), AbsolutePointSize[px], or a named size 'Small' | 'Medium' | 'Large'. */
/** PointSize[d] (fraction of the width); PointSize[Tiny | Small | Medium | Large] (v0.1.23): absolute sizes as measured in
 * Mathematica's pictures (2, 3, 4.4, 7 px at the image size), independent of the picture's width. */
export const PointSize = (d) => directive('pointSize', typeof d === 'string' && NAMED_POINT[d] ? { abs: NAMED_POINT[d] } : d);
const NAMED_POINT = { Tiny: 2, Small: 3, Medium: 4.4, Large: 7 };
export const AbsolutePointSize = (px) => directive('pointSize', { abs: px });
/** Arrowheads[s]: head length as a fraction of the plot width. */
export const Arrowheads = (s) => directive('arrowheads', s);
/** EdgeForm[] (no edges), EdgeForm[c], EdgeForm[Directive[c, AbsoluteThickness[t], …]]. */
export const EdgeForm = (...ds) => directive('edge', ds.length === 0 || ds[0] === None ? null : ds.flatMap((d) => (d.dir === 'directive' ? d.value : [d])));
/** FaceForm[c] (filled primitives only); FaceForm[None] = no fill. */
export const FaceForm = (c) => directive('face', c === None ? null : c);
/** Transparent as a face colour: filled primitives get no fill (their EdgeForm still draws). */
export const Transparent = FaceForm(None);
/** Directive[d1, d2, …]. */
export const Directive = (...ds) => directive('directive', ds);
/** FontSize, FontFamily, FontWeight, FontSlant for Text (also usable as Style options). */
export const FontSize = (px) => directive('fontSize', typeof px === 'string' ? fontSizeOf(px) : px);
export const FontFamily = (f) => directive('fontFamily', f);
export const Italic = directive('fontSlant', 'italic');
/**
 * ScriptSizeMultipliers -> m and ScriptBaselineShifts -> {sub, sup} (Mathematica's Style options for Subscript /
 * Superscript): a number is a fraction of the font size (defaults 0.72 and {0.28, 0.4}); { abs: px } a size or shift in
 * pixels; a string ('75%', '0.3em') is written into the SVG as it is.
 */
export const ScriptSizeMultipliers = (m) => directive('scriptSize', m);
export const ScriptBaselineShifts = ([sub, sup]) => directive('scriptShift', [sub, sup]);
export const Bold = directive('fontWeight', 'bold');

// ---- primitives ----------------------------------------------------------------------------------------------------
const prim = (head, props) => Object.freeze({ head, ...props });
export const Line = (pts) => prim('Line', { pts });
export const Polygon = (pts) => prim('Polygon', { pts });
/** Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> r]. */
export const Rectangle = (a, b, { RoundingRadius = 0 } = {}) => prim('Rectangle', { a, b, r: RoundingRadius });
/** Disk[c, r]; Disk[c, {rx, ry}] is an ellipse; Disk[c, r, {a0, a1}] the sector from angle a0 to a1 (v0.1.24). */
export const Disk = (c, r, angles = null) => prim('Disk', angles ? { c, r, angles } : { c, r });
/** The outline of a sector Disk[c, r, {a0, a1}] (r or {rx, ry}): the centre, then the arc sampled (≤ 96 per turn). */
export function sectorPoints(c, r, [a0, a1], f = (p) => p) {
  const [rx, ry] = Array.isArray(r) ? r : [r, r], n = Math.max(8, Math.ceil((Math.abs(a1 - a0) / (2 * Math.PI)) * 96));
  return [f(c), ...Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return f([c[0] + rx * Math.cos(t), c[1] + ry * Math.sin(t)]); })];
}
/** Circle[c, r] or the arc Circle[c, r, {a0, a1}]. */
export const Circle = (c, r, angles = null) => prim('Circle', { c, r, angles });
/** Point[p] or Point[{p1, p2, …}]. */
export const Point = (p) => prim('Point', { pts: Array.isArray(p[0]) ? p : [p] });
/** Arrow[{p1, …, pn}]: the line and a filled head at pn (Arrowheads sets the head size). */
export const Arrow = (pts) => prim('Arrow', { pts });
/** Text[expr, pos]: expr a string, number, Style[…] or Subscript[…]; anchor 'middle' (default) | 'start' | 'end'. */
export const Text = (expr, pos, offset = null) => {
  // Text[expr, pos, {ox, oy}]: Mathematica's offset; {-1, 0} puts the left end at pos, {0, 1} the top, … (horizontal
  // start / middle / end, vertical top / middle / bottom). The options form { anchor } is kept.
  if (Array.isArray(offset)) {
    const [ox, oy] = offset;
    return prim('Text', {
      expr, pos, anchor: ox < 0 ? 'start' : ox > 0 ? 'end' : 'middle',
      baseline: oy < 0 ? 'text-after-edge' : oy > 0 ? 'text-before-edge' : null,
    });
  }
  return prim('Text', { expr, pos, anchor: offset?.anchor ?? 'middle', baseline: null });
};
/** Tooltip[g, label]: g with a hover text (an SVG <title>). */
export const Tooltip = (g, label) => prim('Tooltip', { g, label });
/**
 * cachedGraphics() → part(keys, () => graphics): a part of the picture drawn again only when one of `keys` differs (===)
 * from its last draw; otherwise the elements drawn last time are reused. For large, rarely changing parts (a tree of a
 * thousand nodes, a static frame). No Mathematica counterpart (its front end decides this by itself).
 */
export function cachedGraphics() {
  const slot = { byPlot: new WeakMap() }; // one remembered drawing per picture
  return (keys, thunk) => prim('Cached', { slot, keys, thunk });
}
/**
 * Rotate[g, θ, {x, y}] (radians, counter-clockwise, about the point). Without the point, as in Mathematica, about the
 * centre of g's bounding box (Line, Polygon, Point, Arrow, Rectangle, Disk, Circle and lists of them; give the point
 * for anything else).
 */
export const Rotate = (g, angle, about) => prim('Rotate', { g, angle, about: about ?? boxCentre(g) });

/** Bounding box [[xmin, ymin], [xmax, ymax]] of simple primitives and lists of them (pure). */
export function bounds(g) {
  const pts = [];
  const add = (q) => {
    if (Array.isArray(q)) { q.forEach(add); return; }
    if (!q || !q.head) return;
    if (['Line', 'Polygon', 'Point', 'Arrow'].includes(q.head)) pts.push(...flatPts(q.pts));
    else if (q.head === 'Rectangle') pts.push(q.a, q.b);
    else if (q.head === 'Disk' || q.head === 'Circle') pts.push([q.c[0] - q.r, q.c[1] - q.r], [q.c[0] + q.r, q.c[1] + q.r]);
    else if (q.head === 'Annotation') add(q.g);
    else throw new Error(`graphics: give Rotate a centre point for ${q.head}`);
  };
  add(g);
  if (!pts.length) throw new Error('graphics: Rotate of nothing needs a centre point');
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}
const boxCentre = (g) => { const [[a, b], [c, d]] = bounds(g); return [(a + c) / 2, (b + d) / 2]; };
/** A point list, or a list of point lists (several lines/polygons), flattened to points. */
const isMulti = (pts) => Array.isArray(pts[0]?.[0]);
const flatPts = (pts) => (isMulti(pts) ? pts.flat() : pts);
/** Translate[g, {dx, dy}]. */
export const Translate = (g, v) => prim('Translate', { g, v });
/** Inset[Graphics[…, PlotRange, ImageSize], pos]: a small picture of its own (e.g. a locator icon) centred at pos. */
export const Inset = (graphics, pos) => prim('Inset', { graphics, pos });
/** An RGBA image {width, height, data} (row 1 at the TOP, as ArrayPlot and Image) over [[x0, y0], [x1, y1]]. */
export const ImageRaster = (image, [[x0, y0], [x1, y1]]) => prim('ImageRaster', { image, box: [[x0, y0], [x1, y1]] });
/**
 * Raw(draw): MIGRATION AID, no Wolfram Language counterpart — draw(plot, group) appends SVG itself and returns the node.
 * Lets a picture written as data reuse an older drawing helper until that helper is rewritten as data.
 */
export const Raw = (fn) => prim('Raw', { fn });
/**
 * Clip[g, {{x0, x1}, {y0, y1}}, id] — PlotRangeClipping for a part of a picture: g drawn in a group clipped to the
 * rectangle (an SVG clipPath with this id, made once per picture). No Wolfram Language head of this name (Mathematica
 * clips the whole picture to its PlotRange); it lets one part end at the frame while others do not. The id names an
 * SVG element of the page: give each picture's Clip its own id.
 */
export const Clip = (g, range, id) => prim('Clip', { g, range, id });
/**
 * ArrayPlot[m, opts] as data: a matrix of values drawn as cells, row 1 at the TOP (as Mathematica's ArrayPlot), over
 * DataRange (default {{0, columns}, {0, rows}}). Colours: ColorRules [[value, colour], …] (exact matches first), then
 * ColorFunction (v) → colour (RGBColor or [r, g, b] in 0…1); the default is Mathematica's 0 → white … 1 → black (and
 * True → black, False → white). The image is made once per matrix object (keep the matrix while its values are the
 * same — e.g. with wl.js cacheLast — and an evaluation does not re-encode it).
 */
const arrayImages = new WeakMap();
export function ArrayPlot(m, { DataRange, ColorRules = [], ColorFunction } = {}) {
  const rows = m.length, cols = rows ? m[0].length : 0;
  let image = arrayImages.get(m);
  if (!image) {
    const rgbOf = (v) => {
      const rule = ColorRules.find(([w]) => w === v);
      const c = rule ? rule[1] : ColorFunction ? ColorFunction(v) : typeof v === 'boolean' ? (v ? NAMED.Black : NAMED.White) : [1 - v, 1 - v, 1 - v];
      return c.rgb ?? c;
    };
    const data = new Uint8ClampedArray(rows * cols * 4);
    m.forEach((row, i) => row.forEach((v, j) => {
      const [r, g, b] = rgbOf(v), k = 4 * (i * cols + j);
      data[k] = 255 * r; data[k + 1] = 255 * g; data[k + 2] = 255 * b; data[k + 3] = 255;
    }));
    image = { width: cols, height: rows, data };
    arrayImages.set(m, image);
  }
  const [[x0, x1], [y0, y1]] = DataRange ?? [[0, cols], [0, rows]];
  return ImageRaster(image, [[x0, y0], [x1, y1]]);
}
/** Annotation[g, id, attrs]: data-testid and further attributes for the element drawn for g. */
export const Annotation = (g, id, attrs = {}) => prim('Annotation', { g, id, attrs });

/**
 * Ellipsoid[c, Σ] in 2D (v0.1.23): the ellipse {x : (x − c)·Σ⁻¹·(x − c) ≤ 1} of a symmetric positive (semi)definite
 * 2 × 2 matrix Σ — a rotated Disk (filled and edged with the style in effect, as Mathematica's Ellipsoid).
 */
export function Ellipsoid(c, [[a, b], [, d]]) {
  const m = (a + d) / 2, r = Math.hypot((a - d) / 2, b);
  const l1 = Math.max(0, m + r), l2 = Math.max(0, m - r);
  const angle = b === 0 ? (a >= d ? 0 : Math.PI / 2) : Math.atan2(l1 - a, b);
  return Rotate(Disk(c, [Math.sqrt(l1), Math.sqrt(l2)]), angle, c);
}

/**
 * scaleGraphics(g, [sx, sy]): the picture with every coordinate x, y replaced by x·sx, y·sy (v0.1.23) — what
 * Mathematica does to a Graphics whose AspectRatio differs from its plot range's: positions move, Disk and Circle
 * become ellipses, Rotate and Rectangle are applied before the scaling (a rotated part keeps its shape in data units);
 * Point sizes, thicknesses, arrowheads and text stay in pixels. Pure. Raw parts are left as they are.
 */
export function scaleGraphics(g, [sx, sy]) {
  if (sx === 1 && sy === 1) return g;
  const tr = (list, f, k) => mapList(list, f, k);
  // f: data point → world point; k: [kx, ky] radius scales (rotation ignored for radii)
  function mapList(list, f, k) {
    if (list == null || list === false || list === 0 || list === '') return list;
    if (list.head === 'Graphics') return { ...list, list: mapList(list.list, f, k) };
    if (Array.isArray(list)) return list.map((x) => mapList(x, f, k));
    if (list.dir || !list.head) return list;
    return mapPrim(list, f, k);
  }
  const P = (pts, f) => (isMulti(pts) ? pts.map((q) => q.map(f)) : pts.map(f));
  const R = (r, k) => (Array.isArray(r) ? [r[0] * k[0], r[1] * k[1]] : [r * k[0], r * k[1]]);
  function mapPrim(q, f, k) {
    switch (q.head) {
      case 'Line': case 'Polygon': case 'Arrow': return prim(q.head, { ...q, pts: P(q.pts, f) });
      case 'Point': return prim('Point', { pts: q.pts.map(f) });
      case 'Disk': case 'Circle': {
        if (q.head === 'Disk' && q.angles) return prim('Polygon', { pts: sectorPoints(q.c, q.r, q.angles, f) });
        if (f === base) return q.head === 'Disk' ? prim('Disk', { c: f(q.c), r: R(q.r, k) }) : prim('Circle', { c: f(q.c), r: R(q.r, k), angles: q.angles });
        // inside Rotate/Translate: the (rotated) ellipse as a sampled outline mapped point by point
        const [rx, ry] = Array.isArray(q.r) ? q.r : [q.r, q.r], [a0, a1] = q.angles ?? [0, 2 * Math.PI];
        const pts = Array.from({ length: 97 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / 96; return f([q.c[0] + rx * Math.cos(t), q.c[1] + ry * Math.sin(t)]); });
        return q.head === 'Disk' ? prim('Polygon', { pts: pts.slice(0, -1) }) : prim('Line', { pts });
      }
      case 'Rectangle': {
        const [[a, b], [c, d]] = [q.a, q.b];
        if (f === base && !q.r) { const p0 = f([a, b]), p1 = f([c, d]); return prim('Rectangle', { a: p0, b: p1, r: 0 }); }
        return prim('Polygon', { pts: [[a, b], [c, b], [c, d], [a, d]].map(f) });
      }
      case 'Text': return prim('Text', { ...q, pos: f(q.pos) });
      case 'Inset': return prim('Inset', { ...q, pos: f(q.pos) });
      case 'ImageRaster': return prim('ImageRaster', { ...q, box: q.box.map(f) });
      case 'Clip': { const [[x0, x1], [y0, y1]] = q.range; const a = f([x0, y0]), b = f([x1, y1]); return prim('Clip', { ...q, g: tr(q.g, f, k), range: [[a[0], b[0]], [a[1], b[1]]] }); }
      case 'Annotation': case 'Tooltip': return prim(q.head, { ...q, g: tr(q.g, f, k) });
      case 'Cached': return tr(q.thunk(), f, k);
      case 'Translate': return tr(q.g, (p) => f([p[0] + q.v[0], p[1] + q.v[1]]), k);
      case 'Rotate': {
        const c = Math.cos(q.angle), s = Math.sin(q.angle), [ax, ay] = q.about;
        return tr(q.g, (p) => f([ax + c * (p[0] - ax) - s * (p[1] - ay), ay + s * (p[0] - ax) + c * (p[1] - ay)]), k);
      }
      default: return q; // Raw and other parts without coordinates: unchanged
    }
  }
  const base = ([x, y]) => [x * sx, y * sy];
  return mapList(g, base, [sx, sy]);
}

// ---- text expressions ----------------------------------------------------------------------------------------------
/** Style[expr, directives…] — Italic, Bold, a colour, FontSize[n], or an options object {FontSize, FontFamily}. */
/** Named font sizes (pixels at the picture's ImageSize): Medium = 12 as measured in the ports (distance-norms); Tiny, Small
 * and Large are approximations of Mathematica's front-end sizes. */
export const FONT_SIZES = Object.freeze({ Tiny: 7, Small: 9, Medium: 12, Large: 16 });
const fontSizeOf = (v) => (typeof v === 'string' ? (Object.hasOwn(FONT_SIZES, v) ? FONT_SIZES[v] : 12) : v);
export function Style(expr, ...opts) {
  const ds = opts.flatMap((o) => (typeof o === 'number' || (typeof o === 'string' && Object.hasOwn(FONT_SIZES, o)) ? [FontSize(fontSizeOf(o))] // Style[expr, 14] or Style[expr, "Medium"]
    : o?.dir ? [o] : Object.entries(o).map(([k, v]) => ({ FontSize, FontFamily, ScriptSizeMultipliers, ScriptBaselineShifts })[k]?.(v)).filter(Boolean)));
  return Object.freeze({ head: 'Style', expr, ds });
}
/** Subscript[a, b]. */
export const Subscript = (a, b) => Object.freeze({ head: 'Subscript', a, b });
/** Superscript[a, b]. */
export const Superscript = (a, b) => Object.freeze({ head: 'Superscript', a, b });
/**
 * Row[{e1, e2, …}]: text pieces side by side (strings, Style, Subscript, Superscript); in a Manipulate's control list,
 * controls side by side (opts: { name } gives the group the test id row-<name>, { class } a CSS class).
 */
export const Row = (items, opts = {}) => Object.freeze({ head: 'Row', items, opts });
/**
 * Column[{line1, line2, …}] as the text of a Text: several lines, centred as a block on the text position (each line
 * 1.2 em below the last; the first moved up by 0.6 em per extra line).
 */
export const Column = (items) => Object.freeze({ head: 'Column', items });

/** Plain text of a text expression (for labels and accessibility): Subscript['θ', 1] → "θ1". */
export function textOf(e, { sep = '' } = {}) {
  if (e == null) return '';
  if (typeof e !== 'object') return String(e);
  if (e.head === 'Style') return textOf(e.expr, { sep });
  if (e.head === 'Subscript' || e.head === 'Superscript') return textOf(e.a, { sep }) + sep + textOf(e.b, { sep });
  if (e.head === 'Row') return e.items.map((x) => textOf(x, { sep })).join('');
  if (e.head === 'Column') return e.items.map((x) => textOf(x, { sep })).join('\n');
  return '';
}

/** HTML of a text expression, for control labels: Style('Q', Italic) → "<i>Q</i>". */
export function htmlOf(e) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (e == null) return '';
  if (typeof e !== 'object') return esc(e);
  if (e.head === 'Subscript') return `${htmlOf(e.a)}<sub>${htmlOf(e.b)}</sub>`;
  if (e.head === 'Superscript') return `${htmlOf(e.a)}<sup>${htmlOf(e.b)}</sup>`;
  if (e.head === 'Row') return e.items.map(htmlOf).join('');
  if (e.head === 'Column') return e.items.map(htmlOf).join('<br>');
  if (e.head === 'Style') {
    let h = htmlOf(e.expr);
    for (const d of e.ds) {
      if (d.dir === 'fontSlant') h = `<i>${h}</i>`;
      else if (d.dir === 'fontWeight') h = `<b>${h}</b>`;
      else if (d.dir === 'color') h = `<span style="color:${css(d.rgb)}">${h}</span>`;
    }
    return h;
  }
  return '';
}

// ---- Graphics ------------------------------------------------------------------------------------------------------
/** Graphics[list, options]: options PlotRange, ImageSize, PlotRangePadding (fraction, default 0.02). */
export const Graphics = (list, options = {}) => Object.freeze({ head: 'Graphics', list, options });

/**
 * The style in effect at the start of a picture (Mathematica's defaults for 2D Graphics, as svg-plot draws them; the
 * default point size 0.008 of the width is the approximation measured for the ports, D-RM-05).
 */
export const DEFAULT_STYLE = Object.freeze({
  color: NAMED.Black, opacity: undefined, thickness: undefined, dash: undefined, cap: undefined, pointSize: 0.008,
  arrowheads: 0.02, edge: null, face: undefined, fontSize: 12, fontFamily: undefined, fontSlant: undefined, fontWeight: undefined,
});

/** Apply one directive to a style (returns a new style). Pure. */
export function applyDirective(style, d) {
  switch (d.dir) {
    case 'color': return { ...style, color: d.rgb };
    case 'none': return style;
    case 'directive': return d.value.reduce(applyDirective, style);
    case 'edge': {
      if (d.value === null) return { ...style, edge: null };
      const e = d.value.reduce((s, x) => applyDirective(s, x), { color: NAMED.Black, thickness: { abs: 1 }, opacity: undefined, dash: undefined });
      return { ...style, edge: { color: e.color, thickness: e.thickness, opacity: e.opacity, dash: e.dash } };
    }
    case 'face': return { ...style, face: d.value ? d.value.rgb : null }; // null = no fill
    default: return { ...style, [d.dir]: d.value };
  }
}

/**
 * Walk a graphics list in drawing order: calls visit(primitive, style) for every primitive with the style in effect
 * there. Pure (the renderer and the unit tests both use it).
 */
export function walk(list, visit, style = DEFAULT_STYLE) {
  let st = style;
  for (const item of list) {
    if (item == null || item === false || item === 0 || item === '') continue; // what a failed `cond && x` leaves
    if (Array.isArray(item)) walk(item, visit, st);
    else if (item.dir) st = applyDirective(st, item);
    else if (item.head) visit(item, st);
    else throw new Error(`graphics: not a primitive or directive: ${JSON.stringify(item)}`);
  }
}

// ---- querying a picture (pure: tests and models read the drawn numbers from the Graphics data) -----------------------
const INNER = { Annotation: (q) => q.g, Tooltip: (q) => q.g, Clip: (q) => q.g, Rotate: (q) => q.g, Translate: (q) => q.g, Cached: (q) => q.thunk() };
/** visit(primitive, style) for every primitive, also inside Annotation, Tooltip, Rotate, Translate and cachedGraphics
 * parts (coordinates as written, before Rotate/Translate — as Mathematica's Cases sees them). */
function descend(graphics, visit, style = DEFAULT_STYLE) {
  const list = graphics?.head === 'Graphics' ? graphics.list : graphics;
  walk(Array.isArray(list) ? list : [list], (q, st) => {
    visit(q, st);
    const inner = INNER[q.head]?.(q);
    if (inner != null) descend(inner, visit, st);
  }, style);
}
/**
 * Cases[g, pattern]: the primitives of a picture with this head ('Line', 'Disk', …) or for which pattern(prim, style)
 * is true, in drawing order (searched inside Annotation, Tooltip, Rotate, Translate and cached parts).
 */
export function Cases(graphics, pattern) {
  const test = typeof pattern === 'function' ? pattern : (q) => q.head === pattern;
  const out = [];
  descend(graphics, (q, st) => { if (test(q, st)) out.push(q); });
  return out;
}
/** All Annotation[g, id, attrs] parts in drawing order: [{ id, g, attrs, style }] (style = the directives in effect). */
export function annotations(graphics) {
  const out = [];
  descend(graphics, (q, st) => { if (q.head === 'Annotation') out.push({ id: q.id, g: q.g, attrs: q.attrs, style: st }); });
  return out;
}
/** The first Annotation with this id: { id, g, attrs, style }, or null. */
export const annotation = (graphics, id) => annotations(graphics).find((a) => a.id === id) ?? null;

// ---- drawing (browser) ---------------------------------------------------------------------------------------------
const deg = (a) => (a * 180) / Math.PI;
const rasterCache = new WeakMap(); // image object → { href, nodes: Map(box key → <image>) } (encoded once)

function rasterNode(image, box) {
  let entry = rasterCache.get(image);
  if (!entry) { entry = { href: encode(image), nodes: new Map() }; rasterCache.set(image, entry); }
  const key = JSON.stringify(box);
  let node = entry.nodes.get(key);
  if (node && !node.isConnected) { // reuse the decoded element from the previous redraw
    for (const a of [...node.attributes]) if (a.name.startsWith('data-') && a.name !== 'data-width' && a.name !== 'data-height') node.removeAttribute(a.name);
    return node;
  }
  node = imageNode(entry.href, image, box);
  if (!entry.nodes.has(key)) entry.nodes.set(key, node);
  return node;
}

function encode(image) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, image.width);
  canvas.height = Math.max(1, image.height);
  if (image.width && image.height) canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  return canvas.toDataURL('image/png');
}

function imageNode(href, image, [[x0, y0], [x1, y1]]) {
  const w = x1 - x0, h = y1 - y0;
  // the world is flipped (y up): an inner scale(1,-1) puts the picture upright with its top edge at y1
  const node = svgNode('image', {
    href, x: x0, y: -(y0 + h), width: w, height: h, preserveAspectRatio: 'none',
    transform: 'scale(1,-1)', style: 'image-rendering:pixelated;image-rendering:crisp-edges',
    'data-width': image.width, 'data-height': image.height,
  });
  node.style.imageRendering = 'pixelated';
  return node;
}

/**
 * Draw a graphics list (or a Graphics[…]) into group `g` of an svg-plot picture `plot`. Returns the elements drawn
 * for the top-level primitives (in order).
 */
export function render(plot, g, graphics, style = DEFAULT_STYLE) {
  const list = graphics?.head === 'Graphics' ? graphics.list : graphics;
  const out = [];
  walk(list, (p, st) => { const n = draw(plot, g, p, st); if (n) out.push(n); }, style);
  return out;
}

const fillOf = (st) => (st.face === undefined ? st.color : st.face);
function edgePaint(st) {
  return st.edge ? { stroke: st.edge.color, thickness: st.edge.thickness, strokeOpacity: st.edge.opacity, dash: st.edge.dash } : {};
}

function textNode(plot, g, expr, pos, anchor, st, baseline) {
  let s = st;
  let e = expr;
  while (e && e.head === 'Style') { s = e.ds.reduce(applyDirective, s); e = e.expr; }
  const scripted = e && ['Subscript', 'Superscript', 'Row', 'Column'].includes(e.head);
  const t = plot.text(g, scripted ? '' : textOf(e), pos, {
    fontPx: s.fontSize, color: s.color, anchor, italic: s.fontSlant === 'italic', weight: s.fontWeight, family: s.fontFamily,
  });
  if (baseline) t.setAttribute('dominant-baseline', baseline);
  if (s.opacity !== undefined && s.opacity < 1) t.setAttribute('opacity', s.opacity); // v0.1.24: Opacity applies to text (Mathematica)
  if (e?.head === 'Column') {
    const n = e.items.length;
    e.items.forEach((line, i) => {
      const span = svgNode('tspan', { x: 0, dy: i === 0 ? `${-(n - 1) * 0.6}em` : '1.2em' });
      t.append(span);
      appendPieces(plot, span, line, s.fontSize, s);
    });
  } else if (scripted) appendPieces(plot, t, e, s.fontSize, s);
  return t;
}

// The pieces of Subscript / Superscript / Row as text and <tspan>s (a script is 72 % high, 28 % down or 40 % up).
// Returns the baseline shift left behind (world units); a Row undoes it before its next piece.
const scriptLength = (v, fontPx, u) => (typeof v === 'string' ? v : v?.abs !== undefined ? v.abs * u : fontPx * v * u);
function appendPieces(plot, t, e, fontPx, st = DEFAULT_STYLE) {
  const u = plot.unitsPerPx;
  if (e && e.head === 'Row') {
    let shift = 0;
    for (const x of e.items) {
      // undo a script's shift: dy on a tspan that holds the next piece (dy on an empty tspan is ignored by SVG)
      let into = t;
      if (shift) { into = svgNode('tspan', { dy: -shift }); t.append(into); }
      const s2 = appendPieces(plot, into, x, fontPx, st);
      shift = s2;
    }
    return shift;
  }
  if (e && (e.head === 'Subscript' || e.head === 'Superscript')) {
    appendPieces(plot, t, e.a, fontPx, st);
    const sub = e.head === 'Subscript';
    const shift = st.scriptShift?.[sub ? 0 : 1];
    const dy = shift === undefined ? fontPx * (sub ? 0.28 : -0.4) * u
      : typeof shift === 'string' ? (sub ? shift : `-${shift}`) : (sub ? 1 : -1) * scriptLength(shift, fontPx, u);
    const size = st.scriptSize === undefined ? fontPx * 0.72 * u : scriptLength(st.scriptSize, fontPx, u);
    const span = svgNode('tspan', { 'font-size': size, dy });
    span.textContent = textOf(e.b);
    t.append(span);
    return typeof dy === 'number' ? dy : 0; // a relative (em) shift is not undone by a Row
  }
  if (e && e.head === 'Style') {
    const span = svgNode('tspan', { 'font-style': e.ds.some((d) => d.dir === 'fontSlant') ? 'italic' : undefined });
    span.textContent = textOf(e.expr);
    t.append(span);
    return 0;
  }
  t.append(document.createTextNode(textOf(e)));
  return 0;
}

function draw(plot, g, p, st) {
  const opacity = st.opacity;
  switch (p.head) {
    case 'Line': {
      const paint = { stroke: st.color, thickness: st.thickness, dash: st.dash, cap: st.cap, opacity };
      if (!isMulti(p.pts)) return plot.line(g, p.pts, paint);
      const grp = plot.group(g); // Line[{{p1, p2}, {p3, p4}}]: several lines
      for (const q of p.pts) plot.line(grp, q, paint);
      return grp;
    }
    case 'Polygon': {
      const paint = { fill: fillOf(st), fillOpacity: opacity, ...edgePaint(st) };
      if (!isMulti(p.pts)) return plot.polygon(g, p.pts, paint);
      const grp = plot.group(g); // Polygon[{poly1, poly2, …}]: several polygons
      for (const q of p.pts) plot.polygon(grp, q, paint);
      return grp;
    }
    case 'Disk': {
      if (p.angles) return plot.polygon(g, sectorPoints(p.c, p.r, p.angles), { fill: fillOf(st), fillOpacity: opacity, ...edgePaint(st) }); // a sector
      if (!Array.isArray(p.r)) return plot.disk(g, p.c, p.r, { fill: fillOf(st), fillOpacity: opacity, ...edgePaint(st) });
      const e = st.edge, f = fillOf(st); // Disk[c, {rx, ry}]: an ellipse
      return g.appendChild(svgNode('ellipse', {
        cx: p.c[0], cy: p.c[1], rx: p.r[0], ry: p.r[1], fill: f ? css(f) : 'none', 'fill-opacity': opacity,
        stroke: e ? css(e.color) : 'none', 'stroke-width': e ? plot.strokeWidth(e.thickness) : undefined, 'stroke-opacity': e?.opacity,
      }));
    }
    case 'Rectangle': {
      const [[a, b], [c, d]] = [p.a, p.b];
      const e = st.edge;
      return g.appendChild(svgNode('rect', {
        x: Math.min(a, c), y: Math.min(b, d), width: Math.abs(c - a), height: Math.abs(d - b), rx: p.r || undefined, ry: p.r || undefined,
        fill: fillOf(st) ? css(fillOf(st)) : 'none', 'fill-opacity': opacity,
        stroke: e ? css(e.color) : undefined, 'stroke-width': e ? plot.strokeWidth(e.thickness) : undefined, 'stroke-opacity': e?.opacity,
      }));
    }
    case 'Circle':
      if (Array.isArray(p.r)) { // Circle[c, {rx, ry}] (and arcs of it): an elliptic outline
        const [a0, a1] = p.angles ?? [0, 2 * Math.PI], n = Math.max(8, Math.ceil((Math.abs(a1 - a0) / (2 * Math.PI)) * 96));
        const pts = Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return [p.c[0] + p.r[0] * Math.cos(t), p.c[1] + p.r[1] * Math.sin(t)]; });
        return plot.line(g, pts, { stroke: st.color, thickness: st.thickness, dash: st.dash, cap: st.cap, opacity });
      }
      if (p.angles) return plot.arc(g, p.c, p.r, p.angles[0], p.angles[1], { stroke: st.color, thickness: st.thickness, dash: st.dash, cap: st.cap, opacity });
      return g.appendChild(svgNode('circle', {
        cx: p.c[0], cy: p.c[1], r: p.r, fill: 'none', stroke: css(st.color), 'stroke-opacity': opacity,
        'stroke-width': plot.strokeWidth(st.thickness),
        'stroke-dasharray': st.dash ? st.dash.map((d) => d * plot.unitsPerPx).join(' ') : undefined,
        'stroke-linejoin': st.dash || st.cap ? 'round' : undefined, 'stroke-linecap': st.dash || st.cap ? st.cap ?? 'round' : undefined,
      }));
    case 'Point': {
      // v0.1.24: Opacity applies to points (Mathematica)
      const faded = (n) => { if (opacity !== undefined && opacity < 1) n.setAttribute('opacity', opacity); return n; };
      if (p.pts.length === 1) return faded(plot.point(g, p.pts[0], st.pointSize, st.color));
      const grp = plot.group(g);
      for (const q of p.pts) plot.point(grp, q, st.pointSize, st.color);
      return faded(grp);
    }
    case 'Arrow': {
      const grp = plot.group(g);
      plot.line(grp, p.pts, { stroke: st.color, thickness: st.thickness, dash: st.dash, opacity });
      const n = p.pts.length;
      const [tx, ty] = p.pts[n - 1], [px, py] = p.pts[n - 2];
      const len = Math.hypot(tx - px, ty - py) || 1;
      const ux = (tx - px) / len, uy = (ty - py) / len;
      const W = plot.plotRange[0][1] - plot.plotRange[0][0];
      const head = (tx2, ty2, ux2, uy2, s) => {
        const bx = tx2 - s * ux2, by = ty2 - s * uy2, hw = 0.3 * s;
        plot.polygon(grp, [[tx2, ty2], [bx - hw * uy2, by + hw * ux2], [bx + hw * uy2, by - hw * ux2]], { fill: st.color, fillOpacity: opacity });
      };
      if (!Array.isArray(st.arrowheads)) { head(tx, ty, ux, uy, st.arrowheads * W); return grp; }
      // v0.1.23: Arrowheads[{s1, s2, …}]: heads spread along the arrow; a negative size points backwards (at the start)
      const [sx0, sy0] = p.pts[0], [qx, qy] = p.pts[1];
      const l0 = Math.hypot(qx - sx0, qy - sy0) || 1, vx = (qx - sx0) / l0, vy = (qy - sy0) / l0;
      st.arrowheads.forEach((a, i, all) => {
        const at = all.length === 1 ? 1 : i / (all.length - 1);
        if (at === 0) head(sx0, sy0, a < 0 ? -vx : vx, a < 0 ? -vy : vy, Math.abs(a) * W);
        else if (at === 1) head(tx, ty, a < 0 ? -ux : ux, a < 0 ? -uy : uy, Math.abs(a) * W);
      });
      return grp;
    }
    case 'Text':
      return textNode(plot, g, p.expr, p.pos, p.anchor, st, p.baseline);
    case 'Tooltip': {
      let n;
      if (Array.isArray(p.g)) { n = plot.group(g); walk(p.g, (q, s2) => draw(plot, n, q, s2), st); } else n = draw(plot, g, p.g, st);
      const title = svgNode('title');
      title.textContent = textOf(p.label);
      n.append(title);
      return n;
    }
    case 'Cached': {
      const key = plot.svg ?? plot;
      const last = p.slot.byPlot.get(key);
      const same = last && last.keys.length === p.keys.length && last.keys.every((k, i) => k === p.keys[i]);
      if (same && !last.node.isConnected) return g.appendChild(last.node);
      const grp = plot.group(g);
      walk([p.thunk()], (q, s2) => draw(plot, grp, q, s2), st);
      p.slot.byPlot.set(key, { keys: p.keys, node: grp });
      return grp;
    }
    case 'Rotate':
    case 'Translate': {
      const transform = p.head === 'Rotate' ? `rotate(${deg(p.angle)} ${p.about[0]} ${p.about[1]})` : `translate(${p.v[0]},${p.v[1]})`;
      // a plain shape takes the transform itself; anything that may carry its own transform gets a group
      const single = !Array.isArray(p.g) && ['Line', 'Polygon', 'Disk', 'Rectangle', 'Circle'].includes(p.g.head) && !isMulti(p.g.pts ?? []);
      if (single) { const n = draw(plot, g, p.g, st); n.setAttribute('transform', transform); return n; }
      const grp = plot.group(g, { transform });
      walk(Array.isArray(p.g) ? p.g : [p.g], (q, s) => draw(plot, grp, q, s), st);
      return grp;
    }
    case 'Inset': {
      // a Graphics with its own PlotRange and ImageSize (px), centred at pos: world = pos + k·(inner − centre)
      const { list, options } = p.graphics;
      const [[x0, x1], [y0, y1]] = options.PlotRange;
      const size = Array.isArray(options.ImageSize) ? options.ImageSize[0] : options.ImageSize;
      const k = (size * plot.unitsPerPx) / (x1 - x0); // ImageSize sets the width; the inset keeps its aspect ratio
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const outer = plot.group(g, { transform: `translate(${p.pos[0]},${p.pos[1]})` });
      const inner = plot.group(outer, { transform: `scale(${k}) translate(${-cx},${-cy})` });
      // inside, absolute sizes must stay absolute: draw with a plot whose pixels are 1/k as large
      const sub = { ...plot, unitsPerPx: plot.unitsPerPx / k, strokeWidth: (t) => plot.strokeWidth(t) / k };
      walk(list, (q, s) => drawInset(sub, inner, q, s), st);
      return outer;
    }
    case 'ImageRaster':
      return g.appendChild(rasterNode(p.image, p.box));
    case 'Clip': {
      const [[x0, x1], [y0, y1]] = p.range;
      const rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      const old = plot.svg.querySelector(`#${p.id} > rect`);
      if (!old) {
        const cp = svgNode('clipPath', { id: p.id, clipPathUnits: 'userSpaceOnUse' });
        cp.append(svgNode('rect', rect));
        let defs = plot.svg.querySelector('defs');
        if (!defs) { defs = svgNode('defs'); plot.svg.prepend(defs); }
        defs.append(cp);
      } else for (const [k, v] of Object.entries(rect)) if (old.getAttribute(k) !== String(v)) old.setAttribute(k, v); // range changed
      const grp = plot.group(g, { 'clip-path': `url(#${p.id})` });
      walk(Array.isArray(p.g) ? p.g : [p.g], (q, s2) => draw(plot, grp, q, s2), st);
      return grp;
    }
    case 'Raw':
      return p.fn(plot, g);
    case 'Annotation': {
      let n;
      if (Array.isArray(p.g)) { n = plot.group(g); walk(p.g, (q, s) => draw(plot, n, q, s), st); } else n = draw(plot, g, p.g, st);
      if (n) {
        n.setAttribute('data-testid', p.id);
        for (const [k, v] of Object.entries(p.attrs)) n.setAttribute(k, String(v));
      }
      return n;
    }
    default:
      throw new Error(`graphics: unknown primitive ${p.head}`);
  }
}

// Inset content: lines and circles drawn with the inner pixel size (strokes in absolute px of the outer picture).
function drawInset(sub, g, p, st) {
  if (p.head === 'Line') {
    const segs = Array.isArray(p.pts[0][0]) ? p.pts : [p.pts];
    for (const s of segs) {
      for (let i = 0; i + 1 < s.length; i++) {
        g.appendChild(svgNode('line', {
          x1: s[i][0], y1: s[i][1], x2: s[i + 1][0], y2: s[i + 1][1], stroke: css(st.color), 'stroke-opacity': st.opacity,
          'stroke-width': sub.strokeWidth(st.thickness),
        }));
      }
    }
    return null;
  }
  if (p.head === 'Circle' && !p.angles) return draw(sub, g, p, st);
  throw new Error(`graphics: Inset content supports Line and Circle so far, not ${p.head}`);
}
