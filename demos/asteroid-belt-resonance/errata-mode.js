// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by S. M. Blinder
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/asteroid-belt-resonance/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.44: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.44', date: '2026-11-27', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-OR-01',
    original: 'the Kirkwood gaps are drawn at Jupiter\'s distance times the period ratio, 5.20336 × 1/3, 2/5, 3/7 and 1/2 = 1.73, 2.08, 2.23 and 2.60 AU: by Kepler\'s third law a period ratio p belongs to the distance ratio p^(2/3), so the 3:1 gap lies at 2.50 AU, not 1.73 AU (between Mars and the belt\'s inner edge).',
    corrected: 'the gaps are drawn at 5.20336 × p^(2/3) = 2.50 (3:1), 2.82 (5:2), 2.96 (7:3) and 3.28 AU (2:1), in the belt where the real Kirkwood gaps are; the Hilda distance 3.97 AU of the original already uses this law.',
  },
];
