// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/distance-norms/model.js — "Distance Norms in Robot Workspace and Phase Space": one evaluation of the
// Manipulate body as data (pure: no DOM, importable in Node). The original's body:
//
//   Module[{r2, Theta1, Theta2, w = 1/8, l = 1, arm},
//     r2 = 2 - r1;
//     Theta1 = ArcTan[p1[[1]], p1[[2]]];
//     Theta2 = ArcTan[p2[[1]], p2[[2]]];
//     arm = {LightGray, EdgeForm[Black], Rotate[{Rectangle[…], If[r2 < 1, {Black, Text["Robot Arm", …]}]}, Theta1, {0, 0}],
//            {Black, Point[{{0, 0}}], , Red, myArrowArc[{0, 0}, l/4, {0, Theta1}], If[Abs[Theta1] > π/4, Text[θ₁, …]]},
//            Rotate[{Rectangle[…], If[r2 >= 1, {Black, Text["Robot Arm", …]}]}, Theta1 + Theta2, elbow],
//            {Black, Point[{elbow}]}, Blue, myArrowArc[elbow, l/3, {Theta1, Theta1 + Theta2}], If[Abs[Theta2] > π/4, Text[θ₂, …]]};
//     ParametricPlot[If[cORw == "workspace",
//         {r1 Cos[Theta1] + r2 Cos[Theta1 + Theta2] + Theta1d, r1 Sin[Theta1] + r2 Sin[Theta1 + Theta2] + Theta2d},
//         {r1 Cos[Theta1 + Theta1d] + r2 Cos[Theta1 + Theta1d + Theta2 + Theta2d],
//          r1 Sin[Theta1 + Theta1d] + r2 Sin[Theta1 + Theta1d + Theta2 + Theta2d]}],
//       {Theta1d, -bound, bound}, {Theta2d, -bound, bound}, PlotRange -> {{-2.5, 2.5}, {-2.5, 2.5}},
//       RegionFunction -> Function[{x, y, Theta1d, Theta2d}, Norm[{Theta1d, Theta2d}, p] < bound],
//       PlotStyle -> Opacity[0.5], Prolog -> arm]]
//
// PORT DEVIATION D-DN-01: the ParametricPlot (adaptive sampling + RegionFunction clipping) is replaced by the exact
// parameter-space ball B = {Norm[{a, b}, p] < d}, cut along the fold lines b = kπ − θ2 into sheets on which the arm map
// is one-to-one; each sheet's boundary is mapped (refined to gaps ≤ 0.01 plot units) and filled as one polygon, and the
// image of B's boundary is the outline (DESIGN.md §6, "Region construction").
import { arcTan, norm as dnrm2 } from '../../shared/mma-exact.js';
import { armGeometry, tipPosition } from '../common/two-link.js';
import { myArrowArc } from '../common/arrow-arcs.js';

export const PLOT_RANGE = [[-2.5, 2.5], [-2.5, 2.5]];
/** SetterBar values {"workspace", "phase space"} and {1, 2, 3, ∞}. */
export const NORM_SPACES = ['workspace', 'phase space'];
export const NORM_TYPES = [1, 2, 3, Infinity];
/** The Manipulate's controls: d {0.01, π, 0.01}, r₁ {0, 2, 0.01}; pEnd's locator range {-2, -2} … {2, 2}. */
export const BOUND_RANGE = { min: 0.01, max: Math.PI, step: 0.01 };
export const R1_RANGE = { min: 0, max: 2, step: 0.01 };
export const PEND_RANGE = [[-2, -2], [2, 2]];
const W = 1 / 8, L = 1; // Module locals w = 1/8, l = 1

/**
 * The picture's layout and styles (drawing data for main.js, kept here so the golden tests can check them in Node):
 * ParametricPlot's ImageSize 360 with the image padding measured in snapshot 1 (left 62, right 39, top 33, bottom
 * 62 px of the 789 px picture at 2.19 px/pt → 28.3, 17.8, 15.1, 28.3 pt; D-DN-03); Frame and FrameTicks (majors every
 * 1 with labels on the left and bottom, minors every 0.2, ticks 9 px and 5 px in the picture → 4.1 and 2.3 pt) and the
 * Axes through the origin; PlotStyle -> Opacity[0.5] with the first default plot colour ColorData[97][1], the outline
 * (BoundaryStyle -> Automatic) in the same colour, opaque.
 */
export const IMAGE = Object.freeze({ imageSize: 360, margins: Object.freeze({ left: 28.3, right: 17.8, top: 15.1, bottom: 28.3 }) });
export const FRAME = Object.freeze({ range: PLOT_RANGE, majorStep: 1, minorStep: 0.2, axes: true, fontPx: 10, tickLengthsPx: [4.1, 2.3] });
export const REGION_STYLE = Object.freeze({ color: Object.freeze([0.368417, 0.506779, 0.709798]), opacity: 0.5 });

/**
 * The initial values (F-DN-14): the live state = the initial settings = snapshot 1's Settings. Exact 1/2 and 1 are
 * machine numbers here (D-DN-04); p = ∞ is Infinity.
 */
export const INITIAL = Object.freeze({
  cORw: 'phase space', p: Infinity, bound: 0.5, r1: 1,
  p1: Object.freeze([1, 0]), p2: Object.freeze([0, 1]),
  pEnd: Object.freeze([2, 0]), pEndp: Object.freeze([2, 0]), IsElbowUpp: true,
});
export function initialState() {
  return { ...INITIAL, p1: [...INITIAL.p1], p2: [...INITIAL.p2], pEnd: [...INITIAL.pEnd], pEndp: [...INITIAL.pEndp] };
}

// ------------------------------------------------------------------------------------------------ norms and ball

/** Norm[{a, b}, p] for p = 1, 2, 3, ∞: sum of absolute values; dnrm2; (|a|³ + |b|³)^(1/3); maximum. */
export function normP([a, b], p) {
  const x = Math.abs(a), y = Math.abs(b);
  if (p === Infinity) return Math.max(x, y);
  if (p === 1) return x + y;
  if (p === 2) return dnrm2([a, b]);
  if (p === 3) return Math.cbrt(x * x * x + y * y * y);
  return (x ** p + y ** p) ** (1 / p);
}

const EDGE_SAMPLES = 128; // points per edge of the square / diamond (corners exact)
const CURVE_SAMPLES = 512; // points of the p = 2, 3 curves (a multiple of 4: the four axis points are exact)
const CUT_SAMPLES = 128; // segments of a straight cut line

/** (x, y) turned by k quarter turns counter-clockwise, exactly. */
const quarter = ([x, y], k) => [[x, y], [0 - y, x], [0 - x, 0 - y], [y, 0 - x]][((k % 4) + 4) % 4];

/**
 * The boundary of the ball B = {Norm[{a, b}, p] < d} as a counter-clockwise polygon (implicitly closed: the last
 * point is not repeated). p = ∞: the square with corners (±d, ±d), each edge 128 points from its first corner;
 * p = 1: the diamond with vertices (±d, 0), (0, ±d), the same; p = 2, 3: d·u/‖u‖_p for u = (cos φ, sin φ),
 * φ = 2πk/512, built from the first quadrant by exact quarter turns (so the four axis points are exact).
 */
export function ballBoundary(p, d, { samples } = {}) {
  const out = [];
  if (p === Infinity || p === 1) {
    const n = samples ?? EDGE_SAMPLES;
    const corners = p === Infinity ? [[d, -d], [d, d], [-d, d], [-d, -d]] : [[d, 0], [0, d], [-d, 0], [0, -d]];
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = corners[e], [x1, y1] = corners[(e + 1) % 4];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        out.push(i === 0 ? [x0, y0] : [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    }
    return out;
  }
  const n = (samples ?? CURVE_SAMPLES) / 4;
  const firstQuadrant = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) { firstQuadrant.push([d, 0]); continue; }
    const phi = (Math.PI / 2) * (i / n);
    const u = [Math.cos(phi), Math.sin(phi)];
    const s = d / normP(u, p);
    firstQuadrant.push([u[0] * s, u[1] * s]);
  }
  for (let k = 0; k < 4; k++) for (const q of firstQuadrant) out.push(quarter(q, k));
  return out;
}

/** The fold lines b = kπ − θ2 (k integer) strictly inside (−d, d), ascending: where θ2 + b is a multiple of π. */
export function sheetCuts(theta2, d) {
  const cuts = [];
  const kLo = Math.ceil((-d + theta2) / Math.PI) - 1, kHi = Math.floor((d + theta2) / Math.PI) + 1;
  for (let k = kLo; k <= kHi; k++) {
    const b = k * Math.PI - theta2;
    if (b > -d && b < d) cuts.push(b);
  }
  return cuts.sort((x, y) => x - y);
}

/** Sutherland–Hodgman: the convex polygon clipped to the half-plane sgn·(y − c) ≥ 0 (cut points exactly on y = c). */
function clipHalf(poly, c, sgn) {
  const out = [];
  const inside = (q) => sgn * (q[1] - c) >= 0;
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const pin = inside(P), qin = inside(Q);
    if (pin) out.push(P);
    if (pin !== qin) {
      const t = (c - P[1]) / (Q[1] - P[1]);
      out.push([P[0] + (Q[0] - P[0]) * t, c]);
    }
  }
  return out;
}
/** Inserts samples along every edge that lies on one of the cut lines (both ends exactly on it). */
function sampleCutEdges(poly, lines) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    out.push(P);
    if (P[1] === Q[1] && lines.includes(P[1]) && P[0] !== Q[0]) {
      for (let j = 1; j < CUT_SAMPLES; j++) out.push([P[0] + ((Q[0] - P[0]) * j) / CUT_SAMPLES, P[1]]);
    }
  }
  return out;
}

/**
 * The sheets of B for the phase-space map: B cut along sheetCuts(θ2, d) into at most three convex pieces, each a
 * counter-clockwise polygon in (a, b) = (Δθ1, Δθ2) with the cut edges sampled (128 segments). Each sheet has
 * {poly, lo, hi} (its b range; ±Infinity on the ball's own sides). On a sheet θ2 + b stays in one interval
 * (kπ, (k + 1)π), so the arm map is one-to-one there.
 */
export function sheets(p, d, theta2) {
  const ball = ballBoundary(p, d);
  const cuts = sheetCuts(theta2, d);
  const bounds = [-Infinity, ...cuts, Infinity];
  const out = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const lo = bounds[i], hi = bounds[i + 1];
    let poly = ball;
    if (lo > -Infinity) poly = clipHalf(poly, lo, +1);
    if (hi < Infinity) poly = clipHalf(poly, hi, -1);
    if (poly.length < 3) continue;
    out.push({ poly: sampleCutEdges(poly, [lo, hi].filter(Number.isFinite)), lo, hi });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the two maps

/** Workspace map: {r1 Cos[θ1] + r2 Cos[θ1 + θ2] + a, r1 Sin[θ1] + r2 Sin[θ1 + θ2] + b} (the ball moved to the tip). */
export function mapWorkspace({ r1, r2, theta1, theta2 }) {
  const [tx, ty] = tipPosition(r1, r2, theta1, theta2);
  return ([a, b]) => [tx + a, ty + b];
}
/** Phase-space map: {r1 Cos[θ1 + a] + r2 Cos[θ1 + a + θ2 + b], r1 Sin[θ1 + a] + r2 Sin[θ1 + a + θ2 + b]}. */
export function mapPhase({ r1, r2, theta1, theta2 }) {
  return ([a, b]) => {
    const t1 = theta1 + a, t12 = t1 + theta2 + b;
    return [r1 * Math.cos(t1) + r2 * Math.cos(t12), r1 * Math.sin(t1) + r2 * Math.sin(t12)];
  };
}

export const MAX_GAP = 0.01; // plot units (≈ 1.4 px at the default size)
export const MAX_HALVINGS = 8;
const dist = (P, Q) => Math.hypot(P[0] - Q[0], P[1] - Q[1]);

/**
 * The image of a closed parameter polygon under F, refined (§6 step 4): wherever two consecutive images are more than
 * maxGap apart, the parameter segment between them is halved, at most maxHalvings times. Returns the image polygon
 * (implicitly closed).
 */
export function mapPolygon(poly, F, { maxGap = MAX_GAP, maxHalvings = MAX_HALVINGS } = {}) {
  const out = [];
  const imgs = poly.map(F);
  const refine = (P, Q, FP, FQ, depth) => {
    if (depth >= maxHalvings || dist(FP, FQ) <= maxGap) return;
    const M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], FM = F(M);
    refine(P, M, FP, FM, depth + 1);
    out.push(FM);
    refine(M, Q, FM, FQ, depth + 1);
  };
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    out.push(imgs[i]);
    refine(poly[i], poly[j], imgs[i], imgs[j], 0);
  }
  return out;
}

/** Signed shoelace area of an implicitly closed polygon (counter-clockwise positive). */
export function polygonArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

// ------------------------------------------------------------------------------------------------ the arm (Prolog)

/**
 * The arm list as data (F-DN-15): link stadiums, "Robot Arm" label, base and elbow points, the red myArrowArc
 * [{0, 0}, l/4, {0, θ1}] with its θ1 label and the blue myArrowArc[elbow, l/3, {θ1, θ1 + θ2}] with its θ2 label
 * (labels when Abs[θ] > π/4, tolerant). The Null of `Point[{{0, 0}}], , Red` draws nothing (Q-DN-02).
 */
export function armData(r1, r2, theta1, theta2) {
  const g = armGeometry({ r1, r2, theta1, theta2, w: W, theta1LabelRadius: (L * 2) / 5, robotArmLabel: 'byR2' });
  const red = myArrowArc([0, 0], L / 4, [0, theta1]);
  const blue = myArrowArc(g.elbow, L / 3, [theta1, theta1 + theta2]);
  return { ...g, arcs: { theta1: red, theta2: blue } };
}

// ------------------------------------------------------------------------------------------------ one evaluation

/**
 * One evaluation of the body for the Manipulate variables in `state` (the body assigns none of them). Returns
 * {locals: {r2, Theta1, Theta2}, arm, region: {mode ('workspace' | 'phase space'), sheets: [{param, lo, hi, world,
 * area}], boundary (image of B's boundary, implicitly closed), totalArea, degenerate}}.
 * mode: `cORw == "workspace"` is a string test; any other value (also the stale "configuration" of snapshots 3–6,
 * Q-DN-07) takes the phase-space map. degenerate: r1 = 0 or r2 = 0 — the phase map has rank 1, the image of B has
 * zero area, so every sheet's area is 0 and nothing is filled (K-DN-02); the boundary still runs on the circle.
 */
export function evaluate(state) {
  const { cORw, p, bound: d, r1 } = state;
  const r2 = 2 - r1;
  const Theta1 = arcTan(state.p1[0], state.p1[1]);
  const Theta2 = arcTan(state.p2[0], state.p2[1]);
  const arm = armData(r1, r2, Theta1, Theta2);
  const conf = { r1, r2, theta1: Theta1, theta2: Theta2 };
  const mode = cORw === 'workspace' ? 'workspace' : 'phase space';
  const F = mode === 'workspace' ? mapWorkspace(conf) : mapPhase(conf);
  const degenerate = mode === 'phase space' && (r1 === 0 || r2 === 0);
  const pieces = mode === 'workspace' ? [{ poly: ballBoundary(p, d), lo: -Infinity, hi: Infinity }] : sheets(p, d, Theta2);
  const sheetData = pieces.map(({ poly, lo, hi }) => {
    const world = mapPolygon(poly, F);
    return { param: poly, lo, hi, world, area: degenerate ? 0 : Math.abs(polygonArea(world)) };
  });
  const boundary = mapPolygon(ballBoundary(p, d), F);
  return {
    locals: { r2, Theta1, Theta2 },
    arm,
    region: { mode, sheets: sheetData, boundary, totalArea: sheetData.reduce((s, x) => s + x.area, 0), degenerate },
  };
}
