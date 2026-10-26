// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/ensemble-control.test.js — the model of "Ensemble Control of Robots with Unicycle Kinematics": the
// opening state from the notebook, the error and the best command on hand-made robots, the re-randomization when n
// changes, the button, the picture, and the notebook's four snapshot settings. Expected values derived by hand.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialState, evaluate, meanSquaredError, bestCommand, goalsOf, turnCounterClockwise, DrawRobot, SAVED, r } from '../../demos/ensemble-control/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

const saved = JSON.parse(readFileSync(new URL('../golden/ensemble-control.original-states.json', import.meta.url), 'utf8'));
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, num(v)]));
// two robots: one at the origin heading +x with its goal at (3, 0); one at (0, 1) heading +y with its goal at (0, 0)
const toy = { n: 2, nold: 2, vin: 0, θinit: [0, Math.PI / 2], xinit: [0, 0], yinit: [0, 1], xGoal: [3, 0], yGoal: [0, 0], xpath: [[0, 0]], ypath: [[0, 1]] };

describe('ensemble-control model', () => {
  it('the opening state: n = 2 and the robots saved in the notebook (its initial settings)', () => {
    expect(initialState()).toEqual(SAVED);
    expect(initialState()).toEqual(saved.specs);
    expect(initialState()).toEqual(saved.states[0]);
    const s = initialState(); s.xinit[0] = 99;
    expect(SAVED.xinit[0]).not.toBe(99); // a copy each time
  });
  it('the mean squared error: (1/n) Σ (x + v cos θ − x_Goal)² + (y + v sin θ − y_Goal)²', () => {
    // v = 0: (9 + 1)/2 = 5; v = 1: ((1 − 3)² + (0)² + (0)² + (2 − 0)²)/2 = (4 + 4)/2 = 4
    expect(meanSquaredError(toy, 0)).toBeCloseTo(5, 14);
    expect(meanSquaredError(toy, 1)).toBeCloseTo(4, 14);
    // v = −1: ((−4)² + 0² + 0² + 0²)/2 = 8
    expect(meanSquaredError(toy, -1)).toBeCloseTo(8, 14);
  });
  it('the best command: distBest = (1/n) Σ (x_Goal − x) cos θ + (y_Goal − y) sin θ minimizes the error', () => {
    // (3·1 + 0)/2 + (0 + (0 − 1)·1)/2 = (3 − 1)/2 = 1
    expect(bestCommand(toy)).toBeCloseTo(1, 14);
    const { view } = evaluate(toy);
    expect(view.distBest).toBeCloseTo(1, 14);
    expect(view.errBest).toBeCloseTo(4, 14);
    for (const dv of [-0.1, 0.1]) expect(meanSquaredError(toy, 1 + dv)).toBeGreaterThan(view.errBest);
  });
  it('the goals: n points on the circle of radius r, the first at (r, 0)', () => {
    const g = goalsOf(4);
    expect(g.xGoal.map((x) => Math.round(x * 1e12) / 1e12)).toEqual([10, 0, -10, -0]);
    expect(g.yGoal.map((y) => Math.round(y * 1e12) / 1e12)).toEqual([0, 10, 0, -10]);
    expect(goalsOf(2)).toEqual({ xGoal: [10, -10], yGoal: [0, 1.2246467991473533e-15] });
  });
  it('a new n (nold ≠ n) draws new robots in [−r, r]² with headings in [−π, π], resets the paths, sets nold', () => {
    const { state } = evaluate({ ...initialState(), n: 5 }, { rng: createRng({ seed: 1 }) });
    expect(state.nold).toBe(5);
    expect(state.xinit.length).toBe(5);
    expect([...state.xinit, ...state.yinit].every((x) => x >= -r && x <= r)).toBe(true);
    expect(state.θinit.every((t) => t >= -Math.PI && t <= Math.PI)).toBe(true);
    expect(state.xpath).toEqual([state.xinit]);
    expect(state.ypath).toEqual([state.yinit]);
    expect(state.xGoal).toEqual(goalsOf(5).xGoal);
    // the same seed gives the same robots; n unchanged keeps them
    expect(evaluate({ ...initialState(), n: 5 }, { rng: createRng({ seed: 1 }) }).state.xinit).toEqual(state.xinit);
    expect(evaluate(state).state).toBe(state);
  });
  it('the button: move by vin, append to the paths, vin = 0, turn by π/3 + RandomReal[{0, π/3}]', () => {
    const s = turnCounterClockwise(structuredClone({ ...toy, vin: 1 }), createRng({ seed: 2 }));
    expect(s.xinit[0]).toBeCloseTo(1, 14);
    expect(s.yinit[1]).toBeCloseTo(2, 14);
    expect(s.xpath).toEqual([[0, 0], s.xinit]);
    expect(s.ypath).toEqual([[0, 1], s.yinit]);
    expect(s.vin).toBe(0);
    s.θinit.forEach((t, i) => {
      expect(t - toy.θinit[i]).toBeGreaterThanOrEqual(Math.PI / 3);
      expect(t - toy.θinit[i]).toBeLessThanOrEqual((2 * Math.PI) / 3);
    });
  });
  it('DrawRobot: white disk r/25, thick circle r/20, heading line r/15', () => {
    const g = DrawRobot(1, 2, Math.PI / 2);
    expect(g[0][1].r).toBe(0.4);
    expect(g[2].r).toBe(0.5);
    expect(g[3].pts[1][0]).toBeCloseTo(1, 14);
    expect(g[3].pts[1][1]).toBeCloseTo(2 + 10 / 15, 14);
  });
  it('the picture: per robot Hue[k/n], translucent path and robot, goal disk, dashed heading line ±1.1 r, moved robot', () => {
    const { graphics, view } = evaluate({ ...toy, vin: 2 });
    const [field, plot] = graphics;
    expect(field.options.PlotRange).toEqual([[-13, 13], [-13, 13]]);
    expect(field.options.ImageSize).toBe(360);
    const colours = [];
    Cases(annotation(field, 'robot-1').g, (q, st) => { if (q.head === 'Disk') colours.push([...st.color]); return false; });
    expect(colours[0]).toEqual([0, 1, 1]); // Hue[1/2], the goal disk
    expect(annotation(field, 'robot-2').g[0].rgb).toEqual([1, 0, 0]); // Hue[1] = red
    const lines = Cases(annotation(field, 'robot-1').g, 'Line');
    expect(lines[1].pts).toEqual([[-11, 0], [11, 0]]); // the heading line
    expect(view.moved[0]).toEqual([2, 0]);
    expect(view.moved[1][1]).toBeCloseTo(3, 14);
    // the plot: frame on the bottom and left, labels, aspect ratio 2, the points at distBest and vin
    expect(plot.options.Frame).toEqual([true, true, false, false]);
    expect(plot.options.FrameLabel).toEqual(['forward command', 'sum squared error']);
    expect(plot.options.AspectRatio).toBe(2);
    expect(plot.options.PlotRange[0]).toEqual([-10, 10]);
    expect(annotation(plot, 'best-point').g.pts[0]).toEqual([view.distBest, view.errBest]);
    expect(annotation(plot, 'command-point').g.pts[0][0]).toBe(2);
    expect(annotation(plot, 'command-point').style.color).toEqual([0, 0, 1]);
    expect(annotation(plot, 'best-line').style.color).toEqual([1, 0, 0]);
  });
  it('the error plot range is automatic: it follows the curve from v = −r to r', () => {
    const { view } = evaluate(initialState());
    // the curve's minimum (distBest is inside [−10, 10]) and its larger end value
    expect(view.plotRange[1][0]).toBeCloseTo(view.errBest, 6);
    expect(view.plotRange[1][1]).toBeCloseTo(Math.max(meanSquaredError(initialState(), -10), meanSquaredError(initialState(), 10)), 9);
  });
  for (const [id, s0] of Object.entries(saved.snapshots)) {
    it(`snapshot ${id} (n = ${s0.n}, vin = ${s0.vin}): the saved robots are kept and the values are consistent`, () => {
      const s = settings(s0);
      const { state, view, graphics } = evaluate(s);
      expect(state).toBe(s); // nold = n: no new robots
      expect(view.n).toBe(s.n);
      expect(state.xGoal).toEqual(goalsOf(s.n).xGoal.map((x, i) => (Math.abs(x - s.xGoal[i]) < 1e-12 ? s.xGoal[i] : x)));
      expect(state.xpath.at(-1)).toEqual(s.xinit); // the last path point is the current position
      expect(Cases(graphics[0], 'Annotation').length).toBeGreaterThan(0);
      expect(view.errBest).toBeLessThanOrEqual(view.errIn + 1e-9);
      expect(Number.isFinite(view.distBest)).toBe(true);
    });
  }
  it('snapshot values read off the pictures: distBest ≈ −1, 1.8, 3.4, −7.7; error at vin ≈ 46, 188, 30, 170', () => {
    const v = Object.values(saved.snapshots).map((s) => evaluate(settings(s)).view);
    [[-1, 46], [1.8, 188], [3.4, 30], [-7.7, 170]].forEach(([d, e], i) => {
      expect(Math.abs(v[i].distBest - d)).toBeLessThan(0.5);
      expect(Math.abs(v[i].errIn - e) / e).toBeLessThan(0.05);
    });
  });
});
