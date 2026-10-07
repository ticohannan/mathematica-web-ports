// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/robots.js — pure port of the robot definitions of "Robot Singularities in
// Three-Link Manipulators": the Type table (Denavit–Hartenberg parameters of the 16 robots), dhTransform,
// o3coords (forward kinematics), the accumulated joint transforms Td, the hand-written linear and angular
// velocity Jacobians myJacob / myJacobAngular, and the joint-variable handling of the Manipulate body.
// No DOM. Names and order of operations follow the original (docs/original-source/robot-singularities.txt).
import { mLess, mGreater, chop } from '../../shared/mma.js';

const { sin: Sin, cos: Cos, PI } = Math;

/** dof (the Manipulate's {{dof, 3}, ..., ControlType -> None}) */
export const DOF = 3;

/** The popup menu {1 -> "planar robot arm", ...} (1-based like iType). */
export const TYPE_NAMES = [
  'planar robot arm', 'elbow robot arm', 'PUMA robot arm', 'offset PUMA arm', 'Stanford robot arm',
  'cylindrical robot arm', 'spherical robot arm', 'offset spherical arm', 'twisted spherical', 'SCARA robot arm',
  'planar RPR arm', 'CNC robot arm', 'Cartesian robot arm', 'linear robot arm', 'spherical wrist', 'offset spherical wrist',
];

// Symbolic entries Subscript[q, i] of the Type table: "this joint's variable". They are never used in
// a computation (a revolute joint's theta and a prismatic joint's d are replaced by params[[i]]).
const q1 = 'q1', q2 = 'q2', q3 = 'q3';

/**
 * Type = {...}[[iType]]: per robot {jointtypes, a, alpha, d, theta} (rows of the DH table, one column per joint).
 * "r" = revolute, "p" = prismatic. Transcribed from the Manipulate body, same order.
 * ORIGINAL QUIRK (Q-RS-01): the planar arm's theta row is {q1, q2, q2} (q2 twice); harmless because a
 * revolute joint's theta entry is never read.
 */
export const TYPES = [
  /* 1 planar robot arm */ [['r', 'r', 'r'], [1, 1, 1], [0, 0, 0], [0, 0, 0], [q1, q2, q2]],
  /* 2 elbow robot arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 0, 0], [q1, q2, q3]],
  /* 3 PUMA robot arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 1 / 3, -1 / 3], [q1, q2, q3]],
  /* 4 offset PUMA arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 1 / 3, 1 / 3], [q1, q2, q3]],
  /* 5 Stanford robot arm */ [['r', 'r', 'p'], [0, 0, 0], [-PI / 2, +PI / 2, 0], [1, 1, q3], [q1, q2, 0]],
  /* 6 cylindrical robot arm */ [['r', 'p', 'p'], [0, 0, 0], [0, -PI / 2, 0], [1, q2, q3], [q1, 0, 0]],
  /* 7 spherical robot arm */ [['r', 'r', 'p'], [0, 0, 0], [-PI / 2, PI / 2, 0], [1, 0, q3], [q1, q2, 0]],
  /* 8 offset spherical arm */ [['r', 'r', 'p'], [0, 1, 0], [-PI / 2, 0, 0], [1, 0, q3], [q1, q2, 0]],
  /* 9 twisted spherical */ [['r', 'r', 'p'], [0, 1, 0], [-PI / 2, PI / 2, 0], [1, 0, q3], [q1, q2, 0]],
  /* 10 SCARA robot arm */ [['r', 'r', 'p'], [1.2, 0.6, 0], [0, PI, 0], [1.5, 0, q3], [q1, q2, 0]],
  /* 11 planar RPR arm */ [['r', 'p', 'r'], [1, 1, 1], [PI / 2, PI / 2, 0], [0, q2, 0], [q1, 0, q3]],
  /* 12 CNC robot arm */ [['p', 'p', 'p'], [0, 0, 0], [-PI / 2, PI / 2, 0], [q1, q2, q3], [-PI / 2, -PI / 2, 0]],
  /* 13 Cartesian robot arm */ [['p', 'p', 'p'], [0, 0, 0], [-PI / 2, -PI / 2, -0], [q1, q2, q3], [0, 0, 0]],
  /* 14 linear robot arm */ [['p', 'p', 'p'], [0, 0, 0], [0, 0, -0], [q1, q2, q3], [0, 0, 0]],
  /* 15 spherical wrist */ [['r', 'r', 'r'], [0, 0, 0], [PI / 2, -PI / 2, 0], [1, 0, 1], [q1, q2, q3]],
  /* 16 offset spherical wrist */ [['r', 'r', 'r'], [0, 0, 1 / 2], [PI / 2, -PI / 2, 0], [1, 1 / 2, 1], [q1, q2, q3]],
];

/** Type of robot iType (1..16), as the body's `Type = {...}[[iType]]`. */
export const typeOf = (iType) => TYPES[iType - 1];

/** Table[{jointtype[i], a[i], alpha[i], d[i], theta[i]} = Type[[;;, i]], {i, 1, dof}] (0-based array of joints). */
export function joints(Type) {
  const out = [];
  for (let i = 0; i < DOF; i++) out.push({ jointtype: Type[0][i], a: Type[1][i], alpha: Type[2][i], d: Type[3][i], theta: Type[4][i] });
  return out;
}

// ---- dhTransform ----------------------------------------------------------------------------------
// Mathematica evaluates Cos/Sin of the table's exact angles (Pi/2, -Pi/2, Pi, 0) exactly; JS would give
// 6.1e-17 for Math.cos(Math.PI / 2). The table constants are exactly these doubles, so they are recognised
// and given exact values. Joint variables (params, machine reals in the original too) use Math.cos/sin.
const EXACT = new Map([[0, [1, 0]], [PI / 2, [0, 1]], [-PI / 2, [0, -1]], [PI, [-1, 0]], [-PI, [-1, 0]]]);
const cosSinConst = (x) => EXACT.get(x) ?? [Cos(x), Sin(x)];

const mul4 = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j] + row[3] * B[3][j]));
const rotZ = ([c, s]) => [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const rotX = ([c, s]) => [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]];
const trans = (x, y, z) => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];

/**
 * dhTransform[d, r, Theta, Alpha] := RotationTransform[Theta, {0,0,1}] . TranslationTransform[{0,0,d}] .
 *   TranslationTransform[{r,0,0}] . RotationTransform[Alpha, {1,0,0}]
 * Returns the 4x4 matrix (row-major). `thetaIsConst` marks a theta taken from the Type table (exact in the original).
 */
export function dhTransform(d, r, Theta, Alpha, thetaIsConst = false) {
  const ct = thetaIsConst ? cosSinConst(Theta) : [Cos(Theta), Sin(Theta)];
  return mul4(mul4(mul4(rotZ(ct), trans(0, 0, d)), trans(r, 0, 0)), rotX(cosSinConst(Alpha)));
}

/** The transform of joint i (0-based) for joint value v: If["p" == jointtype[i], dhTransform[v, a, theta, alpha], dhTransform[d, a, v, alpha]] */
export function jointTransform(J, v) {
  return J.jointtype === 'p' ? dhTransform(v, J.a, J.theta, J.alpha, true) : dhTransform(J.d, J.a, v, J.alpha);
}

/**
 * o3coords[p1_, p2_, p3_] = Module[{p = {p1,p2,p3}}, (Dot @@ Table[<joint transform>, {i, 1, dof}])[[1, 1;;3, 4]]]
 * (forward kinematics: the end point of the chain). Returns a function of (p1, p2, p3).
 */
export function makeO3coords(Type) {
  const J = joints(Type);
  return (p1, p2, p3) => {
    const p = [p1, p2, p3];
    let M = jointTransform(J[0], p[0]);
    for (let i = 1; i < DOF; i++) M = mul4(M, jointTransform(J[i], p[i]));
    return [M[0][3], M[1][3], M[2][3]];
  };
}

/** Ad = Table[<joint transform of params[[i]]>, {i, 1, dof}] */
export const computeAd = (Type, params) => joints(Type).map((J, i) => jointTransform(J, params[i]));

/** Td[1] = Ad[[1]]; Td[i] = Chop[Td[i-1] . Ad[[i]]] (i = 2..dof). Returns [Td1, Td2, Td3] (0-based array). */
export function computeTd(Ad) {
  const Td = [Ad[0]];
  for (let i = 1; i < DOF; i++) Td.push(chop(mul4(Td[i - 1], Ad[i])));
  return Td;
}

// ---- the joint variables --------------------------------------------------------------------------------
/**
 * The per-joint sliders are built in a Dynamic Grid whose Slider's first argument is
 * `params[[i]] = 0; Dynamic[params[[i]]]` (0.5 for a prismatic joint d_i). Every time the grid is rendered
 * (when Type changes, i.e. when another robot is chosen) the parameters are therefore reset.
 * ORIGINAL QUIRK (Q-RS-02). Returns the reset values for Type.
 */
export const defaultParams = (Type) => Type[0].map((jt) => (jt === 'p' ? 0.5 : 0));

/** Slider specs of the grid: prismatic {0, 1, 0.01}; revolute {-π 1.01, π 1.01, 0.01π}. */
export function sliderSpec(Type, i) {
  return Type[0][i] === 'p'
    ? { kind: 'p', label: 'd', min: 0, max: 1, step: 0.01 }
    : { kind: 'r', label: 'θ', min: -PI * 1.01, max: PI * 1.01, step: 0.01 * PI };
}

/**
 * The six If statements at the top of the body:
 * If[params[[i]] < -π, params[[i]] = params[[i]] + 6.28]; If[params[[i]] > π, params[[i]] = params[[i]] - 6.28]
 * ORIGINAL QUIRK (Q-RS-03): the jump is 6.28, not 2π, and it applies to prismatic values too (never triggered
 * in their 0..1 range). Comparisons are Mathematica's tolerant Less/Greater.
 */
export function wrapParams(params) {
  const p = params.slice();
  for (let i = 0; i < 3; i++) {
    if (mLess(p[i], -PI)) p[i] = p[i] + 6.28;
    if (mGreater(p[i], PI)) p[i] = p[i] - 6.28;
  }
  return p;
}

// ---- velocity Jacobians (hand-written in the original, transcribed exactly) ------------------------------
/** myJacob[q1, q2, q3]: Piecewise over iType of the precomputed linear velocity Jacobians (rows x, y, z). */
export function myJacob(iType, q1, q2, q3) {
  switch (iType) {
    case 1: return [
      [-Sin(q1) - Sin(q1 + q2) - Sin(q1 + q2 + q3), -Sin(q1 + q2) - Sin(q1 + q2 + q3), -Sin(q1 + q2 + q3)],
      [Cos(q1) + Cos(q1 + q2) + Cos(q1 + q2 + q3), Cos(q1 + q2) + Cos(q1 + q2 + q3), Cos(q1 + q2 + q3)],
      [0, 0, 0]];
    case 2: // elbow robot arm
    case 3: return [ // PUMA robot arm (same matrix)
      [-2 * Cos(q2 + q3 / 2) * Cos(q3 / 2) * Sin(q1), -Cos(q1) * (Sin(q2) + Sin(q2 + q3)), -Cos(q1) * Sin(q2 + q3)],
      [2 * Cos(q1) * Cos(q2 + q3 / 2) * Cos(q3 / 2), -Sin(q1) * (Sin(q2) + Sin(q2 + q3)), -Sin(q1) * Sin(q2 + q3)],
      [0, Cos(q2) + Cos(q2 + q3), Cos(q2 + q3)]];
    case 4: return [
      [(2 / 3) * (Cos(q1) - 3 * Cos(q2 + q3 / 2) * Cos(q3 / 2) * Sin(q1)), -Cos(q1) * (Sin(q2) + Sin(q2 + q3)), -Cos(q1) * Sin(q2 + q3)],
      [(2 / 3) * (3 * Cos(q1) * Cos(q2 + q3 / 2) * Cos(q3 / 2) + Sin(q1)), -Sin(q1) * (Sin(q2) + Sin(q2 + q3)), -Sin(q1) * Sin(q2 + q3)],
      [0, Cos(q2) + Cos(q2 + q3), Cos(q2 + q3)]];
    case 5: return [
      [-Cos(q1) - Sin(q1) * Sin(q2) * q3, Cos(q1) * Cos(q2) * q3, Cos(q1) * Sin(q2)],
      [-Sin(q1) + Cos(q1) * Sin(q2) * q3, Cos(q2) * Sin(q1) * q3, Sin(q1) * Sin(q2)],
      [0, -Sin(q2) * q3, Cos(q2)]];
    case 6: return [
      [-Cos(q1) * q3, 0, -Sin(q1)],
      [-Sin(q1) * q3, 0, Cos(q1)],
      [0, 1, 0]];
    case 7: return [
      [-Sin(q1) * Sin(q2) * q3, Cos(q1) * Cos(q2) * q3, Cos(q1) * Sin(q2)],
      [Cos(q1) * Sin(q2) * q3, Cos(q2) * Sin(q1) * q3, Sin(q1) * Sin(q2)],
      [0, -Sin(q2) * q3, Cos(q2)]];
    case 8: return [
      [-Cos(q2) * Sin(q1) - Cos(q1) * q3, -Cos(q1) * Sin(q2), -Sin(q1)],
      [Cos(q1) * Cos(q2) - Sin(q1) * q3, -Sin(q1) * Sin(q2), Cos(q1)],
      [0, -Cos(q2), 0]];
    case 9: return [
      [-Sin(q1) * (Cos(q2) + Sin(q2) * q3), Cos(q1) * (-Sin(q2) + Cos(q2) * q3), Cos(q1) * Sin(q2)],
      [Cos(q1) * (Cos(q2) + Sin(q2) * q3), Sin(q1) * (-Sin(q2) + Cos(q2) * q3), Sin(q1) * Sin(q2)],
      [0, -Cos(q2) - Sin(q2) * q3, Cos(q2)]];
    case 10: return [
      [-1.2 * Sin(q1) - 0.6 * Sin(q1 + q2), -0.6 * Sin(q1 + q2), 0],
      [1.2 * Cos(q1) + 0.6 * Cos(q1 + q2), 0.6 * Cos(q1 + q2), 0],
      [0, 0, -1]];
    case 11: return [
      [-2 * Sin(q1) - Sin(q1 - q3) + Cos(q1) * q2, Sin(q1), Sin(q1 - q3)],
      [2 * Cos(q1) + Cos(q1 - q3) + Sin(q1) * q2, -Cos(q1), -Cos(q1 - q3)],
      [0, 0, 0]];
    case 12: return [[0, 1, 0], [0, 0, 1], [1, 0, 0]];
    case 13: return [[0, 0, 0], [0, 1, 0], [1, 0, -1]];
    case 14: return [[0, 0, 0], [0, 0, 0], [1, 1, 1]];
    case 15: return [
      [Sin(q1) * Sin(q2), -Cos(q1) * Cos(q2), 0],
      [-Cos(q1) * Sin(q2), -Cos(q2) * Sin(q1), 0],
      [0, -Sin(q2), 0]];
    case 16: return [
      [(1 / 2) * (Cos(q1) - Cos(q2) * Cos(q3) * Sin(q1) + 2 * Sin(q1) * Sin(q2) - Cos(q1) * Sin(q3)),
        -(1 / 2) * Cos(q1) * (2 * Cos(q2) + Cos(q3) * Sin(q2)),
        (1 / 2) * (-Cos(q3) * Sin(q1) - Cos(q1) * Cos(q2) * Sin(q3))],
      [(1 / 2) * (Cos(q1) * Cos(q2) * Cos(q3) + Sin(q1) - 2 * Cos(q1) * Sin(q2) - Sin(q1) * Sin(q3)),
        -(1 / 2) * Sin(q1) * (2 * Cos(q2) + Cos(q3) * Sin(q2)),
        (1 / 2) * (Cos(q1) * Cos(q3) - Cos(q2) * Sin(q1) * Sin(q3))],
      [0, (1 / 2) * Cos(q2) * Cos(q3) - Sin(q2), -(1 / 2) * Sin(q2) * Sin(q3)]];
    default: throw new Error(`no robot type ${iType}`);
  }
}

/** myJacobAngular[q1, q2, q3]: Piecewise over iType of the precomputed angular velocity Jacobians. */
export function myJacobAngular(iType, q1, q2, q3) {
  switch (iType) {
    case 1: return [[0, 0, 0], [0, 0, 0], [1, 1, 1]];
    case 2: case 3: case 4: return [[0, Sin(q1), Sin(q1)], [0, -Cos(q1), -Cos(q1)], [1, 0, 0]];
    case 5: case 7: case 8: case 9: return [[0, -Sin(q1), 0], [0, Cos(q1), 0], [1, 0, 0]];
    case 6: return [[0, 0, 0], [0, 0, 0], [1, 0, 0]];
    case 10: return [[0, 0, 0], [0, 0, 0], [1, 1, 0]];
    case 11: return [[0, 0, 0], [0, 0, 0], [1, 0, -1]];
    case 12: case 13: case 14: return [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    case 15: return [[0, Sin(q1), -Cos(q1) * Sin(q2)], [0, -Cos(q1), -Sin(q1) * Sin(q2)], [1, 0, -Cos(q2)]];
    case 16: return [[0, Sin(q1), -Cos(q1) * Sin(q2)], [0, -Cos(q1), -Sin(q1) * Sin(q2)], [1, 0, Cos(q2)]];
    default: throw new Error(`no robot type ${iType}`);
  }
}

/** The matrix the body decomposes: If[isJLinearVel == "Linear", myJacob[...], myJacobAngular[...]] at params. */
export const jacobianFor = (iType, isJLinearVel, params) =>
  (isJLinearVel === 'Linear' ? myJacob : myJacobAngular)(iType, params[0], params[1], params[2]);

/**
 * phaseOpt = {PlotRange -> Table[If["p" == Type[[1,i]], {0,1}, {-3.15,3.15}], {i, dof}], Axes -> True,
 *   PlotLabel -> "Phase Space", BoxRatios -> {1,1,1}, AxesLabel -> Table[If["p" == ..., d_i, θ_i]], ImageSize -> 280}
 */
export function phaseOpt(Type, plotLabel = 'Phase Space') {
  return {
    PlotRange: Type[0].map((jt) => (jt === 'p' ? [0, 1] : [-3.15, 3.15])),
    Axes: true,
    PlotLabel: plotLabel,
    BoxRatios: [1, 1, 1],
    AxesLabel: Type[0].map((jt, i) => (jt === 'p' ? { sym: 'd', italic: true, sub: i + 1 } : { sym: 'θ', italic: false, sub: i + 1 })),
    ImageSize: 280,
  };
}
