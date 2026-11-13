// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/truss.test.js — shared/truss.js: the equilibrium matrix, its rank, the determinacy test and the joint solver,
// against trusses solved by hand.
import { describe, it, expect } from 'vitest';
import { equilibriumMatrix, rank, determinacy, trussSolve } from '../../shared/truss.js';

const PIN = [[1, 0], [0, 1]], ROLL = [[0, 1]];
// a 3-4-5 triangle: A(0,0) pinned, B(4,0) roller, C(4,3) loaded with 10 down
const tri = { joints: [[0, 0], [4, 0], [4, 3]], members: [[0, 1], [1, 2], [0, 2]], supports: [{ joint: 0, dirs: PIN }, { joint: 1, dirs: ROLL }] };

describe('shared/truss.js', () => {
  it('the equilibrium matrix: a member pulls both its joints towards each other; reactions in their directions', () => {
    const A = equilibriumMatrix(tri);
    expect(A).toHaveLength(6); expect(A[0]).toHaveLength(6);
    expect(A[0].slice(0, 3)).toEqual([1, 0, 0.8]); expect(A[1].slice(0, 3)).toEqual([0, 0, 0.6]);
    expect(A[2][0]).toBe(-1); expect(A[3][1]).toBe(1);
    expect(A[0].slice(3)).toEqual([1, 0, 0]); expect(A[3].slice(3)).toEqual([0, 0, 1]);
  });
  it('rank: full, deficient, and with a tolerance', () => {
    expect(rank([[1, 2], [2, 4]])).toBe(1);
    expect(rank([[1, 0], [0, 1], [1, 1]])).toBe(2);
    expect(rank([[1, 0], [0, 1e-14]])).toBe(1);
  });
  it('determinacy: determinate, indeterminate, and the two kinds of mechanism', () => {
    expect(determinacy(tri)).toMatchObject({ unknowns: 6, equations: 6, difference: 0, rank: 6, status: 'determinate' });
    expect(determinacy({ ...tri, supports: [{ joint: 0, dirs: PIN }, { joint: 1, dirs: PIN }] })).toMatchObject({ difference: 1, status: 'indeterminate' });
    expect(determinacy({ ...tri, supports: [{ joint: 0, dirs: ROLL }, { joint: 1, dirs: ROLL }] })).toMatchObject({ difference: -1, status: 'mechanism' });
    // three parallel reactions: m + r = 2 j but the truss slides sideways
    expect(determinacy({ ...tri, supports: [{ joint: 0, dirs: ROLL }, { joint: 1, dirs: ROLL }, { joint: 2, dirs: [[0, 1]] }] })).toMatchObject({ difference: 0, status: 'mechanism' });
  });
  it('trussSolve: the 3-4-5 triangle by hand (tension > 0)', () => {
    const r = trussSolve({ ...tri, loads: [{ joint: 2, f: [0, -10] }] });
    // joint C: AC pulls C towards A (−0.8, −0.6) N_AC; BC pulls C down (0, −1) N_BC; Σx: −0.8 N_AC = 0 → N_AC = 0; Σy: −N_BC − 10 = 0
    expect(r.forces[2]).toBeCloseTo(0, 12); expect(r.forces[1]).toBeCloseTo(-10, 12); expect(r.forces[0]).toBeCloseTo(0, 12);
    expect(r.reactions.map((x) => +x.value.toFixed(12))).toEqual([0, 0, 10]);
    expect(r.residual).toBeLessThan(1e-12);
    // 5 to the right at C: Σx at C: −0.8 N_AC + 5 = 0 → N_AC = 6.25 (tension); Σy: −0.6 N_AC − N_BC = 0 → N_BC = −3.75
    const s = trussSolve({ ...tri, loads: [{ joint: 2, f: [5, 0] }] });
    expect(s.forces[2]).toBeCloseTo(6.25, 12); expect(s.forces[1]).toBeCloseTo(-3.75, 12);
    expect(s.residual).toBeLessThan(1e-12);
  });
  it('trussSolve refuses a mechanism', () => {
    expect(() => trussSolve({ ...tri, supports: [{ joint: 0, dirs: ROLL }, { joint: 1, dirs: ROLL }, { joint: 2, dirs: [[0, 1]] }], loads: [] })).toThrow();
  });
});
