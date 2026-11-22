// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Richard Cangelosi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/lotka-volterra-competition/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-LV-01',
    original: 'the separatrices of the saddle are integrated over the fixed time span −1000 … 1000 from points 10<sup>−7</sup> of the saddle\'s distance from the origin away from it. Their speed is proportional to the growth rates: below about r1 = r2 = 0.1 (with α = 1.45, β = 1.4) the curves to (0, 1) and (1, 0) stop short of these points (at r1 = r2 = 0.05 they hardly leave the saddle), the basin polygons built from them are wrong, and the colours no longer show the basins of attraction.',
    corrected: 'each separatrix is integrated until it leaves the square, comes back to the saddle or reaches another equilibrium (no fixed time span), so the curves end at (0, 0), (0, 1) and (1, 0) and the basins are coloured correctly for every growth rate. With the opening settings the picture is the same as the original\'s.',
  },
];
