// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/svd3.js — SingularValueDecomposition of a 3x3 real matrix (one-sided Jacobi), MatrixRank with its
// tolerance, dot3 / cross3. Pure: no DOM.
// Generic: moved to shared/ under MIT in v0.1.21 (owner decision D1) from demos/common/svd3.js (first written for
// robot-singularities), unchanged; the manipulability-ellipsoid graphic manipEllip (a transcription of the original)
// stays in demos/common/svd3.js. Option `zeroTol` (COMMON-DECISIONS §5): singular values <= zeroTol·σ1 become exactly 0
// (Mathematica's SingularValueDecomposition zeroes values <= 100·10^-p·σ1, i.e. zeroTol = 100 * 2 ** -53 ≈ 1.11e-14 at
// machine precision); the default 0 keeps the plain Jacobi results.
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
 * opts.zeroTol: singular values <= zeroTol·σ1 are set to exactly 0 (their U columns completed as null directions).
 * Like Mathematica's SingularValueDecomposition[A] for a machine 3x3 matrix, up to the signs of the singular vectors
 * (nothing drawn depends on them: arrows go both ways, rings and the ellipsoid are symmetric) — see K-RS-04.
 */
export function svd3(A, { zeroTol = 0 } = {}) {
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
    let s = norm3(col(B, j));
    if (zeroTol > 0 && s <= zeroTol * smax0) s = 0; // COMMON-DECISIONS §5 (default 0: never)
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

export { dot3, cross3 };
