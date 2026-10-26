// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/steering-rc-cars.test.js — the model of "Steering Multiple Radio Control (RC) Cars with One Joystick": the
// opening state and the initial settings from the notebook, the meeting points and collision radii (checked against
// the motion they describe), the setup locators, the mode switches, the running clock, the three robot pictures and the
// notebook's five snapshot settings. Expected values derived by hand or from the robots' motion.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, initialSettings, evaluate, settles, collisionRadius, collisionDelta, collisionDeltaRef, distPt2Pt,
  drawRC, drawCell, drawParticle, drawRobot, SAVED, SPECS,
} from '../../demos/steering-rc-cars/model.js';
import { annotation, bounds, Cases } from '../../shared/graphics.js';
import { ColorData } from '../../shared/plot.js';
import { createRng } from '../../shared/random.js';

const saved = JSON.parse(readFileSync(new URL('../golden/steering-rc-cars.original-states.json', import.meta.url), 'utf8'));
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
// the snapshots of the first three store robot as the setter's value list (the variable not yet set): its first value
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'robot' && Array.isArray(v) ? v[0] : num(v)]));
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const rot = (t, [x, y]) => [Math.cos(t) * x - Math.sin(t) * y, Math.sin(t) * x + Math.cos(t) * y];
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1]];
// robot k after a common command v (running mode): p_k + R(θk − θ1) v — how the original places the cars (cent)
const after = (s, k, v) => plus(s.ps[k], rot(s.θs[k] - s.θs[0], v));

describe('steering-rc-cars model', () => {
  it("the opening state is the notebook's saved state; Initial settings are the Manipulate's own initial values", () => {
    expect(initialState()).toEqual(settings(saved.states[0]));
    expect(initialSettings()).toEqual(settings(saved.specs));
    const s = initialState(); s.ps[0][0] = 99;
    expect(SAVED.ps[0][0]).not.toBe(99); // a copy each time
  });
  it('evaluating the saved state reproduces it exactly (handles at 0.5·10^(range/2)·rad in the headings)', () => {
    const { state } = evaluate(initialState());
    expect(state).toEqual(initialState());
    expect(distPt2Pt(state.ps[0], state.loc[4])).toBeCloseTo(0.5 * Math.sqrt(10) * 0.143, 14);
  });
  it('collisionRadius = 2r/√(2 − 2 cos(θ1 − θ2)): 2r/√2 for perpendicular, r for opposite headings', () => {
    expect(collisionRadius(0, Math.PI / 2, 1)).toBeCloseTo(Math.SQRT2, 14);
    expect(collisionRadius(0, Math.PI, 0.5)).toBeCloseTo(0.5, 14);
    expect(collisionRadius(1, 1, 1)).toBe(Infinity); // equal headings: no meeting point (D-SR-02)
  });
  it("collisionDelta: the one place p_ij where robots i and j meet (setup), as the Details' formula", () => {
    const pi = [0.3, -0.2], pj = [-0.5, 0.4], ti = 0.7, tj = -1.9;
    const p = collisionDelta(ti, tj, pi, pj);
    // the Details: p_ij = p_j + ½ {{1, cot((θj − θi)/2)}, {−cot((θj − θi)/2), 1}}.(p_i − p_j)
    const c = 1 / Math.tan((tj - ti) / 2), d = minus(pi, pj);
    close(p, [pj[0] + 0.5 * (d[0] + c * d[1]), pj[1] + 0.5 * (-c * d[0] + d[1])], 14);
    // both robots reach p with the same command w in their own frames: p = p_i + R(θi) w = p_j + R(θj) w
    const w = rot(-ti, minus(p, pi));
    close(plus(pj, rot(tj, w)), p, 12);
  });
  it('collisionDeltaRef: with the runner there (running), robots i and j are at the same place; on the circle 2r apart', () => {
    const s = initialState();
    for (const [i, j] of [[1, 2], [2, 4], [3, 4]]) {
      const c = collisionDeltaRef(s.θs[0], s.θs[i - 1], s.θs[j - 1], s.ps[0], s.ps[i - 1], s.ps[j - 1]);
      const v = minus(c, s.ps[0]);
      close(after(s, i - 1, v), after(s, j - 1, v), 12);
      const r = collisionRadius(s.θs[i - 1], s.θs[j - 1], s.rad);
      for (const a of [0, 1, 2.5]) {
        const vb = plus(v, [r * Math.cos(a), r * Math.sin(a)]);
        expect(distPt2Pt(after(s, i - 1, vb), after(s, j - 1, vb))).toBeCloseTo(2 * s.rad, 12);
      }
    }
  });
  it('the picture of the opening state: six gray collision disks with their pair labels, four robots, no paths', () => {
    const { view, graphics } = evaluate(initialState());
    expect(view.perms).toEqual([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]);
    // snapshot 1: "1,3" at the right, "2,4" at the left edge, "1,2" outside on the left
    const d = Object.fromEntries(view.disks.map((x) => [x.pair.join(), x]));
    expect(d['1,3'].center[0]).toBeCloseTo(0.760, 3);
    expect(d['2,4'].center[0]).toBeCloseTo(-1.182, 3);
    expect(d['1,2'].center[0]).toBeLessThan(-1.2);
    const g13 = annotation(graphics.list, 'collision-1-3').g;
    expect(g13[1].r).toBeCloseTo(d['1,3'].radius, 14);
    const label = Cases(g13, (p) => p.head === 'Text')[0];
    expect(label.expr.expr).toBe('1,3');
    close(label.pos, [d['1,3'].center[0] + 0.0715, d['1,3'].center[1] + 0.0715], 14);
    for (let i = 1; i <= 4; i++) expect(annotation(graphics.list, `robot-${i}`)).toBeTruthy();
    expect(annotation(graphics.list, 'path-1').g.at(-1).pts).toEqual([]);
    expect(graphics.options.PlotRange).toEqual([[-1.2, 1.2], [-1.2, 1.2]]);
  });
  it('a new n (n ≠ nold, setup): n new robots in [−0.9, 0.9]², path cleared (Initial settings); headings read back from the handles', () => {
    const { state } = evaluate(initialSettings(), { rng: createRng({ seed: 1 }) });
    expect(state.nold).toBe(4);
    expect(state.ps.length).toBe(4);
    expect(state.ps.flat().every((x) => x >= -0.9 && x <= 0.9)).toBe(true);
    expect(state.θs.length).toBe(4);
    // RandomReal[2π, n], then (same evaluation) θs = ArcTan of the new handles: the same directions in (−π, π]
    expect(state.θs.every((t) => t > -Math.PI && t <= Math.PI)).toBe(true);
    state.θs.forEach((t, i) => expect(Math.atan2(state.loc[4 + i][1] - state.ps[i][1], state.loc[4 + i][0] - state.ps[i][0])).toBeCloseTo(t, 12));
    expect(state.loc.length).toBe(8);
    expect(state.runPath).toEqual([]);
    expect(state.modeP).toBe('setup');
    expect(evaluate(initialSettings(), { rng: createRng({ seed: 1 }) }).state).toEqual(state); // same seed, same robots
    const five = evaluate({ ...state, n: 5 }, { rng: createRng({ seed: 2 }) }).state;
    expect(five.ps.length).toBe(5);
    expect(five.loc.length).toBe(10);
  });
  it('setup: a position locator moves its robot and its handle; moving robot 1 also moves the path', () => {
    const s0 = { ...initialState(), runPath: [[0, 0], [0.1, 0]] };
    const loc = structuredClone(s0.loc);
    loc[0] = [-0.5, -0.5]; // robot 1 by (0.0884…, 0.0744…)
    const { state } = evaluate({ ...s0, loc });
    expect(state.ps[0]).toEqual([-0.5, -0.5]);
    expect(state.θs).toEqual(s0.θs);
    close(state.loc[4], plus([-0.5, -0.5], [0.5 * Math.sqrt(10) * 0.143 * Math.cos(s0.θs[0]), 0.5 * Math.sqrt(10) * 0.143 * Math.sin(s0.θs[0])]), 14);
    const v = minus([-0.5, -0.5], s0.ps[0]);
    close(state.runPath, s0.runPath.map((x) => plus(x, v)), 14);
    // another robot: the path stays
    const loc2 = structuredClone(s0.loc); loc2[2] = [0.5, 0.5];
    expect(evaluate({ ...s0, loc: loc2 }).state.runPath).toEqual(s0.runPath);
  });
  it('setup: a handle turns its robot to ArcTan of the handle; the handle snaps back; turning robot 1 turns the path', () => {
    const s0 = { ...initialState(), runPath: [[0, 0]] };
    const loc = structuredClone(s0.loc);
    loc[4] = plus(s0.ps[0], [0, 1]); // robot 1 heading +y, handle dragged far away
    const { state } = evaluate({ ...s0, loc });
    expect(state.θs[0]).toBeCloseTo(Math.PI / 2, 14);
    close(state.loc[4], plus(s0.ps[0], [0, 0.5 * Math.sqrt(10) * 0.143]), 14);
    close(state.θs.slice(1), s0.θs.slice(1), 14); // the others keep theirs
    close(state.runPath[0], plus(s0.ps[0], rot(Math.PI / 2 - s0.θs[0], minus([0, 0], s0.ps[0]))), 14);
  });
  it("switch to running: loc becomes robot 1's position (one locator), runner there, runnerθ = θ1; robots unmoved", () => {
    const { state, view } = evaluate({ ...initialState(), mode: 'running' });
    expect(state.loc).toEqual(SAVED.ps[0]);
    expect(state.runner).toEqual(SAVED.ps[0]);
    expect(state.runnerθ).toBe(SAVED.θs[0]);
    expect(state.modeP).toBe('running');
    expect(view.dt).toBeNull();
    close(view.centres, SAVED.ps, 14);
    close(view.headings, SAVED.θs, 14);
    expect(settles(state)).toBe(false);
  });
  it('running: the runner moves min(distance, dt) toward the locator, dt = clock difference clamped to [0.01, 0.1]', () => {
    let s = evaluate({ ...initialState(), mode: 'running' }).state;
    s = { ...s, loc: plus(s.runner, [0, 1]), lastTime: 100 };
    expect(settles(s)).toBe(true);
    let r = evaluate(s, { time: 100.05 });
    expect(r.view.dt).toBeCloseTo(0.05, 12);
    close(r.state.runner, plus(s.runner, [0, 0.05]), 12);
    expect(r.state.runnerθ).toBeCloseTo(Math.PI / 2, 14);
    expect(r.state.lastTime).toBe(100.05);
    expect(r.state.runPath).toEqual([r.state.runner]);
    expect(evaluate(s, { time: 105 }).view.dt).toBe(0.1);
    expect(evaluate(s, { time: 100.001 }).view.dt).toBe(0.01);
    expect(evaluate(s).view.dt).toBe(0.01); // no clock given: the minimum step
    // until it arrives (then the body no longer changes anything)
    let t = 100;
    for (let k = 0; k < 200 && settles(s); k++) { t += 0.1; s = evaluate(s, { time: t }).state; }
    expect(settles(s)).toBe(false);
    close(s.runner, s.loc, 14);
    expect(s.runPath.length).toBeGreaterThanOrEqual(10); // ten steps of 0.1 (and one of the rounding left over, if any)
    expect(s.runPath.length).toBeLessThanOrEqual(11);
  });
  it('running: every robot follows the same command turned by θi − θ1, heading θi + runnerθ − θ1; paths drawn the same way', () => {
    let s = evaluate({ ...initialState(), mode: 'running' }).state;
    s = { ...s, loc: plus(s.runner, [0.3, 0.4]), lastTime: 0 };
    let t = 0;
    for (let k = 0; k < 20 && settles(s); k++) { t += 0.1; s = evaluate(s, { time: t }).state; }
    const { view, graphics } = evaluate(s, { time: t });
    const v = minus(s.runner, s.ps[0]);
    for (let k = 0; k < 4; k++) {
      close(view.centres[k], after(s, k, v), 12);
      expect(view.headings[k]).toBeCloseTo(s.θs[k] + Math.atan2(0.4, 0.3) - s.θs[0], 12);
      const path = annotation(graphics.list, `path-${k + 1}`).g.at(-1).pts;
      close(path.at(-1), view.centres[k], 12); // each path ends at its robot
    }
  });
  it('switch back to setup: the robots start where they stopped, turned by runnerθ − θ1; handles 1.5·10^(range−1)·rad, then snapped', () => {
    let s = evaluate({ ...initialState(), mode: 'running' }).state;
    s = { ...s, loc: plus(s.runner, [0, 0.3]), lastTime: 0 };
    let t = 0;
    for (let k = 0; k < 10 && settles(s); k++) { t += 0.1; s = evaluate(s, { time: t }).state; }
    const moved = evaluate(s, { time: t }).view;
    const { state } = evaluate({ ...s, mode: 'setup' });
    close(state.ps, moved.centres, 12);
    state.θs.forEach((t, i) => expect(Math.cos(t - moved.headings[i])).toBeCloseTo(1, 12)); // the same directions (ArcTan: mod 2π)
    expect(distPt2Pt(state.ps[2], state.loc[6])).toBeCloseTo(0.5 * Math.sqrt(10) * 0.143, 12);
    expect(state.loc.length).toBe(8);
    expect(state.runPath.length).toBe(s.runPath.length); // the path is kept
  });
  it('range and offset set the PlotRange 1.2·10^(range−1)·({−1, 1} + offset); handles and arrows scale with 10^(range/2)', () => {
    const { graphics, state } = evaluate({ ...initialState(), range: 2, offset: [0.5, -1] });
    close(graphics.options.PlotRange, [[-6, 18], [-24, 0]], 12);
    expect(distPt2Pt(state.ps[0], state.loc[4])).toBeCloseTo(0.5 * 10 * 0.143, 12);
    const arrow = Cases(annotation(graphics.list, 'robot-1').g, (p) => p.head === 'Arrow')[0];
    expect(distPt2Pt(...arrow.pts)).toBeCloseTo(0.85 * 10 * 0.143, 12);
  });
  it('drawRC: axles, wheels, body and cockpit, turned about its bounding box centre (0.025 r, 0), then moved to ps', () => {
    const car = drawRC([1, 2], 0.2, 0.5, ColorData(97, 1));
    expect(car.head).toBe('Translate');
    expect(car.v).toEqual([1, 2]);
    expect(car.g.head).toBe('Rotate');
    expect(car.g.angle).toBe(0.5);
    close(car.g.about, [0.025 * 0.2, 0], 15);
    close(bounds(car.g.g), [[-0.19, -0.12], [0.2, 0.12]], 15);
    expect(Cases(car.g.g, (p) => p.head === 'Rectangle').length).toBe(13); // 2 axles, 4 wheels, 2 wings, body, 2 side plates, cockpit, stripe
    expect(Cases(car.g.g, (p) => p.head === 'Polygon').length).toBe(1);
  });
  it('drawCell: body turned to orient, red/white marker turned to θ; drawParticle: red disk, green half on θ ± π/2', () => {
    const cell = drawCell([0, 1], 0.1, 0.3, 1.2);
    expect(cell.v).toEqual([0, 1]);
    const [, body, marker] = cell.g;
    expect(body.angle).toBe(1.2);
    expect(marker.angle).toBe(0.3);
    expect(body.g[2].r).toBe(0.1); // RoundingRadius r: a stadium
    const p = drawParticle([1, 1], 0.2, 0.4);
    expect(p[2].r).toBe(0.2);
    close(p[4].angles, [0.4 - Math.PI / 2, 0.4 + Math.PI / 2], 15);
    expect(drawRobot('particle', [1, 1], 0.2, 0.4, 9, null)).toEqual(p);
    expect(drawRobot('RC car', [1, 1], 0.2, 0.4, 0.7, ColorData(97, 2)).g.angle).toBe(0.7);
    expect(drawRobot('cell', [1, 1], 0.2, 0.4, 0.7).g[2].angle).toBe(0.4);
  });
  it("the notebook's five snapshot settings evaluate to themselves (setup; running at the start; particle; cell)", () => {
    for (const k of Object.keys(saved.snapshots)) {
      const s = settings(saved.snapshots[k]);
      const { state, view, graphics } = evaluate(s);
      expect(state.mode).toBe(s.mode);
      close(state.ps, s.ps, 14);
      close(state.θs, s.θs, 12);
      if (s.mode === 'setup') close(state.loc, s.loc, 12);
      else { expect(state.loc).toEqual(s.loc); expect(settles(state)).toBe(false); close(view.headings, s.θs, 12); }
      expect(view.disks.length).toBe(6);
      const robot1 = annotation(graphics.list, 'robot-1').g[0];
      expect(Array.isArray(robot1) ? 'particle' : robot1.g.head === 'Rotate' ? 'RC car' : 'cell').toBe(s.robot);
    }
  });
  it("the specs' leftovers (five old positions, three locators) only matter until the first evaluation", () => {
    expect(SPECS.ps.length).toBe(5);
    expect(SPECS.loc.length).toBe(3);
    const { state } = evaluate(initialSettings(), { rng: createRng({ seed: 4 }) });
    expect(state.loc.slice(0, 4)).toEqual(state.ps);
  });
  it("running: a joystick at the origin is reached too (no underflow of the distance; the body stops evaluating)", () => {
    let s = evaluate({ ...initialState(), mode: 'running' }).state;
    s = { ...s, loc: [0, 0], lastTime: 0 };
    let t = 0, k = 0;
    for (; k < 400 && settles(s); k++) { t += 0.1; s = evaluate(s, { time: t }).state; }
    expect(settles(s)).toBe(false);
    expect(s.runner).toEqual([0, 0]);
    expect(k).toBeLessThan(400);
    expect(distPt2Pt([0, 0], [0, 3e-163])).toBe(3e-163);
  });
});
