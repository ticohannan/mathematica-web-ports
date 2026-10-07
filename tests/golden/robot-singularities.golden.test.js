// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/robot-singularities.golden.test.js — the port against the ORIGINAL notebook's saved state
// (tests/golden/robot-singularities.original-state.json: the Manipulate variables, including the original's own
// singularspace3D and singularphasespace3D graphics for the elbow arm / Linear) and its snapshot pictures.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { initialState, evaluate, selectType } from '../../demos/robot-singularities/model.js';
import { typeOf, makeO3coords, phaseOpt, jacobianFor, myJacob, myJacobAngular } from '../../demos/robot-singularities/robots.js';
import { singularspace3D, singularphasespace3D } from '../../demos/robot-singularities/singular-sets.js';
import { flatten, Graphics3D, RGBColor, Sphere, Line, InfinitePlane, Opacity, Thick, Cuboid, Polygon, Cylinder } from '../../demos/robot-singularities/g3d.js';
import { manipEllip, svd3, matrixRank } from '../../demos/robot-singularities/svd3.js';

const saved = JSON.parse(fs.readFileSync('tests/golden/robot-singularities.original-state.json', 'utf8')).state;
// the 32 Piecewise matrices of the input cell as Wolfram expressions (tests/golden/robot-singularities.jacobians.json)
const jac = JSON.parse(fs.readFileSync('tests/golden/robot-singularities.jacobians.json', 'utf8'));
// snapshot 3's stored singularspace3D (offset spherical wrist): the GraphicsComplex vertices computed by the original
const snap3 = JSON.parse(fs.readFileSync('tests/golden/robot-singularities.snapshot3-vertices.json', 'utf8'));
// owner state 1 (Mathematica 15.0.1, saved 2026-10-06)
const owner = JSON.parse(fs.readFileSync('tests/golden/robot-singularities.owner-state-1.json', 'utf8')).state;

/** Evaluate a Wolfram expression with Sin, Cos, + - * / and implicit products at q = [q1, q2, q3]. */
function evalWl(expr, q) {
  const toks = expr.match(/\d+\.\d*|\.\d+|\d+|[A-Za-z]\w*|[-+*/()[\]]/g);
  if (toks.join('') !== expr.replace(/\s+/g, '')) throw new Error(`cannot tokenise ${expr}`);
  let i = 0;
  const peek = () => toks[i];
  const E = () => { let v = T(); while (peek() === '+' || peek() === '-') { const op = toks[i++]; const w = T(); v = op === '+' ? v + w : v - w; } return v; };
  const T = () => {
    let v = F();
    for (;;) {
      const p = peek();
      if (p === '*' || p === '/') { i++; const w = F(); v = p === '*' ? v * w : v / w; } else if (p !== undefined && (p === '(' || /^[\w.]/.test(p))) v *= F(); else return v;
    }
  };
  const F = () => (peek() === '-' ? (i++, -F()) : A());
  const A = () => {
    const t = toks[i++];
    if (t === '(') { const v = E(); if (toks[i++] !== ')') throw new Error(expr); return v; }
    if (t === 'Sin' || t === 'Cos') { if (toks[i++] !== '[') throw new Error(expr); const v = E(); if (toks[i++] !== ']') throw new Error(expr); return t === 'Sin' ? Math.sin(v) : Math.cos(v); }
    if (/^q[123]$/.test(t)) return q[Number(t[1]) - 1];
    if (/^[\d.]+$/.test(t)) return Number(t);
    throw new Error(`unknown token ${t} in ${expr}`);
  };
  const v = E();
  if (i !== toks.length) throw new Error(`trailing tokens in ${expr}`);
  return v;
}


/** The saved Graphics3D expression (JSON form of the Wolfram expression) -> g3d data, head by head. */
function fromSaved(e) {
  if (Array.isArray(e)) return e.map(fromSaved);
  if (e && e.head) {
    const a = e.args;
    switch (e.head) {
      case 'Graphics3D': return Graphics3D(fromSaved(a[0]), a[1] ? Object.fromEntries(a[1].map((r) => [r.args[0].sym, optValue(r.args[1])])) : {});
      case 'RGBColor': return RGBColor(...a);
      case 'Opacity': return Opacity(a[0]);
      case 'Thickness': if (a[0].sym === 'Large') return Thick; break;
      case 'Sphere': return Sphere(a[0], a[1]);
      case 'Line': return Line(a[0]);
      case 'InfinitePlane': return InfinitePlane(a[0]);
      case 'Cuboid': return Cuboid(a[0], a[1]);
      case 'Polygon': return Polygon(a[0]);
      case 'Cylinder': return Cylinder(a[0], a[1]);
      default: break;
    }
    throw new Error(`unhandled head ${e.head}`);
  }
  return e;
}
function optValue(v) {
  if (Array.isArray(v)) return v.map(optValue);
  if (v && v.head === 'Subscript') return { sym: v.args[0], sub: v.args[1] };
  return v;
}

describe('robot singularities golden (saved state of the original)', () => {
  it('robot singularities: the saved Manipulate variables are the opening state of the port', () => {
    const { state } = evaluate(initialState());
    expect(state.iType).toBe(saved.iType);
    expect(state.params).toEqual(saved.params);
    expect(state.showRobot).toBe(saved.showRobot);
    expect(state.showManipulability).toBe(saved.showManipulability);
    expect(state.isJLinearVel).toBe(saved.isJLinearVel);
    expect(state.iTypeOld).toBe(saved.iTypeOld);
    expect(state.isJLinearVelOld).toBe(saved.isJLinearVelOld);
    expect(saved.dof).toBe(3);
  });
  it('robot singularities: the saved singularspace3D equals the elbow Linear recipe exactly (spheres, radii, line, opacities, colours, thickness)', () => {
    const mine = flatten(singularspace3D(2, 'Linear', makeO3coords(typeOf(2))));
    const orig = flatten(fromSaved(saved.singularspace3D));
    expect(mine).toEqual(orig);
    expect(orig.map((p) => p.type)).toEqual(['sphere', 'line', 'sphere']);
  });
  it('robot singularities: the saved singularphasespace3D equals the elbow Linear phase recipe exactly (6 thick lines, 5 InfinitePlanes at opacity 0.5)', () => {
    const mine = flatten(singularphasespace3D(2, 'Linear', {}));
    const orig = flatten(fromSaved(saved.singularphasespace3D));
    expect(mine).toEqual(orig);
    expect(orig.filter((p) => p.type === 'line')).toHaveLength(6);
    expect(orig.filter((p) => p.type === 'infinitePlane' && p.opacity === 0.5)).toHaveLength(5);
  });
  it('robot singularities: the saved phase-space options equal phaseOpt of the elbow arm with the stale label phase space', () => {
    const o = fromSaved(saved.singularphasespace3D).options;
    const mine = phaseOpt(typeOf(2), 'phase space');
    expect(o.PlotRange).toEqual(mine.PlotRange);
    expect(o.Axes).toBe(mine.Axes);
    expect(o.BoxRatios).toEqual(mine.BoxRatios);
    expect(o.ImageSize).toBe(mine.ImageSize);
    expect(o.AxesLabel).toEqual(mine.AxesLabel.map((l) => ({ sym: l.sym, sub: l.sub })));
    expect(o.PlotLabel).toBe('phase space');
    expect(evaluate(initialState()).view.phaseOpt.PlotLabel).toBe(o.PlotLabel);
  });
  it('robot singularities: snapshot 1 shows the lowercase label phase space at opening, snapshots 2-4 show Phase Space after a recompute', () => {
    expect(evaluate(initialState()).view.phase.options.PlotLabel).toBe('phase space');
    const toScara = evaluate(selectType(evaluate(initialState()).state, 10)).view;
    expect(toScara.phase.options.PlotLabel).toBe('Phase Space');
  });
  it('robot singularities: snapshot 4 (SCARA arm) shows θ1 = 0, θ2 = 0, d3 = 0.5 and phase axes θ1, θ2, d3 with d3 from 0 to 1', () => {
    const { state, view } = evaluate(selectType(evaluate(initialState()).state, 10));
    expect(state.params).toEqual([0, 0, 0.5]);
    expect(view.phaseOpt.AxesLabel.map((l) => l.sym + l.sub)).toEqual(['θ1', 'θ2', 'd3']);
    expect(view.phaseOpt.PlotRange[2]).toEqual([0, 1]);
  });
  it('robot singularities: snapshots 2 and 4 show a flat ellipse (no ellipsoid), snapshot 3 a full ellipsoid', () => {
    const rank = (iType) => {
      const st = { ...selectType(initialState(), iType), showManipulability: true };
      const { state, view } = evaluate(st);
      return manipEllip(jacobianFor(state.iType, 'Linear', state.params), view.o3).rank;
    };
    expect(rank(2)).toBe(2); // elbow at zero (snapshot 2)
    expect(rank(10)).toBe(2); // SCARA at zero, d3 = 0.5 (snapshot 4)
    expect(rank(16)).toBe(3); // offset spherical wrist at zero (snapshot 3)
  });
  it('robot singularities: the 32 Jacobians equal the Piecewise matrices of the input cell (fixture, evaluated independently)', () => {
    expect(jac.myJacob).toHaveLength(16);
    expect(jac.myJacobAngular).toHaveLength(16);
    const configs = [[0, 0, 0], [0.3, -0.7, 0.5], [1.1, 0.4, -2.0], [-2.5, 1.9, 0.8], [3.0, -3.0, 0.05], [0.5, 0.8, 0]];
    for (let t = 1; t <= 16; t++) {
      for (const q of configs) {
        const mine = myJacob(t, ...q), mineA = myJacobAngular(t, ...q);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          expect(mine[r][c], `myJacob ${t} [${r}][${c}]`).toBeCloseTo(evalWl(jac.myJacob[t - 1][r][c], q), 13);
          expect(mineA[r][c], `myJacobAngular ${t} [${r}][${c}]`).toBeCloseTo(evalWl(jac.myJacobAngular[t - 1][r][c], q), 13);
        }
      }
    }
  });
  it('robot singularities: snapshot 3 stored o3coords surfaces of the offset spherical wrist lie on the port surfaces (3837 vertices within 1e-7)', { timeout: 30000 }, () => {
    const surfs = flatten(singularspace3D(16, 'Linear', makeO3coords(typeOf(16)))).filter((p) => p.type === 'parametricSurface');
    expect(surfs).toHaveLength(4);
    expect(snap3.vertices).toHaveLength(3837);
    expect(maxDistanceToSurfaces(snap3.vertices, surfs)).toBeLessThan(1e-7);
  });

  // ---- owner state 1 (Mathematica 15.0.1, saved 2026-10-06): offset PUMA arm, robot and ellipsoid shown ----
  it('robot singularities: owner state 1 joint values are slider values min + k step bit for bit (k = 60, 18, 149)', () => {
    const min = -Math.PI * 1.01, step = 0.01 * Math.PI;
    expect(owner.params).toEqual([60, 18, 149].map((k) => min + k * step));
  });
  it('robot singularities: owner state 1 evaluated by the port keeps its variables (no wrap, no recompute)', () => {
    const st = { iType: owner.iType, params: owner.params, showRobot: owner.showRobot, showManipulability: owner.showManipulability, isJLinearVel: owner.isJLinearVel, iTypeOld: owner.iTypeOld, isJLinearVelOld: owner.isJLinearVelOld, singularLabel: 'Phase Space' };
    const { state, view } = evaluate(st);
    expect(state).toEqual(st);
    expect(view.recomputed).toBe(false);
    expect(view.manip).not.toBe(null);
  });
  it('robot singularities: owner state 1 singularphasespace3D equals the offset PUMA Linear phase recipe exactly, label Phase Space', () => {
    const orig = fromSaved(owner.singularphasespace3D);
    expect(flatten(singularphasespace3D(4, 'Linear', {}))).toEqual(flatten(orig));
    const mine = phaseOpt(typeOf(4));
    expect(orig.options.PlotLabel).toBe('Phase Space');
    expect(orig.options.PlotRange).toEqual(mine.PlotRange);
    expect(orig.options.AxesLabel).toEqual(mine.AxesLabel.map((l) => ({ sym: l.sym, sub: l.sub })));
  });
  it('robot singularities: owner state 1 workspace rings equal the port Table points to 1 ulp (red, thick)', () => {
    // Mathematica's and the browser's Cos/Sin may differ in the last bit: 9 of 243 coordinates differ by 1 ulp
    const savedLines = owner.singularspace3D.args[0][0].filter((e) => e.head === 'Line').map((e) => e.args[0]);
    const mine = flatten(singularspace3D(4, 'Linear', makeO3coords(typeOf(4)))).filter((p) => p.type === 'line');
    expect(mine).toHaveLength(3);
    expect(mine.every((p) => p.thickness === 'Large' && p.color.join() === '1,0,0')).toBe(true);
    mine.forEach((p, i) => {
      expect(p.points).toHaveLength(savedLines[i].length);
      p.points.forEach((q, k) => q.forEach((v, c) => expect(Math.abs(v - savedLines[i][k][c])).toBeLessThanOrEqual(Number.EPSILON)));
    });
  });
  it('robot singularities: owner state 1 stored o3coords surfaces of the offset PUMA arm lie on the port surfaces (2030 vertices within 1e-7)', { timeout: 30000 }, () => {
    const gc = owner.singularspace3D.args[0][1][0];
    expect(gc.head).toBe('GraphicsComplex');
    const surfs = flatten(singularspace3D(4, 'Linear', makeO3coords(typeOf(4)))).filter((p) => p.type === 'parametricSurface');
    expect(surfs.map((p) => p.opacity)).toEqual([0.2, 0.2]);
    expect(gc.args[0]).toHaveLength(2030);
    expect(maxDistanceToSurfaces(gc.args[0], surfs)).toBeLessThan(1e-7);
  });

  // ---- extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06 ----
  it('robot singularities: CNC Jacobian SVD as in Mathematica up to column signs (U = diag(-1,-1,1), V = {{0,0,1},{-1,0,0},{0,-1,0}})', () => {
    const Umma = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], Vmma = [[0, 0, 1], [-1, 0, 0], [0, -1, 0]];
    const d = svd3(myJacob(12, 0.5, 0.5, 0.5));
    expect(d.S).toEqual([1, 1, 1]);
    for (let k = 0; k < 3; k++) {
      const sgn = Math.sign([0, 1, 2].map((i) => d.U[i][k] * Umma[i][k]).reduce((a, b) => a + b));
      for (let i = 0; i < 3; i++) {
        expect(d.U[i][k] * sgn + 0).toBe(Umma[i][k]);
        expect(d.V[i][k] * sgn + 0).toBe(Vmma[i][k]); // the same sign flips U and V together
      }
    }
  });
  it('robot singularities: MatrixRank of DiagonalMatrix {1, 1e-13, 0.5} is 3 and of {1, 1e-17, 0.5} is 2 as in Mathematica', () => {
    expect(matrixRank([1, 1e-13, 0.5])).toBe(3);
    expect(matrixRank([1, 1e-17, 0.5])).toBe(2);
  });
});
/** largest distance from the vertices to the nearest of the parametric surfaces (grid start + damped Gauss-Newton) */
function maxDistanceToSurfaces(vertices, surfs) {
  const N = 73;
  const grids = surfs.map((p) => {
    const pts = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const a = p.u[0] + ((p.u[1] - p.u[0]) * i) / (N - 1), b = p.v[0] + ((p.v[1] - p.v[0]) * j) / (N - 1);
      pts.push([a, b, ...p.f(a, b)]);
    }
    return pts;
  });
  const refine = (k, g, v) => {
    const f = surfs[k].f;
    let [a, b] = g, d = Infinity;
    for (let it = 0; it < 30; it++) {
      const r = f(a, b).map((x, i) => x - v[i]);
      d = Math.hypot(...r);
      if (d < 1e-12) break;
      const h = 1e-7, fa = sub3(f(a + h, b), f(a - h, b)).map((x) => x / (2 * h)), fb = sub3(f(a, b + h), f(a, b - h)).map((x) => x / (2 * h));
      const A11 = dot(fa, fa) + 1e-12, A12 = dot(fa, fb), A22 = dot(fb, fb) + 1e-12, g1 = dot(fa, r), g2 = dot(fb, r);
      const det = A11 * A22 - A12 * A12;
      a -= (A22 * g1 - A12 * g2) / det; b -= (A11 * g2 - A12 * g1) / det;
    }
    return Math.min(d, Math.hypot(...f(a, b).map((x, i) => x - v[i])));
  };
  let worst = 0;
  for (const v of vertices) {
    const near = grids.map((pts, k) => {
      let best = null, bd = Infinity;
      for (const g of pts) { const dd = (g[2] - v[0]) ** 2 + (g[3] - v[1]) ** 2 + (g[4] - v[2]) ** 2; if (dd < bd) { bd = dd; best = g; } }
      return { k, g: best, bd };
    }).sort((x, y) => x.bd - y.bd);
    let d = Infinity;
    for (const n of near) { d = Math.min(d, refine(n.k, n.g, v)); if (d < 1e-9) break; }
    worst = Math.max(worst, d);
  }
  return worst;
}
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
