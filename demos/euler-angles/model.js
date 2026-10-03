// demos/euler-angles/model.js
//
// Port of the computation in "Euler Angles: Precession, Nutation, and Spin"
// (Kevin Hernandez, based on a program by Sándor Kabai; Wolfram Demonstrations Project).
// Pure functions (no DOM / three.js). Readable original: docs/original-source/euler-angles.txt
//
// The original nests three Rotate[] calls:
//   gimbal = Rotate[{middle ring, c3r, blue axle, blue frame}, a1°, {0,0,1}]   (precession about Z)
//   c3r    = Rotate[{inner ring, rotorr, red axle, red frame}, a2°, {0,1,0}]   (nutation about the gimbal's y)
//   rotorr = Rotate[{rotor, olive frame}, a3°, {0,0,1}]                         (spin about the inner ring's z)
// so the rotor's orientation is Rz(a1) . Ry(a2) . Rz(a3): a Z-Y-Z ("3-2-3") Euler sequence.

import { rotationMatrix, matMul, matVec } from '../../shared/linalg.js';

export const DEG = Math.PI / 180;

export const DEFAULTS = Object.freeze({ a1: 0, a2: 0, a3: 0 });

/** Slider specs: {{a1, 0, "precession angle"}, 0, 360, 1} etc. */
export const PARAMS = Object.freeze([
  { name: 'a1', label: 'precession angle', min: 0, max: 360, step: 1 },
  { name: 'a2', label: 'nutation angle', min: 0, max: 360, step: 1 },
  { name: 'a3', label: 'spin angle', min: 0, max: 360, step: 1 },
]);

/** Bookmarks of the original Manipulate (pos0 ... pos6). */
export const BOOKMARKS = Object.freeze([
  { name: 'pos0', a1: 0, a2: 0, a3: 0 },
  { name: 'pos1', a1: 45, a2: 0, a3: 0 },
  { name: 'pos2', a1: 45, a2: 30, a3: 0 },
  { name: 'pos3', a1: 45, a2: 30, a3: 15 },
  { name: 'pos4', a1: 0, a2: 30, a3: 15 },
  { name: 'pos5', a1: 0, a2: 0, a3: 15 },
  { name: 'pos6', a1: 0, a2: 0, a3: 0 },
]);

/**
 * World orientation of each nested body for angles in degrees.
 * gimbal: middle ring, blue axle, blue frame
 * inner:  inner ring, red axle, red frame
 * rotor:  rotor (disk + cube), olive frame
 */
export function orientations({ a1, a2, a3 }) {
  const Rg = rotationMatrix(a1 * DEG, [0, 0, 1]);
  const Ri = matMul(Rg, rotationMatrix(a2 * DEG, [0, 1, 0]));
  const Rr = matMul(Ri, rotationMatrix(a3 * DEG, [0, 0, 1]));
  return { gimbal: Rg, inner: Ri, rotor: Rr };
}

/** Direction of the rotor's spin axis (its local z) in world coordinates. */
export function spinAxis(angles) {
  return matVec(orientations(angles).rotor, [0, 0, 1]);
}

/**
 * Linear interpolation through the bookmark list (InterpolationOrder -> 1),
 * t in [0, 1] covering pos0 -> pos6. Used by "Animate bookmarks".
 */
export function bookmarkAt(t) {
  const segs = BOOKMARKS.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * segs;
  const i = Math.min(Math.floor(x), segs - 1);
  const f = x - i;
  const A = BOOKMARKS[i], B = BOOKMARKS[i + 1];
  const lerp = (u, v) => u + (v - u) * f;
  return { a1: lerp(A.a1, B.a1), a2: lerp(A.a2, B.a2), a3: lerp(A.a3, B.a3) };
}

// Scene constants from the original Initialization (units: Mathematica plot units).
export const GEOMETRY = Object.freeze({
  plotRange: 35,
  viewPoint: [0.35 * 6, 0.35 * 1, 0.35 * 2], // ViewPoint -> .35 {6, 1, 2}
  viewAngle: Math.PI / 8,
  axisLength: 25, // la
  labelDistance: 27, // lt
  rings: [
    { name: 'outer', R: 16, color: [1, 1, 0.4] }, // fixed
    { name: 'middle', R: 12, color: [0.6, 0.8, 1] }, // gimbal (precession)
    { name: 'inner', R: 8, color: [1, 0.6, 0.4] }, // after nutation
  ],
  tubeRadius: 1,
  rotor: { diskRadius: 5, diskHalfHeight: 1, cubeHalf: 3, color: [0.8, 1, 0.2] },
  axles: {
    yellow: { from: 10.7, to: 17.4, r: 0.5, axis: 'z', color: [1, 1, 0.4] },
    blue: { from: 6.7, to: 13.4, r: 0.5, axis: 'y', color: [0, 0, 1] },
    red: { from: 1, to: 9.4, r: 0.3, axis: 'z', color: [1, 0, 0] },
  },
  frames: {
    fixed: { color: [0, 0, 0], labels: ['X', 'Y', 'Z'] },
    gimbal: { color: [0, 0, 1], labels: ['x', 'y', 'z'] },
    inner: { color: [1, 0, 0], labels: ['x', 'y', 'z'] },
    rotor: { color: [0.4, 0.5, 0.1], labels: ['x', 'y', 'z'] },
  },
});
