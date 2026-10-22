// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// Generic picture helpers (they contain no code of a Demonstration); kept with the other drawing helpers of demos/common/.
// demos/common/plot-extras.js — picture parts as shared/graphics.js data that the Manipulate layer does not offer
// directly (yet), written for the v0.1.20 migration of four-bar-linkage, minkowski-sum and dubins-isochrons. Each one
// draws exactly the elements the apps drew before by hand (same pixels):
//   pxSize(PlotRange, ImageSize, PlotRangePadding)  world units per pixel, computed as shared/svg-plot.js createPlot does
//   axesGraphics(opts)            Axes through the origin: shared/svg-frame.js axesPrimitives as data, grouped and styled
//                                 as its drawAxes draws them (groups axis-x, axis-y)
//   locatorGlyph(unitsPerPx)      Mathematica's default locator glyph (shared/svg-plot.js locatorGlyph) as data, centred
//                                 at the origin (for Graphics[{Locator[p]}] drawn as a picture, not dragged)
//   notchedArrowhead(tip, dir, len, half)  the ports' approximation of Mathematica's default arrowhead (a triangle
//                                 notched at 0.72 of its length; graphics.js Arrow draws a plain triangle): { head: Polygon,
//                                 notch } — the shaft is drawn up to `notch`
//   Raw (graphics.js's migration aid), where data would change pixels:
//   clipped(id, range, list)      PlotRangeClipping for a part of a picture: `list` in a group clipped to `range`
//   tspanText(pieces, pos, opts)  Text built of <tspan> pieces [{ text, ...attributes }] (subscripts with the shifts the
//                                 ports used, '0.3em' / '75%', where graphics.js Subscript uses 0.28 / 0.72 of the font
//                                 size; several lines)
// Pure data constructors; the Raw parts run in the browser only.
import {
  Annotation, Line, Disk, Polygon, Text, Style, Raw, RGBColor, GrayLevel, White, Black, Opacity, EdgeForm, Directive,
  AbsoluteThickness, CapForm, FontSize, Italic, render,
} from '../../shared/graphics.js';
import { svgNode } from '../../shared/svg-plot.js';
import { axesPrimitives } from '../../shared/svg-frame.js';

import { plotUnitsPerPx } from '../../shared/svg-plot.js';
export const pxSize = plotUnitsPerPx; // world units per pixel (shared/svg-plot.js)

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

export const clipped = (id, [[x0, x1], [y0, y1]], list) => Raw((plot, g) => {
  if (!plot.svg.querySelector(`#${id}`)) {
    const cp = svgNode('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
    cp.append(svgNode('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }));
    let defs = plot.svg.querySelector('defs');
    if (!defs) { defs = svgNode('defs'); plot.svg.prepend(defs); }
    defs.append(cp);
  }
  const grp = plot.group(g, { 'clip-path': `url(#${id})` });
  render(plot, grp, list);
  return grp;
});

/** opts: color (RGBColor, default Black), fontPx (12), anchor ('middle'), baseline, id (data-testid), attrs. */
export const tspanText = (pieces, pos, { color = Black, fontPx = 12, anchor = 'middle', baseline, id, attrs = {} } = {}) => Raw((plot, g) => {
  const t = plot.text(g, '', pos, { fontPx, color: color.rgb, anchor, testid: id });
  if (baseline) t.setAttribute('dominant-baseline', baseline);
  for (const [k, v] of Object.entries(attrs)) t.setAttribute(k, String(v));
  for (const { text, ...a } of pieces) { const s = svgNode('tspan', a); s.textContent = text; t.append(s); }
  return t;
});
