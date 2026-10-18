// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/minkowski-sum.golden.test.js — the port against the ORIGINAL: the live state, the initial settings and
// the Settings of the five snapshot cells stored in the notebook (tests/golden/minkowski-sum.original-states.json,
// tools/extract_state.py --snapshots), what the snapshot pictures show (docs/original-snapshots/minkowski-sum-k.png),
// and the Mathematica harness records (tests/golden/minkowski-sum.harness.json; until the owner's run exists those
// tests skip with the reason "no harness data (owner run pending)").
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { evaluate, initialSettings, robotAt, MOVE_VIEW, PLOT_RANGE } from '../../demos/minkowski-sum/minkowski.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, firstDifference, toJS } from '../support/harness-json.js';
import { LexNumber } from '../../tools/lib/json-lexical.mjs';

const fx = loadStates('tests/golden/minkowski-sum.original-states.json');
const snap = (k) => plain(fx.snapshots[k - 1]);
const VARS = ['stableOrMove', 'step', 'dl', 'rl', 'ol', 'a', 'c', 'm', 'n', 's', 'pts'];
const varsOf = (st) => Object.fromEntries(VARS.map((k) => [k, st[k]]));
const near = (a, b, tol) => a.forEach((x, i) => expect(Math.abs(x - b[i]), `${x} vs ${b[i]}`).toBeLessThanOrEqual(tol));
const angleDeg = (p, c) => (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI;
/** labels ordered counter-clockwise around centre c, starting at the one closest below (angle -90°) */
const aroundFromBottom = (labels, c) => {
  const a = labels.map((l) => ({ key: l.key, t: (((angleDeg(l.at, c) + 90) % 360) + 360) % 360 }));
  return a.sort((x, y) => x.t - y.t).map((x) => x.key);
};
const onSegment = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return t >= -1e-12 && t <= 1 + 1e-12 && Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / Math.hypot(dx, dy) < 1e-9;
};

describe('minkowski-sum golden: saved state and snapshot Settings', () => {
  it('minkowski-sum: the saved state is the state after the first evaluation of the initial settings', () => {
    expect(fx.count).toBe(5);
    expect(plain(fx.specs)).toEqual(varsOf(initialSettings())); // the stored "Variables" = the port's initial settings
    const { state } = evaluate(initialSettings());
    expect(varsOf(state)).toEqual(plain(fx.live));
    expect(state.pts[6]).toEqual([-1.34704, 2.607]);
    expect(plain(fx.live)).toEqual(snap(1)); // snapshot 1 = the live state
  });
  it('minkowski-sum: evaluating the saved state again changes nothing', () => {
    const live = plain(fx.live);
    expect(varsOf(evaluate(live).state)).toEqual(live);
  });
  it('minkowski-sum: snapshot 2 and 3 Settings (m 5, n 3, dragged vertices) give rl 5, ol 3 and dl 878', () => {
    for (const k of [2, 3]) {
      const s = snap(k);
      const { state, view } = evaluate(s);
      expect(varsOf(state), `snapshot ${k}`).toEqual(s);
      expect([state.rl, state.ol, state.dl]).toEqual([5, 3, 878]);
      expect(view.orderOfNormals.map((r) => r.key)).toEqual(['β1', 'α4', 'β2', 'α5', 'β3', 'α1', 'α2', 'α3']);
      expect(view.pos).toBe(2);
    }
    expect([snap(2).c, snap(2).s, snap(3).c, snap(3).s]).toEqual([true, 1, false, 150]);
    expect(snap(2).pts[4][0]).toBe(1.8849999999999998);
  });
  it('minkowski-sum: snapshot 4 and 5 Settings (m 2, n 4) give rl 2, ol 4 and dl 780', () => {
    for (const k of [4, 5]) {
      const s = snap(k);
      const { state } = evaluate(s);
      expect(varsOf(state), `snapshot ${k}`).toEqual(s);
      expect([state.rl, state.ol, state.dl]).toEqual([2, 4, 780]);
    }
    expect([snap(4).c, snap(4).s, snap(5).c, snap(5).s]).toEqual([true, 1, false, 166]);
  });
});

describe('minkowski-sum golden: what the snapshot pictures show', () => {
  it('minkowski-sum: snapshot 1 numbering and order of the alpha and beta labels', () => {
    const { view: v } = evaluate(snap(1));
    const ob = Object.fromEntries(v.obstaclelabel.map((l) => [l.key, l.at]));
    const rb = Object.fromEntries(v.robotlabel.map((l) => [l.key, l.at]));
    // obstacle: β1 lower left, β2 bottom, β3 lower right, β4 upper right, β5 upper left (relative to the centroid)
    const rel = (p, c) => [p[0] - c[0], p[1] - c[1]];
    const [b1, b2, b3, b4, b5] = ['β1', 'β2', 'β3', 'β4', 'β5'].map((k) => rel(ob[k], v.oc));
    expect(b1[0] < 0 && b1[1] < 0.1).toBe(true);
    expect(Math.abs(b2[0]) < 0.01 && b2[1] < -0.5).toBe(true);
    expect(b3[0] > 0 && b3[1] < 0.1).toBe(true);
    expect(b4[0] > 0 && b4[1] > 0).toBe(true);
    expect(b5[0] < 0 && b5[1] > 0).toBe(true);
    // robot: α1 left, α2 lower right, α3 top
    const [a1, a2, a3] = ['α1', 'α2', 'α3'].map((k) => rel(rb[k], v.rc));
    expect(a1[0] < 0).toBe(true);
    expect(a2[0] > 0 && a2[1] < 0).toBe(true);
    expect(a3[1] > 0.5).toBe(true);
    const ccw = ['β2', 'β3', 'α1', 'β4', 'β5', 'α2', 'β1', 'α3'];
    expect(aroundFromBottom([...v.sortedNormalRobot, ...v.sortedNormalObstacle], [-2.3, -1.5])).toEqual(ccw);
    const sumCentre = [v.shiftedMink.slice(0, -1).reduce((s, p) => s + p[0], 0) / 8, v.shiftedMink.slice(0, -1).reduce((s, p) => s + p[1], 0) / 8];
    const sideLabels = [...v.minkowskiRobotSidesLabels, ...v.minkowskiObstacleSidesLabels];
    expect(aroundFromBottom(sideLabels, sumCentre)).toEqual(ccw);
    expect(v.minkowskiRobotSidesLabels.map((l) => l.key).sort()).toEqual(['α1', 'α2', 'α3']);
    expect(v.minkRobotlinelist.length).toBe(3); // blue edges
  });
  it('minkowski-sum: snapshot 4 two-vertex robot labels on both sides of the segment', () => {
    const { view: v } = evaluate(snap(4));
    expect(v.robot).toEqual([[2.885, 1.489], [3.249, 2.6]]);
    const rb = Object.fromEntries(v.robotlabel.map((l) => [l.key, l.at]));
    near(rb['α1'], [2.4493, 2.2469], 1e-4);
    near(rb['α2'], [3.6847, 1.8421], 1e-4);
    // obstacle labels inside the quadrilateral (0.2 inward from each edge's middle)
    const inside = (p, poly) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0; });
    for (const l of v.obstaclelabel) expect(inside(l.at, v.obstacle), l.key).toBe(true);
    // in the sorted-normal disk α2 (-18.14°) and β2 (-17.98°) almost coincide
    const sd = Object.fromEntries([...v.sortedNormalRobot, ...v.sortedNormalObstacle].map((l) => [l.key, angleDeg(l.at, [-2.3, -1.5])]));
    expect(Math.abs(sd['α2'] - -18.14)).toBeLessThan(0.01);
    expect(Math.abs(sd['β2'] - -17.98)).toBeLessThan(0.01);
    expect(v.minkowskiPoints.length).toBe(6);
    expect(v.minkRobotlinelist.length).toBe(2);
    expect(v.orderOfNormals.map((r) => r.key)).toEqual(['β1', 'α2', 'β2', 'β3', 'β4', 'α1']);
  });
  it('minkowski-sum: snapshots 3 and 5 show the robot centroid at (0.889, 0.450) for s 150 and (0.632, 0.974) for s 166', () => {
    const three = evaluate(snap(3));
    expect(three.state.stableOrMove).toBe(MOVE_VIEW);
    const c3 = robotAt(three.view, 150).centroid;
    near(c3, [0.888862, 0.450124], 1e-6);
    near(c3, [0.90, 0.47], 0.03); // measured in picture 3 relative to the "obstacle" text at the origin
    const M3 = three.view.minkowskiPoints.map((p) => [p[0] - three.view.oc[0], p[1] - three.view.oc[1]]);
    expect(M3.length).toBe(8);
    expect(onSegment(c3, M3[2], M3[3])).toBe(true); // on the third edge
    const five = evaluate(snap(5));
    const c5 = robotAt(five.view, 166).centroid;
    near(c5, [0.631620, 0.974115], 1e-6);
    near(c5, [0.64, 0.99], 0.03);
    const M5 = five.view.minkowskiPoints.map((p) => [p[0] - five.view.oc[0], p[1] - five.view.oc[1]]);
    expect(M5.length).toBe(6);
    expect(onSegment(c5, M5[1], M5[2])).toBe(true); // on the second edge
    for (const { view } of [three, five]) {
      expect(view.scene.find((x) => x.role === 'mink-text').at).toEqual([0, 1.1]);
      expect(view.scene.find((x) => x.role === 'frame').pts.map((p) => Math.abs(p[0]))).toEqual(Array(4).fill(PLOT_RANGE[0][1]));
    }
  });
});

// ---- Mathematica harness records (COMMON-DECISIONS §2; scenarios in tests/harness/minkowski-sum.scenarios.json) ----
const isLex = (v) => v instanceof LexNumber;
const subKey = (v) => { // Subscript[α, 1] -> 'α1'
  if (v && v.h === 'Subscript') { const s = typeof v.a[0] === 'string' ? v.a[0] : v.a[0].sym; return `${s.slice(s.lastIndexOf('`') + 1).replace('Alpha', 'α').replace('Beta', 'β')}${toJS(v.a[1])}`; }
  return v;
};
const side = (s) => ({ α: 'Alpha', β: 'Beta', 'α': 'Alpha', 'β': 'Beta' }[s] ?? s);
/** recorded Mathematica value -> the port's shapes (numbers stay lexical, so the comparison is bit for bit) */
function decode(v) {
  if (isLex(v) || v === null || typeof v !== 'object') return typeof v === 'string' ? side(v) : v;
  if (Array.isArray(v)) return v.map(decode);
  if (v.sym === 'None') return null;
  if (v.h === 'Subscript') return subKey(v);
  if (v.h === 'Text') return { key: subKey(v.a[0]), at: decode(v.a[1]) };
  if (v.h === 'Arrow') return decode(v.a[0]);
  if (v.h === 'Association') return v.a.map((r) => ({ key: subKey(r.a[0]), value: decode(r.a[1]) }));
  return v;
}
const entry = (r) => [r.normal, r.vec, r.side, r.edge];
/** the port's value of a captured name (null: not comparable, listed in the test's note) */
function portValue(name, st, v) {
  switch (name) {
    case 'pts': case 'rl': case 'ol': case 'dl': case 'c': case 's': return st[name];
    case 'robot': case 'obstacle': case 'rc': case 'oc': case 'pos': case 'orderOfNormalsKeys': case 'minkowskiPoints':
    case 'shiftedMink': case 'minkRobotlinelist': case 'minkObstlinelist': case 'discretPolygon': case 'robotArrows':
    case 'obstacleArrows': case 'minkowskiSidesNormalArrows': case 'sortedArrows': case 'robotlabel': case 'obstaclelabel':
    case 'minkowskiRobotSidesLabels': case 'minkowskiObstacleSidesLabels': return v[name];
    case 'prev': return v.prevEnd;
    case 'robotNormal': return v.robotNormal.map(entry);
    case 'obstacleNormal': return v.obstacleNormal.map(entry);
    case 'orderOfNormals': return v.orderOfNormals.map((r) => ({ key: r.key, value: [r.angle, ...entry(r)] }));
    case '%plotRange': return PLOT_RANGE.map((r) => [...r]);
    default: return undefined; // %g, %messages: not compared here
  }
}
function setValue(x) {
  if (typeof x === 'string' && x.startsWith('wl:')) return { 'wl:True': true, 'wl:False': false }[x];
  return toJS(x);
}
const scenarios = JSON.parse(fs.readFileSync('tests/harness/minkowski-sum.scenarios.json', 'utf8')).scenarios;
const K_MS_01 = new Set(['H-MS-06', 'H-MS-07', 'H-MS-08', 'H-MS-24']);

// one golden test per harness scenario; the titles are cited by DESIGN.md ("golden \"minkowski-sum: harness H-MS-nn\"")
const HARNESS_TITLES = [
  'minkowski-sum: harness H-MS-01',
  'minkowski-sum: harness H-MS-02',
  'minkowski-sum: harness H-MS-03',
  'minkowski-sum: harness H-MS-04',
  'minkowski-sum: harness H-MS-05',
  'minkowski-sum: harness H-MS-06',
  'minkowski-sum: harness H-MS-07',
  'minkowski-sum: harness H-MS-08',
  'minkowski-sum: harness H-MS-09',
  'minkowski-sum: harness H-MS-10',
  'minkowski-sum: harness H-MS-11',
  'minkowski-sum: harness H-MS-12',
  'minkowski-sum: harness H-MS-13',
  'minkowski-sum: harness H-MS-14',
  'minkowski-sum: harness H-MS-15',
  'minkowski-sum: harness H-MS-16',
  'minkowski-sum: harness H-MS-17',
  'minkowski-sum: harness H-MS-18',
  'minkowski-sum: harness H-MS-19',
  'minkowski-sum: harness H-MS-20',
  'minkowski-sum: harness H-MS-21',
  'minkowski-sum: harness H-MS-22',
  'minkowski-sum: harness H-MS-23',
  'minkowski-sum: harness H-MS-24',
  'minkowski-sum: harness H-MS-25',
  'minkowski-sum: harness H-MS-26',
  'minkowski-sum: harness H-MS-27',
];

describe('minkowski-sum golden: Mathematica harness', () => {
  for (const title of HARNESS_TITLES) {
    const sc = scenarios.find((x) => x.id === title.slice(-7));
    it(`${title}: ${sc.why}`, (ctx) => {
      const h = harnessCase('minkowski-sum', sc.id);
      if (h.status !== 'ok') return ctx.skip(h.reason);
      let st = initialSettings(), view = null;
      for (const step of h.scenario.steps) {
        if (step.set) for (const [k, x] of Object.entries(step.set)) st[k] = setValue(x);
        if (step.setFrom) st = snap(Number(String(step.setFrom).split(':')[1]));
        ({ state: st, view } = evaluate(st));
      }
      const posRec = h.record.capture.pos;
      if (K_MS_01.has(sc.id) && posRec !== undefined) {
        // K-MS-01: the port finds an α–β pair exactly when Mathematica's pos is an integer
        expect(view.pos !== null, `${sc.id}: recorded pos ${JSON.stringify(toJS(posRec))}`).toBe(isLex(posRec));
        if (!isLex(posRec)) return;
      }
      const skipped = [];
      for (const name of sc.capture) {
        const actual = portValue(name, st, view);
        if (actual === undefined) { skipped.push(name); continue; }
        const diff = firstDifference(decode(captureOf(h.record, name)), actual, name);
        expect(diff, `${sc.id}: ${name}`).toBe(null);
      }
      ctx.task.meta.notCompared = skipped;
    });
  }
});
