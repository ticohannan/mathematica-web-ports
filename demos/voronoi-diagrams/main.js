// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Ed Pegg Jr, Jeff Bryant and Theodore W. Gray
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/voronoi-diagrams/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data and the sites as a Locator list with LocatorAutoCreate.
import { Manipulate, Locator, PopupMenu } from '../../shared/manipulate.js';
import { initialState, evaluate, GRADIENT_NAMES, SAVED_LOC } from './model.js';

Manipulate({
  name: 'voronoi-diagrams',
  ControlPlacement: 'Top',
  initial: initialState,
  body: evaluate,
  random: true, // the point added when fewer than 3 remain (F-VD-04); ?seed=N makes it reproducible
  controls: [
    // "None" -> {{loc, RandomReal[{0, 10}, {10, 2}]}, {0, 0}, {10, 10}, Locator, LocatorAutoCreate -> True}: the page
    // opens with the notebook's saved points (D-VD-02)
    [['loc', SAVED_LOC.map((p) => [...p])], [0, 0], [10, 10], Locator, { LocatorAutoCreate: true }],
    [['colors', 'BeachColors', 'color scheme'], GRADIENT_NAMES, { ControlType: PopupMenu }],
    [['mesh', false, 'show borders'], [true, false]],
  ],
  locators: { describe: (n) => `point ${n.replace('loc-', '')}; arrow keys move it; Alt/⌘-click adds or deletes a point` },
});
