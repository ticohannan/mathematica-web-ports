// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Yunfeng Shi and Adam Bross
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/crystal-structures-miller/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-CM-01',
    original: 'ZnS draws its blue spheres (the tetrahedral sites) with the red radius: the slider "radius (blue)" changes nothing for ZnS.',
    corrected: 'the blue ZnS spheres use "radius (blue)", as for NaCl and CsCl.',
  },
  {
    id: 'E-CM-02',
    original: 'HCP Miller planes with two or three nonzero indices use h x + √3 k y + l z = √(8/3) d (l ≠ 0) or h x + k y = √3 d (l = 0): these are not lattice planes of the 1 × √3 × √(8/3) cell (the (110) planes miss the atoms at (1/2, √3/2, 0)).',
    corrected: 'the planes h x/a + k y/b + l z/c = d of the cell a = 1, b = √3, c = √(8/3): the (h k l) planes cut the cell edges at a/h, b/k, c/l and pass through lattice points.',
  },
  {
    id: 'E-CM-03',
    original: 'the HCP unit cell is shifted by whole units (sx, sy, sz) although its sides are 1, √3 and √(8/3): a shifted HCP cell does not sit on lattice points.',
    corrected: 'the HCP cell is shifted by whole cells: its corner is (sx, √3 sy, √(8/3) sz).',
  },
  {
    id: 'E-CM-04',
    original: 'each Miller plane family has the planes d = −3 rp … 3 rp only: when the positive (or the negative) indices add up to more than 3 the family stops inside the crystal (e.g. (4 0 0) with one repeat misses the plane x = 1), and with no repeats only the plane through the origin is drawn.',
    corrected: 'd runs over −D … D with D = max(3 rp, (rp + 1) × the sum of the absolute values of h, k, l), so the planes fill the whole plot range box.',
  },
  {
    id: 'E-CM-05',
    original: 'Miller indices (0 0 0) fall through to the last branch of the plane code, which draws the planes x = d (the (1 0 0) family) for indices that describe no plane.',
    corrected: '(0 0 0) draws no planes.',
  },
];
