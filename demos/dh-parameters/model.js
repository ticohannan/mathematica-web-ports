// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dh-parameters/model.js — one evaluation of the Manipulate body of "Denavit-Hartenberg Parameters for a
// Three-Link Robot" (pure: no DOM, no three.js): the Manipulate variables and their initial values, T1, T2, T3
// (DHTransform with the exact angles nπ/32), the Graphics3D content in the original's order, and its plot range.
// Names and order of operations follow the original (docs/original-source/dh-parameters.txt).
import { dhTransform, mul4, mul4Fma } from '../common/dh-chain.js';
import { drawJoint, drawGripper, GROUND } from '../common/robot-draw.js';
import { Graphics3D, GeometricTransformation, flatten, primitiveBounds } from '../common/g3d.js';

const π = Math.PI;
/** θ and α are exact multiples of π/32: the integer n stands for nπ/32 (sliders {-π, π, π/32}) */
export const ANGLE_DEN = 32;
export const N_MIN = -32, N_MAX = 32;
export const angleOf = (n) => (n * π) / ANGLE_DEN;

/**
 * The Manipulate variables: j = [j1, j2, j3] ("Revolute" | "Prismatic"), theta = [n1, n2, n3] and alpha (integers n,
 * value nπ/32, always exact), d = [d1, d2, d3], r = [r1, r2, r3], g (numbers), and exact = {d: [..], r: [..], g} — whether
 * the value is still the exact default (shown "1", "0") or a machine number after a move ("1.", "0.") (Q-DH-05).
 */
export function initialState() {
  return {
    j: ['Revolute', 'Revolute', 'Revolute'],
    theta: [5, 8, -12],
    d: [1, 0, 0],
    r: [0, 1, 1],
    alpha: [16, 0, 0],
    g: 1,
    exact: { d: [true, true, true], r: [true, true, true], g: true },
  };
}

export const cloneState = (s) => ({
  j: s.j.slice(), theta: s.theta.slice(), d: s.d.slice(), r: s.r.slice(), alpha: s.alpha.slice(), g: s.g,
  exact: { d: s.exact.d.slice(), r: s.exact.r.slice(), g: s.exact.g },
});

/**
 * DHTransform[d, r, Theta, Alpha] for joint i: Theta = nπ/32 and Alpha = mπ/32 exact (explicit exact-angle path of
 * demos/common/dh-chain.js, so Cos[π/2] is exactly 0, F-DH-09).
 */
export const jointT = (st, i) => dhTransform(st.d[i], st.r[i], angleOf(st.theta[i]), angleOf(st.alpha[i]),
  { exact: { theta: st.theta[i], alpha: st.alpha[i], den: ANGLE_DEN } });

/**
 * One evaluation of the body:
 *   Module[{jr = 1/10, ar = 1/40, T1 = DHTransform[d1,r1,Theta1,Alpha1], T2 = …, T3 = …},
 *     Graphics3D[{{LightBrown, Cylinder[{{0,0,-2/5},{0,0,-1/5-1/20}}, 2.2]}, DrawJoint[j1,d1,r1,Theta1],
 *       GeometricTransformation[DrawJoint[j2,d2,r2,Theta2], T1], GeometricTransformation[DrawJoint[j3,d3,r3,Theta3], T1.T2],
 *       GeometricTransformation[DrawGripper[g,r3], T1.T2.T3]}, SphericalRegion->True, ImageSize->425, Boxed->False]]
 * (jr, ar unused, N-DH-04). Returns {T1, T2, T3, T12, T123, graphic, parts (flattened primitives of the ground, joints
 * 1-3 and the gripper), prims (all, in order), box}: box = the bounds of all primitives
 * (automatic PlotRange, D-DH-01).
 */
/**
 * Whether DHTransform of joint i holds a machine matrix: a TransformationFunction with one machine entry is all machine
 * (arm-configurations K-AC-09); the angles are always exact, so it is machine exactly when d_i or r_i is (a moved
 * slider, Q-DH-05).
 */
export const isMachineT = (st, i) => !st.exact.d[i] || !st.exact.r[i];
/**
 * T . U as Mathematica 15.0.1 composes TransformationFunctions: with a machine factor the fused machine Dot
 * (mul4Fma; harness H-DH-02, H-DH-04, H-DH-05: T1.T2.T3 bit for bit); two exact factors multiply exactly in the
 * original, in doubles here (mul4).
 */
const compose = (T, tm, U, um) => ((tm || um) ? mul4Fma(T, U) : mul4(T, U));

export function evaluate(st) {
  const T1 = jointT(st, 0), T2 = jointT(st, 1), T3 = jointT(st, 2);
  const m = [0, 1, 2].map((i) => isMachineT(st, i));
  const T12 = compose(T1, m[0], T2, m[1]);
  const T123 = compose(T12, m[0] || m[1], T3, m[2]);
  const θ = st.theta.map(angleOf);
  // an exact d (the default 1 or 0, a typed whole number) enters -1+d-jr-.01 as an exact integer (K-DH-06)
  const opt = (i) => ({ variant: 'dh', dExact: st.exact.d[i] && Number.isInteger(st.d[i]) ? [st.d[i], 1] : null });
  const content = [
    GROUND(),
    drawJoint(st.j[0], st.d[0], st.r[0], θ[0], opt(0)),
    GeometricTransformation(drawJoint(st.j[1], st.d[1], st.r[1], θ[1], opt(1)), T1),
    GeometricTransformation(drawJoint(st.j[2], st.d[2], st.r[2], θ[2], opt(2)), T12),
    GeometricTransformation(drawGripper(st.g, st.r[2]), T123),
  ];
  const graphic = Graphics3D(content, { SphericalRegion: true, ImageSize: 425, Boxed: false });
  // each element of the content list is its own scope, so flattening part by part gives flatten(graphic) in order
  const parts = content.map((c) => flatten(c));
  const prims = parts.flat();
  return { T1, T2, T3, T12, T123, graphic, parts, prims, box: primitiveBounds(prims) };
}

/** Frame origin (translation column) of a 4x4 transform */
export const origin = (T) => [T[0][3], T[1][3], T[2][3]];

// ---- framing (D-DH-01) ----------------------------------------------------------------------------------------
/** Mathematica's default ViewPoint */
export const VIEWPOINT = [1.3, -2.4, 2];
/**
 * Zoom of the SphericalRegion fit (demos/common/g3d-three.js fitViewer: the bounding sphere × 1.04 fills the image,
 * zoom > 1 draws larger), fitted to the ground-disc widths of all five snapshots (347.5, 370.5, 349.5, 402.5,
 * 345.5 of 425 pt): every snapshot within 3 % (D-DH-01, T-DH-22). Calibrating on snapshot 1 alone (zoom 1.37) would
 * leave snapshot 4 (the flat planar arm) 5.1 % too small: Mathematica's rule differs from this fit (K-DH-03).
 */
export const DH_ZOOM = 1.4;

/**
 * The camera fitViewer sets for `box` when the viewing direction is the default ViewPoint (pure copy of its
 * arithmetic for tests): {target, position, fovDeg}.
 */
export function fitCamera(box, { zoom = DH_ZOOM, viewPoint = VIEWPOINT } = {}) {
  const c = box.map(([a, b]) => (a + b) / 2);
  const longest = Math.max(...box.map(([a, b]) => b - a));
  const radius = 0.5 * Math.hypot(...box.map(([a, b]) => b - a));
  const vpLen = Math.hypot(...viewPoint);
  const dist = vpLen * longest;
  const dir = viewPoint.map((v) => v / vpLen);
  const half = Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist)) * 1.04) / zoom);
  return { target: c, position: c.map((x, i) => x + dir[i] * dist), fovDeg: (2 * half * 180) / π };
}

/**
 * Projected width of the ground disc (both rims, 360 samples each) as a fraction of the image width for a square
 * perspective camera {target, position, fovDeg} with z up (golden test T-DH-22).
 */
export function groundWidthFraction(cam) {
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const n = Math.hypot(...a); return a.map((x) => x / n); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = unit(sub(cam.target, cam.position));
  const right = unit(cross(f, [0, 0, 1]));
  const t = Math.tan((cam.fovDeg * π) / 360);
  let lo = Infinity, hi = -Infinity;
  for (const z of [-2 / 5, -1 / 5 - 1 / 20]) {
    for (let k = 0; k < 360; k++) {
      const a = (2 * π * k) / 360;
      const v = sub([2.2 * Math.cos(a), 2.2 * Math.sin(a), z], cam.position);
      const x = dot(v, right) / (dot(v, f) * t); // NDC x in [-1, 1]
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return (hi - lo) / 2;
}

/**
 * Load a snapshot's Settings (tests/golden/dh-parameters.original-states.json) as a port state. Numbers may be plain
 * JS numbers (an integer counts as exact) or lexical numbers {text} (tools/lib/json-lexical.mjs: "1.0" is a machine
 * real, "1" an exact integer); exact angles are {wl: "k*Pi/m", n} objects or the exact integer 0.
 */
export function stateFromSettings(S) {
  const lex = (v) => v !== null && typeof v === 'object' && typeof v.text === 'string';
  const num = (v) => (lex(v) ? Number(v.text) : typeof v === 'number' ? v : v.n);
  const exactNum = (v) => (lex(v) ? !/[.eE]/.test(v.text) : typeof v === 'number' && Number.isInteger(v));
  const angleN = (v) => {
    if (lex(v) || typeof v === 'number') {
      if (num(v) !== 0 || !exactNum(v)) throw new Error(`angle ${num(v)} is not an exact multiple of π`);
      return 0;
    }
    const m = v.wl.replace(/\s/g, '').match(/^(-?)(\d*)\*?Pi(?:\/(\d+))?$/);
    if (!m) throw new Error(`angle ${v.wl}`);
    const n = (m[2] === '' ? 1 : Number(m[2])) * (m[1] ? -1 : 1), den = m[3] ? Number(m[3]) : 1;
    return (n * ANGLE_DEN) / den;
  };
  return {
    j: [S.j1, S.j2, S.j3],
    theta: [S['θ1'], S['θ2'], S['θ3']].map(angleN),
    d: [S.d1, S.d2, S.d3].map(num),
    r: [S.r1, S.r2, S.r3].map(num),
    alpha: [S['α1'], S['α2'], S['α3']].map(angleN),
    g: num(S.g),
    exact: { d: [S.d1, S.d2, S.d3].map(exactNum), r: [S.r1, S.r2, S.r3].map(exactNum), g: exactNum(S.g) },
  };
}
