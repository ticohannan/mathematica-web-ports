// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Victor M. Baez and Nikhil Navkar
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/segment-distance/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-SD-01',
    original: 'when the closest points of the two full lines fall outside a segment, the second end of the red segment is found by projecting the unclamped point of the line, so the red segment and the "minimum distance" can be too long (5.51 at the opening settings).',
    corrected: 'the already clamped point is projected, as in the algorithm the code is based on; the red segment is the true shortest one (5.27 at the opening settings). The yellow segment between the full lines does not change.',
  },
];
