// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/packing-spheres-into-a-thin-cylinder.test.js — the model of "Packing Spheres into a Thin Cylinder".
// Expected values: derived by hand (geometry of touching spheres), from the notebook's saved states and snapshots, and
// from the notebook's own sampled plot (tests/golden/…saved-plot.json).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  r, initialState, evaluate, tubeSphereStackParamsFAST, sphereToSphereContacts, centers, compressionCurves,
  BestCompressionPlot, BOUNDS, LEGEND_ICONS,
} from '../../demos/packing-spheres-into-a-thin-cylinder/model.js';
import { flatten } from '../../shared/graphics3d.js';
import { Cases } from '../../shared/graphics.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/packing-spheres-into-a-thin-cylinder.original-states.json', 'utf8'));
const savedPlot = JSON.parse(fs.readFileSync('tests/golden/packing-spheres-into-a-thin-cylinder.saved-plot.json', 'utf8'));
const num = (x) => (x && typeof x === 'object' && 'n' in x ? x.n : x);
const stateOf = (s) => ({ R: num(s.R), θ: num(s['θ']), SphereOpacity: num(s.SphereOpacity), NumSpheres: num(s.NumSpheres) });
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const setup = (R, NumSpheres, θ = 0) => { const w = 2 * R, p = tubeSphereStackParamsFAST(w, r); return { w, p, c: centers({ w, NumSpheres, θ }, p) }; };
const polylines = (k) => (Array.isArray(k[0][0]) ? k : [k]);
const segments = (k) => polylines(k).flatMap((l) => l.slice(1).map((q, i) => [l[i], q]));
const GRID = Array.from({ length: 201 }, (_, i) => 1 + i / 100).concat([2.705, 2.708, 2.7095, 1.924, 2.361]);

describe('packing-spheres-into-a-thin-cylinder model', () => {
  it("the opening state is the notebook's live state, which equals the Manipulate's initial values", () => {
    expect(initialState()).toEqual(stateOf(saved.states[0]));
    expect(initialState()).toEqual(stateOf(saved.specs));
    expect(initialState()).toEqual({ R: 1, θ: 0, SphereOpacity: 0.6, NumSpheres: 8 });
  });

  it('the compression ratios of the snapshots: 1, 0.238794, 0.172977, 0.461848 (the snapshot captions)', () => {
    const want = { 1: 'compression ratio = 1', 2: 'compression ratio = 0.238794', 3: 'compression ratio = 0.172977', 4: 'compression ratio = 0.461848' };
    for (const [k, s] of Object.entries(saved.snapshots)) expect(evaluate(stateOf(s)).view.caption).toBe(want[k]);
    // R = r: the spheres in a line, one diameter apart: z = √((4 − 2)·2)/2 = 1
    expect(tubeSphereStackParamsFAST(2, 1).z).toBe(1);
  });

  it('the structure changes at the critical radii of the Details: 2, 2/√3 + 1, 1 + √2, 1 + √(2 + 2/√5), 3', () => {
    expect(BOUNDS.twistedZigzag / 2).toBe(2);
    expect(BOUNDS.two / 2).toBeCloseTo(2 / Math.sqrt(3) + 1, 14); // three at a time from here
    expect(BOUNDS.twoTwisted / 2).toBeCloseTo(1 + Math.SQRT2, 14); // four at a time
    expect(BOUNDS.threeBack / 2).toBeCloseTo(1 + Math.sqrt(2 + 2 / Math.sqrt(5)), 14); // five at a time
    expect(BOUNDS.threeTwisted / 2).toBe(3);
    const ns = (R) => tubeSphereStackParamsFAST(2 * R, r).numsides;
    expect([1, 1.86, 1.9, 2.1, 2.17, 2.2, 2.3, 2.5, 2.65, 2.705, 2.72, 2.9, 3].map(ns)).toEqual([1, 1, 2, 2, 3, 2, 4, 4, 3, 5, 3, 6, 6]);
    expect(tubeSphereStackParamsFAST(2 * 1.9, r).IsTwist).toBe(true); // the twisted zigzag
    expect(tubeSphereStackParamsFAST(2 * 2.1, r).IsTwist).toBe(false);
  });

  it('the centres of the opening state: eight spheres on the axis, one diameter apart', () => {
    const { view } = evaluate(initialState());
    expect(view.centers.map((q) => q.map((v) => v + 0))).toEqual([1, 3, 5, 7, 9, 11, 13, 15].map((x) => [x, 0, 0])); // + 0: −0 is 0 (Mathematica has no −0)
    expect(view.endC).toBe(16);
  });

  it('the number of spheres: whole levels of numsides (Q-PS-01: 17 gives 20 at R/r = 2.361)', () => {
    expect(setup(1, 17).c).toHaveLength(17); // one per level
    expect(setup(1.924, 17).c).toHaveLength(18); // two per level
    expect(setup(2.361, 17).c).toHaveLength(20); // four per level
    expect(setup(2.708, 8).c).toHaveLength(10); // five per level
    expect(setup(3, 32).c).toHaveLength(36); // six per level
  });

  it('neighbouring spheres never overlap (8 … 32 spheres, R/r from 1 to 3)', () => {
    let worst = Infinity;
    for (const R of GRID) for (const N of [8, 13, 17, 32]) {
      const { c } = setup(R, N);
      for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) worst = Math.min(worst, dist(c[i], c[j]));
    }
    expect(worst).toBeGreaterThan(2 - 1e-9);
  });

  it('every sphere touches the tube: its centre is w/2 − r from the axis', () => {
    for (const R of GRID) {
      const { c } = setup(R, 17, 0.7);
      for (const q of c) expect(Math.hypot(q[1], q[2])).toBeCloseTo(R - r, 12);
    }
  });

  it('the contact lines join touching spheres (2r apart) for every structure but five at a time', () => {
    for (const R of GRID.filter((R) => !(R * 2 > BOUNDS.threeBack && R * 2 <= BOUNDS.five))) {
      for (const N of [8, 17, 32]) {
        const { w, c } = setup(R, N);
        for (const [a, b] of segments(sphereToSphereContacts(w, r, c))) expect(dist(a, b)).toBeCloseTo(2, 9);
      }
    }
  });

  it('five at a time: the levels do not touch (E-PS-01; the formula uses (5 − √5)/32 for (3 − √5)/8)', () => {
    const { w, p, c } = setup(2.708, 17);
    const lengths = segments(sphereToSphereContacts(w, r, c)).map(([a, b]) => dist(a, b));
    expect(Math.min(...lengths)).toBeCloseTo(2.0264, 4); // 0.026 r apart
    // the tight spacing of this arrangement: h² = 4 − (W − 2)²(3 − √5)/8
    const tight = Math.sqrt(4 - (w - 2) ** 2 * (3 - Math.sqrt(5)) / 8) / 10;
    expect(tight).toBeCloseTo(0.169874, 6);
    expect(p.z).toBeCloseTo(0.172977, 6);
  });

  it('the contacts of snapshot 2 (two at a time, twisted): all centres in one line, then six riffled columns', () => {
    const { w, c } = setup(2.361, 17);
    const k = sphereToSphereContacts(w, r, c);
    expect(k).toHaveLength(7);
    expect(k[0]).toEqual(c);
    expect(k[1]).toEqual([c[0], c[3], c[4], c[7], c[8], c[11], c[12], c[15], c[16], c[19]]); // Riffle[c[[1;;-1;;4]], c[[4;;-1;;4]]]
  });

  it('the structure chosen at every slider step is the lowest curve of the plot (R/r 1 … 2.99)', () => {
    for (let k = 0; k < 200; k++) {
      const R = 1 + k / 100;
      const curves = compressionCurves(R).filter((v) => !Number.isNaN(v));
      expect(tubeSphereStackParamsFAST(2 * R, r).z).toBeCloseTo(Math.min(...curves), 12);
    }
  });

  it("the stacking plane angle turns every centre about the tube's axis", () => {
    const a = setup(2.3, 17, 0).c, b = setup(2.3, 17, 0.5).c;
    a.forEach((q, i) => {
      expect(b[i][0]).toBe(q[0]);
      expect(b[i][1]).toBeCloseTo(q[1] * Math.cos(0.5) - q[2] * Math.sin(0.5), 12);
      expect(b[i][2]).toBeCloseTo(q[1] * Math.sin(0.5) + q[2] * Math.cos(0.5), 12);
    });
  });

  it('the sphere–tube contacts end on the tube wall (w/2 from the axis); none at R = r', () => {
    const lines = flatten(evaluate({ R: 2.2, θ: 0.3, SphereOpacity: 0.6, NumSpheres: 12 }).graphics[1]).filter((p) => p.type === 'line' && p.color?.join() === '0,0,0');
    expect(lines).toHaveLength(12);
    for (const l of lines) expect(Math.hypot(l.points[1][1], l.points[1][2])).toBeCloseTo(2.2, 12);
    expect(flatten(evaluate(initialState()).graphics[1]).filter((p) => p.type === 'line' && p.color?.join() === '0,0,0')).toHaveLength(0);
  });

  it('the picture of the opening state: blue contacts, red spheres at the opacity, the tube and two purple rods', () => {
    const prims = flatten(evaluate(initialState()).graphics[1]);
    const spheres = prims.filter((p) => p.type === 'sphere');
    expect(spheres.flatMap((s) => s.centers)).toHaveLength(8);
    expect(spheres[0]).toMatchObject({ radius: 1, color: [1, 0, 0], opacity: 0.6 });
    const cyl = prims.filter((p) => p.type === 'cylinder');
    expect(cyl).toHaveLength(3);
    expect(cyl[0]).toMatchObject({ p1: [0, 0, 0], p2: [18, 0, 0], radius: 1, opacity: 0.3 }); // 2r + endC, w/2
    expect(cyl[1]).toMatchObject({ p1: [-2, 0, 0], p2: [0, 0, 0], color: [0.5, 0, 0.5], opacity: 0.2 });
    expect(cyl[2]).toMatchObject({ p1: [16, 0, 0], p2: [18, 0, 0], color: [0.5, 0, 0.5], opacity: 0.2 });
    expect(prims.find((p) => p.type === 'line')).toMatchObject({ color: [0, 0, 1] });
  });

  it('the caption text: StringForm["compression ratio = ``\\n", z] as the Epilog at {Center, Bottom}, size 20', () => {
    const g = evaluate({ R: 2.361, θ: 0, SphereOpacity: 0.6, NumSpheres: 17 }).graphics[1];
    const ep = g.options.Epilog;
    expect(ep.head).toBe('Inset');
    expect(ep.pos).toEqual(['Center', 'Bottom']);
    expect(ep.graphics.expr.expr).toBe('compression ratio = 0.238794\n');
    expect(g.options).toMatchObject({ Boxed: false, ImageSize: [600, 250] });
  });

  it("the plot's curves lie on the notebook's sampled plot (8 curves, 930 points)", () => {
    expect(savedPlot.curves).toHaveLength(8);
    let n = 0, worst = 0;
    savedPlot.curves.forEach((cv, k) => {
      for (const [x, y] of cv.points) { worst = Math.max(worst, Math.abs(compressionCurves(x)[k] - y)); n++; }
    });
    expect(n).toBe(930);
    expect(worst).toBeLessThan(1e-12);
    // the curves' styles: ColorData[97], the last three dotted (Dashing[{0, Small}])
    expect(savedPlot.curves.map((c) => c.dashing)).toEqual([null, null, null, null, null, '0, Small', '0, Small', '0, Small']);
  });

  it('the plot: eight curves, the twisted ones only where they exist, five legend icons, 600 × 160 at AspectRatio 1/4', () => {
    const g = BestCompressionPlot();
    expect(g.options).toMatchObject({ ImageSize: [600, 160], AspectRatio: 1 / 4 });
    expect(g.options.PlotLegends.items).toHaveLength(5);
    expect(g.options.PlotLegends.position).toEqual([[0.08, 0.51], [0.08, 0.51]]);
    expect(LEGEND_ICONS.map((ic) => Cases(ic.list, 'Disk').length)).toEqual([1, 2, 3, 4, 5]);
    // the twisted zigzag exists only for 2 + √3 ≤ W < 4
    expect(Number.isNaN(compressionCurves(1.8)[5])).toBe(true);
    expect(compressionCurves(1.9)[5]).toBeCloseTo(tubeSphereStackParamsFAST(3.8, r).z, 12);
    expect(Number.isNaN(compressionCurves(2.1)[5])).toBe(true);
    // Max[Re[…], 1/n]: the two-at-a-time curve levels off at 1/4
    expect(compressionCurves(3)[1]).toBe(0.25);
  });

  it('the marker: Line {{1, z}, {w/2r, z}, {w/2r, 0}} and a large point at {w/2r, z}', () => {
    const plot = evaluate({ R: 1.924, θ: 0, SphereOpacity: 0.024, NumSpheres: 17 }).graphics[0];
    const z = tubeSphereStackParamsFAST(2 * 1.924, r).z;
    const marker = plot.list.at(-1);
    expect(Cases(marker, 'Line')[0].pts).toEqual([[1, z], [1.924, z], [1.924, 0]]);
    expect(Cases(marker, 'Point')[0].pts).toEqual([[1.924, z]]);
  });
});

// The switch "errors of the original: kept | corrected" (A-PS-08, shared/errata.js). Expected values from the
// geometry, written here independently of the model: touching spheres are 2r apart; a ring of five on radius ρ turned
// by π/5 per level has neighbours a chord 2ρ sin(π/10) apart sideways.
describe('corrected mode (E-PS)', () => {
  const SOME = GRID.filter((_, i) => i % 5 === 0 || i > 200).concat([2.71, 2.85]); // every structure, 45 radii
  const setupC = (R, NumSpheres) => { const w = 2 * R, p = tubeSphereStackParamsFAST(w, r, true); return { w, p, c: centers({ w, NumSpheres, θ: 0 }, p, true) }; };
  it('kept: errata = "original" gives exactly the result without the variable', () => {
    for (const st of [initialState(), { ...initialState(), R: 2.708, NumSpheres: 17 }]) {
      const plain = evaluate(st), kept = evaluate({ ...st, errata: 'original' });
      expect(kept.view).toEqual(plain.view);
      expect(flatten(kept.graphics[1])).toEqual(flatten(plain.graphics[1]));
    }
  });
  it('E-PS-01: at R/r = 2.708 the corrected rings of five touch (2r apart) and the ratio is 0.169874; the original leaves 0.026 r and shows 0.172977', () => {
    const w = 2 * 2.708, ρ = w / 2 - 1;
    const h = Math.sqrt(4 - (2 * ρ * Math.sin(Math.PI / 10)) ** 2); // level spacing for touching neighbours, by hand
    const p = tubeSphereStackParamsFAST(w, r, true);
    expect(p.numsides).toBe(5);
    expect(p.z).toBeCloseTo(h / 10, 12);
    expect(p.z).toBeCloseTo(0.169874, 6);
    expect(tubeSphereStackParamsFAST(w, r).z).toBeCloseTo(0.172977, 6);
    const { c } = setupC(2.708, 20);
    const lengths = segments(sphereToSphereContacts(w, r, c, true)).map(([a, b]) => dist(a, b));
    expect(lengths.length).toBeGreaterThan(20);
    for (const d of lengths) expect(d).toBeCloseTo(2, 9);
    expect(evaluate({ R: 2.708, θ: 0, SphereOpacity: 0.6, NumSpheres: 20, errata: 'corrected' }).view.caption).toBe('compression ratio = 0.169874');
  });
  it('E-PS-01: five at a time is chosen where its corrected curve is the lowest: to R/r = 2.72283 (the original: 2.70986) and again from 2.8043 to 2.9204', () => {
    const Wc = 2 + Math.sqrt(512 / (23 + 9 * Math.sqrt(5))); // (4 − u(3 − √5)/8)/100 = (4 − u/4)/36 with u = (W − 2)², by hand
    expect(BOUNDS.five / 2).toBeCloseTo(2.70986, 5);
    expect(Wc / 2).toBeCloseTo(2.72283, 5);
    const three = Math.sqrt(4 - (Wc / 2 - 1) ** 2) / 6, five = Math.sqrt(4 - ((3 - Math.sqrt(5)) / 8) * (Wc - 2) ** 2) / 10;
    expect(five).toBeCloseTo(three, 12);
    const sides = (R, corrected) => tubeSphereStackParamsFAST(2 * R, r, corrected).numsides;
    expect([2.70, 2.71, 2.72, 2.73, 2.80, 2.81, 2.85, 2.92, 2.93].map((R) => sides(R, true))).toEqual([3, 5, 5, 3, 6, 5, 5, 5, 6]);
    expect([2.70, 2.71, 2.72, 2.73, 2.80, 2.81, 2.85, 2.92, 2.93].map((R) => sides(R, false))).toEqual([3, 3, 3, 3, 6, 6, 6, 6, 6]);
    expect(sides(Wc / 2 - 1e-9, true)).toBe(5);
    expect(sides(Wc / 2 + 1e-9, true)).toBe(3);
    // at R/r = 2.85, by hand: ρ = 1.85, sideways chord 2ρ sin 18° = 1.14336, level spacing √(4 − 1.14336²) = 1.64095
    const p = tubeSphereStackParamsFAST(5.7, r, true);
    expect([p.z, p.IsTwist, p.Ang2, p.z2]).toEqual([expect.closeTo(0.164095, 6), false, 0, 0]);
    expect(tubeSphereStackParamsFAST(5.7, r).z).toBeCloseTo(0.164814, 6); // the twisted three-at-a-time curve
    // a valid packing there: neighbours in a ring are 2ρ sin 36° = 2.175 > 2 apart
    expect(2 * 1.85 * Math.sin(Math.PI / 5)).toBeGreaterThan(2);
  });
  it('E-PS-01: the corrected structure at every slider step is the lowest corrected curve, only the fifth curve differs, and outside five at a time nothing changes', () => {
    for (let k = 0; k < 200; k++) {
      const R = 1 + k / 100;
      const o = compressionCurves(R), f = compressionCurves(R, true);
      const pc = tubeSphereStackParamsFAST(2 * R, r, true);
      expect(pc.z).toBeCloseTo(Math.min(...f.filter((v) => !Number.isNaN(v))), 12);
      expect([...f.slice(0, 4), ...f.slice(5)]).toEqual([...o.slice(0, 4), ...o.slice(5)]);
      expect(f[4]).toBeLessThanOrEqual(o[4]);
      if (pc.numsides !== 5) expect(pc).toEqual(tubeSphereStackParamsFAST(2 * R, r));
    }
  });
  it('E-PS-02: exactly the chosen number of spheres (17 at R/r = 2.361, where the original draws 20)', () => {
    expect(setup(2.361, 17).c).toHaveLength(20);
    expect(setupC(2.361, 17).c).toHaveLength(17);
    expect(setupC(2.361, 17).c).toEqual(setup(2.361, 17).c.slice(0, 17));
    for (const R of SOME) for (let N = 8; N <= 32; N++) expect(evaluate({ R, θ: 0, SphereOpacity: 0.6, NumSpheres: N, errata: 'corrected' }).view.centers).toHaveLength(N);
  }, 60_000);
  it('E-PS-02: with an incomplete last level the contact lines still join touching spheres, the tube ends at the farthest sphere and the picture is drawn', () => {
    for (const R of SOME) {
      for (let N = 8; N <= 32; N++) {
        const { view, graphics } = evaluate({ R, θ: 0, SphereOpacity: 0.6, NumSpheres: N, errata: 'corrected' });
        expect(view.spheres).toBe(N);
        expect(view.endC).toBeCloseTo(Math.max(...view.centers.map((q) => q[0])) + 1, 12);
        for (const l of polylines(view.contacts)) { expect(l.length).toBeGreaterThan(1); for (const q of l) expect(view.centers).toContain(q); }
        if (N % view.numsides === 0) expect(segments(view.contacts).length).toBe(segments(sphereToSphereContacts(2 * R, r, view.centers, view.numsides === 5)).length);
        for (const [a, b] of segments(view.contacts)) { expect(a && b).toBeTruthy(); expect(dist(a, b)).toBeCloseTo(2, 9); }
        expect(flatten(graphics[1]).length).toBeGreaterThan(N);
      }
    }
  }, 60_000);
});

