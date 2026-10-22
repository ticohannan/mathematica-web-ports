// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm/main.js — the Manipulate: the two configuration locators, the buttons, radius and progress sliders, the
// obstacle checkbox and the Graphics (axes, obstacles, roadmap, path, samples, locator icons, label), on
// shared/manipulate.js (browser only).
import { Manipulate, Locator, Button, None, hookCopy } from '../../shared/manipulate.js';
import {
  Annotation, Polygon, Line, Point, Text, cachedGraphics, Thickness, AbsoluteThickness, CapForm, PointSize,
  AbsolutePointSize, FontSize, GrayLevel, Lighter, Darker, Black, Pink, Magenta, LightBlue, Blue, Green, Red, Purple,
} from '../../shared/graphics.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { configGlyph } from '../common/arm-view.js';
import { initialState, evaluate, TWO_PI, LOC_MIN, LOC_MAX } from './model.js';

// ---- the picture: Graphics[…, Axes -> True, AxesOrigin -> {0,0}, PlotRange -> {{0,2π},{0,2π}}] --------
// PORT DEVIATION (D-PR-01): ImageSize ≈ 380 px estimated from the snapshots. The axes span exactly 0…2π (as in
// prm-2.png); around the plot range the image keeps a margin of about 2 % of the range plus a few px (measured in
// prm-1.png) that holds the tick labels and the PlotLabel. PlotRangeClipping -> False (Mathematica's default):
// wrapped edges and polygons may extend beyond the plot range into that margin, up to the image edge.
const IMAGE = 380;
const PAD = 0.02 * TWO_PI;
const MARGIN_PX = { left: 6, right: 0, bottom: 8, top: 10 }; // as measured in snapshot prm-1.png (labels overlap the padding)
const upx = (TWO_PI + 2 * PAD) / (IMAGE - MARGIN_PX.left - MARGIN_PX.right); // world units per nominal px
const RANGE = [[-PAD - MARGIN_PX.left * upx, TWO_PI + PAD + MARGIN_PX.right * upx], [-PAD - MARGIN_PX.bottom * upx, TWO_PI + PAD + MARGIN_PX.top * upx]];
const COLOUR = { Magenta, LightBlue, Blue, Green, LighterGreen: Lighter(Green) };
const MEDIUM = AbsolutePointSize(5.5); // PointSize[Medium], estimated from the snapshots (D-PR-02)
const axes = cachedGraphics(); // drawn once

/** Axes and ticks only on 0…2π: major ticks 0…6 with labels, minor ticks every 0.2 up to 6.2. */
const axesGraphics = () => {
  const ticks = [];
  for (let k = 0; k <= 31 && k * 0.2 <= TWO_PI; k++) {
    const t = k * 0.2, len = (k % 5 === 0 ? 4 : 2.5) * upx;
    ticks.push([AbsoluteThickness(0.75), Annotation(Line([[t, 0], [t, len]]), 'tick-x'), Line([[0, t], [len, t]])]);
    if (k % 5 === 0) ticks.push([Black, FontSize(11), Annotation(Text(String(k / 5), [t, -9 * upx]), `tick-x-${k / 5}`), Text(String(k / 5), [-7 * upx, t])]);
  }
  return [GrayLevel(0.6), CapForm('Butt'), AbsoluteThickness(1), Annotation(Line([[0, 0], [TWO_PI, 0]]), 'axis-x'),
    Annotation(Line([[0, 0], [0, TWO_PI]]), 'axis-y'), ticks];
};
/** toroidLine pieces: Line[…] in each piece's colour. */
const pieces = (list, id) => list.map((p) => [COLOUR[p.color], Annotation(Line(p.line), id)]);

Manipulate({
  name: 'prm',
  initial: initialState,
  random: true, // A-PR-07: unseeded like the original; ?seed=N for reproducible runs
  body: (s, { rng }) => evaluate(s, rng),
  draw: (v, s) => [
    axes([], axesGraphics),
    s.showConfigObs && [Pink, s.polys.map((poly, i) => Annotation(Polygon(poly), `obstacle-${i + 1}`))], // If[showConfigObs, {Pink, Polygon[polys]}]
    [CapForm('Butt'), pieces(v.edges, 'roadmap-edge'), // toroidLines[edgesNN, LightBlue, Blue]
      v.direct && [Thickness(0.02), pieces(v.direct, 'direct-line')],
      [v.thickConnectors && Thickness(0.02), pieces(v.connectors, 'connector')],
      [Thickness(0.02), pieces(v.pathEdges, 'path-edge')]],
    v.endPoints && [Black, Point(s.qs), Point(s.qf)],
    v.progressPoint && [Purple, PointSize(0.04), Annotation(Point(v.progressPoint), 'progress-point')],
    // Darker[Green], PointSize[Medium], Point[goodPts], Red, Point[badPts]
    [Darker(Green), MEDIUM, s.goodPts.map((p) => Annotation(Point(p), 'good-point')), Red, s.badPts.map((p) => Annotation(Point(p), 'bad-point'))],
    // Locator[qs, If[ptInPolys[polys, qs], loc[Red], loc[Darker[Green]]]], then qf
    configGlyph(s.qs, v.qsInObstacle, 'icon-qs'), configGlyph(s.qf, v.qfInObstacle, 'icon-qf'),
    // PlotLabel -> If[…, "no path possible", StringForm["path length = ``", Round[totdist, .01]]]
    [GrayLevel(0.35), FontSize(13), Annotation(Text(v.label === 'no path possible' ? v.label : `${v.label.prefix}${mmaNumberString(v.label.value)}`,
      [TWO_PI / 2, TWO_PI + PAD - 3 * upx]), 'plot-label')],
  ],
  // Thickness[t] / PointSize[d] are fractions of the total width of the graphic (= this plot range width)
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
