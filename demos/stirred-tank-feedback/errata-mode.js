// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by R. Ricardo Sánchez
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/stirred-tank-feedback/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-ST-01',
    original: 'the PI controller acts on the error <i>T</i><sub>set</sub> − <i>T</i><sub>r</sub>, the true tank temperature, so the temperature sensor and its 2 h lag, which the plot shows as <i>T</i><sub>sens</sub>, have no effect on the control.',
    corrected: 'the controller acts on <i>T</i><sub>set</sub> − <i>T</i><sub>sens</sub>, the measured temperature (the error and its integral both); the sensor lag now enters the loop, and the oscillations after the start and the disturbance grow.',
  },
];
