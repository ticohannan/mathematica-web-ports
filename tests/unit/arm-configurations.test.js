// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/arm-configurations.test.js — robots.js, model.js and the DH-family code as this app uses it.
// Expected values: hand derivation from the source (docs/original-source/arm-configurations.txt) and an independent
// NumPy DH product (Rot_z·Trans_z·Trans_x·Rot_x, the tables transcribed separately; values copied below) — never the port.
import { describe, it, expect } from 'vitest';
import { ROBOTS, dhTableRows, cellText } from '../../demos/arm-configurations/robots.js';
import {
  initialState, selectRobot, evaluate, valueText, piValue, fracValue, exactInt, machine, REV, PRIS, drawShaft, entryString,
  hDisplay, origin, isPrismatic, exactRatio,
} from '../../demos/arm-configurations/model.js';
import fs from 'node:fs';
import { computeTd, computeAd, mul4Fma } from '../../demos/common/dh-chain.js';
import { chop } from '../../shared/mma.js';
import { drawJoint, drawGripper } from '../../demos/common/robot-draw.js';
import { flatten, cuboidCorners } from '../../demos/common/g3d.js';
import { mmaGrid } from '../../shared/ui.js';
import { typeOf } from '../../demos/robot-singularities/robots.js';
import { apply4 } from '../../demos/common/g3d.js';

const π = Math.PI;
const H3 = (v) => v.H.slice(0, 3);
const closeM = (A, B, tol, what = '') => A.forEach((r, i) => r.forEach((x, j) => expect(Math.abs(x - B[i][j]), `${what}[${i}][${j}] ${x} vs ${B[i][j]}`).toBeLessThanOrEqual(tol)));
const ascii = (rows) => rows.map((r) => r.map((s) => s.replace(/−/g, '-')));
const reset = (index) => selectRobot(initialState(), index);
const idx = (name) => ROBOTS.findIndex((R) => R.name === name);

// NumPy (independent): H at the reset values (params 0 / 0.5), rows 1-3
const H_RESET = {
  'planar elbow': [[1, 0, 0, 2.5], [0, 1, 0, 0], [0, 0, 1, 0]],
  'elbow robot': [[1, 0, 0, 2], [0, 0, -1, 0], [0, 1, 0, 1]],
  anthropomorphic: [[1, 0, 0, 2], [0, -1, 0, 0], [0, 0, -1, 0.25]],
  'Stanford robot': [[1, 0, 0, 0], [0, 1, 0, 1], [0, 0, 1, 2.5]],
  'cylindrical robot': [[1, 0, 0, 0], [0, 0, 1, 0.5], [0, -1, 0, 1.5]],
  'spherical robot': [[1, 0, 0, 1.75], [0, 1, 0, 0], [0, 0, 1, 1.5]],
  'SCARA robot': [[1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 1, 1.75]],
  'Cartesian robot': [[-1, 0, 0, 0], [0, -1, 0, -0.5], [0, 0, 1, 1.5]],
  'CNC robot': [[0, 1, 0, 0.5], [0, 0, 1, 0.5], [1, 0, 0, 0.5]],
};

describe('arm-configurations: robots and controls', () => {
  it('the popup has the 9 robots in the original order with dof 2, 3, 6, 6, 3, 3, 4, 4, 3 and their joint types', () => {
    expect(ROBOTS.map((R) => R.name)).toEqual(['planar elbow', 'elbow robot', 'anthropomorphic', 'Stanford robot', 'cylindrical robot', 'spherical robot', 'SCARA robot', 'Cartesian robot', 'CNC robot']);
    expect(ROBOTS.map((R) => R.jointtype.length)).toEqual([2, 3, 6, 6, 3, 3, 4, 4, 3]);
    expect(ROBOTS.map((R) => R.jointtype.join(''))).toEqual(['rr', 'rrr', 'rrrrrr', 'rrprrr', 'rpp', 'rrp', 'rrpr', 'pppr', 'ppp']);
    // the body's bookkeeping: dof = Dimensions[DHParameters][[2]], joint arrays per column
    for (const [k, R] of ROBOTS.entries()) {
      const v = evaluate(reset(k));
      expect(v.dof).toBe(R.jointtype.length);
      expect(v.joints.map((J) => J.jointtype)).toEqual(R.jointtype);
    }
    // machine entries of the tables: 1.5, 0.75, 0.5; everything else exact
    const machines = ROBOTS.flatMap((R) => ['a', 'alpha', 'd', 'theta'].flatMap((k) => R[k].filter((e) => e.q === undefined && !e.exact).map((e) => e.v)));
    expect(machines.sort()).toEqual([0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 1.5, 1.5].sort());
  });

  it('slider grid: θ*i -π..π step π/32 reset 0, d*i 1/2..3/2 step 1/20 reset 0.5 (machine), only params 1..dof are reset', () => {
    const rev = mmaGrid(REV.min, REV.max, 1), pris = mmaGrid(PRIS.min, PRIS.max, 1);
    expect(rev.n + 1).toBe(65);
    expect(piValue(rev.valueAt(0)).v).toBe(-π);
    expect([rev.valueAt(0), rev.valueAt(rev.n), pris.valueAt(0), pris.valueAt(pris.n)]).toEqual([-32, 32, 10, 30]);
    expect(piValue(32).v).toBe(π);
    expect(pris.n + 1).toBe(21);
    expect([fracValue(PRIS.min).v, fracValue(PRIS.max).v]).toEqual([0.5, 1.5]);
    let st = initialState();
    st.params[6] = machine(0.3);
    st = selectRobot(st, idx('CNC robot'));
    expect(st.params.slice(0, 3)).toEqual([machine(0.5), machine(0.5), machine(0.5)]);
    expect(st.params.slice(3, 6)).toEqual([exactInt(0), exactInt(0), exactInt(0)]);
    expect(st.params[6]).toEqual(machine(0.3));
    expect(st.dof).toBe(3);
    st = selectRobot(st, idx('anthropomorphic'));
    expect(st.params.slice(0, 6).every((p) => p.v === 0 && p.exact)).toBe(true);
  });

  it('slider value text: 0, 0.5 (machine reset), -13π/16, 11/20, 1/2, 3/2 (exact slider values)', () => {
    expect([exactInt(0), piValue(0), piValue(-26), piValue(1), piValue(32)].map(valueText)).toEqual(['0', '0', '−13π/16', 'π/32', 'π']);
    expect([machine(0.5), fracValue(11), fracValue(10), fracValue(30), fracValue(20)].map(valueText)).toEqual(['0.5', '11/20', '1/2', '3/2', '1']);
  });

  it('selecting another robot resets the joints, selecting the same robot keeps them', () => {
    const st = initialState();
    st.params[1] = piValue(8);
    const same = selectRobot(st, idx('anthropomorphic'));
    expect(same).toEqual(st);
    const elbow = selectRobot(st, idx('elbow robot'));
    expect(elbow.params.slice(0, 3)).toEqual([exactInt(0), exactInt(0), exactInt(0)]);
    expect(elbow.dof).toBe(3);
  });

  it('the DH table: header joint, type, r, α, d, 0 (θ header left at 0), θ*i for revolute and d*i for prismatic joints', () => {
    const t = (name) => dhTableRows(ROBOTS[idx(name)]).map((r) => r.map(cellText));
    expect(t('anthropomorphic')).toEqual([
      ['joint', 'type', 'r', 'α', 'd', '0'],
      ['1', 'r', '0', 'π/2', '1.5', 'θ*1'], ['2', 'r', '1', '0', '0', 'θ*2'], ['3', 'r', '1', 'π/2', '0', 'θ*3'],
      ['4', 'r', '0', 'π/2', '0.75', 'θ*4'], ['5', 'r', '0', '−π/2', '0', 'θ*5'], ['6', 'r', '0', '0', '0.5', 'θ*6'],
    ]);
    expect(t('CNC robot').slice(1)).toEqual([['1', 'p', '0', '−π/2', 'd*1', '−π/2'], ['2', 'p', '0', 'π/2', 'd*2', '−π/2'], ['3', 'p', '0', '0', 'd*3', '0']]);
    expect(t('Cartesian robot')[2]).toEqual(['2', 'p', '0', 'π/2', 'd*2', 'π']);
  });
});

describe('arm-configurations: chain and exactness', () => {
  it('H at the reset values equals an independent DH product for all 9 robots', () => {
    for (const [k, R] of ROBOTS.entries()) {
      const v = evaluate(reset(k));
      closeM(H3(v), H_RESET[R.name], 1e-15, R.name);
      expect(v.H[3]).toEqual([0, 0, 0, 1]);
    }
  });

  it('dhTransform, Ad and Td are those of robot-singularities generalised to dof joints, machine products are the fused Dot, chopped', () => {
    // robot-singularities' elbow arm through the common code (dof 3, chop on): its Td bit for bit as recorded before
    // the DH-family move (tests/unit/fixtures/robot-singularities.pre-move.json)
    const pre = JSON.parse(fs.readFileSync('tests/unit/fixtures/robot-singularities.pre-move.json', 'utf8'));
    const enc = (x) => JSON.parse(JSON.stringify(x, (k, v) => (Object.is(v, -0) ? '-0' : v)));
    const rob = pre.robots.find((r) => r.iType === 2);
    for (const row of rob.rows) expect(enc(computeTd(computeAd(typeOf(2), row.c, 3))), `elbow arm ${row.c}`).toEqual(row.Td);
    // the anthropomorphic chain with dof 6 equals the NumPy product
    const st = initialState();
    [3, -5, 7, 11, -2, 9].forEach((n, i) => { st.params[i] = piValue(n); });
    const v = evaluate(st);
    expect(v.Td).toHaveLength(6);
    const numpyH = [[-0.12259983904334058, -0.9396688971492219, 0.3193613051027192, 2.082197027542688],
      [-0.9914077250150849, 0.10116891484001302, -0.08291907772345161, 0.5417294276727035],
      [0.04560704163789395, -0.3267831305322528, -0.943998296265719, 0.01610547675484808]];
    closeM(H3(v), numpyH, 1e-14, 'anthropomorphic');
    // Td[i] = Chop[Td[i-1].Ad[[i]]] with machine matrices: entry = fma(a3,b3, fma(a2,b2, fma(a1,b1, a0 b0))), then
    // |x| < 10^-10 -> 0 (K-AC-01: Chop acts, H-AC-14; the fused Dot: H-AC-11)
    for (let i = 1; i < 6; i++) expect(v.Td[i]).toEqual(chop(mul4Fma(v.Td[i - 1], v.Ad[i])));
    // the residues of the plain product are chopped: H[2,3] is 0. (was 1.66533×10^-16 before v0.1.17, K-AC-02)
    const r = initialState();
    [-11, -27, 19, 0, -8, 8].forEach((n, i) => { r.params[i] = piValue(n); });
    const vr = evaluate(r);
    const plain = computeTd(vr.Ad, { chop: false });
    expect(Math.abs(plain[5][1][2])).toBeGreaterThan(0);
    expect(Math.abs(plain[5][1][2])).toBeLessThan(1e-15);
    expect(vr.H[1][2]).toBe(0);
    expect(vr.H[0][2]).toBe(0);
    expect(ascii(vr.hStrings)[1][2]).toBe('0.');
  });

  it('exactness at the reset values: H is exact for the elbow robot and for exact prismatic values, all machine as soon as a machine number enters (1.5, 0.75, 0.5, the 0.5 reset)', () => {
    const allMachine = (K) => K.flat().every((k) => k === 'machine');
    const allExact = (K) => K.flat().every((k) => k === 'zero' || k === 'plain');
    for (const [k, R] of ROBOTS.entries()) {
      const K = evaluate(reset(k)).HKinds;
      if (R.name === 'elbow robot') expect(allExact(K), R.name).toBe(true);
      else expect(allMachine(K), R.name).toBe(true);
    }
    const cnc = reset(idx('CNC robot'));
    cnc.params[0] = fracValue(11); cnc.params[1] = fracValue(11); cnc.params[2] = fracValue(11);
    expect(allExact(evaluate(cnc).HKinds)).toBe(true);
    cnc.params[2] = machine(0.5);
    expect(allMachine(evaluate(cnc).HKinds)).toBe(true);
  });

  it('exact multiples of π/2 give exact zeros in H (no 6.1×10^-17 residues)', () => {
    const st = initialState();
    st.params[0] = piValue(16);
    const v = evaluate(st);
    expect(H3(v)).toEqual([[0, 1, 0, 0], [1, 0, 0, 2], [0, 0, -1, 0.25]].map((r) => r.map((x) => x + 0)));
    for (const x of v.H.flat()) expect(Object.is(x, -0), 'no negative zero in H (Mathematica has none)').toBe(false);
    const ns = [-32, -16, 0, 16, 32];
    let residues = 0;
    for (let c = 0; c < 5 ** 6; c++) {
      let m = c;
      for (let i = 0; i < 6; i++) { st.params[i] = piValue(ns[m % 5]); m = Math.floor(m / 5); }
      for (const x of evaluate(st).H.flat()) if ((x !== 0 && Math.abs(x) < 1e-13) || Object.is(x, -0)) residues++;
    }
    expect(residues).toBe(0);
  }, 60000); // 5^6 = 15625 evaluations

  it('a TransformationFunction with one machine entry is all machine, also away from the reset values (K-AC-09, H-AC-18)', () => {
    // Mathematica 15.0.1 (H-AC-18, H-AC-11): every Td[i] of the anthropomorphic arm is a machine matrix from Td[1] = Ad[[1]]
    // on (its d = 1.5), so H is all machine (six-digit display) and its exact-looking entries print "0." and "1."
    const st = initialState();
    st.params[0] = piValue(1);
    const v = evaluate(st);
    for (const K of [...v.AdKinds.slice(0, 1), ...v.TdKinds]) expect(K.flat().every((k) => k === 'machine')).toBe(true);
    expect(ascii(v.hStrings)[0]).toEqual(['0.995185', '0.0980171', '0.', '1.99037']);
    expect(ascii(v.hStrings)[3]).toEqual(['0.', '0.', '0.', '1.']);
    // elbow robot (all exact): exact H with symbolic entries at 3π/8, π/4 (two-digit display; the original shows
    // ~51-digit numbers here, P-AC-01)
    const e = reset(idx('elbow robot'));
    e.params[1] = piValue(12); e.params[2] = piValue(8);
    const ve = evaluate(e);
    expect(ve.HKinds.flat().includes('machine')).toBe(false);
    expect(ascii(ve.hStrings)).toEqual([['-0.38', '-0.92', '0', '0'], ['0', '0', '-1.0', '0'], ['0.92', '-0.38', '0', '2.8'], ['0', '0', '0', '1.0']]);
  });
});

describe('arm-configurations: graphics', () => {
  it('drawShaft is never drawn (4-argument If) and show robot off leaves joint 1 and the gripper', () => {
    for (const [k] of ROBOTS.entries()) {
      for (const show of [true, false]) {
        const st = reset(k);
        st.showRobot = show;
        const v = evaluate(st);
        expect(v.parts).toHaveLength(4);
        if (!show) expect(v.parts[2]).toEqual([]);
        else expect(v.parts[2].length).toBeGreaterThan(0);
        expect(v.parts[0].map((p) => p.type)).toEqual(['cylinder']);
        // joint 1: 15 axis lines, the axis, the body (1 or 2), the link
        const j1 = v.parts[1];
        expect(j1.filter((p) => p.type === 'line')).toHaveLength(15);
        // the gripper: 15 axis lines + 3 cuboids, in Td[dof]
        const gr = v.parts[3];
        expect(gr.filter((p) => p.type === 'cuboid')).toHaveLength(3);
        for (const c of gr.filter((p) => p.type === 'cuboid')) expect(c.matrix).toEqual(v.Td[v.dof - 1]);
      }
    }
    // drawShaft itself (transcribed): an opaque-then-translucent gray axis only
    expect(flatten(drawShaft('p', 0.5, 0, 0)).map((p) => [p.type, p.opacity])).toEqual([['cuboid', 0.5]]);
  });

  it('the gripper is always drawGripper[g, 0] (hand along z)', () => {
    for (const [k] of ROBOTS.entries()) {
      for (const g of [1, 0.62]) {
        const st = reset(k);
        st.g = { v: g, exact: g === 1 };
        const cub = evaluate(st).parts[3].filter((p) => p.type === 'cuboid').map(cuboidCorners);
        expect([cub[0].min, cub[0].max]).toEqual([[-0.2, -0.05, -0.1], [0.2, 0.05, 0]]);
        expect(cub[1].min[0]).toBeCloseTo(0.1 * g, 15);
        expect(cub[1].max[0]).toBeCloseTo(0.1 * (1 + g), 15);
        expect(cub[2].max[0]).toBeCloseTo(-0.1 * g, 15);
        expect(cub[2].min[0]).toBeCloseTo(-0.1 * (1 + g), 15);
        for (const c of cub.slice(1)) expect([c.min[2], c.max[2]]).toEqual([0, 0.2]);
      }
    }
  });

  it('drawJoint of this Demonstration: translucent axis and link, two light-blue cuboids for p, cylinder radius 0.14 from -0.25 to 0.25 for r', () => {
    const solids = (j, d, r, θ) => flatten(drawJoint(j, d, r, θ, { variant: 'ac' })).filter((p) => p.type !== 'line');
    const rv = solids('r', 1.5, 0, 0);
    expect(rv).toHaveLength(3);
    expect([rv[0].type, rv[0].p1, rv[0].p2, rv[0].radius, rv[0].opacity]).toEqual(['cylinder', [0, 0, -0.05 - 0.01], [0, 0, 1.5 + 0.01], 0.05, 0.5]);
    expect(rv[0].p1[2]).toBeCloseTo(-0.06, 15);
    expect(rv[0].p2[2]).toBeCloseTo(1.51, 15);
    expect([rv[1].type, rv[1].radius, rv[1].opacity]).toEqual(['cylinder', 0.7 * (1 / 5), 1]);
    expect(rv[1].radius).toBeCloseTo(0.14, 15);
    expect([rv[1].p1[2], rv[1].p2[2]].map((z) => Math.round(z * 1e12) / 1e12)).toEqual([-0.25, 0.25]);
    expect([rv[2].type, rv[2].opacity]).toEqual(['cuboid', 0.5]);
    const lk = cuboidCorners(rv[2]);
    expect(lk.min.map((x) => Math.round(x * 1e12) / 1e12)).toEqual([-0.05, -0.05, 1.45]);
    expect(lk.max.map((x) => Math.round(x * 1e12) / 1e12)).toEqual([0, 0.05, 1.55]);
    const pr = solids('p', 0.5, 0, -π / 2);
    expect(pr.map((p) => p.type)).toEqual(['cuboid', 'cuboid', 'cuboid', 'cuboid']);
    const r12 = (a) => a.map((x) => Math.round(x * 1e12) / 1e12);
    expect([r12(pr[0].min), r12(pr[0].max), pr[0].opacity]).toEqual([[-0.05, -0.05, -0.71], [0.05, 0.05, 0.51], 0.5]);
    expect([r12(pr[1].min), r12(pr[1].max), pr[1].opacity]).toEqual([[-0.2, -0.2, -0.2], [0.2, 0.2, 0.1], 1]);
    expect([r12(pr[2].min), r12(pr[2].max)]).toEqual([[-0.2, -0.2, 0.2], [0.2, 0.2, 0.25]]);
  });

  it('prismatic axis -1+d-jr-.01 in written order: an exact slider value k/20 joins the exact terms, a machine value is added term by term', () => {
    expect([exactRatio(fracValue(11)), exactRatio(exactInt(1)), exactRatio(machine(0.5)), exactRatio(piValue(3))]).toEqual([[11, 20], [1, 1], null, null]);
    const z0 = (d, dExact) => flatten(drawJoint('p', d, 0, 0, { variant: 'ac', dExact })).filter((p) => p.type === 'cuboid')[0].min[2];
    // hand-worked doubles: exact 11/20: -1 + 11/20 - 1/5 = -13/20 exactly, then -0.01 + -0.65; machine 0.55:
    // ((-1 + 0.55) + -0.2) + -0.01 (the order H-DH-02/03/07 record; here equal to (0.55 + -0.01) + -1.2)
    expect(z0(11 / 20, [11, 20])).toBe(-0.66);
    expect(z0(0.55, null)).toBe(-0.6599999999999999);
    expect(drawShaft('p', 0.55, 0, 0)[1][2].min[2]).toBe(-0.6599999999999999); // the unreachable drawShaft follows the same rule
  });

  it("drawJoint variant 'ac' is the source's drawJoint, element by element (verified against the raw notebook)", () => {
    // drawJoint[j_, d_, r_, Theta_] := Module[{jr = 1/5, ar = 1/20, pr = 1/7, vr = 1/6}, {drawCoordAxes[jr], Opacity[1],
    //   {Opacity[0.5], Gray, If[MemberQ[{"Prismatic","prismatic","P","p"}, j], Cuboid[{-ar,-ar,-1+d-jr-.01},{ar,ar,d+.01}],
    //     Cylinder[{{0,0,Min[-ar,d-jr]-.01},{0,0,Max[ar,d]+.01}}, ar]]},
    //   {LightBlue, If[j == "p", {Cuboid[{-jr,-jr,-jr},{jr,jr,+jr-.1}], Cuboid[{-jr,-jr,+jr},{jr,jr,+jr+.05}]},
    //     {Cylinder[{{0,0,-jr-.05},{0,0,+jr+.05}}, .7*jr]}]},
    //   Rotate[{Opacity[0.5], Gray, Cuboid[{-ar,-ar,d-ar},{r,ar,d+ar}]}, Theta, {0,0,1}]}]
    const jr = 1 / 5, ar = 1 / 20;
    const GRAY = [0.5, 0.5, 0.5], LIGHTBLUE = [0.87, 0.94, 1];
    for (const [j, d, r, θ] of [['r', 0.3, 1, 0.7], ['p', 1.2, 0.75, -π / 2], ['P', 0.8, 0, 0], ['Prismatic', 0.6, 0.5, 1], ['revolute', 0, 0, 0]]) {
      const tree = drawJoint(j, d, r, θ, { variant: 'ac' });
      // the list structure of the source: axes, Opacity[1], axis, joint body, link
      expect(tree).toHaveLength(5);
      expect(tree[1]).toEqual({ directive: 'opacity', value: 1 });
      const prims = flatten(tree).filter((p) => p.type !== 'line');
      const axisPrismatic = ['Prismatic', 'prismatic', 'P', 'p'].includes(j);
      const bodyPrismatic = j === 'p';
      const [axis, ...rest] = prims;
      const link = rest.pop();
      expect(axis.opacity).toBe(0.5);
      expect(axis.color).toEqual(GRAY);
      // -1+d-jr-.01 added in written order, ((-1 + d) + -1/5) + -0.01 (K-AC-10 resolved by dh-parameters' H-DH-02/03/07)
      if (axisPrismatic) expect([axis.type, axis.min, axis.max]).toEqual(['cuboid', [-ar, -ar, ((-1 + d) + -1 / 5) + -0.01], [ar, ar, d + 0.01]]);
      else expect([axis.type, axis.p1, axis.p2, axis.radius]).toEqual(['cylinder', [0, 0, Math.min(-ar, d - jr) - 0.01], [0, 0, Math.max(ar, d) + 0.01], ar]);
      for (const b of rest) { expect(b.opacity).toBe(1); expect(b.color.map((c) => Math.round(c * 100) / 100)).toEqual(LIGHTBLUE); }
      if (bodyPrismatic) {
        expect(rest.map((b) => [b.type, b.min, b.max])).toEqual([['cuboid', [-jr, -jr, -jr], [jr, jr, jr - 0.1]], ['cuboid', [-jr, -jr, jr], [jr, jr, jr + 0.05]]]);
      } else {
        expect(rest.map((b) => [b.type, b.p1, b.p2, b.radius])).toEqual([['cylinder', [0, 0, -jr - 0.05], [0, 0, jr + 0.05], 0.7 * jr]]);
      }
      // the link is drawn for every r (also r = 0), translucent gray, rotated by Theta about z
      expect([link.type, link.min, link.max, link.opacity, link.color]).toEqual(['cuboid', [-ar, -ar, d - ar], [r, ar, d + ar], 0.5, GRAY]);
      if (θ === 0) expect(link.matrix[0][0]).toBe(1);
      else expect(link.matrix[0][1]).toBeCloseTo(-Math.sin(θ), 15);
    }
  });

  it('PlotRange ±3 clips the Stanford end frame at d*3 = 3/2 (z = 3.5) and the Cartesian one at d* = 3/2 (z = 3.5)', () => {
    const s = reset(idx('Stanford robot'));
    s.params[2] = fracValue(30);
    const os = origin(evaluate(s).H);
    closeM([os], [[0, 1, 3.5]], 1e-15, 'Stanford');
    const c = reset(idx('Cartesian robot'));
    [0, 1, 2].forEach((i) => { c.params[i] = fracValue(30); });
    const vc = evaluate(c);
    closeM([origin(vc.H)], [[0, -1.5, 3.5]], 1e-15, 'Cartesian');
    expect(vc.box).toEqual([[-3, 3], [-3, 3], [-3, 3]]);
    // every gripper cuboid lies beyond the clipping plane z = 3 (the hand points up along z here)
    for (const p of vc.parts[3].filter((q) => q.type === 'cuboid')) {
      const { min, max } = cuboidCorners(p);
      for (let k = 0; k < 8; k++) {
        const corner = [0, 1, 2].map((i) => ((k >> i) & 1 ? max[i] : min[i]));
        expect(apply4(p.matrix, corner)[2]).toBeGreaterThan(3);
      }
    }
  });
});

describe('arm-configurations: the H display', () => {
  it('H display: anthropomorphic at zero reads 1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1.', () => {
    expect(ascii(evaluate(initialState()).hStrings)).toEqual([['1.', '0.', '0.', '2.'], ['0.', '-1.', '0.', '0.'], ['0.', '0.', '-1.', '0.25'], ['0.', '0.', '0.', '1.']]);
  });
  it('H display: elbow robot at zero reads 1.0 0 0 2.0 / 0 0 -1.0 0 / 0 1.0 0 1.0 / 0 0 0 1.0', () => {
    expect(ascii(evaluate(reset(idx('elbow robot'))).hStrings)).toEqual([['1.0', '0', '0', '2.0'], ['0', '0', '-1.0', '0'], ['0', '1.0', '0', '1.0'], ['0', '0', '0', '1.0']]);
  });
  it('two-digit display of exact entries: cos π/32 gives 1.0, sin π/32 0.098, -1/√2 -0.71, 1/4 0.25, 1 + 1/√2 1.7', () => {
    const xs = [0.9951847266721969, 0.0980171403295606, -0.7071067811865475, 0.25, 1.7071067811865475, 2, 2.847759065022574, -0.3826834323650898];
    expect(xs.map((x) => entryString(x, 'symbolic'))).toEqual(['1.0', '0.098', '-0.71', '0.25', '1.7', '2.0', '2.8', '-0.38']);
    expect(entryString(0, 'zero')).toBe('0');
    expect(entryString(3e-17, 'symbolic')).toBe('0'); // D-AC-05
  });
  it('machine display: 1., 0., 0.25, 2.5, -1. and 6.12323×10^-17', () => {
    expect([1, 0, -0, 0.25, 2.5, -1, 6.123233995736766e-17].map((x) => entryString(x, 'machine'))).toEqual(['1.', '0.', '0.', '0.25', '2.5', '-1.', '6.12323×10^-17']);
    expect(hDisplay([[1, 0, 0, 0]], [['machine', 'zero', 'plain', 'symbolic']])).toEqual([['1.', '0', '0', '0']]);
  });
  it('isPrismatic follows MemberQ of the four spellings', () => {
    expect(['Prismatic', 'prismatic', 'P', 'p', 'r', 'R'].map(isPrismatic)).toEqual([true, true, true, true, false, false]);
  });
});
