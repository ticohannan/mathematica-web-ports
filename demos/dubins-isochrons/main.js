// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-isochrons/main.js — the Manipulate: plot parameters r, t, set and the car controls path, τ, p (on the
// left), and Show[{plotReach, Graphics[epiGraphics]}] as Graphics data (epiGraphics from isochrons.js), on
// shared/manipulate.js (browser only).
import { Manipulate, Delimiter, None } from '../../shared/manipulate.js';
import { Annotation, Polygon, Line, Raw, Style, Row, Italic, Opacity, AbsoluteThickness, RGBColor, Gray, cachedGraphics } from '../../shared/graphics.js';
import { svgNode } from '../../shared/svg-plot.js';
import { css } from '../../shared/mma-colors.js';
import { pxSize, axesGraphics } from '../../shared/graphics-extras.js';
import { initialState, evaluate, epiGraphics, SHOW_RANGE, SETS, PATHS, PLOT_ORDER, PLOT_COLOURS } from './isochrons.js';

const COL = Object.fromEntries(PLOT_ORDER.map((w) => [w, RGBColor(...PLOT_COLOURS[w])]));
const axes = cachedGraphics(), plotPart = cachedGraphics(); // the axes once; plotReach only when it changes
const fmt = (x) => (Math.round(x * 1e4) / 1e4).toString();
const pathD = (polys) => polys.map((q) => `M${q.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join('L')}Z`).join('');

/** plotReach: ParametricPlot of the four isochrons with the Prolog's grey polygons, or the four "≤" regions */
const plotReach = (pr) => (pr.set === '=' ? [
  // Prolog -> {{Opacity[0.4], Gray, Polygon[…], Polygon[…]}}: each self-intersecting polygon filled by the even-odd rule
  ...pr.polygons.map((P, i) => [Opacity(0.4), Gray, Annotation(Polygon(P), `grey-band-${i + 1}`, { 'fill-rule': 'evenodd', 'data-points': P.length })]),
  ...PLOT_ORDER.map((w) => [COL[w], AbsoluteThickness(1.6), Annotation(Line(pr.curves[w]), `isochron-${w}`)]),
] : [
  // each region one translucent union (TransparentPolygonMesh): all its quads as one non-zero path, in a group at
  // opacity 0.3 (as data, separate polygons would show seams between the quads, hence Raw), then the boundaries opaque
  ...PLOT_ORDER.map((w) => Annotation(Raw((plot, g) => g.appendChild(svgNode('path', {
    d: pathD(pr.regions[w].quads), fill: css(PLOT_COLOURS[w]), 'fill-rule': 'nonzero', stroke: 'none',
  }))), `region-${w}`, { opacity: 0.3 })),
  ...PLOT_ORDER.map((w) => [COL[w], AbsoluteThickness(1), Annotation(Line(pr.regions[w].boundary), `region-boundary-${w}`)]),
]);

const m = Manipulate({
  name: 'dubins-isochrons',
  initial: initialState, // the live state = the initial settings, with plotReach computed (F-DI-14, D-DI-10)
  // Show[{plotReach, Graphics[epiGraphics]}, AspectRatio -> Automatic, ImageSize -> {440}, AxesOrigin -> {0, 0},
  //   PlotRange -> {{-15, 15}, {-16, 16}}]; axes with automatic ticks in front of the plot (F-DI-15); epiGraphics as
  //   data from isochrons.js
  body: (st) => {
    const { state, view } = evaluate(st);
    return { state, view, graphics: [plotPart([state.plotReach], () => plotReach(state.plotReach)), axes([], () => axesGraphics({
      range: [[-16.5, 16.5], [-17.6, 17.6]], unitsPerPx: pxSize(SHOW_RANGE, 440, 0.05), fontPx: 11, thicknessPx: 1,
      color: [0.6, 0.6, 0.6], labelColor: [0.2, 0.2, 0.2],
    })), epiGraphics(state.r, view)] };
  },
  graphics: { PlotRange: SHOW_RANGE, ImageSize: 440, PlotRangePadding: 0.05, label: 'Isochrons (or reachable regions) of a Dubins car with the path and the car at time p t / 100' },
  controls: [ // ControlPlacement -> Left
    'plot parameters', // Style["plot parameters", 12]
    [['r', 2, Row([Style('r', Italic), ' (m)'])], 0.5, 10, { Appearance: 'Labeled', ImageSize: 100 }],
    ['rold', 1, None],
    [['t', 10, Row([Style('t', Italic), ' (s)'])], 0.1, 14, { Appearance: 'Labeled', ImageSize: 100 }],
    ['told', 1, None], ['plotReach', 1, None],
    [['set', '=', 'set'], SETS], // Row[{Control@{set, {"=", "<="}}, Style[" t", Italic]}] (the suffix is added below)
    Delimiter,
    'move car', // Style["move car", 12]
    ['setold', 1, None],
    [['path', 'RS', 'path'], PATHS], // Row[{Control@{path, {"RS", "LS", "LR", "RL"}}}]
    [['tau', 0.5, 'τ (s)'], 0, 14, 0.01, { Appearance: 'Labeled', ImageSize: 100 }],
    [['p', 100, Row([Style('p', Italic), ' (%)'])], 0, 100, 1, { Appearance: 'Labeled', ImageSize: 100 }],
  ],
  hook: { // port addition A-DI-02
    view: (v, { plotReach: pr }) => ({
      fs: v.fs, maxAlpha: v.maxAlpha, cxy: v.cxy, cTheta: v.cTheta, cAlpha: v.cAlpha, pathGraphics: v.pathGraphics, polySteps: v.polySteps,
      plot: pr.set === '='
        ? { set: '=', t: pr.t, r: pr.r, curvePoints: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.curves[w].length])), polygonPoints: pr.polygons.map((P) => P.length), polygons: pr.polygons, firstPoints: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.curves[w][0]])) }
        : { set: pr.set, t: pr.t, r: pr.r, regionQuads: Object.fromEntries(PLOT_ORDER.map((w) => [w, pr.regions[w].quads.length])) },
    }),
    getState: (ctx) => () => { const { plotReach, ...rest } = ctx.state; return JSON.parse(JSON.stringify(rest)); },
    setState: (ctx) => (partial) => { ctx.setState(JSON.parse(JSON.stringify(partial))); }, // returns nothing, as before (no plotReach copy)
  },
});
const suffix = document.createElement('span');
Object.assign(suffix, { className: 'set-suffix', textContent: 't' });
m.controls.get('set').row.append(suffix);
