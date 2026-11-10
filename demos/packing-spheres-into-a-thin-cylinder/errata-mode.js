// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/packing-spheres-into-a-thin-cylinder/errata-mode.js — what the switch "errors of the original: corrected"
// changes in this app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-PS-01',
    original: 'the five-at-a-time packing spaces its rings by a formula with (5 − √5)/32 where the geometry needs (3 − √5)/8: neighbouring rings do not touch (a gap of 0.026 <i>r</i> at <i>R</i>/<i>r</i> = 2.708) and the compression ratio shown there is 0.172977.',
    corrected: 'the rings touch (ratio 0.169874 at <i>R</i>/<i>r</i> = 2.708) and the fifth curve of the plot is lower. Five at a time is shown wherever this curve is the lowest of the eight: up to <i>R</i>/<i>r</i> = 2.7228 instead of 2.7099 (so also at the slider steps 2.71 and 2.72), and again from 2.8043 to 2.9204, where it now lies below the twisted three-at-a-time curve (0.1641 against 0.1648 at 2.85).',
  },
  {
    id: 'E-PS-02',
    original: 'the control "spheres" is rounded up to whole levels, so up to one level less one sphere too many are drawn (20 spheres for 17 at <i>R</i>/<i>r</i> = 2.361).',
    corrected: 'exactly the chosen number of spheres is drawn; the last level can be incomplete, and the contact lines of the spheres left out are left out too.',
  },
];
