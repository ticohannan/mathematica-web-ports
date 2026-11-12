// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Carsten Roppel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/harmonic-distortion/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-HD-01',
    original: 'every bin of the magnitude spectrum is 2/<i>N</i> ∣DFT∣, the DC bin (0 Hz) included, so a constant part of the signal is drawn at twice its value: with <i>c</i><sub>1</sub> = 0.5 the mean of <i>y</i> = <i>x</i> + 0.5 <i>x</i><sup>2</sup> is 0.25, drawn as 0.5.',
    corrected: 'the DC bin is 1/<i>N</i> ∣DFT∣ (the mean of the signal, 0.25 in that example); the other bins are unchanged.',
  },
];
