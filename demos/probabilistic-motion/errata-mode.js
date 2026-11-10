// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Renuka Pakeetharan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/probabilistic-motion/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-PM-01',
    original: 'the two sampling modes draw their noise from a triangular distribution on [−<i>b</i>, <i>b</i>], whose variance is <i>b</i>²/6, while the two density modes use the triangular density of variance <i>b</i>² (support ±√6 <i>b</i>): every sample cloud is √6 ≈ 2.4 times narrower than the density it belongs to.',
    corrected: 'the samples are drawn on [−√6 <i>b</i>, √6 <i>b</i>] (variance <i>b</i>², as in the book the code follows): the clouds of "VelocitySample" and "OdometrySample" are √6 times wider and fill the support of the matching density. The density modes do not change.',
  },
];
