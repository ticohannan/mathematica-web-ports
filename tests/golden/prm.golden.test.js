// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/prm.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/prm.original-state.json: the original's own random obstacles and 550 samples, its roadmap and
// its query result) and its snapshot pictures (docs/original-snapshots/prm-*.png).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, makePolys, connectPoints, DELTA } from '../../demos/prm/model.js';
import { ptInPolys, toroidDist } from '../../demos/common/prm-core.js';
import { replayRng } from '../../shared/random.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/prm.original-state.json', 'utf8')).state;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const key = (p) => `${p[0]},${p[1]}`;
const edgeKey = ([a, b]) => [key(a), key(b)].sort().join('|');

describe('prm golden (saved state of the original)', () => {
  it('prm: polygons are polyXY + CirclePoints[polySides], bit for bit', () => {
    expect(saved.polySides).toEqual([3, 5, 3, 5]);
    expect(makePolys(saved.polySides, saved.polyXY)).toEqual(saved.polys);
  });

  it('prm: classifying the saved samples with ptInPolys reproduces goodPts and badPts in order', () => {
    const good = saved.pts.filter((p) => !ptInPolys(saved.polys, p));
    const bad = saved.pts.filter((p) => ptInPolys(saved.polys, p));
    expect([saved.pts.length, good.length, bad.length]).toEqual([550, 442, 108]);
    expect(good).toEqual(saved.goodPts);
    expect(bad).toEqual(saved.badPts);
  });

  it('prm: connectPoints with r = 0.14 from point 1 does NOT reproduce the saved roadmap', () => {
    // The saved state shows r = rold = 0.14, but its edges are up to 0.8695 long (see the next test). A rebuild
    // with r = 0.14, which is what the code does when r changes, gives a much sparser roadmap. The count 203 comes
    // from the port itself; an independent review recomputed it (and the r = 0.87 history below) separately.
    const [adj, edges] = connectPoints(saved.goodPts, saved.goodPts.map(() => []), saved.polys, DELTA, [], 1, 0.14);
    expect(edges.length).toBe(203);
    expect(saved.edgesNN.length).toBe(1740);
    expect(same(adj, saved.edgesNNadj)).toBe(false);
  });

  it('prm: the saved edge lengths show a roadmap radius of 0.87 for the older points', () => {
    const lens = saved.edgesNN.map(([a, b]) => toroidDist(a, b));
    const max = Math.max(...lens);
    expect(max).toBeGreaterThan(0.86);
    expect(max).toBeLessThanOrEqual(0.87);
    // points sampled in the last four batches (good points 290..442) only have edges shorter than 0.14
    const late = new Set(saved.goodPts.slice(289).map(key));
    const fromLate = saved.edgesNN.filter(([a]) => late.has(key(a)));
    expect(fromLate.length).toBeGreaterThan(0);
    for (const [a, b] of fromLate) expect(toroidDist(a, b)).toBeLessThanOrEqual(0.14);
  });

  it('prm: a rebuild with r = 0.87 at 289 good points plus four incremental batches at r = 0.14 reproduces the saved edges and adjacency exactly, in order', () => {
    const counts = [289, 325, 362, 402, 442]; // good points after sample batches 7..11 (50 samples each)
    let [adj, edges] = connectPoints(saved.goodPts.slice(0, 289), Array.from({ length: 289 }, () => []), saved.polys, DELTA, [], 1, 0.87);
    for (let b = 1; b < counts.length; b++) {
      const G = saved.goodPts.slice(0, counts[b]);
      adj = adj.concat(Array.from({ length: counts[b] - counts[b - 1] }, () => []));
      [adj, edges] = connectPoints(G, adj, saved.polys, DELTA, edges, counts[b - 1] + 1, 0.14);
    }
    expect(new Set(edges.map(edgeKey))).toEqual(new Set(saved.edgesNN.map(edgeKey))); // the SET
    expect(edges).toEqual(saved.edgesNN); // and the ORDER
    expect(adj).toEqual(saved.edgesNNadj);
  });

  it('prm: replaying the original random numbers through the Manipulate body reproduces the saved state', () => {
    // RandomInteger[{3,7},4] -> polySides, RandomReal[{0,2π},{4,2}] -> polyXY, then 11 x RandomReal[{0,2π},{50,2}]
    const rng = replayRng({ integers: saved.polySides, reals: [...saved.polyXY.flat(), ...saved.pts.flat()] });
    let st = evaluate(initialState(), rng).state;
    for (let batch = 1; batch <= 11; batch++) {
      if (batch === 8) {
        st = evaluate({ ...st, r: 0.87 }, rng).state; // radius 0.87 -> full rebuild at 289 good points
        // r = rold = 0.14 WITHOUT the rebuild the code would do (how the original got there is unknown, K-PR-03)
        st = { ...st, r: 0.14, rold: 0.14 };
      }
      st = evaluate({ ...st, addPoints: true }, rng).state;
    }
    expect(rng.remaining()).toEqual({ reals: 0, integers: 0 });
    for (const k of ['polySides', 'polyXY', 'polys', 'pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj', 'r', 'rold', 'path']) {
      expect(same(st[k], saved[k]), k).toBe(true);
    }
  });

  it('prm: the saved query gives path -1 ("no path possible") because the start (1,1) lies inside obstacle 2', () => {
    const { state, view } = evaluate({ ...saved }, replayRng({}));
    expect(state.path).toBe(saved.path);
    expect(view.label).toBe('no path possible'); // the label in docs/original-snapshots/prm-1.png
    expect(view.qsInObstacle).toBe(true); // red start icon in the snapshot
    expect(ptInPolys([saved.polys[1]], [1, 1])).toBe(true); // the pentagon around {1.28, 1.63}
    expect(view.qsn).toBe(null);
    expect(view.qfInObstacle).toBe(false);
    expect(toroidDist(saved.qs, saved.qf)).toBeGreaterThan(saved.r); // no direct connection either
    // no rebuild on re-evaluation (r == rold): the saved roadmap is kept as it is
    expect(state.edgesNN).toEqual(saved.edgesNN);
  });
});

// Owner state 1 (Mathematica 15.0.1, saved 2026-10-06): 200 samples, polySides {4, 5, 5, 7}, r = rold = 0.29
const owner = JSON.parse(fs.readFileSync('tests/golden/prm.owner-state-1.json', 'utf8')).state;

describe('prm golden (owner state 1, Mathematica 15.0.1)', () => {
  it('prm owner state: polygons including the 7-gon are polyXY + CirclePoints, bit for bit', () => {
    expect(owner.polySides).toEqual([4, 5, 5, 7]);
    expect(makePolys(owner.polySides, owner.polyXY)).toEqual(owner.polys);
  });

  it('prm owner state: ptInPolys reproduces the 162 free and 38 colliding samples in order', () => {
    expect(owner.pts.filter((p) => !ptInPolys(owner.polys, p))).toEqual(owner.goodPts);
    expect(owner.pts.filter((p) => ptInPolys(owner.polys, p))).toEqual(owner.badPts);
  });

  it('prm owner state: radius 0.29 before the first batch, then four batches, reproduces the 98 edges and the adjacency in order', () => {
    // replay through the Manipulate body: the first batch is connected and rebuilt (r 0.29 != rold -1), the next
    // three are connected incrementally (Q-PR-07); a single rebuild of all 162 points would order them differently
    const rng = replayRng({ integers: owner.polySides, reals: [...owner.polyXY.flat(), ...owner.pts.flat()] });
    let st = evaluate({ ...initialState(), r: 0.29 }, rng).state;
    for (let batch = 1; batch <= 4; batch++) st = evaluate({ ...st, addPoints: true }, rng).state;
    expect(rng.remaining()).toEqual({ reals: 0, integers: 0 });
    for (const k of ['polys', 'pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj', 'r', 'rold']) expect(same(st[k], owner[k]), k).toBe(true);
    const [, full] = connectPoints(owner.goodPts, owner.goodPts.map(() => []), owner.polys, DELTA, [], 1, 0.29);
    expect(same(full, owner.edgesNN)).toBe(false);
  });

  it('prm owner state: path -1 and "no path possible" as saved', () => {
    // weak evidence on its own: the owner's copy always showed "no path possible" (O-PR-01); the classification and
    // edge replays above are the strong comparisons
    const { state, view } = evaluate({ ...owner, qs: [...owner.qs], qf: [...owner.qf] }, replayRng({}));
    expect(state.path).toBe(owner.path);
    expect(view.label).toBe('no path possible');
  });

  it('prm owner state: regression pin of why there is no path (both ends connect, the roadmap does not join them)', () => {
    // REGRESSION PIN: qsn / qfn are not saved by the original; these values come from the port itself
    const { view } = evaluate({ ...owner, qs: [...owner.qs], qf: [...owner.qf] }, replayRng({}));
    expect(view.qsInObstacle || view.qfInObstacle).toBe(false);
    expect(view.qsn).not.toBe(null);
    expect(view.qfn).not.toBe(null);
  });
});
