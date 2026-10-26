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
// Pure data constructors.
import {
  Annotation, Line, Disk, Polygon, Text, Style, RGBColor, GrayLevel, White, Black, Opacity, EdgeForm, Directive,
  AbsoluteThickness, CapForm, FontSize, Italic, Point, Rotate, Column, AbsoluteDashing, textOf,
} from './graphics.js';
import { axesPrimitives, framePrimitives } from './svg-frame.js';

import { plotUnitsPerPx } from './svg-plot.js';
/** World units per nominal pixel of a picture with this PlotRange, ImageSize and PlotRangePadding (createPlot's arithmetic). */
export { plotUnitsPerPx };
export const pxSize = plotUnitsPerPx;

const GRAY = [0.4, 0.4, 0.4];
/** opts: those of svg-frame.js drawAxes (range, majorStep, minorStep, axesLabel, fontPx, color, labelColor, thicknessPx,
 * axesLabelStyle {italic, color}, …) and unitsPerPx. */
export function axesGraphics(opts) {
  const { lines, texts } = axesPrimitives(opts);
  const st = opts.axesLabelStyle ?? {};
  const labelStyle = [st.italic && Italic, st.color && RGBColor(...st.color)].filter(Boolean);
  const axis = (a) => Annotation([
    RGBColor(...(opts.color ?? GRAY)), AbsoluteThickness(opts.thicknessPx ?? 0.5), CapForm('Butt'),
    ...lines.filter((l) => l.role.endsWith(a)).map((l) => Line(l.pts)),
    RGBColor(...(opts.labelColor ?? GRAY)), FontSize(opts.fontPx ?? 11),
    ...texts.filter((t) => t.role.endsWith(a))
      .map((t) => Text(t.role.startsWith('axes-label') ? Style(t.str, ...labelStyle) : t.str, t.pos, { anchor: t.anchor })),
  ], `axis-${a}`);
  return [axis('x'), axis('y')];
}

// ---- Graphics options Axes, Frame, Ticks, AxesLabel, FrameLabel, PlotLabel (used by shared/manipulate.js) --------
// Mathematica's names and forms: Axes -> True | {True, False}; AxesOrigin -> {x, y}; Ticks / FrameTicks -> Automatic |
// None | {xspec, yspec} with a spec = Automatic, None, a step (number: major ticks every step, minor every step/5) or
// a list of positions; AxesLabel -> {x, y}; Frame -> True; FrameLabel -> {bottom, left}; PlotLabel -> text;
// LabelStyle -> {FontSize, colour…} (directives for tick labels and labels). Text may be strings or Style/Subscript/Row.
const hasDecor = (o) => !!(o && (o.Axes || o.Frame || o.PlotLabel != null || o.PlotLegends || o.ImagePadding));
// Frame -> True or {bottom, left, top, right} (v0.1.23: sides with False are not drawn)
const frameSides = (f) => (Array.isArray(f) ? ['bottom', 'left', 'top', 'right'].filter((_, i) => f[i]) : undefined);
// a string with line breaks is a Column of lines (Mathematica draws "a\nb" on two lines)
const lines2 = (t) => (typeof t === 'string' && t.includes('\n') ? Column(t.split('\n')) : t);
// PlotLegends (v0.1.23): { items: [{ label, color, dash, thicknessPx, filled }], position: 'right' | [sx, sy] (Placed,
// scaled coordinates inside the plot) } — made by shared/plot.js from PlotStyle; drawn as data
const LEGEND = { rowPx: 18, swatchPx: 22, gapPx: 6, fontPx: 12 };
const legendWidthPx = (lg) => LEGEND.swatchPx + LEGEND.gapPx + 6.6 * Math.max(0, ...lg.items.map((it) => Math.max(...textOf(it.label).split('\n').map((x) => x.length)))) + 8;
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
  // scale [sx, sy] (v0.1.23, AspectRatio): range and plotRange are in data units, the world is x·sx, y·sy
  const [sx, sy] = scale ?? [1, 1];
  const sc = scale ? { scale } : {};
  if (o.Axes && !(o.Frame && o.AxesInFrame)) {
    const [ax, ay] = pair(o.Axes);
    const [tx, ty] = o.Ticks ? pair(o.Ticks) : [undefined, undefined];
    const g = axesGraphics({ range, tickRange: plotRange, origin: o.AxesOrigin, unitsPerPx: u, x: tickOpt(tx), y: tickOpt(ty),
      axesLabel: o.AxesLabel ? pair(o.AxesLabel) : undefined, fontPx, ...sc });
    below.push(...[ax && g[0], ay && g[1]].filter(Boolean));
  }
  if (o.Frame) {
    const [tx, ty] = o.FrameTicks ? pair(o.FrameTicks) : [undefined, undefined];
    // a plot with a Frame keeps its axes as plain lines inside the frame (v0.1.23, AxesInFrame set by shared/plot.js)
    const { lines, texts } = framePrimitives({ range, unitsPerPx: u, x: tickOpt(tx), y: tickOpt(ty), fontPx, frameSides: frameSides(o.Frame), axes: !!o.AxesInFrame, axesOrigin: o.AxesOrigin, ...sc });
    below.push(Annotation([RGBColor(...GRAY), AbsoluteThickness(0.5), CapForm('Butt'),
      ...lines.map((l) => Line(l.pts)), FontSize(fontPx),
      ...texts.map((t) => Text(t.str, t.pos, { anchor: t.anchor }))], 'frame'));
    const [bottom, left] = o.FrameLabel ? pair(o.FrameLabel) : [null, null];
    const [[x0, x1], [y0, y1]] = range;
    if (bottom != null) {
      const b = lines2(bottom), n = b?.head === 'Column' ? b.items.length : 1;
      above.push(Annotation([GrayLevel(0.2), FontSize(12), Text(b, [((x0 + x1) / 2) * sx, y0 * sy - (31 + 7.5 * (n - 1)) * u])], 'frame-label-bottom'));
    }
    if (left != null) {
      const at = [x0 * sx - 43 * u, ((y0 + y1) / 2) * sy]; // room for the rotated text box in every engine (Firefox's is the widest)
      above.push(Annotation([GrayLevel(0.2), FontSize(12), Rotate(Text(lines2(left), at), Math.PI / 2, at)], 'frame-label-left'));
    }
  }
  const lg = o.PlotLegends;
  if (lg && lg.items?.length) {
    const nLines = (it) => textOf(it.label).split('\n').length;
    const rows = lg.items.map((it) => 0.4 + 0.75 * nLines(it)); // a two-line label takes 1.9 rows
    const w = legendWidthPx(lg) * u, h = rows.reduce((a, b) => a + b, 0) * LEGEND.rowPx * u;
    const [[x0, x1], [y0, y1]] = range;
    // outside: left edge 12 px right of the plot, centred vertically; Placed {a, b}: centred there (scaled coordinates)
    const [cx, cy] = Array.isArray(lg.position)
      ? [(x0 + lg.position[0] * (x1 - x0)) * sx, (y0 + lg.position[1] * (y1 - y0)) * sy]
      : [x1 * sx + 12 * u + w / 2, ((y0 + y1) / 2) * sy];
    const left = cx - w / 2, top = cy + h / 2;
    above.push(Annotation(lg.items.map((it, i) => {
      const before = rows.slice(0, i).reduce((a, b) => a + b, 0);
      const y = top - (before + rows[i] / 2) * LEGEND.rowPx * u, sw = LEGEND.swatchPx * u;
      const style = [RGBColor(...it.color), AbsoluteThickness(it.thicknessPx ?? 1.6), it.dash && AbsoluteDashing(it.dash)].filter(Boolean);
      return Annotation([
        it.filled ? [RGBColor(...it.color), Opacity(0.2), Polygon([[left, y - 5 * u], [left + sw, y - 5 * u], [left + sw, y + 5 * u], [left, y + 5 * u]])] : null,
        [...style, Line([[left, y], [left + sw, y]])],
        [Black, FontSize(LEGEND.fontPx), Text(lines2(it.label), [left + sw + LEGEND.gapPx * u, y], { anchor: 'start' })],
      ].filter(Boolean), `legend-${i + 1}`);
    }), 'legend', { style: 'white-space:pre' }));
  }
  if (o.PlotLabel != null) {
    const [[x0, x1]] = range, top = visible[1][1];
    above.push(Annotation([Black, FontSize(13), Text(o.PlotLabel, [((x0 + x1) / 2) * sx, top - 15 * u])], 'plot-label'));
  }
  return { below, above };
}

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
