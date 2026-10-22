// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-lasers/main.js — the Manipulate: the object locator, the orientation dial, the s and λ sliders and the
// two pictures Column[{Graphics[top view], Framed[Graphics[camera image]]}], on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, hookCopy } from '../../shared/manipulate.js';
import {
  Annotation, Polygon, Line, Point, Text, Raw, Style, RGBColor, EdgeForm, Opacity, AbsoluteThickness,
  AbsoluteDashing, AbsolutePointSize, PointSize, CapForm, FontSize, FontFamily, Italic, Gray, cachedGraphics,
} from '../../shared/graphics.js';
import { mmaGrid } from '../../shared/ui.js';
import { addVerticalSlider } from '../../shared/ui-extra.js';
import { svgNode } from '../../shared/svg-plot.js';
import { css } from '../../shared/mma-colors.js';
import { numberParts } from '../../shared/mma-text.js';
import { makeDialControl } from '../common/dial-control.js';
import { arrowheadPolygon, plotUnitsPerPx } from '../common/arrow-graphics.js';
import { LOC_ICON } from '../common/prm-core.js';
import { initialSettings, evaluate, fromSaved, clipPolyline, PLOT_RANGE, CAM_RANGE, IMSZ, DIAL_OPTIONS } from './model.js';

const rgb = (c) => RGBColor(...c);
const DASH = [4, 3];
const CLIP_MARGIN_PX = 20; // dashed lines are clipped to the plot range plus 20 px on every side (D-CL-08)
const SERIF = '"Times New Roman", serif', SANS = 'Arial, Helvetica, sans-serif';
const picture = (range) => {
  const u = plotUnitsPerPx(range, IMSZ, 0), m = CLIP_MARGIN_PX * u, [[x0, x1], [y0, y1]] = range;
  return { u, box: [[x0 - m, x1 + m], [y0 - m, y1 + m]] };
};
const TOP = picture(PLOT_RANGE), CAM = picture(CAM_RANGE);

/** loc[col]: the coloured locator icon (prm-core LOC_ICON: ImageSize 17, PlotRange ±8), centred at `at`. Raw: the
 * shared Inset draws it with another transform nesting (one scaled group, unclipped ±10 hairs as before). */
const locIcon = (at, color) => Raw((plot, g) => {
  const k = LOC_ICON.pxPerUnit * plot.unitsPerPx;
  const grp = plot.group(g, { transform: `translate(${at[0]},${at[1]}) scale(${k})`, 'data-testid': 'locator-icon' });
  const c = css(color), w = 1 / LOC_ICON.pxPerUnit;
  for (const [[x1, y1], [x2, y2]] of LOC_ICON.lines) grp.append(svgNode('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w }));
  for (const ci of LOC_ICON.circles) grp.append(svgNode('circle', { cx: ci.c[0], cy: ci.c[1], r: ci.r, fill: 'none', stroke: c, 'stroke-opacity': ci.opacity, 'stroke-width': ci.thicknessPx * w }));
  return grp;
});

/** Text[i, pos] of the reticule: exact fractions stacked (numerator, bar, denominator), others plain, minus in front. */
function tickLabel({ value, at, fontPx, color }, u) {
  const parts = numberParts(value);
  const id = ['tick-label', { class: 'tick-label', 'data-text': parts.text }];
  if (!parts.den) return Annotation([rgb(color), FontSize(fontPx), Text(parts.text, at)], ...id);
  const f = fontPx * 0.85;
  const w = Math.max(parts.num.length, parts.den.length) * f * 0.6 * u;
  const cx = at[0] + (parts.sign ? f * 0.3 * u : 0);
  return Annotation([rgb(color), FontSize(f), parts.sign && Text(parts.sign, [cx - w / 2 - f * 0.45 * u, at[1]]),
    Text(parts.num, [cx, at[1] + f * 0.6 * u]), AbsoluteThickness(0.75), Line([[cx - w / 2, at[1]], [cx + w / 2, at[1]]]),
    Text(parts.den, [cx, at[1] - f * 0.6 * u])], ...id);
}

/** One primitive of the model's lists (model.js evaluate: top, cam, in the original's order) as Graphics data. */
function prim(p, { u, box }) {
  const id = p.role, filled = (shape) => [rgb(p.fill), p.opacity != null && Opacity(p.opacity), p.edge && EdgeForm(rgb(p.edge)), Annotation(shape, id)];
  switch (p.kind) {
    case 'polygon': return filled(Polygon(p.pts));
    // Rectangle[{x0, y0}, {x1, y1}] as its polygon: drawn as before (round line joins of the edge)
    case 'rect': { const [[a, b], [c, d]] = [p.from, p.to]; return filled(Polygon([[Math.min(a, c), Math.min(b, d)], [Math.max(a, c), Math.min(b, d)], [Math.max(a, c), Math.max(b, d)], [Math.min(a, c), Math.max(b, d)]])); }
    case 'line': case 'arc': {
      const style = [rgb(p.stroke), AbsoluteThickness(p.thicknessPx ?? 1)];
      if (!p.dashed) return [...style, Annotation(Line(p.pts), id)];
      // a missing laser's dashed reflection reaches x = 10000 (Q-CL-04): only the part in the window is drawn, with the
      // dash phase of the whole line (stroke-dashoffset); the model's two-point lines give at most one run
      const period = DASH.reduce((a, b) => a + b, 0) * u;
      return [...style, AbsoluteDashing(DASH), CapForm('Butt'), clipPolyline(p.pts, box).map((r) => Annotation(Line(r.pts), id, r.offset > 0 ? { 'stroke-dashoffset': String(r.offset % period) } : {}))];
    }
    case 'arrow': {
      const tip = p.tip ?? p.pts[p.pts.length - 1];
      let dir = p.direction;
      if (!dir) { const a = p.pts[p.pts.length - 2], dx = tip[0] - a[0], dy = tip[1] - a[1], l = Math.hypot(dx, dy); dir = [dx / l, dy / l]; }
      return [rgb(p.stroke), AbsoluteThickness(p.thicknessPx ?? 1), Annotation([Line(p.pts), arrowheadPolygon(tip, dir, p.head * u * IMSZ)], id)];
    }
    case 'point': return [rgb(p.color), p.sizePx ? AbsolutePointSize(p.sizePx) : PointSize(p.size), Annotation(Point(p.at), id)];
    // the Greek letters and s in italic serif (as the snapshots show them), the titles in the default sans-serif
    case 'text': return [rgb(p.color), Annotation(Text(Style(p.text, ...(p.italic ? [Italic] : []), FontSize(p.fontPx), FontFamily(p.italic ? SERIF : SANS)), p.at), id)];
    case 'label': return tickLabel(p, u);
    case 'loc': return locIcon(p.at, p.color);
    default: throw new Error(`unknown primitive ${p.kind}`);
  }
}

// GridLines -> {Table[i, {i, -1, 15}], Table[i, {i, -4, 4}]}, GridLinesStyle -> Directive[Thin, Dashed, Gray] (behind)
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gridLines = [Gray, AbsoluteThickness(0.5), AbsoluteDashing(DASH), CapForm('Butt'),
  ...range(-1, 15).map((x) => Line([[x, -4], [x, 4]])), ...range(-4, 4).map((y) => Line([[-1, y], [15, y]]))];
const grid = cachedGraphics();

// {{s, 1}, 0.1, 2, 0.01, VerticalSlider, …}: the values 0.1 + k·0.01 of Mathematica's slider (the layer's vertical
// slider passes the input's own value)
const sGrid = mmaGrid(0.1, 2, 0.01);
const sSlider = (controls, o) => addVerticalSlider(controls, { ...o, onInput: (v) => o.onInput(sGrid.valueAt(sGrid.indexOf(v))) });

const m = Manipulate({
  name: 'camera-lasers',
  initial: initialSettings,
  body: evaluate, // one evaluation of the Manipulate body (model.js): { state, view }
  draw: (v) => [[grid([], () => gridLines), v.top.map((p) => prim(p, TOP))], v.cam.map((p) => prim(p, CAM))],
  // Column[{Graphics[…, PlotRange -> plotRange, ImageSize -> imsz], Framed[Graphics[…, PlotRange -> camera, …]]}]
  graphics: [
    { PlotRange: PLOT_RANGE, ImageSize: IMSZ, PlotRangePadding: 0, id: 'top-view', testid: 'scene-svg', label: 'Top view: camera, lasers, beams and the brown object' },
    { PlotRange: CAM_RANGE, ImageSize: IMSZ, PlotRangePadding: 0, id: 'camera-image', testid: 'camera-svg', label: 'Camera image with the laser dots and the distance reticule' },
  ],
  controls: [
    // {{p, {3, -1/5}}, Locator, Appearance -> None}; range: the top view's plot range (K-CL-01); loc[Black] drawn above
    [['p', [3, -0.2]], [PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]], Locator, { Appearance: None }],
    [['pFixed', [3, -0.2]], None],
    'object orientation',
    [['p1', [1, 0], 'θ'], Control(makeDialControl, DIAL_OPTIONS)], // (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> {120, 120}
    '\nlaser spacing',
    // {{s, 1}, 0.1, 2, 0.01, VerticalSlider, ImageSize -> {Automatic, 80}, Appearance -> "Labeled"}
    [['s', 1], Control(sSlider, { min: 0.1, max: 2, step: 0.01 })],
    'camera focal length',
    [['lambda', 0.5, Style('λ', Italic)], 0.1, 2, 0.01, { ImageSize: 80, Appearance: 'Labeled' }],
  ],
  // LocatorPane: a press anywhere in the top view moves the object there (D-CL-06)
  locators: { keyStep: 0.1, describe: () => 'object locator; arrow keys move it' },
  hook: { // port addition A-CL-04
    /** texts of the reticule labels, left to right */
    tickLabels: (c) => () => [...c.plots[1].svg.querySelectorAll('[data-testid=tick-label]')].map((g) => ({ text: g.getAttribute('data-text'), u: Number(g.querySelector('text').getAttribute('transform').match(/translate\(([-\d.e]+)/)[1]) })).sort((a, b) => a.u - b.u).map((l) => l.text),
    /** load a state (the port's form or a saved one with plain numbers, λ under its own name), then evaluate once */
    loadState: (c) => (s) => hookCopy(c.setState(fromSaved(JSON.parse(JSON.stringify(s))))),
    moveLocator: (c) => (q) => { c.moveLocator('p', q); return hookCopy(c.state); },
    camWorldToClient: (c) => (q) => c.plots[1].worldToClient(q),
    dialToClient: (c) => (q) => c.controls.get('p1').plot.worldToClient(q),
  },
});
document.getElementById('reset').addEventListener('click', () => m.controls.get('lambda').stop()); // stop the ⊕ animation
