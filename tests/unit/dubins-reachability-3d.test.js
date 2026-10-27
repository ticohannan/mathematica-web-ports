// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/dubins-reachability-3d.test.js — the model of "3D Reachability Set for a Dubins Car": the opening state and
// the initial settings from the notebook, the path formulas checked against the motion they describe (turns of a known
// angle, the boundary lines as limits of the surfaces), the car at progress p, the plot cache and the hidden variables,
// the 2D picture (curves, gray polygons, legend, cars) and the 3D picture (surfaces, mesh lines, plot range, ticks), and
// the notebook's four snapshot settings. Expected values derived by hand or from the motion.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initialState, evaluate, SAVED, PATHS, pathParameters, carPose, dubbins3D, dubbins3Ds, mRS3D, mLS3D, mRL3D, mLR3D,
  mRLR3D, mSL3D, mSR3D, mRS, mLS, mRL, mLR, mRLR, mSL, mSR, drawCar, plotReach2D, plotReach3D, triangularSurface,
  surfaceDivisions, axisTicks, padded, SURFACE_COLORS, THEME_LIGHTING, LEGEND_LABELS, PLOT_RANGE_2D, MESH_LINES,
} from '../../demos/dubins-reachability-3d/model.js';
import { annotation, Cases } from '../../shared/graphics.js';
import { COLOR_DATA_97 } from '../../shared/plot.js';
import { flatten } from '../../shared/graphics3d.js';

const saved = JSON.parse(readFileSync(new URL('../golden/dubins-reachability-3d.original-states.json', import.meta.url), 'utf8'));
const withoutPlot = ({ plotReach, ...rest }) => rest;
const close = (a, b, d = 12) => { expect(a.length).toBe(b.length); a.forEach((x, i) => (Array.isArray(x) ? close(x, b[i], d) : expect(x).toBeCloseTo(b[i], d))); };
const { PI, cos, sin } = Math;
const R = -1, S = 0, L = 1;

describe('dubins-reachability-3d model', () => {
  it("the opening state is the notebook's saved state, which is also the Manipulate's initial values", () => {
    expect(withoutPlot(initialState())).toEqual(withoutPlot(saved.states[0]));
    expect(withoutPlot(saved.specs)).toEqual(withoutPlot(saved.states[0])); // Initial settings = the opening state
    expect(initialState().plotReach).toEqual({ dim: '3D', r: 1.8, t: 10 }); // the plot is computed, not loaded (N-D3-02)
    const s = initialState(); s.τ[0] = 0.9;
    expect(SAVED.τ[0]).toBe(0.5); // a copy each time
  });
  it('a straight path: no turn in dubbins3Ds (τ1 = 0, τ2 = 1) ends at (0, t) heading +y', () => {
    for (const [p1, p3] of [[R, R], [L, L], [R, L], [L, R]]) close(dubbins3Ds(0, 1, 7, 1.3, p1, S, p3), [0, 7, PI / 2], 14);
  });
  it('dubbins3Ds: a quarter turn right ends at (r, r) heading +x; a half turn then straight ends at (2r, −(t − πr))', () => {
    const r = 1.5;
    close(dubbins3Ds(1, 1, (PI / 2) * r, r, R, S, R), [r, r, 0], 14);
    close(dubbins3Ds(1, 1, (PI / 2) * r, r, L, S, L), [-r, r, PI], 14);
    const t = 10, τ1 = (PI * r) / t; // the half circle takes π r of the 10 s
    close(dubbins3Ds(τ1, 1, t, r, R, S, L), [2 * r, -(t - PI * r), -PI / 2], 12);
  });
  it('dubbins3D: three quarter turns L, R, L end at (−3r, 3r) heading −x', () => {
    const r = 2, t = 3 * (PI / 2) * r;
    close(dubbins3D(1 / 3, 2 / 3, t, r, L, R, L), [-3 * r, 3 * r, PI], 12);
    close(dubbins3D(1 / 3, 2 / 3, t, r, R, L, R), [3 * r, 3 * r, 0], 12); // the mirror image
  });
  it('the seven lines are the edges of the surfaces: RS, LS (no last turn), SL, SR (no first turn), RL, LR (no straight part)', () => {
    const t = 10, r = 1.8;
    for (const τ of [0, 0.23, 0.5, 0.81, 1]) {
      close(mRS3D(τ, t, r), dubbins3Ds(τ, 1, t, r, R, S, R), 12);
      close(mRS3D(τ, t, r), dubbins3Ds(τ, 1, t, r, R, S, L), 12);
      close(mLS3D(τ, t, r), dubbins3Ds(τ, 1, t, r, L, S, L), 12);
      close(mSL3D(τ, t, r), dubbins3Ds(0, τ, t, r, L, S, L), 12);
      close(mSR3D(τ, t, r), dubbins3Ds(0, τ, t, r, R, S, R), 12);
      close(mRL3D(τ, t, r), dubbins3Ds(τ, τ, t, r, R, S, L), 12);
      close(mLR3D(τ, t, r), dubbins3Ds(τ, τ, t, r, L, S, R), 12);
      // the 2D lines are their x, y parts
      close(mRS(τ, t, r), mRS3D(τ, t, r).slice(0, 2), 14); close(mLS(τ, t, r), mLS3D(τ, t, r).slice(0, 2), 14);
      close(mRL(τ, t, r), mRL3D(τ, t, r).slice(0, 2), 14); close(mLR(τ, t, r), mLR3D(τ, t, r).slice(0, 2), 14);
      close(mSL(τ, t, r), mSL3D(τ, t, r).slice(0, 2), 14); close(mSR(τ, t, r), mSR3D(τ, t, r).slice(0, 2), 14);
      close(mRLR(τ / 2, t, r), mRLR3D(τ / 2, t, r).slice(0, 2), 14);
    }
  });
  it('RLR and LRL with no net change of θ (middle arc t/2) give the same line, mRLR3D (the Details)', () => {
    const t = 10, r = 1.8;
    for (const a of [0, 0.1, 0.25, 0.4, 0.5]) {
      const q = mRLR3D(a, t, r);
      expect(q[2]).toBe(PI / 2);
      close(dubbins3D(1 / 2 - a, 1 - a, t, r, R, L, R), q, 12); // RLR traced backwards
      close(dubbins3D(a, a + 1 / 2, t, r, L, R, L), q, 12);
    }
  });
  it('pathParameters: the turns of the three segments and the colours ColorData[97] 2, 1, 3, 4, 5, 6', () => {
    expect(PATHS.map((p) => pathParameters(p).slice(0, 3))).toEqual([[R, S, R], [L, S, L], [R, S, L], [L, S, R], [R, L, R], [L, R, L]]);
    expect(PATHS.map((p) => pathParameters(p)[3])).toEqual([2, 1, 3, 4, 5, 6].map((i) => COLOR_DATA_97[i - 1]));
    expect(SURFACE_COLORS).toEqual(PATHS.map((p) => pathParameters(p)[3])); // each path colours its sphere like its surface
  });
  it('carPose: the switching times rescaled to the part driven; at p = 50 of RSR {0.5, 0.75} the car has only turned right', () => {
    const r = 1.8, t = 10, P = pathParameters('RSR');
    close(carPose(0, [0.5, 0.75], t, r, P), [0, 0, PI / 2], 14);
    const a = 5 / r; // 5 s of the right turn
    close(carPose(50, [0.5, 0.75], t, r, P), [r * (1 - cos(a)), r * sin(a), PI / 2 - a], 12);
    close(carPose(100, [0.5, 0.75], t, r, P), dubbins3Ds(0.5, 0.75, t, r, R, S, R), 14);
    // at p = 80: the turn (5 s) and the straight part (2.5 s) done, 0.5 s of the last turn: τ' = {0.5/0.8, 0.75/0.8}
    close(carPose(80, [0.5, 0.75], t, r, P), dubbins3Ds(0.625, 0.9375, 8, r, R, S, R), 12);
    close(carPose(60, [0.2, 0.7], t, r, pathParameters('LRL')), dubbins3D(1 / 3, 1, 6, r, L, R, L), 12);
  });
  it('evaluating the saved state keeps it: no new plot (r = rold, t = told, dim = dimold), the sphere at the end of RSR', () => {
    const { state, view, graphics } = evaluate(initialState());
    expect(state).toEqual(initialState());
    expect(view.recomputed).toBe(false);
    close(view.sphere.center, dubbins3Ds(0.5, 0.75, 10, 1.8, R, S, R), 14);
    expect(view.sphere.radius).toBe(0.5); // 0.05 t
    expect(graphics[1]).toBe(null); // no 2D picture in 3D
    expect(graphics[0].options.ImageSize).toEqual([450, 450]);
  });
  it('the hidden variables: a new r recomputes the plot and sets rold, except while a slider is dragged (ControlActive)', () => {
    const dragged = evaluate({ ...initialState(), r: 2.5 }, { controlActive: true });
    expect(dragged.view.recomputed).toBe(true);
    expect(dragged.state.rold).toBe(1.8);
    expect(dragged.state.plotReach).toEqual({ dim: '3D', r: 2.5, t: 10 });
    const again = evaluate(dragged.state, { controlActive: true }); // still r != rold: computed at every step of the drag
    expect(again.view.recomputed).toBe(true);
    const released = evaluate(again.state, { controlActive: false });
    expect(released.view.recomputed).toBe(true);
    expect(released.state).toMatchObject({ r: 2.5, rold: 2.5, told: 10, dimold: '3D' });
    expect(evaluate(released.state).view.recomputed).toBe(false);
    const flat = evaluate({ ...released.state, dim: '2D' }); // the dimension changed: the 2D plot
    expect(flat.view.recomputed).toBe(true);
    expect(flat.state).toMatchObject({ dimold: '2D', plotReach: { dim: '2D', r: 2.5, t: 10 } });
  });
  it('the 3D plot range: PlotRange -> All of curves, surfaces and sphere, padded by Scaled[0.05]', () => {
    const t = 10, r = 1.8, { view } = evaluate(initialState());
    const [[x0, x1], [y0, y1], [z0, z1]] = view.bounds;
    expect(z0).toBeCloseTo(PI / 2 - t / r, 12); // θ from −t/r (all right) to t/r (all left) about π/2
    expect(z1).toBeCloseTo(PI / 2 + t / r, 12);
    expect(y1).toBeCloseTo(t, 12); // straight ahead
    expect(x0).toBeCloseTo(-x1, 12); // the set is symmetric in x
    expect(y0).toBeLessThan(-4);
    // the sphere (radius 0.05 t at the end of RSR, y = −3.87) reaches below the surfaces: PlotRange -> All includes it
    const yLow = view.sphere.center[1] - view.sphere.radius;
    expect(yLow).toBeLessThan(y0);
    close(view.PlotRange, padded([[x0, x1], [yLow, y1], [z0, z1]]), 14);
    expect(view.PlotRange[2][0]).toBeCloseTo(z0 - 0.05 * (z1 - z0), 12);
  });
  it("axisTicks: the snapshots' major ticks (step 5 for ranges from 12 to 21), minor ticks every 1", () => {
    const majors = (box) => axisTicks(box).filter(([, l]) => l !== '').map(([v]) => v);
    const { view } = evaluate(initialState()); // snapshot 1
    expect(view.PlotRange.map(majors)).toEqual([[-5, 0, 5], [-5, 0, 5, 10], [0, 5]]);
    expect(axisTicks(view.PlotRange[2]).filter(([v]) => v > 0 && v < 5).map(([v, l, len]) => [v, l, len])).toEqual([[1, '', 0.018], [2, '', 0.018], [3, '', 0.018], [4, '', 0.018]]);
    const s3 = evaluate({ ...initialState(), r: 1.04, rold: 1.04, path: 'LSL', τ: [0.37, 0.86] }).view; // snapshot 3
    expect(s3.PlotRange.map(majors)).toEqual([[-10, -5, 0, 5, 10], [-5, 0, 5, 10], [-5, 0, 5, 10]]);
    expect(axisTicks([0, 1]).filter(([, l]) => l !== '').map(([, l]) => l)).toEqual(['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
  });
  it('triangularSurface: a grid of τ1 ≤ τ2, quads and diagonal triangles, 15 + 15 mesh lines at k/16 on grid lines', () => {
    const f = (a, b) => [a, b, a * b];
    const n = 32;
    const [[, , gc], [gray, mesh]] = triangularSurface(f, n, [1, 0, 0]);
    expect(gc.points.length).toBe(((n + 1) * (n + 2)) / 2);
    expect(gc.content.points.length).toBe((n * (n + 1)) / 2);
    expect(gc.content.points.filter((p) => p.length === 3).length).toBe(n); // the triangles at τ1 = τ2
    expect(gc.points.every(([a, b]) => a <= b)).toBe(true);
    expect(gray.value).toEqual([0.2, 0.2, 0.2]);
    expect(mesh.length).toBe(2 * MESH_LINES);
    const u3 = mesh[4].points, v3 = mesh[5].points; // k = 3
    expect(u3[0]).toEqual(f(3 / 16, 3 / 16)); expect(u3.at(-1)).toEqual(f(3 / 16, 1)); // τ1 = 3/16, τ2 from τ1 to 1
    expect(v3[0]).toEqual(f(0, 3 / 16)); expect(v3.at(-1)).toEqual(f(3 / 16, 3 / 16)); // τ2 = 3/16, τ1 from 0 to τ2
    expect(u3.every(([a]) => a === 3 / 16) && v3.every(([, b]) => b === 3 / 16)).toBe(true);
  });
  it('surfaceDivisions: multiples of 16, finer for larger turning angles t/r', () => {
    expect(surfaceDivisions(10, 1.8)).toBe(64);
    expect(surfaceDivisions(10, 1.04)).toBe(64);
    expect(surfaceDivisions(14, 0.5)).toBe(128);
    expect(surfaceDivisions(0.1, 10)).toBe(64);
  });
  it('plotReach3D: seven curves in ColorData[97] 1–7, six surfaces in the theme colours, their mesh lines', () => {
    const p = plotReach3D(10, 1.8);
    const prims = flatten(p.content);
    const curves = prims.filter((q) => q.type === 'parametricCurve');
    expect(curves.map((q) => q.color)).toEqual(COLOR_DATA_97.slice(0, 7));
    expect(curves.every((q) => q.thickness === 'Large')).toBe(true);
    close(curves[4].f(1), mRLR3D(1 / 2, 10, 1.8), 14); // mRLR3D[τ/2, t, r]
    const meshes = prims.filter((q) => q.type === 'mesh');
    expect(meshes.map((q) => q.color)).toEqual(SURFACE_COLORS);
    expect(meshes.every((q) => q.edgeForm === 'None')).toBe(true);
    close(meshes[4].points.at(-1), dubbins3D(1 / 2, 1, 10, 1.8, R, L, R), 14); // RLR at τ1 = τ2 = 1
    expect(prims.filter((q) => q.type === 'line').length).toBe(6 * 2 * MESH_LINES);
  });
  it('THEME_LIGHTING: directional lights k × the surface colour, white highlights of exponent 3 or 6', () => {
    const k = [0.3, 0.42, 0.25, 0.25, 0.5, 0.25];
    THEME_LIGHTING.forEach((L3, i) => {
      close(L3.directional[0], SURFACE_COLORS[i].map((c) => k[i] * c), 7);
      close(L3.directional[2], L3.directional[0], 14);
      expect(L3.specularity).toBe(i < 3 ? 3 : 6);
    });
    expect(THEME_LIGHTING[4].directional[1]).toEqual([0.2, 0, 1]); // Hue[0.7, 1, 1]
  });
  it('the 2D picture: seven curves and the legend, two gray polygons of 153 points (polySteps 0.02 for t = 10)', () => {
    const g = plotReach2D(10, 1.8);
    expect(g.options.PlotLegends.items.map((it) => it.label)).toEqual(LEGEND_LABELS);
    expect(g.options.PlotLegends.items.map((it) => it.color)).toEqual(COLOR_DATA_97.slice(0, 7));
    expect(Cases(g.list, (q) => q.head === 'Line').length).toBe(7);
    const p1 = annotation(g.list, 'reach-polygon-1').g, p2 = annotation(g.list, 'reach-polygon-2').g;
    expect(p1.pts.length).toBe(153); // as the notebook's saved 2D plot
    expect(p2.pts.length).toBe(153);
    close(p1.pts[50], [0, 10], 12); close(p1.pts[0], mLS(1, 10, 1.8), 14); close(p1.pts.at(-1), mRL(1, 10, 1.8), 12);
    close(p2.pts.at(-1), mLR(0, 10, 1.8), 14); // mLR backwards
    expect(annotation(plotReach2D(5, 1.8).list, 'reach-polygon-1').g.pts.length).toBe(63); // polySteps 0.05
  });
  it('drawCar: Translate[Rotate[Translate[{…}, {0.7, 0}], θ, {0, 0}], xy]; headlights only with lights; front tyres turned for α ≠ 0', () => {
    const [op, , outer] = drawCar([2, 3], 0.4, 1, 0.8, 0.5, true);
    expect(op.value).toBe(0.8);
    expect(outer.head).toBe('Translate'); expect(outer.v).toEqual([2, 3]);
    expect(outer.g.head).toBe('Rotate'); expect(outer.g.angle).toBe(0.4); expect(outer.g.about).toEqual([0, 0]);
    const inner = outer.g.g;
    expect(inner.v).toEqual([0.7, 0]);
    const parts = inner.g;
    expect(Cases(parts, (q) => q.head === 'Polygon').length).toBe(2); // the two beams
    const tyres = parts.filter((q) => q && q.head === 'Rotate');
    expect(tyres.map((q) => q.angle)).toEqual([Math.atan2(1.4, 1 - 0.375), Math.atan2(1.4, 1 + 0.375)]);
    const plain = drawCar([0, 0], PI / 2, 0, 0.5, 0.5, false)[2].g.g.g;
    expect(Cases(plain, (q) => q.head === 'Polygon').length).toBe(0);
    expect(plain.filter((q) => q && q.head === 'Rotate').map((q) => q.angle)).toEqual([0, 0]);
  });
  it('the 2D body: the path of 101 points to the car, the car at the end of the path heading θ, steering the last turn', () => {
    const s = { ...initialState(), dim: '2D', path: 'RSL', τ: [0.17, 0.52] }; // snapshot 2
    const { view, graphics } = evaluate(s);
    expect(graphics[0]).toBe(null);
    const g = graphics[1];
    expect(g.options.PlotRange).toEqual(PLOT_RANGE_2D);
    expect(g.options.AxesOrigin).toEqual([0, 0]);
    expect(g.options.ImageSize).toBe(440);
    expect(view.pathPoints.length).toBe(101);
    close(view.pathPoints[0], [0, 0], 14);
    close(view.pathPoints[100], view.car.xy, 14);
    // RSL {0.17, 0.52}: right 1.7 s, straight 3.5 s, left 4.8 s: θ = π/2 − 1.7/1.8 + 4.8/1.8
    expect(view.car.Theta).toBeCloseTo(PI / 2 + (4.8 - 1.7) / 1.8, 12);
    expect(view.car.Alpha).toBe(L);
    expect(view.car.xy[0]).toBeCloseTo(2.25, 2); expect(view.car.xy[1]).toBeCloseTo(6.75, 2); // where snapshot 2 shows it
    for (const id of ['turning-circles', 'path', 'start-car', 'car', 'reach-polygon-1', 'reach-polygon-2']) expect(annotation(g.list, id)).toBeTruthy();
    const circles = Cases(annotation(g.list, 'turning-circles').g, (q) => q.head === 'Circle');
    expect(circles.map((c) => [c.c, c.r])).toEqual([[[1.8, 0], 1.8], [[-1.8, 0], 1.8]]);
  });
  it("the notebook's four snapshot settings evaluate: 3D RSR, 2D RSL, 3D LSL with r = 1.04, 2D LRL", () => {
    const views = Object.values(saved.snapshots).map((snap) => evaluate(withoutPlot({ ...initialState(), ...snap })));
    expect(views.map((v) => v.view.dim)).toEqual(['3D', '2D', '3D', '2D']);
    expect(views.map((v) => v.view.recomputed)).toEqual([false, false, false, false]); // each snapshot saved its plot
    // snapshot 3: LSL {0.37, 0.86}: left 3.7 s, straight 4.9 s, left 1.4 s: θ = π/2 + 5.1/1.04, the sphere blue
    expect(views[2].view.sphere.center[2]).toBeCloseTo(PI / 2 + 5.1 / 1.04, 12);
    expect(views[2].view.clr).toEqual(COLOR_DATA_97[0]);
    expect(views[2].view.divisions).toBe(64);
    // snapshot 4: LRL {0.5, 0.75}: left 5 s, right 2.5 s, left 2.5 s: heading π/2 + 5/1.8, down and to the left
    expect(views[3].view.car.Theta).toBeCloseTo(PI / 2 + 5 / 1.8, 12);
    expect(views[3].view.car.xy[0]).toBeCloseTo(-7.50, 2); expect(views[3].view.car.xy[1]).toBeCloseTo(-1.62, 2); // as snapshot 4
    expect(views[3].view.clr).toEqual(COLOR_DATA_97[5]);
  });
});
