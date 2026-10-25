// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/prm-3d.test.js — model (demos/prm-3d/model.js), C-obstacle volumes (cspace3d.js) and the 3D use of the
// generalised demos/common/prm-core.js. Expected values: hand evaluation of the source formulas, the original's stored
// data (ptsI, goodPtsI, badPtsI, the saved 180 edges) and an independent Python re-implementation of the source
// (TESTPLAN, "independent Python") — never the port itself.
import { describe, it, expect } from 'vitest';
import {
  jointAngle2Origin, detCollision, robotSegments, pointsegdis2, pathOKTrobot, toroidDist, toroidLine, toroidPt, wrapto0to2pi,
  drawRobot, initialState, evaluate, connectPoints, ptsI, goodPtsI, badPtsI, edgesNNsaved, edgesNNadjSaved, PAD_MIN, PAD_MAX,
  OBS_RAD, WIDTHA, DELTA, TWO_PI, isCollided, linDist, myAstar,
} from '../../demos/prm-3d/model.js';
import { field, cObstacle, volumeFor, GRID } from '../../demos/prm-3d/cspace3d.js';
import { flatten, apply4 } from '../../shared/graphics3d.js';
import { mLess, mGreater } from '../../shared/mma.js';
import { replayRng, mulberry32 } from '../../shared/random.js';

const SPHERES = [[1, 0, 0], [0, -1, 0.5]];
const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const closeVec = (a, b, tol, what = '') => a.forEach((v, i) => expect(Math.abs(v - b[i]), `${what}[${i}] ${v} vs ${b[i]}`).toBeLessThanOrEqual(tol));
const noRng = { randomReal: () => { throw new Error('no random numbers expected'); } };
const run = (extra = {}, rng = noRng, opts = {}) => evaluate({ ...initialState(), ...extra }, rng, opts);

describe('prm-3d: kinematics and collision test', () => {
  it('jointAngle2Origin: zero gives (1,0,1), (2,0,1), (3,0,1), θ2 = π/2 lifts links 2 and 3, θ3 = π/2 turns link 3 to -y', () => {
    expect(jointAngle2Origin([0, 0, 0])).toEqual([[1, 0, 1], [2, 0, 1], [3, 0, 1]]);
    const up = jointAngle2Origin([0, Math.PI / 2, 0]);
    [[1, 0, 1], [1, 0, 2], [1, 0, 3]].forEach((p, i) => closeVec(up[i], p, 1e-15, `θ2 o${i + 1}`));
    const side = jointAngle2Origin([0, 0, Math.PI / 2]);
    [[1, 0, 1], [2, 0, 1], [2, -1, 1]].forEach((p, i) => closeVec(side[i], p, 1e-15, `θ3 o${i + 1}`));
  });
  it('drawRobot geometry (rotations about z through (0,0,1), -y through (1,0,1), -z through (2,0,1)) matches jointAngle2Origin', () => {
    const rnd = mulberry32(11);
    for (let t = 0; t < 20; t++) {
      const q = [rnd() * TWO_PI, rnd() * TWO_PI, rnd() * TWO_PI];
      const prims = flatten(drawRobot(q));
      expect(prims.map((p) => p.type)).toEqual(['cylinder', 'cylinder', 'cuboid', 'cuboid']);
      const [base, link1, link2, link3] = prims;
      expect([base.p1, base.p2, base.radius]).toEqual([[0, 0, -2.1], [0, 0, 1.1], 1 / 8]);
      const o = jointAngle2Origin(q);
      closeVec(apply4(link2.matrix, [1, 0, 1]), o[0], 1e-12, 'o1');
      closeVec(apply4(link2.matrix, [2, 0, 1]), o[1], 1e-12, 'o2');
      closeVec(apply4(link3.matrix, [3, 0, 1]), o[2], 1e-12, 'o3');
      // the drawn link 1 ends at 1.05 along the link direction (o1 - {0,0,1})
      closeVec(link1.p2, [1.05 * (o[0][0]), 1.05 * o[0][1], 1], 1e-12, 'link 1 end');
      expect([link2.min, link2.max]).toEqual([[0.95, -0.05, 0.95], [2.05, 0.05, 1.05]]);
      expect([link3.min, link3.max]).toEqual([[1.95, -0.05, 0.95], [3.05, 0.05, 1.05]]);
    }
  });
  it('detCollision: the start (0.25, 0.25, 0.25) is free (link distances 1.0301, 1.0306, 1.6178, base 1.0)', () => {
    const seg = robotSegments(jointAngle2Origin([0.25, 0.25, 0.25]));
    const d = ['link1', 'link2', 'link3', 'base'].map((k) => pointsegdis2([seg[k], SPHERES]));
    const expected = [1.0301498527179498, 1.0306188221542971, 1.6177840883809784, 1.0]; // independent Python
    d.forEach((v, i) => expect(ulps(v, expected[i]), `${i}: ${v}`).toBeLessThanOrEqual(2));
    expect(detCollision(jointAngle2Origin([0.25, 0.25, 0.25]), SPHERES, OBS_RAD, WIDTHA)).toBe(false);
  });
  it('detCollision: θ = (0, 3π/2, 0) puts link 2 through the blue centre', () => {
    const o = jointAngle2Origin([0, 1.5 * Math.PI, 0]);
    closeVec(o[1], [1, 0, 0], 1e-15, 'o2'); // link 2 from (1,0,1) down to (1,0,0) = the blue centre
    expect(pointsegdis2([[o[0], o[1]], [[1, 0, 0]]])).toBeLessThan(1e-15);
    expect(detCollision(o, SPHERES, OBS_RAD, WIDTHA)).toBe(true);
  });
  it('a sphere at (0, 0, 1) makes every configuration collide (base test)', () => {
    const P = [[0, 0, 1], [0, -1, 0.5]];
    expect(pointsegdis2([[[0, 0, 0], [0, 0, 1.1]], [[0, 0, 1]]])).toBe(0);
    for (const p of ptsI) expect(detCollision(jointAngle2Origin(p), P, OBS_RAD, WIDTHA), String(p)).toBe(true);
  });
  it('pointsegdis2, isCollided and linDist (the latter two defined but unused by the original)', () => {
    const seg = [[0, 0, 0], [0, 0, 1]];
    expect(pointsegdis2([seg, [[1, 0, 0.5]]])).toBe(1);
    expect(pointsegdis2([seg, [[0, 0, 3]]])).toBe(2);
    expect(pointsegdis2([seg, [[3, 0, 0.5], [0, 0.25, 0.2]]])).toBe(0.25);
    expect(isCollided([seg, [[1, 0, 0.5]]], 1.5)).toBe(1);
    expect(isCollided([seg, [[1, 0, 0.5]]], 0.5)).toBe(0);
    expect(linDist([0, 0, 0], [6, 0, 0])).toBe(6); // no torus: unlike toroidDist
  });
});

describe('prm-3d: local planner and toroid functions (prm-core in 3D)', () => {
  it('pathOKTrobot accepts a segment not longer than delta without any test (original quirk)', () => {
    // θ = (0, 3π/2, 0) collides (link 2 through the blue centre); a 0.1 step across it is accepted untested
    const ps = [0, 1.5 * Math.PI - 0.05, 0], pe = [0, 1.5 * Math.PI + 0.05, 0];
    expect(detCollision(jointAngle2Origin(ps), SPHERES, OBS_RAD, WIDTHA)).toBe(true);
    expect(pathOKTrobot(ps, pe, SPHERES, OBS_RAD, WIDTHA, DELTA)).toBe(true);
  });
  it('pathOKTrobot tests n = Ceiling[dist/delta] interior samples ps + d i/(n+1), never the end points', async () => {
    const { pathOKT } = await import('../../demos/common/prm-core.js');
    const seen = [];
    const ps = [0.25, 0.25, 0.25], pe = [0.25, 0.25, 1.25];
    expect(pathOKT(ps, pe, (pt) => { seen.push(pt); return false; }, DELTA)).toBe(true);
    expect(seen).toHaveLength(10); // dist 1, n = Ceiling[1/0.1] = 10
    seen.forEach((pt, k) => {
      expect(pt.slice(0, 2)).toEqual([0.25, 0.25]);
      expect(pt[2]).toBe(0.25 + 1 * ((k + 1) / 11)); // {dx,dy,dz} * Rational[i, n + 1]
    });
    expect(seen.some((pt) => pt[2] === 0.25 || pt[2] === 1.25)).toBe(false);
    // Or stops at the first colliding sample
    let calls = 0;
    expect(pathOKT(ps, pe, () => { calls++; return true; }, DELTA)).toBe(false);
    expect(calls).toBe(1);
  });
  it('pathOKTrobot goes the short way round the 3-torus and wraps each sample once', async () => {
    const { pathOKT } = await import('../../demos/common/prm-core.js');
    const seen = [];
    pathOKT([0.1, 3, 3], [6.2, 3, 3], (pt) => { seen.push(pt); return false; }, DELTA);
    const d = -0.1831853071795857; // 6.2 - 0.1 - 2π, hand
    expect(6.2 - 0.1 - TWO_PI).toBe(d);
    expect(seen).toHaveLength(2); // dist 0.1832: n = 2, samples at 1/3 and 2/3
    expect(seen[0][0]).toBe(0.1 + d * (1 / 3)); // 0.0389…: inside (0, 0.1)
    expect(seen[1][0]).toBe(0.1 + d * (2 / 3) + TWO_PI); // -0.0221… + 2π: in (6.2, 2π)
    expect(seen[0][0] > 0 && seen[0][0] < 0.1 && seen[1][0] > 6.2 && seen[1][0] < TWO_PI).toBe(true);
    expect(seen.every((pt) => pt[1] === 3 && pt[2] === 3)).toBe(true);
  });
  it('wrapto0to2π and the 2D wrap give the same result on (-2π, 4π)', () => {
    // 2D (prm, prm-robot-arm): If[pt < 0, pt + 2π]; If[pt > 2π, pt - 2π] (sequential); 3D: nested, > 2π first
    const wrap2D = (x) => { let y = x; if (mLess(y, 0)) y += TWO_PI; if (mGreater(y, TWO_PI)) y -= TWO_PI; return y; };
    const rnd = mulberry32(5);
    const xs = [];
    for (let i = 0; i < 10000; i++) xs.push(-TWO_PI + rnd() * 3 * TWO_PI);
    for (const c of [0, TWO_PI, -TWO_PI * (1 - 1e-12), 4 * Math.PI * (1 - 1e-12)]) {
      let u = c; for (let k = 0; k < 4; k++) { xs.push(u); u = nextUp(u); }
      u = c; for (let k = 0; k < 4; k++) { u = nextDown(u); xs.push(u); }
    }
    for (const x of xs) expect(Object.is(wrapto0to2pi(x), wrap2D(x)) || wrapto0to2pi(x) === wrap2D(x), String(x)).toBe(true);
  });
  it('toroidDist 3D: (0,0,0)-(6,0,0) is 0.28318530717958623, (0.1,0.1,0.1)-(6.2,6.2,6.2) is 0.31728625923515424', () => {
    expect(toroidDist([0, 0, 0], [6, 0, 0])).toBe(0.28318530717958623); // 2π - 6
    expect(ulps(toroidDist([0.1, 0.1, 0.1], [6.2, 6.2, 6.2]), 0.31728625923515424)).toBeLessThanOrEqual(1); // √3 (2π - 6.1)
    expect(toroidDist([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(toroidDist([0.5, 6, 3], [6, 0.5, 3])).toBe(toroidDist([6, 0.5, 3], [0.5, 6, 3]));
  });
  it('toroidLine 3D: a wrapped edge gives two pieces leaving the cube in color1, an inner edge one piece in color2', () => {
    const pieces = toroidLine([[0.1, 3, 3], [6.2, 3, 3]], 'Orange', 'Purple');
    expect(pieces.map((p) => p.color)).toEqual(['Orange', 'Orange']);
    expect(pieces[0].line).toEqual([[0.1, 3, 3], [-0.0831853071795857, 3, 3]]);
    expect(pieces[1].line).toEqual([[6.2, 3, 3], [6.383185307179586, 3, 3]]);
    const inner = toroidLine([[1, 1, 1], [2, 2, 2]], 'Orange', 'Purple');
    expect(inner).toEqual([{ color: 'Purple', wrapped: false, line: [[1, 1, 1], [2, 2, 2]] }]);
    // the third coordinate alone can make an edge wrap ( || dz > dz2 )
    expect(toroidLine([[1, 1, 0.2], [1, 1, 6]], 'Magenta').map((p) => p.color)).toEqual(['Magenta', 'Magenta']);
  });
  it('toroidPt 3D: fraction along the shortest edge, wrapped once per coordinate', () => {
    expect(toroidPt([[0.1, 3, 3], [6.2, 3, 3]], 0.5)).toEqual([0.008407346410207156, 3, 3]);
    expect(toroidPt([[0.1, 3, 3], [6.2, 3, 3]], 1)).toEqual([6.2, 3, 3]); // 0.1 - 0.1831… + 2π
    expect(toroidPt([[1, 2, 3], [1, 2, 3]], 0.7)).toEqual([1, 2, 3]); // dist == 0: the first point
    // N-P3-03: the zero test uses the ABSOLUTE differences (2π here, not 0); the point is the same as with the 2D test
    expect(toroidPt([[0, 1, 1], [TWO_PI, 1, 1]], 0.5)).toEqual([0, 1, 1]);
  });
});

describe('prm-3d: roadmap, query and progress', () => {
  it('with the first sample set, radius 1.19 gives 101 edges and no path', () => {
    const r = run({ r: 1.19 });
    expect(r.view.rebuilt).toBe(true);
    expect(r.state.edgesNN).toHaveLength(101); // independent Python
    expect(r.state.rold).toBe(1.19);
    expect(r.view.qsn).toEqual([0.43, 5.91, 0.47]);
    expect(r.view.qfn).toEqual([3.89, 5.48, 2.37]);
    expect(r.view.path).toBe(-1);
    expect(r.view.label).toEqual({ text: 'No path possible', red: true });
  });
  it('radius 0 gives no edges and empty adjacency lists', () => {
    const r = run({ r: 0 });
    expect(r.state.edgesNN).toEqual([]);
    expect(r.state.edgesNNadj).toEqual(goodPtsI.map(() => []));
    expect(r.view.path).toBe(-1);
    expect(r.state.rold).toBe(0);
  });
  it('the saved roadmap gives path 71, 78, 72, 64, 70, 34 with qsn (0.43, 5.91, 0.47) and qfn (3.89, 5.48, 2.37)', () => {
    const r = run();
    expect(r.view.path).toEqual([71, 78, 72, 64, 70, 34]);
    expect(r.view.qsn).toEqual([0.43, 5.91, 0.47]);
    expect(r.view.qfn).toEqual([3.89, 5.48, 2.37]);
    expect(Math.abs(r.view.totdist - 8.090258898868402)).toBeLessThanOrEqual(4e-15); // independent Python
    expect(r.view.label).toEqual({ text: 'path length = ', value: 8.09, red: false });
    // myAstar on the saved adjacency directly
    expect(myAstar(edgesNNadjSaved, goodPtsI, 71, 34)).toEqual([71, 78, 72, 64, 70, 34]);
  });
  it('a direct path is accepted even when the start is in collision (original quirk)', () => {
    // sphere a at o3 of (0.25, 0.25, 0.25): the start collides; the goal 0.05 away (untested segment, Q-P3-04)
    const o3 = [2.8785189552120833, 0.47966463907398726, 1.4871167285566245]; // independent Python
    closeVec(jointAngle2Origin([0.25, 0.25, 0.25])[2], o3, 1e-15, 'o3');
    const r = run({ Obstaxy: [o3[0], o3[1]], Obstaz: o3[2], qf: [0.3, 0.25, 0.25] });
    expect(r.view.inCollision).toBe(true);
    expect(r.view.path).toBe(-2);
    expect(r.view.totdist).toBe(0.04999999999999999);
    expect(r.view.label.value).toBe(0.05);
  });
  it('the Manipulate variable path is shadowed by the Module local and stays -1 (original quirk)', () => {
    const r = run();
    expect(r.state.path).toBe(-1);
    expect(Array.isArray(r.view.path)).toBe(true);
  });
  it('progress 0.5 on the saved path puts the robot on segment 4 at (2.0865392601981254, 5.1017467996397725, 2.794532688302591)', () => {
    const r = run({ progress: 0.5 });
    expect(r.view.segment).toBe(4); // of 7 (qs, 6 nodes, qf)
    closeVec(r.view.robotq, [2.0865392601981254, 5.1017467996397725, 2.794532688302591], 1e-14, 'robotq');
    const end = run({ progress: 1 });
    closeVec(end.view.robotq, [3.84, 4.859999999999999, 1.6199999999999997], 1e-14, 'progress 1'); // N-P3-05
    expect(run({ progress: 0 }).view.robotq).toEqual([0.25, 0.25, 0.25]);
  });
  it('theta values below 0 or above 2π are shifted by 2π and written back: -0.1 gives 6.183185307179587, 6.3 gives 0.01681469282041359', () => {
    const r = run({ 'θ1': -0.1, 'θ2': 6.3, 'θ3': TWO_PI });
    expect(r.state['θ1']).toBe(6.183185307179587); // 2π + (-0.1)
    expect(r.state['θ2']).toBe(0.01681469282041359); // 6.3 - 2π
    expect(r.state['θ3']).toBe(TWO_PI); // tolerant Greater: 2π itself is not shifted
    expect(r.view.qs).toEqual([6.183185307179587, 0.01681469282041359, TWO_PI]);
  });
  it('the sphere pads span {-3, -3} to {1, 1} (original quirk)', () => {
    expect(PAD_MIN).toEqual([-3, -3]); // 3{-1, -1}
    expect(PAD_MAX).toEqual([1, 1]); // {1, 1}, not 3{1, 1}
    const s = initialState();
    expect([s.Obstaxy, s.Obstbxy]).toEqual([[1, 0], [0, -1]]);
    expect([s.Obstaz, s.Obstbz]).toEqual([0, 0.5]);
  });
});

describe('prm-3d: buttons, obstacle moves and evaluation order', () => {
  it('moving an obstacle re-classifies every sample and sets rold = -1', () => {
    const r = run({ Obstbz: 1.5 });
    const P = [[1, 0, 0], [0, -1, 1.5]];
    const bad = ptsI.filter((p) => detCollision(jointAngle2Origin(p), P, OBS_RAD, WIDTHA));
    expect(r.state.badPts).toEqual(bad); // rebuilt from pts, in pts order
    expect(r.state.goodPts).toEqual(ptsI.filter((p) => !bad.includes(p)));
    expect([r.state.goodPts.length, r.state.badPts.length]).toEqual([80, 20]); // independent Python
    expect(r.view.rebuilt).toBe(true); // rold = -1 then the rebuild sets rold = r again
    expect(r.state.rold).toBe(1.5);
    expect(r.state.pObsOldb).toEqual([0, -1, 1.5]);
    expect(r.state.pObsOlda).toEqual([1, 0, 0]);
    expect(r.state.highResb).toBe(false);
  });
  it('an obstacle move that leaves at most 5 free samples keeps the OLD edges (original quirk)', () => {
    const r = run({ Obstaxy: [0, 0], Obstaz: 1 });
    expect(r.state.goodPts).toEqual([]);
    expect(r.state.badPts).toEqual(ptsI);
    expect(r.state.rold).toBe(-1);
    expect(r.state.edgesNN).toEqual(edgesNNsaved);
    expect(r.view.inCollision).toBe(true);
    expect(r.view.path).toBe(-1);
  });
  it('restart clears pts, goodPts, badPts, edgesNN and edgesNNadj but keeps rold and qf', () => {
    const r = run({ restart: true });
    for (const k of ['pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj']) expect(r.state[k], k).toEqual([]);
    expect(r.state.rold).toBe(1.5);
    expect(r.state.qf).toEqual([3.84, 4.86, 1.62]);
    expect(r.state.restart).toBe(false);
    expect([r.state.pObsOlda, r.state.pObsOldb]).toEqual([[1, 0, 0], [0, -1, 0.5]]);
    expect(r.view.label.text).toBe('No path possible');
    expect(r.view.robotq).toEqual([0.25, 0.25, 0.25]);
  });
  it('add 100 vertices consumes RandomReal[{0, 2π}, {100, 3}] row by row and classifies with detCollision', () => {
    // replay the original's own 100 stored samples (ptsI) as the 300 random numbers, after restart
    const restarted = run({ restart: true }).state;
    const rng = replayRng({ reals: ptsI.flat() });
    const r = evaluate({ ...restarted, addPoints: true }, rng);
    expect(rng.remaining().reals).toBe(0);
    expect(r.state.pts).toEqual(ptsI);
    expect(r.state.goodPts).toEqual(goodPtsI); // the original's classification
    expect(r.state.badPts).toEqual(badPtsI);
    // connected from point 1 with r = 1.5 (rold kept, no rebuild, Q-P3-08): the saved 180 edges
    expect(r.view.rebuilt).toBe(false);
    expect(r.state.edgesNN).toEqual(edgesNNsaved);
    expect(r.state.edgesNNadj).toEqual(edgesNNadjSaved);
    expect(r.state.addPoints).toBe(false);
  });
  it('new goal consumes RandomReal[{0, 2π}, 3] before any sampling of the same evaluation', () => {
    const goal = [1.5, 2.5, 3.5];
    const rng = replayRng({ reals: [...goal, ...ptsI.flat()] });
    const r = evaluate({ ...initialState(), restart: true, newgoal: true, addPoints: true }, rng);
    expect(r.state.qf).toEqual(goal);
    expect(r.state.pts).toEqual(ptsI);
    expect(rng.remaining().reals).toBe(0);
    expect(r.state.newgoal).toBe(false);
  });
  it('connectPoints with an adjacency shorter than goodPts (K-P3-05) finishes and gives symmetric lists', () => {
    const [adj, edges] = connectPoints(goodPtsI, [], SPHERES, OBS_RAD, WIDTHA, DELTA, [], 1, 1.5);
    expect(edges).toEqual(edgesNNsaved);
    expect(adj).toEqual(edgesNNadjSaved);
    // the guard fills the missing lists densely: one (possibly empty) list per good point, no holes
    const [adj0, edges0] = connectPoints(goodPtsI, [], SPHERES, OBS_RAD, WIDTHA, DELTA, [], 1, 0.01);
    expect(edges0).toEqual([]);
    expect(adj0).toHaveLength(goodPtsI.length);
    expect(Object.keys(adj0)).toHaveLength(goodPtsI.length);
    expect(adj0.every((a) => Array.isArray(a) && a.length === 0)).toBe(true);
    // a LONGER (stale) list, the reachable case after an obstacle move (Q-P3-07), is used as it is and keeps its length
    const stale = [...edgesNNadjSaved, [1], [2]];
    expect(connectPoints(goodPtsI, stale, SPHERES, OBS_RAD, WIDTHA, DELTA, [], 81, 1.5)[0]).toEqual(stale);
  });
});

describe('prm-3d: C-obstacle volumes and view points', () => {
  it('the C-obstacle volumes: recomputed while a control is active, once more at rest, then cached per sphere', () => {
    let st = initialState();
    const step = (patch, controlActive) => { const r = evaluate({ ...st, ...patch }, noRng, { controlActive }); st = r.state; return r.view; };
    let v = step({ showConfigObs: true }, true);
    expect(v.recomputed).toEqual({ a: true, b: true });
    expect(v.volumes.a).toEqual({ c: [1, 0, 0], quality: 'speed' });
    v = step({}, true);
    expect(v.recomputed).toEqual({ a: true, b: true }); // highResa = ControlActive[False, True] = False while active
    v = step({}, false); // release: once more, at rest
    expect(v.recomputed).toEqual({ a: true, b: true });
    expect([st.highResa, st.highResb]).toEqual([true, true]);
    expect(v.volumes.b).toEqual({ c: [0, -1, 0.5], quality: 'quality' });
    v = step({}, false);
    expect(v.recomputed).toEqual({ a: false, b: false }); // cached
    v = step({ Obstbz: 0.7 }, false); // a slider move of sphere b
    expect(v.recomputed).toEqual({ a: false, b: true });
    expect(v.volumes.b.c).toEqual([0, -1, 0.7]);
    v = step({ showConfigObs: false }, false);
    expect(v.recomputed).toEqual({ a: false, b: false });
    expect(v.volumes).toEqual({ a: null, b: null });
    expect([st.highResa, st.highResb]).toEqual([false, false]);
  });
  it('the C-obstacle field is negative exactly where detCollision with that sphere is True', () => {
    const rnd = mulberry32(17);
    for (let i = 0; i < 10000; i++) {
      const q = [rnd() * TWO_PI, rnd() * TWO_PI, rnd() * TWO_PI];
      for (const c of SPHERES) expect(field(...q, c) < 0, `${q} ${c}`).toBe(detCollision(jointAngle2Origin(q), [c], OBS_RAD, WIDTHA));
    }
  });
  it('marching tetrahedra encloses the blue C-obstacle of the default sphere and closes it on the cube faces', () => {
    const v = cObstacle([1, 0, 0], 24);
    // the grid holds field() at the nodes, bit for bit (the grid loop precomputes the trigonometry)
    const N0 = v.n + 1, at = (i) => (i === v.n ? TWO_PI : i * v.h);
    for (let i = 0; i < N0; i += 3) for (let j = 0; j < N0; j += 2) for (let k = 0; k < N0; k++) expect(v.values[(i * N0 + j) * N0 + k]).toBe(field(at(i), at(j), at(k), [1, 0, 0]));
    const tris = [...v.surface, ...v.caps.map((c) => c.tri)];
    // closed: every edge belongs to exactly two triangles, and consistently oriented (each directed edge once)
    const und = new Map(), dir = new Set();
    for (const t of tris) for (let e = 0; e < 3; e++) {
      const a = t[e], b = t[(e + 1) % 3];
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      und.set(k, (und.get(k) ?? 0) + 1);
      expect(dir.has(`${a}>${b}`)).toBe(false);
      dir.add(`${a}>${b}`);
    }
    expect([...und.values()].every((n) => n === 2)).toBe(true);
    expect(v.caps.length).toBeGreaterThan(0);
    for (const { tri, normal } of v.caps) {
      const k = normal.findIndex((x) => x !== 0);
      const side = normal[k] < 0 ? 0 : TWO_PI;
      for (const i of tri) expect(v.vertices[i][k]).toBe(side); // the caps lie on the cube faces
    }
    // the stored samples: colliding with sphere a inside the mesh, free ones outside (ray casting), except within
    // the grid tolerance (|field| below the largest field change between neighbouring grid nodes)
    let tol = 0;
    const N = v.n + 1;
    for (let i = 0; i + 1 < v.values.length; i++) if ((i + 1) % N) tol = Math.max(tol, Math.abs(v.values[i + 1] - v.values[i]));
    let checked = 0;
    for (const p of ptsI) {
      const f = field(...p, [1, 0, 0]);
      if (Math.abs(f) < tol) continue;
      checked++;
      expect(insideMesh(p, v.vertices, tris), `${p} (field ${f})`).toBe(detCollision(jointAngle2Origin(p), [[1, 0, 0]], OBS_RAD, WIDTHA));
    }
    expect(checked).toBeGreaterThan(80);
    // the extent in θ2 (the stored RegionPlot3D volume of snapshot 3 spans 3.37 … 5.29, ± one cell)
    const ys = v.vertices.map((q) => q[1]);
    expect(Math.abs(Math.min(...ys) - 3.37)).toBeLessThan(v.h);
    expect(Math.abs(Math.max(...ys) - 5.29)).toBeLessThan(v.h);
    // grid sizes and the cache
    expect(GRID).toEqual({ speed: 24, quality: 48 });
    expect(volumeFor({ c: [1, 0, 0], quality: 'speed' })).toBe(volumeFor({ c: [1, 0, 0], quality: 'speed' }));
    expect(volumeFor(null)).toBe(null);
  });
  it('Initial settings restore both view points to {1.3, -2.4, 2}', () => {
    // a rotated state: both view points are Manipulate variables, kept across evaluations and drawn (Dynamic)
    const rotated = evaluate({ ...initialState(), viewPoint1: [2, 1, 0.5], viewPoint2: [-1, -1, 3] }, noRng);
    expect([rotated.state.viewPoint1, rotated.state.viewPoint2]).toEqual([[2, 1, 0.5], [-1, -1, 3]]);
    expect([rotated.view.workspace.options.ViewPoint, rotated.view.phase.options.ViewPoint]).toEqual([[2, 1, 0.5], [-1, -1, 3]]);
    rotated.state.viewPoint1[0] = 99; // the state returned must not share arrays with the stored specifications
    // the reset path of A-P3-01 (main.js: state = initialState(), then one evaluation): both pictures back to the
    // default ViewPoint of the stored specifications, {1.3, -2.4, 2}
    const reset = evaluate(initialState(), noRng);
    expect([reset.state.viewPoint1, reset.state.viewPoint2]).toEqual([[1.3, -2.4, 2], [1.3, -2.4, 2]]);
    expect([reset.view.workspace.options.ViewPoint, reset.view.phase.options.ViewPoint]).toEqual([[1.3, -2.4, 2], [1.3, -2.4, 2]]);
  });
});

// ---- helpers ------------------------------------------------------------------------------------------------------
function nextUp(x) { const b = new Float64Array([x]); const i = new BigInt64Array(b.buffer); if (x === 0) return Number.MIN_VALUE; i[0] += x > 0 ? 1n : -1n; return b[0]; }
function nextDown(x) { return -nextUp(-x); }
/** point in a closed triangle mesh: parity of the crossings of a ray in a fixed generic direction */
function insideMesh(p, V, tris) {
  const d = [0.5773, 0.5774, 0.5775];
  let n = 0;
  for (const [a, b, c] of tris) {
    const A = V[a], B = V[b], C = V[c];
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-15) continue;
    const s = [p[0] - A[0], p[1] - A[1], p[2] - A[2]];
    const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const w = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (w < 0 || u + w > 1) continue;
    if ((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det > 0) n++;
  }
  return n % 2 === 1;
}
