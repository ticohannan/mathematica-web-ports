// tests/golden/parity.test.js
// PARITY WITH THE ORIGINAL NOTEBOOKS.
// The JSON fixtures in this folder were extracted (tools/extract_golden.py) from
// the cached Manipulate outputs saved inside the original .nb files, i.e. the
// numbers were computed by the original Wolfram Language code. The port must
// reproduce them.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeScene } from '../../demos/motion-planning/planner.js';
import { evaluate } from '../../demos/three-parametrizations/rotations.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const closeDeep = (a, b, tol) => {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => closeDeep(v, b[i], tol));
  return Math.abs(a - b) <= tol;
};

describe('motion planning: port reproduces the original notebook\'s cached results', () => {
  const g = load('motion-planning.original-states.json');
  it('fixture contains the thumbnail + snapshot states', () => expect(g.states.length).toBe(5));
  g.states.forEach((s, i) => {
    describe(`state ${i}: ${s.configOrWork}, boundary ${s.x}, robot ${s.n}`, () => {
      const sc = computeScene({ x: s.x, n: s.n, r1: s.r1, r2: s.r2, o1: s.o1, o2: s.o2, o3: s.o3, o4: s.o4 });
      // Bit-identical: these must equal the original's machine numbers exactly.
      it('obstacle polygons (bit-identical)', () => expect(sc.obstaclepoly).toEqual(s.prevObstaclepoly));
      it('robot polygons (bit-identical)', () => {
        expect(sc.robotStartPoly).toEqual(s.prevRobotStartPoly);
        expect(sc.robotEndPoly).toEqual(s.prevRobotEndPoly);
      });
      it('Minkowski sums (C-obstacles), vertex for vertex, same order (bit-identical)', () =>
        expect(sc.robotobstconfig).toEqual(s.prevRobotobstconfig));
      it('visibility lines from the start (bit-identical)', () => expect(sc.linesStarttoObstacles).toEqual(s.linesStarttoObstacles));
      it('visibility lines from the end (bit-identical)', () => expect(sc.linesEndtoObstacles).toEqual(s.linesEndtoObstacles));
      it('visible bitangent lines between C-obstacles (bit-identical)', () => expect(sc.verticestoVertices).toEqual(s.verticestoVertices));
      // Trajectory: same length; points equal to within 1e-15 (the last bit of some points differs,
      // because the exact internals of Mathematica's Range[0, 1, h] are unknown).
      it('discretised path (robot trajectory)', () => expect(closeDeep(sc.discretePath, s.discretePath, 1e-15)).toBe(true));
    });
  });
});

describe('three parametrizations: conversions match the original\'s saved values', () => {
  const g = load('three-parametrizations.original-states.json');
  g.states.forEach((s, i) => {
    it(`state ${i} (method ${s.typeRot})`, () => {
      const st = { progress: s.progress, typeRot: s.typeRot, phi: s.Phi, theta: s.Theta, psi: s.Psi,
        axis: s.axis, angle: s.angle, alpha: s.Alpha, beta: s.Beta, gamma: s.Gamma };
      const out = evaluate(st).state;
      for (const k of ['phi', 'theta', 'psi', 'angle', 'alpha', 'beta', 'gamma']) expect(out[k]).toBeCloseTo(st[k], 9);
      expect(out.axis[0]).toBeCloseTo(st.axis[0], 9);
      expect(out.axis[1]).toBeCloseTo(st.axis[1], 9);
    });
  });
});

describe('euler angles: snapshot states are the bookmark positions', () => {
  it('the original\'s snapshots are pos0, pos3, pos1, pos2', () => {
    const g = load('euler-angles.original-states.json');
    expect(g.states).toEqual([{ a1: 0, a2: 0, a3: 0 }, { a1: 45, a2: 30, a3: 15 }, { a1: 45, a2: 0, a3: 0 }, { a1: 45, a2: 30, a3: 0 }]);
  });
});
