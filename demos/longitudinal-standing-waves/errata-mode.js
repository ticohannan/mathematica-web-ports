// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Kenneth E. Caviness
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/longitudinal-standing-waves/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-LS-01',
    original: 'the waves fRight and fLeft use the wavelength 28/9 = 3.11 for every harmonic and pipe end (a value of λ saved with the Demonstration), while the envelopes, the arrows, the node labels and the size of the displacements use the selected wavelength 4L/(2n − 1) (closed) or 2L/n. The transverse standing wave then does not fit its envelope or the pipe ends, and the contour lines fold over into thick black bands (at the opening settings and in most snapshots).',
    corrected: 'fRight and fLeft use the selected wavelength λ = 4L/(2n − Boole[end == "closed"]): the standing wave has its antinodes at the open ends and a node at a closed end, fits its envelope, and the contour lines and density points bunch at the pressure antinodes without folding over.',
  },
];
