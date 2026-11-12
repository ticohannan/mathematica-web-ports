// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/integral-error-criteria/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-IE-01',
    original: 'the tuning plots use the authors\' tables of IAE, ISE and ITAE at eight gains and their optima, computed with NIntegrate of Abs[…] over {<i>t</i>, 0, 5000}, which misses the kinks of ∣1 − <i>y</i>∣: several values are off (ITAE at gain 1.25: 25.529, accurately 25.678; IAE at gain 1: 5.3547, accurately 5.3448), so the IAE optimum is drawn at gain 1.488 instead of 1.452.',
    corrected: 'the three tables and their optima are computed in the page with an adaptive integration that resolves the kinks (checked against a fine midpoint sum): optimum gains 1.452 (IAE), 2.084 (ISE) and 1.033 (ITAE).',
  },
];
