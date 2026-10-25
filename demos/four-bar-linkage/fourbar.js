// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/fourbar.js — pure port of "Configuration Space for Four-Bar Linkage"
// (docs/original-source/four-bar-linkage.txt): mod2pi, Φpos, Φneg, the impossible-length test with its Piecewise, the
// sampler that stands in for Plot + EvaluationMonitor (PORT DEVIATION D-FB-01), the replay of the original's recorded
// samples (DESIGN §6.3), Nearest, the linkage geometry, the two pictures as shared/graphics.js data and one evaluation
// of the Manipulate body. No DOM.
//
// Numbers (DESIGN §6.4): Φpos/Φneg are evaluated inside Plot in the original; there the stored values are reproduced by
// Times of several factors in ascending order, Plus in written order and a/b = a·(1/b) (empirical rule, K-FB-05). The
// body's own arithmetic follows the written order. Tolerant ==, >=, != (shared/mma.js); ArcTan correctly rounded
// without signed zero (shared/mma-exact.js); Cos, Sin, ArcCos are the browser's (D-FB-02).
// Quirks of the ORIGINAL are marked "ORIGINAL QUIRK (Q-FB-nn)", port deviations "PORT DEVIATION (D-FB-nn)".
import { mEqual, mUnequal, mGreaterEq } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import { nearest } from '../../shared/mma-extra.js';
import { myArrowArc } from '../common/arrow-arcs.js';
import {
  Annotation, Line, Circle, Point, Rectangle, Rotate, Translate, Text, Style, Subscript, Row, Column, Clip, Italic, EdgeForm,
  Directive, AbsoluteThickness, AbsolutePointSize, Thickness, CapForm, RGBColor, Black, Red, Blue, Orange, Gray, Brown, Darker,
  Lighter, ScriptSizeMultipliers, ScriptBaselineShifts, cachedGraphics,
} from '../../shared/graphics.js';
import { frameLayout } from '../../shared/svg-frame.js';
import { pxSize, axesGraphics, locatorGlyph, notchedArrowhead } from '../../shared/graphics-extras.js';

const PI = Math.PI;
/** ImageSize -> 300 (both graphics); the linkage's PlotRange. */
export const IMAGE_SIZE = 300;
export const LINKAGE_RANGE = Object.freeze([[-1.25, 2], [-1.5, 1.5]]);
export const CSPACE_RANGE = Object.freeze([[-PI, PI], [-PI, PI]]);
/** The colours of the stored plot's two curves (Plot's default style 97 colours 1 and 2). */
export const CURVE_COLOURS = Object.freeze([[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051]]);
export const INVALID_TEXT = 'invalid link lengths,\nno configuration possible';
export const ONE_TEXT = 'only one configuration possible';
/** Control specs of the original. */
export const SPACING_SLIDER = Object.freeze({ min: 0, max: 1.5, step: 0.05 });
export const LINKS_SLIDER = Object.freeze({ min: 0, max: 2.49, step: 0.05, minIntervalSize: 0.1 });

// ---- recorded samples of the original (demos/four-bar-linkage/recorded-samples.json, §6.3) ----------------------
let RECORDED = null;
/** Install the table of recorded samples (main.js fetches it; tests read it from disk). */
export function useRecordedSamples(table) { RECORDED = table; }
export const recordedTable = () => RECORDED;
/** Plot's initial 25-point θ grid with its offsets (snapshot 2, records 1–25; T-FB-68). */
export const plotGrid = () => RECORDED.grid;

// ---- Initialization functions --------------------------------------------------------------------------------

/** mod2pi[θ] := ArcTan[Cos[θ], Sin[θ]] — the second definition, the one stored in the Manipulate (N-FB-02). */
export const mod2pi = (t) => arcTan(Math.cos(t), Math.sin(t));

/** Times of several machine numbers as Plot evaluates them: factors in ascending order, multiplied left to right. */
export function timesAscending(...xs) {
  const s = [...xs].sort((a, b) => a - b);
  let r = s[0];
  for (let i = 1; i < s.length; i++) r *= s[i];
  return r;
}

/** α, β, γ of Φpos/Φneg (inside Plot: ascending Times, written Plus). */
export function loopTerms(t, [l1, l2, l3, l4]) {
  const c = Math.cos(t), s = Math.sin(t);
  const Alpha = timesAscending(2, l3, l4) + timesAscending(-2, l1, l3, c);
  const Beta = timesAscending(-2, l1, l3, s);
  const Gamma = l2 * l2 - l4 * l4 - l3 * l3 - l1 * l1 + timesAscending(2, l1, l4, c);
  return { Alpha, Beta, Gamma };
}
function phi(t, l, sign) {
  const { Alpha, Beta, Gamma } = loopTerms(t, l);
  const r = Alpha * Alpha + Beta * Beta;
  let p = mod2pi(arcTan(Alpha, Beta) + sign * Math.acos(Gamma * (1 / Math.sqrt(r))));
  if (mEqual(p, -PI)) p = PI; // ORIGINAL QUIRK (Q-FB-06)
  return mGreaterEq(Gamma * Gamma, r) ? null : p; // Null where γ² >= α² + β² (E-FB-02: the boundary itself too)
}
/** Φpos[θ, l] (null = Null) */
export const Phipos = (t, l) => phi(t, l, 1);
/** Φneg[θ, l] (null = Null) */
export const Phineg = (t, l) => phi(t, l, -1);

/** myArrowArc from demos/common/arrow-arcs.js (12 control points, a Point when start == end). */
export { myArrowArc };

// ---- the body's pieces --------------------------------------------------------------------------------------

/** lenlengths = {links[[1]], links[[2]] - links[[1]], 2.5 - links[[2]], spacing} */
export const lenlengthsOf = (links, spacing) => [links[0], links[1] - links[0], 2.5 - links[1], spacing];

/** impossibleLinks — the four conditions as written; ORIGINAL QUIRK (Q-FB-01, E-FB-01): the third reads l3 >= l2 + l3 + l1. */
export function impossibleLinksOf([l1, l2, l3, l4]) {
  return mGreaterEq(l1, l2 + l3 + l4) || mGreaterEq(l2, l1 + l3 + l4) || mGreaterEq(l3, l2 + l3 + l1) || mGreaterEq(l4, l2 + l3 + l1);
}

/** The Piecewise of the impossible branch (Q-FB-02: {π, π} and {0, π} unreachable). */
export function piecewisePnear([l1, l2, l3, l4]) {
  if (mEqual(l1, l2 + l3 + l4)) return [0, 0];
  if (mEqual(l2, l1 + l3 + l4)) return [PI, 0];
  if (mEqual(l3, l2 + l3 + l1)) return [PI, PI];
  if (mEqual(l4, l2 + l3 + l1)) return [0, PI];
  return [PI / 2, PI / 2];
}

/** Cos and Sin of the Piecewise's exact angles 0 and π (exact results; other arguments: the machine functions). */
const exactCos = (t) => (t === 0 ? 1 : t === PI ? -1 : Math.cos(t));
const exactSin = (t) => (t === 0 || t === PI ? 0 : Math.sin(t));

/**
 * The sampler — PORT DEVIATION (D-FB-01), stands in for
 *   Reap@Plot[{Φpos[θ, l], Φneg[θ, l]}, {θ, -π, π}, EvaluationMonitor :> Sow[{{θ, Φpos[θ, l]}, {θ, Φneg[θ, l]}}]]
 * following the structure of the original's four recorded sample sets (DESIGN §6.2): per curve (curve 1 = Φpos first),
 * (1) Plot's 25-point grid with its offsets; (2) breadth-first halving of the grid intervals, at most MAX_LEVELS levels,
 * where the curve's polyline turns by more than TURN_DEG (both axes 2π wide), intervals with a Null end always;
 * (3) for each grid interval with one real and one Null end, EDGE_STEPS bisection steps and one record of the last real
 * point, recorded after all others; (4) a record {{θ, Φpos}, {θ, Φneg}} for every evaluation with a real value.
 * Returns {records, curve1 (number of curve-1 records), nulls: [θs evaluated with no value, per curve]}.
 */
export const SAMPLER = Object.freeze({ MAX_LEVELS: 3, TURN_DEG: 2, EDGE_STEPS: 9 });
export function plotSamples(l, grid = plotGrid()) {
  const records = [];
  const nulls = [[], []];
  const fs = [Phipos, Phineg];
  let curve1 = 0;
  const turn = (a, b, c) => { // turning angle at b in degrees
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const nu = Math.hypot(...u), nv = Math.hypot(...v);
    if (!nu || !nv) return 0;
    return (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (nu * nv)))) * 180) / PI;
  };
  fs.forEach((f, ci) => {
    const known = new Map(); // θ -> value | null
    const evalAt = (t) => {
      if (known.has(t)) return known.get(t);
      const y = f(t, l);
      known.set(t, y);
      if (y === null) nulls[ci].push(t);
      else records.push([[t, Phipos(t, l)], [t, Phineg(t, l)]]);
      return y;
    };
    for (const t of grid) evalAt(t);
    // refinement, level by level over all intervals in θ order
    let intervals = grid.slice(0, -1).map((a, i) => [a, grid[i + 1]]);
    for (let level = 1; level <= SAMPLER.MAX_LEVELS && intervals.length; level++) {
      const pts = [...known.entries()].filter(([, y]) => y !== null).sort((a, b) => a[0] - b[0]);
      const idx = new Map(pts.map((p, i) => [p[0], i]));
      const nullTs = [...known.entries()].filter(([, y]) => y === null).map(([t]) => t);
      const isEnd = (i) => i === 0 || i === pts.length - 1
        || nullTs.some((t) => (t > pts[i - 1][0] && t < pts[i][0]) || (t > pts[i][0] && t < pts[i + 1][0]));
      const bends = (t) => { // turning angle of the polyline at the sample t; the end of a piece counts as a bend
        const i = idx.get(t);
        if (i === undefined) return 0;
        if (isEnd(i)) return Infinity;
        return turn(pts[i - 1], pts[i], pts[i + 1]);
      };
      const next = [];
      for (const [a, b] of intervals) {
        const ya = known.get(a), yb = known.get(b);
        if (ya === null && yb === null) continue;
        const refine = ya === null || yb === null || Math.max(bends(a), bends(b)) > SAMPLER.TURN_DEG;
        if (!refine) continue;
        const m = a + (b - a) * 0.5;
        evalAt(m);
        next.push([a, m], [m, b]);
      }
      intervals = next;
    }
    // domain edges: bisection of each grid interval with one real and one Null end
    for (let i = 0; i + 1 < grid.length; i++) {
      let a = grid[i], b = grid[i + 1];
      const ya = known.get(a), yb = known.get(b);
      if ((ya === null) === (yb === null)) continue;
      let good = ya === null ? b : a, bad = ya === null ? a : b;
      for (let k = 0; k < SAMPLER.EDGE_STEPS; k++) {
        const m = good + (bad - good) * 0.5;
        if (f(m, l) === null) bad = m; else good = m;
      }
      if (good !== a && good !== b && !known.has(good)) { known.set(good, f(good, l)); records.push([[good, Phipos(good, l)], [good, Phineg(good, l)]]); }
    }
    if (ci === 0) curve1 = records.length;
  });
  return { records, curve1, nulls };
}

/** The recorded samples of the original for (spacing, links), or null (§6.3: replayed bit for bit). */
export function recordedSamples(spacing, links) {
  if (!RECORDED) return null;
  const s = RECORDED.settings.find((x) => x.spacing === spacing && x.links[0] === links[0] && x.links[1] === links[1]);
  return s ? { records: s.pvals, curve1: s.curve1, nulls: [[], []], recorded: s.snapshot } : null;
}

/**
 * The plot's lines: each curve through its own records sorted by θ (as the stored plots); split where an evaluated θ
 * between two samples had no value (Null). Returns [[polyline, …] for curve 1, […] for curve 2].
 */
export function plotLines({ records, curve1, nulls }) {
  const curve = (recs, k) => recs.map((r) => r[k]).sort((a, b) => a[0] - b[0]);
  return [curve(records.slice(0, curve1), 0), curve(records.slice(curve1), 1)].map((pts, ci) => {
    const nl = [...nulls[ci]].sort((a, b) => a - b);
    const out = [];
    let cur = [];
    for (const p of pts) {
      if (cur.length && nl.some((t) => t > cur[cur.length - 1][0] && t < p[0])) { out.push(cur); cur = []; }
      cur.push(p);
    }
    if (cur.length) out.push(cur);
    return out;
  });
}

/** First@Nearest[Flatten[pvals, 1], x]: Euclidean in (θ, φ), no wrap-around (Q-FB-04); ties: first in record order. */
export function nearestSample(pvals, x) {
  return nearest(pvals.flat(1), x)[0];
}

/** Linkage graphic as data (F-FB-17), body arithmetic in written order. */
export function linkageGeometry({ lenlengths: [l1, l2, l3], spacing, Thetav, Phiv, Alpha }) {
  const w = 0.07, w2 = 0.05;
  const cT = Math.cos(Thetav), sT = Math.sin(Thetav), cP = Math.cos(Phiv), sP = Math.sin(Phiv), cA = Math.cos(Alpha), sA = Math.sin(Alpha);
  const B = [l1 * cT, l1 * sT];
  const C = [B[0] + l2 * cA, B[1] + l2 * sA];
  const rocker = [spacing + l3 * cP, 0 + l3 * sP];
  return {
    pivots: [{ from: [-0.1, -0.4], to: [0.1, 0.1], r: 0.1 }, { from: [spacing - 0.1, -0.4], to: [spacing + 0.1, 0.1], r: 0.1 }],
    ground: { from: [-0.2, -0.42], to: [spacing + 0.2, -0.3] },
    crank: { from: [-w, -w], to: [l1 + w, w], r: w, angle: Thetav, about: [0, 0] },
    rockerRect: { from: [spacing - w2, -w2], to: [spacing + l3 + w2, w2], r: w2, angle: Phiv, about: [spacing, 0] },
    coupler: [B, C],
    arrows: [[[0, -0.1], [spacing, -0.1]], [[spacing, -0.1], [0, -0.1]]],
    texts: [
      { text: 'L4', at: [spacing / 2, -0.2], color: 'Black' },
      { text: 'θ', at: [(0.1 + l1 / 3) * Math.cos(Thetav / 2), (0.1 + l1 / 3) * Math.sin(Thetav / 2)], color: 'Blue' },
      { text: 'L1', at: [l1 * (1 / 2) * cT, l1 * (1 / 2) * sT], color: 'Black' },
      { text: 'φ', at: [spacing + (0.1 + l3 / 3) * Math.cos(Phiv / 2), 0 + (0.1 + l3 / 3) * Math.sin(Phiv / 2)], color: 'Red' },
      { text: 'L3', at: [spacing + l3 * (1 / 2) * cP, 0 + l3 * (1 / 2) * sP], color: 'Black' },
      { text: 'L2', at: [B[0] + l2 * (1 / 2) * cA, B[1] + l2 * (1 / 2) * sA], color: 'Black', offset: [-1, -1] },
    ],
    refLines: [[[0, 0], [l1 / 2.8, 0]], [[spacing, 0], [spacing + l3 / 2.8, 0]]],
    blue: { circle: { c: [0, 0], r: l1 }, line: [[0, 0], B], arc: myArrowArc([0, 0], l1 / 3, [0, Thetav]) },
    red: { circle: { c: [spacing, 0], r: l3 }, line: [[spacing, 0], rocker], arc: myArrowArc([spacing, 0], l3 / 3, [0, Phiv]) },
    orange: { circle: { c: B, r: l2 }, line: [B, C] },
    crankTip: B, couplerEnd: C, rockerTip: rocker,
  };
}

// ---- the two pictures as shared/graphics.js data ------------------------------------------------------------------
// PORT DEVIATION (D-FB-04): Mathematica's rendering approximated — Thick curves 2.4 px, Medium text 12 px, default
// arrowheads about 0.0215 of the image width (6.5 px at ImageSize 300), Thin 0.5 px.
const THIN = AbsoluteThickness(0.5), CURVE_PX = 2.4, HEAD = [6.5, 2.6];
/** The configuration-space picture's PlotRange: AspectRatio -> 1, ImageSize -> 300, axes through the origin with labels
 * θ, φ: margins for tick and axes labels. */
export const CS_RANGE = frameLayout(CSPACE_RANGE, { imageSize: IMAGE_SIZE, margins: { left: 26, right: 16, top: 18, bottom: 20 } }).plotRange;
const U = pxSize(CS_RANGE, IMAGE_SIZE, 0), UL = pxSize(LINKAGE_RANGE, IMAGE_SIZE, 0); // world units per pixel
const axes = cachedGraphics(); // drawn once

/** Arrow[{a, b}] with the notched head (the head first, then the shaft up to the notch). */
function arrow([a, b], id) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!L) return Annotation([], id);
  const { head, notch } = notchedArrowhead(b, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], HEAD[0] * UL, HEAD[1] * UL);
  return Annotation([head, Line([a, notch])], id);
}
/** myArrowArc[c, r, {0, angle}] (demos/common/arrow-arcs.js): a Point, or the B-spline arc with a notched head. */
function arrowArc(arc, id) {
  if (arc.kind === 'Point') return [AbsolutePointSize(3), Point(arc.at)];
  const { head, notch } = notchedArrowhead(arc.tip, arc.direction, HEAD[0] * UL, HEAD[1] * UL);
  return Annotation([head, Line(arc.curve.slice(0, -1).concat([notch]))], id);
}
/** Text[Style[L_k, Medium], pos(, {-1, -1})] in Black: italic L, the index 0.3em down at 75 % (the snapshots' look). */
const Lk = (k, pos, offset) => [Black, Annotation(Text(Style(Subscript(Style('L', Italic), k), ScriptSizeMultipliers('75%'), ScriptBaselineShifts(['0.3em', '0.3em'])),
  pos, offset ? [-1, -1] : undefined), `text-L${k}`)];
const rect = ({ from, to, r = 0 }, id) => Annotation(Rectangle(from, to, { RoundingRadius: r }), id);
const rotated = (g, id) => Annotation(Rotate(Rectangle(g.from, g.to, { RoundingRadius: g.r }), g.angle, g.about), id);

/** Show[plot, Graphics[{Locator[pnear]}]]: axes, the curves (PlotStyle -> Thick, clipped), the glyph, the Epilog text */
export function cspaceGraphics({ plot, pnear }) {
  const m = (CURVE_PX / 2) * U, [[x0, x1], [y0, y1]] = CSPACE_RANGE;
  return [
    axes([], () => axesGraphics({
      range: CSPACE_RANGE, unitsPerPx: U, majorStep: 1, minorStep: 0.2, axesLabel: ['θ', 'φ'], fontPx: 11, labelColor: [0, 0, 0],
      axesLabelStyle: { italic: true, color: [0.4, 0.4, 0.4] },
    })),
    // PlotRangeClipping -> True; the clip rectangle widened by half the curve width so that curves on the range's edge
    // (φ = ±π) keep their full width, as in the snapshots (§6.5)
    Clip(plot.lines.map((pieces, ci) => Annotation([RGBColor(...CURVE_COLOURS[ci]), AbsoluteThickness(CURVE_PX), ...pieces.map(Line)], `curve-${ci + 1}`)),
      [[x0 - m, x1 + m], [y0 - m, y1 + m]], 'fb-clip'),
    Annotation(Translate(locatorGlyph(U), pnear), 'glyph'), // Locator[pnear]: drawn, not draggable (K-FB-12)
    plot.text && [Red, Annotation(Text(Column(plot.text.split('\n')), [0, 1]), 'cspace-message')], // Epilog -> {Style[Text[…, {0, 1}], Red, Medium]}
  ];
}

/** The linkage Graphics, in the original's order (F-FB-17), from linkageGeometry's data. */
export function linkageGraphics(g) {
  const T = Object.fromEntries(g.texts.map((t) => [t.text, t.at]));
  return [
    [EdgeForm(Directive(THIN, Black)), // EdgeForm[Directive[Thin, Black]] (only the rectangles have edges in the port)
      [Brown, ...g.pivots.map((p, i) => rect(p, `pivot-${i + 1}`)), rect(g.ground, 'ground')],
      [Darker(Gray), rotated(g.crank, 'crank')], [Gray, rotated(g.rockerRect, 'rocker')]],
    [Lighter(Gray), CapForm('Round'), Thickness(0.02), Annotation(Line(g.coupler), 'coupler')],
    ...g.arrows.map((a, i) => arrow(a, `separation-arrow-${i + 1}`)), Lk('4', T.L4),
    [THIN, ...g.refLines.map(Line)], // ref lines for angle arcs
    ...[[Blue, g.blue, 'θ', 'theta', '1'], [Red, g.red, 'φ', 'phi', '3']].map(([col, part, sym, name, k]) => {
      const c = col === Blue ? 'blue' : 'red';
      return [col, Annotation(Circle(part.circle.c, part.circle.r), `circle-${c}`), Annotation(Line(part.line), `line-${c}`),
        arrowArc(part.arc, `arc-${c}`), Annotation(Text(Row([Style(sym, Italic)]), T[sym]), `text-${name}`), Lk(k, T[`L${k}`])];
    }),
    [Orange, Annotation(Circle(g.orange.circle.c, g.orange.circle.r), 'circle-orange'), Annotation(Line(g.orange.line), 'line-orange')],
    Lk('2', T.L2, true),
  ];
}

// ---- one evaluation of the Manipulate body ---------------------------------------------------------------------

/** The initial settings = the live state = snapshot 1's Settings (F-FB-13): the saved samples, spacingOld 0.75. */
export function initialSettings() {
  const s = RECORDED.settings[0];
  const smp = { records: s.pvals, curve1: s.curve1, nulls: [[], []] };
  return {
    p: [-0.9, -1], spacing: 0.75, links: [1.35, 2], spacingOld: 0.75, linksOld: [1.35, 2],
    pvals: s.pvals, plot: { lines: plotLines(smp), text: null, recorded: 1 }, pnear: [-0.8877458382200738, -0.9960977669686768],
  };
}

/**
 * A state from stored Settings (a snapshot or saved state of the original): `plot` there is Mathematica's Graphics
 * ({head: 'Graphics', args: …} as the fixtures encode it); the port's plot is rebuilt from `pvals`, with curve 1 = the
 * number of points of the first Line of the stored plot (each stored Line is the sorted points of its curve, T-FB-69).
 */
export function fromSettings(settings) {
  const lens = [];
  const walk = (v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const h = v.head ?? v.h, a = v.args ?? v.a;
    if (h === 'Line') { lens.push(a[0].length); return; }
    if (a) a.forEach(walk);
  };
  walk(settings.plot);
  const curve1 = lens.length ? lens[0] : settings.pvals.length;
  return { ...settings, plot: { lines: plotLines({ records: settings.pvals, curve1, nulls: [[], []] }), text: null, recorded: null } };
}

/**
 * evaluate(state, {sampler}) — one evaluation of the body. state: {p, spacing, links, pnear, plot, pvals, spacingOld,
 * linksOld}; sampler (tests): replaces plotSamples. Returns {state, view, graphics} with view = {lenlengths,
 * impossibleLinks, Thetav, Phiv, Alpha, resampled, linkage} and graphics = [configuration space, linkage] (Graphics data).
 */
export function evaluate(stateIn, { sampler = plotSamples } = {}) {
  const st = { ...stateIn, p: [...stateIn.p], links: [...stateIn.links] };
  const lenlengths = lenlengthsOf(st.links, st.spacing);
  const impossibleLinks = impossibleLinksOf(lenlengths);
  let resampled = null;
  if (impossibleLinks) {
    st.pnear = piecewisePnear(lenlengths);
    st.plot = { lines: [[], []], text: mEqual(st.pnear, [PI / 2, PI / 2]) ? INVALID_TEXT : ONE_TEXT, recorded: null };
    st.spacingOld = st.spacing; st.linksOld = [...st.links];
  } else {
    if (mUnequal(st.spacingOld, st.spacing) || mUnequal(st.linksOld, st.links)) {
      const rec = recordedSamples(st.spacing, st.links);
      const smp = rec ?? sampler(lenlengths);
      resampled = { recorded: rec ? rec.recorded : null, count: smp.records.length };
      // K-FB-03: with no record Reap gives {g, {}} and the Set of {plot, {pvals}} fails: plot and pvals keep their values
      if (smp.records.length) {
        st.pvals = smp.records;
        st.plot = { lines: plotLines(smp), text: null, recorded: rec ? rec.recorded : null };
      }
      st.spacingOld = st.spacing; st.linksOld = [...st.links];
    }
    st.pnear = nearestSample(st.pvals, st.p.map(mod2pi));
  }
  const [Thetav, Phiv] = st.pnear;
  // The Piecewise of the impossible branch gives EXACT angles (0, Pi): Cos and Sin of them are exact (Sin[Pi] = 0, not
  // 1.2e-16), and an exact 0 times a machine length is 0 (harness H-FB-06: α = 0 for pnear {Pi, 0}). Sampled angles are
  // machine numbers (the exact Pi of If[φ == -π, φ = π] inside pvals is a machine π in the port, D-FB-11).
  const cosE = impossibleLinks ? exactCos : Math.cos, sinE = impossibleLinks ? exactSin : Math.sin;
  const Alpha = impossibleLinks && mEqual(st.pnear, [PI / 2, PI / 2]) ? 0
    : arcTan(lenlengths[2] * cosE(Phiv) - lenlengths[0] * cosE(Thetav) + st.spacing, lenlengths[2] * sinE(Phiv) - lenlengths[0] * sinE(Thetav));
  const linkage = linkageGeometry({ lenlengths, spacing: st.spacing, Thetav, Phiv, Alpha });
  // Row[{Show[plot, Graphics[{Locator[pnear]}]], Graphics[…]}]
  return { state: st, view: { lenlengths, impossibleLinks, Thetav, Phiv, Alpha, resampled, linkage }, graphics: [cspaceGraphics(st), linkageGraphics(linkage)] };
}
