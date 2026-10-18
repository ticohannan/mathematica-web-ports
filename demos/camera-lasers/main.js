// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-lasers/main.js — page: the top view and the camera image (SVG), the object locator, the orientation
// dial, the sliders (browser only).
import { Controls, mmaGrid } from '../../shared/ui.js';
import { addVerticalSlider } from '../../shared/ui-extra.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { NAMED, css } from '../../shared/mma-colors.js';
import { numberParts } from '../../shared/mma-text.js';
import { makeDialControl, drawArrowhead } from '../common/dial-control.js';
import { LOC_ICON } from '../common/prm-core.js';
import { initialSettings, evaluate, fromSaved, clipPolyline, PLOT_RANGE, CAM_RANGE, IMSZ, STYLE, DIAL_OPTIONS } from './model.js';

let state = initialSettings();
let view = null;

// ---- the two pictures: Column[{Graphics[top view], Framed[Graphics[camera image]]}] ---------------------------
const graphicEl = document.getElementById('graphic');
const topBox = document.createElement('div');
topBox.className = 'top-view';
const camBox = document.createElement('div');
camBox.className = 'camera-image';
camBox.setAttribute('data-testid', 'camera-frame');
graphicEl.append(topBox, camBox);
const top = createPlot(topBox, { plotRange: PLOT_RANGE, imageSize: IMSZ, padding: 0, testid: 'scene-svg', label: 'Top view: camera, lasers, beams and the brown object' });
const cam = createPlot(camBox, { plotRange: CAM_RANGE, imageSize: IMSZ, padding: 0, testid: 'camera-svg', label: 'Camera image with the laser dots and the distance reticule' });
const TL = { grid: top.layer('grid'), prims: top.layer('prims') };
const CLy = { prims: cam.layer('prims') };

// GridLines -> {Table[i, {i, -1, 15}], Table[i, {i, -4, 4}]}, GridLinesStyle -> Directive[Thin, Dashed, Gray] (behind)
const DASH = [4, 3];
for (let x = -1; x <= 15; x++) top.line(TL.grid, [[x, -4], [x, 4]], { stroke: NAMED.Gray, thickness: { abs: STYLE.thinPx * 2 }, dash: DASH, cap: 'butt' });
for (let y = -4; y <= 4; y++) top.line(TL.grid, [[-1, y], [15, y]], { stroke: NAMED.Gray, thickness: { abs: STYLE.thinPx * 2 }, dash: DASH, cap: 'butt' });

/** loc[col]: the coloured locator icon (prm-core LOC_ICON: ImageSize 17, PlotRange ±8), centred at `at`. */
function locIcon(plot, g, at, color) {
  const k = LOC_ICON.pxPerUnit * plot.unitsPerPx;
  const grp = plot.group(g, { transform: `translate(${at[0]},${at[1]}) scale(${k})`, 'data-testid': 'locator-icon' });
  const c = css(color), w = 1 / LOC_ICON.pxPerUnit;
  for (const [[x1, y1], [x2, y2]] of LOC_ICON.lines) grp.append(svgNode('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w }));
  for (const ci of LOC_ICON.circles) grp.append(svgNode('circle', { cx: ci.c[0], cy: ci.c[1], r: ci.r, fill: 'none', stroke: c, 'stroke-opacity': ci.opacity, 'stroke-width': ci.thicknessPx * w }));
}

/** a tick label: exact fractions stacked (numerator, bar, denominator), others plain, minus in front */
function drawLabel(plot, g, value, at, fontPx, color) {
  const parts = numberParts(value);
  const grp = plot.group(g, { class: 'tick-label', 'data-testid': 'tick-label', 'data-text': parts.text });
  if (!parts.den) { plot.text(grp, parts.text, at, { fontPx, color }); return; }
  const u = plot.unitsPerPx, f = fontPx * 0.85;
  const w = Math.max(parts.num.length, parts.den.length) * f * 0.6 * u;
  const cx = at[0] + (parts.sign ? f * 0.3 * u : 0);
  if (parts.sign) plot.text(grp, parts.sign, [cx - w / 2 - f * 0.45 * u, at[1]], { fontPx: f, color });
  plot.text(grp, parts.num, [cx, at[1] + f * 0.6 * u], { fontPx: f, color });
  plot.line(grp, [[cx - w / 2, at[1]], [cx + w / 2, at[1]]], { stroke: color, thickness: { abs: 0.75 } });
  plot.text(grp, parts.den, [cx, at[1] - f * 0.6 * u], { fontPx: f, color });
}

/** the drawing window of a plot: its plot range plus CLIP_MARGIN_PX on every side (D-CL-08) */
const CLIP_MARGIN_PX = 20;
function clipBox(plot) {
  const m = CLIP_MARGIN_PX * plot.unitsPerPx, [[x0, x1], [y0, y1]] = plot.plotRange;
  return [[x0 - m, x1 + m], [y0 - m, y1 + m]];
}

/** draws the model's primitive list in order */
function drawPrims(plot, g, prims) {
  g.replaceChildren();
  for (const p of prims) {
    const testid = p.role;
    const thickness = { abs: p.thicknessPx ?? STYLE.normalPx };
    switch (p.kind) {
      case 'polygon':
        plot.polygon(g, p.pts, { fill: p.fill, fillOpacity: p.opacity, stroke: p.edge, thickness: { abs: STYLE.normalPx }, testid });
        break;
      case 'rect':
        plot.rect(g, p.from, p.to, { fill: p.fill, fillOpacity: p.opacity, stroke: p.edge, thickness: { abs: STYLE.normalPx }, testid });
        break;
      case 'line': case 'arc': {
        // dashed lines are clipped to the plot range plus a margin before drawing (D-CL-08): a missing laser's dashed
        // reflection reaches x = 10000 (Q-CL-04), and the browser would rasterise every dash of the whole length;
        // solid lines are drawn as they are (one element per primitive)
        const runs = p.dashed ? clipPolyline(p.pts, clipBox(plot)) : [{ pts: p.pts, offset: 0 }];
        const grp = runs.length > 1 ? plot.group(g, { 'data-testid': testid }) : g;
        for (const run of runs) {
          const el = plot.line(grp, run.pts, { stroke: p.stroke, thickness, dash: p.dashed ? DASH : undefined, cap: p.dashed ? 'butt' : undefined, testid: runs.length > 1 ? undefined : testid });
          if (p.dashed && run.offset > 0) {
            const period = DASH.reduce((a, b) => a + b, 0) * plot.unitsPerPx;
            el.setAttribute('stroke-dashoffset', String(run.offset % period));
          }
        }
        break;
      }
      case 'arrow': {
        const tip = p.tip ?? p.pts[p.pts.length - 1];
        let dir = p.direction;
        if (!dir) { const a = p.pts[p.pts.length - 2], dx = tip[0] - a[0], dy = tip[1] - a[1], l = Math.hypot(dx, dy); dir = [dx / l, dy / l]; }
        const grp = plot.group(g, { 'data-testid': testid });
        plot.line(grp, p.pts, { stroke: p.stroke, thickness });
        drawArrowhead(plot, grp, tip, dir, { size: p.head, color: p.stroke });
        break;
      }
      case 'point':
        if (p.sizePx) plot.point(g, p.at, { abs: p.sizePx }, p.color, testid);
        else plot.point(g, p.at, p.size, p.color, testid);
        break;
      case 'text':
        // the Greek letters and s in italic serif (as the snapshots show them), the titles in the default sans-serif
        plot.text(g, p.text, p.at, { fontPx: p.fontPx, italic: p.italic, color: p.color, family: p.italic ? '"Times New Roman", serif' : 'Arial, Helvetica, sans-serif', testid });
        break;
      case 'label':
        drawLabel(plot, g, p.value, p.at, p.fontPx, p.color);
        break;
      case 'loc':
        locIcon(plot, g, p.at, p.color);
        break;
      default: throw new Error(`unknown primitive ${p.kind}`);
    }
  }
}

function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  drawPrims(top, TL.prims, view.top);
  drawPrims(cam, CLy.prims, view.cam);
  locators.redraw();
}

// ---- object locator: {{p, {3, -1/5}}, Locator, Appearance -> None}; range: the top view's plot range (K-CL-01) ----
const clampTop = ([x, y]) => [Math.min(Math.max(x, PLOT_RANGE[0][0]), PLOT_RANGE[0][1]), Math.min(Math.max(y, PLOT_RANGE[1][0]), PLOT_RANGE[1][1])];
const locators = addLocators(top, {
  names: ['p'],
  get: () => state.p,
  appearance: () => null, // the original draws its own loc[Black] icon at p
  pickAnywhere: true, // LocatorPane: a press anywhere in the top view moves the object there (D-CL-06)
  keyStep: 0.1,
  describe: () => 'object locator; arrow keys move it',
  onMove: (_n, q) => { state.p = clampTop(q); run(); },
});

// ---- controls (ControlPlacement -> Left) ------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
controls.heading('object orientation');
const dialCtl = makeDialControl(controls, { ...DIAL_OPTIONS, value: state.p1, onInput: (pt) => { state.p1 = pt; run(); } });
controls.heading('\nlaser spacing');
// {{s, 1}, 0.1, 2, 0.01, VerticalSlider, ImageSize -> {Automatic, 80}, Appearance -> "Labeled"}: values 0.1 + k·0.01
const sGrid = mmaGrid(0.1, 2, 0.01);
const sCtl = addVerticalSlider(controls, {
  name: 's', label: 's', min: 0.1, max: 2, step: 0.01, value: state.s,
  onInput: (v) => { state.s = sGrid.valueAt(sGrid.indexOf(v)); run(); },
});
controls.heading('camera focal length');
// {{λ, 0.5}, 0.1, 2, 0.01, ImageSize -> 80, Appearance -> "Labeled"}: slider, ⊕ panel, values 0.1 + k·0.01
const lambdaCtl = controls.slider({
  name: 'lambda', label: 'λ', min: 0.1, max: 2, step: 0.01, value: state.lambda, steps: 'mma',
  onInput: (v) => { state.lambda = v; run(); },
});
lambdaCtl.row.querySelector('.ctl-label').innerHTML = '<i>λ</i>';
lambdaCtl.row.classList.add('ctl-inline');
Object.assign(lambdaCtl.row.querySelector('input[type=range]').style, { flex: '0 0 80px', width: '80px', minWidth: '80px' });

function syncControls() {
  dialCtl.set(state.p1);
  sCtl.set(state.s);
  lambdaCtl.set(state.lambda);
}
document.getElementById('reset').addEventListener('click', () => {
  lambdaCtl.stop();
  state = initialSettings();
  syncControls();
  run();
});

run();

// ---- test / automation hook (A-CL-04) -------------------------------------------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
window.__demo = {
  name: 'camera-lasers',
  getState: () => clone(state),
  view: () => clone(view),
  /** texts of the reticule labels, left to right */
  tickLabels: () => [...cam.svg.querySelectorAll('[data-testid=tick-label]')].map((g) => ({ text: g.getAttribute('data-text'), u: Number(g.querySelector('text').getAttribute('transform').match(/translate\(([-\d.e]+)/)[1]) })).sort((a, b) => a.u - b.u).map((l) => l.text),
  /** load a state (the port's form or a saved one with plain numbers, λ under its own name), then evaluate once */
  loadState: (s) => { state = fromSaved(clone(s)); syncControls(); run(); return clone(state); },
  moveLocator: (q) => { state.p = clampTop(q); run(); return clone(state); },
  worldToClient: (q) => top.worldToClient(q),
  camWorldToClient: (q) => cam.worldToClient(q),
  dialToClient: (q) => dialCtl.plot.worldToClient(q),
  ready: true,
};
