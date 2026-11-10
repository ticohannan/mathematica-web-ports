// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-path/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-DP-01',
    original: 'when the shortest path starts with a right turn of length 0, the blue car at progress 0 is drawn facing backwards (for example goal (8, 3) heading up with <i>r</i><sub>min</sub> = 3).',
    corrected: 'the heading of the moving car on the first arc follows the arc\'s turning direction, so the car faces forwards there too.',
  },
  {
    id: 'E-DP-03',
    original: 'the paths LSR and RSL are dropped when the two turning circles are exactly 2 <i>r</i><sub>min</sub> apart, and LRL and RLR when they are exactly 4 <i>r</i><sub>min</sub> apart, so on these boundaries a longer path is shown (goal (2, 2) heading 0 with <i>r</i><sub>min</sub> = 1: 9.11 instead of 3.14).',
    corrected: 'the boundary cases are kept (a straight piece of length 0, or a middle arc of π): the shortest path no longer jumps there.',
  },
];
