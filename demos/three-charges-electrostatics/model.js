// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Whasington Silvestre
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-charges-electrostatics/model.js — one evaluation of the Manipulate body of "Electrostatics of a Linear
// System of Three Charged Particles": the state in, { view, graphics } out (pure, no DOM).
//
// The original's Module, in its order: k, a; f1t, f2t, fnet (Coulomb forces on the target qt, charges in μC, positions
// in m, forces in N); root = NSolve[(q1/|x − x1|³)(x − x1) + (q2/|x − x2|³)(x − x2) == 0, x, Real] (equilibrium of
// the target); the arrow icons af1t, af2t (forces on qt) and ae1, ae2 (fields at xt); nf (NumberForm[q 1., {8, 4}]);
// the Plot of fnet and fnet/qt over {x, −10, xt} with its Epilog (charges, labels, the two data tables, the orange
// equilibrium point, the icons).
import { Drop, Range } from '../../shared/wl.js';
import {
  Graphics, Annotation, Point, Arrow, Text, Line, Rectangle, Style, Subscript, Row, Italic, PointSize, FontSize,
  Arrowheads, AbsoluteThickness, EdgeForm, Red, Black, White, Blue, Green, Orange, LightBlue, Opacity, GrayLevel,
  RGBColor,
} from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';

export const k = 8.99 * 10 ** 9;
export const a = 10 ** -6;
/** Drop[Range[-20, 20, 1], {21}]: the values of the charge sliders, −20 … 20 without 0 (written {21, 21} here:
 *  shared/wl.js Drop reads a list as {m, n} and has no {n} form — a shared candidate). */
export const CHARGES = Object.freeze(Drop(Range(-20, 20, 1), [21, 21]));
/** Mathematica's LightOrange (RGBColor[1, 0.9, 0.8]). */
export const LightOrange = RGBColor(1, 0.9, 0.8);

/** The Manipulate's initial values (= the notebook's live state and snapshot 1). */
export const initialState = () => ({
  q1: 5, q2: 5, qt: -5, x1: 0, x2: 5, xt: -8, force: false, field: false, status: false, edata: false,
});

// ---- the original's functions ----------------------------------------------------------------------------------------
/** f1t[x1_, xt_, q1_, qt_] := ((k qt q1 a a)/Abs[xt − x1]^3)(xt − x1): the force (N) of q1 on qt. NaN = Indeterminate. */
export const f1t = (x1, xt, q1, qt) => ((k * qt * q1 * a * a) / Math.abs(xt - x1) ** 3) * (xt - x1);
/** f2t: the force of q2 on qt (the same formula). */
export const f2t = (x2, xt, q2, qt) => ((k * qt * q2 * a * a) / Math.abs(xt - x2) ** 3) * (xt - x2);
/** fnet = f1t + f2t. */
export const fnet = (x1, x2, xt, q1, q2, qt) => f1t(x1, xt, q1, qt) + f2t(x2, xt, q2, qt);

/**
 * root = NSolve[(q1/Abs[x − x1]^3)(x − x1) + (q2/Abs[x − x2]^3)(x − x2) == 0, x, Real] in Mathematica's list form:
 *   []      = {}   no finite solution (shown as "±∞"),
 *   [[]]    = {{}} every x is a solution (x1 == x2 and q1 + q2 == 0: the two terms cancel identically; "everywhere"),
 *   [[xe]]  = {{x -> xe}}.
 * The real line is cut at the charges; on each piece the equation is q_lo/(x − lo)² · s_lo + q_hi/(x − hi)² · s_hi = 0
 * (s = sign of x − charge position), i.e. one quadratic, solved in closed form for the root that lies on that piece:
 * between the charges a root exists iff q1 q2 > 0, outside iff q1 q2 < 0 and |q| of the far charge is larger. So there
 * is never more than one real root and root[[1, 1, 2]] has no choice to make (N-TA-02). The unit tests check this
 * against an independent scan of the line.
 */
export function equilibrium(q1, q2, x1, x2) {
  if (x1 === x2) return q1 + q2 === 0 ? [[]] : []; // the terms combine to (q1 + q2)(x − x1)/Abs[x − x1]^3
  const [lo, qlo, hi, qhi] = x1 < x2 ? [x1, q1, x2, q2] : [x2, q2, x1, q1];
  if (qlo * qhi > 0) {
    // lo < x < hi: qlo/(x − lo)² = qhi/(hi − x)²  →  x − lo = r (hi − x), r = √(qlo/qhi)
    const r = Math.sqrt(qlo / qhi);
    return [[(lo + r * hi) / (1 + r)]];
  }
  if (Math.abs(qhi) > Math.abs(qlo)) {
    // x < lo: qlo/(lo − x)² = −qhi/(hi − x)²  →  hi − x = r (lo − x), r = √(−qhi/qlo) > 1
    const r = Math.sqrt(-qhi / qlo);
    return [[lo - (hi - lo) / (r - 1)]];
  }
  if (Math.abs(qlo) > Math.abs(qhi)) {
    // x > hi: qlo/(x − lo)² = −qhi/(x − hi)²  →  x − lo = r (x − hi), r = √(−qlo/qhi) > 1
    const r = Math.sqrt(-qlo / qhi);
    return [[hi + (hi - lo) / (r - 1)]];
  }
  return []; // q1 = −q2 at different places: the force vanishes only at infinity
}
/** The left side of the equilibrium equation (for the tests). */
export const equilibriumLhs = (x, q1, q2, x1, x2) => (q1 / Math.abs(x - x1) ** 3) * (x - x1) + (q2 / Math.abs(x - x2) ** 3) * (x - x2);

/**
 * nf[q_] := NumberForm[q*1., {8, 4}, ExponentFunction -> (Null &)]: 4 digits after the point, at most 8 significant
 * digits (the others shown as zeros), never an exponent; a negative number keeps its sign also when it rounds to zero
 * ("−0.0000", as snapshot 4 shows); Indeterminate (NaN) as the word. The minus sign is Mathematica's typeset "−".
 */
export function nf(q) {
  if (Number.isNaN(q)) return 'Indeterminate';
  if (!Number.isFinite(q)) return 'ComplexInfinity';
  if (q === 0) return '0.0000';
  const ax = Math.abs(q), sign = q < 0 ? '−' : '';
  const e = Math.floor(Math.log10(ax)) + 1; // digits before the point (≤ 0 for |q| < 1)
  if (e + 4 <= 8) return sign + ax.toFixed(4);
  const kept = Number(ax.toPrecision(8)); // 8 significant digits
  const dec = Math.max(0, 8 - e);
  let s = e >= 8 ? BigInt(Math.round(kept)).toString() : kept.toFixed(dec);
  if (!s.includes('.')) s += '.';
  const d = s.length - s.indexOf('.') - 1;
  return sign + s + '0'.repeat(Math.max(0, 4 - d));
}

// Mathematica's If[cond, …] with a condition that is neither True nor False (a comparison with Indeterminate) stays
// unevaluated: here null, and an arrow built from it is not drawn (K-TA-02)
const gt = (u, v) => (Number.isNaN(u) || Number.isNaN(v) ? null : u > v);
const sizeOf = (u, v) => { const c = gt(Math.abs(u), Math.abs(v)); return c === null ? null : c ? 2 : 1; };

/** The four arrows of the icons: af1t, af2t (forces on qt, upper left), ae1, ae2 (fields at xt, upper right). */
export function arrows({ q1, q2, qt, x1, x2, xt }) {
  const F1 = f1t(x1, xt, q1, qt), F2 = f2t(x2, xt, q2, qt);
  const f1ts = sizeOf(F1, F2), f2ts = sizeOf(F2, F1);
  const pos = (u) => gt(u, 0);
  const af1t = f1ts === null || pos(F1) === null ? null
    : pos(F1) ? [[-(5.25 + f1ts), 4.5], [-5.25, 4.5]] : [[-5.25, 4.5], [-(5.25 + f1ts), 4.5]];
  const af2t = f2ts === null || pos(F2) === null ? null
    : pos(F2) ? [[-4.75, 4.5], [-(4.75 - f2ts), 4.5]] : [[-(4.75 - f2ts), 4.5], [-4.75, 4.5]];
  const E1 = F1 / (qt * a), E2 = F2 / (qt * a);
  const e1s = sizeOf(E1, E2), e2s = sizeOf(E2, E1);
  const ae1 = e1s === null || pos(E1) === null ? null : pos(E1) ? [[5 - e1s, 4.5], [5, 4.5]] : [[5, 4.5], [5 - e1s, 4.5]];
  const ae2 = e2s === null || pos(E2) === null ? null : pos(E2) ? [[5, 4.5], [5 + e2s, 4.5]] : [[5 + e2s, 4.5], [5, 4.5]];
  return { af1t, af2t, ae1, ae2, f1ts, f2ts, e1s, e2s };
}

/** The rows of a data table at position x: [label, nf(value), unit] (labels as text expressions). */
export function tableRows({ q1, q2, qt, x1, x2 }, x, first) {
  const F1 = f1t(x1, x, q1, qt), F2 = f2t(x2, x, q2, qt), Fn = fnet(x1, x2, x, q1, q2, qt);
  const lab = (L, sub) => Subscript(Style(L, Italic), sub);
  return [
    [first, nf(x), 'm'],
    [lab('F', Row(['1 ', Style('t', Italic)])), nf(F1), 'N'],
    [lab('F', Row(['2 ', Style('t', Italic)])), nf(F2), 'N'],
    [lab('F', 'net'), nf(Fn), 'N'],
    // "here we are dividing by qt instead of qt*a to scale the field": N/μC = MN/C (N-TA-03)
    [lab('E', '1'), nf(F1 / qt), 'MN/C'],
    [lab('E', '2'), nf(F2 / qt), 'MN/C'],
    [lab('E', 'net'), nf(Fn / qt), 'MN/C'],
  ];
}

// ---- the picture -----------------------------------------------------------------------------------------------------
export const PLOT_RANGE = [[-10, 10], [-5, 5]];
export const IMAGE_SIZE = 425;
// pixels of the 425-px picture per unit (PlotRange {{−10, 10}, {−5, 5}}, AspectRatio 1; 1 px ImagePadding each side)
const PX_X = (IMAGE_SIZE - 2) / 20, PX_Y = (IMAGE_SIZE - 2) / 10;
// Grid[…, Frame -> All, ItemSize -> {{3, 9, 4}}, BaseStyle -> 12]: measured in the snapshots: columns 36, 96, 45 px,
// rows 16.9 px (an app-local table: the shared Grid has no per-column ItemSize — a shared candidate)
const COLS_PX = [36, 96, 45], ROW_PX = 16.9;

/** A framed table of texts centred at c, as Graphics primitives in plot coordinates. */
function dataTable(rows, [cx, cy], background, id) {
  const ws = COLS_PX.map((w) => w / PX_X), h = ROW_PX / PX_Y;
  const W = ws.reduce((s, w) => s + w, 0), H = rows.length * h;
  const x0 = cx - W / 2, y0 = cy + H / 2;
  const xs = [x0]; ws.forEach((w) => xs.push(xs.at(-1) + w));
  const lines = [
    ...Array.from({ length: rows.length + 1 }, (_, i) => Line([[x0, y0 - i * h], [x0 + W, y0 - i * h]])),
    ...xs.map((x) => Line([[x, y0], [x, y0 - H]])),
  ];
  const texts = rows.flatMap((r, i) => r.map((cell, j) => Text(cell, [(xs[j] + xs[j + 1]) / 2, y0 - (i + 0.5) * h])));
  return Annotation([
    [background, EdgeForm(), Rectangle([x0, y0 - H], [x0 + W, y0])],
    [Black, AbsoluteThickness(1), ...lines],
    [Black, FontSize(12), ...texts],
  ], id, { 'data-rows': rows.map((r) => r.map((c) => (typeof c === 'string' ? c : '')).join('|')).join(';') });
}

const sub = (L, s) => Style(Subscript(Style(L, Italic), s), Black);
const signOf = (q) => (q > 0 ? Style('+', White) : Style('-', White));
const colorOf = (q) => (q < 0 ? Black : Red);

/** Manipulate body: the state in, { view, graphics } out. */
export function evaluate(state) {
  const { q1, q2, qt, x1, x2, xt, force, field, status, edata } = state;
  const root = equilibrium(q1, q2, x1, x2);
  const found = edata && root.length > 0 && root[0].length > 0; // edata && root != {} && root != {{}}
  const xe = root.length > 0 && root[0].length > 0 ? root[0][0] : null;
  const ar = arrows(state);
  const xtRows = status ? tableRows(state, xt, Subscript(Style('x', Italic), Style('t', Italic))) : null;
  const eqRows = found ? tableRows(state, xe, Subscript(Style('x', Italic), Style('e', Italic)))
    : edata ? [[Subscript(Style('x', Italic), Style('e', Italic)), root.length === 0 ? '±∞' : 'everywhere', 'm']] : null;

  const epilog = [
    PointSize(0.03), FontSize(16),
    Annotation([colorOf(q1), Point([x1, 0])], 'charge-1', { 'data-color': q1 < 0 ? 'black' : 'red' }),
    Annotation([colorOf(q2), Point([x2, 0])], 'charge-2', { 'data-color': q2 < 0 ? 'black' : 'red' }),
    Annotation([colorOf(qt), Point([xt, 0])], 'charge-t', { 'data-color': qt < 0 ? 'black' : 'red' }),
    Text(sub('q', '1'), [x1, -0.6]),
    Text(sub('q', '2'), [x2, -0.6]),
    Text(sub('q', Style('t', Italic)), [xt, -0.6]),
    Annotation(Text(signOf(q1), [x1, 0]), 'sign-1'),
    Annotation(Text(signOf(q2), [x2, 0]), 'sign-2'),
    Annotation(Text(signOf(qt), [xt, 0]), 'sign-t'),
    xtRows && dataTable(xtRows, [-5, 2.5], LightBlue, 'table-xt'),
    eqRows && dataTable(eqRows, [5, 2.5], LightOrange, 'table-eq'),
    // "If root has a single real value in the interval −10 to +10, this line will make it visible" (else at x = 20)
    Annotation([Orange, PointSize(0.03), Point([found ? xe : 20, 0])], 'equilibrium-point', { 'data-x': found ? xe : 20 }),
    // the small figure at the upper left: forces on qt
    [Arrowheads(ARROWHEAD_SMALL), ar.af1t && Annotation(Arrow(ar.af1t), 'arrow-f1t'), ar.af2t && Annotation(Arrow(ar.af2t), 'arrow-f2t')].filter(Boolean),
    Text(sub('F', Row(['1 ', Style('t', Italic)])), [-6.25, 4.75]),
    Text(sub('F', Row(['2 ', Style('t', Italic)])), [-3.75, 4.75]),
    Annotation([colorOf(qt), PointSize(0.02), Point([-5, 4.5])], 'icon-qt'),
    Text(sub('q', Style('t', Italic)), [-5, 4.85]),
    Text(signOf(qt), [-5, 4.5]),
    // the small figure at the upper right: fields at xt
    [Arrowheads(ARROWHEAD_SMALL), ar.ae1 && Annotation(Arrow(ar.ae1), 'arrow-e1'), ar.ae2 && Annotation(Arrow(ar.ae2), 'arrow-e2')].filter(Boolean),
    Text(sub('E', '1'), [4, 4.75]),
    Text(sub('E', '2'), [6, 4.75]),
    Text(sub('x', Style('t', Italic)), [5, 4.85]),
    Annotation([Black, PointSize(0.02), Point([5, 4.5])], 'icon-xt'),
  ].filter(Boolean);

  // AxesStyle -> Arrowheads[{−0.03, 0.03}]: a head at both ends of each axis (the axis grey of the axes drawn by the
  // layer; drawn here because the shared plot has no AxesStyle — a shared candidate)
  const axisHeads = Annotation([GrayLevel(0.4), AbsoluteThickness(0.5), Arrowheads([-0.03, 0.03]),
    Arrow([[-10, 0], [10, 0]]), Arrow([[0, -5], [0, 5]])], 'axis-arrowheads');

  // values beyond ±1e5 (the picture shows ±5) are held there: a browser drops a path with coordinates near 1e16, as the
  // samples next to a charge give (N-TA-05; the visible parts of the curves do not change)
  const held = (y) => (y > 1e5 ? 1e5 : y < -1e5 ? -1e5 : y);
  const plot = Plot((x) => { const F = fnet(x1, x2, x, q1, q2, qt); return [held(F), held(F / qt)]; }, [-10, xt], {
    Exclusions: [x1, x2],
    PlotPoints: 400, // PerformanceGoal -> "Quality": dense samples, so the steep branches are smooth (N-TA-05)
    AspectRatio: 1,
    PlotStyle: [force ? [Blue] : [Opacity(0)], field ? [Green] : [Opacity(0)]], // Transparent
    PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, ImagePadding: [[1, 1], [1, 1]],
    // Ticks -> {{−8, −6, …, 8}}: the list marks the x axis; the y axis shows the same marks inside its range (−4 … 4,
    // no minor ticks, as the snapshots show)
    Ticks: [[-8, -6, -4, -2, 2, 4, 6, 8], [-4, -2, 2, 4]],
    Epilog: [axisHeads, ...epilog],
  });
  // the two curves (Plot draws them first, in order) get test ids
  let n = 0;
  const ids = ['force-curve', 'field-curve'], shown = [force, field];
  const list = plot.list.map((item) => (Array.isArray(item) && item.at(-1)?.head === 'Line' && n < 2
    ? Annotation(item, ids[n], { 'data-visible': String(shown[n++]) }) : item));
  const graphics = Graphics(list, plot.options);

  const F1 = f1t(x1, xt, q1, qt), F2 = f2t(x2, xt, q2, qt), Fn = F1 + F2;
  return {
    view: {
      f1t: F1, f2t: F2, fnet: Fn, E1: F1 / qt, E2: F2 / qt, Enet: Fn / qt,
      root, xe, equilibriumShown: found,
      xtTable: xtRows && xtRows.map((r) => [r[1], r[2]]),
      eqTable: eqRows && eqRows.map((r) => [r[1], r[2]]),
      arrows: ar,
    },
    graphics,
  };
}
/** Arrowheads[Small]: measured in the snapshots (heads about 7 px long in the 425-px picture). */
export const ARROWHEAD_SMALL = 0.016;
