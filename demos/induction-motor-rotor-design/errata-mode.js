// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Harley H. Hartman
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/induction-motor-rotor-design/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-IM-02',
    original: 'when the rotor resistance exceeds the rotor reactance (r > x) the curve\'s maximum lies at a negative speed, outside the plot: the "max torque" label then shows "0 rpm" together with the unconstrained maximum 0.005867 e²/x, a torque the motor does not reach at 0 rpm (e = 150, r = 1, x = 0.422: "313 % full load" at "0 rpm", while the curve starts at 224 % there and falls).',
    corrected: 'in that case the "max torque" label shows the largest torque on the plotted speeds, the locked-rotor torque at 0 rpm (the value the arrow points at); for r ≤ x nothing changes.',
  },
];
