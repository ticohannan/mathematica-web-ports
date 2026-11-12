// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rob Lockhart
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/forward-kinematics/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.38: ported with its switch, as the v0.1.37 ports (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.38', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-FK-01',
    original: 'the table is headed "local rotation matrix", but its entries are 4×4 homogeneous transformations: each holds a rotation and a translation (the 20 of link 2 and the end-effector), and a rotation matrix is the 3×3 block alone.',
    corrected: 'the header reads "local transformation matrix".',
  },
];
