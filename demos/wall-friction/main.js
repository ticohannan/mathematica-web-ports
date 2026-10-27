// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/wall-friction/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as Graphics
// data. The body runs the search at every evaluation and writes the four points back (kept in the ε workspace).
import { Manipulate, Locator, None, Row, Slider } from '../../shared/manipulate.js';
import { Round, Equal } from '../../shared/wl.js';
import { SAVED, CONFIG_SPACE, initialState, evaluate, realText } from './model.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** Mathematica's text of a slider value of {min, max, 1/den}: the exact rational k/den reduced ("1/20", "13/500", "1");
 *  a value off that grid (possible only through the test hook) as a machine real. */
const exactText = (den) => (v) => {
  const k = Round(v * den);
  if (!Equal(k / den, v)) return realText(v);
  const g = gcd(k, den);
  return den / g === 1 ? String(k / g) : `${k / g}/${den / g}`;
};
// {{s1, {0.95, 0.95}}, {0, 0} + ε, {1, 1} − ε, Locator, Appearance -> None}: the range is evaluated once, with the
// opening ε = 1/20 (N-WF-01); the body keeps the points in the current ε workspace
const range = [[SAVED.ϵ, SAVED.ϵ], [1 - SAVED.ϵ, 1 - SAVED.ϵ]];

Manipulate({
  name: 'wall-friction',
  initial: initialState, // the notebook's saved state (= the Manipulate's stored initial values: Initial settings)
  body: evaluate,
  ControlPlacement: 'Top', // Mathematica's default, as the snapshots show
  graphics: { label: 'The workspace with the two robots, their starts, goals and paths, and on the right the Δ configuration space or the current move' },
  controls: [
    Row([[['ifMove', SAVED.ifMove, 'on the right, show'], ['moves', CONFIG_SPACE]]], { name: 'show' }),
    Row([
      [['progress', SAVED.progress, 'progress'], 0, 1, 1 / 420, { ControlType: Slider, Appearance: 'Labeled', format: exactText(420) }],
      [['ϵ', SAVED.ϵ, 'ϵ'], 1 / 1000, 1 / 10, 1 / 1000, { ControlType: Slider, Appearance: 'Labeled', format: exactText(1000) }],
    ], { name: 'sliders' }),
    [['s1', SAVED.s1], ...range, Locator, { Appearance: None }],
    [['s2', SAVED.s2], ...range, Locator, { Appearance: None }],
    [['e1', SAVED.e1], ...range, Locator, { Appearance: None }],
    [['e2', SAVED.e2], ...range, Locator, { Appearance: None }],
  ],
});
