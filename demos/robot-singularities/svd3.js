// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/svd3.js — SingularValueDecomposition of a 3x3 real matrix (one-sided Jacobi),
// MatrixRank, and the original's manipulability-ellipsoid graphic (manipEllip) as data. Pure: no DOM.
import { mGreater } from '../../shared/mma.js';
import {
  Graphics3D, GeometricTransformation, affine, Arrowheads, Arrow, UnitCircle, Ellipsoid, Opacity,
  Blue, Red, Green, DarkerGreen, LightBlue,
} from './g3d.js';

const col = (A, j) => [A[0][j], A[1][j], A[2][j]];
const norm3 = (v) => Math.hypot(v[0], v[1], v[2]);
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const fromCols = (c) => [0, 1, 2].map((i) => [c[0][i], c[1][i], c[2][i]]);
/**
 * Relative tolerance below which a singular value counts as zero (MatrixRank, completing U): max(dims) · eps =
 * 3 · 2^-52 ≈ 6.7e-16 times the largest singular value. Consistent with Mathematica 15.0.1 (extra-checks.wls,
 * owner run 2026-10-06): MatrixRank[DiagonalMatrix[{1, 1e-13, 0.5}]] = 3, MatrixRank[DiagonalMatrix[{1, 1e-17, 0.5}]] = 2
 * (Tolerance option of https://reference.wolfram.com/language/ref/MatrixRank.html). Rounding-level singular values of
 * the 32 Jacobians at singular slider positions stay below 1.5e-16 relative. The data only bound Mathematica's tolerance
 * between 1e-17 and 1e-13; 3 eps is the port's choice (K-RS-05, partly resolved).
 */
export const RANK_TOL_REL = 3 * 2 ** -52;
/** relative difference below which two non-zero singular values count as equal (ties, K-RS-04) */
const TIE_REL = 1e-12;
const dominantAxis = (u) => [0, 1, 2].reduce((m, i) => (Math.abs(u[i]) > Math.abs(u[m]) + 1e-12 ? i : m), 0);

/**
 * {U, S, V} with A = U . DiagonalMatrix[S] . Transpose[V]; S descending and >= 0; U, V orthogonal.
 * Like Mathematica's SingularValueDecomposition[A] for a machine 3x3 matrix, up to the signs of the singular vectors
 * (nothing drawn depends on them: arrows go both ways, rings and the ellipsoid are symmetric) — see K-RS-04.
 */
export function svd3(A) {
  const B = A.map((r) => r.slice());
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = false;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      let alpha = 0, beta = 0, gamma = 0;
      for (let i = 0; i < 3; i++) { alpha += B[i][p] * B[i][p]; beta += B[i][q] * B[i][q]; gamma += B[i][p] * B[i][q]; }
      if (gamma === 0 || Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta)) continue;
      rotated = true;
      const zeta = (beta - alpha) / (2 * gamma);
      const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
      const c = 1 / Math.sqrt(1 + t * t), s = c * t;
      for (let i = 0; i < 3; i++) {
        const bp = B[i][p], bq = B[i][q];
        B[i][p] = c * bp - s * bq; B[i][q] = s * bp + c * bq;
        const vp = V[i][p], vq = V[i][q];
        V[i][p] = c * vp - s * vq; V[i][q] = s * vp + c * vq;
      }
    }
    if (!rotated) break;
  }
  // singular values = column norms, in descending order. PORT DEVIATION (D-RS-09): for repeated non-zero singular
  // values the singular vectors are ordered by their dominant axis (x, y, z), which reproduces Mathematica's choice for
  // the CNC arm (extra-checks.wls: U = {{-1,0,0},{0,-1,0},{0,0,1}}, V = {{0,0,1},{-1,0,0},{0,-1,0}}) up to signs.
  const smax0 = Math.max(...[0, 1, 2].map((j) => norm3(col(B, j))));
  const ents = [0, 1, 2].map((j) => {
    const s = norm3(col(B, j));
    const u = s > 0 && s > RANK_TOL_REL * smax0 ? col(B, j).map((x) => x / s) : null;
    return { j, s, u };
  });
  const tie = (a, b) => a.u && b.u && Math.abs(a.s - b.s) <= TIE_REL * Math.max(a.s, b.s);
  const order = ents.sort((a, b) => (tie(a, b) ? dominantAxis(a.u) - dominantAxis(b.u) || a.j - b.j : b.s - a.s || a.j - b.j));
  const S = order.map((o) => o.s);
  const Vc = order.map((o) => col(V, o.j));
  const Uc = [];
  for (let k = 0; k < 3; k++) {
    if (order[k].u) { Uc.push(order[k].u); continue; }
    // complete the basis (null directions): orthonormal to the columns found so far
    if (Uc.length === 2) { Uc.push(cross3(Uc[0], Uc[1])); continue; }
    if (Uc.length === 1) {
      const u = Uc[0];
      const e = Math.abs(u[0]) <= Math.abs(u[1]) && Math.abs(u[0]) <= Math.abs(u[2]) ? [1, 0, 0] : Math.abs(u[1]) <= Math.abs(u[2]) ? [0, 1, 0] : [0, 0, 1];
      const w = cross3(u, e); const n = norm3(w);
      Uc.push(w.map((x) => x / n));
      continue;
    }
    Uc.push([[1, 0, 0], [0, 1, 0], [0, 0, 1]][k]); // all zero: identity
  }
  return { U: fromCols(Uc), S, V: fromCols(Vc) };
}

/** MatrixRank of DiagonalMatrix[S]: the singular values above RANK_TOL_REL times the largest (K-RS-05). */
export const matrixRank = (S) => S.filter((s) => s > 0 && s > RANK_TOL_REL * Math.max(...S)).length;

const diag = (a, b, c) => [[a, 0, 0], [0, b, 0], [0, 0, c]];
const mul3 = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const ROT_Y_HALF_PI = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]; // RotationMatrix[π/2, {0,1,0}] (exact)
const ROT_X_HALF_PI = [[1, 0, 0], [0, 0, -1], [0, 1, 0]]; // RotationMatrix[π/2, {1,0,0}] (exact)

/**
 * manipEllip for Jacobian J (numeric) at end point o3 (= o3coords[params]):
 *   {U, Σfull, V} = SingularValueDecomposition[N[J]]; Σfull = Σfull/2;
 *   Graphics3D[{GeometricTransformation[{Arrowheads[.02],
 *     If[Σ11 > 0.1, {Blue, Arrow[{o0, Σ[[1]]}], Arrow[{o0, -Σ[[1]]}], Blue, <circle> . DiagonalMatrix[{Σ11, Σ22, 1}]}],
 *     If[Σ22 > 0.1, {Red, ..., Red, <circle> . DiagonalMatrix[{1, Σ22, Σ33}].RotationMatrix[π/2, {0,1,0}]}],
 *     If[Σ33 > 0.1, {Green, ..., Darker[Green], <circle> . DiagonalMatrix[{Σ11, 1, Σ33}].RotationMatrix[π/2, {1,0,0}]}],
 *     If[MatrixRank[Σfull] > 2, {Opacity[0.5], LightBlue, Ellipsoid[{0,0,0}, Σfull^2]}]}, {U, o3}]}]
 * Returns {graphics, U, S, V, Sigma (halved diagonal), rank}.
 */
export function manipEllip(J, o3) {
  const { U, S, V } = svd3(J);
  const Sg = S.map((s) => s / 2);
  const o0 = [0, 0, 0];
  const row = (k) => [0, 1, 2].map((i) => (i === k ? Sg[k] : 0));
  const neg = (v) => v.map((x) => (x === 0 ? 0 : -x));
  const rank = matrixRank(Sg);
  const content = [
    Arrowheads(0.02),
    mGreater(Sg[0], 0.1) ? [Blue, Arrow([o0, row(0)]), Arrow([o0, neg(row(0))]),
      Blue, GeometricTransformation(UnitCircle(), affine(diag(Sg[0], Sg[1], 1)))] : null,
    mGreater(Sg[1], 0.1) ? [Red, Arrow([o0, row(1)]), Arrow([o0, neg(row(1))]),
      Red, GeometricTransformation(UnitCircle(), affine(mul3(diag(1, Sg[1], Sg[2]), ROT_Y_HALF_PI)))] : null,
    mGreater(Sg[2], 0.1) ? [Green, Arrow([o0, row(2)]), Arrow([o0, neg(row(2))]),
      DarkerGreen, GeometricTransformation(UnitCircle(), affine(mul3(diag(Sg[0], 1, Sg[2]), ROT_X_HALF_PI)))] : null,
    rank > 2 ? [Opacity(0.5), LightBlue, Ellipsoid([0, 0, 0], diag(Sg[0] ** 2, Sg[1] ** 2, Sg[2] ** 2))] : null,
  ];
  return { graphics: Graphics3D([GeometricTransformation(content, affine(U, o3))]), U, S, V, Sigma: Sg, rank };
}

export { dot3, cross3 };
