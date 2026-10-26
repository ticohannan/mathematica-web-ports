// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/svg-frame.js — Frame, FrameTicks, Axes and Ticks of a 2D Mathematica plot for pictures made with
// shared/svg-plot.js (COMMON-DECISIONS §3; specified by the distance-norms draft F-DN-17 / §6 / D-DN-03, used by
// four-bar-linkage F-FB-14 and dubins-isochrons F-DI-15). Kept separate from svg-plot.js so that file stays
// unchanged.
//
//  ticks(min, max, {major, minor})       tick positions: major multiples of `major` inside [min, max], minor
//                                        multiples of `minor` that are not major (also beyond the outer majors).
//  automaticTicks(min, max)              steps chosen like Mathematica's automatic ticks in the drafts' cases:
//                                        major 1, 2 or 5 × 10^n nearest (in ratio) to a sixth of the range, minor a
//                                        fifth of it (a quarter for 2 × 10^n). Reproduces −2.5…2.5 → 1 / 0.2 (DN),
//                                        −π…π → 1 / 0.2 (FB), −16.5…16.5 → 5 / 1 (DI). An APPROXIMATION of
//                                        Mathematica's algorithm beyond these cases; pass explicit steps if known.
//  tickLabel(v, step, {minus})           "−2", "0.5", "10" (decimals of the step; minus U+2212 by default, as the
//                                        drafts' label texts).
//  frameLayout(range, {imageSize, margins})  a createPlot plotRange/padding that leaves room (px at the nominal
//                                        image size) for frame labels around the frame range.
//  framePrimitives(opts) / axesPrimitives(opts)  the drawing as data: lines and texts in world coordinates
//                                        (pure, unit-tested).
//  drawFrame(plot, layer, opts) / drawAxes(plot, layer, opts)  draw them into an svg-plot layer (browser).
//  clipToRange(plot, layer, range)       clip a layer's content to a rectangle (PlotRangeClipping).
// Defaults follow the drafts: frame, ticks, axes and labels GrayLevel 0.4 (labels (102, 102, 102) in the DN
// snapshot), major ticks 4 px, minor 2.3 px at the nominal image size (DN: 9 px and 5 px at 2.19 px/pt), ticks
// pointing into the frame on all four sides, labels on the left and bottom; Axes ticks on the positive side of
// each axis, labels on the negative side, no tick or label at the origin where the axes cross.

import { svgNode } from './svg-plot.js';

export const MINUS = '−';
const GRAY = [0.4, 0.4, 0.4];
const EPS = 1e-9;

const decimalsOf = (step) => {
  for (let d = 0; d <= 12; d++) if (Math.abs(Math.round(step * 10 ** d) - step * 10 ** d) < 1e-9 * 10 ** d) return d;
  return 12;
};
/** k·step rounded to the step's decimals (so 3·0.2 is 0.6, not 0.6000000000000001). */
const multiple = (k, step, d) => Number((k * step).toFixed(d));

export function ticks(min, max, { major, minor = 0 } = {}) {
  const dM = decimalsOf(major);
  const majors = [];
  for (let k = Math.ceil(min / major - EPS); k <= Math.floor(max / major + EPS); k++) majors.push(multiple(k, major, dM) + 0);
  const minors = [];
  if (minor > 0) {
    const dm = decimalsOf(minor);
    for (let k = Math.ceil(min / minor - EPS); k <= Math.floor(max / minor + EPS); k++) {
      const v = multiple(k, minor, dm) + 0;
      if (!majors.some((M) => Math.abs(M - v) < EPS * major)) minors.push(v);
    }
  }
  return { major: majors, minor: minors };
}

export function automaticTicks(min, max) {
  const target = (max - min) / 6;
  const p = 10 ** Math.floor(Math.log10(target));
  let best = null;
  for (const m of [1, 2, 5, 10]) {
    const s = m * p, score = Math.abs(Math.log(s / target));
    if (!best || score < best.score) best = { s, m: m === 10 ? 1 : m, score };
  }
  const major = Number(best.s.toPrecision(12));
  const minor = Number((major / (best.m === 2 ? 4 : 5)).toPrecision(12));
  return { majorStep: major, minorStep: minor, ...ticks(min, max, { major, minor }) };
}

export function tickLabel(v, step, { minus = MINUS } = {}) {
  const s = Math.abs(v).toFixed(decimalsOf(step));
  return v < 0 && Number(s) !== 0 ? minus + s : s;
}

export function frameLayout([[x0, x1], [y0, y1]], { imageSize, margins = {} }) {
  const { left = 0, right = 0, top = 0, bottom = 0 } = margins;
  const u = (x1 - x0) / (imageSize - left - right); // world units per px
  return { plotRange: [[x0 - left * u, x1 + right * u], [y0 - bottom * u, y1 + top * u]], padding: 0, imageSize, unitsPerPx: u };
}

const tickSpec = (axisOpts, lo, hi) => {
  if (axisOpts && (axisOpts.major != null || axisOpts.ticks)) {
    if (axisOpts.ticks) return labelled(axisOpts.ticks);
    return ticks(lo, hi, { major: axisOpts.major, minor: axisOpts.minor ?? 0 });
  }
  const a = automaticTicks(lo, hi);
  return { major: a.major, minor: a.minor, majorStep: a.majorStep };
};
// explicit ticks may be [value, label] pairs (Mathematica's Ticks -> {{π/2, "π/2"}, …}); labels kept in a Map
function labelled(t) {
  if (!t.major.some(Array.isArray) && !(t.minor ?? []).some(Array.isArray)) return t;
  const labels = new Map();
  const major = t.major.map((v) => { if (Array.isArray(v)) { labels.set(v[0], v[1]); return v[0]; } return v; });
  return { ...t, major, minor: (t.minor ?? []).map((v) => (Array.isArray(v) ? v[0] : v)), labels };
}
const labelOf = (t, v, step, minus) => (t.labels?.has(v) ? t.labels.get(v) : tickLabel(v, step, { minus }));
// opts.scale = [sx, sy] (v0.1.23, plots with an AspectRatio): ranges, ticks and labels are in data units, the drawing in
// world units x·sx, y·sy; pixel lengths use the world's unitsPerPx. Without it, nothing is scaled (as before).
const scaler = (opts) => {
  if (!opts.scale) return null;
  const [sx, sy] = opts.scale;
  const P = ([x, y]) => [x * sx, y * sy];
  return { sx, sy, map: (prims) => ({ lines: prims.lines.map((l) => ({ ...l, pts: l.pts.map(P) })), texts: prims.texts.map((t) => ({ ...t, pos: P(t.pos) })) }) };
};
const stepOf = (t, fallback) => t.majorStep ?? (t.major.length > 1 ? t.major[1] - t.major[0] : fallback);

/**
 * The frame as data. opts: range [[x0, x1], [y0, y1]] (the frame), unitsPerPx (plot.unitsPerPx), x / y: {major,
 * minor} or {ticks: {major: [..], minor: [..]}} (default automatic), majorStep / minorStep (both axes),
 * labelSides or labels (default ['left', 'bottom']), tickSides (default all four), tickLengthsPx [major, minor] ([4, 2.3]),
 * labelOffsetPx (3), fontPx (11), axes (true: lines x = 0 and y = 0 inside the frame, without ticks), minus.
 * Returns {lines: [{role, pts}], texts: [{role, str, pos, anchor}]}; roles 'frame', 'axis-x', 'axis-y', 'major',
 * 'minor', 'label-x', 'label-y'.
 */
export function framePrimitives(opts) {
  const sc = scaler(opts);
  if (sc) return sc.map(framePrimitivesIn(opts, opts.unitsPerPx / sc.sx, opts.unitsPerPx / sc.sy));
  return framePrimitivesIn(opts, opts.unitsPerPx, opts.unitsPerPx);
}
function framePrimitivesIn(opts, ux, uy) {
  const [[x0, x1], [y0, y1]] = opts.range;
  const tl = opts.tickLengthsPx ?? [4, 2.3];
  const [lMx, lmx] = tl.map((p) => p * ux), [lMy, lmy] = tl.map((p) => p * uy); // along x (ticks on vertical sides) / along y
  const offx = (opts.labelOffsetPx ?? 3) * ux, offy = (opts.labelOffsetPx ?? 3) * uy, fonty = (opts.fontPx ?? 11) * uy;
  const both = opts.majorStep != null ? { major: opts.majorStep, minor: opts.minorStep ?? 0 } : null;
  const tx = tickSpec(opts.x ?? both, x0, x1), ty = tickSpec(opts.y ?? both, y0, y1);
  const sides = opts.frameSides; // v0.1.23: Frame -> {bottom, left, top, right} with some False: only those sides
  const tickSides = opts.tickSides ?? sides ?? ['left', 'right', 'bottom', 'top'];
  const labelSides = opts.labelSides ?? opts.labels ?? (sides ? ['left', 'bottom'].filter((x) => sides.includes(x)) : ['left', 'bottom']); // `labels`: the DN draft's name
  const SIDE = { bottom: [[x0, y0], [x1, y0]], right: [[x1, y0], [x1, y1]], top: [[x1, y1], [x0, y1]], left: [[x0, y1], [x0, y0]] };
  const lines = sides ? sides.map((k) => ({ role: 'frame', pts: SIDE[k] })) : [{ role: 'frame', pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] }];
  if (opts.axes) {
    const [ox, oy] = opts.axesOrigin ?? [0, 0]; // v0.1.23: AxesOrigin (default the origin)
    if (y0 < oy && y1 > oy) lines.push({ role: 'axis-x', pts: [[x0, oy], [x1, oy]] });
    if (x0 < ox && x1 > ox) lines.push({ role: 'axis-y', pts: [[ox, y0], [ox, y1]] });
  }
  const texts = [];
  for (const [vals, role, len] of [[tx.major, 'major', lMy], [tx.minor, 'minor', lmy]]) {
    for (const x of vals) {
      if (tickSides.includes('bottom')) lines.push({ role, pts: [[x, y0], [x, y0 + len]] });
      if (tickSides.includes('top')) lines.push({ role, pts: [[x, y1], [x, y1 - len]] });
    }
  }
  for (const [vals, role, len] of [[ty.major, 'major', lMx], [ty.minor, 'minor', lmx]]) {
    for (const y of vals) {
      if (tickSides.includes('left')) lines.push({ role, pts: [[x0, y], [x0 + len, y]] });
      if (tickSides.includes('right')) lines.push({ role, pts: [[x1, y], [x1 - len, y]] });
    }
  }
  const sx = stepOf(tx, 1), sy = stepOf(ty, 1), minus = opts.minus ?? MINUS;
  for (const x of tx.major) {
    if (labelSides.includes('bottom')) texts.push({ role: 'label-x', str: labelOf(tx, x, sx, minus), pos: [x, y0 - offy - fonty / 2], anchor: 'middle' });
    if (labelSides.includes('top')) texts.push({ role: 'label-x', str: labelOf(tx, x, sx, minus), pos: [x, y1 + offy + fonty / 2], anchor: 'middle' });
  }
  for (const y of ty.major) {
    if (labelSides.includes('left')) texts.push({ role: 'label-y', str: labelOf(ty, y, sy, minus), pos: [x0 - offx, y], anchor: 'end' });
    if (labelSides.includes('right')) texts.push({ role: 'label-y', str: labelOf(ty, y, sy, minus), pos: [x1 + offx, y], anchor: 'start' });
  }
  return { lines, texts };
}

/**
 * Axes through the origin as data. opts: range [[x0, x1], [y0, y1]] (the extent of the axis lines: the visible
 * plot range including padding), origin ([0, 0], AxesOrigin), unitsPerPx, x / y / majorStep / minorStep as in
 * framePrimitives, tickRange (the range in which ticks are placed; default range), tickLengthsPx, labelOffsetPx,
 * fontPx, axesLabel [xText, yText] (AxesLabel at the positive ends), skipOrigin (default true), minus.
 */
export function axesPrimitives(opts) {
  const sc = scaler(opts);
  if (sc) return sc.map(axesPrimitivesIn(opts, opts.unitsPerPx / sc.sx, opts.unitsPerPx / sc.sy));
  return axesPrimitivesIn(opts, opts.unitsPerPx, opts.unitsPerPx);
}
function axesPrimitivesIn(opts, ux, uy) {
  const [[x0, x1], [y0, y1]] = opts.range;
  const [[tx0, tx1], [ty0, ty1]] = opts.tickRange ?? opts.range;
  const [ox, oy] = opts.origin ?? [0, 0];
  const tl = opts.tickLengthsPx ?? [4, 2.3];
  const [lMx, lmx] = tl.map((p) => p * ux), [lMy, lmy] = tl.map((p) => p * uy);
  const offx = (opts.labelOffsetPx ?? 3) * ux, offy = (opts.labelOffsetPx ?? 3) * uy, fonty = (opts.fontPx ?? 11) * uy;
  const both = opts.majorStep != null ? { major: opts.majorStep, minor: opts.minorStep ?? 0 } : null;
  const tx = tickSpec(opts.x ?? both, tx0, tx1), ty = tickSpec(opts.y ?? both, ty0, ty1);
  const skip = opts.skipOrigin !== false;
  const minus = opts.minus ?? MINUS;
  const lines = [{ role: 'axis-x', pts: [[x0, oy], [x1, oy]] }, { role: 'axis-y', pts: [[ox, y0], [ox, y1]] }];
  const texts = [];
  const atOrigin = (v, o, step) => skip && Math.abs(v - o) < EPS * step;
  const sx = stepOf(tx, 1), sy = stepOf(ty, 1);
  for (const [vals, role, len] of [[tx.major, 'major', lMy], [tx.minor, 'minor', lmy]]) {
    for (const x of vals) if (!atOrigin(x, ox, sx)) lines.push({ role: `${role}-x`, pts: [[x, oy], [x, oy + len]] });
  }
  for (const [vals, role, len] of [[ty.major, 'major', lMx], [ty.minor, 'minor', lmx]]) {
    for (const y of vals) if (!atOrigin(y, oy, sy)) lines.push({ role: `${role}-y`, pts: [[ox, y], [ox + len, y]] });
  }
  for (const x of tx.major) if (!atOrigin(x, ox, sx)) texts.push({ role: 'label-x', str: labelOf(tx, x, sx, minus), pos: [x, oy - offy - fonty / 2], anchor: 'middle' });
  for (const y of ty.major) if (!atOrigin(y, oy, sy)) texts.push({ role: 'label-y', str: labelOf(ty, y, sy, minus), pos: [ox - offx, y], anchor: 'end' });
  if (opts.axesLabel) {
    const [lx, ly] = opts.axesLabel;
    if (lx) texts.push({ role: 'axes-label-x', str: lx, pos: [x1 + offx, oy], anchor: 'start' });
    if (ly) texts.push({ role: 'axes-label-y', str: ly, pos: [ox, y1 + offy + fonty / 2], anchor: 'middle' });
  }
  return { lines, texts };
}

function render(plot, layer, prims, opts, testids) {
  const color = opts.color ?? GRAY, labelColor = opts.labelColor ?? GRAY, fontPx = opts.fontPx ?? 11;
  const groups = new Map();
  const groupFor = (role) => {
    const key = testids[role] ?? 'ticks';
    if (!groups.has(key)) groups.set(key, plot.group(layer, { 'data-testid': `${opts.testidPrefix ?? ''}${key}` }));
    return groups.get(key);
  };
  for (const l of prims.lines) {
    plot.line(groupFor(l.role), l.pts, { stroke: color, thickness: { abs: opts.thicknessPx ?? 0.5 }, cap: 'butt' });
  }
  for (const t of prims.texts) {
    const style = t.role.startsWith('axes-label') ? opts.axesLabelStyle ?? {} : {};
    plot.text(groupFor(t.role), t.str, t.pos, { fontPx, color: labelColor, anchor: t.anchor, ...style });
  }
  return Object.fromEntries(groups);
}

/** Draws framePrimitives into `layer` of an svg-plot picture; groups `frame`, `ticks`, `labels`, `axes`. */
export function drawFrame(plot, layer, opts) {
  const prims = framePrimitives({ unitsPerPx: plot.unitsPerPx, ...opts });
  return render(plot, layer, prims, opts, { frame: 'frame', 'axis-x': 'axes', 'axis-y': 'axes', major: 'ticks', minor: 'ticks', 'label-x': 'labels', 'label-y': 'labels' });
}
/** Draws axesPrimitives into `layer`; groups `axis-x` and `axis-y` (each with its ticks and tick labels). */
export function drawAxes(plot, layer, opts) {
  const prims = axesPrimitives({ unitsPerPx: plot.unitsPerPx, ...opts });
  return render(plot, layer, prims, opts, {
    'axis-x': 'axis-x', 'major-x': 'axis-x', 'minor-x': 'axis-x', 'label-x': 'axis-x', 'axes-label-x': 'axis-x',
    'axis-y': 'axis-y', 'major-y': 'axis-y', 'minor-y': 'axis-y', 'label-y': 'axis-y', 'axes-label-y': 'axis-y',
  });
}

let clipCount = 0;
/** Clips `layer` (a group of the picture) to the rectangle `range` (world coordinates); returns the clipPath id. */
export function clipToRange(plot, layer, [[x0, x1], [y0, y1]]) {
  const id = `svgframe-clip-${++clipCount}`;
  let defs = plot.svg.querySelector('defs');
  if (!defs) { defs = svgNode('defs'); plot.svg.prepend(defs); }
  const cp = svgNode('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
  cp.append(svgNode('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }));
  defs.append(cp);
  layer.setAttribute('clip-path', `url(#${id})`);
  return id;
}
