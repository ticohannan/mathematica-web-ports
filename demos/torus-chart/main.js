// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/torus-chart/main.js — page: the Manipulate (the λ slider and the two dials, ControlPlacement -> Left), its
// body model.js evaluate drawn by view3d.js (Show[manifold, config]), the test hook (browser only).
// On the shared Manipulate layer since v0.1.21 (behaviour unchanged: tests and 3D parity of scene graph and pixels).
import { Manipulate, Control } from '../../shared/manipulate.js';
import { mmaSliderText } from '../../shared/ui.js';
import { NAMED } from '../../shared/mma-colors.js';
import { makeDialControl } from '../common/dial-control.js';
import { initialState, initialSettings, cloneState, evaluate } from './model.js';
import { TorusView } from './view3d.js';

// The page opens with the notebook's saved state (λ = 2., shown "2."); Initial settings restore the stored
// specifications (λ = 0 exact, shown "0") and the default view; the evaluation they make is not counted (as before).
let opened = false, lambdaReal = true, uncounted = false, evaluations = 0;
const view = TorusView({ plotLabelEl: document.querySelector('[data-testid=plot-label]') });
// {{p1, {1, 0}, "θ"}, (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> {160, 160}}; p2 the same, "ϕ", Blue
const dial = (color) => Control(makeDialControl, { imageSize: 160, setter: 'normalize', arc: 'arrowArcCircle', labels: 'stacked', color });
const dialOf = (c, name) => c.controls.get(name === 'p1' ? 'p1' : 'p2');

const page = Manipulate({
  name: 'torus-chart',
  initial: () => {
    if (!opened) { opened = true; return initialState(); }
    lambdaReal = false; uncounted = true;
    return initialSettings();
  },
  body: (s) => { if (!uncounted) evaluations++; uncounted = false; const r = evaluate(s); return { view: r, graphics: r }; },
  graphics: { id: 'view', renderer: view },
  controls: [
    // Row[{Control@{{λ, 0, "Torus -> Plane"}, 0, 2, Appearance -> "Labeled", ImageSize -> Small}}]: continuous, ⊕ panel
    [['λ', 0, 'Torus → Plane'], 0, 2, {
      Appearance: 'Labeled', name: 'lambda', steps: null,
      format: (v, { moved }) => mmaSliderText(v, { moved: moved || lambdaReal, realValues: true }),
      Assign: (s, v) => { lambdaReal = true; s.λ = v; },
      Moved: () => lambdaReal,
    }],
    [['p1', [1, 0], 'θ'], dial(NAMED.Red)],
    [['p2', [1, 0], 'ϕ'], dial(NAMED.Blue)],
  ],
  /** setState: assign variables (e.g. a snapshot's Settings), then evaluate once, as the front end shows a snapshot */
  merge: (state, partial) => { if ('λ' in partial) lambdaReal = true; return { ...cloneState(state), ...partial }; },
  hook: { // port addition A-TC-03
    view: (r) => ({
      θ: r.θ, φ: r.φ, ball: r.config.center.slice(), radius: r.config.radius, label: r.label,
      surface: view.sampled ? { n: view.sampled.n, vertices: view.sampled.positions.length / 3, triangles: view.sampled.triangles.length / 3, meshLines: view.sampled.mesh.length, zRange: view.sampled.zRange.slice() } : null,
    }),
    webgl: () => !!view.viewer,
    dialAngle: (c) => (name) => dialOf(c, name).graphics().ang,
    evaluations: () => () => evaluations,
    inkFraction: () => view.inkFraction,
    /** RGB of the canvas pixel where world point p is drawn */
    pixelAt: () => view.pixelAt,
    /** client (page) coordinates of a world point in the 3D picture */
    worldToClient: () => view.worldToClient,
    /** a point of a dial's own picture in page pixels */
    controlToClient: (c) => (name, p) => dialOf(c, name).plot.worldToClient(p),
    camera: () => view.camera,
  },
});
// Initial settings also stop the λ animation and show the default view (after the evaluation above)
document.getElementById('reset').addEventListener('click', () => { page.controls.get('λ').stop(); view.resetView(); });
