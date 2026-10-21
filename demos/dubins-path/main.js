// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-path/main.js — the Manipulate: progress and r_min sliders, goal and heading locators, the Graphics
// (cars, turning circles, the six candidate paths, the shortest path, label), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import {
  Annotation, Inset, Graphics, Line, Circle, Text, Raw, Style, Subscript, Italic, AbsoluteThickness, AbsoluteDashing, CapForm,
  Thickness, FontSize, Opacity, RGBColor, Black, Gray, Red, Lighter,
} from '../../shared/graphics.js';
import { NAMED, darker } from '../../shared/mma-colors.js';
import { drawCar, drawCarSvg } from '../common/car-icon.js';
import { initialState, evaluate, WORD_COLOURS, PLOT_RANGE, GOAL_RANGE } from './dubins.js';

const rgb = (c) => RGBColor(...c);
const COLOUR = { ...WORD_COLOURS, DarkerYellow: darker(NAMED.Yellow), DarkerGreen: darker(NAMED.Green) };
const THIN = AbsoluteThickness(0.25); // Thin = AbsoluteThickness[0.25] (D-DP-03)
const DASHED = AbsoluteDashing([4, 4]); // Dashed, measured on snapshot 1: dashes and gaps of about 4 px (D-DP-03)
const CAR = { lights: true, beam: 4, headlightEdge: null }; // headlights with EdgeForm[None] (F-DP-15)
const PLOT_BOX = [[PLOT_RANGE[0][0], PLOT_RANGE[1][0]], [PLOT_RANGE[0][1], PLOT_RANGE[1][1]]];
const DESCR = { goalXY: 'goal position', goalThetaloc: 'goal heading' };

/** drawCar[xy, Theta, Alpha, opac] in a colour (demos/common/car-icon.js, not yet written as Graphics data). */
const car = (c, xy, theta, alpha, opac, id) => Raw((plot, g) => drawCarSvg(plot, g, drawCar(xy, theta, alpha, opac, CAR), { colour: c, testid: id }));

/** One word's drawing: Circle[c, r, {a1, a2}] between its two angles, Line[{from, to}]. */
const word = (d, id) => Annotation([rgb(COLOUR[d.colour]),
  ...d.pieces.map((p) => (p.kind === 'arc' ? Circle(p.c, p.r, [p.a1, p.a2]) : Line([p.from, p.to])))], id, { 'data-word': d.word });

/** Locator[goalThetaloc, Graphics[{Red, four reticle arms, CircleBox[{-0.5, 0.5}, 5], {AbsoluteThickness[3], Opacity[0.3], CircleBox[…, 3]}}, ImageSize -> 17, PlotRange -> {{-8, 8}, {-8, 8}}]] */
const headingGlyph = (p) => Inset(Graphics([Red, AbsoluteThickness(1),
  Line([[[0, -8], [0, -2]], [[0, 2], [0, 8]], [[-8, 0], [-2, 0]], [[2, 0], [8, 0]]]), // LineBox arms clipped to ±8
  Circle([-0.5, 0.5], 5), [AbsoluteThickness(3), Opacity(0.3), Circle([-0.5, 0.5], 3)],
], { PlotRange: [[-8, 8], [-8, 8]], ImageSize: 17 }), p);

Manipulate({
  name: 'dubins-path',
  initial: initialState,
  body: evaluate,
  draw: (v, s) => [
    car(NAMED.Green, [0, 0], 0, 0, 0.2, 'start-car'), // {Green, drawCar[{0,0},0,0,0.2]}
    car(NAMED.Red, s.goalXY, s.Theta, 0, 0.2, 'goal-car'), // {Red, drawCar[goalXY,Theta,0,0.2]}
    Annotation(headingGlyph(s.goalThetaloc), 'heading-glyph'),
    // {Thin, Gray, Dashed, Circle[csL, r], Circle[csR, r], Circle[ceL, r], Circle[ceR, r]}
    [THIN, Gray, DASHED, CapForm('Butt'), ...['csL', 'csR', 'ceL', 'ceR'].map((n) => Annotation(Circle(v[n], s.minRadius), `turning-circle-${n}`))],
    // {Thin, dLSL[[2]], …, dRLR[[2]]} (a word that does not exist draws nothing)
    [THIN, ...v.words.map(([len, d]) => Number.isFinite(len) && d && word(d, `candidate-${d.word}`))],
    // {Black, Style[Text[StringForm["`` path length, `` distance", …], {0, 8}], FontSize -> 14]}
    [Black, FontSize(14), Annotation(Text(v.label, [0, 8]), 'plot-label')],
    [Thickness(0.005), word(v.shortestPath[1], 'shortest-path')], // {Thickness[0.005], shortestPath[[2]]}
    car(NAMED.Blue, v.car.xyP, v.car.angP, v.car.Alpha, 0.8, 'moving-car'), // {Blue, drawCar[xyP, angP, Alpha, 0.8]}
  ],
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

