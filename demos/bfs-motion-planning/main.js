// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/bfs-motion-planning/main.js — the Manipulate: the Q and P sliders, the four locators and the Graphics (arm,
// obstacles, cost-map inset with path, texts, start and goal glyphs), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, cacheLast } from '../../shared/manipulate.js';
import { EdgeForm, Style, Italic, Black, Red, LightGray } from '../../shared/graphics.js';
import { PLOT_RANGE, IMAGE_SIZE, W, OBS_RANGE, CONFIG_RANGE, arrayPlotColors } from '../common/arm-grid.js';
import { armGraphics, obstacleDisks, gridInset, insetFrame, thetaLabel, plainText, configGlyph, obstacleGlyph } from '../common/arm-view.js';
import { initialState, evaluate, blockedCount } from './model.js';

let searches = 0, walks = 0; // how often bfsTorus and getShortestPath ran (automation hook)
const insetImage = cacheLast(); // ArrayPlot[costmapcolor]: rebuilt only when the cost map, the path or the current cell changed
const DESCR = { pObs: 'obstacle 1', pObs2: 'obstacle 2', pConfigI: 'start configuration', pConfigF: 'goal configuration' };

Manipulate({
  name: 'bfs-motion-planning',
  initial: initialState,
  ControlActive: true, // the body uses ControlActive[] (coarse grid while dragging)
  body: (s, opts) => { // one evaluation of the Manipulate body (model.js): { state, view }
    const r = evaluate(s, opts);
    if (r.view.searched) searches++;
    if (r.view.walked) walks++;
    return r;
  },
  draw: (v, s) => [
    v.inCollision ? EdgeForm(Red) : EdgeForm(Black),
    armGraphics(v.geometry, v.arcs, { link2Fill: LightGray }),
    obstacleDisks(v.pObsV, W),
    gridInset(insetImage([s.costmap, s.path, v.ccord[0], v.ccord[1]], () => arrayPlotColors(v.costmapcolor))),
    insetFrame(),
    // {Black, Text[θ1, {4.8, -2.2}], Text[θ2, {2.8, 0}], Text[StringForm["robot phase space, path length = `` rads", …]], Text["robot workspace", …]}
    [Black, thetaLabel('1', [4.8, -2.2], 'text-theta1'), thetaLabel('2', [2.8, 0], 'text-theta2'),
      plainText(v.label.text, [4.8, 2.2], 'text-phase'), plainText('robot workspace', [0, 2.2], 'text-workspace')],
    // Locator[pConfigI, If[inCollision, loc[Red], loc[Darker[Green]]]], the same at pConfigF (Q-BF-06)
    configGlyph(s.pConfigI, v.inCollision, 'glyph-start'),
    configGlyph(s.pConfigF, v.inCollision, 'glyph-goal'),
  ],
  // Graphics[{…}, PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize -> {600, 320}] — no plot-range padding (D-BF-04)
  graphics: {
    PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0,
    label: 'Left: the robot workspace with the two-link arm and two obstacles. Right: the robot phase space with the cost map, the shortest path in green and the current cell in blue',
  },
  controls: [
    [['pObs', [1.1, 1.1]], ...OBS_RANGE, Locator],
    [['pObs2', [1.1, -1.1]], ...OBS_RANGE, Locator],
    [['pConfigI', [4.5, 0]], ...CONFIG_RANGE, Locator, { Appearance: None }],
    [['pConfigF', [5.5, 0]], ...CONFIG_RANGE, Locator, { Appearance: None }],
    [['Quality', 2, Style('Q', Italic)], 1, 10, 1, { Appearance: 'Labeled' }],
    [['progress', 1, Style('P', Italic)], 0, 1, 0.01, { Appearance: 'Labeled' }],
  ],
  // one LocatorPane: a press goes to the nearest of the four locators (F-BF-05)
  locators: { appearance: (n, plot) => obstacleGlyph(plot), describe: (n) => `${DESCR[n]} locator; arrow keys move it` },
  hook: { // port addition A-BF-03
    view: (v, s) => ({
      lS: s.lS, lE: s.lE, path: s.path, ccord: v.ccord, Theta1: v.Theta1, Theta2: v.Theta2,
      inCollision: v.inCollision, glyph: v.glyph, label: v.label.text, gridSize: v.gridSize,
      blocked: blockedCount(s.freeConfigSpace), searches, walks, highRes: s.highRes,
      theta1Label: v.geometry.theta1Label.visible, theta2Label: v.geometry.theta2Label.visible,
    }),
    costmap: (m) => () => JSON.parse(JSON.stringify(m.state.costmap, (k, x) => (x === Infinity ? 'Infinity' : x))),
    gridImageSize: (m) => () => m.rasterSize('grid-image'),
  },
});
