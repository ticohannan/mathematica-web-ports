// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Yitong Lu and Daniel Biediger
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/graham-scan/model.js — one evaluation of the Manipulate body of "Graham Scan to Find the Convex Hull of a Set
// of Points in 2D": the state in, { state, view, graphics } out (pure, no DOM). Simple mode: plain arithmetic.
import { Graphics, Line, Point, Red, Blue, Hue, Thick, Dashed, PointSize, Annotation } from '../../shared/graphics.js';
import { MinimalBy, MaximalBy, First, Last, Most, Length, Ordering } from '../../shared/wl.js';

/** The 20 points stored in the original notebook (its RandomReal[{-1, 1}, {20, 2}] at publication). */
export const SAVED_POINTS = [
  [-0.8595715668325075, 0.2844922924869695],
  [-0.18345585263908903, -0.00951348699160759],
  [0.864658597435938, -0.07068572015441621],
  [0.18446003900583907, -0.9062300788599562],
  [-0.5722401211969039, 0.13925646435687788],
  [-0.2503088750081415, 0.9413617821604467],
  [0.17757808190290314, -0.23853526069110842],
  [-0.2775660433045122, 0.22396726758187624],
  [-0.8955626744953715, 0.23884463467919081],
  [-0.9521593687452885, 0.6704469530334931],
  [-0.6896362093106889, 0.5030782524689568],
  [0.8883573404360154, 0.4351106165707179],
  [0.8851724679595288, 0.5183362325112526],
  [-0.46606365247373915, -0.05500595312180989],
  [0.5103366124221749, -0.5610960754060939],
  [-0.708472636268703, 0.5057850891576994],
  [-0.8728857872509117, -0.07619646743603559],
  [0.3575252645164766, -0.13038913770492533],
  [-0.5183216147880731, -0.02632548422616532],
  [0.4512660843907086, 0.7956710654862125],
];
export const initialState = () => ({ Allpts: SAVED_POINTS.map((p) => [...p]), iMax: 1, n: 20 });

/** isLeftTurn[p, q, r] = 0.5 Det[{{px, qx, rx}, {py, qy, ry}, {1, 1, 1}}]: the signed area of the triangle pqr. */
export const isLeftTurn = ([px, py], [qx, qy], [rx, ry]) => 0.5 * (px * (qy - ry) - qx * (py - ry) + rx * (py - qy));

export function evaluate(state) {
  const { Allpts } = state;
  let iMax = state.iMax;
  // the lowest point; of several, the rightmost
  let stPt = First(MaximalBy(MinimalBy(Allpts, Last), First));
  const at = Allpts.findIndex((p) => p === stPt);
  const pts = Allpts.filter((_, i) => i !== at);
  stPt = [stPt[0], stPt[1] - 0.001]; // the original's nudge: no other point has the start's y
  const slopeOrder = Ordering(pts.map((p) => (p[1] === stPt[1] ? -Infinity : (stPt[0] - p[0]) / (p[1] - stPt[1]))));
  if (iMax > Length(pts)) iMax = Length(pts);
  const sorted = (i) => pts[slopeOrder[i - 1] - 1];
  let hull = [stPt, sorted(1)];
  let droppedLines = [];
  for (let i = 2; i <= iMax; i++) {
    droppedLines = [];
    while (hull.length >= 2 && isLeftTurn(hull.at(-2), hull.at(-1), sorted(i)) < 0) {
      droppedLines.push([hull.at(-2), hull.at(-1)]);
      hull = hull.slice(0, -1);
    }
    hull.push(sorted(i));
  }
  if (iMax === Length(pts)) hull.push(stPt);
  const graphics = Graphics([
    [Dashed, Red, Annotation(Line(droppedLines), 'dropped')],
    [Thick, Blue, Annotation(Line(Most(hull)), 'hull'), Dashed, Annotation(Line([hull.at(-1), hull.at(-2)]), 'hull-last')],
    Annotation(Array.from({ length: iMax }, (_, k) => [Hue(k / (1.1 * Length(pts))), Line([stPt, sorted(k + 1)])]), 'rays'),
    PointSize('Medium'), Annotation(Point(pts), 'points'), Red, Annotation(Point(stPt), 'start'),
  ], { PlotRange: [[-1.05, 1.05], [-1.05, 1.05]], ImageSize: 440 });
  return {
    state: { ...state, iMax },
    view: { start: stPt, order: slopeOrder, hull, dropped: droppedLines, iMax, count: Allpts.length },
    graphics,
  };
}
