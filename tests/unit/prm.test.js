// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/prm.test.js — model of "Probabilistic Roadmap Method" (one evaluation of the Manipulate body).
// Expected values are derived by hand from the original's code (R-16).
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, makePolys, pathOKT, clampLoc, TWO_PI, DELTA, LOC_MIN, LOC_MAX } from '../../demos/prm/model.js';
import { createRng, replayRng } from '../../shared/random.js';

const S3 = Math.sqrt(3) / 2;
// a fixed obstacle set: one triangle CirclePoints[3] centred at {3, 3} (vertices {3±√3/2, 2.5}, {3, 4})
const TRI = makePolys([3], [[3, 3]]);
const fixed = (extra = {}) => ({ ...initialState(), restart: false, polySides: [3], polyXY: [[3, 3]], polys: TRI, polyN: 1, ...extra });

describe('prm: obstacles and restart', () => {
  it('makePolys shifts the exact CirclePoints[n] by polyXY (flat bottom edge, counter-clockwise)', () => {
    expect(TRI[0]).toEqual([[3 + S3, 2.5], [3, 4], [3 - S3, 2.5]]);
    const sq = makePolys([4], [[0, 0]])[0];
    expect(sq[0][0]).toBeCloseTo(Math.SQRT1_2, 15);
    expect(sq[0][1]).toBeCloseTo(-Math.SQRT1_2, 15);
  });
  it('the first evaluation (restart = True) draws 4 random regular polygons with 3 to 7 sides and no samples', () => {
    const { state } = evaluate(initialState(), createRng({ seed: 5 }));
    expect(state.restart).toBe(false);
    expect(state.polys.length).toBe(4);
    state.polySides.forEach((n, i) => { expect(n).toBeGreaterThanOrEqual(3); expect(n).toBeLessThanOrEqual(7); expect(state.polys[i].length).toBe(n); });
    state.polyXY.flat().forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(TWO_PI); });
    expect([state.pts, state.goodPts, state.badPts, state.edgesNN, state.edgesNNadj]).toEqual([[], [], [], [], []]);
    expect(state.path).toBe(-1);
  });
  it('restart consumes RandomInteger[{3,7},4] then RandomReal[{0,2π},{4,2}] (replayed numbers)', () => {
    const rng = replayRng({ integers: [3, 4, 5, 6], reals: [1, 2, 3, 4, 5, 6, 0.5, 0.25] });
    const { state } = evaluate(initialState(), rng);
    expect(state.polySides).toEqual([3, 4, 5, 6]);
    expect(state.polyXY).toEqual([[1, 2], [3, 4], [5, 6], [0.5, 0.25]]);
    expect(state.polys[0][1]).toEqual([1, 3]); // {1,2} + {0,1}
  });
  it('restart keeps r, rold, the locators and the obstacle checkbox', () => {
    const st = fixed({ r: 0.3, rold: 0.3, qs: [2, 2], showConfigObs: true, restart: true, pts: [[1, 1]] });
    const { state } = evaluate(st, createRng({ seed: 1 }));
    expect([state.r, state.rold, state.qs, state.showConfigObs, state.pts]).toEqual([0.3, 0.3, [2, 2], true, []]);
  });
});

describe('prm: locators', () => {
  it('a locator dragged past an edge jumps to the opposite edge (qs[[1]] = 2π, not +2π)', () => {
    const rng = createRng({ seed: 1 });
    expect(evaluate(fixed({ qs: [-0.05, 1] }), rng).state.qs).toEqual([TWO_PI, 1]);
    expect(evaluate(fixed({ qs: [6.3, 1] }), rng).state.qs).toEqual([0, 1]);
    expect(evaluate(fixed({ qf: [1, -0.1] }), rng).state.qf).toEqual([1, TWO_PI]);
    expect(evaluate(fixed({ qf: [1, 6.5] }), rng).state.qf).toEqual([1, 0]);
  });
  it('locator positions are clipped to the Manipulate range {-.1,-.1}..{2.1π,2.1π}', () => {
    expect(clampLoc([-1, 7])).toEqual([-0.1, 2.1 * Math.PI]);
    expect([LOC_MIN, LOC_MAX]).toEqual([-0.1, 2.1 * Math.PI]);
  });
});

describe('prm: sampling and roadmap', () => {
  it('"add 50 vertices" adds 50 samples, classified with ptInPolys in sampling order', () => {
    // replayed samples: even k at {3, 2.6 + 0.01 k} (on the triangle's axis, 2.5 < y < 4: inside),
    // odd k at {1 + 0.02 k, 1} (below the triangle: outside)
    const pts = Array.from({ length: 50 }, (_, k) => (k % 2 === 0 ? [3, 2.6 + 0.01 * k] : [1 + 0.02 * k, 1]));
    const st = evaluate(fixed({ addPoints: true }), replayRng({ reals: pts.flat() })).state;
    expect(st.addPoints).toBe(false);
    expect(st.pts).toEqual(pts);
    expect(st.goodPts).toEqual(pts.filter((_, k) => k % 2 === 1));
    expect(st.badPts).toEqual(pts.filter((_, k) => k % 2 === 0));
    expect(st.edgesNNadj.length).toBe(25);
  });
  // six free points on y = 1 (below the triangle) with gaps 0.3, 0.4, 0.5, 0.6, 0.7
  const LINE = [[1, 1], [1.3, 1], [1.7, 1], [2.2, 1], [2.8, 1], [3.5, 1]];
  const lineState = (extra) => fixed({ goodPts: LINE, edgesNNadj: LINE.map(() => []), edgesNN: [], ...extra });
  const E = (...pairs) => pairs.map(([a, b]) => [LINE[a - 1] ?? P7, LINE[b - 1] ?? P7]);
  const P7 = [1.12, 1];
  it('a radius change rebuilds the whole roadmap from point 1 (rold = r)', () => {
    // hand: r = 0.45 links only the gaps 0.3 and 0.4; r = 0.65 also 0.5 and 0.6 (0.7 stays out)
    let st = evaluate(lineState({ r: 0.45 }), replayRng({})).state;
    expect(st.rold).toBe(0.45);
    expect(st.edgesNN).toEqual(E([1, 2], [2, 3]));
    expect(st.edgesNNadj).toEqual([[2], [1, 3], [2], [], [], []]);
    st = evaluate({ ...st, r: 0.65 }, replayRng({})).state;
    expect(st.rold).toBe(0.65);
    expect(st.edgesNN).toEqual(E([1, 2], [2, 3], [3, 4], [4, 5]));
    expect(st.edgesNNadj).toEqual([[2], [1, 3], [2, 4], [3, 5], [4], []]);
  });
  it('radius 0 empties the roadmap (no connectPoints for r = 0)', () => {
    let st = evaluate(lineState({ r: 0.65 }), replayRng({})).state;
    st = evaluate({ ...st, r: 0 }, replayRng({})).state;
    expect([st.rold, st.edgesNN.length]).toEqual([0, 0]);
    expect(st.edgesNNadj.every((a) => a.length === 0)).toBe(true);
  });
  it('new samples are connected incrementally: only the new points look for neighbours (original quirk)', () => {
    const built = evaluate(lineState({ r: 0.65 }), replayRng({})).state;
    // next batch: {1.12, 1} (free; 0.12 / 0.18 / 0.58 from points 1, 2, 3) and 49 samples at {3, 3} (inside)
    const batch = [P7, ...Array.from({ length: 49 }, () => [3, 3])];
    const st = evaluate({ ...built, addPoints: true }, replayRng({ reals: batch.flat() })).state;
    expect(st.rold).toBe(0.65); // r == rold: no rebuild
    expect(st.edgesNN).toEqual(E([1, 2], [2, 3], [3, 4], [4, 5], [7, 1], [7, 2], [7, 3]));
    expect(st.edgesNNadj).toEqual([[2, 7], [1, 3, 7], [2, 4, 7], [3, 5], [4], [], [1, 2, 3]]);
    // a full rebuild of the same points (hand: point 1 now sees point 7 first, and so on) orders them differently
    const full = evaluate({ ...st, rold: -1 }, replayRng({})).state;
    expect(full.edgesNN).toEqual(E([1, 7], [1, 2], [2, 7], [2, 3], [3, 4], [3, 7], [4, 5]));
    expect(full.edgesNNadj).toEqual([[7, 2], [1, 7, 3], [2, 4, 7], [3, 5], [4], [], [1, 2, 3]]);
  });
  it('with at most 5 good points no rebuild happens (rold stays -1)', () => {
    const st = evaluate(fixed({ goodPts: [[1, 1], [1.1, 1]], edgesNNadj: [[], []], r: 0.7 }), createRng({ seed: 1 })).state;
    expect(st.rold).toBe(-1);
  });
  it('pathOKT[ps, pe, polys, delta] refuses a segment through the triangle', () => {
    expect(pathOKT([2, 3], [4, 3], TRI, DELTA)).toBe(false);
    expect(pathOKT([2, 1], [4, 1], TRI, DELTA)).toBe(true);
  });
});

describe('prm: query, label and progress', () => {
  it('direct connection: path = -2, label "path length = 0.3", progress enabled', () => {
    const r = evaluate(fixed({ qs: [1, 1], qf: [1.3, 1] }), createRng({ seed: 1 }));
    expect(r.state.path).toBe(-2);
    expect(r.view.label).toEqual({ prefix: 'path length = ', value: 0.3 });
    expect(r.view.progressEnabled).toBe(true);
    expect(r.view.direct.length).toBe(1);
    expect(r.view.thickConnectors).toBe(true);
  });
  it('no samples: "no path possible" and the progress slider disabled', () => {
    const r = evaluate(fixed(), createRng({ seed: 1 }));
    expect(r.state.path).toBe(-1);
    expect(r.view.label).toBe('no path possible');
    expect(r.view.progressEnabled).toBe(false);
  });
  it('a direct path is accepted even when start and goal are inside an obstacle (original quirk)', () => {
    // toroidDist 0.08 < r = 0.5 and 0.08 <= delta, so pathOKT accepts without testing; the in-obstacle test is
    // only in the else branch
    const r = evaluate(fixed({ qs: [3, 3], qf: [3.08, 3] }), replayRng({}));
    expect(r.view.qsInObstacle).toBe(true);
    expect(r.view.qfInObstacle).toBe(true);
    expect(r.state.path).toBe(-2);
    expect(r.view.label).toEqual({ prefix: 'path length = ', value: 0.08 });
    expect(r.view.progressEnabled).toBe(true);
  });
  it('a start inside an obstacle gets a red icon and no connection to the roadmap', () => {
    const goodPts = [[1, 1], [1.2, 1], [1.4, 1], [1.6, 1], [1.8, 1], [2, 1]];
    const r = evaluate(fixed({ qs: [3, 3], qf: [1, 1.1], goodPts, edgesNNadj: goodPts.map(() => []), r: 0.1, rold: 0.1 }), createRng({ seed: 1 }));
    expect(r.view.qsInObstacle).toBe(true);
    expect(r.view.qfInObstacle).toBe(false);
    expect(r.view.qsn).toBe(null);
    expect(r.view.qfn).toEqual([1, 1]);
    expect(r.state.path).toBe(-1);
    expect(r.view.connectors.length).toBe(1); // only qf's magenta connector, default thickness
    expect(r.view.thickConnectors).toBe(false);
  });
  it('a roadmap path: green edges, thick magenta connectors, black end points, purple progress point', () => {
    const goodPts = [[1, 1], [1.4, 1], [1.8, 1], [2.2, 1], [2.6, 1], [5, 5]];
    const edgesNNadj = [[2], [1, 3], [2, 4], [3, 5], [4], []];
    const r = evaluate(fixed({ qs: [0.9, 1], qf: [2.7, 1], goodPts, edgesNNadj, r: 0.1, rold: 0.1, progress: 0.5 }), createRng({ seed: 1 }));
    expect(r.state.path).toEqual([1, 2, 3, 4, 5]);
    expect(r.view.pathEdges.map((p) => p.color)).toEqual(['Green', 'Green', 'Green', 'Green']);
    expect(r.view.endPoints).toBe(true);
    expect(r.view.totdist).toBeCloseTo(1.8, 12);
    expect(r.view.label.value).toBeCloseTo(1.8, 12);
    expect(r.view.progressPoint[0]).toBeCloseTo(1.8, 12);
  });
});
