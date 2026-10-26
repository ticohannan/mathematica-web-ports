// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Yitong Lu and Daniel Biediger
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/graham-scan.test.js — the model of "Graham Scan to Find the Convex Hull of a Set of Points in 2D": the
// opening state from the notebook, the scan step by step on hand-made point sets, and the finished hull checked against
// an independent convex hull (shared/geometry.js) at the notebook's five snapshot settings.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialState, evaluate, isLeftTurn, SAVED_POINTS } from '../../demos/graham-scan/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { ConvexHull } from '../../shared/geometry.js';

const saved = JSON.parse(readFileSync(new URL('../golden/graham-scan.original-states.json', import.meta.url), 'utf8'));
const key = (p) => `${p[0]},${p[1]}`;

describe('graham-scan model', () => {
  it('the opening state: the 20 points, step 1 and n = 20 stored in the notebook', () => {
    expect(initialState()).toEqual({ Allpts: SAVED_POINTS, iMax: 1, n: 20 });
    expect(SAVED_POINTS).toEqual(saved.specs.Allpts);
    expect(saved.specs.iMax).toBe(1);
    expect(saved.specs.n).toBe(20);
  });
  it('isLeftTurn is the signed area of the triangle: positive for a left turn', () => {
    expect(isLeftTurn([0, 0], [1, 0], [1, 1])).toBe(0.5);
    expect(isLeftTurn([0, 0], [1, 0], [1, -1])).toBe(-0.5);
    expect(isLeftTurn([0, 0], [1, 1], [2, 2])).toBe(0);
  });
  it('start: the lowest point (rightmost of ties) nudged down by 0.001; the others sorted by −run/rise', () => {
    const pts = [[0, 1], [1, 0], [-1, 0], [2, 2], [0.5, 0.5]];
    const { view } = evaluate({ Allpts: pts, iMax: 1, n: 5 });
    expect(view.start).toEqual([1, -0.001]);
    // keys (1 − x)/(y + 0.001): [0,1] 0.999…, [-1,0] 2000, [2,2] −0.4998, [0.5,0.5] 0.998: ascending
    expect(view.order.map((i) => [[0, 1], [-1, 0], [2, 2], [0.5, 0.5]][i - 1])).toEqual([[2, 2], [0.5, 0.5], [0, 1], [-1, 0]]);
  });
  it('step by step: a right turn pops the stack and the popped edges are reported (only those of the last step)', () => {
    // square with an inner point: start (0,0); sorted: (2,0)… the inner point (1,0.5) is popped when (2,2) arrives
    const pts = [[0, 0], [2, 0.0005], [1, 0.5], [2, 2], [0, 2]];
    const steps = [1, 2, 3, 4].map((i) => evaluate({ Allpts: pts, iMax: i, n: 5 }).view);
    expect(steps[0].hull.length).toBe(2);
    expect(steps[1].dropped).toEqual([]);
    expect(steps[2].dropped.length).toBe(1);
    expect(steps[2].dropped[0][1]).toEqual([1, 0.5]);
    expect(steps[3].dropped).toEqual([]);
    // the last step closes the hull with the start point
    expect(steps[3].hull.at(-1)).toEqual(steps[3].hull[0]);
    expect(steps[3].hull.slice(1, -1)).toEqual([[2, 0.0005], [2, 2], [0, 2]]);
  });
  it('the step is clamped to the number of other points (the body sets iMax, as the original)', () => {
    const r = evaluate({ Allpts: [[0, 0], [1, 1], [-1, 1]], iMax: 9, n: 3 });
    expect(r.state.iMax).toBe(2);
    expect(r.view.iMax).toBe(2);
  });
  it('the picture: dashed red dropped edges, thick blue hull, one ray per step in Hue[(i−1)/(1.1 n)], points, red start', () => {
    const { graphics } = evaluate({ ...initialState(), iMax: 5 });
    expect(Cases(annotation(graphics, 'rays').g, 'Line').length).toBe(5);
    const rayColours = [];
    Cases(annotation(graphics, 'rays').g, (q, st) => { if (q.head === 'Line') rayColours.push([...st.color]); return false; });
    expect(rayColours[0]).toEqual([1, 0, 0]); // Hue[0]
    expect(annotation(graphics, 'points').g.pts.length).toBe(19);
    expect(annotation(graphics, 'start').style.color).toEqual([1, 0, 0]);
    expect(annotation(graphics, 'hull').style.color).toEqual([0, 0, 1]);
    expect(annotation(graphics, 'dropped').style.dash).toBeTruthy();
    expect(graphics.options.PlotRange).toEqual([[-1.05, 1.05], [-1.05, 1.05]]);
  });
  for (const [id, s] of Object.entries(saved.snapshots)) {
    it(`snapshot ${id} (${s.Allpts.length} points, step ${s.iMax}): the finished scan is the convex hull`, () => {
      const pts = s.Allpts;
      const done = evaluate({ Allpts: pts, iMax: pts.length - 1, n: s.n }).view;
      const expected = new Set(ConvexHull(pts).map(key));
      // the scan's hull vertices (start un-nudged) are exactly the independent hull's
      const start = done.hull[0], low = [start[0], start[1] + 0.001];
      const got = new Set(done.hull.slice(1, -1).map(key).concat(key(pts.find((p) => p[0] === low[0] && Math.abs(p[1] - low[1]) < 1e-12))));
      expect(got).toEqual(expected);
      expect(evaluate({ Allpts: pts, iMax: s.iMax, n: s.n }).view.iMax).toBe(Math.min(s.iMax, pts.length - 1));
    });
  }
});
