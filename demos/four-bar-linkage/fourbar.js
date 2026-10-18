// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/fourbar.js — pure port of "Configuration Space for Four-Bar Linkage"
// (docs/original-source/four-bar-linkage.txt): mod2pi, Φpos, Φneg, the impossible-length test with its Piecewise, the
// sampler that stands in for Plot + EvaluationMonitor (PORT DEVIATION D-FB-01), the replay of the original's recorded
// samples (DESIGN §6.3), Nearest, the linkage geometry and one evaluation of the Manipulate body. No DOM.
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
 * linksOld}; sampler (tests): replaces plotSamples. Returns {state, view} with view = {lenlengths, impossibleLinks,
 * Thetav, Phiv, Alpha, resampled, linkage}.
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
  const Alpha = impossibleLinks && mEqual(st.pnear, [PI / 2, PI / 2]) ? 0
    : arcTan(lenlengths[2] * Math.cos(Phiv) - lenlengths[0] * Math.cos(Thetav) + st.spacing, lenlengths[2] * Math.sin(Phiv) - lenlengths[0] * Math.sin(Thetav));
  const linkage = linkageGeometry({ lenlengths, spacing: st.spacing, Thetav, Phiv, Alpha });
  return { state: st, view: { lenlengths, impossibleLinks, Thetav, Phiv, Alpha, resampled, linkage } };
}
