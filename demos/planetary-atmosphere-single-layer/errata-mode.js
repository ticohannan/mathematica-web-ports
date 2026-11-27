// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Sergio Hannibal Mejía and Simon Lorimer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/planetary-atmosphere-single-layer/errata-mode.js — what the switch "errors of the original: corrected" changes
// in this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.44: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.44', date: '2026-11-27', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-AT-01',
    original: 'choosing a planet sets the solar distance only for Earth (d = 1): the three tests of Which[planet == 1, d = 1, planet == 1, d = 1.52, planet == 1, d = .72] all ask for planet 1, so Mars and Venus keep the slider\'s distance (Venus with ε = 0.8, α = 0.75 at d = 1 AU: Tp = 224 K).',
    corrected: 'Mars sets d = 1.52 AU and Venus d = 0.72 AU, as the Which was written to do (Venus: S̄ = 660, Tp = 264 K); Earth and "my own" are unchanged.',
  },
  {
    id: 'E-AT-02',
    original: 'the picture says "radiation measurements are in kW/m²", but the numbers (S̄ = 342 for Earth, σ Tp⁴ = 381) are in W/m².',
    corrected: 'the label says W/m².',
  },
];
