// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hugo Tadashi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/zero-pole-cancellation/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-ZP-01',
    original: 'the "gain" slider has no visible effect: the option PoleZeroMarkers -> {Automatic, "ParameterValues" -> gain} draws no marker at the closed-loop poles for that gain (none in the snapshots at gain 0.628 and 0.634), so the plot never shows where the poles are for the chosen gain.',
    corrected: 'the closed-loop poles at the chosen gain are drawn as points in the colours of their branches (at 0.628 without compensation: −1.436 and 0.018 ± 0.634 i, just right of the imaginary axis).',
  },
];
