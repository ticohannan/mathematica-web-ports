// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Megan Maguire and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/carnot-irreversible-heat-transfer/errata-mode.js — what the switch "errors of the original: corrected" changes
// in this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.44: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.44', date: '2026-11-27', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-CI-01',
    original: 'the heat pump\'s "COP" is T_C/(T_H − T_C) = Q_C/W, the coefficient of performance of a refrigerator (heat taken from the cold side per unit of work); a heat pump\'s COP is the heat delivered to the hot side per unit of work (ΔT1 = 8, ΔT2 = 36: "COP = 2.5").',
    corrected: 'the label shows the heat pump\'s COP T_H/(T_H − T_C) = Q_H/W, the heat given to the hot side per unit of work ("COP = 3.5" there); the work and the heats are unchanged.',
  },
];
