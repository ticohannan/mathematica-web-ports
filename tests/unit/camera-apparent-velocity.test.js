// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/camera-apparent-velocity.test.js — the model of "Maximizing Apparent Velocity in a Camera's Frame": the
// opening state and initial settings from the notebook, the optimal goal (checked against the geometry it claims: on
// the sphere, the line of sight tangent, the farthest image point of the whole ball), the silhouette ellipse (checked
// against the projected tangent circle), the two coordinate grids at the snapshot settings (the numbers the snapshots
// show), the 3D and 2D pictures, the textured label and the animation step. Expected values derived by hand.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SPECS, initialState, evaluate, settles, computeShortestPt, sphericaldist, imagePlaneCoor, numberForm, drawDrone, drawCamera,
  APERTURE, label, imagePlane, drawThetaPhi, infiniteArrowsPoints, PLOT_RANGE, OPTIONS_3D, LAMBDA,
} from '../../demos/camera-apparent-velocity/model.js';
import { text, label2D, graphics2D, plotRangeAll, draw2Ddrone, IMAGE_SIZE } from '../../demos/camera-apparent-velocity/picture2d.js';
import { flatten, Red } from '../../shared/graphics3d.js';
import { Cases, walk, textOf, htmlOf } from '../../shared/graphics.js';

const saved = JSON.parse(readFileSync(new URL('../golden/camera-apparent-velocity.original-states.json', import.meta.url), 'utf8'));
const deg = (rad) => (rad * 180) / Math.PI;
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = (a) => Math.hypot(...a);
const proj = (p) => [(LAMBDA * p[0]) / p[2], (LAMBDA * p[1]) / p[2]]; // the pinhole camera: λ/z (x, y)
const grid = (rows) => rows.map(([v, w]) => `${textOf(v)}|${textOf(w)}`);
const prims = (g) => flatten(g);
const ofType = (g, t) => prims(g).filter((p) => p.type === t);

describe('camera-apparent-velocity model', () => {
  it("the opening state is the notebook's saved state, which is also the Manipulate's initial settings", () => {
    expect(initialState()).toEqual(saved.states[0]);
    expect(initialState()).toEqual(saved.specs);
    const s = initialState(); s.xc = 7;
    expect(SPECS.xc).toBe(1); // a copy each time
  });
  it('computeShortestPt at the opening state: θ = 45°, ϕ = 3π/2 − arctan(√211/4) − arctan(15/√2) = 110.8°, the goal (3.64, 3.64, 13.58)', () => {
    const [Theta, Phi, x, y, z] = computeShortestPt(1, 1, 15, 4);
    expect(Theta).toBeCloseTo(Math.PI / 4, 15);
    expect(Phi).toBeCloseTo(1.5 * Math.PI - Math.atan(Math.sqrt(211) / 4) - Math.atan(15 / Math.SQRT2), 14);
    expect(deg(Phi)).toBeCloseTo(110.78, 2); // shown as 110.8
    expect(x).toBeCloseTo(1 + 4 * Math.SQRT1_2 * Math.sin(Phi), 14);
    expect(y).toBeCloseTo(x, 14);
    expect(z).toBeCloseTo(15 + 4 * Math.cos(Phi), 14);
    expect(z).toBeCloseTo(13.5807, 4);
  });
  it('the goal is on the sphere and the line of sight to it is tangent (cos ϕ < 0: the drone comes closer), at several settings', () => {
    for (const [xc, yc, zc, r] of [[1, 1, 15, 4], [8, 5, 14, 3.4], [-10, 3, 10, 5], [0, -7, 20, 1], [0, 0, 17, 3], [4, 0, 12, 2.5], [-3, 0, 11, 4.2]]) {
      const [, Phi, x, y, z] = computeShortestPt(xc, yc, zc, r);
      const g = [x, y, z], c = [xc, yc, zc];
      expect(norm(sub(g, c))).toBeCloseTo(r, 12);
      expect(dot(g, sub(g, c)) / (norm(g) * r)).toBeCloseTo(0, 12); // the ray from the pinhole touches the sphere
      expect(Math.cos(Phi)).toBeLessThan(0);
    }
  });
  it('the goal moves the farthest in the image: no point of the ball projects farther from the projected start (sampled)', () => {
    for (const [xc, yc, zc, r] of [[1, 1, 15, 4], [8, 5, 14, 3.4], [-10, -10, 10, 5], [0, 3, 13, 2]]) {
      const [, , x, y, z] = computeShortestPt(xc, yc, zc, r);
      const s = proj([xc, yc, zc]), best = norm(sub(proj([x, y, z]), s));
      let max = 0;
      for (let i = 0; i <= 90; i++) for (let j = 0; j < 180; j++) {
        const a = (Math.PI * i) / 90, b = (2 * Math.PI * j) / 180;
        const p = [xc + r * Math.sin(a) * Math.cos(b), yc + r * Math.sin(a) * Math.sin(b), zc + r * Math.cos(a)];
        max = Math.max(max, norm(sub(proj(p), s)));
      }
      expect(max).toBeLessThanOrEqual(best + 1e-12);
      expect(max).toBeGreaterThan(best * 0.999); // and the sampling comes close to it
    }
  });
  it("the silhouette: the ellipse of the code's axes, centre and angle passes through the projections of the tangent circle", () => {
    for (const [xc, yc, zc, r] of [[1, 1, 15, 4], [8, 5, 14, 3.4], [-6, 2, 10, 5]]) {
      const { view } = evaluate({ ...SPECS, xc, yc, zc, r });
      const { majSalAxis: A, minSalAxis: B, xcimp, ycimp, ellipAng: e } = view;
      // the tangent circle: points p on the sphere with p·(p − c) = 0, i.e. the circle of the cone from the pinhole
      const c = [xc, yc, zc], d = norm(c), u = c.map((v) => v / d);
      const k = d - (r * r) / d, rho = r * Math.sqrt(1 - (r * r) / (d * d)); // its centre at k·u, its radius rho
      const w1 = sub([0, 0, 1], u.map((v) => v * u[2])), n1 = norm(w1), e1 = w1.map((v) => v / n1);
      const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
      for (let t = 0; t < 2 * Math.PI; t += 0.7) {
        const p = [0, 1, 2].map((i) => k * u[i] + rho * (Math.cos(t) * e1[i] + Math.sin(t) * e2[i]));
        const [px, py] = proj(p);
        const lx = Math.cos(e) * (px - xcimp) + Math.sin(e) * (py - ycimp), ly = -Math.sin(e) * (px - xcimp) + Math.cos(e) * (py - ycimp);
        expect((lx / A) ** 2 + (ly / B) ** 2).toBeCloseTo(1, 10);
      }
      // the goal's projection is the outer end of the major axis
      expect(xcimp + A * Math.cos(e)).toBeCloseTo(view.u, 12);
      expect(ycimp + A * Math.sin(e)).toBeCloseTo(view.v, 12);
    }
  });
  it('the two grids show the numbers of the snapshots (snapshot 1: x = 3.6, …, ϕ = 110.8°; (u, v) = (1.3, 1.3); 0.3 = maxdist)', () => {
    expect(grid(sphericaldist(1, 1, 15, 4))).toEqual(['x =|3.6', 'y =|3.6', 'z =|13.6', 'θ =|45.0∘', 'ϕ =|110.8∘']);
    expect(grid(imagePlaneCoor(1, 1, 15, 4))).toEqual(['(u, v) =|(1.3, 1.3)', 'λ =|5', '0.3 =|maxdist']);
    // snapshot 3 (r = 2), snapshots 4 and 5 (8, 5, 14, 3.4)
    expect(grid(sphericaldist(1, 1, 15, 2))).toEqual(['x =|2.4', 'y =|2.4', 'z =|14.5', 'θ =|45.0∘', 'ϕ =|103.0∘']);
    expect(grid(imagePlaneCoor(1, 1, 15, 2))).toEqual(['(u, v) =|(0.8, 0.8)', 'λ =|5', '0.1 =|maxdist']);
    expect(grid(sphericaldist(8, 5, 14, 3.4))).toEqual(['x =|10.0', 'y =|6.3', 'z =|11.6', 'θ =|32.0∘', 'ϕ =|135.6∘']);
    expect(grid(imagePlaneCoor(8, 5, 14, 3.4))).toEqual(['(u, v) =|(4.3, 2.7)', 'λ =|5', '0.3 =|maxdist']);
  });
  it('the grids for (xc, yc) = (0, 0): infinite solutions (snapshots 6 and 8)', () => {
    expect(grid(sphericaldist(0, 0, 17, 3))).toEqual(['|infinite solutions', '(x,  y) =|3.0(cos θ, sin θ)', 'z =|16.5', 'θ ∈ |(0, 360)∘', 'ϕ =|100.2∘']);
    expect(grid(imagePlaneCoor(0, 0, 17, 3))).toEqual(['(u, v) =|0.9(cos θ, sin θ)', 'λ =|5', '0.2 =|maxdist']);
    expect(grid(sphericaldist(0, 0, 12, 3))).toEqual(['|infinite solutions', '(x,  y) =|2.9(cos θ, sin θ)', 'z =|11.3', 'θ ∈ |(0, 360)∘', 'ϕ =|104.5∘']);
    expect(grid(imagePlaneCoor(0, 0, 12, 3))).toEqual(['(u, v) =|1.3(cos θ, sin θ)', 'λ =|5', '0.3 =|maxdist']);
    expect(htmlOf(sphericaldist(0, 0, 17, 3)[3][1])).toBe('(0, 360)<sup>∘</sup>');
  });
  it("a coordinate Chop made the exact 0 is shown as 0; NumberForm's one decimal otherwise; maxdist has no factor λ (E-CV-01)", () => {
    // (5, 0, 12, 2): ϕ = 3π/2 − arctan(√165/2) − arctan(12/5) = 121.5°, x = 5 + 2 sin ϕ = 6.71, y = Chop[0. ] = 0, z = 12 + 2 cos ϕ = 10.96
    expect(deg(1.5 * Math.PI - Math.atan(Math.sqrt(165) / 2) - Math.atan(12 / 5))).toBeCloseTo(121.47, 2);
    expect(grid(sphericaldist(5, 0, 12, 2)).slice(0, 4)).toEqual(['x =|6.7', 'y =|0', 'z =|11.0', 'θ =|0.0∘']);
    expect(grid(sphericaldist(0, -4, 12, 2))[0]).toBe('x =|0');
    expect(grid(imagePlaneCoor(0, -4, 12, 2))[0]).toBe('(u, v) =|(0, -2.6)');
    expect([numberForm(0), numberForm(0, true), numberForm(2.04), numberForm(-1.26)]).toEqual(['0.0', '0', '2.0', '-1.3']);
    const { view } = evaluate(SPECS);
    const maxdist = Math.hypot(view.x / view.z - 1 / 15, view.y / view.z - 1 / 15);
    expect(maxdist).toBeCloseTo(0.2852, 4);
    expect(Math.hypot(view.u - LAMBDA / 15, view.v - LAMBDA / 15)).toBeCloseTo(LAMBDA * maxdist, 12); // the image distance is 5×
  });
  it('the 3D picture of the opening state: axes, camera, image plane with the textured label, arrows, points; options of the original', () => {
    const { graphics: [g3, g2], view } = evaluate(SPECS);
    expect(g3.options).toEqual({ SphericalRegion: true, ImageSize: 427.5, Boxed: false, ViewAngle: 12 * (Math.PI / 180), PlotRange: [[-20, 20], [-20, 20], [-2, 20]] });
    expect(g2.list).toEqual([]); // the 2D view is not drawn
    const P = prims(g3);
    const texts = P.filter((p) => p.type === 'text').map((p) => (typeof p.expr === 'string' ? p.expr : p.expr.html));
    expect(texts).toEqual(['<i>x</i>', '<i>y</i>', '<i>z</i>', '<i>u</i>', '<i>v</i>', 'λ', 'θ', 'θ', 'ϕ']);
    // the saved definitions' colours: the axes Green, θ Cyan (the Input cells: Darker@Green, Darker@Cyan; N-CV-01)
    expect(P.filter((p) => p.type === 'arrow').slice(0, 3).map((p) => p.color)).toEqual([[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    expect(P.find((p) => p.type === 'text' && p.expr === 'θ').color).toEqual([0, 1, 1]);
    const textured = P.filter((p) => p.texture);
    expect(textured).toHaveLength(1);
    expect(textured[0]).toMatchObject({ opacity: 0.5, edgeForm: 'None', textureCoordinates: [[0, 0], [1, 0], [1, 1], [0, 1]], points: [[-5, 3.6, 5.001], [3, 3.6, 5.001], [3, 5, 5.001], [-5, 5, 5.001]] });
    expect(textured[0].texture).toBe(text);
    // red goal and its projection; green start and its projection (PointSize 0.01)
    const pts = P.filter((p) => p.type === 'point');
    expect(pts.map((p) => [p.color.join(), p.pointSize])).toEqual([['0,1,0', 0.01], ['1,0,0', 0.01], ['1,0,0', 0.01], ['0,1,0', 0.01]]);
    expect(pts[1].points[0]).toEqual([view.x, view.y, view.z]);
    expect(pts[2].points[0][2]).toBe(5);
    expect(P.some((p) => p.type === 'sphere')).toBe(false); // show sphere off
    expect(P.some((p) => p.type === 'cylinder')).toBe(false); // show drone off
  });
  it('the label: Rasterize[Style["image plane", "SR"], RasterSize -> 500, ImageSize -> 200, Background -> None] reflected (drawn upside down, Q-CV-01)', () => {
    expect(text).toMatchObject({ head: 'Rasterize', RasterSize: 500, ImageSize: 200, reflected: true });
    expect(textOf(text.expr)).toBe('image plane');
    expect(text.Background.dir).toBe('none');
    const [, , , pol] = label2D;
    expect(pol).toEqual({ head: 'Polygon', pts: [[-5, 3.6], [3, 3.6], [3, 5], [-5, 5]], vtc: [[0, 0], [1, 0], [1, 1], [0, 1]] });
    const styles = []; walk(label2D, (q, st) => styles.push(st));
    expect([styles[0].texture, styles[0].opacity, styles[0].edge]).toEqual([text, 0.5, null]);
    expect(prims(label)[0].texture).toBe(text);
  });
  it('drawCamera: the four sides of the aperture have exactly the edges of the original 16-vertex polygon', () => {
    const P = prims(drawCamera());
    expect(P[0]).toMatchObject({ type: 'cuboid', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5], opacity: 0.3, color: [0, 1, 0] });
    const faces = P.slice(1);
    expect(faces).toHaveLength(4);
    const key = (a, b) => [a.join(), b.join()].sort().join(' ');
    const fromFaces = new Set(faces.flatMap((f) => f.points.map((p, i) => key(p, f.points[(i + 1) % 4]))));
    const fromOriginal = new Set(APERTURE.map((p, i) => key(p, APERTURE[(i + 1) % APERTURE.length])).filter((k) => k.split(' ')[0] !== k.split(' ')[1]));
    expect([...fromFaces].sort()).toEqual([...fromOriginal].sort());
    for (const f of faces) { // each side is planar
      const [a, b, c, d] = f.points, n = [0, 1, 2].map((i) => sub(b, a)[(i + 1) % 3] * sub(c, a)[(i + 2) % 3] - sub(b, a)[(i + 2) % 3] * sub(c, a)[(i + 1) % 3]);
      expect(dot(n, sub(d, a))).toBeCloseTo(0, 12);
    }
  });
  it('drawDrone: four motors and a body in its colour, four yellow arms, four flat gray rotors, all moved to (x, y, z)', () => {
    const P = prims(drawDrone(1, 2, 3, Red));
    expect(P.map((p) => p.type).join()).toBe('cylinder,cylinder,cylinder,cylinder,ellipsoid,cylinder,cylinder,cylinder,cylinder,ellipsoid,ellipsoid,ellipsoid,ellipsoid');
    expect(P[0]).toMatchObject({ p1: [1.5, 2.5, 2.875], p2: [1.5, 2.5, 3.125], radius: 0.1, color: [1, 0, 0] });
    expect(P[4].Sigma).toEqual([[0.0625, 0, 0], [0, 0.04000000000000001, 0], [0, 0, 0.0625]]);
    expect(P[5].color).toEqual([1, 1, 0]);
    expect(P[9]).toMatchObject({ color: [0.5, 0.5, 0.5], center: [0.5, 0.5, 0.125], Sigma: [[0.0625, 0, 0], [0, 0.0625, 0], [0, 0, 0]] });
    expect(P[9].matrix[0][3]).toBe(1); // the translation
  });
  it('drawThetaPhi: the θ arcs and the ϕ arc end with a full-size head along their last segment (K-CV-01)', () => {
    const { view } = evaluate(SPECS);
    const P = prims(drawThetaPhi(1, 1, view.y, 15, 5, 4, view.Theta, view.Phi));
    const arrows = P.filter((p) => p.type === 'arrow');
    expect(arrows).toHaveLength(3);
    const diag = Math.hypot(40, 40, 22);
    for (const a of arrows) expect(norm(sub(a.points[1], a.points[0]))).toBeCloseTo(0.0075 * diag, 12);
    const lines = P.filter((p) => p.type === 'line');
    expect(lines[1].points).toHaveLength(13); // Table[…, {t, 0, θ, θ/12}]
    expect(lines[1].points.at(-1)).toEqual(arrows[0].points[1]);
    expect(arrows[0].color).toEqual([0, 1, 1]);
    expect(arrows[2].color).toEqual([1, 0, 1]); // ϕ in Magenta
    // θ = 0 (yc = 0, xc > 0): a straight arrow, no arc in the image plane
    const flat = prims(drawThetaPhi(4, 0, 0, 12, 5, 2, 0, 2)).filter((p) => p.type === 'arrow');
    expect(flat).toHaveLength(2);
    expect(flat[0].points).toEqual([[4, 0, 12], [5, 0, 12]]);
  });
  it('imagePlane: the λ arrow has a head at each end (two arrows from the middle)', () => {
    const arrows = prims(imagePlane()).filter((p) => p.type === 'arrow');
    expect(arrows.map((a) => a.points)).toEqual([[[-5, 0, 2.5], [-5, 0, 5]], [[-5, 0, 2.5], [-5, 0, 0]]]);
    expect(arrows[0]).toMatchObject({ arrowheads: 0.011, color: [1, 0.5, 0.5] });
  });
  it('(xc, yc) = (0, 0): 21 goals on a ring at height z (Table {θ, 0, 2π, 0.1π}), blue lines, gray arrows, 22 drones with show drone', () => {
    const { graphics: [g3], view } = evaluate({ ...SPECS, xc: 0, yc: 0, zc: 17, r: 3, Silhouette: true, showDrone: true });
    expect(view.infinite).toBe(true);
    const P = prims(g3);
    const blue = P.filter((p) => p.type === 'line' && p.color?.join() === '0,0,1');
    expect(blue).toHaveLength(21);
    for (const l of blue) expect(l.points[1][2]).toBe(view.z);
    expect(norm(sub(blue[5].points[1].slice(0, 2), [0, 0]))).toBeCloseTo(3 * Math.sin(view.Phi), 12);
    const motors = P.filter((p) => p.type === 'cylinder' && p.radius === 0.1);
    expect(motors).toHaveLength(22 * 4);
    expect(motors[0].color).toEqual([0, 1 - 1 / 3, 0]); // the start drone Darker@Green, the 21 goals Red
    expect(motors[4].color).toEqual([1, 0, 0]);
    expect(P.filter((p) => p.type === 'sphere')).toHaveLength(1);
    const pts = prims(infiniteArrowsPoints(view.x, view.y, view.z, 0, 0, 17, 5, 3, view.Phi)).filter((p) => p.type === 'point');
    expect(pts).toHaveLength(43); // 21 pairs with the origin in the image plane, 21 on the sphere, the green start
  });
  it("show sphere: the sphere (Purple, Opacity 0.3) and its silhouette at z = 5.01, turned by ellipAng about (xcimp, ycimp)", () => {
    const { graphics: [g3], view } = evaluate({ ...SPECS, Silhouette: true });
    const P = prims(g3);
    expect(P.find((p) => p.type === 'sphere')).toMatchObject({ centers: [[1, 1, 15]], radius: 4, opacity: 0.3, color: [0.5, 0, 0.5] });
    const sil = P.at(-1);
    expect(sil).toMatchObject({ type: 'polygon', opacity: 0.4, color: [0.5, 0, 0.5] });
    expect(sil.points).toHaveLength(25);
    for (const p of sil.points) expect(p[2]).toBeCloseTo(5.01, 12);
    // its first vertex: the outer end of the major axis = the goal's projection
    expect(sil.points[0][0]).toBeCloseTo(view.u, 12);
    expect(sil.points[0][1]).toBeCloseTo(view.v, 12);
  });
  it('the 2D view (snapshot 3 settings): image plane, label, arrow, axes, silhouette and drones; top-level Opacity 0.4 for θ and the drones (Q-CV-03)', () => {
    const { graphics: [g3, g2], view } = evaluate(saved.snapshots[3]);
    expect(g3.content).toEqual([]);
    expect(view.PlotRange2D).toEqual([[-5.3, 5], [-5.3, 5]]); // the u, v labels at -5.3 and the plane
    expect(g2.options).toMatchObject({ ImageSize: IMAGE_SIZE, UpdateFrame: true });
    const seen = []; // every primitive with its style, also inside the Annotations (test ids)
    Cases(g2, (q, st) => { seen.push([q.head, st]); return false; });
    const disks = seen.filter(([h]) => h === 'Disk');
    expect(disks).toHaveLength(10); // two drones: four rotors and a centre each
    expect(disks.every(([, st]) => st.opacity === 0.4)).toBe(true);
    const theta = seen.find(([h, st]) => h === 'Text' && st.color.join() === '0,1,1');
    expect(theta[1].opacity).toBe(0.4);
    const sil = Cases(g2, 'Rotate')[0];
    expect(sil.angle).toBeCloseTo(Math.PI / 4, 15);
    expect(sil.g.pts).toHaveLength(49);
    expect(Cases(g2, (q) => q.head === 'Polygon' && q.vtc)).toHaveLength(1); // the textured label
    expect(Cases(g2, 'Annotation').map((q) => q.id)).toEqual(['image-plane', 'silhouette', 'theta', 'drone-start', 'drone-goal']);
  });
  it('the 2D plot range is PlotRange -> All: it grows with drones outside the image plane', () => {
    const q = evaluate({ ...SPECS, xc: 10, yc: -10, zc: 10, r: 5, imPlaneView: true, showDrone: true, Silhouette: true });
    const [[x0, x1], [y0, y1]] = q.view.PlotRange2D;
    expect(x1).toBeGreaterThan(5);
    expect(y0).toBeLessThan(-5.3);
    expect(x0).toBe(-5.3);
    expect(q.graphics[1].options.ImageSize).toBeCloseTo(IMAGE_SIZE * Math.min(1, (x1 - x0) / (y1 - y0)), 12);
    expect(plotRangeAll([draw2Ddrone(0, 0, 5, 5, null)])).toEqual([[-0.75, 0.75], [-0.75, 0.75]]); // rotor disks reach 0.5 + 0.25
  });
  it('animate: a = Mod[a + 0.1, 1] at every evaluation (the body evaluates itself again), the purple drone at the fraction a', () => {
    const s1 = evaluate({ ...SPECS, animation: true }).state;
    expect(s1.a).toBe(0.6);
    expect(settles(s1)).toBe(true);
    expect(settles(SPECS)).toBe(false);
    let s = { ...SPECS, animation: true, a: 0.9 };
    s = evaluate(s).state;
    expect(s.a).toBeCloseTo(0, 12); // 1.0 mod 1
    const { graphics: [g3], view } = evaluate({ ...SPECS, animation: true, a: 0.2 });
    const motors = prims(g3).filter((p) => p.type === 'cylinder' && p.radius === 0.1);
    expect(motors).toHaveLength(4); // only the animated drone (show drone off)
    expect(motors[0].color).toEqual([0.5, 0, 0.5]);
    const centre = [motors[0].p1[0] - 0.5, motors[0].p1[1] - 0.5, motors[0].p1[2] + 0.125];
    [1, 1, 15].forEach((c, i) => expect(centre[i]).toBeCloseTo(c + 0.3 * ([view.x, view.y, view.z][i] - c), 12)); // a = 0.3 after the step
    expect(evaluate(SPECS).state.a).toBe(0.5); // no step without animate
  });
  it("the notebook's eight snapshot settings evaluate; their goals, views and drones are those of the pictures", () => {
    const want = {
      1: { infinite: false, im: false, drones: 0 }, 2: { infinite: false, im: false, drones: 2 }, 3: { infinite: false, im: true, drones: 2 },
      4: { infinite: false, im: false, drones: 0 }, 5: { infinite: false, im: true, drones: 2 }, 6: { infinite: true, im: false, drones: 22 },
      7: { infinite: true, im: false, drones: 0 }, 8: { infinite: true, im: true, drones: 22 },
    };
    for (const [k, s] of Object.entries(saved.snapshots)) {
      const { view, graphics: [g3, g2] } = evaluate(s);
      expect(view.infinite).toBe(want[k].infinite);
      expect(view.imPlaneView).toBe(want[k].im);
      const drones = want[k].im ? Cases(g2, (q) => q.head === 'Disk').length / 5 : prims(g3).filter((p) => p.type === 'cylinder' && p.radius === 0.1).length / 4;
      expect(drones).toBe(want[k].drones);
      expect(Number.isFinite(view.x + view.y + view.z + view.majSalAxis + view.minSalAxis)).toBe(true);
    }
    expect(PLOT_RANGE).toEqual(OPTIONS_3D.PlotRange);
  });
  it('graphics2D draws the θ arc as Arrow[BSplineCurve[…]] with 13 control points, or a straight arrow for ellipAng = 0', () => {
    const { view } = evaluate(SPECS);
    const g = graphics2D({ ...view, xc: 1, yc: 1, zc: 15, λ: 5, r: 4, Silhouette: false, showDrone: false, animation: false, a: 0.5 });
    const arc = Cases(g, (q) => q.head === 'Arrow' && q.curve)[0];
    expect(arc.curve.pts).toHaveLength(13);
    // the arc's radius is 0.5 r' λ/zc with r' = r λ/z (the body passes r λ/z as r): its first control point
    expect(arc.curve.pts[0][0]).toBeCloseTo((1 + 0.5 * ((4 / view.z) * 5)) * (5 / 15), 14);
    expect(arc.curve.pts[0][1]).toBeCloseTo(5 / 15, 14);
    const v0 = evaluate({ ...SPECS, yc: 0, xc: 3 }).view;
    const g0 = graphics2D({ ...v0, xc: 3, yc: 0, zc: 15, λ: 5, r: 4, Silhouette: false, showDrone: false, animation: false, a: 0.5 });
    expect(Cases(g0, (q) => q.head === 'Arrow' && q.curve)).toHaveLength(0);
  });
});
