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
  Annotation, Line, Disk, Polygon, Text, Style, RGBColor, GrayLevel, White, Opacity, EdgeForm, Directive,
  AbsoluteThickness, CapForm, FontSize, Italic, Point,
} from './graphics.js';
import { axesPrimitives } from './svg-frame.js';

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
