// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulator-workspaces/main.js — page: the Manipulate controls at the left (joint slider grid, three
// IntervalSliders, the robot popup menu), the model's Graphics3D (robot and the nine translucent workspace surfaces)
// drawn by shared/graphics3d-view.js (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Delimiter, Control, Rule, PopupMenu, IntervalSlider } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { Controls, el } from '../../shared/ui.js';
import { TYPE_NAMES, initialState, initialSettings, cloneState, selectType, evaluate, jointLabels, drawnGraphic, VIEWPOINT, MW_ZOOM } from './model.js';

let cache = null, evaluations = 0, recomputes = 0, computes = 0;

/**
 * Dynamic[Grid[Table[{Subscript["d" | "Theta", i], Slider[params[[i]] = 0.5; Dynamic[params[[i]]], {0, 1, 0.01},
 * ImageSize -> 160]}, {i, dof}]]]: plain sliders (no value, no ⊕), values 0 + k·0.01. Built for the current robot (in
 * `after`); the model resets params to 0.5 when the robot changes (selectType, Q-MW-01).
 */
const gridBox = el('div', { class: 'mw-joints', 'data-testid': 'joint-grid' });
let jointCtl = [], builtType = null;
function buildJointGrid(ctx, onInput) {
  gridBox.replaceChildren();
  const gc = new Controls(gridBox);
  builtType = ctx.state.Type;
  jointCtl = jointLabels(builtType).map((lab, i) => {
    const c = gc.slider({
      name: `params-${i + 1}`, label: lab, min: 0, max: 1, step: 0.01, steps: 'mma', labeled: false, plus: false,
      value: ctx.state.params[i],
      onInput: (v) => { const p = ctx.state.params.slice(); p[i] = v; onInput(p); },
    });
    const lbl = c.row?.querySelector('.ctl-label') ?? gridBox.querySelectorAll('.ctl-label')[i];
    if (lbl) lbl.innerHTML = `<span class="${lab[0] === 'θ' ? 'mw-theta' : ''}">${lab[0]}</span><sub>${i + 1}</sub>`;
    return c;
  });
}
let gridInput = null;
const jointGrid = (controls, { onInput }) => {
  controls.root.append(gridBox);
  gridInput = onInput;
  return { get: () => jointCtl.map((c) => c.get()), set: (v) => jointCtl.forEach((c, i) => c.set(v[i], false)) };
};

const SUB = ['₁', '₂', '₃'];
// {{r1, {0.5, 1.5}}, -3.1, 3.1, 0.1, ControlType -> IntervalSlider, Method -> "Push", MinIntervalSize -> 0.1}; values set
// by a reset or setState are shown as machine reals
const range = (i) => [[`r${i + 1}`, [0.5, 1.5], `r${SUB[i]}`], -3.1, 3.1, 0.1,
  { ControlType: IntervalSlider, Method: 'Push', MinIntervalSize: 0.1, steps: 'mma', look: 'mma', Moved: () => true }];

Manipulate({
  name: 'manipulator-workspaces',
  initial: initialState, // the live state the notebook opens with (F-MW-09)
  initialSettings, // ⊕ → Initial Settings: the elbow robot arm (K-MW-04)
  body: (st) => {
    const r = evaluate(st, cache);
    cache = r.cache;
    evaluations++;
    if (r.view.recomputed) recomputes++;
    if (r.view.computed) computes++;
    return { state: r.state, view: r.view, graphics: drawnGraphic(r.view) };
  },
  graphics: {
    id: 'view',
    // SphericalRegion with the fitted zoom, refitted when the bounds change, keeping the user's rotation (D-MW-04,
    // D-MW-07); Thickness[Large] 3 px, lines 1 px (D-MW-05); Mathematica's documented lights (D-MW-02)
    renderer: View3D({
      ViewPoint: VIEWPOINT, zoom: MW_ZOOM, thickPx: 3, initialBox: [[-2.2, 2.2], [-2.2, 2.2], [-0.4, 1]], resetView: true,
      testid: 'scene-canvas-workspace', label: 'Robot arm and its workspace (3D, drag to rotate)',
    }),
  },
  // ControlPlacement -> Left
  controls: [
    [['params', [0.5, 0.5, 0.5]], Control(jointGrid)],
    Delimiter, range(0), range(1), range(2), Delimiter,
    [['Type', 1, ''], TYPE_NAMES.map((n, i) => Rule(i + 1, n)),
      { ControlType: PopupMenu, Assign: (s, v) => { const n = selectType(s, v); s.Type = n.Type; s.params = n.params; } }],
  ],
  after: (ctx) => { if (ctx.state.Type !== builtType) buildJointGrid(ctx, gridInput); },
  /**
   * setState(partial state of model.js): Type (through selectType, as the popup: a new robot resets the joints first),
   * then params, r1, r2, r3 (and, for tests, TypeOld, r1old…); one evaluation.
   */
  merge: (state, p) => {
    const s = p.Type !== undefined ? selectType(state, p.Type) : cloneState(state);
    for (const k of ['params', 'r1', 'r2', 'r3', 'r1old', 'r2old', 'r3old']) if (p[k]) s[k] = p[k].slice();
    if (p.TypeOld !== undefined) s.TypeOld = p.TypeOld;
    return s;
  },
  hook: { // port addition A-MW-03
    view: (view) => ({
      pm: view.pm, o3: view.o3, Td: view.Td, box: view.box, recomputed: view.recomputed,
      surfaces: view.ws.surfaces.map((s) => ({ vertices: s.grid.flat().length, quads: s.quads.length, boundary: s.boundary.length, mesh: s.mesh.map((l) => l.length) })),
      robotFrames: view.robotPrims.filter((p) => p.type === 'line' && p.thickness === 'Large' && p.color && p.color[0] === 1 && p.color[1] === 0).length / 5,
      options: view.graphic.options,
    }),
    primitives: (c) => () => JSON.parse(JSON.stringify(c.view.robotPrims)),
    labels: () => () => [...gridBox.querySelectorAll('.ctl-label')].map((l) => l.textContent),
    recomputes: () => () => recomputes,
    computes: () => () => computes,
    evaluations: () => () => evaluations,
    inkFraction: (c) => () => c.renderer().inkFraction(),
    cameraPosition: (c) => () => c.renderer().viewer.camera.position.toArray(),
    camera: (c) => () => c.renderer().camera(),
    /** RGB of the pixel where world point p is drawn (colour checks against the snapshots) */
    pixelAt: (c) => (p) => c.renderer().pixelAt(p),
  },
});
