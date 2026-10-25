// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/svd3.test.js — shared/svd3.js (3x3 SingularValueDecomposition, MatrixRank). Expected values come from
// independent checks (reconstruction, orthogonality, AᵀA invariants) or by hand.
import { describe, it, expect } from 'vitest';
import { svd3, matrixRank, RANK_TOL_REL } from '../../shared/svd3.js';

const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const close3 = (a, b, d = 12) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d));
const reconstruct = ({ U, S, V }) => U.map((r) => [0, 1, 2].map((j) => r.reduce((s, u, k) => s + u * S[k] * V[j][k], 0)));
const orthogonal = (Q) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(Q.reduce((s, r) => s + r[i] * r[j], 0)).toBeCloseTo(i === j ? 1 : 0, 12); };

describe('shared/svd3.js', () => {
  it('svd3 reconstructs A = U Σ Vᵀ with orthogonal U and V and descending singular values', () => {
    const mats = [[[1, 2, 3], [4, 5, 6], [7, 8, 10]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [[0.3, -2, 1e-3], [5, 0.2, -0.7], [1, 1, 1]]];
    for (const A of mats) {
      const d = svd3(A);
      const R = reconstruct(d);
      for (let i = 0; i < 3; i++) close3(R[i], A[i], 12);
      orthogonal(d.U); orthogonal(d.V);
      expect(d.S[0] >= d.S[1] && d.S[1] >= d.S[2] && d.S[2] >= 0).toBe(true);
    }
  });
  it('singular values: sum of squares = trace AᵀA, product = |det A|', () => {
    const A = [[0.3, -2, 1e-3], [5, 0.2, -0.7], [1, 1, 1]];
    const { S } = svd3(A);
    const tr = A.flat().reduce((s, x) => s + x * x, 0);
    expect(S.reduce((s, x) => s + x * x, 0)).toBeCloseTo(tr, 12);
    expect(S[0] * S[1] * S[2]).toBeCloseTo(Math.abs(det(A)), 12);
  });
  it('the all-ones matrix has singular values 3, 0, 0 (hand)', () => {
    const { S } = svd3([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
    expect(S[0]).toBeCloseTo(3, 14);
    expect(S[1]).toBeCloseTo(0, 14);
    expect(matrixRank(S)).toBe(1);
  });
  it('matrixRank uses the relative tolerance 3 eps of the largest singular value', () => {
    // REGRESSION PIN of the port's choice (K-RS-05): Mathematica's data only bound the tolerance between 1e-17 and 1e-13
    const eps = 2 ** -52;
    expect(RANK_TOL_REL).toBe(3 * eps);
    expect(matrixRank([1, 0.5, 2 * eps])).toBe(2);
    expect(matrixRank([1, 0.5, 4 * eps])).toBe(3);
    expect(matrixRank([1e-10, 0.5e-10, 1e-27])).toBe(2); // relative, not absolute
    expect(matrixRank([1e-10, 0.5e-10, 1e-20])).toBe(3);
    expect(matrixRank([0, 0, 0])).toBe(0);
  });
  it('svd3 orders repeated singular values by the dominant axis of their singular vectors', () => {
    const d = svd3([[0, 0, 2], [2, 0, 0], [0, 2, 0]]); // columns 2 e_y, 2 e_z, 2 e_x
    expect(d.S).toEqual([2, 2, 2]);
    expect(d.U.map((r) => r.map(Math.abs))).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  });
  it('zeroTol sets singular values at or below zeroTol·σ1 to exactly 0; the default keeps them', () => {
    const A = [[1, 0, 0], [0, 0.5, 0], [0, 0, 1e-15]];
    expect(svd3(A).S[2]).toBe(1e-15);
    expect(svd3(A, { zeroTol: 100 * 2 ** -53 }).S[2]).toBe(0);
    expect(svd3(A, { zeroTol: 1e-16 }).S[2]).toBe(1e-15);
  });
});
