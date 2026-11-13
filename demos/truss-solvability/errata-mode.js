// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-solvability/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.40: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.40', date: '2026-11-13', request: 'owner request 2026-11-13' });
export const CORRECTIONS = [
  {
    id: 'E-TD-01',
    original: 'the verdict is "solvable" whenever variables − equations ≤ 0. Without the support at joint B and with rollers at A and E there are 14 equations but only 13 unknowns (difference −1): the truss is a mechanism (it rolls sideways) and cannot be solved, yet it is called "solvable". Counting alone also cannot tell a well-placed set of supports from a badly placed one.',
    corrected: 'the verdict comes from the rank of the joint-balance equations (shared/truss.js): "solvable" when the equations determine every member force and reaction, "statically indeterminate" when there are more unknowns than independent equations, and "unstable (a mechanism)" when the supports or members cannot hold the truss still. The counts above stay as in the original.',
  },
];
