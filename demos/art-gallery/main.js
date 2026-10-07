// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/art-gallery/main.js — page: controls, SVG drawing, locator dragging (browser only).
import { Controls } from '../../shared/ui.js';
import { createPlot, addLocators } from '../../shared/svg-plot.js';
import { NAMED } from '../../shared/mma-colors.js';
import { initialState, evaluate, ENVIRONMENTS, GUARD_COUNTS, GUARD_COLORS, PLOT_RANGE, IMAGE_SIZE, GUARD_RADIUS, clampPt } from './model.js';
const GRAY = NAMED.Gray, BLACK = NAMED.Black;
// PORT DEVIATION (D-AG-03): Mathematica's Thin and Thick as absolute widths at the 450-pixel image size (measured in the
// snapshots); FrameMargins -> -5 is not reproduced.
const THIN = { abs: 0.25 }; // Thin = AbsoluteThickness[0.25]
const THICK = { abs: 2 }; // Thick = AbsoluteThickness[2]

let state = initialState();
let view = null;

// Graphics[…, PlotRange -> 4{{-1,1},{-1,1}}, ImageSize -> {450, 450}] (explicit PlotRange: no padding)
const plot = createPlot(document.getElementById('graphic'), {
  plotRange: PLOT_RANGE, imageSize: IMAGE_SIZE, padding: 0,
  label: 'Gallery with the guards (coloured disks) and the region each guard sees (tinted in its colour)',
});
const L = { regions: plot.layer('regions'), env: plot.layer('env'), guards: plot.layer('guards') };

function draw() {
  for (const g of Object.values(L)) g.replaceChildren();
  const { s, reg, pts, visibleRegion } = state;
  const { env } = view;
  // Table[{cval[[i]], Opacity[0.3], Polygon@visibleRegion[[i]]}, {i, 1, s}]
  for (let i = 0; i < s; i++) {
    const region = visibleRegion[i];
    if (!region) continue; // D-AG-01: the original's region is a symbolic expression here; nothing is drawn
    const node = plot.polygon(L.regions, region, { fill: GUARD_COLORS[i], fillOpacity: 0.3, testid: `region-${i + 1}` });
    node.setAttribute('fill-rule', 'evenodd'); // PORT DEVIATION (D-AG-07): Mathematica's fill rule not verified (K-AG-06)
  }
  if (reg === 'movable obstacles') {
    // {Transparent, EdgeForm[Thin], {Polygon@bound}, {Polygon@poly1, Polygon@poly2}}
    plot.polygon(L.env, env.bound, { stroke: BLACK, thickness: THIN, testid: 'env-bound' });
    plot.polygon(L.env, env.poly1, { stroke: BLACK, thickness: THIN, testid: 'env-square' });
    plot.polygon(L.env, env.poly2, { stroke: BLACK, thickness: THIN, testid: 'env-triangle' });
  } else if (reg === 'irregular') {
    // {Transparent, EdgeForm[Thin], Polygon@irregularPoly}
    plot.polygon(L.env, env.listofPoly[0], { stroke: BLACK, thickness: THIN, testid: 'env-irregular' });
  } else {
    // {Transparent, EdgeForm[{Opacity[0.7], Gray, Thick}], Polygon@cubiclePoly}
    plot.polygon(L.env, env.listofPoly[0], { stroke: GRAY, strokeOpacity: 0.7, thickness: THICK, testid: 'env-cubicle' });
  }
  // Table[{cval[[i]], EdgeForm[{Thin, Black}], Disk[pts[[i+2]], 0.1]}, {i, 1, s}]
  for (let i = 0; i < s; i++) {
    plot.disk(L.guards, pts[i + 2], GUARD_RADIUS, { fill: GUARD_COLORS[i], stroke: BLACK, thickness: THIN, testid: `guard-${i + 1}` });
  }
  locators.redraw();
  plot.svg.dataset.reg = reg;
  plot.svg.dataset.s = String(s);
}

let lastMs = 0;
function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  lastMs = r.view.ms;
  draw();
}

// {{pts, {...}}, 4{-1,-1}, 4{1,1}, Locator, Appearance -> None}: ten invisible locators, all of them draggable
// whatever the environment and the number of guards (ORIGINAL QUIRK Q-AG-04).
// Manipulate Locator controls are LocatorPane locators, which "by default direct any click to the nearest locator"
// (Wolfram Language reference, LocatorPane): a press anywhere moves the nearest of the ten (pickAnywhere). All ten take
// part in every mode, because the original's pts list always holds all ten (Q-AG-04, lead K-AG-09).
// PORT DEVIATION (D-AG-04): the body is evaluated once per animation frame during a drag.
const NAMES = Array.from({ length: 10 }, (_, k) => `pts-${k + 1}`);
const index = (name) => Number(name.slice(4)) - 1;
const describe = (name) => {
  const k = index(name);
  if (k === 0) return 'square obstacle locator (pts 1); arrow keys move it';
  if (k === 1) return 'triangle obstacle locator (pts 2); arrow keys move it';
  return `guard ${k - 1} locator (pts ${k + 1}); arrow keys move it`;
};
const locators = addLocators(plot, {
  names: NAMES,
  get: (n) => state.pts[index(n)],
  appearance: () => null, // Appearance -> None
  keyStep: 0.05,
  pickAnywhere: true,
  describe,
  onMove: (n, p) => {
    state.pts[index(n)] = clampPt(p);
    run();
  },
});

// ---- controls (ControlPlacement Top, the Manipulate default here) ----------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const sCtl = controls.setterBar({
  name: 's', label: 'number of guards', value: state.s,
  options: GUARD_COUNTS.map((v) => ({ value: v })),
  onChange: (v) => { state.s = v; run(); },
});
const regCtl = controls.setterBar({
  name: 'reg', label: 'environment', value: state.reg,
  options: ENVIRONMENTS.map((v) => ({ value: v })),
  onChange: (v) => { state.reg = v; run(); },
});

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  sCtl.set(state.s);
  regCtl.set(state.reg);
  run();
});

run();

// ---- test / automation hook (port addition A-AG-03) -------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'art-gallery',
  getState: () => clone(state),
  /** recomputed guards, per-guard traces (nudges, quirks) and the time of the last evaluation in ms */
  view: () => clone({ recomputed: view.recomputed, traces: view.traces, ms: lastMs }),
  /** move locator n (1…10 = pts[[n]]) to world point p, as one front-end update */
  moveLocator: (n, p) => { state.pts[n - 1] = clampPt(p); run(); return clone(state); },
  setState: (partial) => { state = { ...state, ...clone(partial) }; sCtl.set(state.s); regCtl.set(state.reg); run(); },
  worldToClient: (p) => plot.worldToClient(p),
  colors: () => clone(GUARD_COLORS),
  ready: true,
};
