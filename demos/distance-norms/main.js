// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distance-norms/main.js — page: controls in the original's order (ControlPlacement -> Left), the
// ParametricPlot picture as SVG (Prolog arm, frame and axes, the shaded region and its outline), the invisible
// end-effector locator and the automation hook (browser only).
import { Controls, mmaSliderText } from '../../shared/ui.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { drawFrame, frameLayout, clipToRange } from '../../shared/svg-frame.js';
import { NAMED, css } from '../../shared/mma-colors.js';
import { parseFraction } from '../../shared/mma-text.js';
import { makeDialControl, drawArcArrow } from '../common/dial-control.js';
import {
  initialState, evaluate, PLOT_RANGE, NORM_SPACES, NORM_TYPES, BOUND_RANGE, R1_RANGE, PEND_RANGE, IMAGE, FRAME, REGION_STYLE,
} from './model.js';

let state = initialState();
let result = null;
let evaluations = 0;

// ---- the picture: ParametricPlot defaults, ImageSize 360, frame exactly at ±2.5 (no padding; model.js IMAGE) -----
const IMAGE_SIZE = IMAGE.imageSize;
const layout = frameLayout(PLOT_RANGE, { imageSize: IMAGE_SIZE, margins: IMAGE.margins });
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: layout.plotRange, padding: 0, imageSize: IMAGE_SIZE,
  label: 'Two-link arm and the set of points within distance d of its configuration',
});
const L = {
  arm: plot.layer('arm'), frame: plot.layer('frame'), region: plot.layer('region'), outline: plot.layer('outline'),
};
L.arm.setAttribute('data-testid', 'arm');
L.region.setAttribute('data-testid', 'region');
L.outline.setAttribute('data-testid', 'region-outline');
// Frame -> True, FrameTicks on four sides with labels on the left and bottom, Axes through the origin (gray)
drawFrame(plot, L.frame, FRAME);
L.frame.setAttribute('data-testid', 'frame');
// PlotRangeClipping: the region and its outline end at the frame
clipToRange(plot, L.region, PLOT_RANGE);
clipToRange(plot, L.outline, PLOT_RANGE);

// PlotStyle -> Opacity[0.5] with the first default plot colour ColorData[97][1]; BoundaryStyle -> Automatic (same colour)
const REGION_RGB = REGION_STYLE.color;
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const POINT = { abs: 2.4 }; // default Point size, measured in snapshot 1 (D-DN-07)
const ARROWHEAD = 0.03; // the arcs' arrowheads as a fraction of the image width, fitted to snapshot 1 (D-DN-07)
const deg = (a) => (a * 180) / Math.PI;

/** Text[str, pos] in a group rotated by `angle` about `about` (Rotate[{…, Text[…]}, angle, about]). */
function rotatedText(g, str, pos, angle, about, { color = NAMED.Black, fontPx = 9, testid } = {}) {
  const grp = plot.group(g, { transform: `rotate(${deg(angle)} ${about[0]} ${about[1]})`, 'data-testid': testid });
  plot.text(grp, str, pos, { fontPx, color, family: FONT });
  return grp;
}
/** Style[θᵢ, Medium] (12 pt): italic θ with a subscript index. */
function thetaLabel(g, index, at, color, testid) {
  const t = svgNode('text', {
    x: 0, y: 0, transform: `translate(${at[0]},${at[1]}) scale(1,-1)`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
    'font-size': 12 * plot.unitsPerPx, fill: css(color), 'font-family': FONT, 'data-testid': testid,
  });
  const th = svgNode('tspan', { 'font-style': 'italic' });
  th.textContent = 'θ';
  const sub = svgNode('tspan', { 'font-size': 8.5 * plot.unitsPerPx, dy: 4 * plot.unitsPerPx });
  sub.textContent = String(index);
  t.append(th, sub);
  return g.appendChild(t);
}
/** Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> w] rotated by angle about `about`. */
function stadium(g, link, testid) {
  const [[x0, y0], [x1, y1]] = link.rect;
  return g.appendChild(svgNode('rect', {
    x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: link.radius, ry: link.radius,
    transform: `rotate(${deg(link.angle)} ${link.about[0]} ${link.about[1]})`,
    fill: css(NAMED.LightGray), stroke: css(NAMED.Black), 'stroke-width': plot.strokeWidth(), 'data-testid': testid,
  }));
}

/** The arm (Prolog -> arm), in the original's list order. */
function drawArm(arm) {
  const g = L.arm;
  g.replaceChildren();
  // Rotate[{Rectangle[…], If[r2 < 1, {Black, Text["Robot Arm", {r1/2, 0}]}]}, Theta1, {0, 0}]
  stadium(g, arm.link1, 'link-1');
  if (arm.robotArm.link === 1) rotatedText(g, 'Robot Arm', arm.robotArm.anchor, arm.robotArm.angle, arm.robotArm.about, { testid: 'robot-arm-label' });
  // {Black, Point[{{0, 0}}], , Red, myArrowArc[{0, 0}, l/4, {0, Theta1}], If[Abs[Theta1] > π/4, Text[θ₁, …]]}
  plot.point(g, arm.base, POINT, NAMED.Black, 'base-point');
  drawArcArrow(plot, plot.group(g, { 'data-testid': 'theta1-arc' }), arm.arcs.theta1, { color: NAMED.Red, headSize: ARROWHEAD, pointSize: POINT });
  if (arm.theta1Label.visible) thetaLabel(g, 1, arm.theta1Label.at, NAMED.Red, 'theta1-label');
  // Rotate[{Rectangle[…], If[r2 >= 1, {Black, Text["Robot Arm", …]}]}, Theta1 + Theta2, elbow]
  stadium(g, arm.link2, 'link-2');
  if (arm.robotArm.link === 2) rotatedText(g, 'Robot Arm', arm.robotArm.anchor, arm.robotArm.angle, arm.robotArm.about, { testid: 'robot-arm-label' });
  // {Black, Point[{elbow}]}, Blue, myArrowArc[elbow, l/3, {Theta1, Theta1 + Theta2}], If[Abs[Theta2] > π/4, Text[θ₂, …]]
  plot.point(g, arm.elbow, POINT, NAMED.Black, 'elbow-point');
  drawArcArrow(plot, plot.group(g, { 'data-testid': 'theta2-arc' }), arm.arcs.theta2, { color: NAMED.Blue, headSize: ARROWHEAD, pointSize: POINT });
  if (arm.theta2Label.visible) thetaLabel(g, 2, arm.theta2Label.at, NAMED.Blue, 'theta2-label');
}

/** The region: one translucent polygon per sheet (overlaps darker, D-DN-02) and the opaque outline. */
function drawRegion(region) {
  L.region.replaceChildren();
  L.outline.replaceChildren();
  if (!region.degenerate) {
    region.sheets.forEach((s, i) => plot.polygon(L.region, s.world, { fill: REGION_RGB, fillOpacity: REGION_STYLE.opacity, testid: `region-sheet-${i + 1}` }));
  }
  plot.polygon(L.outline, region.boundary, { stroke: REGION_RGB, testid: 'region-boundary' });
}

function run() {
  result = evaluate(state);
  evaluations++;
  drawArm(result.arm);
  drawRegion(result.region);
  locators.redraw();
}

// ---- the invisible end-effector locator {{pEnd, {2, 0}}, {-2, -2}, {2, 2}, Locator, Appearance -> None} (Q-DN-01)
const clampPEnd = ([x, y]) => [
  Math.min(Math.max(x, PEND_RANGE[0][0]), PEND_RANGE[1][0]), Math.min(Math.max(y, PEND_RANGE[0][1]), PEND_RANGE[1][1]),
];
const movePEnd = (p) => {
  state.pEnd = clampPEnd(p);
  locators.redraw(); // the body never refers to pEnd: nothing else changes (N-DN-03)
};
const locators = addLocators(plot, {
  names: ['pEnd'],
  get: () => state.pEnd,
  appearance: () => null,
  pickAnywhere: true, // LocatorPane: a press anywhere in the plot moves the (only) locator there (D-DN-05)
  keyStep: 0.05,
  describe: () => 'end-effector locator (has no effect, as in the original); arrow keys move it',
  onMove: (_n, p) => movePEnd(p),
});

// ---- controls (ControlPlacement -> Left), in the original's order --------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const cORwCtl = controls.setterBar({
  name: 'cORw', label: 'norm space', value: state.cORw,
  options: NORM_SPACES.map((v) => ({ value: v })),
  onChange: (v) => { state.cORw = v; run(); },
});
const pCtl = controls.setterBar({
  name: 'p', label: 'norm type', value: state.p,
  options: NORM_TYPES.map((v) => ({ value: v, label: v === Infinity ? '∞' : String(v) })),
  onChange: (v) => { state.p = v; run(); },
});
// {{bound, 1/2, "d"}, 0.01, π, 0.01, ImageSize -> 80, Appearance -> "Labeled"}: the exact opening 1/2 shows as "1/2"
const parseTyped = (t) => {
  const s = String(t).trim().replace(/[−–]/g, '-');
  if (/^(Pi|π)$/.test(s)) return Math.PI;
  const f = parseFraction(s);
  if (f) return f.num / f.den;
  return s === '' ? NaN : Number(s);
};
const boundCtl = controls.slider({
  name: 'bound', label: 'd', ...BOUND_RANGE, steps: 'mma', value: state.bound,
  format: (v, { moved }) => (!moved && v === 0.5 ? '1/2' : mmaSliderText(v, { moved, realValues: true })),
  parse: parseTyped,
  onInput: (v) => { state.bound = v; run(); },
});
// {{r1, 1, "r₁"}, 0, 2, 0.01, ImageSize -> 80, Appearance -> "Labeled"}
const r1Ctl = controls.slider({
  name: 'r1', label: 'r1', ...R1_RANGE, steps: 'mma', value: state.r1, parse: parseTyped,
  onInput: (v) => { state.r1 = v; run(); },
});
r1Ctl.row.querySelector('.ctl-label').innerHTML = 'r<sub>1</sub>';
// {{p1, {1, 0}, "θ₁"}, (makeDialControl[#1, {0, 0}, Red] &)}, {{p2, {0, 1}, "θ₂"}, (makeDialControl[#1, {0, 0}, Blue] &)}
const dialOpts = { imageSize: 120, setter: 'normalize', arc: 'myArrowArc2', keyStep: 0.05, labels: 'stacked' };
const p1Dial = makeDialControl(controls, {
  name: 'p1', label: 'θ₁', color: NAMED.Red, value: state.p1, ...dialOpts,
  onInput: (pt) => { state.p1 = pt; run(); },
});
const p2Dial = makeDialControl(controls, {
  name: 'p2', label: 'θ₂', color: NAMED.Blue, value: state.p2, ...dialOpts,
  onInput: (pt) => { state.p2 = pt; run(); },
});
for (const d of [p1Dial, p2Dial]) d.row.querySelector('.ctl-label').style.fontStyle = 'italic';

/**
 * Shows the state in the controls (programmatic: no evaluation). A value outside a setter's options selects none
 * (Q-DN-07). d = 0.5 and r1 = 1 are shown as the exact values "1/2" and "1" (the initial settings and all six
 * snapshots hold exact Rational[1, 2] and 1); other values as moved machine reals.
 */
function showState() {
  cORwCtl.set(state.cORw);
  pCtl.set(state.p);
  boundCtl.set(state.bound, { moved: state.bound !== 0.5 });
  r1Ctl.set(state.r1, { moved: state.r1 !== 1 });
  p1Dial.set(state.p1);
  p2Dial.set(state.p2);
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  showState();
  run();
});

run();

// ---- test / automation hook (port addition A-DN-03) ----------------------------------------------------------
const clone = (x) => structuredClone(x);
const summary = () => ({
  locals: { ...result.locals },
  mode: result.region.mode,
  sheetCount: result.region.sheets.length,
  areas: result.region.sheets.map((s) => s.area),
  totalArea: result.region.totalArea,
  degenerate: result.region.degenerate,
  boundaryPoints: result.region.boundary.length,
  elbow: result.arm.elbow.slice(),
  tip: result.arm.tip.slice(),
  robotArmLink: result.arm.robotArm.link,
});
window.__demo = {
  name: 'distance-norms',
  getState: () => clone(state),
  view: summary,
  /** the region as drawn: sheets (parameter and world polygons, b range, area) and the outline */
  region: () => clone(result.region),
  arm: () => clone(result.arm),
  evaluations: () => evaluations,
  /** set Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
  setState: (partial) => { state = { ...state, ...clone(partial) }; showState(); run(); return clone(state); },
  /** move a locator as one front-end update: 'pEnd' (plot), 'p1' / 'p2' (dials: pointer position, then Normalize) */
  moveLocator: (name, p) => {
    if (name === 'pEnd') movePEnd(p);
    return clone(state);
  },
  worldToClient: (p) => plot.worldToClient(p),
  dialToClient: (name, p) => (name === 'p1' ? p1Dial : p2Dial).plot.worldToClient(p),
  ready: true,
};
