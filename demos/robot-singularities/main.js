// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/main.js — page: controls (popup, joint slider grid, check boxes, setter), the two
// Graphics3D pictures of the model (workspace and phase space) drawn by shared/graphics3d-view.js (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Control, Rule, PopupMenu } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { el } from '../../shared/ui.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { TYPE_NAMES, typeOf, sliderSpec, jacobianFor } from './robots.js';
import { initialState, evaluate, selectType } from './model.js';
import { Graphics3D, Group3D, flatten } from './g3d.js';
import { svd3, matrixRank } from './svd3.js';

const VIEWPOINT = [1.3, -2.4, 2]; // Mathematica's default ViewPoint
const WS_ZOOM = 1.26; // D-RS-01
const PH_ZOOM = 1.04; // phase box width / ground width as measured on snapshot 1 (D-RS-01)

// ---- the slider grid and the options column (ControlPlacement -> Top) ----------------------------------------------
const row = el('div', { class: 'rs-row' });
const sliderBox = el('div', { class: 'rs-sliders', 'data-testid': 'slider-grid' });
const optionsBox = el('div', { class: 'rs-options' });
row.append(sliderBox, optionsBox);

let sliders = [], builtType = null, gridInput = null, M = null;
/**
 * The Dynamic Grid of joint sliders: θ_i for a revolute joint (-1.01π … 1.01π, step 0.01π), d_i for a prismatic
 * joint (0 … 1, step 0.01), each with its value shown (Appearance -> "Labeled"). Rebuilt when the robot changes.
 */
function buildSliders(state) {
  sliderBox.replaceChildren();
  builtType = state.iType;
  const Type = typeOf(state.iType);
  sliders = [0, 1, 2].map((i) => {
    const spec = sliderSpec(Type, i);
    const sym = el('span', { class: 'rs-sym', 'data-testid': `label-params-${i + 1}` });
    sym.innerHTML = `${spec.label}<sub>${i + 1}</sub>`;
    // The range input works on the step index k = 0..n (the browser's own decimal stepping of min + k step
    // cannot reach 1.01π: min + 202 step rounds one ulp above max), the value is min + k step (max at k = n).
    const n = Math.round((spec.max - spec.min) / spec.step);
    const range = el('input', {
      type: 'range', min: 0, max: n, step: 1, value: 0,
      'data-testid': `slider-params-${i + 1}`, 'aria-label': `${spec.label}${i + 1}`,
    });
    const field = el('input', {
      type: 'text', class: 'ctl-field', inputmode: 'decimal', value: '',
      'data-testid': `value-params-${i + 1}`, 'aria-label': `${spec.label}${i + 1} value`,
    });
    range.addEventListener('input', () => {
      // Slider[Dynamic[params[[i]]], {min, max, step}]: value = min + k step, max at the right end (D-RS-06)
      const k = Number(range.value);
      setParam(i, k >= n ? spec.max : spec.min + k * spec.step);
    });
    field.addEventListener('change', () => {
      const v = Number(field.value);
      if (Number.isFinite(v)) setParam(i, Math.min(Math.max(v, spec.min), spec.max));
      else showParams(M.state);
    });
    sliderBox.append(sym, range, field);
    return { range, field, spec };
  });
  showParams(state);
}

function showParams(state) {
  sliders.forEach(({ range, field, spec }, i) => {
    range.value = String(Math.round((state.params[i] - spec.min) / spec.step));
    if (document.activeElement !== field) field.value = mmaNumberString(state.params[i]);
  });
}

function setParam(i, v) {
  const p = M.state.params.slice();
  p[i] = v;
  gridInput(p);
}
const sliderGrid = (controls, { onInput }) => {
  controls.root.append(row);
  gridInput = onInput;
  return { get: () => M.state.params, set: () => {} }; // shown after every evaluation (`after`)
};

// ---- the two pictures -----------------------------------------------------------------------------------------------
/**
 * Workspace: the cached singular set (redrawn only when the stored sets change), then ground, robot and manipulability
 * ellipsoid. Phase space: the cached singular set, then the joint point (and its ellipsoid sphere), inside the unit cube
 * of BoxRatios {1, 1, 1}, clipped at the PlotRange, with the box, ticks and AxesLabel of the stored options.
 */
function pictures(state, view) {
  const key = `${state.iTypeOld}|${state.isJLinearVelOld}`;
  const ws = Graphics3D([Group3D(view.singSpace, { key }), Group3D([view.base, view.manip ? view.manip.graphics : null])], view.workspace.options);
  const opt = view.phaseOpt;
  const ph = Graphics3D([Group3D(view.singPhase, { key: `${key}|${opt.PlotLabel}` }), Group3D(view.phase.content[1])],
    { ...opt, AxesLabel: opt.AxesLabel.map((L) => `${L.sym}<sub>${L.sub}</sub>`) });
  return [ws, ph];
}

let evaluations = 0;
const clone = (x) => JSON.parse(JSON.stringify(x));
function summary(g) {
  const counts = {};
  for (const p of flatten(g)) counts[p.type] = (counts[p.type] || 0) + 1;
  return counts;
}

M = Manipulate({
  name: 'robot-singularities',
  initial: initialState,
  body: (st) => { const r = evaluate(st); evaluations++; return { state: r.state, view: r.view, graphics: pictures(r.state, r.view) }; },
  graphics: [
    // SphericalRegion with the measured zoom, refitted when the bounds change (D-RS-01); Thick 3 px, lines 1 px
    // (D-RS-03); Mathematica's documented lights (D-RS-02)
    { id: 'view-workspace', renderer: View3D({ ViewPoint: VIEWPOINT, zoom: WS_ZOOM, refitDigits: 4, initialBox: [[-2.2, 2.2], [-2.2, 2.2], [-0.4, 4.15]], testid: 'scene-canvas-workspace', label: 'Workspace (3D, drag to rotate)' }) },
    {
      id: 'view-phase',
      renderer: View3D({
        ViewPoint: VIEWPOINT, zoom: PH_ZOOM, size: () => 1, clipPadding: 1e-4, plotLabelElement: '[data-testid=plotlabel-phase]',
        tickClass: 'rs-tick', axisLabelClass: 'rs-axis', testid: 'scene-canvas-phase', label: 'Phase space (3D, drag to rotate)',
      }),
    },
  ],
  controls: [
    [['iType', 2, ''], TYPE_NAMES.map((n, i) => Rule(i + 1, n)), { ControlType: PopupMenu, Assign: (s, v) => Object.assign(s, selectType(s, v)) }],
    [['params', null], Control(sliderGrid)],
    [['showRobot', false, 'show robot'], [false, true], { parent: optionsBox }],
    [['showManipulability', false, 'show manipulability ellipsoid'], [false, true], { parent: optionsBox }],
    [['isJLinearVel', 'Linear', 'velocity singularities'], ['Linear', 'Angular'], { parent: optionsBox }],
  ],
  after: (ctx) => { if (ctx.state.iType !== builtType) buildSliders(ctx.state); else showParams(ctx.state); },
  /** setState({iType, params, showRobot, showManipulability, isJLinearVel}): like the controls (a new iType resets params first) */
  merge: (state, partial) => {
    const s = partial.iType !== undefined ? selectType(state, partial.iType) : state;
    const { iType, ...rest } = partial;
    return { ...s, ...rest };
  },
  hook: { // port addition A-RS-03
    view: (view) => ({ o3: view.o3, workspaceBox: view.workspaceBox, phaseOpt: clone(view.phaseOpt), workspace: summary(view.workspace), phase: summary(view.phase) }),
    inkFraction: (c) => (which = 'workspace') => c.renderer(which === 'phase' ? 1 : 0).inkFraction(),
    jacobian: (c) => () => jacobianFor(c.state.iType, c.state.isJLinearVel, c.state.params),
    svd: (c) => () => {
      const J = jacobianFor(c.state.iType, c.state.isJLinearVel, c.state.params);
      const d = svd3(J);
      return { J, ...d, Sigma: d.S.map((s) => s / 2), rank: matrixRank(d.S.map((s) => s / 2)) };
    },
    ellipsoid: (c) => () => (c.view.manip ? { Sigma: c.view.manip.Sigma, U: c.view.manip.U, rank: c.view.manip.rank, center: c.view.o3, prims: summary(c.view.manip.graphics) } : null),
    singularSummary: (c) => () => ({
      iTypeOld: c.state.iTypeOld, isJLinearVelOld: c.state.isJLinearVelOld, phaseLabel: c.view.phaseOpt.PlotLabel,
      workspace: summary(c.view.singSpace), phase: summary(c.view.singPhase), recomputed: c.view.recomputed,
    }),
    evaluations: () => () => evaluations,
    cameraPosition: (c) => (which = 'workspace') => c.renderer(which === 'phase' ? 1 : 0).viewer.camera.position.toArray(),
    /** RGB of the workspace pixel where world point p is drawn (for colour checks against the snapshots) */
    workspacePixelAt: (c) => (p) => c.renderer(0).pixelAt(p),
  },
});
