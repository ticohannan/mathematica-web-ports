// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-isochrons/main.js — page: controls, SVG drawing (browser only).
import { Controls, el } from '../../shared/ui.js';
import { createPlot, svgNode } from '../../shared/svg-plot.js';
import { drawAxes } from '../../shared/svg-frame.js';
import { NAMED, css } from '../../shared/mma-colors.js';
import { drawCar, drawCarSvg } from '../common/car-icon.js';
import { initialState, evaluate, SHOW_RANGE, SETS, PATHS, PLOT_ORDER, PLOT_COLOURS } from './isochrons.js';

let state = initialState();
let view = null;
let drawnPlot = null; // the plotReach object currently drawn (the plot layer is redrawn only when it changes)

// Show[{plotReach, Graphics[epiGraphics]}, AspectRatio -> Automatic, ImageSize -> {440}, AxesOrigin -> {0, 0},
//   PlotRange -> {{-15, 15}, {-16, 16}}] with the plot's PlotRangePadding -> Scaled[0.05]
const graphicEl = document.getElementById('graphic');
const plot = createPlot(graphicEl, {
  plotRange: SHOW_RANGE, imageSize: 440, padding: 0.05,
  label: 'Isochrons (or reachable regions) of a Dubins car with the path and the car at time p t / 100',
});
const L = { plot: plot.layer('plot'), axes: plot.layer('axes'), epi: plot.layer('epi') };
const VISIBLE = [[-16.5, 16.5], [-17.6, 17.6]];
// Axes through the origin with automatic ticks (labelled majors every 5, minors every 1), in front of the plot (F-DI-15)
drawAxes(plot, L.axes, { range: VISIBLE, fontPx: 11, thicknessPx: 1, color: [0.6, 0.6, 0.6], labelColor: [0.2, 0.2, 0.2] });

const PATH_COLOUR = { Blue: NAMED.Blue, Orange: NAMED.Orange, Red: NAMED.Red, Green: NAMED.Green };
const DASHED = [4, 4]; // Dashed: about 4 px dashes and gaps at ImageSize 440 (D-DI-04)

const fmt = (x) => (Math.round(x * 1e4) / 1e4).toString();
const pathD = (polys) => polys.map((q) => `M${q.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join('L')}Z`).join('');

function drawPlot() {
  L.plot.replaceChildren();
  const pr = state.plotReach;
  if (pr.set === '=') {
    // Prolog -> {{Opacity[0.4], Gray, Polygon[…], Polygon[…]}}: each self-intersecting polygon filled by the even-odd rule
    pr.polygons.forEach((P, i) => {
      L.plot.append(svgNode('path', {
        d: pathD([P]), fill: css(NAMED.Gray), 'fill-opacity': 0.4, 'fill-rule': 'evenodd', stroke: 'none', 'data-testid': `grey-band-${i + 1}`, 'data-points': P.length,
      }));
    });
    for (const w of PLOT_ORDER) plot.line(L.plot, pr.curves[w], { stroke: PLOT_COLOURS[w], thickness: { abs: 1.6 }, testid: `isochron-${w}` });
  } else {
    // the four regions, each one translucent union (TransparentPolygonMesh), then their boundaries opaque
    for (const w of PLOT_ORDER) {
      const g = plot.group(L.plot, { opacity: 0.3, 'data-testid': `region-${w}` });
      g.append(svgNode('path', { d: pathD(pr.regions[w].quads), fill: css(PLOT_COLOURS[w]), 'fill-rule': 'nonzero', stroke: 'none' }));
    }
    for (const w of PLOT_ORDER) plot.line(L.plot, pr.regions[w].boundary, { stroke: PLOT_COLOURS[w], thickness: { abs: 1 }, testid: `region-boundary-${w}` });
  }
  drawnPlot = pr;
}

function drawEpi() {
  L.epi.replaceChildren();
  const r = state.r;
  // {Dashed, Gray, Circle[{r, 0}, r], Circle[{-r, 0}, r]}
  plot.disk(L.epi, [r, 0], r, { stroke: NAMED.Gray, dash: DASHED, cap: 'butt', testid: 'turning-circle-right' });
  plot.disk(L.epi, [-r, 0], r, { stroke: NAMED.Gray, dash: DASHED, cap: 'butt', testid: 'turning-circle-left' });
  // {Thick, pathGraphics}
  const pg = view.pathGraphics;
  const g = plot.group(L.epi, { 'data-testid': 'path-graphics', 'data-path': pg.path });
  for (const p of pg.pieces) {
    if (p.kind === 'arc') plot.arc(g, p.c, p.r, p.a1, p.a2, { stroke: PATH_COLOUR[pg.colour], thickness: 'Thick' });
    else plot.line(g, [p.from, p.to], { stroke: PATH_COLOUR[pg.colour], thickness: 'Thick' });
  }
  // Red, drawCar[{0, 0}, π/2, 0, .5, .5, False], Green, drawCar[cxy, cθ, cα, .8, .5, True]
  drawCarSvg(plot, L.epi, drawCar([0, 0], Math.PI / 2, 0, 0.5, { lights: false, beam: 8, headlightEdge: null }), { colour: NAMED.Red, testid: 'start-car' });
  drawCarSvg(plot, L.epi, drawCar(view.cxy, view.cTheta, view.cAlpha, 0.8, { lights: true, beam: 8, headlightEdge: null }), { colour: NAMED.Green, testid: 'moving-car' });
}

function run() {
  const res = evaluate(state);
  state = res.state;
  view = res.view;
  if (state.plotReach !== drawnPlot) drawPlot();
  drawEpi();
}

// ---- controls (ControlPlacement -> Left) -------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
controls.heading('plot parameters'); // Style["plot parameters", 12]
const slider = (name, label, min, max, step, html) => {
  const api = controls.slider({
    name, label, min, max, step, steps: 'mma', value: state[name],
    onInput: (v) => { state[name] = v; run(); },
  });
  api.row.querySelector('.ctl-label').innerHTML = html;
  return api;
};
// {{r, 2, Row[{Style["r", Italic], " (m)"}]}, .5, 10, Appearance -> "Labeled", ImageSize -> 100}
const rCtl = slider('r', 'r (m)', 0.5, 10, 0, '<i>r</i> (m)');
// {{t, 10, Row[{Style["t", Italic], " (s)"}]}, .1, 14, Appearance -> "Labeled", ImageSize -> 100}
const tCtl = slider('t', 't (s)', 0.1, 14, 0, '<i>t</i> (s)');
// Row[{Control@{set, {"=", "≤"}}, Style[" t", Italic]}]
const setCtl = controls.setterBar({
  name: 'set', label: 'set', value: state.set, options: SETS.map((v) => ({ value: v })),
  onChange: (v) => { state.set = v; run(); },
});
setCtl.row.append(el('span', { class: 'set-suffix' }, 't'));
controls.delimiter();
controls.heading('move car'); // Style["move car", 12]
// Row[{Control@{path, {"RS", "LS", "LR", "RL"}}}]
const pathCtl = controls.setterBar({
  name: 'path', label: 'path', value: state.path, options: PATHS.map((v) => ({ value: v })),
  onChange: (v) => { state.path = v; run(); },
});
// {{τ, 0.5, "τ (s)"}, 0, 14, 0.01, …} and {{p, 100, Row[{Style["p", Italic], " (%)"}]}, 0, 100, 1, …}
const tauCtl = controls.slider({
  name: 'tau', label: 'τ (s)', min: 0, max: 14, step: 0.01, steps: 'mma', value: state.tau,
  onInput: (v) => { state.tau = v; run(); },
});
const pCtl = slider('p', 'p (%)', 0, 100, 1, '<i>p</i> (%)');

function syncControls(moved) {
  const how = moved === undefined ? undefined : { moved };
  rCtl.set(state.r, how); tCtl.set(state.t, how); tauCtl.set(state.tau, how); pCtl.set(state.p, how);
  setCtl.set(state.set); pathCtl.set(state.path);
}
document.getElementById('reset').addEventListener('click', () => {
  state = initialState();
  syncControls(false);
  run();
});

run();

// ---- test / automation hook (port addition A-DI-02) ----------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
const plotSummary = () => {
  const pr = state.plotReach;
  if (pr.set === '=') {
    return { set: '=', t: pr.t, r: pr.r, curvePoints: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.curves[w].length])), polygonPoints: pr.polygons.map((P) => P.length), polygons: pr.polygons, firstPoints: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.curves[w][0]])) };
  }
  return { set: pr.set, t: pr.t, r: pr.r, regionQuads: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.regions[w].quads.length])) };
};
window.__demo = {
  name: 'dubins-isochrons',
  getState: () => { const { plotReach, ...rest } = state; return clone(rest); },
  view: () => clone({ fs: view.fs, maxAlpha: view.maxAlpha, cxy: view.cxy, cTheta: view.cTheta, cAlpha: view.cAlpha, pathGraphics: view.pathGraphics, polySteps: view.polySteps, plot: plotSummary() }),
  setState: (partial) => { state = { ...state, ...clone(partial) }; syncControls(); run(); },
  worldToClient: (p) => plot.worldToClient(p),
  ready: true,
};
