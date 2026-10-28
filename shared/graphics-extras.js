// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/graphics-extras.js — picture parts as shared/graphics.js data that the Manipulate layer does not offer as
// options (yet). Generic (no code of a Demonstration): moved to shared/ under MIT in v0.1.21 (owner decisions D1, D4)
// from demos/common/plot-extras.js and demos/common/arrow-graphics.js (v0.1.20), unchanged. Each one draws exactly the
// elements the ports drew before by hand (same pixels):
//   plotUnitsPerPx / pxSize(PlotRange, ImageSize, PlotRangePadding)  world units per pixel (shared/svg-plot.js createPlot)
//   axesGraphics(opts)            Axes through the origin: shared/svg-frame.js axesPrimitives as data, grouped and styled
//                                 as its drawAxes draws them (groups axis-x, axis-y)
//   locatorGlyph(unitsPerPx)      Mathematica's default locator glyph (shared/svg-plot.js locatorGlyph) as data, centred
//                                 at the origin (for Graphics[{Locator[p]}] drawn as a picture, not dragged)
//   notchedArrowhead(tip, dir, len, half)  an approximation of Mathematica's default arrowhead (a triangle notched at
//                                 0.72 of its length): { head: Polygon, notch } — the shaft is drawn up to `notch`
//   arrowheadPolygon(tip, dir, L, widthRatio = 0.3)  a plain filled triangle arrowhead (Arrowheads[s] as the dials draw it)
//   arcArrowGraphics(data, opts)  an arc/curve arrow given as { kind, … } (demos/common/arrow-arcs.js results) as data
// (v0.1.21: the Raw helpers clipped and tspanText were removed; shared/graphics.js Clip, Column text and the
// ScriptSizeMultipliers / ScriptBaselineShifts directives draw the same elements as data.)
// v0.1.26: the Graphics option LabelStyle (tick labels, frame and axes labels, plot label) and insetLayout(graphics, pos,
// unitsPerPx) — the layout and decorations of an Inset of a framed plot, registered with shared/graphics.js when this
// file loads (graphics.js cannot import this file: it is imported by it).
// Pure data constructors.
import {
  Annotation, Line, Disk, Polygon, Text, Style, RGBColor, GrayLevel, White, Black, Opacity, EdgeForm, Directive,
  AbsoluteThickness, CapForm, FontSize, Italic, Point, Rotate, Column, AbsoluteDashing, textOf, setInsetLayout,
  Graphics, Inset, bounds,
} from './graphics.js';
import { axesPrimitives, framePrimitives, frameLayout } from './svg-frame.js';

import { plotUnitsPerPx } from './svg-plot.js';
/** World units per nominal pixel of a picture with this PlotRange, ImageSize and PlotRangePadding (createPlot's arithmetic). */
export { plotUnitsPerPx };
export const pxSize = plotUnitsPerPx;

const GRAY = [0.4, 0.4, 0.4];
/**
 * LabelStyle -> spec (v0.1.26) as a list of directives for label texts: a colour, Bold, Italic, FontSize[n] or a number
 * (the font size), Directive[…], a list of these, or None.
 */
export function labelDirectives(ls) {
  if (ls == null || ls === 'None' || ls?.dir === 'none') return [];
  if (typeof ls === 'number' || typeof ls === 'string') return [FontSize(ls)];
  if (Array.isArray(ls)) return ls.flatMap(labelDirectives);
  if (ls.dir === 'directive') return ls.value.flatMap(labelDirectives);
  return ls.dir ? [ls] : [];
}
/** opts: those of svg-frame.js drawAxes (range, majorStep, minorStep, axesLabel, fontPx, color, labelColor, thicknessPx,
 * axesLabelStyle {italic, color}, …), unitsPerPx and labelStyle (v0.1.26: directives for the tick labels and labels). */
export function axesGraphics(opts) {
  const { lines, texts } = axesPrimitives(opts);
  const st = opts.axesLabelStyle ?? {};
  const labelStyle = [st.italic && Italic, st.color && RGBColor(...st.color)].filter(Boolean);
  const axis = (a) => Annotation([
    RGBColor(...(opts.color ?? GRAY)), AbsoluteThickness(opts.thicknessPx ?? 0.5), CapForm('Butt'),
    ...lines.filter((l) => l.role.endsWith(a)).map((l) => Line(l.pts)),
    RGBColor(...(opts.labelColor ?? GRAY)), FontSize(opts.fontPx ?? 11), ...(opts.labelStyle ?? []),
    ...texts.filter((t) => t.role.endsWith(a))
      .map((t) => Text(t.role.startsWith('axes-label') ? Style(t.str, ...labelStyle) : t.str, t.pos, { anchor: t.anchor })),
  ], `axis-${a}`);
  return [axis('x'), axis('y')];
}

// ---- Graphics options Axes, Frame, Ticks, AxesLabel, FrameLabel, PlotLabel (used by shared/manipulate.js) --------
// Mathematica's names and forms: Axes -> True | {True, False}; AxesOrigin -> {x, y}; Ticks / FrameTicks -> Automatic |
// None | {xspec, yspec} with a spec = Automatic, None, a step (number: major ticks every step, minor every step/5) or
// a list of positions; AxesLabel -> {x, y}; Frame -> True; FrameLabel -> {bottom, left}; PlotLabel -> text;
// LabelStyle -> {FontSize, colour…} (v0.1.26: directives for the tick labels, the axes and frame labels and the plot
// label; frame and axis lines keep their grey). Text may be strings or Style/Subscript/Row.
const hasDecor = (o) => !!(o && (o.Axes || o.Frame || o.PlotLabel != null || o.PlotLegends || o.ImagePadding));
// Frame -> True or {bottom, left, top, right} (v0.1.23: sides with False are not drawn)
const frameSides = (f) => (Array.isArray(f) ? ['bottom', 'left', 'top', 'right'].filter((_, i) => f[i]) : undefined);
// a string with line breaks is a Column of lines (Mathematica draws "a\nb" on two lines)
const lines2 = (t) => (typeof t === 'string' && t.includes('\n') ? Column(t.split('\n')) : t);
// PlotLegends (v0.1.23): { items: [{ label, color, dash, thicknessPx, filled }], position: 'right' | [sx, sy] (Placed,
// scaled coordinates inside the plot) } — made by shared/plot.js from PlotStyle; drawn as data
const LEGEND = { rowPx: 18, swatchPx: 22, gapPx: 6, fontPx: 12 };
// a legend label may be a small picture (PlotLegends -> {Graphics[…, ImageSize -> 15], …}, v0.1.27): drawn as an icon
const isPicture = (l) => !!l && l.head === 'Graphics';
const iconPx = (l) => { const s = l.options?.ImageSize; return Array.isArray(s) ? s[0] : typeof s === 'number' ? s : 15; };
const labelPx = (l) => (isPicture(l) ? iconPx(l) : 6.6 * Math.max(...textOf(l).split('\n').map((x) => x.length)));
const legendWidthPx = (lg) => LEGEND.swatchPx + LEGEND.gapPx + Math.max(0, ...lg.items.map((it) => labelPx(it.label))) + 8;
/** The picture of a legend label as an Inset's Graphics: Mathematica's automatic PlotRange (the bounds, 2 % padding). */
function iconGraphics(l) {
  if (l.options?.PlotRange) return Graphics(l.list, { ...l.options, ImageSize: iconPx(l) });
  const [[x0, y0], [x1, y1]] = bounds(l.list);
  const s = Math.max(x1 - x0, y1 - y0) || 1, px = s * 0.02, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return Graphics(l.list, { ...l.options, ImageSize: iconPx(l), PlotRange: [[cx - s / 2 - px, cx + s / 2 + px], [cy - s / 2 - px, cy + s / 2 + px]] });
}
const legendOutside = (lg) => lg && lg.items?.length && !Array.isArray(lg.position);
/** px a legend outside the plot adds to the image (Mathematica puts it beside the ImageSize, not inside). */
export const legendExtraPx = (o) => (legendOutside(o?.PlotLegends) ? legendWidthPx(o.PlotLegends) + 10 : 0);
const tickOpt = (spec) => {
  if (spec == null || spec === 'Automatic') return undefined;
  if (spec === 'None' || spec?.dir === 'none') return { ticks: { major: [], minor: [] } };
  if (typeof spec === 'number') return { major: spec, minor: spec / 5 };
  if (Array.isArray(spec)) return { ticks: { major: spec, minor: [] } };
  return spec; // {major, minor} or {ticks}
};
const pair = (v) => (Array.isArray(v) ? v : [v, v]);
/** Margins in px (at the nominal image size) that the options need outside the plot range, or null for none. */
export function decorationMargins(o) {
  if (!hasDecor(o)) return null;
  const fl = o.FrameLabel ? pair(o.FrameLabel) : [null, null];
  const m = { left: 0, right: 0, top: 0, bottom: 0 };
  if (o.Frame) {
    const lines = (t) => (typeof t === 'string' ? t.split('\n').length : t?.head === 'Column' ? t.items.length : 1);
    m.left = 34 + (fl[1] != null ? 26 : 0); m.bottom = 18 + (fl[0] != null ? 24 + 15 * (lines(fl[0]) - 1) : 0); m.right = 10; m.top = 8;
  } else if (o.Axes && o.AxesLabel) { m.right = 26; m.top = 16; } else if (o.Axes && o.PlotLegends) { m.top = 6; }
  if (o.Axes && !o.Frame && o.PlotLegends && !o.AxesLabel) m.right = Math.max(m.right, 6);
  if (o.Axes && !o.Frame) m.left = Math.max(m.left, o.PlotLegends || o.UpdateFrame ? 30 : 0); // tick labels left of a y axis at the left edge
  if (o.Axes && !o.Frame && o.UpdateFrame) m.bottom = Math.max(m.bottom, 16);
  if (o.PlotLabel != null) m.top += 26;
  if (Array.isArray(o.ImagePadding)) { // ImagePadding -> {{left, right}, {bottom, top}} (px): exactly these margins
    const [[l, r], [b, t]] = o.ImagePadding;
    Object.assign(m, { left: l, right: r, bottom: b, top: t + (o.PlotLabel != null ? 26 : 0) });
  }
  if (legendOutside(o.PlotLegends)) m.right += legendWidthPx(o.PlotLegends) + 10;
  return m.left || m.right || m.top || m.bottom ? m : null;
}
/**
 * The decorations as Graphics data: { below, above } (axes and frame below the picture's primitives, the plot label
 * above). range = the PlotRange with its padding (the frame and the axis lines span it), plotRange = the PlotRange
 * itself (ticks; default range), visible = the drawn range (with the margins), unitsPerPx of the picture.
 */
export function plotDecorations(o, { range, plotRange = range, visible, unitsPerPx: u, scale }) {
  const below = [], above = [];
  if (!hasDecor(o)) return { below, above };
  const fontPx = 11;
  const ls = labelDirectives(o.LabelStyle); // v0.1.26: after each label's default directives (none: as before)
  // scale [sx, sy] (v0.1.23, AspectRatio): range and plotRange are in data units, the world is x·sx, y·sy
  const [sx, sy] = scale ?? [1, 1];
  const sc = scale ? { scale } : {};
  if (o.Axes && !(o.Frame && o.AxesInFrame)) {
    const [ax, ay] = pair(o.Axes);
    const [tx, ty] = o.Ticks ? pair(o.Ticks) : [undefined, undefined];
    const g = axesGraphics({ range, tickRange: plotRange, origin: o.AxesOrigin, unitsPerPx: u, x: tickOpt(tx), y: tickOpt(ty),
      axesLabel: o.AxesLabel ? pair(o.AxesLabel) : undefined, fontPx, labelStyle: ls, ...sc });
    below.push(...[ax && g[0], ay && g[1]].filter(Boolean));
  }
  if (o.Frame) {
    const [tx, ty] = o.FrameTicks ? pair(o.FrameTicks) : [undefined, undefined];
    // a plot with a Frame keeps its axes as plain lines inside the frame (v0.1.23, AxesInFrame set by shared/plot.js)
    const { lines, texts } = framePrimitives({ range, unitsPerPx: u, x: tickOpt(tx), y: tickOpt(ty), fontPx, frameSides: frameSides(o.Frame), axes: !!o.AxesInFrame, axesOrigin: o.AxesOrigin, ...sc });
    below.push(Annotation([RGBColor(...GRAY), AbsoluteThickness(0.5), CapForm('Butt'),
      ...lines.map((l) => Line(l.pts)), FontSize(fontPx), ...ls,
      ...texts.map((t) => Text(t.str, t.pos, { anchor: t.anchor }))], 'frame'));
    const [bottom, left] = o.FrameLabel ? pair(o.FrameLabel) : [null, null];
    const [[x0, x1], [y0, y1]] = range;
    if (bottom != null) {
      const b = lines2(bottom), n = b?.head === 'Column' ? b.items.length : 1;
      above.push(Annotation([GrayLevel(0.2), FontSize(12), ...ls, Text(b, [((x0 + x1) / 2) * sx, y0 * sy - (31 + 7.5 * (n - 1)) * u])], 'frame-label-bottom'));
    }
    if (left != null) {
      const at = [x0 * sx - 43 * u, ((y0 + y1) / 2) * sy]; // room for the rotated text box in every engine (Firefox's is the widest)
      above.push(Annotation([GrayLevel(0.2), FontSize(12), ...ls, Rotate(Text(lines2(left), at), Math.PI / 2, at)], 'frame-label-left'));
    }
  }
  const lg = o.PlotLegends;
  if (lg && lg.items?.length) {
    const nLines = (it) => textOf(it.label).split('\n').length;
    // a two-line label takes 1.9 rows; a picture label its height plus 3 px
    const rows = lg.items.map((it) => (isPicture(it.label) ? Math.max(1.15, (iconPx(it.label) + 3) / LEGEND.rowPx) : 0.4 + 0.75 * nLines(it)));
    const w = legendWidthPx(lg) * u, h = rows.reduce((a, b) => a + b, 0) * LEGEND.rowPx * u;
    const [[x0, x1], [y0, y1]] = range;
    // outside: left edge 12 px right of the plot, centred vertically; Placed {a, b}: centred there (scaled coordinates)
    // Placed {{x, y}, {ax, ay}} (v0.1.27, Mathematica's form): the legend's own scaled point {ax, ay} at {x, y}
    const [at, al] = Array.isArray(lg.position?.[0]) ? lg.position : [lg.position, [0.5, 0.5]];
    const [cx, cy] = Array.isArray(lg.position)
      ? [(x0 + at[0] * (x1 - x0)) * sx - (al[0] - 0.5) * w, (y0 + at[1] * (y1 - y0)) * sy - (al[1] - 0.5) * h]
      : [x1 * sx + 12 * u + w / 2, ((y0 + y1) / 2) * sy];
    const left = cx - w / 2, top = cy + h / 2;
    above.push(Annotation(lg.items.map((it, i) => {
      const before = rows.slice(0, i).reduce((a, b) => a + b, 0);
      const y = top - (before + rows[i] / 2) * LEGEND.rowPx * u, sw = LEGEND.swatchPx * u;
      const style = [RGBColor(...it.color), AbsoluteThickness(it.thicknessPx ?? 1.6), it.dash && AbsoluteDashing(it.dash)].filter(Boolean);
      return Annotation([
        it.filled ? [RGBColor(...it.color), Opacity(0.2), Polygon([[left, y - 5 * u], [left + sw, y - 5 * u], [left + sw, y + 5 * u], [left, y + 5 * u]])] : null,
        [...style, Line([[left, y], [left + sw, y]])],
        isPicture(it.label) ? Inset(iconGraphics(it.label), [left + sw + (LEGEND.gapPx + iconPx(it.label) / 2) * u, y])
          : [Black, FontSize(LEGEND.fontPx), Text(lines2(it.label), [left + sw + LEGEND.gapPx * u, y], { anchor: 'start' })],
      ].filter(Boolean), `legend-${i + 1}`);
    }), 'legend', { style: 'white-space:pre' }));
  }
  if (o.PlotLabel != null) {
    const [[x0, x1]] = range, top = visible[1][1];
    above.push(Annotation([Black, FontSize(13), ...ls, Text(o.PlotLabel, [((x0 + x1) / 2) * sx, top - 15 * u])], 'plot-label'));
  }
  return { below, above };
}

/**
 * The layout of Inset[g, pos] for a Graphics g with frame options or content beyond Lines and Circles (v0.1.26), in the
 * arithmetic of the Manipulate layer's pictures (shared/manipulate.js: framedPicture for plots — AspectRatio, per-axis
 * PlotRangePadding, UpdateFrame —, the margin layout for other decorated pictures; a Graphics without decorations: its
 * PlotRange, unpadded, spans ImageSize px as for plain insets). ImageSize (default 360) is the inset's width in pixels of the
 * outer picture including the margins for ticks and labels; the centre of that whole box is at pos. Pure. Returns
 *   { k, centre, unitsPerPx, imageSize, plotRange, scale, clip, background, backgroundColor, below, above, box, frame, toOuter }
 * k: outer world units per inset world unit (the inset is drawn as pos + k·(q − centre)); unitsPerPx: inset world units
 * per pixel; plotRange: the inset's whole box in its world (with the margins); scale: [1, sy] for an AspectRatio (data →
 * inset world) or null; clip / background: the rectangle of PlotRangeClipping / Background ([[x0, x1], [y0, y1]]) or null;
 * below, above: the decorations as Graphics data in the inset's world; box: the whole inset and frame: the frame (the padded
 * plot range) in OUTER coordinates [[x0, y0], [x1, y1]]; toOuter(p): a data point of the inset in outer coordinates.
 */
export function insetLayout(graphics, pos, outerUnitsPerPx) {
  const o = graphics.options ?? {};
  if (!o.PlotRange) throw new Error('graphics: give an inset Graphics a PlotRange');
  const R = o.PlotRange, [[x0, x1], [y0, y1]] = R;
  const framed = o.AspectRatio !== undefined || o.UpdateFrame || Array.isArray(o.PlotRangePadding);
  const margins = decorationMargins(o);
  let size = o.ImageSize ?? 360;
  let range, imageSize, frame, scale = null, deco = { below: [], above: [] };
  if (framed) { // as framedPicture
    const pad = o.PlotRangePadding ?? 0.02, [px, py] = Array.isArray(pad) ? pad : [pad, pad];
    const Rp = [[x0 - (x1 - x0) * px, x1 + (x1 - x0) * px], [y0 - (y1 - y0) * py, y1 + (y1 - y0) * py]];
    const ar = o.AspectRatio;
    const sy = typeof ar === 'number' ? (ar * (Rp[0][1] - Rp[0][0])) / (Rp[1][1] - Rp[1][0]) : 1;
    frame = [[Rp[0][0], Rp[0][1]], [Rp[1][0] * sy, Rp[1][1] * sy]];
    const m = margins ?? {}, extra = legendExtraPx(o);
    const [mL, mR, mT, mB] = [m.left ?? 0, (m.right ?? 0) - extra, m.top ?? 0, m.bottom ?? 0];
    if (Array.isArray(size)) size = typeof ar === 'number' ? Math.min(size[0] - mL - mR, (size[1] - mT - mB) / ar) + mL + mR : size[0];
    imageSize = size + extra;
    const layout = frameLayout(frame, { imageSize, margins: m });
    range = layout.plotRange;
    scale = sy === 1 ? null : [1, sy];
    deco = plotDecorations(o, { range: Rp, plotRange: Rp, visible: range, unitsPerPx: layout.unitsPerPx, scale: [1, sy] });
  } else {
    imageSize = Array.isArray(size) ? size[0] : size;
    if (margins) { // decorated: the padded plot range with room for the labels (the layer's other pictures)
      const pad = o.PlotRangePadding ?? 0.02;
      frame = [[x0 - (x1 - x0) * pad, x1 + (x1 - x0) * pad], [y0 - (y1 - y0) * pad, y1 + (y1 - y0) * pad]];
      const layout = frameLayout(frame, { imageSize, margins });
      range = layout.plotRange;
      deco = plotDecorations(o, { range: frame, plotRange: R, visible: range, unitsPerPx: layout.unitsPerPx });
    } else { // no decorations: the PlotRange spans ImageSize px (as plain insets)
      const pad = o.PlotRangePadding ?? 0;
      frame = [[x0 - (x1 - x0) * pad, x1 + (x1 - x0) * pad], [y0 - (y1 - y0) * pad, y1 + (y1 - y0) * pad]];
      range = frame;
    }
  }
  const [[X0, X1], [Y0, Y1]] = range;
  const unitsPerPx = (X1 - X0) / imageSize;
  const k = outerUnitsPerPx / unitsPerPx, centre = [(X0 + X1) / 2, (Y0 + Y1) / 2];
  const out = ([x, y]) => [pos[0] + k * (x - centre[0]), pos[1] + k * (y - centre[1])];
  const sy = scale ? scale[1] : 1;
  return {
    k, centre, unitsPerPx, imageSize, plotRange: range, scale,
    clip: o.PlotRangeClipping ? frame : null, background: o.Background ? frame : null, backgroundColor: o.Background?.rgb,
    below: deco.below, above: deco.above,
    box: [out([X0, Y0]), out([X1, Y1])], frame: [out([frame[0][0], frame[1][0]]), out([frame[0][1], frame[1][1]])],
    toOuter: ([x, y]) => out([x, y * sy]),
  };
}
setInsetLayout(insetLayout);

export function locatorGlyph(u, { color = GrayLevel(0.25), size = 17 } = {}) {
  const R = (size / 2.4) * u;
  return [
    [White, Opacity(0.55), EdgeForm(Directive(color, AbsoluteThickness(1))), Disk([0, 0], R)],
    [color, AbsoluteThickness(1), CapForm('Butt'),
      Line([[[-R * 1.6, 0], [-R * 0.45, 0]], [[R * 0.45, 0], [R * 1.6, 0]], [[0, -R * 1.6], [0, -R * 0.45]], [[0, R * 0.45], [0, R * 1.6]]])],
  ];
}

export function notchedArrowhead(tip, [ux, uy], len, half, notchAt = 0.72) {
  const base = [tip[0] - len * ux, tip[1] - len * uy];
  const notch = [tip[0] - notchAt * len * ux, tip[1] - notchAt * len * uy];
  return { head: Polygon([tip, [base[0] - half * uy, base[1] + half * ux], notch, [base[0] + half * uy, base[1] - half * ux]]), notch };
}

/** Arrowheads[s] as data: drawArrowhead's filled triangle of length L (world units) at tip, along the unit direction. */
export function arrowheadPolygon(tip, [dx, dy], L, widthRatio = 0.3) {
  const nx = -dy, ny = dx, h = L * widthRatio;
  const b = [tip[0] - L * dx, tip[1] - L * dy];
  return Polygon([tip, [b[0] + h * nx, b[1] + h * ny], [b[0] - h * nx, b[1] - h * ny]]);
}

/**
 * drawArcArrow as data, in the colour of the enclosing list: a myArrowArc / myArrowArc2 / arrowArc result (arrow-arcs.js)
 * as a Point (with the pointSize directive), or the curve / arc with its head of length headLength (world units);
 * thickness: a directive or null.
 */
export function arcArrowGraphics(data, { thickness = null, headLength, pointSize = null }) {
  if (data.kind === 'Point') return [pointSize, Point(data.at)];
  return [thickness, Line(data.kind === 'Arrow' ? data.curve : data.arc), EdgeForm(), arrowheadPolygon(data.tip, data.direction, headLength)];
}
