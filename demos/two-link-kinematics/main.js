// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/two-link-kinematics/main.js — the Manipulate: r1 slider, the two dials, elbow up?, the joint-velocity pad, the
// two invisible locators and the Graphics (workspace, manipulability ellipse, arm, velocity arcs, locator icons), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, None, Control, Checkbox } from '../../shared/manipulate.js';
import { mmaSliderText } from '../../shared/ui.js';
import { NAMED } from '../../shared/mma-colors.js';
import { makeDialControl } from '../common/dial-control.js';
import { make2VelControl } from './velocity-pad.js';
import { initialState, cloneState, evaluate, scene, PLOT_RANGE, IMAGE_SIZE, LOCATOR_RANGE } from './model.js';

// One evaluation of the body. D-TK-07: where the original computes with Indeterminate (pEnd at the origin), the
// previous state and picture stay; a state assigned through the hook's setState is kept as assigned.
let last = null, keepAssigned = false;
function body(s) {
  const r = evaluate(s);
  if (!r.indeterminate) last = { state: cloneState(r.state), view: { locals: r.locals }, graphics: scene(r.state, r.locals) };
  else if (keepAssigned) last = { ...last, state: cloneState(s) };
  return { state: cloneState(last.state), view: last.view, graphics: last.graphics };
}
const DESCR = { pEnd: 'end-effector locator (black)', pVel: 'end-effector velocity locator (green)' };
const lo = (n) => LOCATOR_RANGE[n].map((r) => r[0]), hi = (n) => LOCATOR_RANGE[n].map((r) => r[1]);
const dial = (color) => Control(makeDialControl, { color, imageSize: 140 });

Manipulate({
  name: 'two-link-kinematics',
  initial: initialState, // the live state: one evaluation of the initial settings (F-TK-16)
  body, // { state, view: { locals }, graphics: the Graphics list (model.js scene) }
  graphics: { // Graphics[…, PlotRange -> 3{{-1, 1}, {-1, 1}}, ImageSize -> 400]
    PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE,
    label: 'Two-link arm in its workspace (blue), with the manipulability ellipse, the joint angles and velocities, and the end-effector velocity (green)',
  },
  controls: [
    // {{r1, 1, "r₁"}, 0, 2, ImageSize -> 80, Appearance -> "Labeled"}: continuous; the value shown as Mathematica shows it
    [['r1', 1, 'r₁'], 0, 2, { Appearance: 'Labeled', ImageSize: 80, steps: undefined, format: (v, { moved }) => mmaSliderText(v, { moved, realValues: true }) }],
    [['pEnd', [2, 0]], lo('pEnd'), hi('pEnd'), Locator, { Appearance: None }], // drawn as the loc[…] icons
    [['pEndp', [2, 0]], None],
    [['pVel', [2, 1]], lo('pVel'), hi('pVel'), Locator, { Appearance: None }],
    [['pVelp', [1, 1]], None],
    [['p1', [1, 0], 'θ₁'], dial(NAMED.Red)], // (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> 140
    [['p2', [1, 0], 'θ₂'], dial(NAMED.Blue)],
    [['IsElbowUp', true, 'elbow up?'], [true, false], { ControlType: Checkbox }],
    [['IsElbowUpp', true], None],
    [['jointVel', [1, 0], 'joint\nvelocity'], Control(make2VelControl)], // (make2VelControl[#1] &)
  ],
  // the two invisible locators of the picture (LocatorPane picking, D-TK-06)
  locators: { keyStep: 0.05, describe: (n) => `${DESCR[n]}; arrow keys move it` },
  hook: { // port addition A-TK-03
    getState: (c) => () => cloneState(c.state),
    locals: (c) => () => JSON.parse(JSON.stringify(c.view.locals)),
    /** move the locator pEnd or pVel to world point p, as one front-end update (the locator range applies) */
    moveLocator: (c) => (name, p) => { c.moveLocator(name, p); return cloneState(c.state); },
    /** assign variables (e.g. a snapshot's Settings), then evaluate once, as the front end shows a snapshot */
    setState: (c) => (partial) => {
      const s = JSON.parse(JSON.stringify(partial));
      if ('r1' in s) c.controls.get('r1').set(s.r1, { moved: s.r1 !== 1 });
      keepAssigned = true;
      try { c.setState(s); } finally { keepAssigned = false; }
      return cloneState(c.state);
    },
    /** a point of a control's own picture (dial p1, p2 or the pad jointVel) in page pixels */
    controlToClient: (c) => (name, p) => c.controls.get(name).plot.worldToClient(p),
  },
});
