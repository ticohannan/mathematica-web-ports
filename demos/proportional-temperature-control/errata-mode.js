// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jeff Bryant and Housam Binous
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/proportional-temperature-control/errata-mode.js — what the switch "errors of the original: corrected" changes
// in this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.37: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.37', date: '2026-11-12', request: 'owner request 2026-11-12' });
export const CORRECTIONS = [
  {
    id: 'E-PT-01',
    original: 'the plot label gives the volume in m<sup>3</sup> and the water flow in m<sup>3</sup>/h, but the model uses the density ρ = 1 with <i>c</i><sub>p</sub> = 4.19 kJ/(kg °C): water in kilograms per litre. In cubic metres (ρ = 1000 kg/m<sup>3</sup>) the heat input of 2500 kJ/h would warm the tank by hundredths of a degree, not the 60 °C shown.',
    corrected: 'the label gives the volume in L and the flow in L/h, the units in which the model\'s numbers are right; the curves are unchanged.',
  },
];
