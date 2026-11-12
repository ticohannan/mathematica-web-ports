// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Simon M. Lane
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/first-order-process-control/errata-mode.js — what the switch "errors of the original: corrected" changes in
// this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-FO-01',
    original: 'sinusoidal input: the table gives the phase shift −ϕ = ArcTan[ω τ] with the unit "min", but it is an angle in radians (the time lag is ϕ/ω, equal to it only at ω = 1: at ω = 3.5 the table says 1.5 min, the lag is 0.43 min).',
    corrected: 'the phase shift is shown in rad, and a row "time lag ϕ/ω" gives the lag in minutes.',
  },
  {
    id: 'E-FO-02',
    original: 'ramp input: the table\'s "time constant τ" is the vertical gap between input and response at <i>t</i> = 10/<i>a</i> (7.3 at τ = 5, <i>a</i> = 3), which is neither τ nor constant, and the τ marker is drawn there.',
    corrected: 'the table shows τ (the time by which the response lags the ramp once the transient has died away), and the τ marker is the horizontal lag at the response\'s value at <i>t</i> = 10.',
  },
  {
    id: 'E-FO-03',
    original: 'sinusoidal input: "amplitude output <i>B</i>" is the first maximum of the response, which still contains the decaying transient (0.91 at the opening settings), so the amplitude ratio (0.3) is not that of the sinusoid the output settles to.',
    corrected: '<i>B</i> = <i>K a</i>/√(ω²τ² + 1), the amplitude of the steady sinusoid (0.59), and the ratio <i>B</i>/<i>A</i> = 1/√(ω²τ² + 1) (0.2). The markers in the plot stay at the first maximum.',
  },
];
