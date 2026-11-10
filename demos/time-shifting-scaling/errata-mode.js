// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Mable Wan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/time-shifting-scaling/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-TS-01',
    original: 'for <i>a</i> = 0 the curves <i>y</i>(<i>t</i>) = <i>x</i>(<i>a t</i> − <i>b</i>) and <i>w</i>(<i>t</i>) = <i>x</i>(<i>a t</i>) are drawn as <i>x</i> stretched 10000 times.',
    corrected: 'for <i>a</i> = 0 both are the constants they are: <i>y</i>(<i>t</i>) = <i>x</i>(−<i>b</i>) and <i>w</i>(<i>t</i>) = <i>x</i>(0), drawn as horizontal lines (at a jump of <i>x</i> the value just after the jump). Every other value of <i>a</i> is unchanged.',
  },
];
