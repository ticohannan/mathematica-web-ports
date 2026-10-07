// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/car-paths/main.js — page: controls, SVG drawing, locator dragging (browser only).
import { Controls, el } from '../../shared/ui.js';
import { addButton, addRow } from '../../shared/ui-extra.js';
import { createPlot, addLocators, locatorGlyph, svgNode } from '../../shared/svg-plot.js';
import { NAMED, darker, css } from '../../shared/mma-colors.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import {
  initialState, evaluate, swapStartGoal, drawPath, drawCar, PLOT_RANGE, LOCATOR_RANGE, TYPES,
} from './carpaths.js';

let state = initialState();
let view = null;

// Graphics[..., PlotRange -> {{-15, 15}, {-10, 10}}, ImageSize -> {620, Automatic}, PlotLabel -> ...]
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: PLOT_RANGE, imageSize: 620,
  label: 'Plane with the start car (green), the goal car (red), the shortest path (orange) and the moving car (blue)',
});
// PlotLabel -> Style[Row[{...}], 14, Black], above the plot area
const labelEl = el('div', { class: 'plot-label', 'data-testid': 'plot-label', style: 'text-align:center;font-size:14px;color:#000;white-space:pre;padding-top:4px' });
graphicEl.insertBefore(labelEl, plot.svg);

const L = {
  path: plot.layer('path'), start: plot.layer('start-car'), goal: plot.layer('goal-car'),
  car: plot.layer('moving-car'), glyphs: plot.layer('glyphs'),
};
const COLOURS = { Green: NAMED.Green, Red: NAMED.Red, Blue: NAMED.Blue, Yellow: NAMED.Yellow, Black: NAMED.Black, DarkerGray: darker(NAMED.Gray) };
const ORANGE = NAMED.Orange, GRAY = NAMED.Gray;
// Thin = AbsoluteThickness[0.25] (0.25 pt = 0.25 px at the original's ImageSize); the shared 'Thin' is 0.5 px, which
// drew the construction circles much darker than snapshot 1 (darkest pixel 181 vs 220 of 255, D-CP-03).
const THIN = { abs: 0.25 };

/** {Thickness[0.005], drawPath[Orange, optPath, start, minRadius, True]} */
function drawPathSvg(g, pieces) {
  pieces.forEach((p, i) => {
    if (!p) return;
    if (p.kind === 'arc') {
      if (p.construction) { // {Gray, PointSize[0.01], Point[center], Thin, Gray, Circle[center, minRadius]}
        plot.point(g, p.construction.center, 0.01, GRAY, `construction-center-${i + 1}`);
        plot.disk(g, p.construction.center, p.construction.r, { stroke: GRAY, thickness: THIN, testid: `construction-circle-${i + 1}` });
      }
      // Circle[center, minRadius, {angS, angE}] — drawn between the two angles (K-CP-01)
      plot.arc(g, p.center, p.r, p.angS, p.angE, { stroke: ORANGE, thickness: 0.005, testid: `path-piece-${i + 1}` });
    } else {
      plot.line(g, [p.from, p.to], { stroke: ORANGE, thickness: 0.005, testid: `path-piece-${i + 1}` });
    }
  });
}

/** {colour, drawCar[xy, Theta, Alpha, opac]} */
function drawCarSvg(g, colourName, car, testid) {
  const grp = plot.group(g, { 'data-testid': testid });
  const arrowSize = 0.02 * (PLOT_RANGE[0][1] - PLOT_RANGE[0][0]) * 1.04; // Arrowheads[.02]: fraction of the graphic's width
  for (const pr of car.prims) {
    if (pr.kind === 'polygon') {
      const fill = pr.fill === 'inherit' ? COLOURS[colourName] : COLOURS[pr.fill];
      plot.polygon(grp, pr.pts, {
        fill, fillOpacity: pr.opacity, stroke: COLOURS[pr.edge.color], strokeOpacity: pr.edge.opacity,
        thickness: pr.edge.thin ? THIN : undefined, testid: `${testid}-${pr.role}`,
      });
    } else if (pr.kind === 'line') {
      plot.line(grp, pr.pts, { stroke: COLOURS[pr.stroke], opacity: pr.opacity, testid: `${testid}-${pr.role}` });
    } else if (pr.kind === 'arrow') {
      const [a, b] = pr.pts;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      const s = arrowSize, base = [b[0] - s * ux, b[1] - s * uy], w = 0.3 * s;
      plot.line(grp, [a, base], { stroke: COLOURS.Black, opacity: pr.opacity, testid: `${testid}-arrow` });
      plot.polygon(grp, [b, [base[0] - w * uy, base[1] + w * ux], [base[0] + w * uy, base[1] - w * ux]], { fill: COLOURS.Black, fillOpacity: pr.opacity });
    }
  }
}

/** colorLocatorOrient[color]: locator with only vertical reticles (ImageSize 17, PlotRange {{-8, 8}, {-8, 8}}), rotated. */
function orientGlyph(colour, theta) {
  const k = (17 / 16) * plot.unitsPerPx; // world units per glyph unit
  const g = svgNode('g', { class: 'locator-glyph orient-glyph', transform: `rotate(${(theta * 180) / Math.PI}) scale(${k})` });
  const c = css(colour);
  // AbsoluteThickness[0.8], LineBox {{0,-10},{0,-2}}, {{0,2},{0,10}} (clipped to the glyph's PlotRange ±8)
  g.append(svgNode('line', { x1: 0, y1: -8, x2: 0, y2: -2, stroke: c, 'stroke-width': 0.8 / (17 / 16) }));
  g.append(svgNode('line', { x1: 0, y1: 2, x2: 0, y2: 8, stroke: c, 'stroke-width': 0.8 / (17 / 16) }));
  g.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 5, fill: 'none', stroke: c, 'stroke-width': 0.8 / (17 / 16) }));
  // {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5, 0.5}, 3]}
  g.append(svgNode('circle', { cx: -0.5, cy: 0.5, r: 3, fill: 'none', stroke: c, 'stroke-opacity': 0.3, 'stroke-width': 3 / (17 / 16) }));
  return g;
}

function draw() {
  for (const g of Object.values(L)) g.replaceChildren();
  const { start, goal, sTheta, gTheta, ppos, pTheta, palpha } = view;
  drawPathSvg(L.path, drawPath(state.optPath, start, state.minRadius, true));
  drawCarSvg(L.start, 'Green', drawCar([start[0], start[1]], sTheta, 0, 0.2), 'start-car');
  drawCarSvg(L.goal, 'Red', drawCar([goal[0], goal[1]], gTheta, 0, 0.2), 'goal-car');
  drawCarSvg(L.car, 'Blue', drawCar(ppos, pTheta, palpha, 0.6), 'moving-car');
  // Locator[locsOld[[1]]], Locator[locsOld[[2]], Rotate[colorLocatorOrient[Darker[Green]], sTheta]], ... (glyphs only)
  const glyphs = [locatorGlyph(plot), orientGlyph(darker(NAMED.Green), sTheta), locatorGlyph(plot), orientGlyph(NAMED.Red, gTheta)];
  glyphs.forEach((gl, i) => {
    const holder = svgNode('g', { transform: `translate(${state.locsOld[i][0]},${state.locsOld[i][1]})`, 'data-testid': `glyph-${i + 1}` });
    holder.append(gl);
    L.glyphs.append(holder);
  });
  labelEl.textContent = `path length: ${mmaNumberString(view.pathLengthValue, { isReal: true })}   distance: ${mmaNumberString(view.distanceValue, { isReal: true })}`;
  locators.redraw();
}

function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  // the body's input corrections write back into the controls
  progressCtl.set(state.progress);
  minRadiusCtl.set(state.minRadius);
  draw();
}

// Locators: {{locs, ...}, {-14, -9}, {14, 9}, Locator, Appearance -> None} — invisible, at locs
const clampToRange = ([x, y]) => [
  Math.min(Math.max(x, LOCATOR_RANGE[0][0]), LOCATOR_RANGE[1][0]),
  Math.min(Math.max(y, LOCATOR_RANGE[0][1]), LOCATOR_RANGE[1][1]),
];
const NAMES = ['1', '2', '3', '4'];
const DESCR = { 1: 'start position', 2: 'start orientation', 3: 'goal position', 4: 'goal orientation' };
const locators = addLocators(plot, {
  names: NAMES,
  get: (n) => state.locs[Number(n) - 1],
  appearance: () => null, // Appearance -> None
  // Manipulate Locator controls are LocatorPane locators: "by default directs any click to the nearest locator"
  // (Wolfram Language reference, LocatorPane, Details). A press within 12 px grabs a locator in place; a press anywhere
  // else makes the nearest of the four jump there (all four are always active). D-CP-06 (resolved in v0.1.1).
  pickAnywhere: true,
  keyStep: 0.1,
  describe: (n) => `${DESCR[n]} locator; arrow keys move it`,
  onMove: (n, p) => {
    state.locs[Number(n) - 1] = clampToRange(p);
    run();
  },
});

// ---- controls (ControlPlacement -> Top, the Manipulate default) ------------------------------
const controls = new Controls(document.getElementById('controls'));
// {{progress, 0.0}, 0, 1, 0.001, Appearance -> "Labeled", ImageSize -> 500}
const progressCtl = controls.slider({
  name: 'progress', label: 'progress', min: 0, max: 1, step: 0.001, value: state.progress,
  onInput: (v) => { state.progress = v; run(); },
});
Object.assign(progressCtl.row.querySelector('input[type=range]').style, { flex: '0 1 500px', width: '500px' });
// Row[{Control@{{minRadius, 3, Subscript[Style["r", Italic], min]}, 0.001, 10, 0.001, ...}, Spacer[15], Control@{type, ...}, Spacer[15], Button[...]}]
const row = addRow(controls, { name: 'settings' });
const rowCtl = new Controls(row);
const minRadiusCtl = rowCtl.slider({
  name: 'minRadius', label: 'r min', min: 0.001, max: 10, step: 0.001, value: state.minRadius,
  onInput: (v) => { state.minRadius = v; run(); },
});
minRadiusCtl.row.querySelector('.ctl-label').innerHTML = '<i>r</i><sub>min</sub>';
Object.assign(minRadiusCtl.row.querySelector('input[type=range]').style, { flex: '0 1 150px', width: '150px' });
const typeCtl = rowCtl.setterBar({
  name: 'type', label: 'type', value: state.type,
  options: TYPES.map((t) => ({ value: t })),
  onChange: (v) => { state.type = v; run(); },
});
addButton(rowCtl, {
  name: 'swap', label: 'swap start and goal',
  onClick: () => { state = swapStartGoal(state); run(); },
}).button.style.minWidth = '160px';

document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  typeCtl.set(state.type);
  run();
});

run();

// ---- test / automation hook (port addition A-CP-03) ----------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'car-paths',
  getState: () => clone(state),
  view: () => clone({ ...view, paths: view.paths ? view.paths.length : null }),
  labelText: () => labelEl.textContent,
  /** move locator n (1..4) to world point p, as one front-end update (the locator range applies) */
  moveLocator: (n, p) => { state.locs[n - 1] = clampToRange(p); run(); return clone(state); },
  setState: (partial) => { state = { ...state, ...clone(partial) }; typeCtl.set(state.type); run(); },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
