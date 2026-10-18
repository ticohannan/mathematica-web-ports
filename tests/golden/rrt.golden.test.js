// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/rrt.golden.test.js — the RRT port against the ORIGINAL notebook's saved states
// (tests/golden/rrt.original-states.json: the live state, the initial settings and the six snapshot cells' Settings,
// five of them complete trees of 1001 or 501 nodes), the snapshot pictures (docs/original-snapshots/rrt-k.png) and the
// Mathematica harness (tests/golden/rrt.harness.json, written by `npm run harness -- rrt --accept`; the harness tests
// SKIP with the documented reason until that file exists). No random numbers are needed for the snapshot tests: RRT*
// trees are rebuilt from their node locations in creation order, RRT and Random Tree trees are checked rule by rule.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import {
  evaluate, initialSettings, fromSaved, inCollision, rrtStarChooseParent, appendNode, rrtStarRewire, goalCheck,
  labelText, makeView, extend, OBSEDGES, ROOT, RRT_STAR_TYPESET, STATE_KEYS, euclideanDistance, positionOf,
} from '../../demos/rrt/model.js';
import { norm } from '../../shared/mma-exact.js';
import { normalizeCR, normalizeDnrm2, euclidean } from '../../shared/mma-extra.js';
import { replayRng } from '../../shared/random.js';
import { harnessCase, captureOf, stepRecord, randomDraws, firstDifference, toJS } from '../support/harness-json.js';
import { lexReal, lexInt } from '../../tools/lib/json-lexical.mjs';

const fixture = loadStates('tests/golden/rrt.original-states.json');
const live = fromSaved(plain(fixture.live));
const specs = fromSaved(plain(fixture.specs));
const snaps = fixture.snapshots.map((s) => fromSaved(plain(s)));
const snap = (k) => snaps[k - 1];
const clone = (x) => JSON.parse(JSON.stringify(x));
const TREES = [2, 3, 4, 5, 6];

/** Unit steps (length 1 within 1e-12) and short steps of a tree: {node, parent} pairs (1-based). */
function steps(verts) {
  const unit = [], short = [];
  for (let i = 1; i < verts.length; i++) {
    const nv = verts[verts[i][1] - 1][0], np = verts[i][0];
    (Math.abs(euclideanDistance(nv, np) - 1) < 1e-12 ? unit : short).push({ nv, np });
  }
  return { unit, short };
}
/** Rebuild an RRT* tree from its locations in creation order (TESTPLAN T-RT-43/44). */
function rebuildStar(verts, obstacles) {
  const obs = OBSEDGES[obstacles];
  const out = [ROOT()];
  let rewires = 0, fails = 0, nearTies = 0;
  for (let i = 1; i < verts.length; i++) {
    const np = verts[i][0];
    const r = rrtStarChooseParent(out, np, obs);
    const sums = r.nvs.map((vs, k) => out[positionOf(out, vs) - 1][3] + r.eucDist[k]);
    const best = Math.min(...sums);
    nearTies += sums.filter((x) => Number.isFinite(x) && Math.abs(x - best) <= 1e-12 * Math.abs(best)).length - 1;
    if (inCollision(r.nv, np, obs)) fails++;
    appendNode(out, np, r.parent, r.nv);
    rewires += rrtStarRewire(out, r.nvs, r.eucDist);
  }
  return { out, rewires, fails, nearTies };
}

describe('rrt golden: saved states of the original', () => {
  it('rrt: the saved state is the state after the first evaluation of the initial settings', () => {
    expect(specs).toEqual(initialSettings());
    const { state } = evaluate(specs, null);
    for (const k of STATE_KEYS) expect(state[k], k).toEqual(live[k]);
    expect(snap(1)).toEqual(live); // snapshot 1 is the live state
  });

  it('rrt: re-evaluating each snapshot state keeps tree, path, cost and reachGoal', () => {
    for (const k of [1, 2, 3, 4, 5, 6]) {
      const { state } = evaluate(snap(k), null);
      for (const key of ['verts', 'path', 'cost', 'reachGoal', 'newrand']) expect(state[key], `snapshot ${k}: ${key}`).toEqual(snap(k)[key]);
    }
  });

  it('rrt: snapshot trees are consistent: ids, parents and children lists', () => {
    const outOfOrder = {};
    for (const k of TREES) {
      const v = snap(k).verts;
      expect(v.map((x) => x[2])).toEqual(v.map((_, i) => i + 1));
      const seen = new Array(v.length + 1).fill(0);
      let total = 0;
      outOfOrder[k] = 0;
      v.forEach((x) => {
        total += x[4].length;
        for (const c of x[4]) { seen[c]++; expect(v[c - 1][1]).toBe(x[2]); }
        if (x[4].some((c, j) => j > 0 && c < x[4][j - 1])) outOfOrder[k]++;
      });
      expect(total).toBe(v.length - 1);
      for (let i = 2; i <= v.length; i++) expect(seen[i], `snapshot ${k}, node ${i}`).toBe(1);
      expect(v[0][1]).toBe(0);
    }
    expect(outOfOrder).toEqual({ 2: 0, 3: 0, 4: 75, 5: 18, 6: 0 });
  });

  it("rrt: every saved cost is the parent's cost plus EuclideanDistance (dnrm2), bit for bit", () => {
    const sqrtModel = (u, w) => Math.sqrt((u[0] - w[0]) ** 2 + (u[1] - w[1]) ** 2);
    const mism = {}, mismSqrt = {};
    let n = 0;
    for (const k of TREES) {
      const v = snap(k).verts;
      mism[k] = 0; mismSqrt[k] = 0;
      for (let i = 1; i < v.length; i++) {
        const p = v[v[i][1] - 1];
        n++;
        if (p[3] + norm([p[0][0] - v[i][0][0], p[0][1] - v[i][0][1]]) !== v[i][3]) mism[k]++;
        if (p[3] + sqrtModel(p[0], v[i][0]) !== v[i][3]) mismSqrt[k]++;
      }
    }
    expect(n).toBe(4000);
    expect(mism).toEqual({ 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    expect(mismSqrt).toEqual({ 2: 9, 3: 10, 4: 64, 5: 32, 6: 7 }); // so √(dx² + dy²) is the wrong model
  });

  it("rrt: in the RRT snapshots every node's parent is the nearest earlier node", () => {
    for (const k of [3, 6]) {
      const v = snap(k).verts;
      let mismatches = 0, ties = 0;
      for (let i = 1; i < v.length; i++) {
        // np lies on the segment nv → p, so the node nearest to p is also the node nearest to np among the earlier ones
        let best = -1, bd = Infinity, count = 0;
        for (let j = 0; j < i; j++) {
          const d = euclidean(v[j][0], v[i][0]);
          if (d < bd) { bd = d; best = j; count = 1; } else if (d === bd) count++;
        }
        if (best + 1 !== v[i][1]) mismatches++;
        if (count > 1) ties++;
      }
      expect([mismatches, ties], `snapshot ${k}`).toEqual([0, 0]);
    }
  });

  it('rrt: no saved edge collides with the obstacles of its snapshot', () => {
    let edges = 0;
    for (const k of TREES) {
      const v = snap(k).verts, obs = OBSEDGES[snap(k).obstacles];
      for (let i = 1; i < v.length; i++) { edges++; expect(inCollision(v[v[i][1] - 1][0], v[i][0], obs), `snapshot ${k}, node ${i + 1}`).toBe(false); }
    }
    expect(edges).toBe(4000);
  });

  it('rrt: inserting the node locations of snapshot 4 with the RRT* rules reproduces the saved tree bit for bit', () => {
    const { out, rewires, fails, nearTies } = rebuildStar(snap(4).verts, snap(4).obstacles);
    expect(out).toEqual(snap(4).verts);
    expect(rewires).toBe(841);
    expect(fails).toBe(0);
    expect(nearTies).toBe(0);
  });

  it('rrt: inserting the node locations of snapshot 5 (concave) with the RRT* rules reproduces the saved tree bit for bit', () => {
    const { out, rewires, fails } = rebuildStar(snap(5).verts, snap(5).obstacles);
    expect(out).toEqual(snap(5).verts);
    expect(rewires).toBe(198);
    expect(fails).toBe(0);
  });

  it('rrt: short steps are nv + (p - nv) with p = k 0.01, as Round[x, 0.01] gives', () => {
    let count = 0, onlyTimes = 0, onlyDivide = 0, unexplained = 0;
    for (const k of [2, 3, 6]) {
      for (const { nv, np } of steps(snap(k).verts).short) {
        count++;
        const fits = (grid) => [0, 1].every((c) => {
          const k0 = Math.round(np[c] * 100);
          for (let kk = k0 - 2; kk <= k0 + 2; kk++) if (nv[c] + (grid(kk) - nv[c]) === np[c]) return true;
          return false;
        });
        const t = fits((kk) => kk * 0.01), d = fits((kk) => kk / 100);
        if (!t && !d) unexplained++;
        if (t && !d) onlyTimes++;
        if (d && !t) onlyDivide++;
      }
    }
    expect([count, unexplained, onlyTimes, onlyDivide]).toEqual([603, 0, 146, 0]);
  });

  it('rrt: every unit step is nv + Normalize[p - nv] for a 0.01-grid sample with the dnrm2 length (307 nodes need it)', () => {
    let count = 0, withD = 0, onlyD = 0, onlyCR = 0;
    for (const k of [2, 3, 6]) {
      for (const { nv, np } of steps(snap(k).verts).unit) {
        count++;
        const u = [np[0] - nv[0], np[1] - nv[1]];
        const major = Math.abs(u[0]) >= Math.abs(u[1]) ? 0 : 1, minor = 1 - major;
        let d = false, c = false;
        // grid samples p = (kx 0.01, ky 0.01) in [-20, 20]² close to the ray nv + t u, t > 1
        for (let km = -2000; km <= 2000 && !(d && c); km++) {
          const pm = km * 0.01;
          const t = (pm - nv[major]) / u[major];
          if (!(t > 0.99)) continue;
          const kn0 = Math.round((nv[minor] + t * u[minor]) * 100);
          for (let kn = kn0 - 1; kn <= kn0 + 1; kn++) {
            if (kn < -2000 || kn > 2000) continue;
            const p = major === 0 ? [pm, kn * 0.01] : [kn * 0.01, pm];
            const v = [p[0] - nv[0], p[1] - nv[1]];
            if (!(norm(v) > 1)) continue;
            if (Math.abs(v[0] * u[1] - v[1] * u[0]) > 1e-9 * norm(v)) continue; // far from the ray: neither model can hit np
            const ad = normalizeDnrm2(v);
            if (!d && nv[0] + ad[0] === np[0] && nv[1] + ad[1] === np[1]) d = true;
            if (!c) {
              const ac = normalizeCR(v);
              if (nv[0] + ac[0] === np[0] && nv[1] + ac[1] === np[1]) c = true;
            }
          }
        }
        if (d) withD++;
        if (d && !c) onlyD++;
        if (c && !d) onlyCR++;
      }
    }
    expect([count, withD, onlyD, onlyCR]).toEqual([1897, 1897, 307, 0]);
  }, 120000);

  it('rrt: the newest node of each snapshot comes from its newrand', () => {
    for (const k of [2, 3, 6]) {
      const s = snap(k), v = s.verts, last = v[v.length - 1];
      expect(extend(v[last[1] - 1][0], s.newrand), `snapshot ${k}`).toEqual(last[0]);
    }
    const s2 = snap(2), last2 = s2.verts[s2.verts.length - 1];
    expect(extend(s2.verts[last2[1] - 1][0], s2.newrand, { normalize: normalizeCR })).not.toEqual(last2[0]); // dnrm2 only
    for (const k of [4, 5]) { const v = snap(k).verts; expect(v[v.length - 1][0], `snapshot ${k}`).toEqual(snap(k).newrand); }
  });

  it('rrt: the goal check of each snapshot gives the saved path, cost and reachGoal', () => {
    const expected = { 2: null, 3: [7, 675, 47, 48], 4: [1, 966, 40.38867400690889, 20], 5: [11, null, 20.82217257408188, 9], 6: [3, null, 27, 28] };
    for (const k of TREES) {
      const s = clone(snap(k));
      expect(s.finalGoal).toEqual([-12.66, 17.25]);
      expect(s.goalRadius).toBe(2.5);
      const t = { ...s, reachGoal: false, path: [], cost: 'unset' };
      goalCheck(t);
      const inDisk = s.verts.filter((v) => euclidean(v[0], s.finalGoal) <= 2.5).length;
      if (expected[k] === null) {
        expect(inDisk).toBe(0);
        expect(t.reachGoal).toBe(false);
        continue;
      }
      const [nIn, wp, cost, len] = expected[k];
      expect(inDisk, `snapshot ${k}`).toBe(nIn);
      if (wp) expect(s.verts.findIndex((v) => v[0] === s.path[0][0] || (v[0][0] === s.path[0][0][0] && v[0][1] === s.path[0][0][1])) + 1).toBe(wp);
      expect(t.cost).toBe(cost);
      expect(t.path.length).toBe(len);
      expect(t.path).toEqual(s.path);
      expect(t.reachGoal).toBe(true);
      expect(s.reachGoal).toBe(true);
    }
  });

  it('rrt: snapshot 2 keeps a stale cost while the goal is not reached', () => {
    expect(snap(2).cost).toBe(45.80017118569193);
    expect(snap(2).reachGoal).toBe(false);
    expect(evaluate(snap(2), null).state.cost).toBe(45.80017118569193);
  });

  it('rrt: the labels of the six snapshots', () => {
    // text in docs/original-snapshots/rrt-1.png … rrt-6.png
    expect(snaps.map((s) => labelText(evaluate(s, null).state))).toEqual([
      '1 node, goal not yet reached', '1001 nodes, goal not yet reached', '1001 nodes, path length 47.',
      '1001 nodes, path length 40.39', '501 nodes, path length 20.82', '501 nodes, path length 27.',
    ]);
  });

  it('rrt: goal disk colours and the newest-node marks in the snapshot pictures', () => {
    const views = snaps.map((s) => makeView(evaluate(s, null).state));
    expect(views.map((v) => v.goal.color)).toEqual(['Yellow', 'Yellow', 'Green', 'Green', 'Green', 'Green']);
    expect(views[0].newest).toBe(null);
    expect(views[0].newrand).toBe(null);
    for (const v of views.slice(1)) { expect(v.newest.line).not.toBe(null); expect(v.newrand).not.toBe(null); }
    // snapshot 2: the green sample point at (−19.56, 6.3), in the 2× picture at about (422, 396) px: the plot range
    // −21…21 spans 394…1193 px horizontally (799 px for 42 units), y = 23 is at the top of the plot area
    expect(views[1].newrand).toEqual([-19.56, 6.3]);
    const px = 394 + ((-19.56 + 21) / 42) * 799;
    expect(Math.abs(px - 422)).toBeLessThan(3);
  });
});

// ------------------------------------------------------------------------------------------------ harness replays
const PRESS = { 1: 1, 10: 10, 100: 100, 200: 200, 500: 500 };
/** A scenario value (lexical JSON) as the port's value: strings "ctl:treeType#3" → "RRT*". */
function portValue(name, v) {
  if (typeof v === 'string' && v.startsWith('ctl:treeType#')) return ['Random Tree', 'RRT', 'RRT*'][Number(v.split('#')[1]) - 1];
  if (typeof v === 'string' && v.startsWith('wl:')) throw new Error(`${name}: wl: values are not used by the rrt scenarios`);
  return toJS(v);
}
/** The port's value of a captured variable, in the original's representation (RRT* as its typeset string). */
function recordedForm(state, name) {
  const v = state[name];
  return (name === 'treeType' || name === 'treeTypeOld') && v === 'RRT*' ? RRT_STAR_TYPESET : v;
}
/** Replays a harness scenario through the port; returns per-step states and the random source. */
function replay(scenario, record, { normalize = normalizeDnrm2 } = {}) {
  const draws = randomDraws(record);
  const reals = [], integers = [];
  for (const d of draws) {
    const val = toJS(d.value);
    if (d.fn === 'RandomInteger') integers.push(...[val].flat(Infinity)); else reals.push(...[val].flat(Infinity));
  }
  const rng = replayRng({ reals, integers });
  let state = initialSettings();
  const states = [];
  const ev = () => { state = evaluate(state, rng, { normalize }).state; };
  for (const step of scenario.steps) {
    if (step.set) {
      for (const [k, v] of Object.entries(step.set)) state[k] = portValue(k, v);
      ev();
    } else if (step.press) {
      state.nodestoadd += PRESS[step.press];
      ev();
    } else if (step.settle) {
      for (let i = 0; i < 50; i++) { const before = JSON.stringify(state); ev(); if (JSON.stringify(state) === before) break; }
    } // {"seed": n}: the draws come from the record
    states.push(clone(state));
  }
  return { states, rng };
}
/** Compares the captures of a record (each step or the last) with the replayed states; returns the differences. */
function compareCaptures(scenario, record, states) {
  const diffs = [];
  const check = (caps, state, where) => {
    for (const [name, rec] of Object.entries(caps ?? {})) {
      let actual;
      if (name === '$RandomDraws' || name === '%messages' || name === 'wl:AbsoluteTime[]') continue;
      if (name === '%text') actual = [labelText(state)];
      else if (name === 'wl:{Length[verts], nodestoadd}') actual = [state.verts.length, state.nodestoadd];
      else if (name === 'wl:Length[verts]') actual = state.verts.length;
      else if (name.startsWith('%') || name.startsWith('wl:')) continue;
      else actual = recordedForm(state, name);
      const d = name === '%text' ? ([].concat(toJS(rec)).includes(actual[0]) ? null : `%text: ${JSON.stringify(toJS(rec))} vs ${actual[0]}`) : firstDifference(rec, actual, name);
      if (d) diffs.push(`${where}: ${d}`);
    }
  };
  if (scenario.captureEachStep) scenario.steps.forEach((_, i) => check(stepRecord(record, i + 1).capture, states[i], `step ${i + 1}`));
  else check(record.capture, states[states.length - 1], 'end');
  return diffs;
}
function harnessTest(id, title, { models = [normalizeDnrm2] } = {}) {
  it(`${id}: ${title}`, (ctx) => {
    const h = harnessCase('rrt', id);
    if (h.status !== 'ok') return ctx.skip(h.reason);
    const results = models.map((normalize) => {
      const { states, rng } = replay(h.scenario, h.record, { normalize });
      const left = rng.remaining();
      return { diffs: compareCaptures(h.scenario, h.record, states), left };
    });
    const ok = results.find((r) => r.diffs.length === 0 && r.left.reals === 0 && r.left.integers === 0);
    expect(ok, JSON.stringify(results.map((r) => ({ first: r.diffs.slice(0, 3), left: r.left })))).toBeTruthy();
  });
}

describe('rrt golden: Mathematica harness (tests/golden/rrt.harness.json)', () => {
  harnessTest('H-RT-01', 'the first evaluation from the `"Variables"` values equals the saved state');
  harnessTest('H-RT-02', 'three single presses, the port replays each draw and rounds it as Mathematica');
  harnessTest('H-RT-03', 'a press of 10 adds 5 nodes, then one per further evaluation');
  // K-RT-02: which Normalize length Mathematica 15.0.1 uses here — the test passes with either model and the failure
  // message lists both; the DESIGN records the answer
  harnessTest('H-RT-04', 'RRT, narrow passage, 1001 nodes, replayed bit for bit', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-05', 'Random Tree, 1001 nodes, including RandomInteger draws', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-06', 'RRT*, narrow passage, 1001 nodes', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-07', 'RRT*, concave, 501 nodes', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-08', 'RRT, concave, 501 nodes', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-09', 'sparse obstacles, RRT then RRT*', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-10', 'bias 0.9 piles duplicate nodes on the goal', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-11', 'RRT*, bias 0.5, goal radius 0: duplicates, Ordering ties, exact goal hit', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-12', 'Random Tree with bias: duplicates resolve to the first copy', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-13', 'root in the goal disk: label string');
  harnessTest('H-RT-14', 'tree type and obstacle changes reset the tree but not cost', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-15', 'goal and radius changes reset and recompute the path', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-16', 'goal inside a wall with bias 0.9: failed attempts consume draws', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-17', 'RRT* with bias 0.2, two batches of 500', { models: [normalizeDnrm2, normalizeCR] });
  harnessTest('H-RT-18', 'four RRT* batches of 500: kernel time and messages', { models: [normalizeDnrm2, normalizeCR] });

  it('the harness replay helper reads a synthetic record (draw order, press, settle, captures)', () => {
    // a self-made record in the harness format: H-RT-02-like single press with known draws
    const scenario = { id: 'X', steps: [{ seed: 1 }, { press: '1' }, { settle: true }], captureEachStep: false, capture: ['verts', 'newrand', 'nodestoadd'] };
    const real = lexReal, int = lexInt;
    const record = {
      capture: {
        $RandomDraws: [{ fn: 'RandomReal', args: [], value: real(0.5) }, { fn: 'RandomReal', args: [], value: [real(3), real(4)] }],
        verts: [[[real(0), real(0)], int(0), int(1), int(0), [int(2)]],
          [[real(0.6000000000000001), real(0.8)], int(1), int(2), real(1), []]],
        newrand: [real(3), real(4)],
        nodestoadd: int(0),
      },
    };
    const { states, rng } = replay(scenario, record);
    expect(rng.remaining()).toEqual({ reals: 0, integers: 0 });
    expect(compareCaptures(scenario, record, states)).toEqual([]);
    expect(captureOf(record, 'newrand').length).toBe(2);
  });
});
