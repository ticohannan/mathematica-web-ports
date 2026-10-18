// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/robot-motion-obstacles.harness.test.js — the port's model replays the Mathematica-harness scenarios
// (tests/harness/robot-motion-obstacles.scenarios.json) and is compared with what Mathematica 15.0.1 recorded
// (tests/golden/robot-motion-obstacles.harness.json, written by `npm run harness -- robot-motion-obstacles --accept`).
// One test per H- id titled `harness "H-RM-nn"` (HW-65); without harness data every test is skipped with the reason
// "no harness data (owner run pending)" (HW-67). Start state: the initial settings (`specs` of the fixture = the live
// state); `set` assigns the variables and evaluates the body once; `setFrom` loads snapshot k's Settings and
// evaluates once; `controlActive` per step. Captures are compared bit for bit by value; Mathematica-only captures
// (%text) are not compared here.
import { describe, it, expect } from 'vitest';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, loadScenarioFile, captureOf, toJS, isNotEvaluated, isUnassignedLocal, NO_DATA } from '../support/harness-json.js';
import { evaluate } from '../../demos/robot-motion-obstacles/model.js';

const DIR = 'robot-motion-obstacles';
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
  resolution: (r) => r.view.resolution, pObsV: (r) => r.view.pObsV,
};
const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i])) : Object.is(a, b) || (a === 0 && b === 0));

function check(ctx, id) {
  const h = harnessCase(DIR, id);
  if (h.status === 'skip') return ctx.skip(h.reason);
  expect(h.status, h.reason).toBe('ok');
  const r = replay(h.scenario);
  for (const name of h.scenario.capture) {
    if (name.startsWith('%')) continue; // front-end texts: compared by the manual checks
    const rec = captureOf(h.record, name);
    const actual = PORT_VALUE[name] ? PORT_VALUE[name](r) : r.state[name];
    // an unassigned Body local is recorded as null (HW-45); the port leaves the view field undefined
    if (isUnassignedLocal(h.record, name)) { expect(actual, `${id} ${name}: unassigned in Mathematica`).toBeUndefined(); continue; }
    if (isNotEvaluated(rec)) { expect(actual, `${id} ${name}: not evaluated in Mathematica`).toBeUndefined(); continue; }
    expect(same(toJS(rec), actual), `${id} ${name}`).toBe(true);
  }
}

describe('robot-motion harness (Mathematica 15.0.1 records)', () => {
  it('harness "H-RM-01"', (ctx) => check(ctx, 'H-RM-01'));
  it('harness "H-RM-02"', (ctx) => check(ctx, 'H-RM-02'));
  it('harness "H-RM-03"', (ctx) => check(ctx, 'H-RM-03'));
  it('harness "H-RM-04"', (ctx) => check(ctx, 'H-RM-04'));
  it('harness "H-RM-05"', (ctx) => check(ctx, 'H-RM-05'));
  it('harness "H-RM-06"', (ctx) => check(ctx, 'H-RM-06'));
  it('harness "H-RM-07"', (ctx) => check(ctx, 'H-RM-07'));
  it('harness "H-RM-08"', (ctx) => check(ctx, 'H-RM-08'));
  it('harness "H-RM-09"', (ctx) => check(ctx, 'H-RM-09'));
  it('harness "H-RM-10"', (ctx) => check(ctx, 'H-RM-10'));
  it('harness "H-RM-11"', (ctx) => check(ctx, 'H-RM-11'));
  it('harness "H-RM-12"', (ctx) => check(ctx, 'H-RM-12'));
  it('harness "H-RM-13"', (ctx) => check(ctx, 'H-RM-13'));
  it('harness "H-RM-14"', (ctx) => check(ctx, 'H-RM-14'));
  it('harness "H-RM-15"', (ctx) => check(ctx, 'H-RM-15'));
  it('harness "H-RM-16"', (ctx) => check(ctx, 'H-RM-16'));
  it('harness "H-RM-17"', (ctx) => check(ctx, 'H-RM-17'));
  it('harness "H-RM-18"', (ctx) => check(ctx, 'H-RM-18'));
  it('harness "H-RM-19"', (ctx) => check(ctx, 'H-RM-19'));
  it('harness "H-RM-20"', (ctx) => check(ctx, 'H-RM-20'));
  it('every scenario of the scenario file has a test above; the replay runs without Mathematica data', () => {
    expect(scenarios.map((s) => s.id)).toEqual(Array.from({ length: 20 }, (_, i) => `H-RM-${String(i + 1).padStart(2, '0')}`));
    // the replay itself works now (its results are compared once the owner's harness run is accepted)
    const r01 = replay(scenarios[0]);
    expect(r01.state.freeConfigSpace).toEqual(plain(fx.live).freeConfigSpace);
    expect(replay(scenarios.find((s) => s.id === 'H-RM-20')).view.resolution).toBeUndefined();
    expect(replay(scenarios.find((s) => s.id === 'H-RM-13')).state.freeConfigSpace).toBe(7);
    expect(NO_DATA).toBe('no harness data (owner run pending)');
  });
});
