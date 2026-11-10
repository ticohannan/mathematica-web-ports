// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/camera-apparent-velocity/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-CV-01',
    original: 'the "maxdist" shown under "image plane coordinates" is computed from <i>x</i>/<i>z</i> and <i>y</i>/<i>z</i> without the focal length λ = 5, so it is a fifth of the distance between the two projected points whose (<i>u</i>, <i>v</i>) = λ(<i>x</i>/<i>z</i>, <i>y</i>/<i>z</i>) is shown above it (0.3 at the opening settings).',
    corrected: 'maxdist is the distance in the image plane, λ times the original\'s value (1.4 at the opening settings). The pictures do not change.',
  },
];
