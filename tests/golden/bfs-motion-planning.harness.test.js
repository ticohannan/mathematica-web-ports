// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/bfs-motion-planning.harness.test.js — the port's model replays the Mathematica-harness scenarios
// (tests/harness/bfs-motion-planning.scenarios.json) and is compared with what Mathematica 15.0.1 recorded
// (tests/golden/bfs-motion-planning.harness.json, written by `npm run harness -- bfs-motion-planning --accept`).
// One test per H- id titled `harness "H-BF-nn"` (HW-65); without harness data every test is skipped with the reason
// "no harness data (owner run pending)" (HW-67). Start state: the initial settings (`specs` of the fixture = the live
// state); `set` assigns the variables and evaluates the body once; `setFrom` loads snapshot k's Settings and
// evaluates once; `controlActive` per step. Captures are compared bit for bit by value; Mathematica-only captures
// (%text, %messages) are not compared here; costmapcolor holds colours recorded as Wolfram expressions and is compared
// for its numbers only.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, loadScenarioFile, captureOf, toJS, isNotEvaluated, isUnassignedLocal, NO_DATA } from '../support/harness-json.js';
import { evaluate } from '../../demos/bfs-motion-planning/model.js';

const DIR = 'bfs-motion-planning';
const fx = loadStates(`tests/golden/${DIR}.original-states.json`);
const scenarios = loadScenarioFile(DIR).scenarios;

/** Replay a scenario on the model: returns the final { state, view }. */
function replay(scenario) {
  let state = plain(fx.specs), view = null;
  for (const step of scenario.steps) {
    if (step.setFrom) {
      const k = Number(String(step.setFrom).replace('snapshot:', ''));
      state = plain(fx.snapshots[k - 1]);
    } else if (step.set) {
      state = { ...state, ...toJS(step.set) };
    }
    ({ state, view } = evaluate(state, { controlActive: step.controlActive === true }));
  }
  return { state, view };
}
const PORT_VALUE = {
  Theta1: (r) => r.view.Theta1, Theta2: (r) => r.view.Theta2, inCollision: (r) => r.view.inCollision,
  resolution: (r) => r.view.resolution, pObsV: (r) => r.view.pObsV, pS: (r) => r.view.pS, pE: (r) => r.view.pE,
  ccord: (r) => r.view.ccord, costmapcolor: (r) => r.view.costmapcolor,
};
/** a recorded value as plain JS: Infinity (DirectedInfinity[1]) as Infinity, colours (non-numbers) as null */
const rec = (v) => {
  if (Array.isArray(v)) return v.map(rec);
  if (v && typeof v === 'object' && (v.wl === 'Infinity' || v.sym === 'Infinity' || v.h === 'DirectedInfinity')) return Infinity;
  const j = toJS(v);
  return typeof j === 'number' || typeof j === 'boolean' ? j : null;
};
const portComparable = (v) => (Array.isArray(v) ? v.map(portComparable) : typeof v === 'string' ? null : v);
const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i])) : Object.is(a, b) || (a === 0 && b === 0));

function check(ctx, id) {
  const h = harnessCase(DIR, id);
  if (h.status === 'skip') return ctx.skip(h.reason);
  expect(h.status, h.reason).toBe('ok');
  const r = replay(h.scenario);
  for (const name of h.scenario.capture) {
    if (name.startsWith('%')) continue; // front-end texts: compared by the manual checks
    const recorded = captureOf(h.record, name);
    const actual = PORT_VALUE[name] ? PORT_VALUE[name](r) : r.state[name];
    // an unassigned Body local is recorded as null (HW-45); the port leaves the view field undefined
    if (isUnassignedLocal(h.record, name)) { expect(actual, `${id} ${name}: unassigned in Mathematica`).toBeUndefined(); continue; }
    if (isNotEvaluated(recorded)) { expect(actual, `${id} ${name}: not evaluated in Mathematica`).toBeUndefined(); continue; }
    expect(same(rec(recorded), portComparable(actual)), `${id} ${name}`).toBe(true);
  }
}

describe('bfs harness (Mathematica 15.0.1 records)', () => {
  it('harness "H-BF-01"', (ctx) => check(ctx, 'H-BF-01'));
  it('harness "H-BF-02"', (ctx) => check(ctx, 'H-BF-02'));
  it('harness "H-BF-03"', (ctx) => check(ctx, 'H-BF-03'));
  it('harness "H-BF-04"', (ctx) => check(ctx, 'H-BF-04'));
  it('harness "H-BF-05"', (ctx) => check(ctx, 'H-BF-05'));
  it('harness "H-BF-06"', (ctx) => check(ctx, 'H-BF-06'));
  it('harness "H-BF-07"', (ctx) => check(ctx, 'H-BF-07'));
  it('harness "H-BF-08"', (ctx) => check(ctx, 'H-BF-08'));
  it('harness "H-BF-09"', (ctx) => check(ctx, 'H-BF-09'));
  it('harness "H-BF-10"', (ctx) => check(ctx, 'H-BF-10'));
  it('harness "H-BF-11"', (ctx) => check(ctx, 'H-BF-11'));
  it('harness "H-BF-12"', (ctx) => check(ctx, 'H-BF-12'));
  it('harness "H-BF-13"', (ctx) => check(ctx, 'H-BF-13'));
  it('harness "H-BF-14"', (ctx) => check(ctx, 'H-BF-14'));
  it('harness "H-BF-15"', (ctx) => check(ctx, 'H-BF-15'));
  it('harness "H-BF-16"', (ctx) => check(ctx, 'H-BF-16'));
  it('harness "H-BF-17"', (ctx) => check(ctx, 'H-BF-17'));
  it('harness "H-BF-18"', (ctx) => check(ctx, 'H-BF-18'));
  it('harness "H-BF-19"', (ctx) => check(ctx, 'H-BF-19'));
  it('harness "H-BF-20"', (ctx) => check(ctx, 'H-BF-20'));
  it('harness "H-BF-21"', (ctx) => check(ctx, 'H-BF-21'));
  it('harness "H-BF-22"', (ctx) => check(ctx, 'H-BF-22'));
  it('harness "H-BF-23"', (ctx) => check(ctx, 'H-BF-23'));
  it('every scenario of the scenario file has a test above; the replay runs without Mathematica data', () => {
    expect(scenarios.map((s) => s.id)).toEqual(Array.from({ length: 23 }, (_, i) => `H-BF-${String(i + 1).padStart(2, '0')}`));
    // the replay itself works now (its results are compared once the owner's harness run is accepted); reference
    // values of the TESTPLAN (Python reference, to be confirmed by Mathematica)
    const r01 = replay(scenarios[0]);
    expect(same(r01.state.costmap, plain(fx.live).costmap)).toBe(true);
    const r06 = replay(scenarios.find((s) => s.id === 'H-BF-06'));
    expect([r06.state.lS, r06.state.lE, r06.state.path.length, r06.view.label.text]).toEqual([[8, 7], [8, 11], 5, 'robot phase space, path length = 1.57 rads']);
    const r16 = replay(scenarios.find((s) => s.id === 'H-BF-16'));
    expect(r16.state.path).toEqual([[4, 4], [5, 4], [6, 3], [1, 2]]);
    expect(r16.view.label.text).toBe('robot phase space, path length = 4. rads');
    const r17 = replay(scenarios.find((s) => s.id === 'H-BF-17'));
    expect([r17.state.path, r17.view.label.text]).toEqual([[[3, 3], [2, 2]], 'robot phase space, path length = 1.77 rads']);
    const r20 = replay(scenarios.find((s) => s.id === 'H-BF-20'));
    expect([r20.state.freeConfigSpace.length, r20.state.lS, r20.state.lE, r20.state.path.length, r20.state.highRes]).toEqual([8, [4, 4], [4, 6], 3, false]);
    expect(replay(scenarios.find((s) => s.id === 'H-BF-23')).view.resolution).toBeUndefined();
    expect(NO_DATA).toBe('no harness data (owner run pending)');
  });
});
