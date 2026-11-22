// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Alain Goriely and Mark Robertson-Tessi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/vibrating-string/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-VS-03',
    original: 'the piecewise-linear initial data (MyPiecewise) uses open intervals, so at every data point (each locator) its value is 0 instead of the locator\'s height; the curves drop to 0 wherever the plot samples a data point exactly.',
    corrected: 'the intervals are closed, so the piecewise-linear string passes through every locator. The Fourier coefficients do not change (single points do not change an integral).',
  },
  {
    id: 'E-VS-04',
    original: 'the periodic extension (PeriodicExtension) takes 2 off x until x lies strictly between −1 and 1; at x = ±1 (every odd integer) it jumps between 1 and −1 for ever, so the string has no value there (a gap of one sample, for example at the right end x = 1 at t = 0).',
    corrected: 'the extension also stops at x = ±1 itself, so the string is 0 at x = ±1 (its fixed ends) as everywhere else on its period.',
  },
];
