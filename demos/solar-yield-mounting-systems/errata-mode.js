// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Michel de Spot
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-yield-mounting-systems/errata-mode.js — what the switch "errors of the original: corrected" changes in
// this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.44: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.44', date: '2026-11-27', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-SY-01',
    original: 'the plot\'s vertical axis is labelled "wh/m2", an energy per area, but the curves are irradiances, powers per area in W/m² (the full tracker\'s 1032 at noon on June 21 is 1032 W/m²).',
    corrected: 'the axis is labelled "W/m2".',
  },
  {
    id: 'E-SY-02',
    original: 'the bar chart\'s unit "Energy Yield kW/h/da" reads as kilowatts per hour per day; the bars are energies per area and day, kWh/m² per day (the sum of the irradiances over the day in steps of 0.1 h, divided by 10000).',
    corrected: 'the unit reads "Energy Yield kWh/m2/day".',
  },
];
