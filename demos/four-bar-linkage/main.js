// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/main.js — page: controls, the two SVG graphics, the locator (browser only).
import { Controls, el } from '../../shared/ui.js';
import { addIntervalSlider } from '../../shared/ui-interval.js';
import { createPlot, addLocators, locatorGlyph, svgNode } from '../../shared/svg-plot.js';
import { drawAxes, frameLayout, clipToRange } from '../../shared/svg-frame.js';
import { NAMED, darker, lighter } from '../../shared/mma-colors.js';
import {
  useRecordedSamples, initialSettings, evaluate, fromSettings, CSPACE_RANGE, LINKAGE_RANGE, IMAGE_SIZE, CURVE_COLOURS,
  SPACING_SLIDER, LINKS_SLIDER,
} from './fourbar.js';

const PI = Math.PI;
const GRAY4 = [0.4, 0.4, 0.4];
// PORT DEVIATION (D-FB-04): Mathematica's rendering approximated — Thick curves 2.4 px, Medium text 12 px, default
// arrowheads about 0.0215 of the image width (6.5 px at ImageSize 300), Thin 0.5 px.
const THIN = { abs: 0.5 };
const HEAD = { len: 6.5, half: 2.6, notch: 0.72 };

let state = null;
let view = null;

// ---- the two graphics: Row[{Show[plot, Graphics[{Locator[pnear]}]], Graphics[…linkage…]}] ------------------------
const row = document.getElementById('graphics');
const box = (testid) => { const d = el('div', { class: 'graphic fb-graphic', 'data-testid': testid }); row.append(d); return d; };
const leftEl = box('graphic'), rightEl = box('graphic-linkage');
const label = (parent, text) => { const d = el('div', { class: 'plot-label' }, text); parent.append(d); return d; };
label(leftEl, 'configuration space');
// AspectRatio -> 1, ImageSize -> 300, axes through the origin with labels θ, φ: margins for tick and axes labels
const layout = frameLayout(CSPACE_RANGE, { imageSize: IMAGE_SIZE, margins: { left: 26, right: 16, top: 18, bottom: 20 } });
const cs = createPlot(leftEl, { plotRange: layout.plotRange, imageSize: IMAGE_SIZE, padding: 0, label: 'Configuration space: the angles (θ, φ) the linkage can take', testid: 'cspace-svg' });
const csAxes = cs.layer('axes'), csCurves = cs.layer('curves'), csGlyph = cs.layer('glyph'), csText = cs.layer('text');
// PlotRangeClipping -> True; the clip rectangle is widened by half the curve width (CURVE_PX/2) so that curves lying
// on the range's edge (φ = ±π) keep their full width, as in the snapshots (§6.5)
const CURVE_PX = 2.4;
{
  const m = (CURVE_PX / 2) * cs.unitsPerPx, [[x0, x1], [y0, y1]] = CSPACE_RANGE;
  clipToRange(cs, csCurves, [[x0 - m, x1 + m], [y0 - m, y1 + m]]);
}
drawAxes(cs, csAxes, {
  range: CSPACE_RANGE, majorStep: 1, minorStep: 0.2, axesLabel: ['θ', 'φ'], fontPx: 11, labelColor: [0, 0, 0],
  axesLabelStyle: { italic: true, color: GRAY4 },
});
label(rightEl, 'four‐bar linkage');
// PlotRange -> {{-1.25, 2}, {-1.5, 1.5}}, explicit: no padding, everything outside is cut (snapshot 1: the blue circle at x −1.25)
const lk = createPlot(rightEl, { plotRange: LINKAGE_RANGE, imageSize: IMAGE_SIZE, padding: 0, label: 'The four-bar linkage in the selected configuration', testid: 'linkage-svg' });
const lkLayer = lk.layer('linkage');

const colour = (name) => ({ DarkerGray: darker(NAMED.Gray), LighterGray: lighter(NAMED.Gray) }[name] ?? NAMED[name]);

function arrowHead(plot, g, tip, dir, col, scale = 1) {
  const u = plot.unitsPerPx, len = HEAD.len * u * scale, half = HEAD.half * u * scale;
  const [ux, uy] = dir, base = [tip[0] - len * ux, tip[1] - len * uy], notch = [tip[0] - HEAD.notch * len * ux, tip[1] - HEAD.notch * len * uy];
  plot.polygon(g, [tip, [base[0] - half * uy, base[1] + half * ux], notch, [base[0] + half * uy, base[1] - half * ux]], { fill: col });
  return notch;
}
function arrow(plot, g, [a, b], col, testid) {
  const grp = plot.group(g, { 'data-testid': testid });
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!L) return grp;
  const notch = arrowHead(plot, grp, b, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], col);
  plot.line(grp, [a, notch], { stroke: col });
  return grp;
}
/** Text[Style["L_k", Medium], pos] and the θ, φ labels; offset {-1, -1}: the point is the text's lower-left corner */
function text(plot, g, t, at, col, offset, testid) {
  const node = plot.text(g, '', at, { fontPx: 12, color: col, testid, anchor: offset ? 'start' : 'middle' });
  if (offset) node.setAttribute('dominant-baseline', 'text-after-edge');
  if (t.length === 2 && t[0] === 'L') {
    const a = svgNode('tspan', { 'font-style': 'italic' }); a.textContent = 'L';
    const b = svgNode('tspan', { dy: '0.3em', 'font-size': '75%' }); b.textContent = t[1];
    node.append(a, b);
  } else {
    const a = svgNode('tspan', { 'font-style': 'italic' }); a.textContent = t;
    node.append(a);
  }
  return node;
}
/** Rectangle[{x0, y0}, {x1, y1}, RoundingRadius -> r], optionally Rotate[…, angle, about] */
function rect(plot, g, { from, to, r = 0, angle = 0, about = [0, 0] }, fill, testid) {
  const n = svgNode('rect', {
    x: Math.min(from[0], to[0]), y: Math.min(from[1], to[1]), width: Math.abs(to[0] - from[0]), height: Math.abs(to[1] - from[1]),
    rx: r, ry: r, fill: `rgb(${fill.map((v) => Math.round(v * 255)).join(',')})`, stroke: 'black', 'stroke-width': plot.strokeWidth(THIN),
    transform: angle ? `rotate(${(angle * 180) / PI} ${about[0]} ${about[1]})` : undefined, 'data-testid': testid,
  });
  g.append(n);
  return n;
}

function drawCspace() {
  csCurves.replaceChildren(); csGlyph.replaceChildren(); csText.replaceChildren();
  // PlotStyle -> Thick, the default colours 1 (Φpos) and 2 (Φneg); each curve through its samples in θ order
  state.plot.lines.forEach((pieces, ci) => {
    const grp = cs.group(csCurves, { 'data-testid': `curve-${ci + 1}` });
    for (const pts of pieces) cs.line(grp, pts, { stroke: CURVE_COLOURS[ci], thickness: { abs: CURVE_PX } });
  });
  if (state.plot.text) { // Epilog -> {Style[Text[…, {0, 1}], Red, Medium]}
    const t = cs.text(csText, '', [0, 1], { fontPx: 12, color: NAMED.Red, testid: 'cspace-message' });
    state.plot.text.split('\n').forEach((line, i, all) => {
      const s = svgNode('tspan', { x: 0, dy: i === 0 ? `${-(all.length - 1) * 0.6}em` : '1.2em' });
      s.textContent = line;
      t.append(s);
    });
  }
  // Graphics[{Locator[pnear]}]: the default locator glyph at pnear (K-FB-12: drawn, not draggable)
  const holder = svgNode('g', { transform: `translate(${state.pnear[0]},${state.pnear[1]})`, 'data-testid': 'glyph' });
  holder.append(locatorGlyph(cs));
  csGlyph.append(holder);
  locators.redraw();
}

function drawLinkage() {
  lkLayer.replaceChildren();
  const g = view.linkage;
  const B = colour('Brown');
  g.pivots.forEach((p, i) => rect(lk, lkLayer, p, B, `pivot-${i + 1}`));
  rect(lk, lkLayer, g.ground, B, 'ground');
  rect(lk, lkLayer, g.crank, colour('DarkerGray'), 'crank');
  rect(lk, lkLayer, g.rockerRect, colour('Gray'), 'rocker');
  lk.line(lkLayer, g.coupler, { stroke: colour('LighterGray'), thickness: 0.02, testid: 'coupler' });
  g.arrows.forEach((a, i) => arrow(lk, lkLayer, a, colour('Black'), `separation-arrow-${i + 1}`));
  const T = Object.fromEntries(g.texts.map((t) => [t.text, t]));
  text(lk, lkLayer, 'L4', T.L4.at, colour('Black'), null, 'text-L4');
  for (const r of g.refLines) lk.line(lkLayer, r, { stroke: colour('Black'), thickness: THIN });
  for (const [name, part, sym, Lk] of [['Blue', g.blue, 'θ', 'L1'], ['Red', g.red, 'φ', 'L3']]) {
    const col = colour(name);
    lk.disk(lkLayer, part.circle.c, part.circle.r, { stroke: col, testid: `circle-${name.toLowerCase()}` });
    lk.line(lkLayer, part.line, { stroke: col, testid: `line-${name.toLowerCase()}` });
    if (part.arc.kind === 'Point') lk.point(lkLayer, part.arc.at, { abs: 3 }, col);
    else {
      const grp = lk.group(lkLayer, { 'data-testid': `arc-${name.toLowerCase()}` });
      const notch = arrowHead(lk, grp, part.arc.tip, part.arc.direction, col);
      const curve = part.arc.curve.slice(0, -1).concat([notch]);
      lk.line(grp, curve, { stroke: col });
    }
    text(lk, lkLayer, sym, T[sym].at, col, null, `text-${sym === 'θ' ? 'theta' : 'phi'}`);
    text(lk, lkLayer, Lk, T[Lk].at, colour('Black'), null, `text-${Lk}`);
  }
  const O = colour('Orange');
  lk.disk(lkLayer, g.orange.circle.c, g.orange.circle.r, { stroke: O, testid: 'circle-orange' });
  lk.line(lkLayer, g.orange.line, { stroke: O, testid: 'line-orange' });
  text(lk, lkLayer, 'L2', T.L2.at, colour('Black'), T.L2.offset, 'text-L2');
}

function run() {
  const r = evaluate(state);
  state = r.state;
  view = r.view;
  drawCspace();
  drawLinkage();
}

// ---- the locator {{p, {-.9, -1}}, Locator, Appearance -> None}: invisible, in the configuration-space plot ----------
// PORT DEVIATION (D-FB-07): LocatorPane picking (a press within 12 px grabs p, elsewhere p jumps to the press); p is
// limited to the plot range [-π, π]² (K-FB-07). One evaluation per animation frame while dragging (D-FB-06).
const clampP = ([x, y]) => [Math.min(Math.max(x, -PI), PI), Math.min(Math.max(y, -PI), PI)];
const locators = addLocators(cs, {
  names: ['p'],
  get: () => (state ? state.p : [-0.9, -1]),
  appearance: () => null,
  keyStep: 0.05,
  pickAnywhere: true,
  describe: () => 'configuration locator (θ, φ); arrow keys move it',
  onMove: (n, p) => { state.p = clampP(p); run(); },
});

// ---- controls (ControlPlacement -> Top) ----------------------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
// {{spacing, 0.75, Row[{"separation (", Subscript[Style["L", Italic], 4], ")"}]}, 0, 1.5, .05, ImageSize -> 180, Appearance -> "Labeled"}
const spacingCtl = controls.slider({
  name: 'spacing', label: 'separation (L4)', ...SPACING_SLIDER, steps: 'mma', value: 0.75,
  onInput: (v) => { state.spacing = v; run(); },
});
spacingCtl.row.querySelector('.ctl-label').innerHTML = 'separation (<i>L</i><sub>4</sub>)';
// {{links, {1.35, 2}, Row[{"link lengths (", L1, ",", L2, ",", L3, ")"}]}, 0, 2.49, 0.05, ControlType -> IntervalSlider,
//  Method -> "Push", MinIntervalSize -> 0.1, Appearance -> "Labeled", ImageSize -> {300, 20}}
const linksCtl = addIntervalSlider(controls, {
  name: 'links', label: 'link lengths (L1,L2,L3)', min: LINKS_SLIDER.min, max: LINKS_SLIDER.max, step: LINKS_SLIDER.step,
  steps: 'mma', value: [1.35, 2], minIntervalSize: LINKS_SLIDER.minIntervalSize, method: 'Push', labeled: true, trackPress: true,
  look: 'mma', // the snapshots' colours: grey track, white between the thumbs (D-FB-05)
  onInput: (v) => { state.links = v; run(); },
});
linksCtl.row.querySelector('.ctl-label').innerHTML = 'link lengths (<i>L</i><sub>1</sub>,<i>L</i><sub>2</sub>,<i>L</i><sub>3</sub>)';

function showControls({ moved = false, linksExact } = {}) {
  spacingCtl.set(state.spacing, { moved });
  linksCtl.set(state.links, linksExact ? { exact: linksExact } : {});
}

document.getElementById('reset').addEventListener('click', () => {
  state = initialSettings();
  showControls();
  run();
});

// ---- start: the original's recorded samples (§6.3), then the opening state ----------------------------------------
const clone = (x) => JSON.parse(JSON.stringify(x));
fetch('./recorded-samples.json').then((r) => {
  if (!r.ok) throw new Error(`recorded-samples.json: HTTP ${r.status}`);
  return r.json();
}).then((table) => {
  useRecordedSamples(table);
  state = initialSettings();
  showControls();
  run();
  // ---- test / automation hook (port addition A-FB-03) ----
  window.__demo = {
    name: 'four-bar-linkage',
    getState: () => clone({ ...state, plot: undefined, pvalsCount: state.pvals.length }),
    view: () => clone({
      lenlengths: view.lenlengths, impossibleLinks: view.impossibleLinks, Thetav: view.Thetav, Phiv: view.Phiv, Alpha: view.Alpha,
      resampled: view.resampled, crankTip: view.linkage.crankTip, couplerEnd: view.linkage.couplerEnd, rockerTip: view.linkage.rockerTip,
      lines: state.plot.lines.map((c) => c.map((x) => x.length)), text: state.plot.text, linksText: linksCtl.text(),
    }),
    /** every sample point Flatten[pvals, 1] in record order */
    samples: () => clone(state.pvals.flat(1)),
    /** move the locator p to (θ, φ), as one front-end update */
    moveLocator: (p) => { state.p = clampP(p); run(); return clone(state.pnear); },
    /** assign Manipulate variables (a snapshot's Settings may be passed whole); linksExact: exactness of the shown links */
    setState: (partial, { linksExact } = {}) => {
      const next = { ...state, ...clone(partial) };
      state = partial.plot && (partial.plot.head || partial.plot.h) ? fromSettings(next) : next;
      showControls({ moved: true, linksExact });
      run();
    },
    worldToClient: (p) => cs.worldToClient(p),
    linkageToClient: (p) => lk.worldToClient(p),
    ready: true,
  };
}).catch((e) => {
  const n = el('div', { class: 'requirements-notice', 'data-testid': 'requirements-notice' }, `This demonstration could not start: ${e.message}`);
  leftEl.append(n);
  throw e;
});
