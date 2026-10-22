// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/main.js — the Manipulate: separation slider, link-lengths interval slider, the locator and the
// two pictures of Row[{configuration space, linkage}] as Graphics data, on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, IntervalSlider } from '../../shared/manipulate.js';
import {
  Annotation, Line, Circle, Point, Rectangle, Rotate, Translate, Style, Subscript, Row, Italic, EdgeForm,
  Directive, AbsoluteThickness, AbsolutePointSize, Thickness, CapForm, RGBColor, Black, Red, Blue, Orange, Gray, Brown,
  Darker, Lighter, cachedGraphics,
} from '../../shared/graphics.js';
import { frameLayout } from '../../shared/svg-frame.js';
import { pxSize, axesGraphics, locatorGlyph, notchedArrowhead, clipped, tspanText } from '../common/plot-extras.js';
import {
  useRecordedSamples, initialSettings, evaluate, fromSettings, CSPACE_RANGE, LINKAGE_RANGE, IMAGE_SIZE, CURVE_COLOURS,
  SPACING_SLIDER, LINKS_SLIDER,
} from './fourbar.js';

// PORT DEVIATION (D-FB-04): Mathematica's rendering approximated — Thick curves 2.4 px, Medium text 12 px, default
// arrowheads about 0.0215 of the image width (6.5 px at ImageSize 300), Thin 0.5 px.
const THIN = AbsoluteThickness(0.5), CURVE_PX = 2.4, HEAD = [6.5, 2.6];
// AspectRatio -> 1, ImageSize -> 300, axes through the origin with labels θ, φ: margins for tick and axes labels
const CS_RANGE = frameLayout(CSPACE_RANGE, { imageSize: IMAGE_SIZE, margins: { left: 26, right: 16, top: 18, bottom: 20 } }).plotRange;
const U = pxSize(CS_RANGE, IMAGE_SIZE, 0), UL = pxSize(LINKAGE_RANGE, IMAGE_SIZE, 0); // world units per pixel
const axes = cachedGraphics(); // drawn once
const copy = (x) => JSON.parse(JSON.stringify(x));

/** Arrow[{a, b}] with the notched head (the head first, then the shaft up to the notch, as before). */
function arrow([a, b], id) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!L) return Annotation([], id);
  const { head, notch } = notchedArrowhead(b, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], HEAD[0] * UL, HEAD[1] * UL);
  return Annotation([head, Line([a, notch])], id);
}
/** myArrowArc[c, r, {0, angle}] (demos/common/arrow-arcs.js): a Point, or the B-spline arc with a notched head. */
function arrowArc(arc, id) {
  if (arc.kind === 'Point') return [AbsolutePointSize(3), Point(arc.at)];
  const { head, notch } = notchedArrowhead(arc.tip, arc.direction, HEAD[0] * UL, HEAD[1] * UL);
  return Annotation([head, Line(arc.curve.slice(0, -1).concat([notch]))], id);
}
/** Text[Style["L_k", Medium], pos(, {-1, -1})] as <tspan>s (subscript 0.3em down, 75 %), as before: plot-extras tspanText */
const Lk = (k, pos, offset) => tspanText([{ text: 'L', 'font-style': 'italic' }, { text: k, dy: '0.3em', 'font-size': '75%' }], pos,
  { id: `text-L${k}`, ...(offset && { anchor: 'start', baseline: 'text-after-edge' }) });
const rect = ({ from, to, r = 0 }, id) => Annotation(Rectangle(from, to, { RoundingRadius: r }), id);
const rotated = (g, id) => Annotation(Rotate(Rectangle(g.from, g.to, { RoundingRadius: g.r }), g.angle, g.about), id);

/** Show[plot, Graphics[{Locator[pnear]}]]: axes, the curves (PlotStyle -> Thick, clipped), the glyph, the Epilog text */
const cspace = ({ plot, pnear }) => {
  const m = (CURVE_PX / 2) * U, [[x0, x1], [y0, y1]] = CSPACE_RANGE;
  const lines = plot.text ? plot.text.split('\n') : [];
  return [
    axes([], () => axesGraphics({
      range: CSPACE_RANGE, unitsPerPx: U, majorStep: 1, minorStep: 0.2, axesLabel: ['θ', 'φ'], fontPx: 11, labelColor: [0, 0, 0],
      axesLabelStyle: { italic: true, color: [0.4, 0.4, 0.4] },
    })),
    // PlotRangeClipping -> True; the clip rectangle widened by half the curve width so that curves on the range's edge
    // (φ = ±π) keep their full width, as in the snapshots (§6.5)
    clipped('fb-clip', [[x0 - m, x1 + m], [y0 - m, y1 + m]],
      plot.lines.map((pieces, ci) => Annotation([RGBColor(...CURVE_COLOURS[ci]), AbsoluteThickness(CURVE_PX), ...pieces.map(Line)], `curve-${ci + 1}`))),
    Annotation(Translate(locatorGlyph(U), pnear), 'glyph'), // Locator[pnear]: drawn, not draggable (K-FB-12)
    plot.text && tspanText(lines.map((t, i) => ({ text: t, x: 0, dy: i === 0 ? `${-(lines.length - 1) * 0.6}em` : '1.2em' })),
      [0, 1], { color: Red, id: 'cspace-message' }), // Epilog -> {Style[Text[…, {0, 1}], Red, Medium]}
  ];
};

/** the linkage Graphics, in the original's order (F-FB-17) */
const linkage = (g) => {
  const T = Object.fromEntries(g.texts.map((t) => [t.text, t.at]));
  return [
    [EdgeForm(Directive(THIN, Black)), // EdgeForm[Directive[Thin, Black]] (only the rectangles have edges in the port)
      [Brown, ...g.pivots.map((p, i) => rect(p, `pivot-${i + 1}`)), rect(g.ground, 'ground')],
      [Darker(Gray), rotated(g.crank, 'crank')], [Gray, rotated(g.rockerRect, 'rocker')]],
    [Lighter(Gray), CapForm('Round'), Thickness(0.02), Annotation(Line(g.coupler), 'coupler')],
    ...g.arrows.map((a, i) => arrow(a, `separation-arrow-${i + 1}`)), Lk('4', T.L4),
    [THIN, ...g.refLines.map(Line)], // ref lines for angle arcs
    ...[[Blue, g.blue, 'θ', 'theta', '1'], [Red, g.red, 'φ', 'phi', '3']].map(([col, part, sym, name, k]) => {
      const c = col === Blue ? 'blue' : 'red';
      return [col, Annotation(Circle(part.circle.c, part.circle.r), `circle-${c}`), Annotation(Line(part.line), `line-${c}`),
        arrowArc(part.arc, `arc-${c}`), tspanText([{ text: sym, 'font-style': 'italic' }], T[sym], { color: col, id: `text-${name}` }), Lk(k, T[`L${k}`])];
    }),
    [Orange, Annotation(Circle(g.orange.circle.c, g.orange.circle.r), 'circle-orange'), Annotation(Line(g.orange.line), 'line-orange')],
    Lk('2', T.L2, true),
  ];
};

// ---- start: the original's recorded samples (§6.3), then the Manipulate -------------------------------------------
fetch('./recorded-samples.json').then((r) => {
  if (!r.ok) throw new Error(`recorded-samples.json: HTTP ${r.status}`);
  return r.json();
}).then((table) => {
  useRecordedSamples(table);
  const L = (k) => Subscript(Style('L', Italic), k);
  const m = Manipulate({
    name: 'four-bar-linkage',
    initial: initialSettings, // the live state = snapshot 1's Settings (F-FB-13)
    body: evaluate,
    draw: (v, s) => [cspace(s), linkage(v.linkage)], // Row[{Show[plot, Graphics[{Locator[pnear]}]], Graphics[…]}]
    graphics: [
      { PlotRange: CS_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, id: 'cspace', testid: 'cspace-svg', label: 'Configuration space: the angles (θ, φ) the linkage can take' },
      // PlotRange -> {{-1.25, 2}, {-1.5, 1.5}}, explicit: no padding, everything outside is cut (snapshot 1: the blue circle at x −1.25)
      { PlotRange: LINKAGE_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, id: 'linkage', testid: 'linkage-svg', label: 'The four-bar linkage in the selected configuration' },
    ],
    controls: [
      ['pnear', null, None], ['plot', null, None], ['pvals', null, None],
      // {{p, {-.9, -1}}, Locator, Appearance -> None}: invisible, in the configuration-space plot. PORT DEVIATION (D-FB-07):
      // LocatorPane picking; p limited to the plot range [-π, π]² (K-FB-07); one evaluation per frame while dragging (D-FB-06)
      [['p', [-0.9, -1]], [-Math.PI, -Math.PI], [Math.PI, Math.PI], Locator, { Appearance: None }],
      [['spacingOld', -1], None], [['linksOld', [-1, -1]], None],
      // {{spacing, 0.75, Row[{"separation (", Subscript[Style["L", Italic], 4], ")"}]}, 0, 1.5, .05, ImageSize -> 180, Appearance -> "Labeled"}
      [['spacing', 0.75, Row(['separation (', L(4), ')'])], SPACING_SLIDER.min, SPACING_SLIDER.max, SPACING_SLIDER.step,
        { Appearance: 'Labeled', label: 'separation (L4)' }], // label: the plain text (aria-label) as before
      // {{links, {1.35, 2}, Row[{"link lengths (", L1, ",", L2, ",", L3, ")"}]}, 0, 2.49, 0.05, ControlType -> IntervalSlider,
      //  Method -> "Push", MinIntervalSize -> 0.1, Appearance -> "Labeled", ImageSize -> {300, 20}}
      [['links', [1.35, 2], Row(['link lengths (', L(1), ',', L(2), ',', L(3), ')'])], LINKS_SLIDER.min, LINKS_SLIDER.max, LINKS_SLIDER.step, {
        ControlType: IntervalSlider, Method: 'Push', MinIntervalSize: LINKS_SLIDER.minIntervalSize, Appearance: 'Labeled',
        label: 'link lengths (L1,L2,L3)', trackPress: true, look: 'mma', // the snapshots' colours (D-FB-05)
      }],
    ],
    locators: { describe: () => 'configuration locator (θ, φ); arrow keys move it' },
    hook: { // port addition A-FB-03
      view: (v, s) => ({
        lenlengths: v.lenlengths, impossibleLinks: v.impossibleLinks, Thetav: v.Thetav, Phiv: v.Phiv, Alpha: v.Alpha,
        resampled: v.resampled, crankTip: v.linkage.crankTip, couplerEnd: v.linkage.couplerEnd, rockerTip: v.linkage.rockerTip,
        lines: s.plot.lines.map((c) => c.map((x) => x.length)), text: s.plot.text, linksText: m.controls.get('links').text(),
      }),
      getState: (ctx) => () => copy({ ...ctx.state, plot: undefined, pvalsCount: ctx.state.pvals.length }),
      /** every sample point Flatten[pvals, 1] in record order */
      samples: (ctx) => () => copy(ctx.state.pvals.flat(1)),
      /** move the locator p to (θ, φ), as one front-end update */
      moveLocator: (ctx) => (p) => { ctx.moveLocator('p', p); return copy(ctx.state.pnear); },
      /** assign Manipulate variables (a snapshot's Settings may be passed whole); linksExact: exactness of the shown links */
      setState: (ctx) => (partial, { linksExact } = {}) => {
        const p = copy(partial);
        ctx.setState(p.plot && (p.plot.head || p.plot.h) ? fromSettings({ ...ctx.state, ...p }) : p, { moved: true, exact: linksExact });
      },
      linkageToClient: (ctx) => (p) => ctx.plots[1].worldToClient(p),
    },
  });
}).catch((e) => {
  const n = document.createElement('div');
  Object.assign(n, { className: 'requirements-notice', textContent: `This demonstration could not start: ${e.message}` });
  n.dataset.testid = 'requirements-notice';
  document.getElementById('cspace').append(n);
  throw e;
});
