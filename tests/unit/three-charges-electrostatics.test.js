// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Whasington Silvestre
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/three-charges-electrostatics.test.js — the model of "Electrostatics of a Linear System of Three Charged
// Particles" against values from outside the port: Coulomb's law by hand, an independent scan of the line for the
// equilibrium, the notebook's saved states and the numbers printed in the four snapshot pictures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, f1t, f2t, fnet, equilibrium, equilibriumLhs, nf, arrows, CHARGES,
} from '../../demos/three-charges-electrostatics/model.js';
import { annotation } from '../../shared/graphics.js';

const golden = JSON.parse(readFileSync(new URL('../golden/three-charges-electrostatics.original-states.json', import.meta.url), 'utf8'));

// the tables printed in the snapshot pictures (docs/original-snapshots/three-charges-electrostatics-k.png), read by eye
const PICTURES = {
  1: { xt: null, eq: null },
  2: { xt: ['9.5000', '−0.0025', '−0.0074', '−0.0099', '0.0005', '0.0015', '0.0020'], eq: null },
  3: { xt: null, eq: ['−4.0000', '−0.1618', '0.1618', '0.0000', '−0.0135', '0.0135', '0.0000'] },
  // the last value is "−0.0000" in the picture: the sign of a rounding residual (K-TA-03), compared without the sign
  4: { xt: ['5.0000', '−0.1366', '0.0142', '−0.1224', '0.0072', '−0.0007', '0.0064'], eq: ['−1.6321', '1.2825', '−1.2825', '0.0000', '−0.0675', '0.0675', '0.0000'] },
};
const unsigned = (s) => s.replace(/^−(0\.0000)$/, '$1');

/** An independent root finder: sign changes of the left side on a fine grid of [−L, L] away from the charges, then
 *  bisection. Returns the sorted roots. */
function scanRoots(q1, q2, x1, x2, L = 2000.000123, n = 40000) { // an L off the round numbers: no grid point on a root
  const g = (x) => equilibriumLhs(x, q1, q2, x1, x2);
  const roots = [];
  let xa = -L, ga = g(xa);
  for (let i = 1; i <= n; i++) {
    const xb = -L + (2 * L * i) / n, gb = g(xb);
    const pole = [x1, x2].some((c) => c >= xa && c <= xb);
    if (!pole && Number.isFinite(ga) && Number.isFinite(gb) && ga * gb < 0) {
      let lo = xa, hi = xb;
      for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (g(lo) * g(m) <= 0) hi = m; else lo = m; }
      roots.push((lo + hi) / 2);
    }
    xa = xb; ga = gb;
  }
  return roots;
}

describe('three-charges-electrostatics model', () => {
  it("the opening state is the notebook's live state and the initial settings", () => {
    const s = initialState();
    for (const [k, v] of Object.entries(golden.states[0])) expect(s[k]).toBe(v);
    for (const [k, v] of Object.entries(golden.specs)) expect(s[k]).toBe(v);
  });

  it('the charge sliders run over −20 … 20 without 0', () => {
    expect(CHARGES).toHaveLength(40);
    expect(CHARGES[0]).toBe(-20);
    expect(CHARGES[19]).toBe(-1);
    expect(CHARGES[20]).toBe(1);
    expect(CHARGES[39]).toBe(20);
    expect(CHARGES).not.toContain(0);
  });

  it("f1t, f2t and fnet follow Coulomb's law (hand values)", () => {
    // q1 = 5 μC at 0, qt = −5 μC at −8: F = k q1 qt / r² = 8.99e9 · 25e−12 / 64 = 0.0035117… N, towards q1 (+x)
    expect(f1t(0, -8, 5, -5)).toBeCloseTo((8.99e9 * 25e-12) / 64, 15);
    // q2 = 5 μC at 5: r = 13
    expect(f2t(5, -8, 5, -5)).toBeCloseTo((8.99e9 * 25e-12) / 169, 15);
    expect(fnet(0, 5, -8, 5, 5, -5)).toBeCloseTo((8.99e9 * 25e-12) * (1 / 64 + 1 / 169), 15);
    // like charges repel: qt = +5 at x = 2 left of nothing but q1 = 5 at 0 → pushed to +x
    expect(f1t(0, 2, 5, 5)).toBeGreaterThan(0);
    expect(f1t(0, -2, 5, 5)).toBeLessThan(0);
  });

  it('the field in MN/C is the force divided by qt in μC', () => {
    // E of q1 = 5 μC at r = 9.5 m: k q / r² = 498.06 N/C = 0.00049806 MN/C
    const E = f1t(0, 9.5, 5, -5) / -5;
    expect(E).toBeCloseTo((8.99e9 * 5e-6) / 9.5 ** 2 / 1e6, 15);
    expect(nf(E)).toBe('0.0005');
  });

  it('the equilibrium agrees with an independent scan of the line', () => {
    const cases = [];
    for (const q1 of [-20, -7, -3, -1, 1, 2, 5, 20]) for (const q2 of [-20, -5, -2, 1, 3, 20]) for (const [x1, x2] of [[0, 5], [-6, -2], [3, -4], [0, -1], [9, 10]]) cases.push([q1, q2, x1, x2]);
    for (const [q1, q2, x1, x2] of cases) {
      const scan = scanRoots(q1, q2, x1, x2);
      const root = equilibrium(q1, q2, x1, x2);
      expect(scan.length, `${[q1, q2, x1, x2]}`).toBeLessThanOrEqual(1); // never more than one real root
      if (scan.length === 0) {
        // no root inside the scanned range: either none at all (±∞) or one farther out than 2000 m (|q1| ≈ |q2|)
        if (root.length) expect(Math.abs(root[0][0])).toBeGreaterThan(2000);
        else expect(root).toEqual([]);
      } else {
        expect(root[0][0]).toBeCloseTo(scan[0], 9);
        expect(Math.abs(equilibriumLhs(root[0][0], q1, q2, x1, x2))).toBeLessThan(1e-9 * Math.max(Math.abs(q1), Math.abs(q2)));
      }
    }
  }, 60000);

  it('opposite equal charges: no finite equilibrium (±∞); x1 == x2: everywhere when q1 + q2 = 0', () => {
    expect(equilibrium(5, -5, 0, 4)).toEqual([]);
    expect(equilibrium(5, -5, 2, 2)).toEqual([[]]);
    expect(equilibrium(5, 3, 2, 2)).toEqual([]);
    expect(equilibrium(5, 5, 0, 4)).toEqual([[2]]);
    const s = { ...initialState(), q1: 5, q2: -5, x1: 2, x2: 2, edata: true };
    expect(evaluate(s).view.eqTable).toEqual([['everywhere', 'm']]);
    expect(evaluate({ ...s, x2: 3 }).view.eqTable).toEqual([['±∞', 'm']]);
    expect(evaluate({ ...s, x2: 3 }).view.equilibriumShown).toBe(false);
  });

  it('nf writes NumberForm[q 1., {8, 4}] as the tables show it', () => {
    expect(nf(9.5)).toBe('9.5000');
    expect(nf(-0.002490304709141274)).toBe('−0.0025');
    expect(nf(0)).toBe('0.0000');
    expect(nf(-0)).toBe('0.0000');
    expect(nf(-1e-17)).toBe('−0.0000');
    expect(nf(1234.56789)).toBe('1234.5679');
    expect(nf(123456.789)).toBe('123456.7900');
    expect(nf(-35960000.5)).toBe('−35960001.0000');
    expect(nf(NaN)).toBe('Indeterminate');
  });

  it("the tables at the four snapshots' settings are those of the snapshot pictures", () => {
    for (const [k, st] of Object.entries(golden.snapshots)) {
      const { view } = evaluate(st);
      const want = PICTURES[k];
      expect(view.xtTable && view.xtTable.map((r) => r[0]), `snapshot ${k}`).toEqual(want.xt);
      expect(view.eqTable && view.eqTable.map((r) => unsigned(r[0])), `snapshot ${k}`).toEqual(want.eq);
      if (want.xt) expect(view.xtTable.map((r) => r[1])).toEqual(['m', 'N', 'N', 'N', 'MN/C', 'MN/C', 'MN/C']);
    }
    // snapshot 3: the orange point at the midpoint −4, drawn; snapshot 4: at −1.6321
    expect(evaluate(golden.snapshots[3]).view.xe).toBeCloseTo(-4, 14);
    expect(evaluate(golden.snapshots[4]).view.xe).toBeCloseTo(-1 / (1 - Math.sqrt(3 / 20)), 13);
    expect(annotation(evaluate(golden.snapshots[3]).graphics.list, 'equilibrium-point').attrs['data-x']).toBeCloseTo(-4, 14);
    expect(annotation(evaluate(golden.snapshots[1]).graphics.list, 'equilibrium-point').attrs['data-x']).toBe(20);
  });

  it('the arrow icons follow the sizes and directions of the original', () => {
    // snapshot 1: both forces on qt point to +x, F1t the larger; the fields at xt point to −x (qt < 0), E1 the larger
    const a1 = arrows(golden.snapshots[1]);
    expect(a1.af1t).toEqual([[-7.25, 4.5], [-5.25, 4.5]]);
    expect(a1.af2t).toEqual([[-4.75, 4.5], [-3.75, 4.5]]);
    expect(a1.ae1).toEqual([[5, 4.5], [3, 4.5]]);
    expect(a1.ae2).toEqual([[6, 4.5], [5, 4.5]]);
    // snapshot 2: both forces to −x, F2t the larger; fields to +x
    const a2 = arrows(golden.snapshots[2]);
    expect(a2.af1t).toEqual([[-5.25, 4.5], [-6.25, 4.5]]);
    expect(a2.af2t).toEqual([[-2.75, 4.5], [-4.75, 4.5]]);
    expect(a2.ae1).toEqual([[4, 4.5], [5, 4.5]]);
    expect(a2.ae2).toEqual([[5, 4.5], [7, 4.5]]);
  });

  it('xt on a charge gives Indeterminate and no icon arrows', () => {
    const s = { ...initialState(), xt: 0, status: true };
    const { view, graphics } = evaluate(s);
    // F2t = k·25e−12/5² = 0.00899 N towards q2; E2 = F2t/qt
    expect(view.xtTable.map((r) => r[0])).toEqual(['0.0000', 'Indeterminate', '0.0090', 'Indeterminate', 'Indeterminate', '−0.0018', 'Indeterminate']);
    expect(view.arrows).toMatchObject({ af1t: null, af2t: null, ae1: null, ae2: null });
    for (const id of ['arrow-f1t', 'arrow-f2t', 'arrow-e1', 'arrow-e2']) expect(annotation(graphics.list, id)).toBeNull();
  });

  it('the plot runs from −10 to xt only, and an unchecked curve is transparent', () => {
    const { graphics } = evaluate({ ...golden.snapshots[3] });
    const force = annotation(graphics.list, 'force-curve'), field = annotation(graphics.list, 'field-curve');
    const xs = (a) => { const pts = a.g.at(-1).pts; return (Array.isArray(pts[0][0]) ? pts.flat() : pts).map((p) => p[0]); };
    expect(Math.min(...xs(force))).toBeCloseTo(-10, 12);
    expect(Math.max(...xs(force))).toBeCloseTo(6.6, 12);
    expect(force.attrs['data-visible']).toBe('true');
    const off = evaluate({ ...golden.snapshots[3], field: false });
    expect(annotation(off.graphics.list, 'field-curve').attrs['data-visible']).toBe('false');
    expect(annotation(off.graphics.list, 'field-curve').g.some((d) => d.dir === 'opacity' && d.value === 0)).toBe(true);
  });
});
