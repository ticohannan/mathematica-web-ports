// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-sections/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.40: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.40', date: '2026-11-13', request: 'owner request 2026-11-13' });
export const CORRECTIONS = [
  {
    id: 'E-TX-01',
    original: 'cut 4 ("make cut" checked): the result line under the x balance reads "F13 = 10.6 kN" at w = h = 8, but the number printed is the magnitude of F12 (NumberForm[Abs@F12, …]), the force of member 12 from cut 3. The x balance above it gives a magnitude of 20.0 kN for F13, which is also what the solved truss shows for member 13.',
    corrected: 'the line shows the magnitude of F13 (20.0 kN at w = h = 8).',
  },
  {
    id: 'E-TX-02',
    original: 'cut 5 with "solve moment": the moment balance about I is written "4 w RA + w FD − h F15 = 0". The load FD at D turns the cut piece the other way from RA, so its term has the opposite sign; the original\'s own Solve uses 4 w RA − w FD (its "+" is commented out), and the line below divides F15 = w/h (4 RA − FD), so the numbers shown are right and only this line is wrong.',
    corrected: 'the line reads "4 w RA − w FD − h F15 = 0".',
  },
];
