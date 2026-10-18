// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/robot-motion-obstacles.test.js — the model of "Robot Motion with Obstacles" (one evaluation of the
// Manipulate body; TESTPLAN T-RM-04…06, T-RM-13…17). Expected values from the source formulas by hand and from the
// draft's independent Python reference (design/robot-motion-obstacles/ref/cspace.py), never from the port. The shared
// grid functions are tested in tests/unit/arm-grid.test.js.
import { describe, it, expect } from 'vitest';
import { initialState, evaluate, blockedCount } from '../../demos/robot-motion-obstacles/model.js';
import { armGeometry, angleLabelVisible } from '../../demos/common/two-link.js';
import { arrowArc } from '../../demos/common/arrow-arcs.js';

const T1 = 3.4722866171255617, T2 = 3.306939635357677;
const closeVec = (a, b, d = 15) => { expect(a).toHaveLength(b.length); a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d)); };
/** the state after the first evaluation (the live state of the notebook) */
const live = () => evaluate(initialState()).state;

describe('robot-motion-obstacles model', () => {
  it('inCollision is False at the initial settings (green glyph in snapshot 1)', () => {
    const { view } = evaluate(initialState());
    expect([view.Theta1, view.Theta2]).toEqual([T1, T2]);
    closeVec(view.geometry.elbow, [-0.9458172417006344, -0.32469946920468423]);
    closeVec(view.geometry.tip, [-0.0663434904941459, 0.15124792383239033]);
    expect(view.inCollision).toBe(false); // distances 1.5556 (link 1) and 1.5035 (link 2) > 1/4
    expect(view.glyph).toBe('green');
  });
  it('a straight arm at 45 degrees through obstacle 1 is in collision', () => {
    const { view, state } = evaluate({ ...live(), pConfig: [3.375, -2] });
    expect(state.pConfig).toEqual([3.375, -2]);
    expect(view.Theta1).toBe(0.7853981633974486);
    expect(view.Theta2).toBe(0);
    expect(view.inCollision).toBe(true); // (1.1, 1.1) lies on y = x, 1.556 from the base: on link 2
    expect(view.glyph).toBe('red');
  });
  it('the grid is recomputed only when an obstacle or Q changed or the last grid was coarse', () => {
    const s0 = live();
    const a = evaluate({ ...s0, pConfig: [4, 1] });
    expect(a.view.recomputed).toBe(false);
    expect(a.state.freeConfigSpace).toBe(s0.freeConfigSpace); // the same array object
    const b = evaluate({ ...s0, pObs: [1, 1] });
    expect(b.view.recomputed).toBe(true);
    expect(b.state.pObsOld).toEqual([1, 1]);
    const c = evaluate({ ...s0, Quality: 3 });
    expect(c.view.recomputed).toBe(true);
    expect(c.state.freeConfigSpace).toHaveLength(96);
    expect(c.state.QualityOld).toBe(3);
    const d = evaluate({ ...s0, highRes: false });
    expect(d.view.recomputed).toBe(true);
    expect(d.state.freeConfigSpace).not.toBe(s0.freeConfigSpace);
    expect(d.state.freeConfigSpace).toEqual(s0.freeConfigSpace);
  });
  it('while a control is active the grid has 8Q cells per side and highRes is False', () => {
    const a = evaluate({ ...live(), pObs: [1, 1] }, { controlActive: true });
    expect(a.state.freeConfigSpace).toHaveLength(16);
    expect(blockedCount(a.state.freeConfigSpace)).toBe(18);
    expect(a.state.highRes).toBe(false);
    expect(a.view.resolution).toBe(16);
    const b = evaluate(a.state, { controlActive: false }); // the evaluation after release: highRes False forces it
    expect(b.state.freeConfigSpace).toHaveLength(64);
    expect(blockedCount(b.state.freeConfigSpace)).toBe(282);
    expect(b.state.highRes).toBe(true);
  });
  it('pObsOld != pObs is tolerant: a change of 1 ulp does not recompute the grid', () => {
    const s0 = live();
    const a = evaluate({ ...s0, pObs: [1.1000000000000003, 1.1] });
    expect(a.view.recomputed).toBe(false);
    expect(a.state.pObsOld).toEqual([1.1, 1.1]);
  });
  it('armGeometry and arrowArc: stadiums, arcs, arrowheads and label positions at the initial settings', () => {
    const g = armGeometry({ r1: 1, r2: 1, theta1: T1, theta2: T2, w: 1 / 8, theta1LabelRadius: 1 / 2, robotArmLabel: 'link2' });
    closeVec(g.elbow, [-0.9458172417006344, -0.32469946920468423]);
    expect(g.link1.rect).toEqual([[-0.125, -0.125], [1.125, 0.125]]);
    expect(g.link1.angle).toBe(T1);
    expect(g.link2.angle).toBe(6.779226252483239);
    expect(g.link2.about).toEqual(g.elbow);
    closeVec(g.theta1Label.at, [-0.08229729514036714, 0.49318065170136116]);
    closeVec(g.theta2Label.at, [-0.7449695293741492, -0.7825861325322128]);
    expect([g.theta1Label.visible, g.theta2Label.visible]).toEqual([true, true]);
    closeVec(g.robotArm.anchor, [-0.4458172417006344, -0.32469946920468423]);
    expect(g.robotArm.angle).toBe(6.779226252483239);
    const a1 = arrowArc({ center: [0, 0], r: 1 / 3, start: 0, end: T1 });
    closeVec(a1.tip, [-0.3152724139002115, -0.1082331564015614]);
    closeVec(a1.direction, [0.32469946920468423, -0.9458172417006344]);
    const a2 = arrowArc({ center: g.elbow, r: 1 / 3, start: T1, end: T1 + T2 });
    closeVec(a2.tip, [-0.6526593246318049, -0.16605033819232604]);
    closeVec(a2.direction, [-0.47594739303707456, 0.8794737512064885]);
    // the model draws exactly these
    const { view } = evaluate(initialState());
    expect(view.arcs[1].tip).toEqual(a2.tip);
    expect(view.geometry.robotArm).toEqual(g.robotArm);
  });
  it('the theta labels are shown only when Abs[theta] > pi/4', () => {
    expect(angleLabelVisible(0.78)).toBe(false);
    expect(angleLabelVisible(0.7853981633974486)).toBe(false); // 3 ulp above π/4: equal within Greater's tolerance (H-RM-08)
    expect(angleLabelVisible(6.1)).toBe(true);
    const { view } = evaluate({ ...live(), pConfig: [3.375, -2] });
    expect(view.geometry.theta1Label.visible).toBe(false);
    expect(view.geometry.theta2Label.visible).toBe(false);
  });
});
