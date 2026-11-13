// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/truss.js — plane pin-jointed trusses (v0.1.40): the method of joints as one linear system, and the static
// determinacy of a truss with its supports. Used by the truss ports (their own equations are the originals'; this solver
// checks them independently) and by the solvability port's corrected mode.
//
//   trussSolve({ joints, members, supports, loads })
//       joints:   [[x, y], …]
//       members:  [[i, j], …]                       joint indices
//       supports: [{ joint, dirs: [[ux, uy], …] }]  one unknown reaction per direction (a pin: [[1, 0], [0, 1]], a
//                                                    roller: the normal of its rolling surface)
//       loads:    [{ joint, f: [fx, fy] }]
//     → { forces: [N per member, tension > 0], reactions: [{ joint, dir, value }], residual }
//     Equilibrium of every joint (2 equations each); unknowns: the member forces and the reaction components. Square
//     systems are solved with LU (shared/matrix.js); a non-square or singular system throws (see determinacy).
//   determinacy({ joints, members, supports })
//     → { unknowns: m + r, equations: 2 j, difference, rank, status }
//     status: 'determinate' (m + r = 2 j and the equilibrium matrix has full rank), 'indeterminate' (m + r > 2 j: more
//     unknowns than equations; the excess is the degree of indeterminacy when the rank is full), 'mechanism' (the rank
//     is below 2 j: some load cannot be resisted — always so when m + r < 2 j, and also for a badly arranged truss with
//     m + r = 2 j, e.g. three parallel reactions).
// Pure; the rank is computed with partial pivoting and a relative tolerance of 1e-10.
import { LinearSolve } from './matrix.js';

/** the equilibrium matrix: rows Σ_x, Σ_y per joint; columns the members (unit vectors from the joint) then the reactions */
export function equilibriumMatrix({ joints, members, supports = [] }) {
  const n = joints.length;
  const cols = members.length + supports.reduce((a, s) => a + s.dirs.length, 0);
  const A = Array.from({ length: 2 * n }, () => new Array(cols).fill(0));
  members.forEach(([i, j], k) => {
    const [xi, yi] = joints[i], [xj, yj] = joints[j];
    const L = Math.hypot(xj - xi, yj - yi);
    if (!(L > 0)) throw new RangeError(`truss: member ${k} has zero length`);
    const ux = (xj - xi) / L, uy = (yj - yi) / L;
    // a tension N pulls joint i towards j and joint j towards i
    A[2 * i][k] += ux; A[2 * i + 1][k] += uy;
    A[2 * j][k] -= ux; A[2 * j + 1][k] -= uy;
  });
  let c = members.length;
  for (const s of supports) for (const [dx, dy] of s.dirs) { const L = Math.hypot(dx, dy); A[2 * s.joint][c] += dx / L; A[2 * s.joint + 1][c] += dy / L; c++; }
  return A;
}

/** numerical rank (Gaussian elimination with partial pivoting) */
export function rank(M, tol = 1e-10) {
  const A = M.map((r) => r.slice());
  const rows = A.length, cols = rows ? A[0].length : 0;
  const scale = Math.max(1e-300, ...A.flat().map(Math.abs));
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) <= tol * scale) continue;
    [A[r], A[p]] = [A[p], A[r]];
    for (let i = r + 1; i < rows; i++) { const f = A[i][c] / A[r][c]; for (let k = c; k < cols; k++) A[i][k] -= f * A[r][k]; }
    r++;
  }
  return r;
}

export function determinacy(truss) {
  const unknowns = truss.members.length + truss.supports.reduce((a, s) => a + s.dirs.length, 0);
  const equations = 2 * truss.joints.length;
  const rk = rank(equilibriumMatrix(truss));
  const status = rk < equations ? 'mechanism' : unknowns > equations ? 'indeterminate' : 'determinate';
  return { unknowns, equations, difference: unknowns - equations, rank: rk, status };
}

export function trussSolve(truss) {
  const { joints, members, supports = [], loads = [] } = truss;
  const A = equilibriumMatrix(truss);
  const n = A.length, m = A[0].length;
  if (m !== n) throw new RangeError(`truss: ${m} unknowns for ${n} equations — not statically determinate`);
  const b = new Array(n).fill(0);
  for (const { joint, f: [fx, fy] } of loads) { b[2 * joint] -= fx; b[2 * joint + 1] -= fy; }
  if (rank(A) < n) throw new RangeError('truss: the equilibrium matrix is singular (a mechanism)');
  const x = LinearSolve(A, b);
  const forces = x.slice(0, members.length);
  const reactions = [];
  let c = members.length;
  for (const s of supports) for (const dir of s.dirs) reactions.push({ joint: s.joint, dir, value: x[c++] });
  const residual = Math.max(...A.map((row, i) => Math.abs(row.reduce((a, v, k) => a + v * x[k], 0) - b[i])));
  return { forces, reactions, residual };
}
