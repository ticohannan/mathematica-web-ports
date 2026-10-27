// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/visibility-region/main.js — the page: the original's Manipulate (shared/manipulate.js) with its picture as
// Graphics data. The body writes m (the number of vertices), which sets the slider's range 1 … m + 2.
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { SAVED, initialState, evaluate } from './model.js';

Manipulate({
  name: 'visibility-region',
  initial: initialState, // the notebook's saved state (= the Manipulate's stored initial values)
  body: evaluate,
  ControlPlacement: 'Top', // Mathematica's default, as the snapshots show
  graphics: {
    PlotRange: [[-6.05, 6.05], [-6.05, 6.05]], ImageSize: [450, 450], PlotRangePadding: 0,
    label: 'Polygon, the reference point, the visibility region and the sweep step',
  },
  controls: [
    [['s', SAVED.s, 'vertices sorted by angle'], 1, (st) => st.m + 2, 1, { Appearance: 'Labeled' }],
    [['m', SAVED.m], None], // {{m, 40}, ControlType -> None}: Length@sortedList, written by the body
    // 13 locators, all invisible (Appearance -> None); pts[[13]] is the reference point (Q-VR-01)
    [['pts', SAVED.pts], [-6, -6], [6, 6], Locator, { Appearance: None }],
  ],
});
