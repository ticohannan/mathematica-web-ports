// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm/main.js — the Manipulate: the two configuration locators, the buttons, radius and progress sliders, the
// obstacle checkbox and the Graphics (axes, obstacles, roadmap, path, samples, locator icons, label), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, Button, None, hookCopy } from '../../shared/manipulate.js';
import { initialState, evaluate, RANGE, IMAGE, LOC_MIN, LOC_MAX } from './model.js';

Manipulate({
  name: 'prm',
  initial: initialState,
  random: true, // A-PR-07: unseeded like the original; ?seed=N for reproducible runs
  body: (s, { rng }) => evaluate(s, rng), // { state, view, graphics } (model.js: makeView, picture)
  graphics: { PlotRange: RANGE, ImageSize: IMAGE, PlotRangePadding: 0, label: 'Configuration space (two joint angles, a torus) with obstacles, sampled vertices, roadmap and path' },
  // PORT DEVIATION: the sliders keep the port's own steps and number fields (steps: undefined), not the layer's
  // Mathematica slider values; `name` keeps the test ids of the variables r and showConfigObs (ControlPlacement -> Left)
  controls: [
    [['qf', [5, 5]], [LOC_MIN, LOC_MIN], [LOC_MAX, LOC_MAX], Locator, { Appearance: None }],
    [['qs', [1, 1]], [LOC_MIN, LOC_MIN], [LOC_MAX, LOC_MAX], Locator, { Appearance: None }],
    Button('add 50 vertices', (s) => { s.addPoints = true; }, { name: 'add-vertices' }),
    [['r', 0.5, 'radius'], 0, 1, 0.01, { Appearance: 'Labeled', name: 'radius', steps: undefined }],
    // {progress, 0, 1, 0.01, Enabled -> Length[path] > 0 || path == -2, Appearance -> "Labeled"}
    [['progress', 0], 0, 1, 0.01, { Appearance: 'Labeled', steps: undefined, Enabled: (s) => (Array.isArray(s.path) && s.path.length > 0) || s.path === -2 }],
    [['showConfigObs', false, 'show obstacles'], [false, true], { name: 'show-obstacles' }],
    Button('restart', (s) => { s.restart = true; }),
  ],
  // the visible icons are the Locator[…] primitives above; a press goes to the nearest locator (LocatorPane)
  locators: { describe: (n) => `${n === 'qs' ? 'start' : 'goal'} configuration locator; arrow keys move it` },
  hook: { // port addition A-PR-03
    /** load (part of) a Manipulate state, e.g. the original's saved state, and evaluate once */
    loadState: (m) => (partial) => hookCopy(m.setState(JSON.parse(JSON.stringify(partial)))),
  },
});
