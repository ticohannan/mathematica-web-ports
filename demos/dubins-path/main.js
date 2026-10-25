// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-path/main.js — the Manipulate: progress and r_min sliders, goal and heading locators and the Graphics
// options, on shared/manipulate.js (browser only); the picture (cars, turning circles, the six candidate paths, the
// shortest path, label) is the Graphics data of dubins.js picture.
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { Style, Subscript, Italic, Gray, Lighter } from '../../shared/graphics.js';
import { initialState, evaluate, picture, PLOT_RANGE, GOAL_RANGE } from './dubins.js';

const PLOT_BOX = [[PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]]];
const DESCR = { goalXY: 'goal position', goalThetaloc: 'goal heading' };

Manipulate({
  name: 'dubins-path',
  initial: initialState,
  body: (st) => { const { state, view } = evaluate(st); return { state, view, graphics: picture(state, view) }; },
  // Graphics[{…}, PlotRange -> {{-15, 15}, {-10, 10}}, ImageSize -> 600, Background -> Lighter[Gray, .92]]
  graphics: {
    PlotRange: PLOT_RANGE, ImageSize: 600, PlotRangePadding: 0, Background: Lighter(Gray, 0.92), // no padding (D-DP-08)
    label: 'Plane with the start car (green), the goal car (red), the six candidate paths, the shortest path (thick) and the moving car (blue)',
  },
  controls: [
    // {{goalXY, {2, 2}}, {-13, -8}, {13, 8}, Locator}; the heading locator's range is the plot range (D-DP-06)
    [['goalXY', [2, 2]], ...GOAL_RANGE, Locator],
    [['goalThetaloc', [2 + Math.SQRT2, 2 - Math.SQRT2]], ...PLOT_BOX, Locator, { Appearance: None }],
    [['progress', 0.25], 0, 1, { Appearance: 'Labeled' }], // {{progress, 0.25}, 0, 1, Appearance -> "Labeled", ImageSize -> 400}
    [['minRadius', 3, Subscript(Style('r', Italic), 'min')], 0.001, 5, { Appearance: 'Labeled' }],
  ],
  // two Locator controls picked as in a LocatorPane (D-DP-05, K-DP-04): a press within 12 px grabs the nearer one in
  // place, a press elsewhere makes the nearer one jump there; ties go to the goal locator (first name)
  locators: { keyStep: 0.1, describe: (n) => `${DESCR[n]} locator; arrow keys move it` },
  hook: { // port addition A-DP-03
    view: (v) => ({
      lengths: Object.fromEntries(Object.entries(v.lengths).map(([k, x]) => [k, Number.isFinite(x) ? x : null])),
      word: v.word, label: v.label, pathLength: v.pathLength, distance: v.distance,
      csL: v.csL, csR: v.csR, ceL: v.ceL, ceR: v.ceR, car: v.car, shortestPath: v.shortestPath[1],
    }),
    labelText: (m) => () => m.view.label,
  },
});

