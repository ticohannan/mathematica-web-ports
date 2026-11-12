// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Erik Mahieu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-suspension/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-QC-01',
    original: 'the "resonant frequency" is ω<sub>n</sub>√(1 − 2ζ²) (Re[Sqrt[1 − c²/(2 k m)] Sqrt[k/m]]), the peak of a mass–spring–damper driven by a force; the model here is driven through the spring and the damper, (<i>k</i> + <i>c s</i>)/(<i>k</i> + <i>c s</i> + <i>m s</i>²), whose peak lies elsewhere — and the formula gives 0.00 for every ζ ≥ 0.71 (the opening settings, ζ = 1.05), though the model still has a peak.',
    corrected: 'the resonant frequency is the frequency of the peak of ∣(<i>k</i> + <i>c</i> iω)/(<i>k</i> + <i>c</i> iω − <i>m</i> ω²)∣, ω<sub>n</sub>√((√(1 + 8ζ²) − 1)/(4ζ²)) (0.28 at the opening settings).',
  },
];
