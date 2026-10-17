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
import { connectPoints, regionField, DELTA, TWO_PI } from '../../demos/prm-robot-arm/model.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';

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

// ---- snapshot Settings (tests/golden/prm-robot-arm.original-states.json, tools/extract_state.py --snapshots): the five
// snapshot cells store the state behind docs/original-snapshots/prm-robot-arm-<k>.png, including the samples, the
// roadmap and the stored C-obstacle picture (freeConfigSpace, a RegionPlot) of snapshots 3 and 4. Obstbz is the exact
// 1/2 there (the port uses 0.5).
const snapFx = loadStates('tests/golden/prm-robot-arm.original-states.json');
const snapState = (k) => plain(snapFx.snapshots[k - 1]);
const LABELS = { 1: 'No path possible', 2: 'No path possible', 3: 'No path possible', 4: 'Path length = 8.46', 5: 'Path length = 8.46' };
const labelText = (l) => (typeof l === 'string' ? l : `${l.prefix}${l.value}`);
const spheres = (st) => [[st.obstaxy[0], st.obstaxy[1], st.obstaz], [st.obstbxy[0], st.obstbxy[1], st.Obstbz]];
const withoutPicture = ({ freeConfigSpace, ...rest }) => rest; // the port keeps its own C-obstacle data (D-PA-01)

/** Vertices of the stored RegionPlot: per region colour, the polygon vertices and the boundary-line vertices. */
function regionPlotVertices(g) {
  const gc = g.args[0][0];
  expect(gc.head).toBe('GraphicsComplex');
  const pts = gc.args[0], out = [];
  const walk = (e, color) => {
    if (Array.isArray(e)) { let c = color; for (const x of e) { if (x && x.head === 'Directive') { const rgb = x.args.find((a) => a && a.head === 'RGBColor'); if (rgb) c = rgb.args; } walk(x, c); } return; }
    if (e && (e.head === 'Line' || e.head === 'Polygon')) { out.push({ kind: e.head, color, vertices: e.args[0].flat(Infinity).map((i) => pts[i - 1]) }); return; }
    if (e && e.args) e.args.forEach((a) => walk(a, color));
  };
  walk(gc.args[1], null);
  return out;
}

describe('robot arm golden: the five snapshot states', () => {
  it('robot arm: snapshot 1: the Settings are the live state (no samples), with an empty stored C-obstacle picture', () => {
    expect(snapFx.count).toBe(5);
    const st = snapState(1);
    expect(withoutPicture(st)).toEqual(withoutPicture(plain(snapFx.live)));
    expect(st.freeConfigSpace.head).toBe('Graphics');
    expect(st.freeConfigSpace.args[0]).toEqual([[], []]); // RegionPlot of nothing (show obstacles off)
    expect(snapFx.snapshots[0].Obstbz).toEqual({ wl: '1/2', n: 0.5 });
  });
  for (const [k, title] of [
    [2, 'robot arm: snapshot 2: detCollision and a full roadmap rebuild of radius r reproduce the saved samples, edges and adjacency in order'],
    [3, 'robot arm: snapshot 3: detCollision and a full roadmap rebuild of radius r reproduce the saved samples, edges and adjacency in order'],
    [4, 'robot arm: snapshot 4: detCollision and a full roadmap rebuild of radius r reproduce the saved samples, edges and adjacency in order'],
    [5, 'robot arm: snapshot 5: detCollision and a full roadmap rebuild of radius r reproduce the saved samples, edges and adjacency in order'],
  ]) {
    it(title, () => {
      const st = snapState(k), pObs3 = spheres(st);
      expect(st.pts).toHaveLength(100);
      expect(st.pts.filter((p) => !detCollision(p[0], p[1], pObs3, OBS_RAD, WIDTHA))).toEqual(st.goodPts);
      expect(st.pts.filter((p) => detCollision(p[0], p[1], pObs3, OBS_RAD, WIDTHA))).toEqual(st.badPts);
      const [adj, edges] = connectPoints(st.goodPts, st.goodPts.map(() => []), pObs3, OBS_RAD, WIDTHA, DELTA, [], 1, st.r);
      expect(edges).toEqual(st.edgesNN);
      expect(adj).toEqual(st.edgesNNadj);
    });
  }
  for (const [k, title] of [
    [1, 'robot arm: snapshot 1: evaluating the saved state changes no variable, path stays -1 and the label reads No path possible'],
    [2, 'robot arm: snapshot 2: evaluating the saved state changes no variable, path stays -1 and the label reads No path possible'],
    [3, 'robot arm: snapshot 3: evaluating the saved state changes no variable, path stays -1 and the label reads No path possible'],
    [4, 'robot arm: snapshot 4: evaluating the saved state changes no variable, path stays -1 and the label reads Path length = 8.46'],
    [5, 'robot arm: snapshot 5: evaluating the saved state changes no variable, path stays -1 and the label reads Path length = 8.46'],
  ]) {
    it(title, () => {
      const st = snapState(k);
      const { state, view } = evaluate(JSON.parse(JSON.stringify(st)), replayRng({}));
      expect(withoutPicture(state)).toEqual(withoutPicture(st));
      expect(state.path).toBe(-1); // the Manipulate variable is shadowed (Q-PA-03)
      expect(labelText(view.label)).toBe(LABELS[k]);
      if (st.showConfigObs) expect(state.freeConfigSpace).toEqual(st.freeConfigSpace); // highRes: the stored picture is kept
    });
  }
  it('robot arm: snapshots 3 and 4: every vertex of the stored C-obstacle regions lies inside or within 1e-4 of the port region of its sphere', () => {
    // RegionPlot places its vertices by its own refinement (the port uses marching squares, D-PA-01), so only the
    // predicate is compared: blue = sphere a, orange = sphere b. Boundary vertices not on the plot border lie on the
    // region boundary (|field| <= 1e-4); measured worst cases 7.2e-5 (blue) and 6.6e-5 (orange).
    const BLUE = [[0.87, 0.94, 1], [0.368417, 0.506779, 0.709798]];
    for (const k of [3, 4]) {
      const st = snapState(k), pObs3 = spheres(st);
      const prims = regionPlotVertices(st.freeConfigSpace);
      expect(prims.filter((p) => p.kind === 'Polygon')).toHaveLength(4);
      expect(prims.filter((p) => p.kind === 'Line')).toHaveLength(3);
      let boundary = 0;
      for (const p of prims) {
        const c = BLUE.some((b) => JSON.stringify(b) === JSON.stringify(p.color)) ? pObs3[0] : pObs3[1];
        for (const v of p.vertices) {
          const f = regionField(v[0], v[1], c);
          expect(f).toBeLessThanOrEqual(1e-4);
          const onBorder = Math.min(v[0], v[1], TWO_PI - v[0], TWO_PI - v[1]) < 1e-6;
          if (p.kind === 'Line' && !onBorder && f > -0.01) { boundary++; expect(Math.abs(f)).toBeLessThanOrEqual(1e-4); }
        }
      }
      expect(boundary).toBeGreaterThan(350);
    }
  });
});
