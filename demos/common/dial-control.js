// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Benedict Isichei; Aaron T. Becker and Haoran Zhao; Shiva Shahrokhi and Aaron T. Becker; Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/dial-control.js — the originals' custom angle control `makeDialControl[Dynamic[pt_], cent_, color_]`:
// a LocatorPane whose one locator is the Manipulate variable pt (a point on the unit circle), over a dial graphic.
// Defined in "Forward and Inverse Kinematics for Two-Link Arm" (Aaron T. Becker and Lillian Lin), "Distance Norms in
// Robot Workspace and Phase Space" (Aaron T. Becker and Benedict Isichei), "Chart for a Torus" (Aaron T. Becker and
// Haoran Zhao), "Measuring Distance and Orientation Using Camera and Lasers" (Shiva Shahrokhi and Aaron T. Becker)
// and "Manipulability Ellipsoid of a Robot Arm" (Aaron T. Becker and Mary Burbage). Owner: two-link-kinematics
// (COMMON-DECISIONS §3, §5, §6); every app uses this module, no app-level dials.
//
//   makeHand[fl_, bl_, fw_, bw_] := Polygon[{{-bl, -bw}, {-bl, bw}, {fl, fw}, {fl + 8 fw, 0}, {fl, -fw}}/10]
//   makeDialControl[Dynamic[pt_], cent_, color_] := Module[{ang},
//     LocatorPane[Dynamic[pt, (pt = Normalize[#]) &],        (camera-lasers, manipulability ellipsoid:
//                                                              pt = Nearest[Table[{Cos@a, Sin@a}, {a, -π, π, π/32}], #][[1]])
//     ang = Dynamic[ArcTan[pt[[1]], pt[[2]]]];               (torus chart: If[ang < 0, ang = ang + 2π] — never fires)
//     Graphics[{Gray, Circle[cent],
//       Gray, Table[Line[{cent + .94{Cos@a, Sin@a}, cent + {Cos@a, Sin@a}}], {a, 0, 2π, π/8}],
//       Table[Line[{cent + .98{Cos@a, Sin@a}, cent + {Cos@a, Sin@a}}], {a, π/16, 2π, π/8}],
//       {FontSize -> 10, Table[Text[θ, cent + .7{Cos@θ, Sin@θ}], {θ, Rest@Range[-Pi, Pi, Pi/4]}]},
//       {color, EdgeForm[Black], Rotate[Translate[makeHand[7, 7/3, .1, .3], cent], ang, cent]},
//       Black, Arrowheads[.05],
//       color, myArrowArc2[cent, 0.3, {0, ang}]               (torus chart: arrowArc[Circle[cent, 0.3, {0, ang}]], black)
//     }, ImageSize -> 140]]]                                  (DN 120; CL {120, 120} and TC {160, 160} on the control;
//                                                              ME's stored Initialization: no ImageSize, automatic)
//
// Variants as options of makeDialControl (all other code identical):
//   setter  'normalize' (pt = Normalize[#], shared/mma-extra.js normalizeCR, K-TK-11) | 'nearest32' (the 65-point
//           table of exact multiples of π/32 as machine numbers from shared/exact-pi.js; Euclidean distance, ties in
//           table order: shared/mma-extra.js nearest, K-TK-12)
//   arc     'myArrowArc2' (in the dial's colour; ang is a Dynamic object, never SameQ to 0: always an Arrow, at ang = 0
//           a zero-length one with its head along +x, Q-TK-05) | 'arrowArcCircle' (torus chart: black
//           arrowArc[Circle[cent, 0.3, {0, ang}]] with ang in (−π, π], the 2π `If` never fires, Q-TC-01)
//   imageSize 140 (TK) | 120 (DN, CL) | 160 (TC) | 'automatic' (ME, 180 px: a 173 px circle as measured, F-ME-01)
//   keyStep a number = locator units per arrow key in the dial's own coordinates (default 0.05, Shift 5×), then the
//           setter (A-TK-02, A-TC-02) | 'grid' = one table step per key for the nearest32 setter: Right/Up +π/32,
//           Left/Down −π/32, Shift ±π/8 (A-CL-03, A-ME-02; COMMON-DECISIONS §5)
//   clamp   true (default): LocatorPane limits the pointer to the dial's plot range (the unit dial with the default
//           2 % padding, ±1.04 about cent) before the setter runs (COMMON-DECISIONS §5, lead K-TC-04)
//   labels  'stacked' (built-up fractions, as Text[θ, …] with exact θ draws them in all five originals) | 'inline'
//           (piFraction of shared/mma-text.js; COMMON-DECISIONS §6)
// Test ids: the container `dial-<name>` (not interactive), its locator `locator-<name>` (shared/svg-plot.js).
// PORT DEVIATIONS: a setter result (0, 0) (a press exactly at the centre with 'normalize': ArcTan[0, 0] is
// indeterminate) is ignored, the dial keeps its point (two-link-kinematics D-TK-07, torus chart K-TC-03); drawing
// sizes, fonts, the arrowhead shape and the sampled B-spline approximate Mathematica's (D-TK-04).
//
// The pure parts (makeHand, the setters, the clamp, the key rule and the drawing data dialGraphics) work in Node;
// makeDialControl needs the DOM.
import { NAMED, css } from '../../shared/mma-colors.js';
import { arcTan } from '../../shared/mma-exact.js';
import { normalizeCR, nearest } from '../../shared/mma-extra.js';
import { cosSinPi } from '../../shared/exact-pi.js';
import { piFraction } from '../../shared/mma-text.js';
import { createPlot, addLocators, svgNode } from '../../shared/svg-plot.js';
import { el } from '../../shared/ui.js';
import { myArrowArc2, arrowArc } from './arrow-arcs.js';

/** makeHand[fl, bl, fw, bw]: the five vertices {{-bl, -bw}, {-bl, bw}, {fl, fw}, {fl + 8 fw, 0}, {fl, -fw}}/10. */
export function makeHand(fl, bl, fw, bw) {
  return [[-bl, -bw], [-bl, bw], [fl, fw], [fl + 8 * fw, 0], [fl, -fw]].map(([x, y]) => [x / 10, y / 10]);
}
/** The hand every dial draws: makeHand[7, 7/3, .1, .3]. */
export const HAND = makeHand(7, 7 / 3, 0.1, 0.3);

/** Table[{Cos@a, Sin@a}, {a, -π, π, π/32}]: 65 points, index i ↔ k = i − 32 (a = kπ/32); the first and last are {−1, 0}. */
export const DIAL_TABLE_32 = Array.from({ length: 65 }, (_, i) => cosSinPi(i - 32, 32));

/** k (−32 … 32) of the table point Nearest returns for p (Euclidean distance; ties: the first in table order). */
export function nearest32Index(p) {
  const q = nearest(DIAL_TABLE_32, p)[0];
  return DIAL_TABLE_32.indexOf(q) - 32;
}

/** The setter of the LocatorPane's Dynamic: 'normalize' → Normalize[#]; 'nearest32' → Nearest[table, #][[1]]. */
export function dialSetter(kind = 'normalize') {
  if (kind === 'normalize') return (p) => normalizeCR(p);
  if (kind === 'nearest32') return (p) => nearest(DIAL_TABLE_32, p)[0].slice();
  throw new RangeError(`dial-control: setter 'normalize' | 'nearest32', got ${kind}`);
}

const DIAL_PADDING = 0.02; // PlotRangePadding -> Scaled[0.02], shared/svg-plot.js default
/** The dial graphic's plot range with its padding: the unit dial about cent, ±1.04. */
export function dialPaneRange(cent = [0, 0], padding = DIAL_PADDING) {
  const p = 2 * padding;
  return [[cent[0] - 1 - p, cent[0] + 1 + p], [cent[1] - 1 - p, cent[1] + 1 + p]];
}
/** A point limited to the range [[x0, x1], [y0, y1]], coordinate by coordinate. */
export const clampToRange = ([x, y], [[x0, x1], [y0, y1]]) => [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];

/** One pointer position → the dial's new point: clamped to the pane (option clamp, default true), then the setter. */
export function dialPointer(p, { setter = 'normalize', clamp = true, cent = [0, 0] } = {}) {
  const q = clamp ? clampToRange(p, dialPaneRange(cent)) : [p[0], p[1]];
  return dialSetter(setter)(q);
}

const KEY_DIR = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
/**
 * One arrow key on the focused dial locator → {pointer, pt} (null for other keys). keyStep a number: the pointer
 * pt + (Shift ? 5 : 1)·keyStep in the key's direction, then dialPointer (clamp, setter). keyStep 'grid': one table
 * step along the dial from the table point nearest pt (Right/Up +1, Left/Down −1, Shift 4 steps = π/8), wrapped
 * into k ∈ [−32, 31], then the setter.
 */
export function dialKey(pt, key, { shift = false, keyStep = 0.05, setter = 'normalize', clamp = true, cent = [0, 0] } = {}) {
  const dir = KEY_DIR[key];
  if (!dir) return null;
  if (keyStep === 'grid') {
    const d = (dir[0] + dir[1]) * (shift ? 4 : 1);
    const k = ((((nearest32Index(pt) + d + 32) % 64) + 64) % 64) - 32;
    const pointer = DIAL_TABLE_32[k + 32].slice();
    return { pointer, pt: dialSetter(setter)(pointer) };
  }
  const s = (shift ? 5 : 1) * keyStep;
  const pointer = [pt[0] + dir[0] * s, pt[1] + dir[1] * s];
  return { pointer, pt: dialPointer(pointer, { setter, clamp, cent }) };
}

const rotateAbout = ([x, y], ang, [cx, cy]) => {
  const c = Math.cos(ang), s = Math.sin(ang), dx = x - cx, dy = y - cy;
  return [cx + c * dx - s * dy, cy + s * dx + c * dy];
};
/** The dial labels Rest@Range[-Pi, Pi, Pi/4]: −3π/4, −π/2, −π/4, 0, π/4, π/2, 3π/4, π as {num, den} (×π). */
export const DIAL_LABELS = [-3, -2, -1, 0, 1, 2, 3, 4].map((k) => ({ num: k, den: 4 }));

/**
 * The dial graphic for the point pt, as data in the original's drawing order:
 * {range, circle: {center, r: 1}, majorTicks (17 segments, a = kπ/8, k = 0 … 16), minorTicks (16, a = π/16 + kπ/8),
 *  labels: [{num, den, at, text, parts}] (at = cent + .7{Cos θ, Sin θ}; parts = piFraction's stacked parts),
 *  ang (ArcTan[pt]), hand (the 5 vertices of makeHand[7, 7/3, .1, .3] translated to cent and rotated by ang),
 *  arcKind, arc (myArrowArc2 result, always an Arrow; or arrowArc of Circle[cent, 0.3, {0, ang}])}.
 */
export function dialGraphics(pt, { cent = [0, 0], arc = 'myArrowArc2' } = {}) {
  if (arc !== 'myArrowArc2' && arc !== 'arrowArcCircle') throw new RangeError(`dial-control: arc 'myArrowArc2' | 'arrowArcCircle', got ${arc}`);
  const at = (r, [c, s]) => [cent[0] + r * c, cent[1] + r * s];
  const majorTicks = Array.from({ length: 17 }, (_, k) => { const cs = cosSinPi(k, 8); return [at(0.94, cs), at(1, cs)]; });
  const minorTicks = Array.from({ length: 16 }, (_, k) => { const cs = cosSinPi(2 * k + 1, 16); return [at(0.98, cs), at(1, cs)]; });
  const labels = DIAL_LABELS.map(({ num, den }) => ({
    num, den, at: at(0.7, cosSinPi(num, den)), text: piFraction(num, den), parts: piFraction(num, den, { form: 'stacked' }),
  }));
  const ang = arcTan(pt[0], pt[1]);
  const hand = HAND.map(([x, y]) => rotateAbout([x + cent[0], y + cent[1]], ang, cent));
  const arcData = arc === 'myArrowArc2'
    ? myArrowArc2(cent, 0.3, [0, ang], { endIsDynamic: true })
    : arrowArc({ center: cent, r: 0.3, start: 0, end: ang });
  return { range: [[cent[0] - 1, cent[0] + 1], [cent[1] - 1, cent[1] + 1]], circle: { center: cent.slice(), r: 1 }, majorTicks, minorTicks, labels, ang, hand, arcKind: arc, arc: arcData };
}

// ------------------------------------------------------------------------------------------------ browser part

/** Arrowheads[s]: a filled triangle of length s × the graphic's width at tip, pointing along direction. */
export function drawArrowhead(plot, g, tip, direction, { size = 0.05, color = NAMED.Black, widthRatio = 0.3 } = {}) {
  const L = size * plot.unitsPerPx * plot.imageSize; // fraction of the whole (padded) graphic width
  const [dx, dy] = direction, nx = -dy, ny = dx, h = L * widthRatio;
  const b = [tip[0] - L * dx, tip[1] - L * dy];
  return plot.polygon(g, [tip, [b[0] + h * nx, b[1] + h * ny], [b[0] - h * nx, b[1] - h * ny]], { fill: color });
}

/**
 * Draws a myArrowArc / myArrowArc2 / arrowArc result: a Point (pointSize), an Arrow (sampled B-spline + head) or an
 * arc with its tiny arrow (the head only). style: {color, thickness, headSize (Arrowheads, default 0.05), pointSize}.
 */
export function drawArcArrow(plot, g, data, { color = NAMED.Black, thickness, headSize = 0.05, pointSize = 'Medium' } = {}) {
  if (data.kind === 'Point') return plot.point(g, data.at, pointSize, color);
  if (data.kind === 'Arrow') {
    plot.line(g, data.curve, { stroke: color, thickness });
    return drawArrowhead(plot, g, data.tip, data.direction, { size: headSize, color });
  }
  plot.line(g, data.arc, { stroke: color, thickness });
  return drawArrowhead(plot, g, data.tip, data.direction, { size: headSize, color });
}

function drawLabel(plot, g, { at, text, parts }, mode, { fontPx = 10, color = NAMED.Gray } = {}) {
  if (mode === 'inline' || parts.den == null) return plot.text(g, text, at, { fontPx, color });
  const u = plot.unitsPerPx, f = fontPx * 0.9;
  const w = Math.max(parts.num.length, parts.den.length) * f * 0.55 * u;
  const sx = parts.sign ? f * 0.35 * u : 0;
  const cx = at[0] + sx;
  const grp = plot.group(g, { class: 'dial-label' });
  if (parts.sign) plot.text(grp, parts.sign, [cx - w / 2 - f * 0.4 * u, at[1]], { fontPx: f, color });
  plot.text(grp, parts.num, [cx, at[1] + f * 0.55 * u], { fontPx: f, color });
  plot.line(grp, [[cx - w / 2, at[1]], [cx + w / 2, at[1]]], { stroke: color, thickness: { abs: 0.6 } });
  plot.text(grp, parts.den, [cx, at[1] - f * 0.55 * u], { fontPx: f, color });
  return grp;
}

/**
 * makeDialControl(controls, opts) — one dial in the control column (shared/ui.js Controls).
 * opts: {name, label, color (RGB triple), value (pt, default [1, 0]), onInput(pt, {source: 'pointer' | 'key'}),
 *        imageSize = 140 | 'automatic', setter = 'normalize' | 'nearest32', arc = 'myArrowArc2' | 'arrowArcCircle',
 *        keyStep = 0.05 | 'grid', clamp = true, labels = 'stacked' | 'inline', cent = [0, 0], parent}.
 * Every pointer move (at most one per animation frame) and every arrow key is one setter application and one onInput.
 * Returns {get(), set(pt) (programmatic: no onInput), redraw(), graphics() (dialGraphics of the current point),
 *          plot, row, box}; also registered in controls.controls under name.
 */
export function makeDialControl(controls, opts) {
  const { name, label = '', color = NAMED.Red, onInput, parent } = opts;
  const setter = opts.setter ?? 'normalize', arc = opts.arc ?? 'myArrowArc2', keyStep = opts.keyStep ?? 0.05;
  const clamp = opts.clamp !== false, labels = opts.labels ?? 'stacked', cent = opts.cent ?? [0, 0];
  if (labels !== 'stacked' && labels !== 'inline') throw new RangeError(`dial-control: labels 'stacked' | 'inline', got ${labels}`);
  if (!(keyStep === 'grid' || (typeof keyStep === 'number' && keyStep > 0))) throw new RangeError(`dial-control: keyStep a positive number | 'grid', got ${keyStep}`);
  dialSetter(setter); // validates
  const imageSize = opts.imageSize === 'automatic' ? 180 : (opts.imageSize ?? 140);
  let pt = (opts.value ?? [1, 0]).slice();

  const box = el('div', { class: 'dial', 'data-testid': `dial-${name}`, style: `width:${imageSize}px;max-width:100%` });
  const row = el('div', { class: 'ctl ctl-dial', 'data-testid': `ctl-${name}`, style: 'flex-direction:row;align-items:center;gap:6px' },
    label ? el('label', { class: 'ctl-label' }, label) : null, box);
  (parent ?? controls.root).append(row);

  const plot = createPlot(box, {
    plotRange: [[cent[0] - 1, cent[0] + 1], [cent[1] - 1, cent[1] + 1]], imageSize, testid: `dial-svg-${name}`,
    label: `${label || name} dial`,
  });
  // overflow visible: Mathematica draws a locator glyph whole even where it reaches past the dial's plot range
  Object.assign(plot.svg.style, { display: 'block', width: '100%', height: 'auto', touchAction: 'none', overflow: 'visible' });
  const back = plot.layer('dial'), front = plot.layer('hand');

  // static part: circle, ticks, labels (Gray)
  const g0 = dialGraphics(pt, { cent, arc });
  plot.arc(back, g0.circle.center, 1, 0, 2 * Math.PI, { stroke: NAMED.Gray });
  for (const seg of [...g0.majorTicks, ...g0.minorTicks]) plot.line(back, seg, { stroke: NAMED.Gray });
  for (const lab of g0.labels) drawLabel(plot, back, lab, labels, { fontPx: 10, color: NAMED.Gray });

  const draw = () => {
    plot.clear('hand');
    const gr = dialGraphics(pt, { cent, arc });
    plot.polygon(front, gr.hand, { fill: color, stroke: NAMED.Black, thickness: { abs: 0.75 } });
    drawArcArrow(plot, front, gr.arc, { color: arc === 'myArrowArc2' ? color : NAMED.Black, headSize: 0.05 });
    front.setAttribute('data-ang', String(gr.ang));
  };

  const apply = (next, source) => {
    if (next[0] === 0 && next[1] === 0) return; // ArcTan[0, 0] is indeterminate: keep the point (D-TK-07, K-TC-03)
    pt = next;
    draw();
    loc.redraw();
    onInput?.(pt.slice(), { source });
  };
  const KEY_UNIT = keyStep === 'grid' ? 1 : keyStep;
  const loc = addLocators(plot, {
    names: [name], get: () => pt, pickAnywhere: true, keyStep: KEY_UNIT,
    describe: () => `${label || name} dial; arrow keys turn it`,
    onMove: (_n, p, { source }) => {
      if (source === 'key') {
        // shared/svg-plot.js moved the point by ±KEY_UNIT (Shift ±5 KEY_UNIT) along one axis: recover the key
        const dx = p[0] - pt[0], dy = p[1] - pt[1];
        const key = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowUp' : 'ArrowDown');
        const shift = Math.max(Math.abs(dx), Math.abs(dy)) > 2.5 * KEY_UNIT;
        const r = dialKey(pt, key, { shift, keyStep, setter, clamp, cent });
        if (r) apply(r.pt, 'key');
        return;
      }
      apply(dialPointer(p, { setter, clamp, cent }), 'pointer');
    },
  });
  draw();

  const api = {
    get: () => pt.slice(),
    set: (v) => { pt = [Number(v[0]), Number(v[1])]; draw(); loc.redraw(); },
    redraw: () => { draw(); loc.redraw(); },
    graphics: () => dialGraphics(pt, { cent, arc }),
    plot, row, box,
    options: { name, imageSize, setter, arc, keyStep, clamp, labels, color: css(color) },
  };
  controls.controls?.set(name, api);
  return api;
}
