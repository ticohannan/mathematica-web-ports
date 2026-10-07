// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/prm-robot-arm.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/prm-robot-arm.original-state.json; it holds no samples) and its snapshot pictures
// (docs/original-snapshots/prm-robot-arm-*.png).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialState, toAngles, detCollision, OBS_RAD, WIDTHA } from '../../demos/prm-robot-arm/model.js';
import { replayRng } from '../../shared/random.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/prm-robot-arm.original-state.json', 'utf8')).state;

// Independent closest-point distance (parametric projection clamped to [0, 1]), not the original's pointsegdis2
function segDist(a, b, p) {
  const ab = b.map((v, i) => v - a[i]);
  const ap = p.map((v, i) => v - a[i]);
  const t = Math.max(0, Math.min(1, ab.reduce((s, v, i) => s + v * ap[i], 0) / ab.reduce((s, v) => s + v * v, 0)));
  return Math.hypot(...p.map((v, i) => v - (a[i] + t * ab[i])));
}
function handDistances([t1, t2], c) {
  const elbow = [Math.cos(t1), Math.sin(t1), 1];
  const tip = [elbow[0] + Math.sin(t1) * Math.sin(t2), elbow[1] - Math.cos(t1) * Math.sin(t2), 1 + Math.cos(t2)];
  return [segDist([0, 0, 1], elbow, c), segDist(elbow, tip, c), segDist([0, 0, 0], [0, 0, 1.1], c)];
}

describe('robot arm golden (saved state of the original)', () => {
  it('robot arm: the first evaluation of the initial settings gives the saved state', () => {
    const { state } = evaluate(initialState(), replayRng({}));
    for (const k of ['pConfig', 'pConfigf', 'obstaxy', 'obstaz', 'obstbxy', 'Obstbz', 'viewAng', 'r', 'rold', 'progress',
      'showConfigObs', 'pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj', 'path', 'highRes', 'obstOld', 'pObsOld', 'addPoints', 'restart']) {
      expect(state[k], k).toEqual(saved[k]);
    }
  });

  it('robot arm: start (5,0) and goal (4,-1) are not in collision (hand calculation, green icons and brown base in the snapshots)', () => {
    const blue = [1, -0.6, 0.4], orange = [-0.8, 0.2, 0.5];
    const qs = toAngles(saved.pConfig), qf = toAngles(saved.pConfigf);
    // hand values (4 decimals): start orange 0.6720 / 0.6089 / 0.8246, blue 1.3115 / 1.9174 / 1.1662;
    // goal orange 0.8819 / 1.0721 / 0.8246, blue 1.3115 / 1.9025 / 1.1662 — margins 0.55 / 0.55 / 0.6
    const expected = { qs: [[1.3115, 1.9174, 1.1662], [0.6720, 0.6089, 0.8246]], qf: [[1.3115, 1.9025, 1.1662], [0.8819, 1.0721, 0.8246]] };
    for (const [name, q] of [['qs', qs], ['qf', qf]]) {
      [blue, orange].forEach((c, i) => {
        handDistances(q, c).forEach((d, k) => expect(d).toBeCloseTo(expected[name][i][k], 4));
      });
      expect(detCollision(q[0], q[1], [blue, orange], OBS_RAD, WIDTHA)).toBe(false);
    }
    const { view } = evaluate({ ...saved }, replayRng({}));
    expect(view.inCollision).toBe(false);
    expect(view.inCollisionf).toBe(false);
  });

  it('robot arm: the start lies just outside the orange C-obstacle (margin 0.6089 - 0.55), as in snapshot 3', () => {
    // docs/original-snapshots/prm-robot-arm-3.png: the start locator sits right next to the orange region's boundary
    const d = handDistances(toAngles(saved.pConfig), [-0.8, 0.2, 0.5]);
    expect(Math.min(...d.slice(0, 2)) - 0.55).toBeCloseTo(0.0589, 4);
  });

  it('robot arm: without samples the label reads "No path possible" (snapshot 1)', () => {
    const { view } = evaluate({ ...saved }, replayRng({}));
    expect(view.label).toBe('No path possible');
    expect(view.robotq).toEqual(toAngles(saved.pConfig));
  });
});

// Owner state 1 (Mathematica 15.0.1, saved 2026-10-06): 200 samples, moved spheres, r = rold = 1.52, obstacles shown
const owner = JSON.parse(fs.readFileSync('tests/golden/prm-robot-arm.owner-state-1.json', 'utf8')).state;

describe('robot arm golden (owner state 1, Mathematica 15.0.1)', () => {
  const pObs3 = [[owner.obstaxy[0], owner.obstaxy[1], owner.obstaz], [owner.obstbxy[0], owner.obstbxy[1], owner.Obstbz]];
  it('robot arm owner state: detCollision reproduces the 179 free and 21 colliding samples in order', () => {
    expect(owner.obstOld).toEqual(pObs3);
    expect(owner.pts.filter((p) => !detCollision(p[0], p[1], pObs3, OBS_RAD, WIDTHA))).toEqual(owner.goodPts);
    expect(owner.pts.filter((p) => detCollision(p[0], p[1], pObs3, OBS_RAD, WIDTHA))).toEqual(owner.badPts);
  });

  it('robot arm owner state: radius 1.52 and the final spheres before two batches of 100 reproduce the 1173 edges and the adjacency in order', () => {
    const rng = replayRng({ reals: owner.pts.flat() });
    let st = evaluate({ ...initialState(), obstaxy: owner.obstaxy, obstaz: owner.obstaz, obstbxy: owner.obstbxy, Obstbz: owner.Obstbz, r: 1.52 }, rng).state;
    for (let batch = 1; batch <= 2; batch++) st = evaluate({ ...st, addPoints: true }, rng).state;
    expect(rng.remaining().reals).toBe(0);
    for (const k of ['pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj', 'r', 'rold', 'obstOld']) expect(st[k], k).toEqual(owner[k]);
  });

  it('robot arm owner state: the saved Manipulate path stays -1 (shadowing quirk)', () => {
    const { state } = evaluate({ ...owner }, replayRng({}));
    expect(owner.path).toBe(-1);
    expect(state.path).toBe(owner.path); // never written (Q-PA-03)
  });

  it('robot arm owner state: regression pin of the port path label (not yet compared with the original)', () => {
    // REGRESSION PIN, not an independent expectation: the value comes from the port itself; the original's label for
    // this state still has to be read in Mathematica (O-PA-03, M-PA-06)
    const { view } = evaluate({ ...owner }, replayRng({}));
    expect(Array.isArray(view.path)).toBe(true);
    expect(view.label).toEqual({ prefix: 'Path length = ', value: 3.58 });
  });
});
