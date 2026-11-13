// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-joints/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.40: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.40', date: '2026-11-13', request: 'owner request 2026-11-13' });
export const CORRECTIONS = [
  {
    id: 'E-TJ-01',
    original: 'joint C in focus: the two balances read "∑ Fy = −FC + FBC sin θ + FCD sin θ" and "∑ Fx = −FAC − …" — they lack the "= 0" that the balances of the other joints have, so they do not say what is set to zero.',
    corrected: 'they read "∑ Fy = 0 = −FC + …" and "∑ Fx = 0 = −FAC − …", as at the other joints.',
  },
];
