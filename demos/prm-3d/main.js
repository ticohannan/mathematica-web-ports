// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/main.js — page: the Manipulate (ControlPlacement -> Top, the four Rows of the original), its body
// model.js evaluate and the two pictures "robot workspace" and "robot phase space" drawn by view3d.js, with the
// Dynamic view points of both pictures (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Row, Control, VerticalSlider, Slider } from '../../shared/manipulate.js';
import { Style, Subscript, Italic } from '../../shared/graphics.js';
import { addButton, addCheckbox } from '../../shared/ui-extra.js';
import { flatten } from '../../shared/graphics3d.js';
import {
  initialState, evaluate, stateFromSettings, cloneState, PAD_MIN, PAD_MAX, THETA_SLIDER, R_SLIDER, PROGRESS_SLIDER, Z_SLIDER,
} from './model.js';
import { PrmViews } from './view3d.js';

let page = null, evaluations = 0;
const views = PrmViews({
  onViewPoint: (k, vp) => { page.state[`viewPoint${k}`] = vp; },
  pathLabel: document.querySelector('[data-testid=path-label]'),
});
const applyViewPoints = (s, which = [1, 2]) => {
  if (which.includes(1)) views.workspace.applyViewPoint(s.viewPoint1);
  if (which.includes(2)) views.phase.applyViewPoint(s.viewPoint2);
};

// Control@{{θk, .25, "θk"}, -.1, 6.3, 0.01, ImageSize -> Small}: slider with ⊕, no value field (F-P3-01)
const theta = (k) => [[`θ${k}`, 0.25, Subscript(Style('θ', Italic), String(k))], THETA_SLIDER.min, THETA_SLIDER.max, THETA_SLIDER.step,
  { name: `Theta${k}`, label: `θ${k}`, realValues: true, animSeconds: 12 }];
// the two sphere pads (2D sliders over 3{-1,-1} … {1,1}, Q-P3-13) and the vertical sliders without a value (D-P3-07)
const pad = (v, label, html) => [[v, null, html], PAD_MIN, PAD_MAX, { label }];
const height = (v, label, html) => [[v, 0, html], Z_SLIDER.min, Z_SLIDER.max, { ControlType: VerticalSlider, label }];
// Buttons and the check box evaluate at once; the sliders, pads and vertical sliders at most once per animation frame
// while they move (throttle 'frame', D-P3-06)
const button = (v, name, label) => [[v, false], Control((controls, o) => {
  addButton(controls, { name, label, parent: o.parent, onClick: () => { page.state[v] = true; page.run(); } });
  return { set() {} };
})];
const checkbox = (controls, o) => {
  const api = addCheckbox(controls, { name: o.name, label: o.label, value: o.value, parent: o.parent, onChange: (x) => { page.state[o.name] = x; page.run(); } });
  api.row.classList.add('p3-check');
  api.row.style.flexDirection = 'row-reverse';
  return { get: api.get, set: api.set };
};

page = Manipulate({
  name: 'prm-3d',
  initial: initialState,
  body: (s, { controlActive, rng }) => {
    evaluations++;
    const r = evaluate(s, rng, { controlActive });
    return { state: r.state, view: r.view, graphics: [r.view.workspace, r.view.phase] };
  },
  graphics: [{ id: 'view-workspace', renderer: views.workspace }, { id: 'view-phase', renderer: views.phase }],
  ControlActive: true,
  throttle: 'frame',
  random: true, // A-P3-03: unseeded like the original; ?seed=N for reproducible runs
  controls: [
    Row([1, 2, 3].map(theta), { name: 'theta' }),
    Row([
      pad('Obstaxy', 'blue_xy', Subscript('blue', Style('xy', Italic))), height('Obstaz', 'blue_z', Subscript('blue', Style('z', Italic))),
      pad('Obstbxy', 'yellow_xy', Subscript('yellow', Style('xy', Italic))), height('Obstbz', 'yellow_z', Subscript('yellow', Style('z', Italic))),
      [['showConfigObs', false, 'show configuration space obstacles'], Control(checkbox)],
    ], { name: 'obstacles' }),
    // Button["add 100 vertices", addPoints = True], Button["restart", ...], Button["new goal", ...], radius (F-P3-05 … 08)
    Row([
      button('addPoints', 'addPoints', 'add 100 vertices'), button('restart', 'restart', 'restart'), button('newgoal', 'newgoal', 'new goal'),
      [['r', 1.5, 'radius'], R_SLIDER.min, R_SLIDER.max, R_SLIDER.step, { Appearance: 'Labeled', realValues: true, animSeconds: 20 }],
    ], { name: 'roadmap' }),
    // {{progress, 0, "progress"}, 0, 1, 0.01, ControlType -> Slider, ImageSize -> 500}: no ⊕, no value (F-P3-09)
    [['progress', 0, 'progress'], PROGRESS_SLIDER.min, PROGRESS_SLIDER.max, PROGRESS_SLIDER.step, { ControlType: Slider, realValues: true }],
  ],
  resetStops: true,
  hook: { // port addition A-P3-02
    copy: (x) => JSON.parse(JSON.stringify(x)),
    loadState: (c) => loadState,
    /** a state stored in the original (snapshot Settings, plain doubles) */
    loadSettings: () => (settings) => loadState(stateFromSettings(settings)),
    /** colours of the start, goal and moving robots (their base cylinders) as drawn */
    robotColors: (c) => () => {
      const cyl = flatten(c.view.workspace).filter((p) => p.type === 'cylinder' && p.radius === 1 / 8);
      return { start: cyl[0].color, goal: cyl[1].color, moving: cyl[2].color, startOpacity: cyl[0].opacity, movingOpacity: cyl[2].opacity };
    },
    /** non-white fraction of a canvas ('workspace' | 'phase'); without an argument the smaller of the two (no forced render) */
    inkFraction: () => (which) => (which ? viewOf(which).inkFraction() : Math.min(views.workspace.inkFraction(), views.phase.inkFraction())),
    camera: () => (which = 'workspace') => viewOf(which).camera(),
    volumeCount: () => views.volumeCount,
    evaluations: () => () => evaluations,
    webgl: () => [views.workspace, views.phase].every((v) => !!v.viewer.renderer.getContext()),
  },
});
for (const [name, cls] of [['θ1', 'p3-theta'], ['θ2', 'p3-theta'], ['θ3', 'p3-theta'], ['r', 'p3-radius'], ['progress', 'p3-progress']]) page.controls.get(name).row.classList.add(cls);
for (const name of ['Obstaz', 'Obstbz']) page.controls.get(name).row.querySelector('.ctl-vvalue').hidden = true;
// "Initial settings" (A-P3-01): the stored specifications, including both view points
document.getElementById('reset').addEventListener('click', () => applyViewPoints(page.state));

const viewOf = (which) => (which === 'phase' ? views.phase : views.workspace);
/** loadState(partial model state): like setState, with the sliders shown unmoved and the view points applied */
function loadState(partial) {
  const p = JSON.parse(JSON.stringify(partial));
  page.setState(p, { moved: false });
  applyViewPoints(page.state, [1, 2].filter((k) => p[`viewPoint${k}`])); // a rotation writes the camera's view point back
  return cloneState(page.state);
}
