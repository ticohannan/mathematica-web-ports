// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-RS-01',
    original: 'the angular Jacobian of the spherical wrist has −cos <i>q</i><sub>2</sub> in its last entry; the third joint axis of this robot points along +cos <i>q</i><sub>2</sub>, so the angular manipulability ellipsoid of the wrist is drawn with a wrong orientation.',
    corrected: 'the entry is +cos <i>q</i><sub>2</sub>: the ellipsoid is oriented along the true joint axes. The singular values and the singular sets do not change.',
  },
  {
    id: 'E-RS-02',
    original: 'for the spherical wrist with "Linear" the singular set in the workspace is drawn as a sphere of radius 0.2 around (0, 0, 1).',
    corrected: 'the sphere has radius 1: the end point of this robot moves on the unit sphere around (0, 0, 1), and every configuration is singular.',
  },
  {
    id: 'E-RS-03',
    original: 'a joint slider pushed past ±π jumps by 6.28 instead of 2π: the robot turns by 0.0032 rad at the jump and the value leaves the slider grid (1.01π becomes −3.10699).',
    corrected: 'the jump is 2π (1.01π becomes −0.99π = −3.11018): the robot does not move at the jump.',
  },
];
