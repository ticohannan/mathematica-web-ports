// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/arm-configurations/model.js — one evaluation of the Manipulate body of "Common Robot Arm Configurations"
// (pure: no DOM, no three.js): the Manipulate variables and the opening state, the slider-grid reset of a robot
// change, Ad and Td (dhTransform with the exact angles nπ/32; Chop acts on machine Td, K-AC-01), the Graphics3D content in the original's
// order (drawShaft transcribed but unreachable), the exactness of every entry of H and its display strings.
// Names and order of operations follow the original (docs/original-source/arm-configurations.txt).
import { dhTransform, mul4, mul4Fma } from '../common/dh-chain.js';
import { chop } from '../../shared/mma.js';
import { drawJoint, drawGripper, GROUND, axisBottomZ } from '../common/robot-draw.js';
import { Graphics3D, GeometricTransformation, Cuboid, Cylinder, Opacity, Gray, flatten } from '../common/g3d.js';
import { trigPi } from '../../shared/exact-pi.js';
import { piFraction, fractionText } from '../../shared/mma-text.js';
import { mmaNumberString, nDigits } from '../../shared/mma-extra.js';
import { ROBOTS, DEFAULT_ROBOT, ANGLE_DEN } from './robots.js';

export { ROBOTS, ANGLE_DEN };
const π = Math.PI;

const PRISMATIC = ['Prismatic', 'prismatic', 'P', 'p'];
const REVOLUTE = ['Revolute', 'revolute', 'R', 'r'];
/** MemberQ[{"Prismatic","prismatic","P","p"}, ToString[DHParameters[[1,i]]]] */
export const isPrismatic = (j) => PRISMATIC.includes(String(j));
/** MemberQ[{"Revolute","revolute","R","r"}, jointtype[i]] */
export const isRevolute = (j) => REVOLUTE.includes(String(j));

// ---- slider grid (F-AC-01) -------------------------------------------------------------------------------------
/** Revolute slider {-π, π, π/32}: positions n = -32 … 32, value nπ/32 (exact, K-AC-05) */
export const REV = { min: -32, max: 32 };
/** Prismatic slider {1/2, 3/2, 1/20}: positions k = 10 … 30, value k/20 (exact, K-AC-05) */
export const PRIS = { min: 10, max: 30, den: 20 };

/** A joint value: exact nπ/32 ({v, exact: true, pi: n}), exact k/20 ({v, exact: true, frac: k}), an exact integer
 * ({v, exact: true}) or a machine real ({v, exact: false}). */
export const piValue = (n) => ({ v: (n * π) / ANGLE_DEN, exact: true, pi: n });
export const fracValue = (k) => ({ v: k / PRIS.den, exact: true, frac: k });
export const exactInt = (v) => ({ v, exact: true });
export const machine = (v) => ({ v, exact: false });
/** an exact rational joint value or table entry as [p, q] (k/20 → [k, 20], an integer n → [n, 1]); otherwise null */
export const exactRatio = (x) => (!x.exact || x.pi !== undefined ? null : x.frac !== undefined ? [x.frac, PRIS.den]
  : Number.isInteger(x.v) ? [x.v, 1] : null);

/** The text of a joint value as Dynamic[params[[i]]] shows it: "0", "0.5", "−13π/16", "11/20", "1/2", "3/2", "1" */
export function valueText(p) {
  if (p.pi !== undefined) return piFraction(p.pi, ANGLE_DEN);
  if (p.frac !== undefined) return fractionText(p.frac, PRIS.den);
  return p.exact ? String(p.v) : mmaNumberString(p.v, { isReal: true });
}

/** The slider position of a joint value (the nearest position; the reset value 0.5 is position 10) */
export function sliderPosition(p, prismatic) {
  if (prismatic) return p.frac ?? Math.min(PRIS.max, Math.max(PRIS.min, Math.round(p.v * PRIS.den)));
  return p.pi ?? Math.min(REV.max, Math.max(REV.min, Math.round((p.v * ANGLE_DEN) / π)));
}

// ---- state -----------------------------------------------------------------------------------------------------
/**
 * The Manipulate variables: robot (0-based index into ROBOTS; the original stores the table itself in DHParameters),
 * dof, params (20 joint values), g ({v, exact}), showRobot. The opening state = the live state = the initial settings
 * (F-AC-11): anthropomorphic, dof 6, params = 20 exact zeros, g = 1 (exact), show robot on.
 */
export function initialState() {
  return { robot: DEFAULT_ROBOT, dof: 6, params: Array.from({ length: 20 }, () => exactInt(0)), g: exactInt(1), showRobot: true };
}

export const cloneState = (s) => ({ robot: s.robot, dof: s.dof, params: s.params.map((p) => ({ ...p })), g: { ...s.g }, showRobot: s.showRobot });

/**
 * A robot chosen in the popup (F-AC-04, Q-AC-04): the slider grid is rebuilt, which runs params[[i]] = 0 (revolute)
 * or params[[i]] = 0.5 (prismatic, a machine number) for i = 1 … dof of the new robot; params beyond dof keep their
 * values. Choosing the robot that is already selected changes nothing. Returns a new state.
 */
export function selectRobot(st, index) {
  if (index === st.robot) return cloneState(st);
  const next = cloneState(st);
  const R = ROBOTS[index];
  next.robot = index;
  next.dof = R.jointtype.length;
  R.jointtype.forEach((j, i) => { next.params[i] = isPrismatic(j) ? machine(0.5) : exactInt(0); });
  return next;
}

// ---- exactness of matrix entries (F-AC-10, §6.4, K-AC-09 resolved by H-AC-11/H-AC-18) ---------------------------
// A TransformationFunction matrix with one machine entry is all machine (Mathematica 15.0.1 record: H-AC-11 and
// H-AC-18 give MachinePrecision for all 16 entries of H and machine reals 0., 1. in every Td[i] already from Td[1]
// = Ad[[1]], whose d = 1.5 is the only machine number): allMachine() applies this after every product.
// kinds: 'zero' (exact 0), 'plain' (a non-zero exact rational), 'symbolic' (an exact number with Cos/Sin of a
// non-right-angle multiple of π/32), 'machine'.
const plainKind = (v) => (v === 0 ? 'zero' : 'plain');
const entryKind = (e) => (e.exact ? plainKind(e.v) : 'machine');
const trigKinds = (e) => {
  if (!e.exact) return ['machine', 'machine'];
  const t = trigPi(e.pi ?? 0, ANGLE_DEN);
  return [t.cosRational ? plainKind(t.cos) : 'symbolic', t.sinRational ? plainKind(t.sin) : 'symbolic'];
};
const has = (K, k) => K.some((row) => row.includes(k));
/** a TransformationFunction with a machine entry holds a machine matrix (K-AC-09, H-AC-11, H-AC-18) */
export const allMachine = (K) => (has(K, 'machine') ? K.map((row) => row.map(() => 'machine')) : K);
/**
 * Kinds of the entries of the product A.B (values V = the product's values): a numeric Dot (neither matrix holds a
 * symbolic entry) is all machine as soon as one machine number occurs, else exact; otherwise each entry is formed
 * symbolically: a term with an exact 0 factor is exact 0, an entry is machine if one of its terms is, exact otherwise.
 */
export function dotKinds(KA, KB, V) {
  if (!has(KA, 'symbolic') && !has(KB, 'symbolic')) {
    const m = has(KA, 'machine') || has(KB, 'machine');
    return V.map((row) => row.map((v) => (m ? 'machine' : plainKind(v))));
  }
  return V.map((row, i) => row.map((v, j) => {
    let kind = 'zero';
    for (let k = 0; k < 4; k++) {
      const a = KA[i][k], b = KB[k][j];
      if (a === 'zero' || b === 'zero') continue;
      const t = a === 'machine' || b === 'machine' ? 'machine' : a === 'symbolic' || b === 'symbolic' ? 'symbolic' : 'plain';
      if (t === 'machine') kind = 'machine';
      else if (t === 'symbolic' && kind !== 'machine') kind = 'symbolic';
      else if (kind === 'zero') kind = 'plain';
    }
    return kind === 'plain' ? plainKind(v) : kind;
  }));
}
const mul = (A, B) => A.map((row) => [0, 1, 2, 3].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j] + row[3] * B[3][j]));

/**
 * The kinds of the entries of dhTransform[d, r, Theta, Alpha] = RotationTransform[Theta, z] . TranslationTransform[{0,0,d}]
 * . TranslationTransform[{r,0,0}] . RotationTransform[Alpha, x], composed left to right.
 */
export function dhKinds(d, r, Theta, Alpha) {
  const [ct, st] = trigKinds(Theta), [ca, sa] = trigKinds(Alpha);
  const z = 'zero', o = 'plain';
  const Rz = [[ct, st, z, z], [st, ct, z, z], [z, z, o, z], [z, z, z, o]];
  const Tz = [[o, z, z, z], [z, o, z, z], [z, z, o, entryKind(d)], [z, z, z, o]];
  const Tx = [[o, z, z, entryKind(r)], [z, o, z, z], [z, z, o, z], [z, z, z, o]];
  const Rx = [[o, z, z, z], [z, ca, sa, z], [z, sa, ca, z], [z, z, z, o]];
  // the values only decide plain vs zero of exact entries; computed as the port's dhTransform computes them
  const ctv = Theta.exact ? trigPi(Theta.pi ?? 0, ANGLE_DEN) : { cos: Math.cos(Theta.v), sin: Math.sin(Theta.v) };
  const cav = Alpha.exact ? trigPi(Alpha.pi ?? 0, ANGLE_DEN) : { cos: Math.cos(Alpha.v), sin: Math.sin(Alpha.v) };
  const VRz = [[ctv.cos, -ctv.sin, 0, 0], [ctv.sin, ctv.cos, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const VTz = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, d.v], [0, 0, 0, 1]];
  const VTx = [[1, 0, 0, r.v], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const VRx = [[1, 0, 0, 0], [0, cav.cos, -cav.sin, 0], [0, cav.sin, cav.cos, 0], [0, 0, 0, 1]];
  let K = Rz, V = VRz;
  for (const [KB, VB] of [[Tz, VTz], [Tx, VTx], [Rx, VRx]]) { V = mul(V, VB); K = dotKinds(K, KB, V); }
  return allMachine(K);
}

/** dhTransform[d, r, Theta, Alpha] with exact angles through the explicit exact-angle path of demos/common/dh-chain.js */
function dhT(d, r, Theta, Alpha) {
  const exact = {};
  if (Theta.exact) exact.theta = Theta.pi ?? 0;
  if (Alpha.exact) exact.alpha = Alpha.pi ?? 0;
  return dhTransform(d.v, r.v, Theta.v, Alpha.v, { exact, alphaConst: false });
}

// ---- drawShaft (Q-AC-01, E-AC-03: transcribed, never drawn) ---------------------------------------------------
/**
 * drawShaft[j, d, r, Theta] := Module[{jr = 1/5, ar = 1/20}, {Opacity[1], {Opacity[0.5], Gray, If[j == "p",
 *   Cuboid[{-ar,-ar,-1+d-jr-.01},{ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01},{0,0,Max[ar,d]+.01}}, ar]]}}]
 * It stands in the fourth argument of If[dof == 1, …, …, …], which Mathematica evaluates only when dof == 1 is neither
 * True nor False — never (dof is a number). Kept for completeness; evaluate() does not call it.
 */
export function drawShaft(j, d, r, Theta, { dExact = null } = {}) {
  const jr = 1 / 5, ar = 1 / 20;
  return [Opacity(1), [Opacity(0.5), Gray, j === 'p'
    ? Cuboid([-ar, -ar, axisBottomZ(d, dExact)], [ar, ar, d + 0.01]) // -1+d-jr-.01 in COMMON §7 order (K-AC-10)
    : Cylinder([[0, 0, Math.min(-ar, d - jr) - 0.01], [0, 0, Math.max(ar, d) + 0.01]], ar)]];
}

// ---- one evaluation of the body --------------------------------------------------------------------------------
/** Graphics3D options of the original (F-AC-14) */
export const PLOT_RANGE = [[-3, 3], [-3, 3], [-3, 3]];
export const IMAGE_SIZE = [420, 350];
export const VIEW_ANGLE = (12 * π) / 180;
export const VIEWPOINT = [1.3, -2.4, 2];

/**
 * Module[{jr = 1/10, ar = 1/40, Ad, Td, i, DHdim, a, d, theta, alpha, jointtype}, DHdim = Dimensions[DHParameters];
 *   dof = DHdim[[2]]; Table[{jointtype[i] = ToString[…[[1,i]]], a[i] = …, alpha[i] = …, d[i] = …, theta[i] = …}, …];
 *   Ad = Table[If[MemberQ[{"Prismatic","prismatic","P","p"}, ToString[DHParameters[[1,i]]]],
 *     dhTransform[params[[i]], a[i], theta[i], alpha[i]], dhTransform[d[i], a[i], params[[i]], alpha[i]]], {i, 1, DHdim[[2]]}];
 *   Td[1] = Ad[[1]]; Table[Td[i] = Chop[Td[i-1].Ad[[i]]], {i, 2, DHdim[[2]]}];   (Chop acts on machine entries, K-AC-01)
 *   Column[{Graphics3D[{ground, joint 1, If[dof == 1, gripper, If[showRobot, joints 2 … dof], <drawShaft>],
 *     GeometricTransformation[drawGripper[g, 0], Chop[Td[dof]]]}, …], Text@Row[{"H", " = ", MatrixForm[N[Chop[Td[dof]], 2]]}]}]]
 * (jr, ar unused, N-AC-04). Returns {dof, joints, Ad, Td, AdKinds, TdKinds, H, HKinds, hStrings, graphic, parts
 * (flattened primitives of the ground, joint 1, joints 2 … dof, the gripper), prims, box}. Assigns st.dof (the body
 * assigns dof).
 */
export function evaluate(st) {
  const R = ROBOTS[st.robot];
  const DHdim = [5, R.jointtype.length];
  const dof = DHdim[1];
  st.dof = dof;
  const joints = [];
  for (let i = 0; i < DHdim[1]; i++) joints.push({ jointtype: String(R.jointtype[i]), a: R.a[i], alpha: R.alpha[i], d: R.d[i], theta: R.theta[i] });
  const Ad = [], AdKinds = [];
  for (let i = 0; i < DHdim[1]; i++) {
    const J = joints[i], p = st.params[i];
    const [d, Theta] = isPrismatic(J.jointtype) ? [p, J.theta] : [J.d, p];
    Ad.push(dhT(d, J.a, Theta, J.alpha));
    AdKinds.push(dhKinds(d, J.a, Theta, J.alpha));
  }
  // Td[1] = Ad[[1]]; Td[i] = Chop[Td[i-1].Ad[[i]]]: a machine product is Mathematica's packed Dot (fused
  // multiply-add chain, mul4Fma) and Chop replaces its entries below 10^-10 by 0 (shown "0.": the
  // TransformationFunction keeps a machine matrix; H-AC-14, K-AC-01); Chop leaves exact entries alone.
  const Td = [Ad[0]], TdKinds = [AdKinds[0]];
  for (let i = 1; i < dof; i++) {
    const machineDot = has(TdKinds[i - 1], 'machine') || has(AdKinds[i], 'machine');
    const M = machineDot ? chop(mul4Fma(Td[i - 1], Ad[i])) : mul4(Td[i - 1], Ad[i]);
    Td.push(M);
    TdKinds.push(allMachine(dotKinds(TdKinds[i - 1], AdKinds[i], M)));
  }

  // the Graphics3D content
  const g = st.g.v;
  const jointGraphic = (i) => {
    const J = joints[i], P = st.params[i], p = P.v;
    return isRevolute(J.jointtype)
      ? drawJoint(J.jointtype, J.d.v, J.a.v, p, { variant: 'ac', dExact: exactRatio(J.d) })
      : drawJoint(J.jointtype, p, J.a.v, J.theta.v, { variant: 'ac', dExact: exactRatio(P) });
  };
  const content = [
    GROUND(),
    jointGraphic(0),
    // If[dof == 1, GeometricTransformation[drawGripper[g, 0], Chop[Td[dof]]], If[showRobot, Table[…, {i, 2, dof}]], <drawShaft …>]
    dof === 1
      ? GeometricTransformation(drawGripper(g, 0), Td[dof - 1])
      : (st.showRobot ? Array.from({ length: dof - 1 }, (_, k) => GeometricTransformation(jointGraphic(k + 1), Td[k])) : null),
    GeometricTransformation(drawGripper(g, 0), Td[dof - 1]),
  ];
  const graphic = Graphics3D(content, { SphericalRegion: true, ImageSize: IMAGE_SIZE, Boxed: false, ViewAngle: VIEW_ANGLE, PlotRange: PLOT_RANGE });
  const parts = content.map((c) => flatten(c));
  const H = Td[dof - 1], HKinds = TdKinds[dof - 1];
  return {
    dof, joints, Ad, Td, AdKinds, TdKinds, H, HKinds, hStrings: hDisplay(H, HKinds),
    graphic, parts, prims: parts.flat(), box: PLOT_RANGE,
  };
}

// ---- the H display (F-AC-15) ------------------------------------------------------------------------------------
/** An exact entry closer to 0 than this is printed "0" (D-AC-05) */
export const EXACT_ZERO_TOL = 1e-12;
/**
 * The text of one entry of N[Chop[Td[dof]], 2]: a machine number keeps its machine format ("1.", "0.", "0.25",
 * "6.12323×10^-17"), an exact number gets two significant digits ("1.0", "0.098", "-0.71"), an exact zero is "0".
 */
export function entryString(v, kind) {
  if (kind === 'machine') return mmaNumberString(v, { isReal: true });
  if (kind === 'zero' || Math.abs(v) < EXACT_ZERO_TOL) return '0';
  return nDigits(v, 2);
}
/** The 4 × 4 strings of H in rows */
export const hDisplay = (H, K) => H.map((row, i) => row.map((v, j) => entryString(v, K[i][j])));

/** Frame origin (translation column) of a 4x4 transform */
export const origin = (T) => [T[0][3], T[1][3], T[2][3]];

// ---- framing (D-AC-01) -------------------------------------------------------------------------------------------
/**
 * The camera of the fixed framing: centre of the PlotRange (0, 0, 0), position centre + ViewPoint × 6 (the longest
 * side), vertical field of view 12° over the image height, aspect 420/350 (as shared/three-helpers.js viewerCamera).
 */
export function fixedCamera() {
  const longest = 6;
  return { target: [0, 0, 0], position: VIEWPOINT.map((v) => v * longest), fovDeg: 12, aspect: IMAGE_SIZE[0] / IMAGE_SIZE[1] };
}

/**
 * Projected width of the ground disc (both rims, 720 samples each) in points of the 420-pt-wide image for a
 * perspective camera {target, position, fovDeg (vertical), aspect} with z up (golden test of D-AC-01).
 */
export function groundWidthPt(cam) {
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const n = Math.hypot(...a); return a.map((x) => x / n); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = unit(sub(cam.target, cam.position));
  const right = unit(cross(f, [0, 0, 1]));
  const tx = Math.tan((cam.fovDeg * π) / 360) * cam.aspect; // horizontal half-angle tangent
  let lo = Infinity, hi = -Infinity;
  for (const z of [-2 / 5, -1 / 5 - 1 / 20]) {
    for (let k = 0; k < 720; k++) {
      const a = (2 * π * k) / 720;
      const v = sub([2.2 * Math.cos(a), 2.2 * Math.sin(a), z], cam.position);
      const x = dot(v, right) / (dot(v, f) * tx);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return ((hi - lo) / 2) * IMAGE_SIZE[0];
}

// ---- golden data ------------------------------------------------------------------------------------------------
/**
 * Load a stored state (tests/golden/arm-configurations.original-states.json: live state, initial settings or a
 * snapshot's Settings) as a port state. Numbers are plain JS numbers (an integer counts as exact) or lexical numbers
 * {text} (tools/lib/json-lexical.mjs); exact angles {wl: "k*Pi/m"}. The DHParameters table is matched against ROBOTS
 * by joint types and the numeric entries (the q entries are TextCells, N-AC-03); params keep their exactness.
 */
export function stateFromSettings(S) {
  const lex = (v) => v !== null && typeof v === 'object' && typeof v.text === 'string';
  const isNum = (v) => lex(v) || typeof v === 'number';
  const num = (v) => (lex(v) ? Number(v.text) : typeof v === 'number' ? v : v.n);
  const exactNum = (v) => (lex(v) ? !/[.eE]/.test(v.text) : Number.isInteger(v));
  const piN = (w) => {
    const m = String(w).replace(/\s/g, '').match(/^(-?)(\d*)\*?Pi(?:\/(\d+))?$/);
    if (!m) throw new Error(`angle ${w}`);
    return ((m[2] === '' ? 1 : Number(m[2])) * (m[1] ? -1 : 1) * ANGLE_DEN) / (m[3] ? Number(m[3]) : 1);
  };
  /** a stored table entry → {v, exact[, pi]} or {q: true} */
  const entry = (v) => {
    if (isNum(v)) return { v: num(v), exact: exactNum(v) };
    if (v && v.wl) return { v: num(v.n), exact: true, pi: piN(v.wl) };
    return { q: true };
  };
  const T = S.DHParameters;
  const types = T[0];
  const same = (a, b) => (a.q !== undefined || b.q !== undefined ? a.q !== undefined && b.q !== undefined
    : a.v === b.v && a.exact === b.exact);
  const robot = ROBOTS.findIndex((R) => R.jointtype.length === types.length && R.jointtype.every((j, i) => j === types[i])
    && ['a', 'alpha', 'd', 'theta'].every((key, r) => R[key].every((e, i) => same(e, entry(T[r + 1][i])))));
  if (robot < 0) throw new Error('stored DHParameters match no robot of the popup');
  const params = S.params.map((v, i) => {
    const n = num(v), ex = exactNum(v);
    if (!ex) return machine(n);
    if (n === 0) return exactInt(0);
    const prismatic = i < types.length && isPrismatic(types[i]);
    return prismatic ? fracValue(Math.round(n * PRIS.den)) : piValue(Math.round((n * ANGLE_DEN) / π));
  });
  return { robot, dof: num(S.dof), params, g: { v: num(S.g), exact: exactNum(S.g) }, showRobot: S.showRobot === true };
}
