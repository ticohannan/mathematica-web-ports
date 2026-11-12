// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jon Neades
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-double-spring/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-QD-01',
    original: 'the unsprung mass\'s angular frequency is labelled "ω<sub>2</sub> = 51.60 Hz" at the opening settings; it is in rad/s (the sprung mass\'s ω<sub>1</sub> has "rad/s", and <i>f</i><sub>2</sub> = ω<sub>2</sub>/(2π) = 8.22 Hz is the frequency in hertz).',
    corrected: 'the label reads "ω<sub>2</sub> = 51.60 rad/s".',
  },
];
