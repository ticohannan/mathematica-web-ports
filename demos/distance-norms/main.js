// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distance-norms/main.js — the Manipulate: norm space, norm type, d, r1, the two dials, the invisible end-effector
// locator and the ParametricPlot picture (Prolog arm, frame and axes, the shaded region and its outline), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, Rule } from '../../shared/manipulate.js';
import {
  Annotation, Rotate, Rectangle, Point, Line, Polygon, Text, Raw, Style, Subscript, RGBColor, EdgeForm, FaceForm, Opacity,
  AbsolutePointSize, AbsoluteThickness, CapForm, FontSize, FontFamily, Italic, Black, Red, Blue, LightGray, cachedGraphics,
} from '../../shared/graphics.js';
import { mmaSliderText } from '../../shared/ui.js';
import { svgNode } from '../../shared/svg-plot.js';
import { frameLayout, framePrimitives } from '../../shared/svg-frame.js';
import { css } from '../../shared/mma-colors.js';
import { parseFraction } from '../../shared/mma-text.js';
import { makeDialControl } from '../common/dial-control.js';
import { arcArrowGraphics, plotUnitsPerPx } from '../common/arrow-graphics.js';
import {
  initialState, evaluate, PLOT_RANGE, NORM_SPACES, NORM_TYPES, BOUND_RANGE, R1_RANGE, PEND_RANGE, IMAGE, FRAME, REGION_STYLE,
} from './model.js';

// ParametricPlot defaults, ImageSize 360, frame exactly at ±2.5 (no padding; model.js IMAGE)
const layout = frameLayout(PLOT_RANGE, { imageSize: IMAGE.imageSize, margins: IMAGE.margins });
const U = plotUnitsPerPx(layout.plotRange, IMAGE.imageSize, 0);
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const POINT = AbsolutePointSize(2.4); // default Point size, measured in snapshot 1 (D-DN-07)
const HEAD = 0.03 * U * IMAGE.imageSize; // the arcs' arrowheads: 0.03 of the image width, fitted to snapshot 1 (D-DN-07)
const REGION = RGBColor(...REGION_STYLE.color); // PlotStyle -> Opacity[0.5] with ColorData[97][1]; BoundaryStyle the same
const CLIP = 'distance-norms-plot-range'; // PlotRangeClipping: the region and its outline end at the frame

/** Style[θᵢ, Medium] (12 pt): italic θ with a subscript index. Raw: its script size and shift (8.5 px, 4 px down) are
 * not the shared Subscript's (72 %, 28 %). */
const thetaLabel = (index, at, color, testid) => Raw((plot, g) => {
  const t = svgNode('text', {
    x: 0, y: 0, transform: `translate(${at[0]},${at[1]}) scale(1,-1)`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
    'font-size': 12 * plot.unitsPerPx, fill: css(color.rgb), 'font-family': FONT, 'data-testid': testid,
  });
  const th = svgNode('tspan', { 'font-style': 'italic' });
  th.textContent = 'θ';
  const sub = svgNode('tspan', { 'font-size': 8.5 * plot.unitsPerPx, dy: 4 * plot.unitsPerPx });
  sub.textContent = String(index);
  t.append(th, sub);
  return g.appendChild(t);
});
/** Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> w] rotated about the joint. */
const stadium = (link, id) => Annotation(Rotate(Rectangle(...link.rect, { RoundingRadius: link.radius }), link.angle, link.about), id);
/** Rotate[{…, Text["Robot Arm", pos]}, angle, about] (Black, 9 px). */
const robotArm = (ra, link) => ra.link === link && Annotation(Rotate([Black, FontSize(9), FontFamily(FONT), Text('Robot Arm', ra.anchor)], ra.angle, ra.about), 'robot-arm-label');
const arcArrow = (color, data, id) => [color, Annotation(arcArrowGraphics(data, { headLength: HEAD, pointSize: POINT }), id)];

/** The arm (Prolog -> arm), in the original's list order. */
const arm = (a) => [LightGray, EdgeForm(Black),
  stadium(a.link1, 'link-1'), robotArm(a.robotArm, 1), // Rotate[{Rectangle[…], If[r2 < 1, {Black, Text[…]}]}, Theta1, {0, 0}]
  [Black, POINT, Annotation(Point(a.base), 'base-point')], // {Black, Point[{{0, 0}}], , Red, myArrowArc[…], If[…, Text[θ₁, …]]}
  arcArrow(Red, a.arcs.theta1, 'theta1-arc'), a.theta1Label.visible && thetaLabel(1, a.theta1Label.at, Red, 'theta1-label'),
  stadium(a.link2, 'link-2'), robotArm(a.robotArm, 2),
  [Black, POINT, Annotation(Point(a.elbow), 'elbow-point')],
  arcArrow(Blue, a.arcs.theta2, 'theta2-arc'), a.theta2Label.visible && thetaLabel(2, a.theta2Label.at, Blue, 'theta2-label'),
];

// Frame -> True, FrameTicks on four sides with labels on the left and bottom, Axes through the origin (gray): the
// shared/svg-frame.js data, grouped as its drawFrame groups them (frame, axes, ticks, labels)
const GROUP = { frame: 'frame', 'axis-x': 'axes', 'axis-y': 'axes', major: 'ticks', minor: 'ticks', 'label-x': 'labels', 'label-y': 'labels' };
function frame() {
  const { lines, texts } = framePrimitives({ unitsPerPx: U, ...FRAME });
  const groups = {};
  const add = (role, g) => (groups[GROUP[role]] ??= []).push(g);
  lines.forEach((l) => add(l.role, Line(l.pts)));
  texts.forEach((t) => add(t.role, Text(t.str, t.pos, { anchor: t.anchor })));
  return [RGBColor(0.4, 0.4, 0.4), AbsoluteThickness(0.5), CapForm('Butt'), FontSize(FRAME.fontPx), Object.entries(groups).map(([k, list]) => Annotation(list, k))];
}
const frameCache = cachedGraphics();
const layer = (list, name, id = name) => Annotation(list, id, { 'data-layer': name });
const clipped = (list, name, id) => Annotation(list, id, { 'data-layer': name, 'clip-path': `url(#${CLIP})` });

// {{bound, 1/2, "d"}, …}: the exact opening 1/2 shows as "1/2"; a typed π, fraction or number is read
const parseTyped = (t) => {
  const s = String(t).trim().replace(/[−–]/g, '-');
  if (/^(Pi|π)$/.test(s)) return Math.PI;
  const f = parseFraction(s);
  if (f) return f.num / f.den;
  return s === '' ? NaN : Number(s);
};
const dial = (color) => Control(makeDialControl, { color, imageSize: 120, setter: 'normalize', arc: 'myArrowArc2', keyStep: 0.05, labels: 'stacked' });

// the body never refers to pEnd: a pEnd move alone (same state object, other variables unchanged) evaluates nothing
// and keeps the last result (N-DN-03); `evaluations` counts the evaluations
let evaluations = 0, last = {};
const body = (s) => {
  const inputs = [s.cORw, s.p, s.bound, s.r1, s.p1, s.p2];
  if (!(s === last.s && s.pEnd !== last.pEnd && inputs.every((x, i) => x === last.inputs[i]))) { evaluations++; last.result = evaluate(s); }
  Object.assign(last, { s, pEnd: s.pEnd, inputs });
  return last.result;
};
const showExact = (c) => { // d = 0.5 and r1 = 1 show as the exact "1/2" and "1" (initial settings, all six snapshots)
  c.controls.get('bound').set(c.state.bound, { moved: c.state.bound !== 0.5 });
  c.controls.get('r1').set(c.state.r1, { moved: c.state.r1 !== 1 });
};

const m = Manipulate({
  name: 'distance-norms',
  initial: initialState,
  body,
  draw: (r) => [
    layer(arm(r.arm), 'arm'), // Prolog -> arm
    layer(frameCache([], frame), 'frame'),
    // one translucent polygon per sheet (overlaps darker, D-DN-02), then the opaque outline
    clipped(r.region.degenerate ? [] : [REGION, Opacity(REGION_STYLE.opacity), r.region.sheets.map((s, i) => Annotation(Polygon(s.world), `region-sheet-${i + 1}`))], 'region', 'region'),
    clipped([FaceForm(None), EdgeForm(REGION), Annotation(Polygon(r.region.boundary), 'region-boundary')], 'outline', 'region-outline'),
  ],
  graphics: { PlotRange: layout.plotRange, ImageSize: IMAGE.imageSize, PlotRangePadding: 0, label: 'Two-link arm and the set of points within distance d of its configuration' },
  controls: [
    [['cORw', 'phase space', 'norm space'], NORM_SPACES],
    [['p', Infinity, 'norm type'], NORM_TYPES.map((v) => (v === Infinity ? Rule(v, '∞') : v))],
    [['pEnd', [2, 0]], ...PEND_RANGE, Locator, { Appearance: None }], // has no effect, as in the original (Q-DN-01)
    [['pEndp', [2, 0]], ...PEND_RANGE, None],
    [['bound', 0.5, 'd'], BOUND_RANGE.min, BOUND_RANGE.max, BOUND_RANGE.step, {
      Appearance: 'Labeled', parse: parseTyped,
      format: (v, { moved }) => (!moved && v === 0.5 ? '1/2' : mmaSliderText(v, { moved, realValues: true })),
    }],
    [['r1', 1, Subscript('r', 1)], R1_RANGE.min, R1_RANGE.max, R1_RANGE.step, { Appearance: 'Labeled', parse: parseTyped, label: 'r1' }],
    [['p1', [1, 0], Style('θ₁', Italic)], dial(Red.rgb)], // (makeDialControl[#1, {0, 0}, Red] &)
    [['p2', [0, 1], Style('θ₂', Italic)], dial(Blue.rgb)],
    [['IsElbowUpp', true], None],
  ],
  // LocatorPane: a press anywhere in the plot moves the (only) locator there (D-DN-05)
  locators: { keyStep: 0.05, describe: () => 'end-effector locator (has no effect, as in the original); arrow keys move it' },
  after: (c) => { // the clip rectangle of PlotRangeClipping, once
    if (c.plot.svg.querySelector(`#${CLIP}`)) return;
    const [[x0, x1], [y0, y1]] = PLOT_RANGE;
    const cp = svgNode('clipPath', { id: CLIP, clipPathUnits: 'userSpaceOnUse' });
    cp.append(svgNode('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }));
    const defs = svgNode('defs');
    defs.append(cp);
    c.plot.svg.prepend(defs);
  },
  hook: { // port addition A-DN-03 (structuredClone, not JSON: p = ∞ stays Infinity)
    copy: structuredClone,
    /** a summary of the last evaluation */
    view: (v) => ({
      locals: v.locals, mode: v.region.mode, sheetCount: v.region.sheets.length, areas: v.region.sheets.map((s) => s.area),
      totalArea: v.region.totalArea, degenerate: v.region.degenerate, boundaryPoints: v.region.boundary.length,
      elbow: v.arm.elbow, tip: v.arm.tip, robotArmLink: v.arm.robotArm.link,
    }),
    /** the region as drawn: sheets (parameter and world polygons, b range, area) and the outline */
    region: (c) => () => structuredClone(c.view.region),
    arm: (c) => () => structuredClone(c.view.arm),
    evaluations: () => () => evaluations,
    /** set Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
    setState: (c) => (partial) => { c.setState(structuredClone(partial)); showExact(c); return structuredClone(c.state); },
    /** move a locator as one front-end update: 'pEnd' (plot); the dials have no hook move */
    moveLocator: (c) => (name, p) => { if (name === 'pEnd') c.moveLocator('pEnd', p); return structuredClone(c.state); },
    dialToClient: (c) => (name, p) => c.controls.get(name).plot.worldToClient(p),
  },
});
