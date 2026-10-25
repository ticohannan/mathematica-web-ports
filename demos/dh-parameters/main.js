// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dh-parameters/main.js — page: the 16 Manipulate controls (3 setter bars, 13 labelled sliders with ⊕ panels,
// 3 delimiters) at the left, the model's Graphics3D drawn by shared/graphics3d-view.js (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Delimiter } from '../../shared/manipulate.js';
import { View3D } from '../../shared/graphics3d-view.js';
import { mmaSliderText } from '../../shared/ui.js';
import { piFraction, parsePiFraction } from '../../shared/mma-text.js';
import { initialState, cloneState, evaluate, origin, ANGLE_DEN, N_MIN, N_MAX, VIEWPOINT, DH_ZOOM } from './model.js';

const SUB = ['₁', '₂', '₃'];
const movedShown = {}; // what the d, r, g value fields show: exact default ("1") or moved machine value ("1.")

/** a typed angle: "5π/32", "5 Pi/32", "-π/2" (exact), or a number (radians) → the slider's integer n of nπ/32 */
function parseAngle(text) {
  const p = parsePiFraction(text);
  if (p) return (p.num * ANGLE_DEN) / p.den;
  const t = String(text).trim().replace(/[−–]/g, '-');
  if (t === '' || !Number.isFinite(Number(t))) return null;
  return (Number(t) * ANGLE_DEN) / Math.PI;
}
// {{Theta1, 5π/32, "θ1"}, -π, π, π/32, Appearance -> "Labeled"}: the positions are the exact values nπ/32
const angle = (v, i, label) => [[`${v}.${i}`, 0, label], N_MIN, N_MAX, 1,
  { Appearance: 'Labeled', name: `${v}${i + 1}`, realValues: false, format: (n) => piFraction(n, ANGLE_DEN), parse: parseAngle, animSeconds: 8 }];
// {{d1, 1, "d1"}, 0, 1, 0.01, Appearance -> "Labeled"}: min + k·0.01; exact default "1", moved "1." (Q-DH-05)
const length = (v, i, label) => {
  const name = i === null ? v : `${v}${i + 1}`;
  const get = (s) => (i === null ? s.exact[v] : s.exact[v][i]);
  return [[i === null ? v : `${v}.${i}`, 0, label], 0, 1, 0.01, {
    Appearance: 'Labeled', name,
    format: (x, { moved }) => { movedShown[name] = moved; return mmaSliderText(x, { moved, realValues: true }); },
    Assign: (s, x) => { if (i === null) { s[v] = x; s.exact[v] = !movedShown[name]; } else { s[v][i] = x; s.exact[v][i] = !movedShown[name]; } },
    Moved: (s) => !get(s),
  }];
};

let evaluations = 0;
const PARTS = ['ground', 'joint1', 'joint2', 'joint3', 'gripper'];
const clone = (x) => JSON.parse(JSON.stringify(x));

Manipulate({
  name: 'dh-parameters',
  initial: initialState,
  body: (st) => { evaluations++; const view = evaluate(st); return { view, graphics: view.graphic }; },
  graphics: {
    id: 'view',
    // ImageSize -> 425, SphericalRegion -> True with the fitted zoom (D-DH-01, D-DH-05); Thickness[Large] 3 px (D-DH-03);
    // Mathematica's documented lights on the displayed colour values (D-DH-02)
    renderer: View3D({ ImageSize: 425, ViewPoint: VIEWPOINT, zoom: DH_ZOOM, thickPx: 3, testid: 'scene-canvas-workspace', label: 'Robot arm with its DH frames (3D, drag to rotate)' }),
  },
  // the source sets no ControlPlacement; the snapshots show them at the left (N-DH-03)
  controls: [0, 1, 2].flatMap((i) => [
    [[`j.${i}`, 'Revolute', `j${SUB[i]}`], ['Revolute', 'Prismatic'], { name: `j${i + 1}` }],
    angle('theta', i, `θ${SUB[i]}`), length('d', i, `d${SUB[i]}`), length('r', i, `r${SUB[i]}`), angle('alpha', i, `α${SUB[i]}`),
    Delimiter,
  ]).concat([length('g', null, 'grip')]),
  resetStops: true,
  /** setState(partial state of model.js: j, theta, d, r, alpha, g, exact): like the controls, one evaluation */
  merge: (state, partial) => {
    const next = cloneState(state);
    for (const k of ['j', 'theta', 'd', 'r', 'alpha']) if (partial[k]) next[k] = partial[k].slice();
    if (partial.g !== undefined) next.g = partial.g;
    if (partial.exact) next.exact = { d: (partial.exact.d ?? next.exact.d).slice(), r: (partial.exact.r ?? next.exact.r).slice(), g: partial.exact.g ?? next.exact.g };
    return next;
  },
  hook: { // port addition A-DH-02
    view: (view) => {
      const counts = {};
      for (const p of view.prims) counts[p.type] = (counts[p.type] || 0) + 1;
      return { box: view.box, counts, parts: PARTS.map((p, i) => ({ part: p, count: view.parts[i].length })) };
    },
    /** T1, T2, T3, T1.T2, T1.T2.T3 and the frame origins */
    transforms: (c) => () => clone({ T1: c.view.T1, T2: c.view.T2, T3: c.view.T3, T12: c.view.T12, T123: c.view.T123, origins: [c.view.T1, c.view.T12, c.view.T123].map(origin) }),
    /** the flattened primitives of one part (ground, joint1, joint2, joint3, gripper), as data */
    primitives: (c) => (part) => clone(c.view.parts[PARTS.indexOf(part)]),
    inkFraction: (c) => () => c.renderer().inkFraction(),
    cameraPosition: (c) => () => c.renderer().viewer.camera.position.toArray(),
    camera: (c) => () => c.renderer().camera(),
    evaluations: () => () => evaluations,
  },
});
