// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Lillian Lin
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/two-link-kinematics/model.js — "Forward and Inverse Kinematics for Two-Link Arm": one evaluation of the
// Manipulate body (forward/inverse kinematics, the Jacobian, its singular value decomposition, forward/inverse velocity
// kinematics) and everything its Graphics list draws, as data. Pure: no DOM, importable in Node.
//
// Names and order of operations are the original's (Initialization: Theta2inv, Theta1inv, loc; Body: the statements of
// F-TK-09 … F-TK-15 in DESIGN.md). Arm geometry is demos/common/two-link.js, the arc arrows demos/common/arrow-arcs.js
// (owned by this app, COMMON-DECISIONS §3); Jacobian, inverse kinematics and the SVD stay here.
//
//   Theta2inv[x_, y_, r1_, r2_, IsElbowUp_] := Re[If[x^2 + y^2 >= (r1 + r2)^2, 0,
//     Module[{D = (-r1^2 - r2^2 + x^2 + y^2)/(2 r1 r2)}, ArcTan[D, If[IsElbowUp, -1, 1] Sqrt[1 - D^2]]]]]
//   Theta1inv[x_, y_, r1_, r2_, Theta2_] := Re[ArcTan[x, y] - ArcTan[r1 + r2 Cos[Theta2], r2 Sin[Theta2]]]
//   loc[col_, c_] := Module[{sc = 1/25}, {col, Line[{c + sc{0, 1.5}, c + sc{0, 3}}], … four hairs …, Circle[c, sc 2],
//     {Thickness[1/100], Opacity[0.5], Circle[c, sc 2*.7]}}]
import { mUnequal, mGreater, mGreaterEq, mLessEq } from '../../shared/mma.js';
import { arcTan, norm, fma } from '../../shared/mma-exact.js';
import { matrixRank } from '../robot-singularities/svd3.js';
import { elbowPosition, tipPosition, armGeometry } from '../common/two-link.js';
import { myArrowArc } from '../common/arrow-arcs.js';

const nz = (x) => x + 0; // Mathematica has no negative zero

/**
 * The Manipulate's stored "Variables" (the initial settings, restored by ⊕ > Initial Settings; F-TK-16). Exact values
 * of the original become machine numbers (D-TK-01). pVelp differs from pVel, so the first evaluation runs inverse
 * velocity (Q-TK-01).
 */
export const INITIAL = Object.freeze({
  r1: 1, pEnd: [2, 0], pEndp: [2, 0], pVel: [2, 1], pVelp: [1, 1], p1: [1, 0], p2: [1, 0],
  IsElbowUp: true, IsElbowUpp: true, jointVel: [1, 0],
});
const VAR_NAMES = Object.keys(INITIAL);

/** A fresh copy of the initial settings. */
export const initialState = () => cloneState(INITIAL);
export function cloneState(s) {
  const out = {};
  for (const k of VAR_NAMES) out[k] = Array.isArray(s[k]) ? s[k].slice() : s[k];
  return out;
}

/**
 * Plus of machine numbers with the Orderless attribute: the terms in canonical (ascending numeric) order, then added
 * left to right. A LEAD, not a finding (K-TK-03): four-bar-linkage's stored samples fit Plus in written order
 * (K-FB-05); the harness decides (COMMON-DECISIONS §4, "Plus order: unresolved").
 */
export function plusOrderless(...xs) {
  return xs.slice().sort((a, b) => a - b).reduce((s, x) => s + x, 0);
}

/** The real part of ArcTan[D, ±Sqrt[1 − D²]] (Q-TK-08): 0 for D > 1, π for D < −1, else the real ArcTan. */
export function reArcTanD(D, sign) {
  const s = 1 - D * D;
  if (s < 0) return D > 0 ? 0 : Math.PI; // Re of −i Log[(D ∓ √(D² − 1))] (Wolfram reference, ArcTan, complex arguments)
  return arcTan(D, nz(sign * Math.sqrt(s)));
}

/** The D of Theta2inv: (-r1^2 - r2^2 + x^2 + y^2)/(2 r1 r2), i.e. numerator · (1/(2 r1 r2)). */
export const theta2D = (x, y, r1, r2) => plusOrderless(-(r1 * r1), -(r2 * r2), x * x, y * y) * (1 / (2 * r1 * r2));

/** Theta2inv[x, y, r1, r2, IsElbowUp] (F-TK-11): exactly 0 on or beyond the outer circle (tolerant >=). */
export function Theta2inv(x, y, r1, r2, IsElbowUp) {
  if (mGreaterEq(x * x + y * y, (r1 + r2) * (r1 + r2))) return 0;
  return reArcTanD(theta2D(x, y, r1, r2), IsElbowUp ? -1 : 1);
}

/** Theta1inv[x, y, r1, r2, Theta2] (F-TK-11). */
export function Theta1inv(x, y, r1, r2, Theta2) {
  return nz(arcTan(x, y) - arcTan(r1 + r2 * Math.cos(Theta2), r2 * Math.sin(Theta2)));
}

/** The Jacobian {{-r1 Sin[θ1] - r2 Sin[θ1 + θ2], -r2 Sin[θ1 + θ2]}, {r1 Cos[θ1] + r2 Cos[θ1 + θ2], r2 Cos[θ1 + θ2]}}. */
export function jacobian(r1, r2, Theta1, Theta2) {
  const s1 = Math.sin(Theta1), c1 = Math.cos(Theta1), s12 = Math.sin(Theta1 + Theta2), c12 = Math.cos(Theta1 + Theta2);
  return [
    [nz(-(r1 * s1) - r2 * s12), nz(-(r2 * s12))],
    [nz(r1 * c1 + r2 * c12), nz(r2 * c12)],
  ];
}

/** det of a 2×2 matrix to within one rounding (Kahan's algorithm with two fused multiply-adds): exact zeros stay 0. */
export function det2(J) {
  const [[a, b], [c, d]] = J;
  const w = b * c;
  return nz(fma(a, d, -w) + fma(-b, c, w));
}

/** A unit vector along (x, y): divided by its length, then one Newton step towards length 1 when that is closer. */
function unit(x, y) {
  const n = Math.hypot(x, y);
  let u = [x / n, y / n];
  const e = (v) => Math.abs(v[0] * v[0] + v[1] * v[1] - 1);
  const k = (3 - (u[0] * u[0] + u[1] * u[1])) / 2;
  const w = [u[0] * k, u[1] * k];
  if (e(w) < e(u)) u = w;
  return u;
}

/** Zero tolerance of SingularValueDecomposition / PseudoInverse (COMMON-DECISIONS §4): 100·10^-MachinePrecision. */
export const SVD_ZERO_TOL = 100 * 2 ** -53;

/**
 * SingularValueDecomposition of a real 2×2 matrix (PORT DEVIATION D-TK-03): {U, S: [σ1, σ2], Sigma (diagonal matrix),
 * V} with J = U·Sigma·Vᵀ. σ1 from the closed form ((a+d, c−b) and (a−d, c+b) halves), σ2 = abs(det J)/σ1 with det J
 * from det2, then σ2 = 0 when σ2 <= zeroTol·σ1 (K-TK-01). v1 = the unit eigenvector of JᵀJ for σ1², v2 its
 * perpendicular; u1 = J v1/‖J v1‖ and u2 = ±u1⊥ (the sign of J v2; any sign when σ2 = 0) — singular-vector signs are
 * arbitrary, every use in the original is sign-invariant.
 */
export function svd2(J, { zeroTol = SVD_ZERO_TOL } = {}) {
  const [[a, b], [c, d]] = J;
  const p = a * a + c * c, q = a * b + c * d, r = b * b + d * d; // JᵀJ = {{p, q}, {q, r}}
  const s1 = Math.sqrt((p + r) / 2 + Math.hypot((p - r) / 2, q)); // √ of its larger eigenvalue
  let s2 = s1 === 0 ? 0 : Math.abs(det2(J)) / s1;
  if (s2 <= zeroTol * s1) s2 = 0;
  const phi = Math.atan2(2 * q, p - r) / 2; // major axis of JᵀJ
  const v1 = unit(Math.cos(phi), Math.sin(phi)), v2 = [-v1[1], v1[0]];
  const w1 = [a * v1[0] + b * v1[1], c * v1[0] + d * v1[1]];
  const u1 = w1[0] === 0 && w1[1] === 0 ? [1, 0] : unit(w1[0], w1[1]).map(nz);
  let u2 = [nz(-u1[1]), u1[0]];
  const w2 = [a * v2[0] + b * v2[1], c * v2[0] + d * v2[1]];
  if (w2[0] * u2[0] + w2[1] * u2[1] < 0) u2 = [nz(-u2[0]), nz(-u2[1])];
  const U = [[u1[0], u2[0]], [u1[1], u2[1]]];
  const V = [[nz(v1[0]), nz(v2[0])], [nz(v1[1]), nz(v2[1])]];
  return { U, S: [s1, s2], Sigma: [[s1, 0], [0, s2]], V };
}

/** PseudoInverse of a 2×2 matrix with the same tolerance: Jᵀ/‖J‖²_F for rank 1 (σ2 = 0), V Σ⁻¹ Uᵀ otherwise. */
export function pseudoInverse2(J, svd = svd2(J)) {
  const [s1, s2] = svd.S;
  if (s1 === 0) return [[0, 0], [0, 0]];
  if (s2 === 0) {
    const f2 = J[0][0] * J[0][0] + J[0][1] * J[0][1] + J[1][0] * J[1][0] + J[1][1] * J[1][1];
    return [[J[0][0] / f2, J[1][0] / f2], [J[0][1] / f2, J[1][1] / f2]];
  }
  return matMul(matMul(svd.V, [[1 / s1, 0], [0, 1 / s2]]), transpose(svd.U));
}

export const transpose = (M) => [[M[0][0], M[1][0]], [M[0][1], M[1][1]]];
/** Dot of 2×2 matrices (row by column, two products added). */
export const matMul = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
];
/** Dot of a 2×2 matrix and a vector. */
export const matVec = (A, v) => [nz(A[0][0] * v[0] + A[0][1] * v[1]), nz(A[1][0] * v[0] + A[1][1] * v[1])];
const sub = (a, b) => [nz(a[0] - b[0]), nz(a[1] - b[1])];
const add = (a, b) => [nz(a[0] + b[0]), nz(a[1] + b[1])];

/**
 * One evaluation of the Manipulate body (F-TK-09 … F-TK-15) on a copy of the state. Returns
 * {state, locals, indeterminate}: locals = the Module's local values (Theta1, Theta2, r2, J, U, Sigma, S, V, q, vNorm)
 * and which branches ran (kinematics 'IK' | 'FK', velocity 'inverse' | 'forward', velocityBranch 'regular' |
 * 'singular' | null, clamp 'outer' | 'inner' | null). indeterminate = true when the original would compute with
 * Indeterminate (pEnd exactly at the origin: Abs[r1 - r2] (pEnd/0)); the caller then keeps its previous state (D-TK-07).
 */
export function evaluate(stateIn) {
  const s = cloneState(stateIn);
  const L = { clamp: null };
  const r2 = 2 - s.r1;
  L.r2 = r2;
  // If[Norm[pEnd] >= 2, pEnd = 2 (pEnd/Norm[pEnd])]
  let n = norm(s.pEnd);
  if (mGreaterEq(n, 2)) { const k = 1 / n; s.pEnd = s.pEnd.map((v) => nz(2 * (v * k))); L.clamp = 'outer'; }
  // If[Norm[pEnd] <= Abs[r1 - r2], pEnd = Abs[r1 - r2] (pEnd/Norm[pEnd])]
  n = norm(s.pEnd);
  const inner = Math.abs(s.r1 - r2);
  if (mLessEq(n, inner)) {
    if (n === 0) return { state: cloneState(stateIn), locals: L, indeterminate: true };
    const k = 1 / n;
    s.pEnd = s.pEnd.map((v) => nz(inner * (v * k)));
    L.clamp = 'inner';
  }
  let Theta1, Theta2;
  if (mUnequal(s.pEndp, s.pEnd) || s.IsElbowUpp !== s.IsElbowUp) { // inverse kinematics
    L.kinematics = 'IK';
    Theta2 = Theta2inv(s.pEnd[0], s.pEnd[1], s.r1, r2, s.IsElbowUp);
    Theta1 = Theta1inv(s.pEnd[0], s.pEnd[1], s.r1, r2, Theta2);
    s.p1 = [nz(Math.cos(Theta1)), nz(Math.sin(Theta1))];
    s.p2 = [nz(Math.cos(Theta2)), nz(Math.sin(Theta2))];
  } else { // forward kinematics
    L.kinematics = 'FK';
    Theta1 = arcTan(s.p1[0], s.p1[1]);
    Theta2 = arcTan(s.p2[0], s.p2[1]);
    s.pEnd = tipPosition(s.r1, r2, Theta1, Theta2).map(nz);
  }
  if (Theta2 > 0) s.IsElbowUp = false;
  if (Theta2 < 0) s.IsElbowUp = true;
  s.pEndp = s.pEnd.slice();
  s.IsElbowUpp = s.IsElbowUp;
  Object.assign(L, { Theta1, Theta2 });

  const J = jacobian(s.r1, r2, Theta1, Theta2);
  const svd = svd2(J);
  const { U, S, Sigma, V } = svd;
  const Ut = transpose(U);
  const q = matVec(Ut, sub(s.pVel, s.pEnd)); // Transpose[U].(pVel - pEnd)
  Object.assign(L, { J, U, Sigma, S, V, q, vNorm: null, velocityBranch: null });

  if (mUnequal(s.pVelp, s.pVel)) { // inverse velocity
    L.velocity = 'inverse';
    if (S[0] > 0 && S[1] > 0) {
      L.velocityBranch = 'regular';
      const vNorm = Math.sqrt(q[0] * q[0] * (1 / (S[0] * S[0])) + q[1] * q[1] * (1 / (S[1] * S[1])));
      L.vNorm = vNorm;
      if (mGreater(vNorm, 1)) { const k = 1 / vNorm; s.pVel = add(sub(s.pVel, s.pEnd).map((v) => v * k), s.pEnd); }
      // V.{{1/Σ11, 0}, {0, 1/Σ22}}.Transpose[U].(pVel - pEnd), the Dot evaluated left to right (K-TK-10)
      s.jointVel = matVec(matMul(matMul(V, [[1 / S[0], 0], [0, 1 / S[1]]]), Ut), sub(s.pVel, s.pEnd));
    } else {
      L.velocityBranch = 'singular';
      if (S[0] > 0) {
        const f = mGreater(Math.sqrt(q[0] * q[0] * (1 / (S[0] * S[0]))), 1) ? Math.abs(S[0] * (1 / q[0])) : 1;
        s.pVel = add(matVec(U, [q[0], 0]).map((v) => v * f), s.pEnd);
      }
      // If[Σ22 > 0, pVel = U.{0, q2} …] never runs here (Q-TK-03)
      s.jointVel = matVec(pseudoInverse2(J, svd), sub(s.pVel, s.pEnd));
    }
  } else { // forward velocity
    L.velocity = 'forward';
    s.pVel = add(matVec(J, s.jointVel), s.pEnd);
  }
  s.pVelp = s.pVel.slice();
  return { state: s, locals: L, indeterminate: false };
}

/**
 * loc[col, c] as drawing data (sc = 1/25): four hair lines from 1.5 sc to 3 sc, Circle[c, 2 sc] and the half-transparent
 * Circle[c, 1.4 sc] with Thickness[1/100].
 */
export function loc(col, c) {
  const sc = 1 / 25;
  const P = (dx, dy) => [c[0] + sc * dx, c[1] + sc * dy];
  return {
    kind: 'loc', color: col,
    hairs: [[P(0, 1.5), P(0, 3)], [P(0, -1.5), P(0, -3)], [P(-1.5, 0), P(-3, 0)], [P(1.5, 0), P(3, 0)]],
    circle: { center: c.slice(), r: sc * 2 },
    ring: { center: c.slice(), r: sc * 2 * 0.7, thickness: 1 / 100, opacity: 0.5 },
  };
}

/** GeometricTransformation[…, {U, pEnd}] of a point: U.x + pEnd. */
const affine = (U, b, x) => add(matVec(U, x), b);

/**
 * Everything the Graphics list draws, in the original's order (F-TK-18 … F-TK-24), as data:
 * {kind: 'disk' | 'text' | 'ellipse' | 'arrow' | 'stadium' | 'point' | 'arc' | 'loc', role, …}. Colours are Mathematica
 * colour names ('DarkerGray' = Darker[Gray], 'DarkerGreen' = Darker[Green]).
 */
export function scene(state, locals) {
  const { r1 } = state;
  const { r2, Theta1, Theta2, U, S, Sigma } = locals;
  const pEnd = state.pEnd, pVel = state.pVel, jv = state.jointVel;
  const out = [];
  // workspace
  const edge = { color: 'Blue', thickness: 'Thin' };
  out.push({ kind: 'disk', role: 'workspace', center: [0, 0], r: 2, fill: 'LightBlue', edge });
  if (mUnequal(r1, 1)) out.push({ kind: 'disk', role: 'hole', center: [0, 0], r: Math.abs(r1 - r2), fill: 'White', edge });
  out.push({ kind: 'text', role: 'workspace-label', text: 'Workspace', at: [0, 1.8], color: 'Black' });
  // manipulability ellipse and its axes, under GeometricTransformation[…, {U, pEnd}], Opacity[0.5]
  const rank = matrixRank(S);
  if (rank > 1) {
    out.push({
      kind: 'ellipse', role: 'ellipse', center: pEnd.slice(), radii: [S[0], S[1]], axis: [U[0][0], U[1][0]],
      fill: 'LightRed', opacity: 0.5, edge,
    });
  }
  const axisArrow = (role, color, row, sign) => ({
    kind: 'arrow', role, color, opacity: 0.5, from: pEnd.slice(), to: affine(U, pEnd, Sigma[row].map((v) => nz(sign * v))),
  });
  out.push(axisArrow('sigma1-plus', 'Blue', 0, 1), axisArrow('sigma1-minus', 'Blue', 0, -1));
  out.push(axisArrow('sigma2-plus', 'Red', 1, 1), axisArrow('sigma2-minus', 'Red', 1, -1));
  // the arm
  const g = armGeometry({ r1, r2, theta1: Theta1, theta2: Theta2, w: 1 / 8, theta1LabelRadius: 2 / 5, robotArmLabel: 'byR2' });
  const robotArm = { kind: 'text', role: 'robot-arm', text: 'Robot Arm', at: g.robotArm.anchor, rotate: { angle: g.robotArm.angle, about: g.robotArm.about }, color: 'Black' };
  out.push({ kind: 'stadium', role: 'link1', ...g.link1, fill: 'Gray', edgeColor: 'Black' });
  if (g.robotArm.link === 1) out.push(robotArm);
  out.push({ kind: 'point', role: 'base', at: [0, 0], color: 'Black' });
  out.push({ kind: 'arc', role: 'jointVel1', color: 'Red', pointSize: 'Large', data: myArrowArc([0, 0], 1 / 2, [Theta1 + 0, Theta1 + jv[0]]) });
  out.push({ kind: 'arc', role: 'theta1-arc', color: 'DarkerGray', data: myArrowArc([0, 0], 1 / 4, [0, Theta1]) });
  if (g.theta1Label.visible) out.push({ kind: 'text', role: 'theta1-label', text: 'θ₁', at: g.theta1Label.at, color: 'DarkerGray', size: 'Medium' });
  out.push({ kind: 'stadium', role: 'link2', ...g.link2, fill: 'Gray', edgeColor: 'Black' });
  if (g.robotArm.link === 2) out.push(robotArm);
  const elbow = elbowPosition(r1, Theta1);
  out.push({ kind: 'point', role: 'elbow', at: elbow, color: 'Black' });
  const phi = Theta1 + Theta2;
  out.push({ kind: 'arc', role: 'jointVel2', color: 'Blue', thickness: 'Thick', data: myArrowArc(elbow, 2 / 3, [phi + 0, phi + jv[1]]) });
  out.push({ kind: 'arc', role: 'theta2-arc', color: 'DarkerGray', data: myArrowArc(elbow, 1 / 3, [Theta1, phi]) });
  if (g.theta2Label.visible) out.push({ kind: 'text', role: 'theta2-label', text: 'θ₂', at: g.theta2Label.at, color: 'DarkerGray', size: 'Medium' });
  // locator icons and the end-effector velocity
  out.push({ ...loc('DarkerGreen', pVel), role: 'loc-pVel' });
  out.push({ ...loc('Black', pEnd), role: 'loc-pEnd' });
  out.push({ kind: 'arrow', role: 'velocity', color: 'Green', thickness: 'Thick', from: pEnd.slice(), to: pVel.slice() });
  return out;
}

/** Graphics[…, PlotRange -> 3{{-1, 1}, {-1, 1}}, ImageSize -> 400]. */
export const PLOT_RANGE = [[-3, 3], [-3, 3]];
export const IMAGE_SIZE = 400;
/** Locator ranges: {{pEnd, {2, 0}}, {-2, -2}, {2, 2}, Locator}, {{pVel, {2, 1}}, {-4, -4}, {4, 4}, Locator}. */
export const LOCATOR_RANGE = { pEnd: [[-2, 2], [-2, 2]], pVel: [[-4, 4], [-4, 4]] };
export const clampLocator = (name, [x, y]) => {
  const [[x0, x1], [y0, y1]] = LOCATOR_RANGE[name];
  return [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];
};

/** The same-state test the golden tests use: every variable equal (numbers bit for bit up to the sign of zero). */
export const sameState = (a, b) => VAR_NAMES.every((k) => (Array.isArray(a[k]) ? a[k].every((v, i) => v === b[k][i]) : a[k] === b[k]));
export { VAR_NAMES };
