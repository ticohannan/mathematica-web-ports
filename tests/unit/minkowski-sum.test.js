// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/minkowski-sum.test.js — the model of the Minkowski-sum port (demos/minkowski-sum/minkowski.js).
// Expected values: derived by hand from the original's source lines, quoted from the design's independent reference
// scripts (ref/ms_oracle.py: monotone-chain hulls, the sum as the hull of all vertex differences, shoelace centroids;
// ref/ms_model.py for orders and ties, "model:" in the TESTPLAN), or computed by the INDEPENDENT oracles below
// (monotone chain, hull of differences, separating-axis test) — never by the code under test.
import { describe, it, expect } from 'vitest';
import {
  evaluate, initialSettings, DEFAULT_PTS, convexHullGrahamScan, normalVector, vector, centroidOfPoly, areaOfPoly,
  discretizeLineRev1, discretizePolyRev1, minkowskiWalk, robotAt, FRAME_HALF, MOVE_VIEW, X_LIMIT,
} from '../../demos/minkowski-sum/minkowski.js';
import { mulberry32 } from '../../shared/random.js';

const run = (over = {}) => evaluate({ ...initialSettings(), ...over, pts: (over.pts ?? DEFAULT_PTS).map((p) => [...p]) });
const withPts = (changes, over = {}) => {
  const pts = DEFAULT_PTS.map((p) => [...p]);
  for (const [i, p] of Object.entries(changes)) pts[Number(i) - 1] = [...p];
  return run({ ...over, pts });
};
const close = (a, b, tol = 1e-12) => {
  expect(a.length).toBe(b.length);
  a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], tol) : expect(Math.abs(x - b[i]), `${x} vs ${b[i]}`).toBeLessThanOrEqual(tol)));
};
const keys = (v) => v.orderOfNormals.map((r) => r.key);

// ---- independent oracles --------------------------------------------------------------------------------------
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Andrew's monotone chain (counter-clockwise, collinear points dropped). */
function hullIndependent(P) {
  const Q = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (Q.length <= 2) return Q;
  const lo = [], up = [];
  for (const p of Q) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...Q].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
const shoelace = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
const sameSet = (A, B, tol = 1e-12) => A.length === B.length && A.every((a) => B.some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tol));
/** separating-axis overlap depth of two convex polygons (<= 0: no overlap) */
function overlapDepth(A, B) {
  let depth = Infinity;
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const nx = b[1] - a[1], ny = a[0] - b[0], L = Math.hypot(nx, ny);
      if (L === 0) continue;
      const proj = (Q) => Q.map((q) => (q[0] * nx + q[1] * ny) / L);
      const pa = proj(A), pb = proj(B);
      depth = Math.min(depth, Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb)));
    }
  }
  return depth;
}
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const polyDist = (A, B) => {
  let d = Infinity;
  for (const [P, Q] of [[A, B], [B, A]]) for (const p of P) for (let i = 0; i < Q.length; i++) d = Math.min(d, segDist(p, Q[i], Q[(i + 1) % Q.length]));
  return d;
};
/** random robot (indices 1..m) and obstacle (6..n+5) in their boxes, other locators at the defaults */
function randomScene(rand) {
  const m = 3 + Math.floor(rand() * 3), n = 3 + Math.floor(rand() * 3);
  const pts = DEFAULT_PTS.map((p) => [...p]);
  const rx = () => X_LIMIT + rand() * (3.249 - X_LIMIT), ry = () => 1.489 + rand() * (3.298 - 1.489);
  for (let i = 0; i < m; i++) pts[i] = [rx(), ry()];
  for (let i = 0; i < n; i++) pts[5 + i] = [-rx(), ry()];
  return { m, n, pts };
}

describe('minkowski-sum model', () => {
  // ---- clamp (F-MS-09) ----
  it('pts constraint: robot x below 1.34704 and obstacle x above -1.34704 are clamped, written back into pts', () => {
    const { state } = run();
    expect(state.pts[6]).toEqual([-1.34704, 2.607]); // -1.347 > -1.34704
    expect(state.pts[3]).toEqual([1.348, 2.607]); // locator 4 (unused at m 3) keeps 1.348 anyway
    DEFAULT_PTS.forEach((p, i) => { if (i !== 6) expect(state.pts[i]).toEqual(p); });
    expect(withPts({ 1: [0.5, 2.0] }).state.pts[0]).toEqual([1.34704, 2.0]);
  });
  it('only the first m robot and n obstacle locators are clamped, unused ones stay', () => {
    expect(withPts({ 4: [0.5, 2.0] }, { m: 3 }).state.pts[3]).toEqual([0.5, 2.0]);
    expect(withPts({ 4: [0.5, 2.0] }, { m: 4 }).state.pts[3]).toEqual([1.34704, 2.0]);
    expect(withPts({ 9: [0.2, 2.0] }, { n: 3 }).state.pts[8]).toEqual([0.2, 2.0]);
    expect(withPts({ 9: [0.2, 2.0] }, { n: 4 }).state.pts[8]).toEqual([-1.34704, 2.0]);
  });

  // ---- hulls (F-MS-10) ----
  it('convexHullGrahamScan returns the hull counter-clockwise from its first point (independent monotone-chain oracle)', () => {
    const rand = mulberry32(20261017);
    for (let t = 0; t < 500; t++) {
      const k = 3 + Math.floor(rand() * 3);
      const P = Array.from({ length: k }, () => [X_LIMIT + rand() * (3.249 - X_LIMIT), 1.489 + rand() * (3.298 - 1.489)]);
      const H = convexHullGrahamScan(P);
      expect(sameSet(H, hullIndependent(P)), `set ${t}`).toBe(true);
      expect(shoelace(H)).toBeGreaterThan(0);
      expect(H[0][1]).toBe(Math.min(...P.map((p) => p[1])));
    }
  });
  it('y ties in the Graham sort start the hull at the later of the tied points', () => {
    const obsPts = DEFAULT_PTS.slice(5).map((p) => [...p]);
    obsPts[1] = [-1.34704, 2.607];
    expect(convexHullGrahamScan(obsPts)[0]).toEqual([-2.885, 1.489]);
    expect(run().view.obstacle).toEqual([[-3.249, 2.607], [-2.885, 1.489], [-1.71, 1.489], [-1.34704, 2.607], [-2.298, 3.298]]);
    expect(convexHullGrahamScan(DEFAULT_PTS.slice(0, 5).map((p) => [...p]))[0]).toEqual([1.71, 1.489]);
    expect(run({ m: 5 }).view.robot).toEqual([[1.348, 2.607], [1.71, 1.489], [2.885, 1.489], [3.249, 2.6], [2.298, 3.298]]);
  });
  it('the hull drops interior points', () => {
    const { view } = withPts({ 4: [2.8, 2.5] }, { m: 4 });
    expect(view.robot).toEqual([[2.298, 3.298], [2.885, 1.489], [3.249, 2.6]]);
    expect(view.rl).toBe(3);
  });
  it('three collinear points stay a zero-area polygon with the mean as centroid', () => {
    expect(convexHullGrahamScan([[1.34704, 1.6], [1.34704, 2.4], [1.34704, 3.1]])).toEqual([[1.34704, 1.6], [1.34704, 3.1], [1.34704, 2.4]]);
    const { view } = withPts({ 1: [1.0, 1.6], 2: [1.0, 2.4], 3: [1.0, 3.1] });
    expect(view.robot).toEqual([[1.34704, 2.4], [1.34704, 1.6], [1.34704, 3.1]]);
    expect(view.rl).toBe(3);
    expect(areaOfPoly(view.robot)).toBe(0);
    close(view.rc, [1.34704, 2.3666666666666667]);
  });
  it('DeleteDuplicates removes coincident locators with SameQ (1 ulp)', () => {
    for (const p of [[2.885, 1.489], [2.8850000000000002, 1.489]]) {
      const { view } = withPts({ 2: p });
      expect(view.rl).toBe(2);
      expect(view.robot).toEqual([[2.885, 1.489], [2.298, 3.298]]);
    }
    expect(withPts({ 2: [2.8850000000000007, 1.489] }).view.rl).toBe(3); // 2 ulps: a separate vertex (pin until H-MS-15)
  });

  // ---- centroids, normals (F-MS-11, F-MS-12) ----
  it('centroidOfPoly: default robot (2.810667, 2.462333) and obstacle (-2.297845, 2.298053)', () => {
    const { view } = run();
    close(view.rc, [2.810666666666667, 2.462333333333333]);
    close(view.oc, [-2.297844845799675, 2.298052932481638]);
    expect(Math.abs(areaOfPoly(view.robot) - 0.6553165)).toBeLessThan(1e-12);
    expect(Math.abs(areaOfPoly(view.obstacle) - 2.37714782)).toBeLessThan(1e-12);
    close(centroidOfPoly([[0, 0], [3, 0], [0, 3]]), [1, 1]);
  });
  it('normalVector and vector take the edge as {{x2,y2},{x1,y1}}: outward normal of a counter-clockwise edge and the reversed edge vector', () => {
    expect(normalVector([[0, 0], [1, 0]])).toEqual([0, -1]);
    expect(normalVector([[0, 0], [0, 2]])).toEqual([1, 0]);
    expect(vector([[0, 0], [1, 0]])).toEqual([-1, 0]);
    expect(vector([[0, 0], [0, 2]])).toEqual([0, -2]);
  });

  // ---- sorted normals (F-MS-13) ----
  it('default sorted normals: beta1 alpha3 beta2 beta3 alpha1 beta4 beta5 alpha2 with pos = 2', () => {
    const { view } = run();
    expect(keys(view)).toEqual(['β1', 'α3', 'β2', 'β3', 'α1', 'β4', 'β5', 'α2']);
    const want = [-2.826835, -2.203955, -Math.PI / 2, -0.313916, 0.313769, 0.942418, 2.199155, 2.824981];
    view.orderOfNormals.forEach((r, i) => expect(Math.abs(r.angle - want[i])).toBeLessThan(1e-6));
    expect(view.pos).toBe(2);
    expect(view.orderOfNormalsKeys).toEqual(['β2', 'β3', 'α1', 'β4', 'β5', 'α2', 'β1', 'α3']);
  });

  // ---- the sum (F-MS-14) ----
  const DEFAULT_SUM = [[-2.372333333333, 0.653333333333], [-1.197333333333, 0.653333333333], [-0.834373333333, 1.771333333333],
    [-1.421373333333, 3.580333333333], [-2.372333333333, 4.271333333333], [-3.323333333333, 3.580333333333],
    [-3.687333333333, 2.469333333333], [-3.323333333333, 1.351333333333]];
  it('default Minkowski vertices: the hull of obstacle minus robot plus rc, starting after alpha3', () => {
    const { view } = run();
    close(view.minkowskiPoints, DEFAULT_SUM, 1e-12);
    expect(view.minkowskiPointswithSide.map((x) => x.side)).toEqual(['Alpha', 'Beta', 'Beta', 'Alpha', 'Beta', 'Beta', 'Alpha', 'Beta']);
    close(view.prev, [-3.323333333333, 1.351333333333], 1e-12);
  });
  it('default Minkowski edges: three robot lines and five obstacle lines, closing edge alpha3', () => {
    const { view } = run();
    expect(view.shiftedMink.length).toBe(9);
    close(view.shiftedMink[0], [2.223511512466, -3.942719599148], 1e-12);
    expect(view.shiftedMink[8]).toEqual(view.shiftedMink[0]);
    close(view.minkRobotlinelist, [
      [[3.761471512466, -2.824719599148], [3.174471512466, -1.015719599148]],
      [[1.272511512466, -1.015719599148], [0.908511512466, -2.126719599148]],
      [[1.272511512466, -3.244719599148], [2.223511512466, -3.942719599148]]], 1e-12);
    const P = view.shiftedMink;
    expect(view.minkObstlinelist).toEqual([[P[0], P[1]], [P[1], P[2]], [P[3], P[4]], [P[4], P[5]], [P[6], P[7]]]);
  });
  it('property: every Minkowski edge is a robot or obstacle edge and the polygon is the hull of O - (R - rc)', () => {
    const rand = mulberry32(13);
    for (let t = 0; t < 300; t++) {
      const sc = randomScene(rand);
      const { view: v } = run(sc);
      expect(v.sumOk, `scene ${t}`).toBe(true);
      const M = v.minkowskiPoints;
      const edges = M.map((p, i) => [M[(i + 1) % M.length][0] - p[0], M[(i + 1) % M.length][1] - p[1]]);
      const want = [
        ...v.robot.map((p, i) => [p[0] - v.robot[(i + 1) % v.rl][0], p[1] - v.robot[(i + 1) % v.rl][1]]),
        ...v.obstacle.map((p, i) => [v.obstacle[(i + 1) % v.ol][0] - p[0], v.obstacle[(i + 1) % v.ol][1] - p[1]]),
      ];
      expect(edges.length).toBe(want.length);
      const left = [...want];
      for (const e of edges) {
        const k = left.findIndex((w) => Math.abs(w[0] - e[0]) <= 1e-12 && Math.abs(w[1] - e[1]) <= 1e-12);
        expect(k, `scene ${t}: edge ${e}`).toBeGreaterThanOrEqual(0);
        left.splice(k, 1);
      }
      const H = hullIndependent(v.obstacle.flatMap((o) => v.robot.map((r) => [o[0] - r[0] + v.rc[0], o[1] - r[1] + v.rc[1]])));
      for (const h of H) expect(M.some((p) => Math.hypot(p[0] - h[0], p[1] - h[1]) <= 1e-12), `scene ${t}: hull vertex`).toBe(true);
      for (let i = 0; i < M.length; i++) { // extra vertices are collinear with their neighbours (Q-MS-07)
        if (H.some((h) => Math.hypot(M[i][0] - h[0], M[i][1] - h[1]) <= 1e-12)) continue;
        expect(Math.abs(cross(M[(i + M.length - 1) % M.length], M[i], M[(i + 1) % M.length]))).toBeLessThan(1e-12);
      }
    }
  });
  it('property: at every discretised boundary point the robot touches the obstacle without overlap', () => {
    const rand = mulberry32(7);
    const scenes = [{}, ...Array.from({ length: 50 }, () => randomScene(rand))];
    for (const sc of scenes) {
      const { view: v } = run(sc);
      for (let s = 1; s <= v.discretPolygon.length; s += 10) {
        const d = v.discretPolygon[s - 1];
        const R = v.robot.map((q) => [d[0] - v.rc[0] + q[0], d[1] - v.rc[1] + q[1]]);
        expect(overlapDepth(R, v.obstacle)).toBeLessThanOrEqual(1e-9);
        expect(polyDist(R, v.obstacle)).toBeLessThanOrEqual(1e-9);
      }
    }
  });
  it("parallel robot and obstacle edges: tied angles keep Mathematica's Sort order (reverse input order)", () => {
    const { view } = withPts({ 1: [1.5, 1.6], 2: [2.5, 1.6], 3: [2.5, 2.6], 4: [1.5, 2.6], 6: [-1.5, 1.6], 7: [-2.5, 1.6], 8: [-2.5, 2.6], 9: [-1.5, 2.6] }, { m: 4, n: 4 });
    expect(keys(view)).toEqual(['β2', 'α3', 'β3', 'α4', 'β4', 'α1', 'β1', 'α2']);
    expect(view.pos).toBe(2);
    close(view.minkowskiPoints[0], [-1, 1.1], 1e-12);
    expect(view.minkowskiPointswithSide[0].side).toBe('Alpha');
    expect(view.minkowskiPoints.length).toBe(8);
  });
  it('single-point robot: None never compares less, the sort model finds no alpha-beta pair (regression pin)', () => {
    const a = run({ m: 1 }).view;
    expect(keys(a)).toEqual(['β1', 'β2', 'β3', 'β4', 'β5', 'α1']);
    expect(a.orderOfNormals[5].angle).toBe(null);
    expect(a.pos).toBe(null);
    expect(a.sumOk).toBe(false);
    const b = run({ n: 1 }).view;
    expect(keys(b)).toEqual(['β1', 'α3', 'α1', 'α2']);
    expect(b.pos).toBe(null);
    expect(null < 1).toBe(true); // what JavaScript's coercion would answer — the port must not use it
    // D-MS-05: no sum drawn, dl kept
    const r = run({ m: 1 }).state;
    expect(r.dl).toBe(null);
    expect(run({ m: 1 }).view.scene.some((x) => x.role === 'mink-polygon')).toBe(false);
  });
  it('Chop applies to the stored vertex, the running sum keeps values below 1e-10', () => {
    const out = minkowskiWalk([1, 0], [{ vec: [1 - 3e-11, 0], side: 'Alpha' }, { vec: [1, 0], side: 'Beta' }]);
    expect(out[0].point[0]).toBe(0);
    expect(out[1].point[0]).toBe((1 - (1 - 3e-11)) - 1); // 3e-11 + … : the unchopped running sum
    expect(out[1].point[0]).not.toBe(-1); // chopping the running sum would give exactly -1
  });

  // ---- discretisation (F-MS-15) ----
  it('discretizeLineRev1: points every step, the end point only when the step divides the length', () => {
    const a = discretizeLineRev1([[0, 0], [0.05, 0]], 0.01);
    expect(a.length).toBe(6);
    expect(a[5]).toEqual([0.05, 0]);
    const b = discretizeLineRev1([[0, 0], [0.055, 0]], 0.01);
    expect(b.length).toBe(6);
    expect(Math.abs(b[5][0] - 0.05)).toBeLessThan(1e-15);
    expect(discretizeLineRev1([[1, 1], [1, 1]], 0.01)).toEqual([[1, 1]]);
    expect(discretizePolyRev1([[0, 0], [0.05, 0]], 0.01).length).toBe(6 + 6 + 1);
  });
  it('dl at the defaults is 1017', () => {
    const { state, view } = run();
    expect(state.dl).toBe(1017);
    const M = view.minkowskiPoints;
    const counts = M.map((p, i) => discretizeLineRev1([p, M[(i + 1) % M.length]], 0.01).length);
    expect(counts).toEqual([118, 118, 191, 118, 118, 117, 118, 118]);
    expect(view.discretPolygon[118]).toEqual(M[1]);
  });

  // ---- labels (F-MS-19) ----
  it('polygon labels: robot 0.2 outside, obstacle 0.2 inside, 0.65 outside for two-vertex polygons', () => {
    const { view } = run();
    close(view.robotlabel.map((l) => l.at), [[2.401265, 2.331771], [3.257059, 1.982230], [2.891839, 3.110232]], 1e-6);
    close(view.obstaclelabel.map((l) => l.at), [[-2.876826, 2.109917], [-2.2975, 1.689], [-1.718746, 2.109757], [-1.940087, 2.790704], [-2.655936, 2.790701]], 1e-6);
    expect(view.robotlabel.map((l) => l.key)).toEqual(['α1', 'α2', 'α3']);
    const two = run({ m: 2 }).view;
    const u = [2.6 - 1.489, 2.885 - 3.249], L = Math.hypot(...u); // outward normal of the edge (2.885,1.489)->(3.249,2.6)
    const mid = [3.067, 2.0445];
    const off = two.robotlabel.map((l) => [(l.at[0] - mid[0]) / 0.65, (l.at[1] - mid[1]) / 0.65]);
    close(off.map((o) => Math.abs(o[0] * u[0] / L + o[1] * u[1] / L)), [1, 1], 1e-12);
    expect(Math.sign(off[0][0])).toBe(-Math.sign(off[1][0])); // one label on each side
  });
  it('Minkowski side labels: 0.25 inside, 0.7 outside for the two-vertex conditions as written', () => {
    const offsets = (v, list) => list.map((l) => {
      const j = v.orderOfNormalsKeys.indexOf(l.key);
      const a = v.shiftedMink[j], b = v.shiftedMink[j + 1];
      const nx = b[1] - a[1], ny = a[0] - b[0], L = Math.hypot(nx, ny); // outward normal (counter-clockwise sum)
      return ((l.at[0] - (a[0] + b[0]) / 2) * nx + (l.at[1] - (a[1] + b[1]) / 2) * ny) / L;
    });
    const d = run().view;
    close(offsets(d, [...d.minkowskiRobotSidesLabels, ...d.minkowskiObstacleSidesLabels]), Array(8).fill(-0.25), 1e-12);
    const a = run({ m: 2, n: 2 }).view;
    close(offsets(a, a.minkowskiRobotSidesLabels), [0.7, 0.7], 1e-12);
    close(offsets(a, a.minkowskiObstacleSidesLabels), [0.7, 0.7], 1e-12);
    const b = run({ m: 2, n: 4 }).view;
    close(offsets(b, b.minkowskiRobotSidesLabels), [-0.25, -0.25], 1e-12);
    close(offsets(b, b.minkowskiObstacleSidesLabels), [-0.25, -0.25, -0.25, -0.25], 1e-12);
    const c = run({ m: 5, n: 2 }).view;
    for (const o of offsets(c, [...c.minkowskiRobotSidesLabels, ...c.minkowskiObstacleSidesLabels])) expect(Math.abs(o + 0.25)).toBeLessThan(1e-12);
  });

  // ---- views (F-MS-16) ----
  it('static view sets c True and s 1, move view sets c False', () => {
    const a = run({ c: false, s: 300 }).state;
    expect(a.c).toBe(true);
    expect(a.s).toBe(1);
    const b = run({ c: true, s: 300, stableOrMove: MOVE_VIEW }).state;
    expect(b.c).toBe(false);
    expect(b.s).toBe(300);
  });
  it('move view: s = 119 puts the robot centroid on the second Minkowski vertex', () => {
    const { view } = run({ stableOrMove: MOVE_VIEW, s: 119 });
    const r = robotAt(view, 119);
    close(r.centroid, [1.100511512466, -1.644719599148], 1e-12);
    view.robot.forEach((q, i) => close(r.vertices[i], [r.centroid[0] + q[0] - view.rc[0], r.centroid[1] + q[1] - view.rc[1]], 1e-12));
    const red = view.scene.find((x) => x.role === 'robot-centroid');
    expect(red.color).toBe('Red');
    expect(red.pts[0]).toEqual(r.centroid);
  });
  it('move view: s = dl puts the robot centroid back on the first vertex', () => {
    const { view } = run({ stableOrMove: MOVE_VIEW, s: 1017 });
    close(robotAt(view, 1017).centroid, [-0.074488487534, -1.644719599148], 1e-12);
    expect(robotAt(view, 1017).centroid).toEqual(robotAt(view, 1).centroid);
    close(robotAt(view, 1016).centroid, [-0.082278505129, -1.639002004741], 1e-12);
  });

  // ---- plot range (F-MS-18) ----
  it('plot range: the square 7 CirclePoints[4] bounds the default picture, a spread-out robot and obstacle extend it', () => {
    expect(FRAME_HALF).toBe(4.949747468305832); // N[7/Sqrt[2]] in 15.0.1 (harness run 2, H-MS-25 %g)
    const coords = (scene) => scene.flatMap((x) => (x.pts ?? []).concat((x.segs ?? []).flat(), (x.arrows ?? []).flat(), x.at ? [x.at] : [], x.c ? [[x.c[0] + x.r, x.c[1] + x.r], [x.c[0] - x.r, x.c[1] - x.r]] : []));
    const spread = withPts({ 1: [1.34704, 2.4], 2: [3.249, 1.489], 3: [3.249, 3.298], 6: [-1.34704, 2.4], 7: [-3.249, 1.489], 8: [-3.249, 3.298] }, { a: true, n: 3 });
    for (const { view } of [run({ a: true }), spread, run({ stableOrMove: MOVE_VIEW, s: 500 })]) {
      for (const [x, y] of coords(view.scene)) {
        expect(Math.abs(x)).toBeLessThanOrEqual(FRAME_HALF);
        expect(Math.abs(y)).toBeLessThanOrEqual(FRAME_HALF);
      }
    }
    expect(Math.abs(Math.max(...spread.view.shiftedMink.map((p) => p[0])) - 4.833947)).toBeLessThan(1e-6);
    expect(Math.max(...spread.view.minkowskiSidesNormalArrows.map((a) => a[1][0]))).toBeLessThanOrEqual(4.1);
  });
  it('two-vertex robot: two opposite edges and the mean as centroid', () => {
    const { view, state } = run({ m: 2, n: 4 });
    expect(view.robot).toEqual([[2.885, 1.489], [3.249, 2.6]]);
    close(view.rc, [3.067, 2.0445]);
    const [r1, r2] = view.robotNormal;
    expect(r1.normal.map((x) => -x)).toEqual(r2.normal);
    expect(r1.vec.map((x) => -x)).toEqual(r2.vec);
    expect(keys(view)).toEqual(['β1', 'α2', 'β2', 'β3', 'β4', 'α1']);
    expect(view.pos).toBe(2);
    expect(state.dl).toBe(780);
  });
  it('minus zero: the inward normal of a vertical robot edge has the angle pi, not -pi', () => {
    const n = normalVector([[1.34704, 1.6], [1.34704, 3.1]]).map((x) => -x);
    expect(n[0]).toBe(-1);
    expect(Object.is(n[1], -0)).toBe(true);
    const { view } = withPts({ 1: [1.0, 1.6], 2: [1.0, 2.4], 3: [1.0, 3.1] });
    expect(view.orderOfNormals.filter((r) => r.side === 'Alpha').some((r) => r.angle === 3.141592653589793)).toBe(true);
    expect(view.orderOfNormals.every((r) => r.angle !== -Math.PI)).toBe(true);
    expect(keys(view)).toEqual(['β1', 'β2', 'β3', 'α3', 'α1', 'β4', 'β5', 'α2']);
    expect(view.pos).toBe(5);
  });
});
