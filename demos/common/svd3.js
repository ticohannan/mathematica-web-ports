// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations "Robot Singularities in Three-Link Manipulators" by Aaron T. Becker and Yitong Lu and "Denavit-Hartenberg Parameters for a Three-Link Robot" by Aaron T. Becker and Mary Burbage
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/svd3.js — robot-singularities' manipulability-ellipsoid graphic (manipEllip) as data; re-exports the
// generic 3x3 SingularValueDecomposition / MatrixRank of shared/svd3.js (MIT since v0.1.21, owner decision D1). Pure: no DOM.
// Moved unchanged from demos/robot-singularities/svd3.js (v0.1.16, DH-family move; robot-singularities keeps a
// re-export shim there). manipEllip passes its option `zeroTol` (COMMON-DECISIONS §5) to
// svd3 (shared/svd3.js, where it is described); the default 0 keeps robot-singularities' results bit for bit. manipEllip's halving is the option `scale` (default 1/2, as robot-singularities).
import { mGreater } from '../../shared/mma.js';
import { svd3, matrixRank } from '../../shared/svd3.js';
import {
  Graphics3D, GeometricTransformation, affine, Arrowheads, Arrow, UnitCircle, Ellipsoid, Opacity,
  Blue, Red, Green, DarkerGreen, LightBlue,
} from '../../shared/graphics3d.js';

export * from '../../shared/svd3.js';

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
 * opts: scale (default 1/2: robot-singularities' Σfull/2; 1 = no halving), zeroTol (passed to svd3, default 0).
 */
export function manipEllip(J, o3, { scale = 1 / 2, zeroTol = 0 } = {}) {
  const { U, S, V } = svd3(J, { zeroTol });
  const Sg = S.map((s) => s * scale); // s * (1/2) === s / 2 exactly (power of two)
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

