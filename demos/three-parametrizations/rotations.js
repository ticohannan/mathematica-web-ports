// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/three-parametrizations/rotations.js
//
// Port of the Wolfram Language code in "Three Parametrizations of Rotations"
// (Aaron T. Becker and Benedict Isichei; Wolfram Demonstrations Project).
// Pure functions only (no DOM / three.js) so they can be unit tested in Node.
// Readable original source: docs/original-source/three-parametrizations.txt
//
// Matrices are row-major 3x3 arrays: R[i][j] is Mathematica's R[[i+1, j+1]].

import { arcTan, chop, roundTo, mUnequal } from '../../shared/mma.js';

export { matMul, matVec, transpose, rotationMatrix } from '../../shared/linalg.js';
import { matMul, rotationMatrix } from '../../shared/linalg.js';

const Z = [0, 0, 1], Y = [0, 1, 0], X = [1, 0, 0];

/** rotZYX[gamma, beta, alpha] := Rz(gamma).Ry(beta).Rx(alpha)  (roll-pitch-yaw about fixed axes) */
export const rotZYX = (gamma, beta, alpha) =>
  matMul(matMul(rotationMatrix(gamma, Z), rotationMatrix(beta, Y)), rotationMatrix(alpha, X));

/** rotZYZ[phi, theta, psi] := Rz(phi).Ry(theta).Rz(psi)  (Euler ZYZ, intrinsic) */
export const rotZYZ = (phi, theta, psi) =>
  matMul(matMul(rotationMatrix(phi, Z), rotationMatrix(theta, Y)), rotationMatrix(psi, Z));

/**
 * findRollPitchYaw[R] -> [alpha, beta, gamma], rounded to 0.001.
 * ORIGINAL QUIRK: in the degenerate branch (R32 == R33 == 0) beta is always
 * set to +pi/2, although -pi/2 is also possible (when R31 = +1). Also
 * Mathematica's ArcTan[0, 0] is Indeterminate; JS atan2(0, 0) is 0 (PORT DEVIATION).
 */
export function findRollPitchYaw(R) {
  let alpha, beta, gamma;
  if (mUnequal(R[2][1], 0) || mUnequal(R[2][2], 0)) {
    // PORT DEVIATION (guard): Math.max avoids sqrt of a tiny negative number
    // from round-off; Mathematica would return a complex number there.
    beta = arcTan(Math.sqrt(Math.max(0, 1 - R[2][0] ** 2)), -R[2][0]);
    alpha = arcTan(R[2][2], R[2][1]);
    gamma = arcTan(R[0][0], R[1][0]);
  } else {
    beta = Math.PI / 2;
    alpha = arcTan(R[2][2], R[2][1]);
    gamma = arcTan(R[0][0], R[1][0]);
  }
  return roundTo(chop([alpha, beta, gamma], 1e-6), 0.001);
}

/**
 * findZYZEuler[R] -> [phi, theta, psi], rounded to 0.001.
 * ORIGINAL QUIRK: the degenerate branch (R13 == R23 == 0) always returns
 * theta = 0, although theta = pi is also degenerate (R33 = -1).
 */
export function findZYZEuler(R) {
  let theta1, phi1, psi1;
  if (mUnequal(R[0][2], 0) || mUnequal(R[1][2], 0)) {
    theta1 = arcTan(R[2][2], Math.sqrt(Math.max(0, 1 - R[2][2] ** 2)));
    phi1 = arcTan(R[0][2], R[1][2]);
    psi1 = arcTan(-R[2][0], R[2][1]);
  } else {
    theta1 = 0;
    phi1 = arcTan(R[0][0], R[1][0]);
    psi1 = 0;
  }
  return roundTo(chop([phi1, theta1, psi1], 1e-6), 0.001);
}

/**
 * findAxisAngle[R] -> {theta, k}, both rounded to 0.001.
 * theta = ArcCos[(trace - 1)/2] is in [0, pi] (the original comment says
 * -pi..pi, but ArcCos never returns negative values).
 * PORT DEVIATION: the ArcCos argument is clamped to [-1, 1]. Mathematica
 * returns a (tiny) complex angle when round-off pushes it past 1, which its
 * Chop[..., 10^-7] then removes; the result is the same except that for
 * near-identity rotations the original may give k = {0,0,0} where the port gives {1,0,0}.
 */
export function findAxisAngle(R) {
  const tr = (R[0][0] + R[1][1] + R[2][2] - 1) / 2;
  const theta = Math.acos(Math.max(-1, Math.min(1, tr)));
  const s = Math.sin(theta);
  const k = mUnequal(s, 0)
    ? [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]].map((v) => v / (2 * s))
    : [1, 0, 0];
  const [t, kk] = [chop(theta, 1e-7), chop(k, 1e-7)];
  return { angle: roundTo(t, 0.001), k: roundTo(kk, 0.001) };
}

/** aizumuthAngleToVector[lat, long] (sic) -> unit vector. */
export function aizumuthAngleToVector(az, an) {
  return chop([Math.cos(az) * Math.cos(an), Math.cos(az) * Math.sin(an), Math.sin(az)], 1e-6);
}

/** vectorToAzimuthAngle[k] -> [long, lat], rounded to 0.001. */
export function vectorToAzimuthAngle(k) {
  const asin = (v) => Math.asin(Math.max(-1, Math.min(1, v)));
  const v = k[0] === 0 && k[1] === 0 ? [0, asin(k[2])] : [arcTan(k[0], k[1]), asin(k[2])];
  return roundTo(chop(v, 1e-6), 0.001);
}

/** Initial control values of the original Manipulate. */
export const DEFAULTS = Object.freeze({
  progress: 1,
  typeRot: 1, // 1 = Euler ZYZ, 2 = axis/angle, 3 = roll-pitch-yaw
  phi: 0, theta: 0, psi: 0,
  axis: [0, 0], // [longitude, latitude]
  angle: 0,
  alpha: 0, beta: 0, gamma: 0,
});

/**
 * One evaluation of the Manipulate body. Takes the control values and returns
 * the new control values (the original writes the converted parameters back
 * into the disabled sliders) plus R, Rprog and the purple axis vector k.
 */
export function evaluate(state) {
  const st = { ...state, axis: [...state.axis] };
  const p = st.progress;
  let R, k, Rprog;
  if (st.typeRot === 1) {
    R = rotZYZ(st.phi, st.theta, st.psi);
    ({ angle: st.angle, k } = findAxisAngle(R));
    st.axis = vectorToAzimuthAngle(k);
    [st.alpha, st.beta, st.gamma] = findRollPitchYaw(R);
    Rprog = p > 2 / 3 ? rotZYZ(st.phi, st.theta, 3 * (p - 2 / 3) * st.psi)
      : p > 1 / 3 ? rotZYZ(st.phi, 3 * (p - 1 / 3) * st.theta, 0)
        : rotZYZ(3 * p * st.phi, 0, 0);
  } else if (st.typeRot === 2) {
    k = aizumuthAngleToVector(st.axis[1], st.axis[0]);
    R = rotationMatrix(st.angle, k);
    [st.phi, st.theta, st.psi] = findZYZEuler(R);
    [st.alpha, st.beta, st.gamma] = findRollPitchYaw(R);
    Rprog = rotationMatrix(p * st.angle, k);
  } else {
    R = rotZYX(st.gamma, st.beta, st.alpha);
    ({ angle: st.angle, k } = findAxisAngle(R));
    st.axis = vectorToAzimuthAngle(k);
    [st.phi, st.theta, st.psi] = findZYZEuler(R);
    Rprog = p > 2 / 3 ? rotZYX(3 * (p - 2 / 3) * st.gamma, st.beta, st.alpha)
      : p > 1 / 3 ? rotZYX(0, 3 * (p - 1 / 3) * st.beta, st.alpha)
        : rotZYX(0, 0, 3 * p * st.alpha);
  }
  return { state: st, R, Rprog, k };
}
