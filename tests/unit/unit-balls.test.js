// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/unit-balls.test.js — model of the unit-ball Demonstration (expected values derived by hand from the
// original's formulas, R-16).
import { describe, it, expect } from 'vitest';
import {
  myNorm, myNorm2, finiteBranch, distance2D, inRegion3D, plotPoints3D, pNumber, pDisplay, pText, parseP, plotLabelText,
  setterSelection, sliderPosition, SETTER_VALUES, SLIDER, INITIAL, unitBallSurface, heightField, meshLines, meshValues3D,
  plotRange2D, plotRange3D, padded, PADDING, PLOT_RANGE_2D_Z_MEASURED, plotRangeZ2DRule, gridCoords,
} from '../../demos/unit-balls/norms.js';

const vertices = (positions) => {
  const out = [];
  for (let i = 0; i < positions.length; i += 3) out.push([positions[i], positions[i + 1], positions[i + 2]]);
  return out;
};
const triangles = (positions) => {
  const v = vertices(positions);
  const out = [];
  for (let i = 0; i < v.length; i += 3) out.push([v[i], v[i + 1], v[i + 2]]);
  return out;
};

describe('unit-balls norm functions', () => {
  it('myNorm and myNorm2 by hand', () => {
    expect(myNorm([3, 4, 0], 2)).toBeCloseTo(5, 14); // Pythagoras
    expect(myNorm([1, -2, 2], 2)).toBeCloseTo(3, 14);
    expect(myNorm([1, 1, 1], 1)).toBe(3); // |x| + |y| + |z|
    expect(myNorm([-0.5, 0.25, 0.25], 1)).toBe(1);
    expect(myNorm([1, 1, 0], 0.5)).toBeCloseTo(4, 13); // (1 + 1)^2
    expect(myNorm([0.25, 0.25, 0.25], 0.5)).toBeCloseTo(2.25, 13); // (3 · 0.5)^2
    expect(myNorm2([3, -4], 2)).toBeCloseTo(5, 14);
    expect(myNorm2([1, 1], 0.25)).toBeCloseTo(16, 12); // (1 + 1)^4
    expect(myNorm2([0.25, 0.25], 0.5)).toBeCloseTo(1, 14); // (0.5 + 0.5)^2: on the unit ball
    expect(myNorm2([1.5, 1.5], 0.5)).toBeCloseTo(6, 13); // the 2D corner for p = 1/2: 4 · 1.5
  });

  it('the infinity branch: p < 100 is false only for Infinity (and typed p >= 100)', () => {
    expect(finiteBranch('Infinity')).toBe(false);
    for (const p of ['1/4', '1/2', '1', '16', 0.1, 16, 99.99]) expect(finiteBranch(p), String(p)).toBe(true);
    expect(finiteBranch(100)).toBe(false);
    expect(finiteBranch('100')).toBe(false);
    // Max[Abs[x], Abs[y]] and the cube -1 <= x, y, z <= 1
    expect(distance2D(1.5, -0.5, 'Infinity')).toBe(1.5);
    expect(distance2D(-0.2, 0.7, 'Infinity')).toBe(0.7);
    expect(distance2D(3, 4, '2')).toBeCloseTo(5, 14);
    expect(inRegion3D(1, -1, 1, 'Infinity')).toBe(true);
    expect(inRegion3D(1.01, 0, 0, 'Infinity')).toBe(false);
    expect(inRegion3D(0.5, 0.5, 0, '1')).toBe(true); // |x| + |y| + |z| = 1: on the boundary, <= 1
    expect(inRegion3D(0.5, 0.5, 0.01, '1')).toBe(false);
  });

  it('PlotPoints: 25 for p < 100, 23 for infinity', () => {
    expect(plotPoints3D(0.5)).toBe(25);
    expect(plotPoints3D('16')).toBe(25);
    expect(plotPoints3D('Infinity')).toBe(23);
  });
});

describe('unit-balls values of p', () => {
  it('p values display as in Mathematica', () => {
    expect(pDisplay('1/4')).toEqual({ kind: 'fraction', num: '1', den: '4' });
    expect(pText('1/2')).toBe('1/2');
    expect(pText(0.5)).toBe('0.5'); // machine real
    expect(pText(2)).toBe('2.'); // machine real from the slider: "2."
    expect(pText('2')).toBe('2'); // exact integer from the setter
    expect(pText(15.99)).toBe('15.99');
    expect(pText('Infinity')).toBe('∞');
    expect(plotLabelText(0.5)).toBe('0.5‐norm');
    expect(plotLabelText('Infinity')).toBe('∞‐norm');
    expect(pNumber('1/4')).toBe(0.25);
    expect(pNumber('Infinity')).toBe(Infinity);
  });

  it('parseP reads typed values as Mathematica would', () => {
    expect(parseP('2')).toBe('2');
    expect(parseP('2.')).toBe(2);
    expect(parseP('0.25')).toBe(0.25);
    expect(parseP(' 2/8 ')).toBe('1/4');
    expect(parseP('4/2')).toBe('2');
    expect(parseP('∞')).toBe('Infinity');
    expect(parseP('Infinity')).toBe('Infinity');
    // Mathematica's scientific notation is m*^k (exact for an integer m); 1e1 is 1 times the symbol e1
    expect(parseP('1*^1')).toBe('10');
    expect(parseP('5*^-1')).toBe('1/2');
    expect(parseP('2.5*^-1')).toBe(0.25);
    expect(parseP('1.*^1')).toBe(10);
    for (const bad of ['1e1', '2.5e0', '0', '0.0', '-1', 'abc', '', '1/0', '0/3', 'x^2']) expect(parseP(bad), bad).toBe(null);
    // too small to draw (the 2D corner height 1.5 · 2^(1/p) would pass 10^30): refused (K-UB-06)
    expect(parseP('0.01')).toBe(null);
    expect(parseP('0.0102')).toBe(0.0102);
    expect(parseP('1/100')).toBe(null);
  });

  it('setter selection compares numerically: 0.5 selects 1/2', () => {
    expect(setterSelection(0.5)).toBe('1/2');
    expect(setterSelection('1/2')).toBe('1/2');
    expect(setterSelection(2)).toBe('2');
    expect(setterSelection(0.25)).toBe('1/4');
    expect(setterSelection('Infinity')).toBe('Infinity');
    expect(setterSelection(2.5)).toBe(null);
    expect(setterSelection(16.01)).toBe(null);
    expect(SETTER_VALUES).toEqual(['1/4', '1/2', '1', '2', '3', '4', '9', '16', 'Infinity']);
  });

  it('slider thumb: infinity at the left end', () => {
    expect(SLIDER).toEqual({ min: 0.1, max: 16, step: 0.01 });
    expect(sliderPosition('Infinity')).toBe(0.1);
    expect(sliderPosition('1/4')).toBe(0.25);
    expect(sliderPosition(0.5)).toBe(0.5);
    expect(sliderPosition(50)).toBe(16);
    expect(INITIAL).toEqual({ dimension: '3D', p: 0.5 });
  });
});

describe('unit-balls 3D surface', () => {
  const PS = ['1/4', '1/2', '1', '2', '3', '4', '9', '16', 0.1, 0.37, 0.5, 1.5, 2.75, 7.33, 16];
  it('unit-ball vertices satisfy norm 1 within 1e-12 for the setter values and slider values', () => {
    for (const p of PS) {
      const { positions } = unitBallSurface(p);
      let worst = 0;
      for (const v of vertices(positions)) worst = Math.max(worst, Math.abs(myNorm(v, pNumber(p)) - 1));
      expect(worst, String(p)).toBeLessThan(1e-12);
    }
  });

  it('the unit ball for p = 1 is the octahedron with planar faces', () => {
    const { positions, normals } = unitBallSurface('1');
    const tris = triangles(positions);
    for (const t of tris) {
      // all three corners lie on ONE face |x| + |y| + |z| = 1 of one octant (no coordinate changes sign)
      for (let d = 0; d < 3; d++) {
        const s = t.map((v) => Math.sign(v[d])).filter((x) => x !== 0);
        expect(new Set(s).size).toBeLessThanOrEqual(1);
      }
    }
    // every vertex normal is a face normal (±1, ±1, ±1)/√3
    for (const n of vertices(normals)) for (const c of n) expect(Math.abs(Math.abs(c) - 1 / Math.sqrt(3))).toBeLessThan(1e-12);
    // the six corners (±1, 0, 0), (0, ±1, 0), (0, 0, ±1) are vertices
    const key = (v) => v.map((x) => Math.round(x * 1e9) / 1e9 + 0).join(',');
    const keys = new Set(vertices(positions).map(key));
    for (const c of ['1,0,0', '-1,0,0', '0,1,0', '0,-1,0', '0,0,1', '0,0,-1']) expect(keys.has(c), c).toBe(true);
  });

  it('the unit ball for infinity is the cube', () => {
    const { positions, normals } = unitBallSurface('Infinity');
    for (const v of vertices(positions)) expect(Math.max(...v.map(Math.abs))).toBe(1);
    const keys = new Set(vertices(positions).map((v) => v.join(',')));
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) expect(keys.has(`${x},${y},${z}`)).toBe(true);
    for (const n of vertices(normals)) expect(n.map(Math.abs).sort()).toEqual([0, 0, 1]);
  });

  it('sphere normals are radial for p = 2', () => {
    const { positions, normals } = unitBallSurface('2');
    const P = vertices(positions), N = vertices(normals);
    for (let i = 0; i < P.length; i++) for (let d = 0; d < 3; d++) expect(Math.abs(N[i][d] - P[i][d])).toBeLessThan(1e-12);
  });

  it('the unit-ball mesh is closed and consistently oriented, enclosing the volume of the p-ball', () => {
    // volume of the 3D p-ball = 8 Γ(1 + 1/p)^3 / Γ(1 + 3/p), by hand: p = 1/4: 8 · 24^3 / 12!, p = 1/2: 4/45,
    // p = 1: 4/3 (octahedron), p = 2: 4π/3, ∞: 8 (cube)
    const cases = [['1/4', (8 * 24 ** 3) / 479001600, 0.015], ['1/2', 4 / 45, 0.01], ['1', 4 / 3, 1e-12], ['2', (4 * Math.PI) / 3, 0.01], ['Infinity', 8, 1e-12]];
    const key = (v) => v.map((x) => x + 0).join(',');
    for (const [p, exact, tol] of cases) {
      const tris = triangles(unitBallSurface(p).positions);
      // every edge is used by exactly two triangles, once in each direction: closed and consistently wound
      const directed = new Map();
      for (const t of tris) for (let k = 0; k < 3; k++) {
        const e = `${key(t[k])}>${key(t[(k + 1) % 3])}`;
        directed.set(e, (directed.get(e) ?? 0) + 1);
      }
      for (const [e, n] of directed) {
        expect(n, `${p}: ${e}`).toBe(1);
        const [a, b] = e.split('>');
        expect(directed.get(`${b}>${a}`), `${p}: reverse of ${e}`).toBe(1);
      }
      // signed volume (divergence theorem) is positive (outward) and close to the p-ball's
      let vol = 0;
      for (const [a, b, c] of tris) vol += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
      vol /= 6;
      expect(Math.abs(vol / exact - 1), String(p)).toBeLessThan(tol);
    }
  }, 60_000);

  it('mesh values are the multiples of 1/8 in the plot range', () => {
    const all = [-1, -0.875, -0.75, -0.625, -0.5, -0.375, -0.25, -0.125, 0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
    expect(meshValues3D(0.5)).toEqual(all);
    expect(meshValues3D('1')).toEqual(all);
    expect(meshValues3D('Infinity')).toEqual(all.slice(1, -1)); // not the planes of the cube's faces
  });

  it('mesh lines lie on the surface and in their planes', () => {
    const vals = meshValues3D();
    const { positions } = unitBallSurface('2');
    const seg = meshLines(positions, vals);
    expect(seg.length % 6).toBe(0);
    expect(seg.length / 6).toBeGreaterThan(1000);
    for (let i = 0; i < seg.length; i += 3) {
      const v = [seg[i], seg[i + 1], seg[i + 2]];
      // on a chord of the triangulated sphere: radius within the sagitta of a triangle (< 1 %)
      expect(Math.abs(Math.hypot(...v) - 1)).toBeLessThan(0.01);
    }
    for (let i = 0; i < seg.length; i += 6) {
      // both end points share one coordinate equal to a mesh value (the plane of the line)
      const same = [0, 1, 2].filter((d) => seg[i + d] === seg[i + 3 + d] && vals.includes(seg[i + d]));
      expect(same.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('mesh lines on the cube: 15 lines per direction on a face, none along its edges', () => {
    const { positions } = unitBallSurface('Infinity');
    const seg = meshLines(positions, meshValues3D('Infinity'));
    const ys = new Set(), xs = new Set();
    for (let i = 0; i < seg.length; i += 6) {
      const onEdge = [0, 1, 2].filter((d) => Math.abs(seg[i + d]) === 1 && Math.abs(seg[i + 3 + d]) === 1).length >= 2;
      expect(onEdge).toBe(false);
      if (seg[i + 2] !== 1 || seg[i + 5] !== 1) continue; // top face z = 1
      if (seg[i + 1] === seg[i + 4]) ys.add(seg[i + 1]);
      if (seg[i] === seg[i + 3]) xs.add(seg[i]);
    }
    expect([...ys].sort((a, b) => a - b)).toEqual(meshValues3D('Infinity'));
    expect(xs.size).toBe(15);
  });

  it('the octahedron has mesh lines along its edges (planes x, y, z = 0)', () => {
    const { positions } = unitBallSurface('1');
    const seg = meshLines(positions, meshValues3D('1'));
    let onEdge = 0;
    for (let i = 0; i < seg.length; i += 6) {
      // a segment in the plane x = 0 lies on the octahedron's edges |y| + |z| = 1 (the faces meet there)
      if (seg[i] === 0 && seg[i + 3] === 0) {
        expect(Math.abs(seg[i + 1]) + Math.abs(seg[i + 2])).toBeCloseTo(1, 12);
        expect(Math.abs(seg[i + 4]) + Math.abs(seg[i + 5])).toBeCloseTo(1, 12);
        onEdge++;
      }
    }
    expect(onEdge).toBeGreaterThanOrEqual(4 * 24); // the four edges in x = 0, each made of 24 triangle edges
  });
});

describe('unit-balls 2D surface', () => {
  it('height field values', () => {
    const hf2 = heightField('2');
    for (const [x, y, z] of vertices(hf2.positions)) expect(Math.abs(z - Math.hypot(x, y))).toBeLessThan(1e-12);
    expect(hf2.zMin).toBe(0);
    expect(hf2.zMax).toBeCloseTo(1.5 * Math.SQRT2, 14);
    const hf1 = heightField('1');
    for (const [x, y, z] of vertices(hf1.positions)) expect(z).toBeCloseTo(Math.abs(x) + Math.abs(y), 13);
    const hfh = heightField(0.5);
    expect(hfh.zMax).toBeCloseTo(6, 12); // (2 √1.5)^2
    for (const [x, y, z] of vertices(hfh.positions)) if (y === 0) expect(z).toBeCloseTo(Math.abs(x), 14); // on the axes z = |x|
    // the boundary runs once around the domain edge
    expect(hf2.boundary.length).toBe(4 * 120 + 1);
    for (const [x, y] of hf2.boundary) expect(Math.max(Math.abs(x), Math.abs(y))).toBe(1.5);
  });

  it('height field for infinity: creases are triangle edges', () => {
    const { positions, normals } = heightField('Infinity');
    for (const t of triangles(positions)) {
      const onX = t.every(([x, , z]) => Math.abs(z - Math.abs(x)) < 1e-15);
      const onY = t.every(([, y, z]) => Math.abs(z - Math.abs(y)) < 1e-15);
      expect(onX || onY).toBe(true); // each triangle lies in one face of the pyramid z = max(|x|, |y|)
    }
    for (const n of vertices(normals)) expect(Math.abs(n[2] - Math.SQRT1_2)).toBeLessThan(1e-12); // 45° faces
  });

  it('the 2D grid contains the axes and is denser near them for p < 1', () => {
    const c = gridCoords(120, 1.5, 4);
    expect(c[60]).toBe(0);
    expect(c[0]).toBe(-1.5);
    expect(c[120]).toBe(1.5);
    expect(c[61] - c[60]).toBeLessThan(c[120] - c[119]);
    for (let i = 0; i <= 120; i++) expect(c[i]).toBe(-c[120 - i] + 0);
  });

  it('the 2D plot range agrees with the PlotRange measured in Mathematica (K-UB-01)', () => {
    // extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: PlotRange /. AbsoluteOptions[Plot3D[…], PlotRange]
    // (zmin printed as |zmin| < 4e-15, i.e. 0 up to rounding). Independent of the port's code.
    const measured = [
      ['1/4', 5.55e-17, 23.99999657142858], ['1/2', -1.39e-17, 5.999999142857142], ['1', 1.39e-17, 2.9999995714285714],
      ['2', 0, 2.1213200405138792], ['3', 0, 1.8898813048592276], ['4', 0, 1.7838104176739855],
      ['9', 6.94e-18, 1.6200893768970865], ['16', 0, 1.5664104498681675], ['Infinity', 6.94e-18, 1.4999997857142857],
      [0.1, 3.55e-15, 1535.9997805714295], [0.5, -1.39e-17, 5.999999142857142],
    ];
    for (const [p, zmin, zmax] of measured) {
      // the port's own rule (exact corner value): within 2e-7 relative of Mathematica's zmax (whose corner sample
      // lies 10^-6 of a grid step inside the domain: factor 1 − 1.43e-7), and zmin within 1e-14
      const [r0, r1] = plotRangeZ2DRule(p);
      expect(Math.abs(r0 - zmin), String(p)).toBeLessThan(1e-14);
      expect(Math.abs(r1 / zmax - 1), String(p)).toBeLessThan(2e-7);
      expect(r1 / zmax - 1, String(p)).toBeCloseTo(1e-6 / 7, 9);
      // and the range the page uses is the measured one
      const [u0, u1] = plotRange2D(p)[2];
      expect(Math.abs(u0 - zmin), String(p)).toBeLessThan(1e-14);
      expect(u1, String(p)).toBe(zmax);
    }
    expect(Object.keys(PLOT_RANGE_2D_Z_MEASURED).length).toBe(11);
  });

  it('plot range of the 2D mode: full range rule', () => {
    const z = plotRangeZ2DRule; // full range [0, max(1, corner)], corner = 1.5 · 2^(1/p) by hand
    expect(z(0.5)[0]).toBe(0);
    expect(z(0.5)[1]).toBeCloseTo(6, 12);
    expect(z('2')[1]).toBeCloseTo(1.5 * Math.SQRT2, 14);
    expect(z('Infinity')).toEqual([0, 1.5]);
    expect(z('1/4')[1]).toBeCloseTo(24, 11);
    expect(z('16')[1]).toBeCloseTo(1.5 * 2 ** (1 / 16), 14);
    // a p that was not measured uses the rule
    expect(plotRange2D(2.75)[2][1]).toBeCloseTo(1.5 * 2 ** (1 / 2.75), 14);
    expect(plotRange2D('1').slice(0, 2)).toEqual([[-1.5, 1.5], [-1.5, 1.5]]);
    expect(plotRange3D()).toEqual([[-1.1, 1.1], [-1.1, 1.1], [-1.1, 1.1]]);
    expect(PADDING).toBe(0.02);
    expect(padded([0, 6])[0]).toBeCloseTo(-0.12, 14);
    expect(padded([0, 6])[1]).toBeCloseTo(6.12, 14);
  });
});
