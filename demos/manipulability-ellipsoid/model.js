// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulability-ellipsoid/model.js — "Manipulability Ellipsoid of a Robot Arm": the velocity Jacobian
// JvRRRanthro, the joint points, the θ / θprev / p logic of the Manipulate body, the SVD and μ, and the picture
// (ellipsoid block and robot) as Graphics3D data (demos/common/g3d.js). Pure: no DOM, no three.js.
//
//   Body (stored Initialization identical to the Input cell here, N-ME-05):
//     If[Theta1prev != Theta1, p1 = {Cos[Theta1], Sin[Theta1]}; Theta1prev = Theta1];   (i = 1, 2, 3)
//     Theta1 = ArcTan[p1[[1]], p1[[2]]]; If[Theta1 < 0, Theta1 = Theta1 + 2π];
//     Theta2 = ArcTan[p2[[1]], p2[[2]]];  Theta3 = ArcTan[p3[[1]], p3[[2]]];
//     o0, o1, o2, oc, z1 (closed form); Column[{"Manipulability μ =", EngineeringForm[Det[Σfull]],
//       Graphics3D[{{U, Σfull, V} = SingularValueDecomposition[N[JvRRRanthro[…]]]; Σ = Σfull/1;
//                   GeometricTransformation[{…ellipsoid…}, {U, oc}], Gray, EdgeForm[Black], Arrowheads[.02], …robot…},
//                  SphericalRegion -> True, PlotRange -> {{-3.5,3.5},{-4,4},{-1,5}}, ImageSize -> {440,420},
//                  ViewAngle -> 18 Degree, Boxed -> False]}, Center]
//
// Angles (F-ME-08, D-ME-06): an exact angle is an integer k (θ = kπ/32) whose Cos / Sin come from shared/exact-pi.js
// (Mathematica's first-octant reduction: exact zeros and exact symmetries); a machine angle (snapshots 2 and 3, made
// with an earlier continuous dial, K-ME-08) is {r: radians}. A dial point p is an integer m (the exact table point
// {Cos[mπ/32], Sin[mπ/32]}) or {p: [x, y]} (machine numbers).
// State: {k: [θ1, θ2, θ3], kprev: [θ1prev, θ2prev, θ3prev], m: [p1, p2, p3]} in those encodings.
import { mUnequal } from '../../shared/mma.js';
import { arcTan, det } from '../../shared/mma-exact.js';
import { engineeringForm, engineeringParts } from '../../shared/mma-extra.js';
import { cosSinPi, piFrac } from '../../shared/exact-pi.js';
import { manipEllip, svd3, matrixRank } from '../common/svd3.js';
import {
  Graphics3D, GeometricTransformation, affine, flatten, Cylinder, Point, Line, PointSize, Arrowheads, EdgeForm, Thick,
  Red, Blue, Green, Gray,
} from '../common/g3d.js';

export const DEN = 32; // the dial table step π/32
const PI = Math.PI;
const TWO_PI = 2 * Math.PI; // N[2π]
const nz = (x) => x + 0; // Mathematica has no negative zero

// Module[{w = 1/8, r1 = 1, r2 = 1, r3 = 1, …, d1 = 2, …}] (r1 is never used, Q-ME-10)
export const w = 1 / 8, r1 = 1, r2 = 1, r3 = 1, d1 = 2;
/** SingularValueDecomposition's documented tolerance 100·10^-p·σ1 at machine precision (K-ME-01, COMMON-DECISIONS §4/§5) */
export const ZERO_TOL = 100 * 2 ** -53;
/** Graphics3D options */
export const PLOT_RANGE = [[-3.5, 3.5], [-4, 4], [-1, 5]];
export const IMAGE_SIZE = [440, 420];
export const VIEW_ANGLE = (18 * PI) / 180; // ViewAngle -> 18 Degree
export const VIEWPOINT = [1.3, -2.4, 2]; // default ViewPoint
/** PointSize[Medium], PointSize[Large] as fractions of the image width (shared/svg-plot.js POINT_SIZE); the default
 *  point size of Graphics3D is a port choice (D-ME-03) */
export const POINT_SIZE = { Default: 0.008, Medium: 0.01, Large: 0.013 };

// ---- angles ---------------------------------------------------------------------------------------------------------
export const isExact = (a) => Number.isInteger(a);
/** the double of an angle: an exact kπ/32 as N[kπ/32], the correctly rounded double (piFrac; k·π/32 is 1 ulp off for
 *  30 of the 129 dial angles, K-ME-09), a machine angle as it is */
export const angleValue = (a) => (isExact(a) ? piFrac(a, DEN) : a.r);
export const cosA = (a) => (isExact(a) ? cosSinPi(a, DEN)[0] : Math.cos(a.r));
export const sinA = (a) => (isExact(a) ? cosSinPi(a, DEN)[1] : Math.sin(a.r));
/** θ2 + θ3: exact when both are exact (k2 + k3), otherwise machine */
export const addA = (a, b) => (isExact(a) && isExact(b) ? a + b : { r: angleValue(a) + angleValue(b) });
/** Unequal (!=): exact angles compare exactly, machine ones with Mathematica's tolerance (Q-ME-06, T-ME-23) */
export const unequalA = (a, b) => (isExact(a) && isExact(b) ? a !== b : mUnequal(angleValue(a), angleValue(b)));
/** the index m of the exact point {Cos[kπ/32], Sin[kπ/32]}: k reduced to −31 … 32 */
export const wrapK = (k) => ((((k + 31) % 64) + 64) % 64) - 31;

/** p = {Cos[θ], Sin[θ]} */
export const pointOfAngle = (a) => (isExact(a) ? wrapK(a) : { p: [Math.cos(a.r), Math.sin(a.r)] });
/** the dial point as two machine numbers (N of the exact table point) */
export const pointXY = (m) => (Number.isInteger(m) ? cosSinPi(m, DEN) : m.p.slice());
/** ArcTan[p[[1]], p[[2]]]: exact in (−π, π] for a table point (m = −32, the point {−1, 0}, gives π), else machine */
export const angleOfPoint = (m) => (Number.isInteger(m) ? wrapK(m) : { r: arcTan(m.p[0], m.p[1]) });

// ---- state ------------------------------------------------------------------------------------------------------------
const copyA = (a) => (isExact(a) ? a : { r: a.r });
const copyP = (m) => (Number.isInteger(m) ? m : { p: m.p.slice() });
export const cloneState = (s) => ({ k: s.k.map(copyA), kprev: s.kprev.map(copyA), m: s.m.map(copyP) });
/**
 * The opening state = the live state (DynamicModule) = the initial settings (the stored "Variables") = snapshot 1's
 * Settings: θ = θprev = (19π/32, 9π/16, −21π/32), p1 = {−Sin[3π/32], Cos[3π/32]} (m 19), p2 (m 18), p3 (m −21) (F-ME-09).
 */
export const INITIAL = Object.freeze({ k: [19, 18, -21], kprev: [19, 18, -21], m: [19, 18, -21] });
export const initialState = () => cloneState(INITIAL);
/** The Input cell's own defaults (re-evaluating the input cell; not what the published notebook opens with, N-ME-03) */
export const SOURCE_DEFAULTS = Object.freeze({ k: [0, 0, 8], kprev: [0, -8, -24], m: [0, 0, 8] });

/**
 * One evaluation of the body's bookkeeping, in the original's order (§6.3): for i = 1, 2, 3 the prev test, then the
 * three ArcTan lines and the 2π shift of θ1. Returns the new state.
 */
export function updateAngles(state) {
  const s = cloneState(state);
  for (let i = 0; i < 3; i++) {
    if (unequalA(s.kprev[i], s.k[i])) { s.m[i] = pointOfAngle(s.k[i]); s.kprev[i] = copyA(s.k[i]); }
  }
  for (let i = 0; i < 3; i++) s.k[i] = angleOfPoint(s.m[i]);
  const t1 = s.k[0];
  if (angleValue(t1) < 0) s.k[0] = isExact(t1) ? t1 + 64 : { r: t1.r + TWO_PI };
  return s;
}

// ---- kinematics -------------------------------------------------------------------------------------------------------
/** sines and cosines {c1, s1, c2, s2, c23, s23} of the three joint angles */
export function trig([t1, t2, t3]) {
  const t23 = addA(t2, t3);
  return { c1: cosA(t1), s1: sinA(t1), c2: cosA(t2), s2: sinA(t2), c23: cosA(t23), s23: sinA(t23) };
}

/**
 * JvRRRanthro[θ1, θ2, θ3, r2, r3] as written in the Initialization (rows x, y, z):
 *   {-(r2 c2 + r3 c23) s1, -r2 s2 c1 - r3 c1 s23, -r3 c1 s23},
 *   {c1 (r2 c2 + r3 c23), -r2 s1 s2 - r3 s1 s23, -r3 s1 s23},
 *   {0, r2 c2 + r3 c23, r3 c23}
 */
export function JvRRRanthro(angles, R2 = r2, R3 = r3) {
  const { c1, s1, c2, s2, c23, s23 } = trig(angles);
  const a = R2 * c2 + R3 * c23;
  return [
    [nz(-a * s1), nz(-(R2 * s2 * c1) - R3 * c1 * s23), nz(-(R3 * c1 * s23))],
    [nz(c1 * a), nz(-(R2 * s1 * s2) - R3 * s1 * s23), nz(-(R3 * s1 * s23))],
    [0, nz(a), nz(R3 * c23)],
  ];
}

/** o0, o1, o2, oc and the joint-2/3 axis z1 (closed form of the body) */
export function points(angles) {
  const { c1, s1, c2, s2, c23, s23 } = trig(angles);
  const a = r2 * c2 + r3 * c23;
  return {
    o0: [0, 0, 0],
    o1: [0, 0, d1],
    // d1 + r2 s2 + r3 s23 with the exact d1 = 2: COMMON-DECISIONS §7 order, the machine terms first (K-ME-10)
    o2: [nz(r2 * c1 * c2), nz(r2 * c2 * s1), r2 * s2 + d1],
    oc: [nz(c1 * a), nz(s1 * a), (r2 * s2 + r3 * s23) + d1],
    z1: [s1, nz(-c1), 0],
  };
}

/** {U, Σfull (diagonal list S), V}, rank and μ = Det[Σfull] (det of shared/mma-exact.js) */
export function manipulability(J) {
  const { U, S, V } = svd3(J, { zeroTol: ZERO_TOL });
  const mu = det([[S[0], 0, 0], [0, S[1], 0], [0, 0, S[2]]]);
  return { U, S, V, rank: matrixRank(S), mu };
}
/** EngineeringForm[μ] as the label shows it ("671.892×10^-3", "1.20711", "0.") and its parts (superscript) */
export const muText = (mu) => engineeringForm(mu);
export const muParts = (mu) => engineeringParts(mu);

// ---- graphics ---------------------------------------------------------------------------------------------------------
/** Mod[x, 2π] of a machine number */
const mod2pi = (x) => x - TWO_PI * Math.floor(x / TWO_PI);
/**
 * splineCircle[m, r, {a0, a1}]'s angle logic: {start, end} = Mod[{a0, a1} // N, 2π]; If[end <= start, end += 2π]
 * (equal start and end: a full circle, Q-ME-01; a negative sweep the long way round, Q-ME-02).
 */
export function splineArcAngles([a0, a1]) {
  const start = mod2pi(a0);
  let end = mod2pi(a1);
  if (end <= start) end += TWO_PI;
  return { start, end };
}
/**
 * splineCircle[m, r, {a0, a1}] (an exact rational B-spline arc) as a sampled Line in the plane z = m_z (D-ME-04):
 * the points m + r{Cos t, Sin t, 0}, t from start to end, at most 2π/128 apart.
 */
export function splineCircle(m, r, angles = [0, TWO_PI]) {
  const { start, end } = splineArcAngles(angles);
  const n = Math.max(8, Math.ceil(((end - start) / TWO_PI) * 128));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = start + ((end - start) * i) / n;
    pts.push([m[0] + r * Math.cos(t), m[1] + r * Math.sin(t), m[2] ?? 0]);
  }
  return Object.assign(Line(pts), { arc: { start, end } });
}

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/** RotationMatrix[θ1, {0,0,1}].RotationMatrix[π/2, {1,0,0}] (exact trig for an exact θ1) */
export function armPlaneRotation(t1) {
  const c = cosA(t1), s = sinA(t1);
  // Rz = {{c,-s,0},{s,c,0},{0,0,1}}, Rx(π/2) = {{1,0,0},{0,0,-1},{0,1,0}}
  return [[c, 0, s], [s, 0, nz(-c)], [0, 1, 0]];
}

/** The robot drawing after the ellipsoid (F-ME-10), as a Graphics3D content list. */
export function robotContent(angles, pts) {
  const [t1, t2, t3] = angles;
  const { o0, o1, o2, oc, z1 } = pts;
  const th1 = angleValue(t1), th2 = angleValue(t2), th23 = angleValue(t2) + angleValue(t3);
  const R = armPlaneRotation(t1);
  const q = scale3(z1, 1 / 4);
  const floorPt = (a) => [Math.cos(a), Math.sin(a), 0];
  return [
    Gray, EdgeForm([0, 0, 0]), Arrowheads(0.02),
    [Red, Cylinder([o0, scale3(o1, 1 / 4)], 3 * w)],
    [Gray, Cylinder([o0, o1], w)],
    [Thick, Red, splineCircle(o0, 1, [0, th1]),
      Point([cosA(t1), sinA(t1), 0]),
      PointSize(POINT_SIZE.Medium), Point(floorPt(th1 - 0.05 * sign(th1))),
      PointSize(POINT_SIZE.Large), Point(floorPt(th1 - 0.12 * sign(th1)))],
    [Cylinder([o1, o2], w)],
    [Blue, Cylinder([sub3(o1, q), add3(o1, q)], 2 * w)],
    [Thick, Blue, GeometricTransformation([splineCircle(o0, 1 / 2, [0, th2])], affine(R, o1))],
    [Cylinder([o2, oc], w)],
    [Green, Cylinder([sub3(o2, q), add3(o2, q)], 2 * w)],
    [Thick, Green, GeometricTransformation([splineCircle(o0, 1 / 2, [th2, th23])], affine(R, o2))],
  ];
}

/**
 * One evaluation of the Manipulate body (§6.3): the angle bookkeeping, then the points, J, the SVD (computed first,
 * K-ME-04), μ and the picture. Returns {state (after the body's assignments), angles, J, points, U, S, V, Sigma, rank,
 * mu, text, ellipsoid (manipEllip result), graphics (Graphics3D), prims (flattened)}.
 */
export function evaluate(state) {
  const next = updateAngles(state);
  const angles = next.k;
  const J = JvRRRanthro(angles);
  const pts = points(angles);
  const { mu } = manipulability(J);
  const ell = manipEllip(J, pts.oc, { scale: 1, zeroTol: ZERO_TOL }); // Σ = Σfull/1
  const graphics = Graphics3D([...ell.graphics.content, ...robotContent(angles, pts)], {
    SphericalRegion: true, PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, ViewAngle: VIEW_ANGLE, Boxed: false,
  });
  return {
    state: next, angles, J, points: pts, U: ell.U, S: ell.S, V: ell.V, Sigma: ell.Sigma, rank: ell.rank,
    mu, text: muText(mu), ellipsoid: ell, graphics, prims: flatten(graphics), nEllipsoidPrims: flatten(ell.graphics).length,
  };
}

/**
 * Evaluations of the body until it changes no variable (at most max): what the front end does after a change, since
 * the body's own assignments (Theta_i = ArcTan[…], Theta_iprev = Theta_i) trigger it again (D-ME-10, Q-ME-06).
 * Returns the last evaluate() result with `evaluations` (the number of evaluations made).
 */
export function settle(state, max = 8) {
  let s = state, view = null, n = 0;
  while (n < max) {
    view = evaluate(s);
    n++;
    if (sameState(view.state, s)) break;
    s = view.state;
  }
  return Object.assign(view, { evaluations: n });
}
/** bit-for-bit equality of two states */
export const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** what the ellipsoid block draws: {rank, arrows: {blue, red, green}, rings: {blue, red, green}, ellipsoid} */
export function ellipsoidSummary(view) {
  const ep = view.prims.slice(0, view.nEllipsoidPrims);
  const col = (c) => (p) => p.color && p.color.every((v, i) => Math.abs(v - c[i]) < 1e-9);
  const BLUE = [0, 0, 1], RED = [1, 0, 0], GREEN = [0, 1, 0];
  const isDarker = (p) => p.color && p.color[0] === 0 && p.color[2] === 0 && p.color[1] > 0 && p.color[1] < 1;
  const arrows = ep.filter((p) => p.type === 'arrow'), rings = ep.filter((p) => p.type === 'circle');
  return {
    rank: view.rank, S: view.S.slice(),
    arrows: { blue: arrows.filter(col(BLUE)).length, red: arrows.filter(col(RED)).length, green: arrows.filter(col(GREEN)).length },
    rings: { blue: rings.filter(col(BLUE)).length, red: rings.filter(col(RED)).length, green: rings.filter(isDarker).length },
    ellipsoid: ep.filter((p) => p.type === 'ellipsoid').length,
  };
}
