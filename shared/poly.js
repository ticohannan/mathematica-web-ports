// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/poly.js — polynomials and rational functions in one variable (v0.1.37), for the control ports.
//
// A polynomial is the list of its coefficients from the constant term up, as Mathematica's CoefficientList[p, s]:
// [a0, a1, …, an] is a0 + a1 s + … + an s^n. Real coefficients; evaluation also at complex s.
//
//   polyAdd(p, q), polySub(p, q), polyMul(p, q), polyScale(p, k), polyTrim(p)     arithmetic (Expand)
//   polyEval(p, x)             p at a real x (Horner)            polyEvalC(p, z)  p at a complex z
//   polyDeriv(p)               D[p, s]                           polyDegree(p)    Exponent[p, s] (−∞ → −1)
//   polyFromRoots(roots, k)    k ∏ (s − r) for real or complex-conjugate roots (real coefficients)
//   Roots(p)                   the roots as complex numbers { re, im }: NSolve[p == 0, s] for machine numbers.
//
// Roots: the eigenvalues of the companion matrix — the method of numpy.roots and MATLAB's roots — computed with the
// JAMA eigenvalue algorithm (Hessenberg reduction and shifted QR, from EISPACK hqr2) of the vendored ml-matrix
// (vendor/ml-matrix, MIT). Leading zero coefficients are dropped; zero roots are split off exactly first (a0 = 0).
// The order of the returned roots is the eigensolver's; callers sort them as their original shows them.

import { EigenvalueDecomposition } from '../vendor/ml-matrix/index.js';
import { Complex, cadd, cmul } from './complex.js';

/** Drop zero coefficients of the highest powers (the zero polynomial stays [0]). */
export function polyTrim(p) {
  let n = p.length;
  while (n > 1 && p[n - 1] === 0) n--;
  return p.slice(0, n);
}
export const polyDegree = (p) => { const q = polyTrim(p); return q.length === 1 && q[0] === 0 ? -1 : q.length - 1; };
export function polyAdd(p, q) {
  const n = Math.max(p.length, q.length);
  return polyTrim(Array.from({ length: n }, (_, i) => (p[i] ?? 0) + (q[i] ?? 0)));
}
export const polyScale = (p, k) => polyTrim(p.map((a) => a * k));
export const polySub = (p, q) => polyAdd(p, polyScale(q, -1));
export function polyMul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; }));
  return polyTrim(r);
}
export function polyEval(p, x) {
  let v = 0;
  for (let i = p.length - 1; i >= 0; i--) v = v * x + p[i];
  return v;
}
export function polyEvalC(p, z) {
  let v = Complex(0, 0);
  for (let i = p.length - 1; i >= 0; i--) v = cadd(cmul(v, z), p[i]);
  return v;
}
export const polyDeriv = (p) => (p.length <= 1 ? [0] : polyTrim(p.slice(1).map((a, i) => a * (i + 1))));

/** k ∏(s − r): a complex root must come with its conjugate (the imaginary parts then cancel). */
export function polyFromRoots(roots, k = 1) {
  let re = [1], im = [0];
  for (const r of roots) {
    const a = typeof r === 'number' ? r : r.re, b = typeof r === 'number' ? 0 : r.im;
    // (re + i im)(s − a − i b)
    const nre = new Array(re.length + 1).fill(0), nim = new Array(re.length + 1).fill(0);
    for (let i = 0; i < re.length; i++) {
      nre[i + 1] += re[i]; nim[i + 1] += im[i];
      nre[i] += -a * re[i] + b * im[i]; nim[i] += -a * im[i] - b * re[i];
    }
    re = nre; im = nim;
  }
  return polyTrim(re.map((c) => c * k));
}

/** The roots of p (complex numbers), as NSolve[p == 0, s]; [] for a constant. */
export function Roots(p) {
  let q = polyTrim(p);
  const zeros = [];
  while (q.length > 1 && q[0] === 0) { zeros.push(Complex(0, 0)); q = q.slice(1); }
  const n = q.length - 1;
  if (n < 1) return zeros;
  if (n === 1) return [...zeros, Complex(-q[0] / q[1], 0)];
  const an = q[n];
  // companion matrix (numpy.roots' layout): first row −a_{n−1}/a_n … −a_0/a_n, ones below the diagonal
  const C = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === 0 ? -q[n - 1 - j] / an : (j === i - 1 ? 1 : 0))));
  const e = new EigenvalueDecomposition(C);
  const re = e.realEigenvalues, im = e.imaginaryEigenvalues;
  return [...zeros, ...re.map((r, i) => Complex(r, im[i]))];
}
