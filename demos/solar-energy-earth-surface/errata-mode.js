// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Stephen Wilkerson, Frank A. Wattenberg and Russell Park
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/solar-energy-earth-surface/errata-mode.js — what the switch "errors of the original: corrected" changes in this
// app (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
// v0.1.41: this app was ported with its switch (tools/errata-docs.mjs reads the version and request from here)
export const SWITCH = Object.freeze({ since: 'v0.1.41', date: '2026-11-17', request: 'requested 2026-11-17' });
export const CORRECTIONS = [
  {
    id: 'E-SE-01',
    original: 'the red point, the black normal and the start of the red Sun arrow are drawn with rotateEarth[h, sea + .5], half a turn (12 hours) away from the point whose energy is plotted: at noon (time of day 12) the point is drawn on the night side.',
    corrected: 'the point and both arrows are drawn with rotateEarth[h, sea], where the energy is computed: at noon the point faces the Sun.',
  },
  {
    id: 'E-SE-02',
    original: 'the dark night half of the globe always covers the side x ≤ 0, whatever the season, although the Sun\'s direction turns with the season (at season 0.5 the night half covers the sunlit side).',
    corrected: 'the night half is turned about the z axis by 2π·season, so that it always covers the side turned away from the Sun.',
  },
  {
    id: 'E-SE-03',
    original: 'the accumulated-energy plot draws the chosen latitude in red and the equator in black (ListLinePlot[{aeng, aeng1, aeng2}] with the styles {Red, Black, Blue}), the opposite of the energy plot and its legend.',
    corrected: 'the equator is red and the latitude black in both plots, as the legend says.',
  },
  {
    id: 'E-SE-04',
    original: 'the day\'s energy is summed over 25 hourly values, t = 0, 1, …, 24, so midnight is counted twice: wherever the Sun is up at midnight (the north pole in summer) the day\'s total is one hour too large (13,566 instead of 13,023 at the pole at season 0).',
    corrected: 'the sum runs over the 24 hours t = 0, 1, …, 23.',
  },
];
