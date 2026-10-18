// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/rrt.test.js — the RRT model (demos/rrt/model.js) against values derived by hand or with independent
// formulas (TESTPLAN T-RT-01 … T-RT-36): the angle test, segment parameters, the step rule, the BLAS dnrm2 algorithm,
// Round half to even. Random numbers are replayed (shared/random.js replayRng) so every draw is known.
import { describe, it, expect } from 'vitest';
import {
  OBSEDGES, ptInPoly, inCollision, samplePoint, pickNode, extend, euclideanDistance, rrtStarChooseParent, appendNode,
  rrtStarRewire, addNode, evaluate, initialSettings, goalCheck, labelText, tooltipText, makeView, STYLE, nearestFirst,
  nearestWithin, positionOf, ROOT, MODEL_1501, MODEL_2018, lengthExtended, normalizeExtended,
} from '../../demos/rrt/model.js';
import { lengthCR } from '../../shared/mma-extra.js';
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
import { replayRng, createRng } from '../../shared/random.js';
import { normalizeCR, nearest } from '../../shared/mma-extra.js';

/** A consistent tree from [location, parent, cost] rows (children lists filled in order). */
function tree(rows) {
  const verts = rows.map(([loc, parent, cost], i) => [loc, parent, i + 1, cost, []]);
  verts.forEach((v, i) => { if (v[1] > 0) verts[v[1] - 1][4].push(i + 1); });
  return verts;
}
/** A state whose change checks do not fire (the *Old values equal the current ones). */
function stateWith(verts, o = {}) {
  const s = {
    verts, finalGoal: [18, -18], goalRadius: 1, treeType: 'RRT', obstacles: 'none', explorationBias: 0,
    newrand: [], path: [], cost: [], nodestoadd: 0, reachGoal: false, ...o,
  };
  return { ...s, finalGoalOld: s.finalGoal.slice(), goalRadiusOld: s.goalRadius, treeTypeOld: s.treeType, obstaclesold: s.obstacles, ...o.old };
}
const dnrm2 = (v) => { // BLAS dnrm2 (scale/ssq), written out independently of shared/mma-exact.js
  let scale = 0, ssq = 1;
  for (const x of v) if (x !== 0) { const a = Math.abs(x); if (scale < a) { ssq = 1 + ssq * (scale / a) ** 2; scale = a; } else ssq += (a / scale) ** 2; }
  return scale * Math.sqrt(ssq);
};

describe('rrt obstacles and collision test', () => {
  it("obstacle sets are the original's vertex lists (narrow passage 4, sparse 4, concave 1, none 0)", () => {
    expect(OBSEDGES['narrow passage']).toEqual([
      [[5, 10], [6, 10], [6, 21], [5, 21]], [[5, 5], [6, 5], [6, -21], [5, -21]],
      [[-5, -7], [-6, -7], [-6, 21], [-5, 21]], [[-5, -9], [-6, -9], [-6, -21], [-5, -21]]]);
    expect(OBSEDGES.sparse).toEqual([
      [[1, 1], [1, 17], [17, 17], [17, 1]], [[-1, 1], [-1, 17], [-17, 17], [-17, 1]],
      [[1, -1], [1, -17], [17, -17], [17, -1]], [[-1, -1], [-1, -17], [-17, -17], [-17, -1]]]);
    expect(OBSEDGES.concave).toEqual([[[5, 3], [-6, 3], [-6, 4], [6, 4], [6, -4], [-6, -4], [-6, -3], [5, -3]]]);
    expect(OBSEDGES.none).toEqual([]);
    for (const polys of Object.values(OBSEDGES)) for (const poly of polys) for (const p of poly) expect(p.every(Number.isInteger)).toBe(true);
  });

  it('ptInPoly on the obstacles: inside a wall is True, on an edge depends on the polygon orientation', () => {
    const [w1, w2] = OBSEDGES['narrow passage'];
    const [s1, s2] = OBSEDGES.sparse;
    expect(ptInPoly(w2, [5.5, 0])).toBe(true);
    expect(ptInPoly(w2, [5, 0])).toBe(false); // clockwise wall: on the edge counts as outside
    expect(ptInPoly(w1, [5, 15])).toBe(true); // counter-clockwise wall: on the edge counts as inside
    expect(ptInPoly(s1, [9, 9])).toBe(true);
    expect(ptInPoly(s1, [1, 9])).toBe(false); // clockwise square
    expect(ptInPoly(s2, [-1, 9])).toBe(true); // counter-clockwise square
  });

  it('ptInPoly never reports a point inside the concave obstacle (convex test, original quirk)', () => {
    const [c] = OBSEDGES.concave;
    for (const p of [[0, 3.5], [5.5, 0], [0, -3.5], [0, 0], [10, 10]]) expect(ptInPoly(c, p), String(p)).toBe(false);
  });

  it('inCollision: a step into a wall collides, a step through the narrow passage does not', () => {
    const obs = OBSEDGES['narrow passage'];
    expect(inCollision([4.5, 0], [5.5, 0], obs)).toBe(true);
    expect(inCollision([4.5, 7], [5.5, 7], obs)).toBe(false); // the gap of x 5…6 at y 5…10
    expect(inCollision([5.5, 5.5], [5.5, 4.5], obs)).toBe(true); // end point inside wall 2
  });

  it('inCollision: touching an obstacle edge with the end point collides (inclusive 0 <= λ <= 1)', () => {
    // λ = 1 on the step, λ = 21/26 on the edge (5, −21)–(5, 5) of wall 2
    expect(inCollision([4.5, 0], [5, 0], OBSEDGES['narrow passage'])).toBe(true);
  });

  it('inCollision: a step lying on the edge of a clockwise wall does not collide (parallel edges are ignored)', () => {
    const obs = OBSEDGES['narrow passage'];
    expect(inCollision([5, -1], [5, -2], obs)).toBe(false); // wall 2 is clockwise
    expect(inCollision([5, 12], [5, 13], obs)).toBe(true); // wall 1 is counter-clockwise: the end point counts as inside
  });

  it('inCollision: entering a bar of the concave obstacle collides through the segment test', () => {
    const obs = OBSEDGES.concave;
    expect(inCollision([-7, 3.5], [-5, 3.5], obs)).toBe(true);
    expect(inCollision([0, 2.5], [0, 3.5], obs)).toBe(true);
    expect(inCollision([0, 0], [0, 1], obs)).toBe(false);
    expect(inCollision([-6.5, 0], [-5.5, 0], obs)).toBe(false); // through the opening
  });

  it('obstacles none: an empty obstacle list never collides', () => {
    const rng = createRng({ seed: 11 });
    for (let i = 0; i < 20; i++) expect(inCollision(rng.randomReal([-20, 20], 2), rng.randomReal([-20, 20], 2), OBSEDGES.none)).toBe(false);
  });
});

describe('rrt sampling and the step', () => {
  it('Round[x, 0.01] is 0.01 Round[x/0.01] with halves to even: -12.7849 gives -12.780000000000001', () => {
    const cases = [[-12.7849, -12.780000000000001], [-12.7851, -12.790000000000001], [12.345678, 12.35], [0.125, 0.12],
      [0.135, 0.14], [0.015, 0.02], [0.005, 0]];
    for (const [x, want] of cases) {
      const rng = replayRng({ reals: [0.5, x, x] });
      expect(samplePoint(0, [18, -18], rng), String(x)).toEqual([want, want]);
      expect(rng.remaining().reals).toBe(0);
    }
  });

  it('extension: a sample farther than 1 gives a unit step nv + Normalize[p - nv]', () => {
    expect(extend([0, 0], [3, 4])).toEqual([0.6000000000000001, 0.8]);
    expect(euclideanDistance([0, 0], [0.6000000000000001, 0.8])).toBe(1);
    const np = extend([0, 0], [-19.56, 6.3]);
    expect(np).toEqual([-0.9518461175258359, 0.3065762034975852]);
    expect(euclideanDistance([0, 0], np)).toBe(1); // MODEL_1501: Sqrt of the plain sum of squares
    expect(euclideanDistance([0, 0], np, MODEL_2018.distance)).toBe(1.0000000000000002); // dnrm2
  });

  it('extension: a sample within 1 (Norm <= 1, tolerant) is reached exactly', () => {
    expect(extend([1, 1], [1.5, 1.25])).toEqual([1.5, 1.25]);
    expect(euclideanDistance([1, 1], [1.5, 1.25])).toBe(0.5590169943749475);
    expect(extend([0, 0], [0.6, 0.8])).toEqual([0.6, 0.8]); // Norm exactly 1: no Normalize
    const np = extend([17.3, -17.5], [18, -18]);
    expect(np).toEqual([18, -18]); // 18 − 17.3 is exact (Sterbenz), so 17.3 + 0.7… = 18. exactly
    expect(euclideanDistance([17.3, -17.5], np)).toBe(0.8602325267042621);
  });

  it('EuclideanDistance in 15.0.1 is the square root of the plain sum of squares: 1.8027756377319946 for {1, 1.5} (2018: dnrm2)', () => {
    expect(dnrm2([1, 1.5])).toBe(1.8027756377319948);
    expect(Math.sqrt(1 + 2.25)).toBe(1.8027756377319946); // one rounding of the square root: a different double
    expect(euclideanDistance([0, 0], [1, 1.5])).toBe(1.8027756377319946); // MODEL_1501 (harness run 2, K-RT-02)
    expect(euclideanDistance([0, 0], [1, 1.5], MODEL_2018.distance)).toBe(1.8027756377319948); // the 2018 snapshots
    expect(euclideanDistance([2, 2], [1, 1.5])).toBe(1.118033988749895);
  });

  it('Normalize in 15.0.1 uses the length in x87 extended precision, rounded twice: 27.93101735161234 for a near-halfway vector', () => {
    // H-RT-05 node 812 (harness run 2): the step from (-1.9678377716108368, -1.4729567900744631) towards (17.15, 18.89);
    // the exact length 27.9310173516123416711… lies almost halfway between two doubles: the correctly rounded one is
    // 27.931017351612343 (mpmath), the 64-bit intermediate rounds first to the halfway point and then to even.
    const v = [19.117837771610837, 20.362956790074463];
    expect(lengthCR(v)).toBe(27.931017351612343);
    expect(lengthExtended(v)).toBe(27.93101735161234);
    expect(add2([-1.9678377716108368, -1.4729567900744631], normalizeExtended(v))).toEqual([-1.2833715550407754, -0.7439122109338828]); // the recorded node
    expect(lengthExtended([3, 4])).toBe(5);
    expect(lengthExtended([0, 0])).toBe(0);
    expect(lengthExtended([1, 1.5])).toBe(1.8027756377319946); // = Sqrt[3.25] rounded once
  });

  it('Normalize multiplies by the reciprocal of the extended-precision length by default (15.0.1, 2018: dnrm2)', () => {
    const p = [-19.56, 6.3], nv = [-1.8898591462436376, -2.38593178139027];
    const v = [p[0] - nv[0], p[1] - nv[1]];
    expect(dnrm2(v)).toBe(19.689573095995637); // correctly rounded length 19.689573095995634 (mpmath)
    expect(extend(nv, p)).toEqual([-2.7872956100819533, -1.9447880481542879]); // MODEL_1501 (here equal to normalizeCR)
    expect(extend(nv, p, MODEL_2018)).toEqual([-2.7872956100819533, -1.944788048154288]); // the saved newest node of snapshot 2
    expect(extend(nv, p, { normalize: normalizeCR })).toEqual(extend(nv, p, MODEL_1501));
  });

  it('RRT and RRT* expand the nearest node, ties go to the earlier node', () => {
    // nodes 2 and 3 at (1, 4) and (−1, 4), both √2 from p = (0, 5); the root is 5 away (the TESTPLAN's (±1, 0) would
    // have left the root nearest, at 5 < √26)
    const verts = tree([[[0, 0], 0, 0], [[1, 4], 1, 4.123105625617661], [[-1, 4], 1, 4.123105625617661]]);
    for (const t of ['RRT', 'RRT*']) expect(pickNode(verts, t, [0, 5], null)).toEqual({ nv: [1, 4], parent: 2 });
    // the same as Nearest of shared/mma-extra.js (stable ties)
    const locs = verts.map((v) => v[0]);
    expect(nearestFirst(locs, [0, 5])).toBe(nearest(locs, [0, 5])[0]);
  });

  it('Random Tree expands the node drawn by RandomInteger, a duplicate location resolves to its first copy', () => {
    const verts = tree([[[0, 0], 0, 0], [[1, 0], 1, 1], [[1, 0], 2, 1]]);
    const rng = replayRng({ integers: [3] });
    expect(pickNode(verts, 'Random Tree', [5, 5], rng)).toEqual({ nv: [1, 0], parent: 2 });
    expect(positionOf(verts, [1, 0])).toBe(2);
  });

  it('draw order per attempt: RandomReal[] always, then RandomReal[{-20, 20}, 2] unless biased, then RandomInteger for Random Tree', () => {
    const run = (treeType, bias, reals, integers = []) => {
      const s = stateWith([ROOT()], { treeType, explorationBias: bias });
      const rng = replayRng({ reals, integers });
      const p = addNode(s, treeType, OBSEDGES.none, rng);
      return { p, left: rng.remaining() };
    };
    expect(run('RRT', 0, [0.7, 3.0, 4.0])).toEqual({ p: [3, 4], left: { reals: 0, integers: 0 } });
    expect(run('RRT', 0.5, [0.1])).toEqual({ p: [18, -18], left: { reals: 0, integers: 0 } });
    expect(run('Random Tree', 0, [0.7, 3.0, 4.0], [1])).toEqual({ p: [3, 4], left: { reals: 0, integers: 0 } });
  });

  it('a colliding attempt is retried with new random numbers until a step is free', () => {
    const s = stateWith(tree([[[0, 0], 0, 0], [[4.5, 0], 1, 4.5]]), { obstacles: 'narrow passage' });
    const rng = replayRng({ reals: [0.5, 10.0, 0.0, 0.5, 4.5, 1.0] });
    const p = addNode(s, 'RRT', OBSEDGES['narrow passage'], rng); // first: np (5.5, 0) inside wall 2
    expect(p).toEqual([4.5, 1]);
    expect(s.verts[2]).toEqual([[4.5, 1], 2, 3, 5.5, []]);
    expect(rng.remaining().reals).toBe(0);
  });

  it('exploration bias: a biased attempt samples finalGoal itself and adds duplicate nodes once a node sits on the goal', () => {
    const verts = tree([[[0, 0], 0, 0], [[17.3, -17.5], 1, 24.6]]);
    let s = stateWith(verts, { explorationBias: 0.9, nodestoadd: 1 });
    s = evaluate(s, replayRng({ reals: [0.1] })).state;
    expect(s.verts[2].slice(0, 3)).toEqual([[18, -18], 2, 3]);
    s = evaluate({ ...s, nodestoadd: 1 }, replayRng({ reals: [0.1] })).state;
    expect(s.verts[3].slice(0, 3)).toEqual([[18, -18], 3, 4]);
    expect(s.verts[3][3]).toBe(s.verts[2][3]); // a zero-length edge: cost + 0
    expect(labelText(s)).toMatch(/^4 nodes, /);
  });
});

describe('rrt RRT* parent choice and rewiring', () => {
  // root (0,0) cost 0; A (2,0) child of root, cost 2.; B (2,2) child of A, cost 4.; C (3,2.5) child of B
  const rows = () => tree([[[0, 0], 0, 0], [[2, 0], 1, 2], [[2, 2], 2, 4], [[3, 2.5], 3, 5.118033988749895]]);
  const np = [1, 1.5];
  const M = MODEL_2018; // the hand-derived costs below use the dnrm2 distances (the logic is the same in MODEL_1501)

  it('RRT* chooses the neighbour within 3 with the least cost plus distance, colliding neighbours count as infinity', () => {
    const a = rrtStarChooseParent(rows(), np, [], M);
    expect(a.nvs).toEqual([[2, 2], [0, 0], [2, 0], [3, 2.5]]); // B, root, A, C (root and A tie at 1.80…: list order)
    expect(a.parent).toBe(1);
    const va = rows();
    appendNode(va, np, a.parent, a.nv, M);
    expect(va[4][3]).toBe(1.8027756377319948);
    const obstacle = [[[0.4, 0.5], [0.6, 0.5], [0.6, 0.7], [0.4, 0.7]]];
    const b = rrtStarChooseParent(rows(), np, obstacle, M);
    expect(b.eucDist[1]).toBe(Infinity);
    expect(b.parent).toBe(2);
    const vb = rows();
    appendNode(vb, np, b.parent, b.nv, M);
    expect(vb[4][3]).toBe(3.802775637731995);
    expect(rrtStarRewire(vb, b.nvs, b.eucDist, M)).toBe(0);
  });

  it('RRT* rewires a neighbour through the new node when that is shorter and updates the costs of its subtree', () => {
    const v = rows();
    const a = rrtStarChooseParent(v, np, [], M);
    appendNode(v, np, a.parent, a.nv, M);
    expect(rrtStarRewire(v, a.nvs, a.eucDist, M)).toBe(1);
    expect(v[2][1]).toBe(5);
    expect(v[2][3]).toBe(2.9208096264818897);
    expect(v[3][3]).toBe(4.038843615231785);
    expect(v.map((x) => x[4])).toEqual([[2, 5], [], [4], [], [3]]);
  });

  it('RRT* does not rewire on equal or tolerantly equal cost (Greater is tolerant)', () => {
    const v = rows();
    const a = rrtStarChooseParent(v, np, [], M);
    appendNode(v, np, a.parent, a.nv, M);
    rrtStarRewire(v, a.nvs, a.eucDist, M);
    expect(1.8027756377319948 + 2.23606797749979).toBe(4.038843615231785); // C's direct newdist equals its new cost
    expect(v[3][1]).toBe(3); // C keeps parent B
    // a synthetic neighbour with cost newdist·(1 + 2^-50): strict IEEE ">" would rewire it, Mathematica's Greater not
    const w = tree([[[0, 0], 0, 0], [[3, 0], 1, 3 * (1 + 2 ** -50)], [[2, 0], 1, 2]]);
    expect(3 * (1 + 2 ** -50) > 3).toBe(true);
    expect(rrtStarRewire(w, [[3, 0]], [1])).toBe(0);
    expect(w[1][1]).toBe(1);
  });

  it('RRT*: if every neighbour collides the attempt fails and new numbers are drawn', () => {
    const obstacle = [[0.5, -1], [0.6, -1], [0.6, 1], [0.5, 1]];
    const s = stateWith([ROOT()], { treeType: 'RRT*' });
    const rng = replayRng({ reals: [0.5, 10.0, 0.0, 0.5, -10.0, 0.0] });
    addNode(s, 'RRT*', [obstacle], rng); // first attempt: np (1, 0) behind the bar
    expect(s.verts[1]).toEqual([[-1, 0], 1, 2, 1, []]);
    expect(rng.remaining().reals).toBe(0);
  });
});

describe('rrt evaluation: batches, goal check, resets', () => {
  it('a press of 10 adds 5 nodes in the first evaluation and one per evaluation after that', () => {
    let s = { ...evaluate(initialSettings(), null).state, nodestoadd: 10 };
    const rng = createRng({ seed: 5 });
    const seen = [];
    for (let i = 0; i < 7; i++) { s = evaluate(s, rng).state; seen.push([s.verts.length, s.nodestoadd]); }
    expect(seen).toEqual([[6, 5], [7, 4], [8, 3], [9, 2], [10, 1], [11, 0], [11, 0]]);
  });

  it('a press of 1 adds one node in one evaluation, 100 adds 95 then 5 single nodes', () => {
    const rng = createRng({ seed: 6 });
    let s = evaluate({ ...evaluate(initialSettings(), null).state, nodestoadd: 1 }, rng).state;
    expect([s.verts.length, s.nodestoadd]).toEqual([2, 0]);
    s = { ...evaluate(initialSettings(), null).state, nodestoadd: 100 };
    const lens = [];
    for (let i = 0; i < 6; i++) { s = evaluate(s, rng).state; lens.push(s.verts.length); }
    expect(lens).toEqual([96, 97, 98, 99, 100, 101]);
  });

  it('goal check: the cheapest node within goalRadius is the waypoint, ties and near ties go to the node nearer the goal', () => {
    // Y (distance 1) is earlier in the list than X (distance 0.5); Nearest puts X first
    const s = stateWith(tree([[[0, 0], 0, 0], [[0, 9], 1, 47], [[0, 9.5], 1, 47.000000000000014]]), { finalGoal: [0, 10], goalRadius: 2 });
    goalCheck(s);
    expect(s.cost).toBe(47.000000000000014);
    expect(s.path[0]).toEqual([[0, 9.5], 1]);
    const t = stateWith(tree([[[0, 0], 0, 0], [[0, 9], 1, 46.9], [[0, 9.5], 1, 47.000000000000014]]), { finalGoal: [0, 10], goalRadius: 2 });
    goalCheck(t);
    expect(t.cost).toBe(46.9);
    expect(t.path[0]).toEqual([[0, 9], 1]);
  });

  it('goal check: the path follows the parents to the root as {location, parent} pairs', () => {
    const s = stateWith(tree([[[0, 0], 0, 0], [[1, 0], 1, 1], [[2, 0], 2, 2]]), { finalGoal: [2.2, 0], goalRadius: 0.5 });
    const r = evaluate(s, null).state;
    expect(r.path).toEqual([[[2, 0], 2], [[1, 0], 1], [[0, 0], 0]]);
    expect(r.cost).toBe(2);
    expect(r.reachGoal).toBe(true);
  });

  it('goal check runs only while reachGoal is False and a new node resets reachGoal', () => {
    const s0 = stateWith(tree([[[0, 0], 0, 0], [[1, 0], 1, 1], [[2, 0], 2, 2]]), { finalGoal: [2.2, 0], goalRadius: 0.5 });
    const reached = evaluate(s0, null).state;
    // a cheaper node inside the disk, put in by hand: not seen while reachGoal is True
    reached.verts.push([[2.3, 0], 1, 4, 0.5, []]);
    reached.verts[0][4].push(4);
    const again = evaluate(reached, null).state;
    expect(again.path).toEqual(reached.path);
    // a new node (sample (10, 10), far away, no obstacles) resets reachGoal: the path is recomputed
    const grown = evaluate({ ...again, nodestoadd: 1 }, replayRng({ reals: [0.5, 10, 10] })).state;
    expect(grown.verts.length).toBe(5);
    expect(grown.path).toEqual([[[2.3, 0], 1], [[0, 0], 0]]);
    expect(grown.cost).toBe(0.5);
  });

  it('goalRadius 0: only a node exactly on the goal reaches it', () => {
    const on = evaluate(stateWith(tree([[[0, 0], 0, 0], [[18, -18], 1, 25.45]]), { goalRadius: 0 }), null).state;
    expect(on.reachGoal).toBe(true);
    const off = evaluate(stateWith(tree([[[0, 0], 0, 0], [[18, -17.999999], 1, 25.45]]), { goalRadius: 0 }), null).state;
    expect(off.reachGoal).toBe(false);
  });

  it('the first evaluation of the Variables initial values resets the tree (treeTypeOld 0, verts of the wrong shape)', () => {
    const init = initialSettings();
    expect(init.verts).toEqual([[0, 0], 0, 1, 0, []]); // a single record (Q-RT-13)
    const { state } = evaluate(init, null);
    expect(state.verts).toEqual([[[0, 0], 0, 1, 0, []]]);
    expect(state.finalGoalOld).toEqual([18, -18]);
    expect(state.goalRadiusOld).toBe(1);
    expect(state.treeTypeOld).toBe('RRT');
    expect(state.obstaclesold).toBe('narrow passage');
    expect(state.cost).toEqual([]);
    expect(labelText(state)).toBe('1 node, goal not yet reached');
  });

  it('changing tree type or obstacles resets verts, path, newrand and reachGoal but keeps cost', () => {
    const base = evaluate(stateWith(tree([[[0, 0], 0, 0], [[1, 0], 1, 1]]), { finalGoal: [1, 0.5], goalRadius: 1, newrand: [3, 4] }), null).state;
    expect(base.reachGoal).toBe(true);
    for (const change of [{ treeType: 'Random Tree' }, { obstacles: 'sparse' }]) {
      const r = evaluate({ ...base, cost: 12.5, ...change }, null).state;
      expect(r.verts).toEqual([[[0, 0], 0, 1, 0, []]]);
      expect(r.path).toEqual([]);
      expect(r.newrand).toEqual([]);
      expect(r.reachGoal).toBe(false);
      expect(r.cost).toBe(12.5);
    }
  });

  it('moving the goal or changing goalRadius resets reachGoal and path and recomputes the path', () => {
    const v = tree([[[0, 0], 0, 0], [[1, 0], 1, 1], [[2, 0], 2, 2]]);
    const reached = evaluate(stateWith(v, { finalGoal: [2, 0.5], goalRadius: 1 }), null).state;
    expect(reached.path.length).toBe(3);
    const away = evaluate({ ...reached, finalGoal: [10, 10] }, null).state;
    expect(away.reachGoal).toBe(false);
    expect(away.path).toEqual([]);
    const back = evaluate({ ...away, finalGoal: [2, 0.5] }, null).state;
    expect(back.reachGoal).toBe(true);
    expect(back.path).toEqual(reached.path);
    const wider = evaluate({ ...back, goalRadius: 2.5 }, null).state;
    expect(wider.goalRadiusOld).toBe(2.5);
    expect(wider.reachGoal).toBe(true);
    expect(wider.path).toEqual([[[0, 0], 0]]); // the root (cost 0) is now inside the disk
  });
});

describe('rrt texts and picture', () => {
  it('label: 1 node / n nodes, goal not yet reached / path length Round[cost, 0.01] as Mathematica prints it', () => {
    const one = stateWith([ROOT()]);
    expect(labelText(one)).toBe('1 node, goal not yet reached');
    const two = stateWith(tree([[[0, 0], 0, 0], [[1, 0], 1, 1]]));
    expect(labelText(two)).toBe('2 nodes, goal not yet reached');
    const reached = (cost) => ({ ...two, reachGoal: true, cost, path: [[[1, 0], 1], [[0, 0], 0]] });
    expect(labelText(reached(47))).toBe('2 nodes, path length 47.');
    expect(labelText(reached(40.38867400690889))).toBe('2 nodes, path length 40.39');
    expect(labelText(reached(20.82217257408188))).toBe('2 nodes, path length 20.82');
    expect(labelText(reached(27))).toBe('2 nodes, path length 27.');
  });

  it("tooltips show each node's cost as Mathematica prints it: root 0, unit step 1., 3.41421", () => {
    expect(tooltipText(0, true)).toBe('0');
    expect(tooltipText(1, false)).toBe('1.');
    expect(tooltipText(3.414213562373095, false)).toBe('3.41421');
    expect(tooltipText(40.38867400690889, false)).toBe('40.3887');
  });

  it('a root inside the goal disk gives path length 0 (regression pin, K-RT-06)', () => {
    const s = evaluate(stateWith([ROOT()], { finalGoal: [0.5, 0.5], goalRadius: 1, old: { finalGoalOld: [18, -18] } }), null).state;
    expect(s.reachGoal).toBe(true);
    expect(s.path).toEqual([[[0, 0], 0]]);
    expect(s.cost).toBe(0);
    expect(labelText(s)).toBe('1 node, path length 0'); // REGRESSION PIN until H-RT-13 / M-RT-08
  });

  it("view: picture elements in the original's order, colours and sizes", () => {
    const s = evaluate(stateWith(tree([[[0, 0], 0, 0], [[1, 0], 1, 1], [[2, 0], 2, 2]]), { finalGoal: [2.2, 0], goalRadius: 0.5, newrand: [3, 0] }), null).state;
    const v = makeView(s);
    expect(Object.keys(v)).toEqual(['plotRange', 'workspace', 'goal', 'goalPoint', 'walls', 'obstacles', 'edges', 'newest', 'nodes', 'newrand', 'path', 'label']);
    expect(v.plotRange).toEqual([[-21, 21], [-21, 23]]);
    expect(v.workspace).toEqual([[-20, -20], [20, 20]]);
    expect(v.goal).toEqual({ center: [2.2, 0], r: 0.5, color: 'Green' });
    expect(v.walls).toEqual([[[-21, -21], [-20, 21]], [[20, -21], [21, 21]], [[-21, -21], [21, -20]], [[-21, 20], [21, 21]]]);
    expect(v.edges).toEqual([[[1, 0], [0, 0]], [[2, 0], [1, 0]]]);
    expect(v.newest).toEqual({ line: [[2, 0], [3, 0]], point: [2, 0] });
    expect(v.path).toEqual([[2, 0], [1, 0], [0, 0]]);
    expect(v.label).toEqual({ text: '3 nodes, path length 2.', at: [0, 22], fontPx: 18 });
    expect(STYLE).toEqual({ imageSize: 400, mediumPointPx: 5, largePointPx: 7.5, thinPx: 0.25, thickPx: 2, labelFontPx: 18, dashPx: [4, 2.7] });
    expect(makeView({ ...s, reachGoal: false }).goal.color).toBe('Yellow');
  });

  it('view: dashed line and blue point only when there is more than one node', () => {
    const one = makeView(evaluate(initialSettings(), null).state);
    expect(one.newest).toBe(null);
    expect(one.newrand).toBe(null);
    expect(one.edges).toEqual([]);
    const two = makeView(evaluate({ ...evaluate(initialSettings(), null).state, nodestoadd: 1 }, replayRng({ reals: [0.5, 10, 10] })).state);
    expect(two.newest).toEqual({ line: [[0.7071067811865475, 0.7071067811865475], [10, 10]], point: [0.7071067811865475, 0.7071067811865475] });
    expect(two.newrand).toEqual([10, 10]);
  });

  it('nearestWithin keeps list order on equal distances and includes the radius', () => {
    expect(nearestWithin([[1, 0], [0, 1], [-1, 0], [3, 0]], [0, 0], 1)).toEqual([0, 1, 2]);
    expect(nearestWithin([[0, 2], [0, 0.5]], [0, 0], 2)).toEqual([1, 0]);
  });
});
