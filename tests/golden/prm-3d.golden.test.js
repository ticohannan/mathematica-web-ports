// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/prm-3d.golden.test.js — the port against values the ORIGINAL computed:
//  * the live state (states[0]), the initial settings (specs) and the five snapshot cells' Settings (raw notebook lines
//    10908, 12996, 16776, 21566, 24913) in tests/golden/prm-3d.original-states.json (written by
//    `python3 tools/extract_state.py --snapshots <notebook> …`): complete states with samples, roadmaps and, in
//    snapshots 3 and 4, the RegionPlot3D volumes;
//  * the Initialization data of the Input cells (ptsI, goodPtsI, badPtsI, edgesNNI, edgesNNadji; readable source lines
//    178 … 190), as the port stores them;
//  * what only the picture docs/original-snapshots/prm-3d-1.png shows: the label "path length = 8.09";
//  * the Mathematica-harness records H-P3-01 … H-P3-22 (tests/golden/prm-3d.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, randomDraws, toJS } from '../support/harness-json.js';
import {
  initialState, evaluate, stateFromSettings, detCollision, jointAngle2Origin, connectPoints, ptsI, goodPtsI, badPtsI,
  edgesNNI, edgesNNadji, edgesNNsaved, edgesNNadjSaved, toroidDist, VAR_NAMES, OBS_RAD, WIDTHA, DELTA, TWO_PI,
} from '../../demos/prm-3d/model.js';
import { field, cObstacle } from '../../demos/prm-3d/cspace3d.js';
import { replayRng } from '../../shared/random.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

const FIXTURE = 'tests/golden/prm-3d.original-states.json';
const fx = loadStates(FIXTURE);
const live = plain(fx.live), specs = plain(fx.specs);
const snap = (k) => plain(fx.snapshots[k - 1]);
const SPHERES = [[1, 0, 0], [0, -1, 0.5]];
const noRng = { randomReal: () => { throw new Error('no random numbers expected'); } };
const classify = (pts, P) => ({
  good: pts.filter((p) => !detCollision(jointAngle2Origin(p), P, OBS_RAD, WIDTHA)),
  bad: pts.filter((p) => detCollision(jointAngle2Origin(p), P, OBS_RAD, WIDTHA)),
});
const labelText = (v) => (v.label.red ? v.label.text : `${v.label.text}${mmaNumberString(v.label.value)}`);
/** the state variables without the volumes (their stored option form is not a port value) */
const comparable = (s) => Object.fromEntries(VAR_NAMES.filter((k) => !k.startsWith('freeConfigSpace')).map((k) => [k, s[k]]));

describe('prm-3d golden: saved state, Initialization data and snapshots', () => {
  it('prm 3d: the saved Manipulate variables are the opening state and equal the stored specifications', () => {
    expect(comparable(stateFromSettings(live))).toEqual(comparable(initialState()));
    expect(comparable(stateFromSettings(specs))).toEqual(comparable(initialState()));
    // the volumes: RegionPlot3D[False, ...] in both (option form differs only, COMMON-DECISIONS §6) = no volume
    expect([stateFromSettings(live).freeConfigSpacea, stateFromSettings(specs).freeConfigSpaceb]).toEqual([null, null]);
    expect(initialState().freeConfigSpacea).toBe(null);
    // exact 1/2 of Obstbz and pObsOldb (N-P3-01): the nearest double is the same
    expect(fx.live.Obstbz).toEqual({ wl: '1/2', n: 0.5 });
    expect(fx.live.pObsOldb[2]).toEqual({ wl: '1/2', n: 0.5 });
    // the stored samples are the Initialization data; the stored edges are NOT edgesNNI (Q-P3-10)
    expect(live.pts).toEqual(ptsI);
    expect(live.goodPts).toEqual(goodPtsI);
    expect(live.badPts).toEqual(badPtsI);
    expect(live.edgesNN).toEqual(edgesNNsaved);
    expect(live.edgesNNadj).toEqual(edgesNNadjSaved);
    expect(edgesNNI).toHaveLength(181);
  });
  it('prm 3d: detCollision reproduces the 80 free and 20 colliding saved samples in order', () => {
    const { good, bad } = classify(live.pts, SPHERES);
    expect(good).toEqual(live.goodPts);
    expect(bad).toEqual(live.badPts);
    expect([good.length, bad.length]).toEqual([80, 20]);
  });
  it('prm 3d: the second sample set of snapshots 2 to 5 is classified 86 free and 14 colliding in order', () => {
    for (const k of [2, 3, 4, 5]) expect(snap(k).pts, `snapshot ${k}`).toEqual(snap(2).pts);
    const { good, bad } = classify(snap(2).pts, SPHERES);
    expect(good).toEqual(snap(2).goodPts);
    expect(bad).toEqual(snap(2).badPts);
    expect([good.length, bad.length]).toEqual([86, 14]);
  });
  it('prm 3d: connectPoints with r = 1.5 on the 80 saved free samples gives the 180 saved edges and the adjacency, in order', () => {
    const [adj, edges] = connectPoints(live.goodPts, live.goodPts.map(() => []), SPHERES, OBS_RAD, WIDTHA, DELTA, [], 1, 1.5);
    expect(edges).toEqual(live.edgesNN);
    expect(adj).toEqual(live.edgesNNadj);
  });
  it("prm 3d: evaluating the code's initial values (rold = -1) rebuilds the 180 saved edges, not the 181 of edgesNNI", () => {
    const code = { ...initialState(), rold: -1, edgesNN: edgesNNI, edgesNNadj: edgesNNadji, pObsOlda: [-3, -2, -2], pObsOldb: [-3, -2, -2] };
    const r = evaluate(code, noRng);
    expect(r.state.goodPts).toEqual(goodPtsI); // reclassified (pObsOld differ): the same lists
    expect(r.state.edgesNN).toEqual(live.edgesNN);
    expect(r.state.edgesNNadj).toEqual(live.edgesNNadj);
    expect(r.state.rold).toBe(1.5);
    expect([r.state.pObsOlda, r.state.pObsOldb]).toEqual([[1, 0, 0], [0, -1, 0.5]]);
    // the edge of edgesNNI that the rebuild drops is longer than the radius
    const key = (e) => JSON.stringify(e);
    const saved = new Set(live.edgesNN.map(key));
    const dropped = edgesNNI.filter((e) => !saved.has(key(e)));
    expect(dropped).toEqual([[[2.26, 1.09, 4.31], [1.92, 0.17, 3.17]]]);
    expect(Math.abs(toroidDist(...dropped[0]) - 1.50386)).toBeLessThan(5e-6);
  });
  it('prm 3d: evaluating the saved state changes nothing and gives path length 8.09', () => {
    const s = stateFromSettings(live);
    const r = evaluate(s, noRng);
    expect(r.view.rebuilt).toBe(false); // r = rold, pObsOld = the spheres
    expect(comparable(r.state)).toEqual(comparable(s));
    expect(labelText(r.view)).toBe('path length = 8.09');
  });
  it('prm 3d: the saved Manipulate path stays -1 (shadowing quirk)', () => {
    expect(live.path).toBe(-1);
    const r = evaluate(stateFromSettings(live), noRng);
    expect(r.state.path).toBe(-1);
    expect(r.view.path).toEqual([71, 78, 72, 64, 70, 34]);
  });
  it('prm 3d: snapshot 1 (saved state) reads path length = 8.09', () => {
    // snapshot 1 picture: "robot phase space" / "path length = 8.09"; θ sliders at 0.25, radius 1.5; a roadmap path
    // (thick orange/purple legs, magenta connectors, black qs/qf)
    expect(comparable(snap(1))).toEqual(comparable(live));
    const r = evaluate(stateFromSettings(snap(1)), noRng);
    expect(labelText(r.view)).toBe('path length = 8.09');
    expect(r.view.label.red).toBe(false);
    const g = JSON.stringify(r.view.phase);
    expect(g).toContain('"value":0.02'); // Thickness[0.02] for the path
    expect([snap(1)['θ1'], snap(1).r]).toEqual([0.25, 1.5]);
  });
  it('prm 3d: snapshots 2 to 5 Settings (second sample set) give 107 edges and no path at r = 1.19, 359 edges and path length 8.51 at r = 1.86', () => {
    const qsn = [6.184370139895083, 5.996718735354918, 5.9072498189673155];
    const qfn = [3.589035608654555, 3.9302429986404572, 2.447177213076131];
    for (const k of [2, 3, 4, 5]) {
      const s = snap(k);
      expect(s.qf).toEqual([3.84, 4.86, 1.62]); // the default goal (K-P3-06)
      const r19 = s.r === 1.19;
      expect(s.edgesNN).toHaveLength(r19 ? 107 : 359);
      // connectPoints on the stored free samples gives the stored roadmap exactly
      const [adj, edges] = connectPoints(s.goodPts, s.goodPts.map(() => []), SPHERES, OBS_RAD, WIDTHA, DELTA, [], 1, s.r);
      expect(edges, `snapshot ${k} edges`).toEqual(s.edgesNN);
      expect(adj, `snapshot ${k} adjacency`).toEqual(s.edgesNNadj);
      const r = evaluate(stateFromSettings(s), noRng);
      expect(r.view.rebuilt).toBe(false);
      expect(r.view.qsn).toEqual(qsn);
      expect(r.view.qfn).toEqual(qfn);
      if (r19) {
        expect(r.view.path).toBe(-1);
        expect(labelText(r.view)).toBe('No path possible');
      } else {
        expect(r.view.path).toEqual([54, 83, 73, 68, 32, 72]);
        expect(Math.abs(r.view.totdist - 8.506123161547425)).toBeLessThanOrEqual(4e-15);
        expect(labelText(r.view)).toBe('path length = 8.51');
      }
    }
    // "restart" + "add 100 vertices" replayed with the stored 300 numbers gives the snapshot 2 state (T-P3-36)
    const restarted = evaluate({ ...initialState(), r: 1.19, rold: 1.19, restart: true }, noRng).state;
    const rng = replayRng({ reals: snap(2).pts.flat() });
    const r = evaluate({ ...restarted, addPoints: true }, rng);
    for (const k of ['pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj']) expect(r.state[k], k).toEqual(snap(2)[k]);
  });
  it('prm 3d: the volumes stored in snapshots 3 and 4 lie on the boundary of the port field and have its extent', () => {
    for (const k of [3, 4]) {
      const s = snap(k);
      expect([s.showConfigObs, s.highResa, s.highResb]).toEqual([true, true, true]);
      for (const [name, c, nVerts] of [['freeConfigSpacea', [1, 0, 0], 488], ['freeConfigSpaceb', [0, -1, 0.5], 948]]) {
        const m = storedMesh(s[name]);
        expect(m.verts, `${k} ${name}`).toHaveLength(nVerts);
        expect(m.lineStyle).toEqual([0]); // GrayLevel[0] boundary lines
        const v = cObstacle(c, 48);
        const tol = gridCellChange(v);
        let worst = 0;
        for (const p of m.verts) {
          const f = field(...p, c);
          const onFace = p.some((x) => Math.abs(x) < 1e-12 || Math.abs(x - TWO_PI) < 1e-12);
          if (onFace && f <= tol) continue; // a cap vertex inside the region on a cube face
          worst = Math.max(worst, Math.abs(f));
        }
        expect(worst, `${k} ${name}: |field| at the stored boundary vertices`).toBeLessThanOrEqual(tol);
        // the extent: blue θ2 3.37 … 5.29 (θ1, θ3 over the whole cube), yellow over the whole cube; the port's within one cell
        const ext = (pts) => [0, 1, 2].map((q) => [Math.min(...pts.map((p) => p[q])), Math.max(...pts.map((p) => p[q]))]);
        const e0 = ext(m.verts), e1 = ext(v.vertices);
        e0.forEach(([a, b], q) => { expect(Math.abs(a - e1[q][0])).toBeLessThan(v.h); expect(Math.abs(b - e1[q][1])).toBeLessThan(v.h); });
        if (name === 'freeConfigSpacea') {
          expect(e0[1][0]).toBeCloseTo(3.37, 2);
          expect(e0[1][1]).toBeCloseTo(5.295, 2);
        } else expect(e0).toEqual([[0, TWO_PI], [0, TWO_PI], [0, TWO_PI]]);
      }
    }
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
const PRESS = { restart: 'restart', 'add 100 vertices': 'addPoints', 'new goal': 'newgoal' };
const WL = { 'wl:ptsI': ptsI, 'wl:goodPtsI': goodPtsI, 'wl:badPtsI': badPtsI, 'wl:edgesNNI': edgesNNI, 'wl:edgesNNadji': edgesNNadji };
function portValue(name, v) {
  if (typeof v === 'string' && v in WL) return JSON.parse(JSON.stringify(WL[v]));
  if (typeof v === 'string' && v.startsWith('wl:')) throw new Error(`${name}: unknown wl: value ${v}`);
  return toJS(v);
}
/** replay a scenario through the port (start: the initial settings); random draws come from the record (HW-53) */
function replay(scenario, record) {
  const reals = [];
  for (const d of drawsOf(scenario, record)) reals.push(...[toJS(d.value)].flat(Infinity));
  const rng = replayRng({ reals });
  let state = initialState();
  const runs = [];
  for (const step of scenario.steps) {
    if (step.seed !== undefined) continue; // the draws are replayed from the record
    if (step.setFrom) state = stateFromSettings(snap(Number(String(step.setFrom).split(':')[1])));
    else if (step.press) state = { ...state, [PRESS[step.press]]: true };
    else for (const [k, v] of Object.entries(step.set ?? {})) state[k] = portValue(k, v);
    const r = evaluate(state, rng, { controlActive: step.controlActive === true });
    state = r.state;
    runs.push(r);
  }
  return { runs, rng };
}
/**
 * The recorded draws of a scenario. A scenario without a "$RandomDraws" capture and without captureEachStep has only
 * per-step draw COUNTS in its record (HW-52), not the values. H-P3-19 is H-P3-18 (which captures $RandomDraws) plus a
 * final `set`: same start, same steps and seeds, so the generator gives the same draws (HW-22: SeedRandom before each
 * seeded press). The donor is used only after checking exactly that, step by step, including the draw counts (N-P3-08).
 */
const DRAWS_FROM = { 'H-P3-19': 'H-P3-18' };
function drawsOf(scenario, record) {
  const own = randomDraws(record);
  const counted = (record.steps ?? []).reduce((n, s) => n + toJS(s.randomDraws ?? 0), 0);
  if (own.length === counted) return own;
  const donorId = DRAWS_FROM[scenario.id];
  if (!donorId) throw new Error(`${scenario.id}: ${counted} draws counted, ${own.length} recorded`);
  const donor = harnessCase('prm-3d', donorId);
  if (donor.status !== 'ok') throw new Error(`${scenario.id}: draw donor ${donorId} ${donor.status}`);
  const dSteps = donor.scenario.steps;
  expect(scenario.start ?? 'initial', 'same start').toBe(donor.scenario.start ?? 'initial');
  expect(JSON.stringify(scenario.steps.slice(0, dSteps.length)), `${donorId} steps are a prefix`).toBe(JSON.stringify(dSteps));
  expect(record.steps.slice(0, dSteps.length).map((s) => toJS(s.randomDraws)), 'same draw counts').toEqual(donor.record.steps.map((s) => toJS(s.randomDraws)));
  expect(record.steps.slice(dSteps.length).every((s) => !toJS(s.randomDraws)), 'no draws after the shared prefix').toBe(true);
  const d = randomDraws(donor.record);
  expect(d.length).toBe(counted);
  return d;
}
const LOCALS = ['path', 'qsn', 'qfn', 'totdist', 'robotq', 'inCollision', 'inCollisionf'];
/** the port's value of a capture name after a run */
function portCapture(run, name) {
  if (name === 'path$$') return run.state.path;
  if (LOCALS.includes(name)) {
    const v = run.view[name];
    return v === null && (name === 'qsn' || name === 'qfn') ? [] : v; // {} in the original
  }
  return run.state[name];
}
const EXACT = new Set(['edgesNN', 'edgesNNadj', 'goodPts', 'badPts', 'pts', 'path', 'path$$', 'qsn', 'qfn', 'qf', 'rold', 'θ1', 'θ2', 'θ3', 'inCollision', 'inCollisionf', 'highResa', 'highResb']);
function compareCapture(rec, port, name, bitForBit) {
  const want = toJS(rec);
  if (EXACT.has(name) || (bitForBit && name === 'totdist')) { expect(port, name).toEqual(want); return; }
  const a = [port].flat(Infinity), b = [want].flat(Infinity);
  expect(a.length, name).toBe(b.length);
  a.forEach((x, i) => expect(Math.abs(x - b[i]), `${name}[${i}]`).toBeLessThanOrEqual(1e-15 * Math.max(1, Math.abs(b[i]))));
}
function compareVolume(rec, desc, name) {
  const m = storedMesh(toJS(rec));
  if (!desc) { expect(m.verts, `${name}: no volume`).toHaveLength(0); return; }
  expect(m.verts.length, `${name}: recorded volume read (not vacuous)`).toBeGreaterThan(0);
  const v = cObstacle(desc.c, 48);
  const tol = gridCellChange(v);
  for (const p of m.verts) {
    const f = field(...p, desc.c);
    const onFace = p.some((x) => Math.abs(x) < 1e-12 || Math.abs(x - TWO_PI) < 1e-12);
    if (!(onFace && f <= tol)) expect(Math.abs(f), `${name} vertex ${p}`).toBeLessThanOrEqual(tol);
  }
}
const BIT_FOR_BIT = new Set(['H-P3-01', 'H-P3-19', 'H-P3-21']); // totdist (K-P3-02)
function check(ctx, id) {
  const h = harnessCase('prm-3d', id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const { runs, rng } = replay(h.scenario, h.record);
  expect(rng.remaining().reals, 'every recorded draw consumed').toBe(0);
  const lastRun = runs[runs.length - 1];
  const steps = h.scenario.captureEachStep ? runs.map((r, i) => [r, i + 1]) : [[lastRun, null]];
  for (const [r, step] of steps) {
    for (const name of h.scenario.capture) {
      if (name === '$RandomDraws' || name === '%messages') continue;
      const rec = captureOf(h.record, name, step == null ? {} : { step });
      if (name.startsWith('freeConfigSpace')) compareVolume(rec, r.state[name], name);
      else compareCapture(rec, portCapture(r, name), name, BIT_FOR_BIT.has(id));
    }
  }
  return undefined;
}

describe('prm-3d golden: Mathematica harness records', () => {
  // one test per scenario, titled harness "H-P3-nn" (HW-65); they skip until tests/golden/prm-3d.harness.json exists
  it('harness "H-P3-01"', (ctx) => check(ctx, 'H-P3-01'));
  it('harness "H-P3-02"', (ctx) => check(ctx, 'H-P3-02'));
  it('harness "H-P3-03"', (ctx) => check(ctx, 'H-P3-03'));
  it('harness "H-P3-04"', (ctx) => check(ctx, 'H-P3-04'));
  it('harness "H-P3-05"', (ctx) => check(ctx, 'H-P3-05'));
  it('harness "H-P3-06"', (ctx) => check(ctx, 'H-P3-06'));
  it('harness "H-P3-07"', (ctx) => check(ctx, 'H-P3-07'));
  it('harness "H-P3-08"', (ctx) => check(ctx, 'H-P3-08'));
  it('harness "H-P3-09"', (ctx) => check(ctx, 'H-P3-09'));
  it('harness "H-P3-10"', (ctx) => check(ctx, 'H-P3-10'));
  it('harness "H-P3-11"', (ctx) => check(ctx, 'H-P3-11'));
  it('harness "H-P3-12"', (ctx) => check(ctx, 'H-P3-12'));
  it('harness "H-P3-13"', (ctx) => check(ctx, 'H-P3-13'));
  it('harness "H-P3-14"', (ctx) => check(ctx, 'H-P3-14'));
  it('harness "H-P3-15"', (ctx) => check(ctx, 'H-P3-15'));
  it('harness "H-P3-16"', (ctx) => check(ctx, 'H-P3-16'));
  it('harness "H-P3-17"', (ctx) => check(ctx, 'H-P3-17'));
  it('harness "H-P3-18"', (ctx) => check(ctx, 'H-P3-18'));
  it('harness "H-P3-19"', (ctx) => check(ctx, 'H-P3-19'));
  it('harness "H-P3-20"', (ctx) => check(ctx, 'H-P3-20'));
  it('harness "H-P3-21"', (ctx) => check(ctx, 'H-P3-21'));
  it('harness "H-P3-22"', (ctx) => check(ctx, 'H-P3-22'));
});

// ---- helpers ------------------------------------------------------------------------------------------------------
/**
 * vertices, polygons and boundary-line styles of a stored RegionPlot3D graphic (GraphicsComplex form). Compound
 * expressions are {head, args} in the original-states fixtures (extract_state.py) and {h, a} in harness records (HW-45).
 */
function storedMesh(g) {
  const out = { verts: [], polys: 0, lineStyle: [] };
  const list = (a) => (typeof a[0] === 'number' ? [a] : a);
  const hd = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? (x.h ?? x.head) : undefined);
  const ar = (x) => x.a ?? x.args;
  const inner = (x, base) => {
    if (Array.isArray(x)) { x.forEach((y) => inner(y, base)); return; }
    if (!hd(x)) return;
    if (hd(x) === 'Polygon') out.polys += list(ar(x)[0]).length;
    else if (hd(x) === 'GrayLevel') { if (!out.lineStyle.includes(ar(x)[0])) out.lineStyle.push(ar(x)[0]); } else if (hd(x) !== 'Rule' && hd(x) !== 'Line') ar(x).forEach((y) => inner(y, base));
  };
  const outer = (x) => {
    if (Array.isArray(x)) { x.forEach(outer); return; }
    if (!hd(x)) return;
    if (hd(x) === 'GraphicsComplex') { const base = out.verts.length; out.verts.push(...ar(x)[0]); inner(ar(x)[1], base); } else ar(x).forEach(outer);
  };
  if (hd(g) === 'Graphics3D') outer(ar(g)[0]);
  return out;
}
/** the largest change of the port field between neighbouring nodes of its grid (the grid tolerance) */
function gridCellChange(v) {
  const N = v.n + 1;
  let t = 0;
  for (let i = 0; i < v.values.length; i++) {
    const k = i % N, j = Math.floor(i / N) % N;
    if (k + 1 < N) t = Math.max(t, Math.abs(v.values[i + 1] - v.values[i]));
    if (j + 1 < N) t = Math.max(t, Math.abs(v.values[i + N] - v.values[i]));
    if (i + N * N < v.values.length) t = Math.max(t, Math.abs(v.values[i + N * N] - v.values[i]));
  }
  return t;
}
