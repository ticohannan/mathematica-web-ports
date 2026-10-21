// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-motion-obstacles/main.js — the Manipulate: the Q slider, the three locators and the Graphics (arm,
// obstacles, phase-space inset, texts, configuration glyph), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, cacheLast } from '../../shared/manipulate.js';
import { EdgeForm, Style, Italic, Black, Red, Gray } from '../../shared/graphics.js';
import { PLOT_RANGE, IMAGE_SIZE, W, OBS_RANGE, CONFIG_RANGE, arrayPlotColors } from '../common/arm-grid.js';
import { armGraphics, obstacleDisks, gridInset, insetFrame, thetaLabel, plainText, configGlyph, obstacleGlyph } from '../common/arm-view.js';
import { initialState, evaluate, blockedCount } from './model.js';

const gridImage = cacheLast(); // the phase-space image is rebuilt only when freeConfigSpace changes
const DESCR = { pObs: 'obstacle 1', pObs2: 'obstacle 2', pConfig: 'configuration (phase space)' };

Manipulate({
  name: 'robot-motion-obstacles',
  initial: initialState,
  ControlActive: true, // the body uses ControlActive[] (coarse grid while dragging)
  body: evaluate, // one evaluation of the Manipulate body (model.js): { state, view }
  draw: (v, s) => [
    v.inCollision ? EdgeForm(Red) : EdgeForm(Black),
    armGraphics(v.geometry, v.arcs, { link2Fill: Gray }),
    obstacleDisks(v.pObsV, W),
    Array.isArray(s.freeConfigSpace) && gridInset(gridImage([s.freeConfigSpace], () => arrayPlotColors(s.freeConfigSpace))),
    insetFrame(),
    // Text[θ1, {4.8, -2.2}], Text[θ2, {2.8, 0}], "robot phase space", "robot workspace" — in Gray (the list's first directive)
    [Gray, thetaLabel('1', [4.8, -2.2], 'text-theta1'), thetaLabel('2', [2.8, 0], 'text-theta2'),
      plainText('robot phase space', [4.8, 2.25], 'text-phase'), plainText('robot workspace', [0, 2.25], 'text-workspace')],
    configGlyph(s.pConfig, v.inCollision, 'glyph-config'), // Locator[pConfig, If[inCollision, loc[Red], loc[Darker[Green]]]]
  ],
  // Graphics[{…}, PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize -> {600, 320}] — no plot-range padding (D-RM-05)
  graphics: {
    PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0,
    label: 'Left: the robot workspace with the two-link arm and two obstacles. Right: the robot phase space (θ1, θ2) with the configurations that collide in black',
  },
  controls: [
    [['pObs', [1.1, 1.1]], ...OBS_RANGE, Locator],
    [['pObs2', [1.1, -1.1]], ...OBS_RANGE, Locator],
    [['pConfig', [5, 0]], ...CONFIG_RANGE, Locator, { Appearance: None }],
    [['Quality', 2, Style('Q', Italic)], 1, 10, 1, { Appearance: 'Labeled' }],
  ],
  // the Locator controls form one LocatorPane: a press goes to the nearest locator (F-RM-04)
  locators: { appearance: (n, plot) => obstacleGlyph(plot), describe: (n) => `${DESCR[n]} locator; arrow keys move it` },
  hook: { // port addition A-RM-03
    view: (v, s) => ({
      Theta1: v.Theta1, Theta2: v.Theta2, inCollision: v.inCollision, glyph: v.glyph, gridSize: v.gridSize,
      blocked: blockedCount(s.freeConfigSpace), recomputed: v.recomputed, resolution: v.resolution ?? null,
      theta1Label: v.geometry.theta1Label.visible, theta2Label: v.geometry.theta2Label.visible, highRes: s.highRes,
    }),
    gridImageSize: (m) => () => m.rasterSize('grid-image'),
  },
});
