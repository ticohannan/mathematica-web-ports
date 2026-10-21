// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/art-gallery/main.js — the Manipulate: number of guards, environment, ten locators and the Graphics (visible
// regions, environment, guards), on shared/manipulate.js (browser only).
import { Manipulate, Locator, None } from '../../shared/manipulate.js';
import { Annotation, Polygon, Disk, EdgeForm, Directive, Opacity, Transparent, Thin, Thick, RGBColor, Black, Gray } from '../../shared/graphics.js';
import { initialState, evaluate, ENVIRONMENTS, GUARD_COUNTS, GUARD_COLORS, PLOT_RANGE, IMAGE_SIZE, GUARD_RADIUS } from './model.js';
// PORT DEVIATION (D-AG-03): Thin and Thick as absolute widths at the 450-pixel image size (measured in the
// snapshots); FrameMargins -> -5 is not reproduced.
const INIT = initialState();
const cval = GUARD_COLORS.map((c) => RGBColor(...c));

/** The environment's polygons as the original draws them (testid per polygon). */
function environment(reg, env) {
  // {Transparent, EdgeForm[Thin], {Polygon@bound}, {Polygon@poly1, Polygon@poly2}}
  if (reg === 'movable obstacles') {
    return [Transparent, EdgeForm(Directive(Black, Thin)),
      Annotation(Polygon(env.bound), 'env-bound'), Annotation(Polygon(env.poly1), 'env-square'), Annotation(Polygon(env.poly2), 'env-triangle')];
  }
  // {Transparent, EdgeForm[Thin], Polygon@irregularPoly}
  if (reg === 'irregular') return [Transparent, EdgeForm(Directive(Black, Thin)), Annotation(Polygon(env.listofPoly[0]), 'env-irregular')];
  // {Transparent, EdgeForm[{Opacity[0.7], Gray, Thick}], Polygon@cubiclePoly}
  return [Transparent, EdgeForm(Directive(Opacity(0.7), Gray, Thick)), Annotation(Polygon(env.listofPoly[0]), 'env-cubicle')];
}

const describe = (name) => {
  const k = Number(name.slice(4)) - 1;
  if (k === 0) return 'square obstacle locator (pts 1); arrow keys move it';
  if (k === 1) return 'triangle obstacle locator (pts 2); arrow keys move it';
  return `guard ${k - 1} locator (pts ${k + 1}); arrow keys move it`;
};

Manipulate({
  name: 'art-gallery',
  initial: initialState,
  body: evaluate,
  draw: (v, { s, reg, pts, visibleRegion }) => [
    // Table[{cval[[i]], Opacity[0.3], Polygon@visibleRegion[[i]]}, {i, 1, s}]; a symbolic region draws nothing (D-AG-01);
    // fill rule not verified (D-AG-07, K-AG-06)
    ...visibleRegion.slice(0, s).map((r, i) => r && [cval[i], Opacity(0.3), Annotation(Polygon(r), `region-${i + 1}`, { 'fill-rule': 'evenodd' })]),
    environment(reg, v.env),
    // Table[{cval[[i]], EdgeForm[{Thin, Black}], Disk[pts[[i+2]], 0.1]}, {i, 1, s}]
    ...pts.slice(2, s + 2).map((p, i) => [cval[i], EdgeForm(Directive(Thin, Black)), Annotation(Disk(p, GUARD_RADIUS), `guard-${i + 1}`)]),
  ],
  // Graphics[…, PlotRange -> 4{{-1,1},{-1,1}}, ImageSize -> {450, 450}] (explicit PlotRange: no padding)
  graphics: { PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, label: 'Gallery with the guards (coloured disks) and the region each guard sees (tinted in its colour)' },
  controls: [
    // {{pts, {…}}, 4{-1,-1}, 4{1,1}, Locator, Appearance -> None}: ten invisible locators, all of them draggable whatever
    // the environment and the number of guards (ORIGINAL QUIRK Q-AG-04); a press anywhere moves the nearest (LocatorPane).
    // PORT DEVIATION (D-AG-04): the body is evaluated once per animation frame during a drag.
    [['pts', INIT.pts], [-4, -4], [4, 4], Locator, { Appearance: None }],
    [['s', INIT.s, 'number of guards'], GUARD_COUNTS],
    [['reg', INIT.reg, 'environment'], ENVIRONMENTS],
  ],
  locators: { describe },
  hook: { // port addition A-AG-03
    view: (v) => ({ recomputed: v.recomputed, traces: v.traces, ms: v.ms }),
    /** move locator n (1…10 = pts[[n]]) to world point p, as one front-end update */
    moveLocator: (m) => (n, p) => { m.moveLocator(`pts-${n}`, p); return window.__demo.getState(); },
    colors: () => () => JSON.parse(JSON.stringify(GUARD_COLORS)),
  },
});
