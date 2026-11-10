// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/bfs-motion-planning/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-BF-02',
    original: 'a diagonal step of the grid costs 1.41, so every diagonal is counted 0.3 % too short and the "path length" label with it.',
    corrected: 'a diagonal step costs √2 = 1.41421…; the cost map, the label and, where two routes are almost equally long, the chosen route follow.',
  },
  {
    id: 'E-BF-03',
    original: 'an unreachable goal gives a one-cell "path": the arm jumps to the goal and the label reads "path length = ∞ rads"; a start inside an obstacle region is searched from as if it were free.',
    corrected: 'the label reads "no path exists" and the arm stays at the start; nothing is searched from a start inside an obstacle region.',
  },
  {
    id: 'E-BF-04',
    original: 'a diagonal step is taken even between two blocked cells, so a path can pass through the corner where two obstacle cells meet.',
    corrected: 'such a diagonal step is not taken; the path goes around the corner.',
  },
  {
    id: 'E-BF-05',
    original: 'the start and goal glyphs are both red or both green, according to whether the arm at its current position on the path collides.',
    corrected: 'each glyph is red when its own configuration collides and green otherwise.',
  },
  {
    id: 'E-BF-07',
    original: 'a start or goal exactly on the edge of the phase space can be given a cell outside the grid (row 0 or row L + 1 for a typed non-integer Q with an odd grid size), which breaks the search.',
    corrected: 'the cell index is kept inside the grid (1 … L).',
  },
];
