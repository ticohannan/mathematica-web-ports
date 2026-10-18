// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Benedict Isichei; Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/two-link.test.js — demos/common/two-link.js (owner two-link-kinematics, COMMON-DECISIONS §3): the arm
// geometry of the two-link Demonstrations. Expected values are hand formulas of the sources (worked with Python
// `math` in the drafts: two-link-kinematics T-TK-08 and T-TK-30, robot-motion-obstacles T-RM-05 and T-RM-16,
// distance-norms T-DN-10), never the module's own output.
import { describe, it, expect } from 'vitest';
import { elbowPosition, tipPosition, armSegments, armGeometry, rotatePoint, angleLabelVisible } from '../../demos/common/two-link.js';

const ulps = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))));
const near = (p, q, n = 4) => p.forEach((v, i) => expect(ulps(v, q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(n));
const close = (p, q, tol = 1e-15) => p.forEach((v, i) => expect(Math.abs(v - q[i]), `${v} vs ${q[i]}`).toBeLessThanOrEqual(tol));

// robot-motion-obstacles initial settings (T-RM-05 / T-RM-16): θ1, θ2 from pConfig {5, 0} with a·(1/b)
const RM = { theta1: 3.4722866171255617, theta2: 3.306939635357677 };

describe('two-link.js: positions and segments', () => {
  it('elbow r1{Cos θ1, Sin θ1} and tip {r1 Cos θ1 + r2 Cos(θ1 + θ2), …}: θ1 = π/2, θ2 = 0 gives (1.2246467991473532e-16, 2)', () => {
    expect(elbowPosition(1, Math.PI / 2)).toEqual([6.123233995736766e-17, 1]);
    expect(tipPosition(1, 1, Math.PI / 2, 0)).toEqual([1.2246467991473532e-16, 2]); // T-TK-08: cos θ1 + cos θ1
    expect(tipPosition(1, 1, 0, 0)).toEqual([2, 0]);
    expect(tipPosition(1.5, 0.5, 0, Math.PI)).toEqual([1.5 + 0.5 * Math.cos(Math.PI), 0.5 * Math.sin(Math.PI)]);
  });
  it('armSegments(θ1, φ2, 1, 1): the collision segments of robot-motion-obstacles at its initial settings', () => {
    const [l1, l2] = armSegments(RM.theta1, RM.theta1 + RM.theta2, 1, 1);
    expect(l1[0]).toEqual([0, 0]);
    near(l1[1], [-0.9458172417006344, -0.32469946920468423]); // T-RM-05 elbow
    expect(l2[0]).toEqual(l1[1]);
    near(l2[1], [-0.0663434904941459, 0.15124792383239033], 16); // T-RM-05 tip (a difference of two numbers near 1)
  });
  it('armSegments with φ2 absolute: link 2 points along φ2, with unequal lengths l1 Cos θ1 + l2 Cos φ2', () => {
    const [, [e, t]] = armSegments(0.3, 1.2, 2, 0.5);
    close(e, [2 * Math.cos(0.3), 2 * Math.sin(0.3)], 0);
    close(t, [2 * Math.cos(0.3) + 0.5 * Math.cos(1.2), 2 * Math.sin(0.3) + 0.5 * Math.sin(1.2)], 0);
    const [, [, t1]] = armSegments(0.3, 1.2, 1, 1);
    expect(t1).toEqual([Math.cos(0.3) + Math.cos(1.2), Math.sin(0.3) + Math.sin(1.2)]); // l{Cos θ1 + Cos φ2, …}
  });
  it('rotatePoint is Rotate[p, angle, about]', () => {
    close(rotatePoint([2, 1], Math.PI / 2, [1, 1]), [1, 2]);
    close(rotatePoint([1, 0], Math.PI), [-1, 0]);
  });
});

describe('two-link.js: armGeometry', () => {
  it('label placement: Robot Arm on link 1 when r2 < 1, else link 2, theta labels only when abs(theta) > pi/4', () => {
    // r1 = 1 (r2 = 1), 1.59 (r2 = 0.41), 0.5 (r2 = 1.5): link 2, link 1, link 2 (`If[r2 < 1, …]`, `If[r2 >= 1, …]`)
    const g = (r1, theta1 = 0) => armGeometry({ r1, r2: 2 - r1, theta1, theta2: 0, w: 1 / 8, theta1LabelRadius: 2 / 5, robotArmLabel: 'byR2' });
    expect(g(1).robotArm.link).toBe(2);
    expect(g(1.59).robotArm.link).toBe(1);
    expect(g(0.5).robotArm.link).toBe(2);
    expect(g(1.59).robotArm.anchor).toEqual([1.59 / 2, 0]); // {r1/2, 0}
    expect(g(0.5).robotArm.anchor).toEqual([0.5 + 1.5 / 2, 0]); // {r1 Cos θ1 + r2/2, r1 Sin θ1}
    // no θ1 label at π/4 (tolerant Greater); at 0.8 the label at (2/5)(cos 0.4, sin 0.4)
    expect(g(1, 0.7853981633974483).theta1Label.visible).toBe(false);
    const at08 = g(1, 0.8).theta1Label;
    expect(at08.visible).toBe(true);
    near(at08.at, [0.3684243976011541, 0.15576733692346023], 1);
    expect(g(1, 0).theta2Label.visible).toBe(false);
  });
  it('the theta-label threshold is the tolerant Greater: 3 ulps above pi/4 is not greater, 0.79 is', () => {
    expect(angleLabelVisible(0.78)).toBe(false);
    expect(angleLabelVisible(0.7853981633974486)).toBe(false);
    expect(angleLabelVisible(0.79)).toBe(true);
    expect(angleLabelVisible(-6.1)).toBe(true); // Abs
  });
  it("robotArmLabel 'link2' with label radius 1/2 (robot-motion-obstacles): label, anchor and rotation at the initial settings", () => {
    const g = armGeometry({ r1: 1, r2: 1, ...RM, w: 1 / 8, theta1LabelRadius: 1 / 2, robotArmLabel: 'link2' });
    near(g.elbow, [-0.9458172417006344, -0.32469946920468423]);
    near(g.theta1Label.at, [-0.08229729514036714, 0.49318065170136116]); // (l/2){Cos[θ1/2], Sin[θ1/2]}
    near(g.theta2Label.at, [-0.7449695293741492, -0.7825861325322128]);
    expect(g.theta1Label.visible).toBe(true);
    expect(g.theta2Label.visible).toBe(true);
    expect(g.robotArm.link).toBe(2);
    near(g.robotArm.anchor, [-0.4458172417006344, -0.32469946920468423]);
    expect(g.robotArm.angle).toBe(6.779226252483239);
    expect(g.robotArm.about).toEqual(g.elbow);
    // 'link2' ignores r2: a short link 2 still carries the label
    expect(armGeometry({ r1: 1.5, r2: 0.5, theta1: 0, theta2: 0, robotArmLabel: 'link2' }).robotArm.link).toBe(2);
  });
  it('the two stadiums: Rectangle corners before Rotate, RoundingRadius w, rotated centre lines', () => {
    const w = 1 / 8;
    const g = armGeometry({ r1: 1.5, r2: 0.5, theta1: Math.PI / 2, theta2: -Math.PI / 2, w });
    expect(g.link1.rect).toEqual([[-w, -w], [1.5 + w, w]]);
    expect(g.link1.radius).toBe(w);
    expect(g.link1.angle).toBe(Math.PI / 2);
    expect(g.link1.about).toEqual([0, 0]);
    close(g.link1.to, [0, 1.5]);
    const [ex, ey] = [1.5 * Math.cos(Math.PI / 2), 1.5 * Math.sin(Math.PI / 2)];
    expect(g.elbow).toEqual([ex, ey]);
    expect(g.link2.rect).toEqual([[ex - w, ey - w], [ex + 0.5 + w, ey + w]]);
    expect(g.link2.angle).toBe(0); // θ1 + θ2
    expect(g.link2.about).toEqual([ex, ey]);
    close(g.link2.to, [0.5, 1.5]);
    close(g.tip, tipPosition(1.5, 0.5, Math.PI / 2, -Math.PI / 2));
  });
  it('distance-norms initial arm (θ1 = 0, θ2 = π/2): theta2 label at (1.3536, 0.3536), Robot Arm at (1.5, 0) rotated by π/2 about (1, 0)', () => {
    const g = armGeometry({ r1: 1, r2: 1, theta1: 0, theta2: Math.PI / 2 });
    near(g.theta2Label.at, [1.3535533905932737, 0.35355339059327373], 1);
    expect(g.theta1Label.visible).toBe(false);
    expect(g.theta2Label.visible).toBe(true);
    expect(g.robotArm).toMatchObject({ link: 2, anchor: [1.5, 0], angle: Math.PI / 2, about: [1, 0] });
    close(g.robotArm.at, [1, 0.5]);
  });
  it('rejects an unknown robotArmLabel', () => {
    expect(() => armGeometry({ r1: 1, r2: 1, theta1: 0, theta2: 0, robotArmLabel: 'link1' })).toThrow(RangeError);
  });
});
