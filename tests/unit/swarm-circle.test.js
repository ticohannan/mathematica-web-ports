// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Haoran Zhao and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/swarm-circle.test.js — the model of "Distribution of a Swarm of Robots in a Circular Workplace under
// Gravity": the closed forms against hand-derived values (half disk, full disk, small segments) and against a direct
// integration over the circular segment, the lattice of particles, the five pictures, and the notebook's opening state
// and four snapshot settings.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, Meanx, Meany, VarXh, VarYh, Varx, Vary, Covxy, Corxy, area, swarmPts, swarmPtsS, arrowArc, fmt,
} from '../../demos/swarm-circle/model.js';
import { annotation, Cases, Circle } from '../../shared/graphics.js';

const saved = JSON.parse(readFileSync(new URL('../golden/swarm-circle.original-states.json', import.meta.url), 'utf8'));
const { PI, sqrt, acos, sin, cos } = Math;

/** Moments of the segment {x > 1 − h} of the unit disk by the midpoint rule (independent of the closed forms). */
function segmentMoments(h, n = 20000) {
  let A = 0, Sx = 0, Sxx = 0, Syy = 0;
  const a = 1 - h, dx = (1 - a) / n;
  for (let i = 0; i < n; i++) {
    const x = a + (i + 0.5) * dx, w = sqrt(1 - x * x); // chord half-length at x
    A += 2 * w * dx; Sx += 2 * w * x * dx; Sxx += 2 * w * x * x * dx; Syy += ((2 * w ** 3) / 3) * dx;
  }
  const mx = Sx / A;
  return { A, mx, vx: Sxx / A - mx * mx, vy: Syy / A };
}

describe('swarm-circle model', () => {
  it('the opening state equals the notebook\'s initial settings (β = 4.712, h = 0.66, no particles, no values)', () => {
    expect(initialState()).toEqual(saved.specs);
    expect(saved.states[0]).toEqual(saved.specs);
  });
  it('half disk (h = 1): mean 4/(3π), variances 1/4 − 16/(9π²) and 1/4, area π/2', () => {
    expect(Meanx(0, 1)).toBeCloseTo(4 / (3 * PI), 14);
    expect(Meany(0, 1)).toBeCloseTo(0, 14);
    expect(VarXh(1)).toBeCloseTo(0.25 - 16 / (9 * PI ** 2), 14);
    expect(VarYh(1)).toBeCloseTo(0.25, 14);
    expect(area(1)).toBeCloseTo(PI / 2, 14);
  });
  it('full disk (h = 2): mean 0, both variances 1/4, no covariance, area π', () => {
    expect(Meanx(0.3, 2)).toBeCloseTo(0, 14);
    expect(VarXh(2)).toBeCloseTo(0.25, 14);
    expect(VarYh(2)).toBeCloseTo(0.25, 14);
    expect(Covxy(1, 2)).toBeCloseTo(0, 14);
    expect(area(2)).toBeCloseTo(PI, 14);
  });
  it('the closed forms agree with a direct integration over the segment for several h', () => {
    for (const h of [0.05, 0.3, 0.66, 1.2, 1.731]) {
      const m = segmentMoments(h);
      expect(area(h)).toBeCloseTo(m.A, 6);
      expect(Meanx(0, h)).toBeCloseTo(m.mx, 6);
      expect(VarXh(h)).toBeCloseTo(m.vx, 6);
      expect(VarYh(h)).toBeCloseTo(m.vy, 6);
    }
  });
  it('rotation by β: Varx + Vary is invariant, Covxy = (VarXh − VarYh) cos β sin β, the mean turns with β', () => {
    const h = 0.8;
    for (const b of [0, 0.7, PI / 2, 2.5, 4]) {
      expect(Varx(b, h) + Vary(b, h)).toBeCloseTo(VarXh(h) + VarYh(h), 14);
      expect(Covxy(b, h)).toBeCloseTo(((VarXh(h) - VarYh(h)) * sin(2 * b)) / 2, 14);
      expect(Math.hypot(Meanx(b, h), Meany(b, h))).toBeCloseTo(Meanx(0, h), 14);
    }
    expect(Varx(PI / 2, h)).toBeCloseTo(VarYh(h), 14);
    expect(Corxy(0, h)).toBeCloseTo(0, 15);
  });
  it('the Details\' claims: Varx largest near β = π/2, h ≈ 1.43; covariance largest at β = 3π/4, h ≈ 0.92; |correlation| → 1 for small h', () => {
    let best = [0, 0];
    for (let h = 0.01; h < 2; h += 0.01) if (Varx(PI / 2, h) > best[0]) best = [Varx(PI / 2, h), h];
    expect(best[1]).toBeCloseTo(1.43, 1);
    best = [-1, 0];
    for (let h = 0.01; h < 2; h += 0.01) if (Covxy((3 * PI) / 4, h) > best[0]) best = [Covxy((3 * PI) / 4, h), h];
    expect(best[1]).toBeCloseTo(0.92, 1);
    expect(Math.abs(Corxy(PI / 4, 0.001))).toBeGreaterThan(0.999);
  });
  it('swarmPts: the hexagonal lattice with spacing 1/20 inside the unit disk (41 × 47 candidates)', () => {
    expect(swarmPtsS.length).toBe(41 * 47);
    expect(swarmPtsS[0]).toEqual([-1, (-23 * sqrt(3)) / 2 / 20]); // i = −20, j = −23 (odd: no shift)
    expect(swarmPtsS[1][0]).toBeCloseTo(-0.975, 15); // j = −22 (even: shifted by 1/40)
    expect(swarmPts.every(([x, y]) => x * x + y * y < 1)).toBe(true);
    // about π / (area of a lattice cell (√3/2)/400) points
    expect(swarmPts.length).toBeGreaterThan(0.97 * (PI / (sqrt(3) / 800)));
    expect(swarmPts.length).toBeLessThan(1.03 * (PI / (sqrt(3) / 800)));
  });
  it('arrowArc: the arc and a tiny arrow at its end, tangent to it', () => {
    const [s, arrow] = arrowArc(Circle([0, 0], 1 / 4, [0, PI / 2]));
    expect(s.angles).toEqual([0, PI / 2]);
    const [p, q] = arrow.pts;
    expect(q[0]).toBeCloseTo(0, 15); expect(q[1]).toBeCloseTo(0.25, 15);
    expect(q[0] - p[0]).toBeCloseTo(-0.25e-6, 18); // direction (−sin, cos) at the end: counter-clockwise
  });
  it('the particles: the half-plane test keeps the lattice points beyond the chord; all of them at h = 2', () => {
    const r = evaluate({ β: 0, h: 1, showParticles: true, showStats: false });
    expect(r.view.particles).toBe(swarmPts.filter(([x]) => x > 0).length);
    const pts = annotation(r.graphics[3].list, 'particles').g.pts;
    expect(pts.every(([x]) => x > 0)).toBe(true);
    expect(evaluate({ β: 1, h: 2, showParticles: true, showStats: false }).view.particles).toBe(swarmPts.length);
    expect(annotation(evaluate(initialState()).graphics[3].list, 'particles')).toBeNull();
  });
  it('the workplace picture: disk, rotated robot-free rectangle, obstacle ring, mean circle, mean point and covariance ellipse', () => {
    const s = { β: 0.61, h: 0.664, showParticles: false, showStats: false };
    const { view, graphics } = evaluate(s);
    const g = graphics[3];
    expect(g.options.PlotRange).toEqual([[-7 / 6, 7 / 6], [-7 / 6, 7 / 6]]);
    expect(g.options.ImageSize).toBe(300);
    expect(annotation(g.list, 'robot-free').g.angle).toBe(0.61);
    expect(annotation(g.list, 'robot-free').g.g.b).toEqual([1 - 0.664, 1]);
    expect(annotation(g.list, 'obstacle').g.r).toBe(1.05);
    expect(annotation(g.list, 'mean-path').g.r).toBeCloseTo(Meanx(0, 0.664), 14);
    expect(annotation(g.list, 'mean').g.pts[0]).toEqual(view.mean);
    // Ellipsoid[mean, 4 Σ]: semi-axes 2 √(eigenvalues of Σ)
    const e = annotation(g.list, 'ellipse');
    const disk = e.g.g;
    const lam = [VarXh(0.664), VarYh(0.664)].sort((a, b) => b - a);
    expect(disk.r[0]).toBeCloseTo(2 * sqrt(lam[0]), 12);
    expect(disk.r[1]).toBeCloseTo(2 * sqrt(lam[1]), 12);
    expect(e.style.edge.color).toEqual([1, 0, 0]);
    expect(e.style.opacity).toBe(0);
    expect(annotation(g.list, 'stats')).toBeNull();
    // the β text only for |β| > π/6
    expect(Cases(annotation(g.list, 'gravity').g, 'Text').length).toBe(1);
    expect(Cases(annotation(evaluate({ ...s, β: 0.5 }).graphics[3].list, 'gravity').g, 'Text').length).toBe(0);
  });
  it('the four plots: ranges, π ticks, legends and the current values as Epilog points', () => {
    const s = { β: 1.03, h: 0.222, showParticles: false, showStats: false };
    const { view, graphics } = evaluate(s);
    const [mean, cor, cov, , vari] = graphics;
    expect(mean.options.PlotRange).toEqual([[0, 2 * PI], [-1, 1]]);
    expect(cor.options.PlotRange).toEqual([[0, 2 * PI], [-1.1, 1.1]]);
    expect(cov.options.PlotRange).toEqual([[0, 2 * PI], [-0.1, 0.1]]);
    expect(vari.options.PlotRange).toEqual([[0, 2 * PI], [0, 0.3]]);
    expect(mean.options.ImagePadding).toEqual([[30, 6], [5, 20]]);
    expect(mean.options.ImageSize).toBe(220);
    expect(vari.options.ImageSize).toBe(190); // the legend outside is added to it
    expect(mean.options.PlotLegends.position).toEqual([0.65, 0.85]);
    expect(vari.options.PlotLegends.position).toBe('right');
    expect(mean.options.Ticks[0].map((t) => t[1])).toEqual(['0', 'π/2', 'π', '3π/2', '2π']);
    expect(annotation(mean.list, 'mean-points').g[2].pts[0]).toEqual([1.03, view.mean[0]]);
    expect(annotation(cor.list, 'correlation-point').g[2].pts[0]).toEqual([1.03, Corxy(1.03, 0.222)]);
    expect(annotation(cov.list, 'covariance-point').g[2].pts[0]).toEqual([1.03, view.cov]);
    expect(annotation(vari.list, 'variance-points').g[2].pts[0]).toEqual([1.03, view.varx]);
    // the curve colours: ColorData[97] 1, 2 / 6 / 5 / 3, 4
    const colours = (g) => { const out = []; Cases(g.list, (q, st) => { if (q.head === 'Line') out.push([...st.color]); return false; }); return out; };
    const c97 = [[0.368417, 0.506779, 0.709798], [0.880722, 0.611041, 0.142051], [0.560181, 0.691569, 0.194885],
      [0.922526, 0.385626, 0.209179], [0.528488, 0.470624, 0.701351], [0.772079, 0.431554, 0.102387]];
    expect(colours(mean)).toEqual([c97[0], c97[1]]);
    expect(colours(cor)).toEqual([c97[5]]);
    expect(colours(cov)).toEqual([c97[4]]);
    expect(colours(vari)).toEqual([c97[2], c97[3]]);
  });
  it('the stats text: area, Chop[mean] and Chop[cov] printed with 6 significant digits', () => {
    const r = evaluate({ β: 0.61, h: 0.664, showParticles: false, showStats: true });
    expect(r.view.stats).toEqual(['area=0.911664', 'mean={0.500799, 0.350018}', 'cov=-0.0788929']);
    expect(annotation(r.graphics[3].list, 'stats').g.pos).toEqual([0, 0.5]);
    expect(fmt(0)).toBe('0');
    expect(fmt(2.5)).toBe('2.5');
    expect(fmt(1.234567e-7)).toBe('1.23457×10^-7');
  });
  it('ControlActive: while dragging the plots are sampled from 9 points (fewer than at rest)', () => {
    const s = initialState();
    const rest = evaluate(s, { controlActive: false }).graphics[0];
    const active = evaluate(s, { controlActive: true }).graphics[0];
    const n = (g) => Cases(g.list, 'Line')[0].pts.length;
    expect(n(active)).toBeLessThan(n(rest));
  });
  for (const [k, s] of Object.entries(saved.snapshots)) {
    it(`snapshot ${k} (β = ${s.β}, h = ${s.h}): evaluates; mean on the circle r(h) in direction β; ellipse inside the disk`, () => {
      const { view, graphics } = evaluate(s);
      expect(graphics.length).toBe(5);
      expect(Math.hypot(...view.mean)).toBeCloseTo(view.meanRadius, 9);
      if (view.meanRadius > 1e-6) expect(Math.atan2(view.mean[1], view.mean[0])).toBeCloseTo(Math.atan2(sin(s.β), cos(s.β)), 9);
      expect(Math.abs(view.cor)).toBeLessThanOrEqual(1);
      expect(view.varx).toBeGreaterThan(0); expect(view.vary).toBeGreaterThan(0);
      expect(view.varx + view.vary).toBeLessThanOrEqual(0.5);
      expect(view.area).toBeCloseTo(acos(1 - s.h) - (1 - s.h) * sqrt((2 - s.h) * s.h), 14);
      expect(view.particles).toBe(s.showParticles ? swarmPts.filter(([x, y]) => x * cos(s.β) + y * sin(s.β) > 1 - s.h).length : 0);
    });
  }
});
