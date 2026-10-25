// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distance-norms/main.js — the Manipulate: norm space, norm type, d, r1, the two dials, the invisible end-effector
// locator and the ParametricPlot picture (Prolog arm, frame and axes, the shaded region and its outline), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, Rule, hookCopy } from '../../shared/manipulate.js';
import { Style, Subscript, Italic, Red, Blue } from '../../shared/graphics.js';
import { mmaSliderText } from '../../shared/ui.js';
import { parseFraction } from '../../shared/mma-text.js';
import { makeDialControl } from '../common/dial-control.js';
import {
  initialState, evaluate, picture, LAYOUT_RANGE, NORM_SPACES, NORM_TYPES, BOUND_RANGE, R1_RANGE, PEND_RANGE, IMAGE,
} from './model.js';

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
  if (!(s === last.s && s.pEnd !== last.pEnd && inputs.every((x, i) => x === last.inputs[i]))) {
    evaluations++;
    const view = evaluate(s);
    last.result = { view, graphics: picture(view) }; // ParametricPlot[…, Prolog -> arm] (model.js picture)
  }
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
  graphics: { PlotRange: LAYOUT_RANGE, ImageSize: IMAGE.imageSize, PlotRangePadding: 0, label: 'Two-link arm and the set of points within distance d of its configuration' },
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
    /** the picture as last drawn (JSON: structuredClone, the copy above, refuses the cached part's function) */
    graphics: (c) => (k = 0) => hookCopy(c.graphics(k)),
    /** set Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
    setState: (c) => (partial) => { c.setState(structuredClone(partial)); showExact(c); return structuredClone(c.state); },
    /** move a locator as one front-end update: 'pEnd' (plot); the dials have no hook move */
    moveLocator: (c) => (name, p) => { if (name === 'pEnd') c.moveLocator('pEnd', p); return structuredClone(c.state); },
    dialToClient: (c) => (name, p) => c.controls.get(name).plot.worldToClient(p),
  },
});
