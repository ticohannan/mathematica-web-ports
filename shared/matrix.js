// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/matrix.js — dense real matrices as arrays of rows (v0.1.37): what the control ports need beyond
// shared/linalg.js.
//
//   matMul(A, B), matAdd(A, B), matScale(A, k), matVec(A, v), IdentityMatrix(n), norm1(A)
//   LinearSolve(A, B)       A X = B (B a matrix or a vector) by LU with partial pivoting (vendored ml-matrix, MIT)
//   MatrixExp(A)            e^A, the scaling-and-squaring algorithm with Padé approximants of degree 3, 5, 7, 9 or 13
//                           of N. J. Higham, "The scaling and squaring method for the matrix exponential revisited",
//                           SIAM J. Matrix Anal. Appl. 26 (2005) 1179–1193 (Algorithm 2.3; the coefficients b_j and the
//                           bounds θ_m are those of the paper's Table 2.3 and of its implementations in MATLAB's expm
//                           and SciPy's scipy.linalg.expm). Relative accuracy about the unit roundoff for the small
//                           matrices of the ports.
//   Eigenvalues(A)          the eigenvalues as complex numbers { re, im } (ml-matrix, JAMA's hqr2)

import { Matrix, LuDecomposition, EigenvalueDecomposition } from '../vendor/ml-matrix/index.js';
import { Complex } from './complex.js';

export const IdentityMatrix = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export function matMul(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  const C = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    const Ai = A[i], Ci = C[i];
    for (let l = 0; l < k; l++) { const a = Ai[l]; if (a === 0) continue; const Bl = B[l]; for (let j = 0; j < m; j++) Ci[j] += a * Bl[j]; }
  }
  return C;
}
export const matAdd = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
export const matScale = (A, k) => A.map((r) => r.map((x) => x * k));
export const matVec = (A, v) => A.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
export const norm1 = (A) => Math.max(...A[0].map((_, j) => A.reduce((s, r) => s + Math.abs(r[j]), 0)));

export function LinearSolve(A, B) {
  const vec = !Array.isArray(B[0]);
  const lu = new LuDecomposition(new Matrix(A));
  const X = lu.solve(new Matrix(vec ? B.map((x) => [x]) : B)).to2DArray();
  return vec ? X.map((r) => r[0]) : X;
}

export function Eigenvalues(A) {
  const e = new EigenvalueDecomposition(new Matrix(A));
  return e.realEigenvalues.map((r, i) => Complex(r, e.imaginaryEigenvalues[i]));
}

// Higham (2005), Table 2.3: θ_m and the Padé coefficients b_0 … b_m
const THETA = { 3: 1.495585217958292e-2, 5: 2.539398330063230e-1, 7: 9.504178996162932e-1, 9: 2.097847961257068e0, 13: 5.371920351148152e0 };
const B = {
  3: [120, 60, 12, 1],
  5: [30240, 15120, 3360, 420, 30, 1],
  7: [17297280, 8648640, 1995840, 277200, 25200, 1512, 56, 1],
  9: [17643225600, 8821612800, 2075673600, 302702400, 30270240, 2162160, 110880, 3960, 90, 1],
  13: [64764752532480000, 32382376266240000, 7771770303897600, 1187353796428800, 129060195264000, 10559470521600,
    670442572800, 33522128640, 1323241920, 40840800, 960960, 16380, 182, 1],
};
const lin = (terms, n) => { // Σ k_i M_i
  let S = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const [k, M] of terms) if (k !== 0) S = matAdd(S, matScale(M, k));
  return S;
};
function pade(A, m) {
  const n = A.length, b = B[m], Id = IdentityMatrix(n);
  let U, V;
  if (m < 13) {
    const P = [Id, matMul(A, A)]; // even powers A^0, A^2, A^4, …
    for (let j = 2; 2 * j <= m; j++) P.push(matMul(P[j - 1], P[1]));
    U = matMul(A, lin(P.map((M, j) => [b[2 * j + 1], M]), n));
    V = lin(P.map((M, j) => [b[2 * j], M]), n);
  } else {
    const A2 = matMul(A, A), A4 = matMul(A2, A2), A6 = matMul(A4, A2);
    U = matMul(A, matAdd(matMul(A6, lin([[b[13], A6], [b[11], A4], [b[9], A2]], n)), lin([[b[7], A6], [b[5], A4], [b[3], A2], [b[1], Id]], n)));
    V = matAdd(matMul(A6, lin([[b[12], A6], [b[10], A4], [b[8], A2]], n)), lin([[b[6], A6], [b[4], A4], [b[2], A2], [b[0], Id]], n));
  }
  return LinearSolve(matAdd(matScale(U, -1), V), matAdd(U, V)); // (−U + V) X = U + V
}

/** e^A (Higham 2005, Algorithm 2.3). */
export function MatrixExp(A) {
  const n = A.length;
  if (n === 0) return [];
  const nrm = norm1(A);
  for (const m of [3, 5, 7, 9]) if (nrm <= THETA[m]) return pade(A, m);
  const s = Math.max(0, Math.ceil(Math.log2(nrm / THETA[13])));
  let X = pade(matScale(A, 2 ** -s), 13);
  for (let i = 0; i < s; i++) X = matMul(X, X);
  return X;
}
