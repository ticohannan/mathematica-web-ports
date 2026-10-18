// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/arm-configurations/robots.js — the nine DH tables of the original's popup "DH parameters for robot arm"
// ({jointtypes, a, alpha, d, theta}, one column per joint), transcribed exactly with the exactness of every entry,
// and the rows of the DH-table control (makeDHControl). Pure: no DOM.
// Source: docs/original-source/arm-configurations.txt (Control@{{DHParameters, …}, {… -> "planar elbow", …}}).
import { piFraction } from '../../shared/mma-text.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

/** Angles that are exact multiples of π are kept as the integer n of nπ/32 */
export const ANGLE_DEN = 32;

/** An exact integer entry (0, 1) */
const E = (v) => ({ v, exact: true });
/** A machine-real entry (1.5, 0.75, 0.5) */
const M = (v) => ({ v, exact: false });
/** An exact multiple of π: n·π/32 (Pi/2 → 16, -Pi/2 → -16, Pi → 32) */
const P = (n) => ({ v: (n * Math.PI) / ANGLE_DEN, exact: true, pi: n });
/** Subscript[q, i]: the joint variable's place in the table; never used in a computation (N-AC-03) */
const Q = (i) => ({ q: i });

/**
 * The popup's values in the original's order. Each robot: {name, jointtype: ["r" | "p", …], a, alpha, d, theta}
 * with every entry an object {v, exact[, pi]} or {q} (the joint variable).
 */
export const ROBOTS = [
  { name: 'planar elbow', jointtype: ['r', 'r'], a: [E(1), M(1.5)], alpha: [E(0), E(0)], d: [E(0), E(0)], theta: [Q(1), Q(2)] },
  { name: 'elbow robot', jointtype: ['r', 'r', 'r'], a: [E(0), E(1), E(1)], alpha: [P(16), E(0), E(0)], d: [E(1), E(0), E(0)], theta: [Q(1), Q(2), Q(3)] },
  {
    name: 'anthropomorphic', jointtype: ['r', 'r', 'r', 'r', 'r', 'r'],
    a: [E(0), E(1), E(1), E(0), E(0), E(0)],
    alpha: [P(16), E(0), P(16), P(16), P(-16), E(0)],
    d: [M(1.5), E(0), E(0), M(0.75), E(0), M(0.5)],
    theta: [Q(1), Q(2), Q(3), Q(4), Q(5), Q(6)],
  },
  {
    name: 'Stanford robot', jointtype: ['r', 'r', 'p', 'r', 'r', 'r'],
    a: [E(0), E(0), E(0), E(0), E(0), E(0)],
    alpha: [P(-16), P(16), E(0), P(-16), P(16), E(0)], // {-Pi/2, +Pi/2, 0, -Pi/2, Pi/2, 0}
    d: [E(1), E(1), Q(3), E(0), E(0), E(1)],
    theta: [Q(1), Q(2), E(0), Q(4), Q(5), Q(6)],
  },
  { name: 'cylindrical robot', jointtype: ['r', 'p', 'p'], a: [E(0), E(0), E(0)], alpha: [E(0), P(-16), E(0)], d: [E(1), Q(2), Q(3)], theta: [Q(1), E(0), E(0)] },
  { name: 'spherical robot', jointtype: ['r', 'r', 'p'], a: [M(0.75), E(1), E(0)], alpha: [P(-16), P(16), E(0)], d: [E(1), E(0), Q(3)], theta: [Q(1), Q(2), E(0)] },
  {
    name: 'SCARA robot', jointtype: ['r', 'r', 'p', 'r'],
    a: [M(0.5), M(0.5), E(0), E(0)], alpha: [E(0), E(0), E(0), E(0)], d: [M(0.75), E(0), Q(3), M(0.5)], theta: [Q(1), Q(2), E(0), Q(4)],
  },
  {
    name: 'Cartesian robot', jointtype: ['p', 'p', 'p', 'r'],
    a: [E(0), E(0), E(0), E(0)], alpha: [P(16), P(16), E(0), E(0)], d: [Q(1), Q(2), Q(3), M(0.5)], theta: [E(0), P(32), E(0), Q(4)],
  },
  { name: 'CNC robot', jointtype: ['p', 'p', 'p'], a: [E(0), E(0), E(0)], alpha: [P(-16), P(16), E(0)], d: [Q(1), Q(2), Q(3)], theta: [P(-16), P(-16), E(0)] },
];

/** The popup's default: the anthropomorphic table (index 2 of ROBOTS) */
export const DEFAULT_ROBOT = 2;

/** The text of a table entry as the front end shows it: exact integers "0", "1", machine reals "1.5", "0.75", "0.5", exact angles "π/2", "−π/2", "π" */
export function entryText(e) {
  if (e.pi !== undefined) return piFraction(e.pi, ANGLE_DEN);
  return e.exact ? String(e.v) : mmaNumberString(e.v, { isReal: true });
}

/**
 * makeDHControl[unusedVar, dhp]: Text[Grid[Transpose[{jointnum, jointtype, a, alpha, d, theta}], Frame -> All]].
 * The header row sets "joint", "type", "r", "Alpha" (shown α) and "d" but leaves theta[[1]] at its ConstantArray value 0
 * (Q-AC-03, E-AC-04). Then per joint i: i, ToString[type], a, alpha, d, theta — with
 * If[dhp[[1,i]] == "r", theta[[i+1]] = Subsuperscript["θ", i, "*"], d[[i+1]] = Subsuperscript["d", i, "*"]].
 * Returns rows of cells; a cell is a string or {sym: 'θ' | 'd', i} for the joint variable.
 */
export function dhTableRows(robot) {
  const dof = robot.jointtype.length;
  const rows = [['joint', 'type', 'r', 'α', 'd', '0']];
  for (let i = 0; i < dof; i++) {
    const rev = robot.jointtype[i] === 'r';
    const cell = (e) => (e.q !== undefined ? `q${e.q}` : entryText(e)); // q entries never remain (replaced below)
    rows.push([
      String(i + 1),
      String(robot.jointtype[i]),
      cell(robot.a[i]),
      cell(robot.alpha[i]),
      rev ? cell(robot.d[i]) : { sym: 'd', i: i + 1 },
      rev ? { sym: 'θ', i: i + 1 } : cell(robot.theta[i]),
    ]);
  }
  return rows;
}

/** A table cell as plain text: "θ*1", "d*2" for the joint variables */
export const cellText = (c) => (typeof c === 'string' ? c : `${c.sym}*${c.i}`);
