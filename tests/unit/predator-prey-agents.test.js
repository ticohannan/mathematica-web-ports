// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hiroki Sayama
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/predator-prey-agents.test.js — the model of "Predator-Prey Ecosystem: A Real-Time Agent-Based
// Simulation": the rules of updateAgents with a scripted random source, the opening agents and the saved snapshots.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRng } from '../../shared/random.js';
import {
  initialState, evaluate, updateAgents, initialAgents, visualize, Fox, Rabbit, SAVED_AGENTS,
} from '../../demos/predator-prey-agents/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/predator-prey-agents.original-states.json', import.meta.url), 'utf8'));
/** a random source that returns the given uniforms in order (RandomReal[{a, b}] = a + (b − a) u) */
const scripted = (us) => { let i = 0; return createRng({ uniform: () => us[i++ % us.length] }); };

describe('predator-prey-agents model', () => {
  it('the opening state is the notebook live state, with its saved agents', () => {
    const { ag, ...rest } = initialState();
    const { ag: savedAg, ...savedRest } = golden.states[0];
    expect(rest).toEqual(savedRest);
    expect(ag).toEqual(savedAg);
    expect(SAVED_AGENTS.filter((a) => a[3] === Fox)).toHaveLength(7);
  });

  it('a rabbit steps, survives without a fox within 0.02 and copies itself with probability g (1 - rabbits/500)', () => {
    const ag = [[0.5, 0.5, 0, Rabbit]];
    // steps: u = 0.75, 0.25 → +0.01, −0.01 with mobility 0.02; reproduction u = 0.4 < 0.5 (1 − 1/500)
    const out = updateAgents(ag, 0.5, 0.02, 0.5, 0.05, 10, scripted([0.75, 0.25, 0.4]));
    expect(out).toHaveLength(2);
    expect(out[0][0]).toBeCloseTo(0.51, 12);
    expect(out[0][1]).toBeCloseTo(0.49, 12);
    expect(out[1]).toEqual(out[0]);
    expect(updateAgents(ag, 0.5, 0.02, 0.5, 0.05, 10, scripted([0.5, 0.5, 0.6]))).toHaveLength(1); // 0.6 > 0.499
  });

  it('a rabbit is eaten when a fox (at its old place) is within 0.02 of its new place; the fox then feeds', () => {
    const ag = [[0.5, 0.5, 0, Rabbit], [0.51, 0.5, 4, Fox]];
    const out = updateAgents(ag, 0.5, 0.02, 0.5, 0.02, 10, scripted([0.5, 0.5, 0.5, 0.5, 0.99]));
    // the rabbit stays at 0.5 (u = 0.5 → step 0), 0.01 from the fox: eaten; the fox finds the rabbit's old place: fed, hunger 0
    expect(out).toEqual([[0.51, 0.5, 0, Fox]]);
  });

  it('a hungry fox gets one step hungrier and dies after foxEndurance steps without food', () => {
    const far = [[0.1, 0.1, 3, Fox], [0.9, 0.9, 0, Rabbit]];
    const out = updateAgents(far, 0, 0, 0.5, 0, 10, scripted([0.5]));
    expect(out[0]).toEqual([0.1, 0.1, 4, Fox]);
    expect(updateAgents([[0.1, 0.1, 10, Fox], [0.9, 0.9, 0, Rabbit]], 0, 0, 0.5, 0, 10, scripted([0.5]))).toEqual([[0.9, 0.9, 0, Rabbit]]);
  });

  it('steps stay inside the square (Clip)', () => {
    const out = updateAgents([[0.001, 0.999, 0, Rabbit]], 0, 0.05, 0, 0, 10, scripted([0, 1, 0.9]));
    expect(out[0].slice(0, 2)).toEqual([0, 1]);
  });

  it('initialAgents: 100 agents in the square, about 10 % foxes', () => {
    const ag = initialAgents(createRng({ seed: 3 }));
    expect(ag).toHaveLength(100);
    for (const a of ag) { expect(a[0]).toBeGreaterThanOrEqual(0); expect(a[1]).toBeLessThanOrEqual(1); expect(a[2]).toBe(0); }
    const foxes = ag.filter((a) => a[3] === Fox).length;
    expect(foxes).toBeGreaterThan(2);
    expect(foxes).toBeLessThan(25);
  });

  it('the snapshots: their saved agents are drawn as they are, foxes first and rabbits over them', () => {
    for (const k of ['1', '2', '3', '4']) {
      const s = golden.snapshots[k];
      const { view, graphics } = evaluate(s);
      expect(view.agents).toBe(s.ag.length);
      expect(view.foxes).toBe(s.ag.filter((a) => a[3] === 1).length);
      expect(graphics).toEqual(visualize(s.ag));
    }
    expect(evaluate(golden.snapshots[2]).view).toEqual({ foxes: 70, rabbits: 494, agents: 564 });
  });

  it('while running, each evaluation moves the agents one step and returns them in the state', () => {
    const s = { ...initialState(), moving: true };
    const r = evaluate(s, { rng: createRng({ seed: 5 }) });
    expect(r.state.ag).not.toEqual(s.ag);
    expect(evaluate(initialState()).state.ag).toEqual(initialState().ag);
  });
});
