// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations "Robot Singularities in Three-Link Manipulators" by Aaron T. Becker and Yitong Lu and "Denavit-Hartenberg Parameters for a Three-Link Robot" by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/dh-chain.js — the Denavit–Hartenberg chain shared by the DH-family ports: dhTransform (the
// originals' DHTransform / dhTransform, identical in both source Demonstrations), the joint list of a DH table,
// the per-joint transform, the forward kinematics o3coords, Ad and Td. Pure: no DOM.
// Moved from demos/robot-singularities/robots.js (v0.1.16, DH-family move; robot-singularities' robots.js keeps
// its robot table and Jacobians and re-exports these names). Behaviour unchanged for robot-singularities.
//
// Trig of the angles (three paths):
//   - machine path (default for θ): Math.cos / Math.sin. A machine angle that happens to equal a multiple of π/32
//     is NOT recognised (Mathematica keeps e.g. Sin[-π·1.] = -1.2246467991473532e-16; robot-singularities' slider
//     values hit such doubles).
//   - table-constant path (robot-singularities' rule, always for α and for θ when `thetaIsConst`): the five
//     doubles 0, ±π/2, ±π of a DH table entry (exact Pi/2, Pi in the original) get exact cos/sin; any other value
//     uses Math.cos / Math.sin. Option `alphaConst: false` gives α the machine path instead.
//   - exact-angle path (explicit only): `{exact: {theta: n, alpha: m, den = 32}}` — the angle is the exact
//     rational multiple nπ/den; cos/sin from shared/exact-pi.js (exact zeros, ±1, ±1/2 and octant symmetries).
//     The numeric Theta / Alpha arguments are then ignored for that angle.
import { chop } from '../../shared/mma.js';
import { cosSinPi } from '../../shared/exact-pi.js';

const { sin: Sin, cos: Cos, PI } = Math;

/** dof of robot-singularities (the Manipulate's {{dof, 3}, ..., ControlType -> None}) */
export const DOF = 3;

/**
 * Table[{jointtype[i], a[i], alpha[i], d[i], theta[i]} = Type[[;;, i]], {i, 1, dof}] (0-based array of joints).
 * Type = {jointtypes, a, alpha, d, theta} (rows of the DH table, one column per joint). dof defaults to DOF.
 */
export function joints(Type, dof = DOF) {
  const out = [];
  for (let i = 0; i < dof; i++) out.push({ jointtype: Type[0][i], a: Type[1][i], alpha: Type[2][i], d: Type[3][i], theta: Type[4][i] });
  return out;
}

// Mathematica evaluates Cos/Sin of a table's exact angles (Pi/2, -Pi/2, Pi, 0) exactly; JS would give
// 6.1e-17 for Math.cos(Math.PI / 2). The table constants are exactly these doubles, so they are recognised
// and given exact values. Joint variables (params, machine reals in the original too) use Math.cos/sin.
const EXACT = new Map([[0, [1, 0]], [PI / 2, [0, 1]], [-PI / 2, [0, -1]], [PI, [-1, 0]], [-PI, [-1, 0]]]);
const cosSinConst = (x) => EXACT.get(x) ?? [Cos(x), Sin(x)];

/** 4x4 matrix product (row-major) */
export const mul4 = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j] + row[3] * B[3][j]));
const rotZ = ([c, s]) => [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const rotX = ([c, s]) => [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]];
const trans = (x, y, z) => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];

/**
 * dhTransform[d, r, Theta, Alpha] := RotationTransform[Theta, {0,0,1}] . TranslationTransform[{0,0,d}] .
 *   TranslationTransform[{r,0,0}] . RotationTransform[Alpha, {1,0,0}]
 * Returns the 4x4 matrix (row-major), the products in this order.
 * opts: `true` (robot-singularities' form) = {thetaIsConst: true}; or an object
 *   {thetaIsConst = false, alphaConst = true, exact: {theta?: n, alpha?: m, den = 32}} (see the header).
 */
export function dhTransform(d, r, Theta, Alpha, opts = false) {
  const o = typeof opts === 'object' && opts !== null ? opts : { thetaIsConst: opts === true };
  const ex = o.exact ?? {};
  const den = ex.den ?? 32;
  const ct = ex.theta !== undefined ? cosSinPi(ex.theta, den) : o.thetaIsConst ? cosSinConst(Theta) : [Cos(Theta), Sin(Theta)];
  const ca = ex.alpha !== undefined ? cosSinPi(ex.alpha, den) : o.alphaConst === false ? [Cos(Alpha), Sin(Alpha)] : cosSinConst(Alpha);
  return mul4(mul4(mul4(rotZ(ct), trans(0, 0, d)), trans(r, 0, 0)), rotX(ca));
}

/** The transform of joint J for joint value v: If["p" == jointtype[i], dhTransform[v, a, theta, alpha], dhTransform[d, a, v, alpha]] */
export function jointTransform(J, v) {
  return J.jointtype === 'p' ? dhTransform(v, J.a, J.theta, J.alpha, true) : dhTransform(J.d, J.a, v, J.alpha);
}

/**
 * o3coords[p1_, p2_, p3_] = Module[{p = {p1,p2,p3}}, (Dot @@ Table[<joint transform>, {i, 1, dof}])[[1, 1;;3, 4]]]
 * (forward kinematics: the end point of the chain). Returns a function of the joint values (p1, p2, …).
 */
export function makeO3coords(Type, dof = DOF) {
  const J = joints(Type, dof);
  return (...p) => {
    let M = jointTransform(J[0], p[0]);
    for (let i = 1; i < dof; i++) M = mul4(M, jointTransform(J[i], p[i]));
    return [M[0][3], M[1][3], M[2][3]];
  };
}

/** Ad = Table[<joint transform of params[[i]]>, {i, 1, dof}] */
export const computeAd = (Type, params, dof = DOF) => joints(Type, dof).map((J, i) => jointTransform(J, params[i]));

/**
 * Td[1] = Ad[[1]]; Td[i] = Chop[Td[i-1] . Ad[[i]]] (i = 2..n, n = Ad.length). Returns [Td1, …, Tdn] (0-based).
 * opts.chop (default true, robot-singularities' stored code): false computes Td[i-1] . Ad[[i]] without Chop
 * (arm-configurations, manipulator-workspaces).
 */
export function computeTd(Ad, { chop: doChop = true } = {}) {
  const Td = [Ad[0]];
  for (let i = 1; i < Ad.length; i++) {
    const M = mul4(Td[i - 1], Ad[i]);
    Td.push(doChop ? chop(M) : M);
  }
  return Td;
}
