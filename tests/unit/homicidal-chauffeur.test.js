// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Javier Garcia
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/homicidal-chauffeur.test.js — the model of "The Homicidal Chauffeur Problem": the opening state and the
// initial settings from the notebook, the Initialization definitions (distances, angles, the car's rectangle, the
// pictures of the car and the pedestrian), the setup locators, the mode switches, the running clock (explicit times),
// the chauffeur's controller, collisions, the running-time text and the notebook's five snapshot settings. Expected
// values derived by hand.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, settles, SAVED, PLOT_RANGE, IMAGE_SIZE, LOCATOR_LOOK, Clock, drawRunner, drawCar, ptInCar,
  distPt2Pt, angPt2Pt, mod2pi, mod0to2pi, NumberForm, StringForm,
} from '../../demos/homicidal-chauffeur/model.js';
import { annotation, Cases } from '../../shared/graphics.js';

const saved = JSON.parse(readFileSync(new URL('../golden/homicidal-chauffeur.original-states.json', import.meta.url), 'utf8'));
const num = (x) => (Array.isArray(x) ? x.map(num) : x && typeof x === 'object' && 'n' in x ? x.n : x);
const settings = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, num(v)]));
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const plus = (a, b) => [a[0] + b[0], a[1] + b[1]];
const dir = (t) => [Math.cos(t), Math.sin(t)];
const nf = (x) => NumberForm(x, [3, 1], { NumberPadding: [' ', '0'] });
// a running state with the clock at 0 and the head start over (timer −10): the pedestrian stands at its locator
const chase = (over) => ({ ...SAVED, state: 'running', stateP: 'running', runPath: [], carPath: [], timer: -10, lastTime: 0, ...over, loc: [over.runner] });

describe('homicidal-chauffeur model', () => {
  it("the opening state is the notebook's saved state; Initial settings (the stored specs) are the same state", () => {
    expect(initialState()).toEqual(settings(saved.states[0]));
    expect(initialState()).toEqual(settings(saved.specs));
    const s = initialState(); s.loc[0][0] = 99;
    expect(SAVED.loc[0][0]).toBe(-2); // a copy each time
  });
  it("the code's own initial values (loc {{-4, 2}, {2, 2}, {4, 0}}, stateP \"\") evaluate to the stored specs", () => {
    const { state } = evaluate({ ...initialState(), loc: [[-4, 2], [2, 2], [4, 0]], stateP: '' });
    expect(state.stateP).toBe('setup');
    close(state.loc, settings(saved.specs).loc, 14); // {runner, carXYold, carXYold + 2 {Cos[.6], Sin[.6]}}
  });
  it('evaluating the saved state reproduces it: pedestrian at loc 1, car at loc 2, heading 0.6 from the handle 2 units ahead', () => {
    const { state, view, graphics } = evaluate(initialState());
    expect({ ...state, carθ: 0.6 }).toEqual(initialState());
    expect(state.carθ).toBeCloseTo(0.6, 15);
    expect(settles(state)).toBe(false);
    // the turning circles: r_min = 3 to the left and the right of the rear axle
    close(view.ceL, [2 - 3 * Math.sin(0.6), 2 + 3 * Math.cos(0.6)], 14);
    close(view.ceR, [2 + 3 * Math.sin(0.6), 2 - 3 * Math.cos(0.6)], 14);
    expect(view.sText).toBe('pedestrian missed.');
    expect(view.runningTime).toBe('running time   0.0 s'); // Round[lastTime − timer = 0.0019, 0.01] = 0.
    expect(view.countdown).toBeNull();
    const circles = annotation(graphics.list, 'turn-circles').g.filter((p) => p.head === 'Circle');
    expect(circles.map((c) => c.r)).toEqual([3, 3]);
    expect(annotation(graphics.list, 'status').g[1].expr.expr).toBe('pedestrian missed.');
    for (const id of ['run-path', 'runner', 'car-path', 'car', 'running-time']) expect(annotation(graphics.list, id), id).toBeTruthy();
    expect(annotation(graphics.list, 'countdown')).toBeNull();
    expect(graphics.options).toEqual({ PlotRange: [[-15, 15], [-9, 12]], ImageSize: [600, 400], PlotRangePadding: 0 });
    expect(IMAGE_SIZE * (PLOT_RANGE[1][1] - PLOT_RANGE[1][0]) / (PLOT_RANGE[0][1] - PLOT_RANGE[0][0])).toBeCloseTo(400, 12); // 571.4 × 400
  });
  it('distPt2Pt, angPt2Pt (Chop to 0 below 1e-10), mod2pi in (−π, π] and mod0to2pi in [0, 2π)', () => {
    expect(distPt2Pt([1, 1], [4, 5])).toBe(5);
    expect(angPt2Pt([1, 1], [1, 3])).toBeCloseTo(Math.PI / 2, 15);
    expect(angPt2Pt([0, 0], [-1, -1])).toBeCloseTo(-3 * Math.PI / 4, 15);
    expect(angPt2Pt([0, 0], [1, 1e-11])).toBe(0);
    expect(angPt2Pt([0, 0], [1, 1e-9])).toBeCloseTo(1e-9, 20);
    expect(mod2pi(3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 14);
    expect(mod2pi(-7)).toBeCloseTo(-7 + 2 * Math.PI, 14);
    expect(mod0to2pi(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2, 14);
    expect(mod0to2pi(7)).toBeCloseTo(7 - 2 * Math.PI, 14);
    expect(mod0to2pi(0)).toBe(0);
  });
  it("ptInCar: the car's rectangle −0.3 ≤ x ≤ 1.7, −0.5 ≤ y ≤ 0.5 in its own frame (both sides, the edges included)", () => {
    const car = [1, 1], th = Math.PI / 2; // pointing up: the rectangle is 0.5 … 1.5 × 0.7 … 2.7
    expect(ptInCar(car, th, [1, 2.6])).toBe(true);
    expect(ptInCar(car, th, [1, 2.7])).toBe(true); // the front edge (LessEqual)
    expect(ptInCar(car, th, [1, 2.8])).toBe(false);
    expect(ptInCar(car, th, [1, 0.75])).toBe(true);
    expect(ptInCar(car, th, [1, 0.65])).toBe(false);
    expect(ptInCar(car, th, [0.55, 2])).toBe(true); // left
    expect(ptInCar(car, th, [1.45, 2])).toBe(true); // right
    expect(ptInCar(car, th, [0.45, 2])).toBe(false);
    expect(ptInCar(car, th, [1.55, 2])).toBe(false);
  });
  it('drawCar: body Rectangle[{-1, -1/2}, {1, 1/2}] moved by {0.7, 0}, two yellow beams, axles, four wheels and an arrow, turned and moved to the rear axle', () => {
    const car = drawCar([2, 3], 0.5, 0, 1);
    expect(car[0]).toEqual({ dir: 'opacity', value: 1 });
    const outer = car[2];
    expect(outer.head).toBe('Translate');
    expect(outer.v).toEqual([2, 3]);
    expect(outer.g.head).toBe('Rotate');
    expect(outer.g.angle).toBe(0.5);
    expect(outer.g.about).toEqual([0, 0]);
    expect(outer.g.g.v).toEqual([0.7, 0]);
    const parts = outer.g.g.g;
    expect(parts[0]).toMatchObject({ head: 'Rectangle', a: [-1, -0.5], b: [1, 0.5] });
    expect(Cases(parts, 'Polygon').map((p) => p.pts[1])).toEqual([[8, 0.05], [8, -0.05]]);
    expect(Cases(parts, 'Line').length).toBe(2);
    expect(Cases(parts, 'Rectangle').length).toBe(5); // body and four wheels (front wheels turned by 0: α = 0)
    expect(Cases(parts, 'Rotate').map((r) => r.angle)).toEqual([0, 0]);
    expect(Cases(parts, 'Arrow')[0].pts).toEqual([[0, 0], [1, 0]]);
  });
  it('drawRunner: shoulders and an elliptic head; while running two arms swing with Clock[1, .3] (0 → 1 every 0.3 s)', () => {
    const still = drawRunner([1, 2], 0.3, false, 0);
    expect(still.v).toEqual([1, 2]);
    expect(still.g.angle).toBe(0.3);
    expect(Cases(still.g.g, 'Rectangle').map((r) => [r.a, r.b])).toEqual([[[-0.1, -0.5], [0.1, 0.5]]]);
    expect(Cases(still.g.g, 'Disk')[0].r).toEqual([0.3, 0.25]);
    // Clock[1, .3] at t = 0.075: 0.25, the arms 0.65·2·(0.25 − 0.5) = −0.325 long (the second the other way)
    expect(Clock(1, 0.3, 0.075)).toBeCloseTo(0.25, 14);
    expect(Clock(1, 0.3, 0.375)).toBeCloseTo(0.25, 14); // one period later
    const arms = Cases(drawRunner([1, 2], 0.3, true, 0.075).g.g, 'Rectangle').slice(0, 2);
    close(arms.map((r) => r.b), [[-0.325, -0.1], [0.325, 0.1]], 14);
    expect(arms.map((r) => r.a)).toEqual([[0, -0.4], [0, 0.4]]);
    const later = Cases(drawRunner([1, 2], 0.3, true, 0.225).g.g, 'Rectangle');
    expect(later.length).toBe(3);
    expect(later[0].b[0]).toBeCloseTo(0.325, 14); // Clock 0.75
  });
  it("the locators' look: the original's Locator Graphics (17 px: circles of 5 and 3, hairs from 2 to 8) in picture units", () => {
    const px = 30 / IMAGE_SIZE; // picture units per pixel (19.05 px per unit)
    const circles = Cases(LOCATOR_LOOK, 'Circle');
    expect(circles.map((c) => c.r / px)).toEqual([expect.closeTo(5 * 17 / 16, 12), expect.closeTo(3 * 17 / 16, 12)]);
    const hairs = Cases(LOCATOR_LOOK, 'Line')[0].pts;
    expect(hairs.length).toBe(4);
    expect(hairs[1].map((p) => p[1] / px)).toEqual([expect.closeTo(2 * 17 / 16, 12), expect.closeTo(8 * 17 / 16, 12)]);
    expect(Cases(LOCATOR_LOOK, (p, st) => p.head === 'Circle' && st.opacity === 0.3 && st.thickness.abs === 3).length).toBe(1);
  });
  it('setup: the first locator moves the pedestrian, the second the car (its handle follows), the third turns the car and snaps back to 2 units', () => {
    const s0 = initialState();
    let r = evaluate({ ...s0, loc: [[-5, 1], s0.loc[1], s0.loc[2]] });
    expect(r.state.runner).toEqual([-5, 1]);
    expect(r.state.carXYold).toEqual([2, 2]);
    r = evaluate({ ...s0, loc: [s0.loc[0], [0, -3], s0.loc[2]] });
    expect(r.state.carXYold).toEqual([0, -3]);
    expect(r.state.carθ).toBe(0.6); // the car keeps its heading
    close(r.state.loc[2], plus([0, -3], [2 * Math.cos(0.6), 2 * Math.sin(0.6)]), 14);
    r = evaluate({ ...s0, loc: [s0.loc[0], s0.loc[1], [2, 5]] });
    expect(r.state.carθ).toBeCloseTo(Math.PI / 2, 15);
    close(r.state.loc[2], [2, 4], 14);
    expect(r.view.ceL[0]).toBeCloseTo(-1, 14); // the turning circles turn with the car
    r = evaluate({ ...s0, loc: [s0.loc[0], s0.loc[1], [2, 2]] }); // the handle on the car: dTheta = 0, heading 0
    expect(r.state.carθ).toBe(0);
    close(r.state.loc[2], [4, 2], 14);
    // the pedestrian dragged into the car: "pedestrian hit!" but no collision in setup
    r = evaluate({ ...s0, loc: [[3, 2.5], s0.loc[1], s0.loc[2]] });
    expect(r.view.sText).toBe('pedestrian hit!');
    expect(r.state.state).toBe('setup');
  });
  it("switch to running: paths cleared, one locator at the pedestrian, timer = AbsoluteTime[], countdown 3; dt since the last running evaluation (here 1000 s) moves nothing", () => {
    const T = SAVED.lastTime + 1000;
    const { state, view } = evaluate({ ...initialState(), runPath: [[0, 0]], carPath: [[1, 1]], state: 'running' }, { time: T });
    expect(state.stateP).toBe('running');
    expect(state.loc).toEqual([[-2, 0]]);
    expect(state.timer).toBe(T);
    expect(state.lastTime).toBe(T);
    expect(state.runPath).toEqual([[-2, 0]]); // AppendTo[runPath, runner] after clearing
    expect(state.carPath).toEqual([]);
    expect(view.dt).toBeCloseTo(1000, 5); // lastTime is not reset (Q-HC-07)
    expect(view.countdown).toBe(3);
    expect(state.carXYold).toEqual([2, 2]);
    expect(settles(state)).toBe(true);
  });
  it('running: dt = clock difference, at least 0.01 and without upper limit; the pedestrian moves min(distance, dt) toward the locator (speed 1)', () => {
    let s = evaluate({ ...initialState(), state: 'running' }, { time: 10 }).state; // timer 10, lastTime 10
    s = { ...s, loc: [[-2, 1]] };
    let r = evaluate(s, { time: 10.25 });
    expect(r.view.dt).toBe(0.25);
    close(r.state.runner, [-2, 0.25], 15);
    expect(r.view.runnerθ).toBeCloseTo(Math.PI / 2, 15);
    expect(r.view.isRunning).toBe(true);
    expect(Cases(annotation(r.graphics.list, 'runner').g, 'Rectangle').length).toBe(3); // arms and shoulders
    expect(r.state.runPath.length).toBe(2);
    expect(r.view.countdown).toBe(3); // Ceiling[3 − 0.25]
    expect(evaluate(s, { time: 10.001 }).view.dt).toBe(0.01);
    expect(evaluate(s).view.dt).toBe(0.01); // no clock given: the minimum step
    r = evaluate(r.state, { time: 12.25 }); // dt 2 > the 0.75 left: it arrives
    expect(r.view.dt).toBe(2);
    expect(r.state.runner).toEqual([-2, 1]);
    expect(r.view.countdown).toBe(1);
    r = evaluate(r.state, { time: 12.3 }); // standing: facing +x, no arms
    expect(r.view.runnerθ).toBe(0);
    expect(r.view.isRunning).toBe(false);
    expect(Cases(annotation(r.graphics.list, 'runner').g, 'Rectangle').length).toBe(1);
    expect(r.state.runPath.length).toBe(4); // one point per evaluation, also when standing
    expect(settles(r.state)).toBe(true);
  });
  it('running: the car waits three seconds (countdown 3, 2, 1; at exactly 3 s neither), then turns by ω·v·dt/r_min and drives v·dt', () => {
    let s = evaluate({ ...initialState(), lastTime: 0, state: 'running' }, { time: 10 }).state; // timer 10
    const at = (t) => evaluate(s, { time: t });
    expect([10.5, 11.2, 12.99].map((t) => at(t).view.countdown)).toEqual([3, 2, 1]);
    expect(at(12.99).state.carPath).toEqual([]);
    const r3 = at(13); // cTime − timer = 3: neither < 3 nor > 3
    expect(r3.view.countdown).toBeNull();
    expect(r3.state.carPath).toEqual([]);
    s = at(12.9).state;
    const r = evaluate(s, { time: 13.05 });
    expect(r.view.dt).toBeCloseTo(0.15, 12);
    const th = s.carθ + (r.view.omega * 2 * r.view.dt) / 3;
    expect(r.state.carθ).toBeCloseTo(th, 14);
    close(r.state.carXYold, plus(s.carXYold, dir(th).map((x) => x * 2 * r.view.dt)), 14);
    expect(r.state.carPath).toEqual([r.state.carXYold]);
    expect(r.view.countdown).toBeNull();
    expect(Math.abs(r.view.omega)).toBeLessThanOrEqual(1);
  });
  it('the controller turns toward the pedestrian when it cannot escape into the turning disk: hard (ω = ±1), or exactly onto it within one step', () => {
    // car at the origin heading +x, r_min 3, v 2; pedestrian standing at {10, 5}: bearing 0.4636 (left), Alpha 1.768
    let r = evaluate(chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [10, 5] }), { time: 0.05 });
    expect(r.view.goalTheta).toBeCloseTo(Math.atan2(5, 10), 14);
    expect(r.view.Alpha).toBeCloseTo(Math.atan2(2, 10) + Math.PI / 2, 14);
    expect(r.view.branch).toBe('toward'); // (3·1.768 − 3·ArcTan[2.5/3])/2 = 1.61 ≤ |ceL − p| − 3 = 7.20
    expect(r.view.omega).toBe(1);
    expect(r.state.carθ).toBeCloseTo((2 * 0.05) / 3, 15);
    close(r.state.carXYold, dir((2 * 0.05) / 3).map((x) => x * 0.1), 15);
    // nearly straight ahead (bearing 0.0099997 < v·dt/r = 0.0333): ω = bearing·r/(v·dt), the car points at it
    r = evaluate(chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [10, 0.1] }), { time: 0.05 });
    expect(r.view.branch).toBe('toward');
    expect(r.view.omega).toBeCloseTo((Math.atan2(0.1, 10) * 3) / 0.1, 14);
    expect(r.state.carθ).toBeCloseTo(Math.atan2(0.1, 10), 15);
    // to the right: ω = −1
    r = evaluate(chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [10, -5] }), { time: 0.05 });
    expect(r.view.omega).toBe(-1);
  });
  it('the controller turns away when the pedestrian could escape into the turning disk (it is inside the disk on its side)', () => {
    // pedestrian at {1.5, 2.5}: bearing 1.030 (left), |ceL − p| = 1.58 < 3, car time (3·1.249 − 2.084)/2 = 0.83 > 0
    const r = evaluate(chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [1.5, 2.5] }), { time: 0.05 });
    expect(r.view.goalTheta).toBeCloseTo(Math.atan2(2.5, 1.5), 14);
    expect(r.view.Alpha).toBeCloseTo(Math.atan2(-0.5, 1.5) + Math.PI / 2, 14);
    expect(r.view.branch).toBe('away');
    expect(r.view.omega).toBe(-1); // hard right, away from it
    expect(r.state.carθ).toBeCloseTo((-2 * 0.05) / 3, 15);
    // pointing almost straight away (π − |bearing| < v·dt/r): the last part of the turn exactly
    const r2 = evaluate(chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [-1, 0.01] }), { time: 0.05 });
    expect(r2.view.branch).toBe('away');
    expect(r2.view.omega).toBeCloseTo((-(Math.PI - Math.atan2(0.01, -1)) * 3) / 0.1, 12);
    expect(r2.state.carθ).toBeCloseTo(-(Math.PI - Math.atan2(0.01, -1)), 14);
  });
  it('collision: the car reaches the pedestrian → Collision ("pedestrian hit!"), one more evaluation puts the locator on it, then the body stops', () => {
    const s0 = { ...chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [2.5, 0] }), loc: [[2.5, 3]] };
    // the pedestrian runs first (0.5 up), then the car turns exactly onto it (bearing 0.197 < v·dt/r = 1/3) and drives 1
    const r = evaluate(s0, { time: 0.5 });
    close(r.state.runner, [2.5, 0.5], 15);
    const b = Math.atan2(0.5, 2.5);
    expect(r.view.omega).toBeCloseTo((b * 3) / (2 * 0.5), 14);
    expect(r.state.carθ).toBeCloseTo(b, 15);
    close(r.state.carXYold, dir(b), 14); // the pedestrian now 1.55 ahead of the rear axle: inside (≤ 1.7)
    expect(r.view.hit).toBe(true);
    expect(r.state.state).toBe('Collision');
    expect(r.view.sText).toBe('pedestrian hit!');
    expect(r.view.runningTime).toBe('running time  10.5 s'); // cTime − timer = 0.5 + 10
    expect(settles(r.state)).toBe(true); // stateP is still "running"
    const r2 = evaluate(r.state, { time: 0.6 });
    expect(r2.state.loc).toEqual([r.state.runner]); // loc = {runner}
    expect(r2.state.stateP).toBe('Collision');
    expect(r2.view.isRunning).toBe(false);
    expect(r2.view.runningTime).toBe('running time  10.5 s'); // cTime = lastTime
    expect(r2.state.runPath.length).toBe(r.state.runPath.length);
    expect(settles(r2.state)).toBe(false);
    // the locator cannot be moved away from the pedestrian in Collision (Q-HC-03)
    expect(evaluate({ ...r2.state, loc: [[0, 5]] }).state.loc).toEqual([r.state.runner]);
  });
  it('after a collision: running again hits at once (the car has not moved); setup gives three locators and keeps the paths', () => {
    const s0 = { ...chase({ carXYold: [0, 0], carθ: 0, minRadius: 3, vcar: 2, runner: [2.5, 0] }) };
    const hit = evaluate(evaluate(s0, { time: 0.5 }).state, { time: 0.6 }).state;
    const again = evaluate({ ...hit, state: 'running' }, { time: 20 });
    expect(again.state.state).toBe('Collision');
    expect(again.state.runPath.length).toBe(1);
    expect(again.view.runningTime).toBe('running time   0.0 s');
    const back = evaluate({ ...hit, state: 'setup' }, { time: 20 });
    expect(back.state.loc.length).toBe(3);
    expect(back.state.loc[1]).toEqual(hit.carXYold);
    close(back.state.loc[2], plus(hit.carXYold, dir(hit.carθ).map((x) => 2 * x)), 14);
    expect(back.state.runPath).toEqual(hit.runPath);
    expect(back.view.sText).toBe('pedestrian hit!'); // still on the pedestrian, but no Collision in setup
    expect(settles(back.state)).toBe(false);
  });
  it('NumberForm[x, {3, 1}, NumberPadding -> {" ", "0"}] in StringForm["running time `` s"]: "  0.0", " 23.8", "  6.2", " 10.7"', () => {
    expect([0, 0.0019, 6.2, 23.81, 10.66, 0.05].map(nf)).toEqual(['  0.0', '  0.0', '  6.2', ' 23.8', ' 10.7', '  0.1']);
    expect([99.96, 123.45].map(nf)).toEqual([' 100.0', ' 123.0']); // three digits of precision (N-HC-05)
    expect(StringForm('running time `` s', nf(23.81))).toBe('running time  23.8 s');
  });
  it("the notebook's five snapshot settings: setup, two collisions (pedestrian hit at the car's front) and two \"Setup\" states that do nothing", () => {
    const expected = {
      1: { state: 'setup', text: 'pedestrian missed.', time: 'running time   0.0 s', locators: 3 },
      2: { state: 'Collision', text: 'pedestrian hit!', time: 'running time  23.8 s', locators: 1 },
      3: { state: 'Setup', text: 'pedestrian missed.', time: 'running time  26.9 s', locators: 3 },
      4: { state: 'Collision', text: 'pedestrian hit!', time: 'running time   6.2 s', locators: 1 },
      5: { state: 'Setup', text: 'pedestrian missed.', time: 'running time  10.7 s', locators: 3 },
    };
    for (const k of Object.keys(saved.snapshots)) {
      const s = settings(saved.snapshots[k]);
      const { state, view } = evaluate(s, { time: s.lastTime + 100 });
      const e = expected[k];
      expect(state.state, k).toBe(e.state);
      expect(view.sText, k).toBe(e.text);
      expect(view.runningTime, k).toBe(e.time);
      expect(state.loc.length, k).toBe(e.locators);
      expect(settles(state), k).toBe(false);
      expect(state.runPath, k).toEqual(s.runPath); // nothing moves
      expect(state.carXYold, k).toEqual(s.carXYold);
      if (e.state === 'Collision') { // the pedestrian just inside the front of the car (x ≤ 1.7)
        const d = [s.runner[0] - s.carXYold[0], s.runner[1] - s.carXYold[1]];
        const x = d[0] * Math.cos(s.carθ) + d[1] * Math.sin(s.carθ);
        expect(x, k).toBeGreaterThan(1.6);
        expect(x, k).toBeLessThanOrEqual(1.7);
        expect(state.loc, k).toEqual([s.runner]);
      }
      if (e.state === 'Setup') expect(state.loc, k).toEqual(s.loc); // the capitalized mode of an older version: no branch
    }
    // the snapshots' sliders: r_min 3, 3, 3, 5, 5; v_car 2, 1.168, 1.168, 2.282, 4.496
    expect(Object.values(saved.snapshots).map((s) => [s.minRadius, s.vcar])).toEqual([[3, 2], [3, 1.1680000000000001], [3, 1.1680000000000001], [5, 2.282], [5, 4.496]]);
  });
  it('a whole chase at 60 evaluations per second: a standing pedestrian is hit after the car first turns away, then toward it', () => {
    let t = 50;
    let s = evaluate({ ...initialState(), state: 'running' }, { time: t }).state;
    const branches = new Set();
    let r;
    for (let k = 1; k < 60 * 40 && s.state === 'running'; k++) {
      t = 50 + k / 60;
      r = evaluate(s, { time: t });
      s = r.state;
      if (t - 50 > 3) branches.add(r.view.branch);
    }
    expect(s.state).toBe('Collision');
    expect(t - 50).toBeGreaterThan(8);
    expect(t - 50).toBeLessThan(25);
    expect([...branches]).toEqual(['away', 'toward']);
    expect(r.view.runningTime).toBe(`running time ${nf(Math.round((t - 50) * 100) / 100)} s`);
    expect(s.carPath.length).toBeGreaterThan(300);
    // the pedestrian's path has a point from the switch and from every evaluation; the car moved from 3 s on (k > 180)
    expect(s.runPath.length).toBe(s.carPath.length + 1 + 180);
  });
});
