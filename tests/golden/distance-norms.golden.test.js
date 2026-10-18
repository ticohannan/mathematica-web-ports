// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Benedict Isichei
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/distance-norms.golden.test.js — the port against the ORIGINAL notebook: its saved state and the six
// snapshot cells' Settings (tests/golden/distance-norms.original-states.json, raw notebook lines 2407, 3613, 4818, 6021,
// 7213, 8429), the region the original drew in the snapshot pictures (docs/original-snapshots/distance-norms-1…6.png,
// measured here with a small PNG reader), and — once the owner has run it — the Mathematica harness
// (tests/golden/distance-norms.harness.json; these tests SKIP with the documented reason until it exists).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  evaluate, initialState, INITIAL, NORM_SPACES, PLOT_RANGE, FRAME, IMAGE, REGION_STYLE,
} from '../../demos/distance-norms/model.js';
import { framePrimitives, frameLayout } from '../../shared/svg-frame.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, toJS, exactDouble } from '../support/harness-json.js';

const fixture = loadStates('tests/golden/distance-norms.original-states.json');
const inputs = (s) => ({ ...initialState(), ...plain(s) });
const SNAP = fixture.snapshots.map(inputs); // SNAP[k - 1] = snapshot k's Settings as port inputs

// ---------------------------------------------------------------------------------------- snapshot pictures
/** Minimal PNG reader (8-bit RGB or RGBA, not interlaced): {width, height, px(x, y) -> [r, g, b]}. */
function readPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${file}: only 8-bit, non-interlaced PNGs`);
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!bpp) throw new Error(`${file}: colour type ${colorType} not supported`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp, out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[dst + i - bpp] : 0, b = y > 0 ? out[dst - stride + i] : 0, c = i >= bpp && y > 0 ? out[dst - stride + i - bpp] : 0;
      const x = raw[src + i];
      let v;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[dst + i] = v & 255;
    }
  }
  return { width, height, px: (x, y) => { const i = y * stride + x * bpp; return [out[i], out[i + 1], out[i + 2]]; } };
}
const picture = (k) => readPng(`docs/original-snapshots/distance-norms-${k}.png`);
// The frame spans x, y = ±2.5 between px 450 and 1138: 137.6 px per unit, origin at px (795, 421) (TESTPLAN).
const PX = 137.6, OX = 795, OY = 421;
const FRAME_PX = { x0: 451, x1: 1137, y0: 78, y1: 765 }; // inside the frame lines
const REGION_PIXELS = [[174, 192, 217], [156, 173, 199], [94, 129, 181]]; // fill, fill over the gray link, outline
const near = (c, d, tol) => Math.max(Math.abs(c[0] - d[0]), Math.abs(c[1] - d[1]), Math.abs(c[2] - d[2])) <= tol;
/** bounding box (plot units) of all region-coloured pixels (within 14 levels) inside the frame */
function measuredExtent(k) {
  const img = picture(k);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let y = FRAME_PX.y0; y <= FRAME_PX.y1; y++) {
    for (let x = FRAME_PX.x0; x <= FRAME_PX.x1; x++) {
      const c = img.px(x, y);
      if (!REGION_PIXELS.some((r) => near(c, r, 14))) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  return { x: [(x0 - OX) / PX, (x1 - OX) / PX], y: [(OY - y1) / PX, (OY - y0) / PX] };
}
/** bounding box of the port's region (its outline) */
function portExtent(state) {
  const { boundary } = evaluate(state).region;
  const xs = boundary.map((p) => p[0]), ys = boundary.map((p) => p[1]);
  return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] };
}
const within = (a, b, tol) => a.forEach((v, i) => expect(Math.abs(v - b[i]), `${a} vs ${b}`).toBeLessThanOrEqual(tol));
/** the port's exact set (to 3 decimals as the title states), and the picture within 0.015 units (≈ 2 px) */
function checkExtent(k, x, y, { skipTop = false } = {}) {
  const port = portExtent(SNAP[k - 1]);
  within(port.x, x, 0.0011);
  within(port.y, y, 0.0011);
  const pic = measuredExtent(k);
  within(pic.x, port.x, 0.015);
  if (skipTop) within([pic.y[0]], [port.y[0]], 0.015);
  else within(pic.y, port.y, 0.015);
  return { port, pic };
}

describe('distance-norms golden: saved state and snapshot Settings', () => {
  it('distance-norms: the saved state is the initial state of the port', () => {
    const live = fixture.live;
    expect(live.bound).toEqual({ wl: '1/2', n: 0.5 }); // Rational[1, 2], exact
    expect(live.p).toEqual({ wl: 'Infinity' }); // DirectedInfinity[1]
    for (const s of [live, fixture.specs, fixture.snapshots[0]]) {
      expect(inputs(s)).toEqual(initialState()); // the live state = the initial settings = snapshot 1 (F-DN-14)
    }
    expect(INITIAL).toEqual({
      cORw: 'phase space', p: Infinity, bound: 0.5, r1: 1, p1: [1, 0], p2: [0, 1], pEnd: [2, 0], pEndp: [2, 0], IsElbowUpp: true,
    });
    expect(fixture.count).toBe(6);
    // the body assigns no Manipulate variable: evaluating keeps the state; θ1 = 0, θ2 = π/2
    const s = initialState();
    const r = evaluate(s);
    expect(s).toEqual(initialState());
    expect(r.locals).toEqual({ r2: 1, Theta1: 0, Theta2: Math.PI / 2 });
  });

  it('distance-norms: snapshots 3 to 6 store cORw = configuration: no button selected and the phase-space map', () => {
    for (const k of [3, 4, 5, 6]) {
      const s = SNAP[k - 1];
      expect(s.cORw).toBe('configuration');
      expect(NORM_SPACES.filter((v) => v === s.cORw)).toEqual([]); // the setter bar selects no button (pictures 3–6)
      const r = evaluate(s).region, ref = evaluate({ ...s, cORw: 'phase space' }).region;
      expect(r.mode).toBe('phase space');
      expect(r).toEqual(ref);
    }
    expect(SNAP[1].cORw).toBe('workspace');
  });
});

describe('distance-norms golden: the region in the snapshot pictures', () => {
  it('distance-norms: snapshot 1 region (infinity norm) spans x 0.036 to 1.719 and y 0.061 to 1.479', () => {
    checkExtent(1, [0.036, 1.719], [0.061, 1.479]);
    expect(evaluate(SNAP[0]).region.sheets).toHaveLength(1);
  });
  it('distance-norms: snapshot 2 workspace square of side 1 around the tip (-0.0096, 1.99995)', () => {
    const s = SNAP[1];
    const r = evaluate(s);
    expect(r.locals.Theta1).toBe(Math.PI / 2);
    expect(r.locals.Theta2).toBeCloseTo(0.009599705104306388, 15);
    expect(r.arm.tip[0]).toBeCloseTo(-0.009599557662574037, 15);
    expect(r.arm.tip[1]).toBeCloseTo(1.9999539231848051, 15);
    const port = portExtent(s);
    within(port.x, [-0.509599557662574, 0.490400442337426], 1e-12);
    within(port.y, [1.4999539231848051, 2.499953923184805], 1e-12);
    expect(port.y[1]).toBeLessThan(PLOT_RANGE[1][1]); // inside the frame: not clipped
    const pic = measuredExtent(2); // the top edge coincides with the scan limit just inside the frame
    within(pic.x, port.x, 0.015);
    within([pic.y[0]], [port.y[0]], 0.015);
  });
  it('distance-norms: snapshot 3 region (3-norm) spans x 0.201 to 1.647 and y 0.279 to 1.434', () => {
    checkExtent(3, [0.201, 1.647], [0.279, 1.434]);
  });
  it('distance-norms: snapshot 4 region (2-norm) spans x 0.276 to 1.601 and y 0.349 to 1.409', () => {
    checkExtent(4, [0.276, 1.601], [0.349, 1.409]);
  });
  it('distance-norms: snapshot 5 region (1-norm) spans x 0.398 to 1.479 and y 0.398 to 1.358', () => {
    checkExtent(5, [0.398, 1.479], [0.398, 1.358]);
  });
  it('distance-norms: snapshot 6 Settings (1-norm near the fold) give a region spanning x 1.514 to 1.998 and y -0.585 to 1.275', () => {
    const { region } = evaluate(SNAP[5]);
    expect(region.sheets).toHaveLength(2);
    expect(region.sheets[0].hi).toBe(0.2920563147897327); // the cut θ2 + Δθ2 = 0
    expect(Math.abs(region.totalArea / 0.14685 - 1)).toBeLessThan(5e-3);
    const port = portExtent(SNAP[5]);
    within(port.x, [1.514, 1.998], 0.0011);
    within(port.y, [-0.585, 1.275], 0.0011);
    const pic = measuredExtent(6);
    within(pic.x, port.x, 0.015);
    within([pic.y[0]], [port.y[0]], 0.015);
    // the needle-thin upper tip loses pixels in the picture (1.265): within 0.015 of the exact 1.275
    expect(Math.abs(pic.y[1] - port.y[1])).toBeLessThanOrEqual(0.015);
  });

  it('distance-norms: region fill and boundary colours of snapshot 1', () => {
    const [r, g, b] = REGION_STYLE.color.map((v) => v * 255);
    const a = REGION_STYLE.opacity;
    const over = (bg) => [r * a + bg * (1 - a), g * a + bg * (1 - a), b * a + bg * (1 - a)];
    within(over(255), [174.5, 192.1, 218.0], 0.1); // over white
    within(over(0.85 * 255), [155.3, 173.0, 198.9], 0.1); // over LightGray (the links, Prolog)
    within(over(0), [47.0, 64.6, 90.5], 0.1); // over black (the text under the region, Q-DN-03)
    within([r, g, b], [93.9, 129.2, 181.0], 0.1); // the opaque outline
    // each colour occurs in snapshot 1 within 2 levels
    const img = picture(1);
    const count = (c) => {
      let n = 0;
      for (let y = FRAME_PX.y0; y <= FRAME_PX.y1; y++) for (let x = FRAME_PX.x0; x <= FRAME_PX.x1; x++) if (near(img.px(x, y), c, 2)) n++;
      return n;
    };
    expect(count(over(255))).toBeGreaterThan(5000);
    expect(count(over(0.85 * 255))).toBeGreaterThan(300);
    expect(count(over(0))).toBeGreaterThan(5);
    expect(count([r, g, b])).toBeGreaterThan(50);
  });

  it('distance-norms: frame at exactly plus-minus 2.5 with ticks every 1 and minor ticks every 0.2', () => {
    const layout = frameLayout(PLOT_RANGE, IMAGE);
    const prims = framePrimitives({ ...FRAME, unitsPerPx: layout.unitsPerPx });
    expect(prims.lines.find((l) => l.role === 'frame').pts).toEqual([[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5], [-2.5, -2.5]]);
    expect(prims.lines.filter((l) => l.role === 'axis-x' || l.role === 'axis-y').map((l) => l.pts)).toEqual([[[-2.5, 0], [2.5, 0]], [[0, -2.5], [0, 2.5]]]);
    const majorsBottom = prims.lines.filter((l) => l.role === 'major' && l.pts[0][1] === -2.5 && l.pts[1][0] === l.pts[0][0]).map((l) => l.pts[0][0]);
    expect(majorsBottom).toEqual([-2, -1, 0, 1, 2]);
    const minorsBottom = prims.lines.filter((l) => l.role === 'minor' && l.pts[0][1] === -2.5 && l.pts[1][0] === l.pts[0][0]).map((l) => l.pts[0][0]);
    expect(minorsBottom).toEqual([-2.4, -2.2, -1.8, -1.6, -1.4, -1.2, -0.8, -0.6, -0.4, -0.2, 0.2, 0.4, 0.6, 0.8, 1.2, 1.4, 1.6, 1.8, 2.2, 2.4]);
    expect(prims.texts.filter((t) => t.role === 'label-x').map((t) => t.str)).toEqual(['−2', '−1', '0', '1', '2']);
    expect(prims.texts.filter((t) => t.role === 'label-y').map((t) => t.str)).toEqual(['−2', '−1', '0', '1', '2']);
    // the frame takes the same share of the image as in snapshot 1 (688 of 789 px)
    expect(Math.abs(5 / layout.unitsPerPx / IMAGE.imageSize - 688 / 789)).toBeLessThan(0.003);
    // snapshot 1: frame lines at px 450 and 1138 (gray), major ticks at 795 + 137.6 k, minor ticks every 27.5 px
    const img = picture(1);
    const gray = (c) => c[0] === c[1] && c[1] === c[2] && c[0] < 200;
    expect(gray(img.px(450, 300))).toBe(true);
    expect(gray(img.px(1138, 300)) || gray(img.px(1137, 300))).toBe(true);
    for (const k of [-2, -1, 1, 2]) {
      const x = Math.round(OX + PX * k);
      expect([x - 2, x - 1, x, x + 1].some((xx) => gray(img.px(xx, 760))), `major tick ${k}`).toBe(true);
    }
    // the tick labels are GrayLevel 0.4 (102)
    let labelPixels = 0;
    for (let y = 772; y < 800; y++) for (let x = 500; x < 1100; x++) if (near(img.px(x, y), [102, 102, 102], 3)) labelPixels++;
    expect(labelPixels).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------------------- Mathematica harness
// Helpers for the recorded %g (HARNESS-WL §6.2/§6.3: the evaluated Graphics, fully encoded).
const headOf = (v) => (v && typeof v === 'object' && !Array.isArray(v) && 'h' in v ? (typeof v.h === 'string' ? v.h : v.h?.sym ?? null) : null);
/** every sub-expression with head h (depth first) */
function findAll(v, h, out = []) {
  if (Array.isArray(v)) v.forEach((x) => findAll(x, h, out));
  else if (v && typeof v === 'object') {
    if (headOf(v) === h) out.push(v);
    if (Array.isArray(v.a)) v.a.forEach((x) => findAll(x, h, out));
  }
  return out;
}
/** the region of the recorded ParametricPlot: boundary lines (world points) and the filled area (sum of polygons) */
function recordedRegion(g) {
  const lines = [], polys = [];
  for (const gc of findAll(g, 'GraphicsComplex')) {
    const pts = toJS(gc.a[0]);
    const at = (i) => pts[i - 1];
    for (const l of findAll(gc.a[1], 'Line')) {
      const idx = toJS(l.a[0]);
      for (const run of Array.isArray(idx[0]) ? idx : [idx]) lines.push(run.map(at));
    }
    for (const p of findAll(gc.a[1], 'Polygon')) {
      const idx = toJS(p.a[0]);
      for (const run of Array.isArray(idx[0]) ? idx : [idx]) polys.push(run.map(at));
    }
  }
  const shoelace = (q) => Math.abs(q.reduce((s, [x0, y0], i) => { const [x1, y1] = q[(i + 1) % q.length]; return s + x0 * y1 - x1 * y0; }, 0)) / 2;
  return { lines, area: polys.reduce((s, q) => s + shoelace(q), 0) };
}
/** distance from point p to the polyline set */
function distToLines(p, lines) {
  let best = Infinity;
  for (const l of lines) {
    for (let i = 0; i + 1 < l.length; i++) {
      const [ax, ay] = l[i], [bx, by] = l[i + 1];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2));
      best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
    }
  }
  return best;
}
/** Hausdorff distance between the port's closed outline and the recorded boundary lines */
function hausdorff(boundary, lines) {
  const closed = [[...boundary, boundary[0]]];
  let h = 0;
  for (const p of boundary) h = Math.max(h, distToLines(p, lines));
  for (const l of lines) for (const p of l) h = Math.max(h, distToLines(p, closed));
  return h;
}
const ulpDiff = (a, b) => (a === b ? 0 : Math.abs(a - b) / (Number.EPSILON * Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE)));
/** the port state after a harness scenario's steps (set: assign; setFrom: snapshot Settings) */
function stateAfter(scenario, upto = scenario.steps.length) {
  let s = initialState();
  for (const step of scenario.steps.slice(0, upto)) {
    if (step.setFrom) s = { ...SNAP[Number(String(step.setFrom).split(':')[1]) - 1] };
    if (step.set) {
      for (const [k, v] of Object.entries(toJS(step.set))) {
        s[k] = typeof v === 'string' && v.startsWith('wl:') ? (v === 'wl:Infinity' ? Infinity : v === 'wl:1/2' ? 0.5 : Number.NaN) : v;
      }
    }
  }
  return s;
}
/** region comparison of one capture: outline Hausdorff ≤ tol and area within 2 % */
function compareRegion(g, state, { tol = 0.01, area } = {}) {
  const rec = recordedRegion(g);
  const port = evaluate(state).region;
  expect(rec.lines.length, 'recorded boundary lines').toBeGreaterThan(0);
  expect(hausdorff(port.boundary, rec.lines)).toBeLessThanOrEqual(tol);
  const expected = area ?? port.totalArea;
  expect(Math.abs(rec.area / expected - 1)).toBeLessThan(0.02);
}
/** Theta1, Theta2, r2 recorded vs the port's locals, bit for bit */
function compareLocals(record, state, step) {
  const l = evaluate(state).locals;
  for (const [name, port] of [['Theta1', l.Theta1], ['Theta2', l.Theta2], ['r2', l.r2]]) {
    const caps = step == null ? record.capture : record.steps[step - 1].capture;
    if (!caps || !(name in caps)) continue;
    expect(exactDouble(captureOf(record, name, { step })), name).toBe(port);
  }
}
/** the recorded Prolog arm: Point coordinates and Text positions within 4 ulps of the port's arm data */
function compareArm(arm, state) {
  const a = evaluate(state).arm;
  const pts = findAll(arm, 'Point').map((p) => toJS(p.a[0])).map((q) => (Array.isArray(q[0]) ? q[0] : q));
  for (const want of [a.base, a.elbow]) expect(pts.some((q) => ulpDiff(q[0], want[0]) <= 4 && ulpDiff(q[1], want[1]) <= 4), `point ${want}`).toBe(true);
  const texts = findAll(arm, 'Text').map((t) => toJS(t.a[1]));
  if (a.theta2Label.visible) expect(texts.some((q) => ulpDiff(q[0], a.theta2Label.at[0]) <= 4 && ulpDiff(q[1], a.theta2Label.at[1]) <= 4)).toBe(true);
  expect(texts.some((q) => q[0] === a.robotArm.anchor[0] && q[1] === a.robotArm.anchor[1]) || texts.some((q) => ulpDiff(q[0], a.robotArm.anchor[0]) <= 4 && ulpDiff(q[1], a.robotArm.anchor[1]) <= 4)).toBe(true);
  return { pts, texts };
}
/** one harness scenario; the title starts with "harness H-DN-nn" (DESIGN.md cites it verbatim) */
const H = (title, body) => it(title, (ctx) => {
  const h = harnessCase('distance-norms', title.match(/H-DN-\d+/)[0]);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  body(h.record, h.scenario);
});
const gOf = (record, step) => captureOf(record, '%g', { step })[0];

describe('distance-norms golden: Mathematica harness (skipped until tests/golden/distance-norms.harness.json exists)', () => {
  H('harness H-DN-01: opening state with exact values: arm primitives and the infinity-norm region', (rec, sc) => {
    const s = stateAfter(sc);
    expect(toJS(captureOf(rec, 'Theta1'))).toBe(0);
    expect(exactDouble(captureOf(rec, 'Theta2'))).toBe(Math.PI / 2);
    expect(toJS(captureOf(rec, 'r2'))).toBe(1);
    compareArm(captureOf(rec, 'arm'), s);
    compareRegion(gOf(rec), s, { area: 0.958851077208406 });
  });
  H('harness H-DN-02: the four norms in phase space at the opening angles: outlines and areas', (rec, sc) => {
    [0.48941, 0.76112, 0.85243, 0.95885].forEach((area, i) => {
      const s = stateAfter(sc, i + 1);
      compareLocals(rec, s, i + 1);
      compareRegion(gOf(rec, i + 1), s, { area });
    });
  });
  H('harness H-DN-03: the four norms in workspace mode: exact p-balls around the tip (1, 1)', (rec, sc) => {
    [0.5, 0.7854, 0.8833, 1.0].forEach((area, i) => compareRegion(gOf(rec, i + 1), stateAfter(sc, i + 1), { area }));
  });
  H('harness H-DN-04: fold near the outer circle (snapshot 6 Settings): outline, kink, overlap of the output triangles', (rec, sc) => {
    const s = stateAfter(sc);
    compareLocals(rec, s);
    compareArm(captureOf(rec, 'arm'), s);
    compareRegion(gOf(rec), s, { area: evaluate(s).region.totalArea });
  });
  H('harness H-DN-05: largest slider d with theta2 = 0.3: three sheets, the annulus covered twice', (rec, sc) => {
    compareRegion(gOf(rec), stateAfter(sc), { area: 25.114 });
  });
  H('harness H-DN-06: smallest d: a tiny region is still drawn', (rec, sc) => {
    const s = stateAfter(sc);
    const r = recordedRegion(gOf(rec));
    expect(r.area).toBeGreaterThan(0);
    expect(hausdorff(evaluate(s).region.boundary, r.lines)).toBeLessThanOrEqual(0.001);
  });
  H('harness H-DN-07: r1 = 0: rank-1 map, what ParametricPlot draws (K-DN-02)', (rec, sc) => {
    const s = stateAfter(sc);
    expect(toJS(captureOf(rec, 'r2'))).toBe(2);
    const r = recordedRegion(gOf(rec));
    expect(r.area).toBeLessThan(1e-6); // the port fills nothing; a recorded area would settle K-DN-02 otherwise
    if (r.lines.length) expect(hausdorff(evaluate(s).region.boundary, r.lines)).toBeLessThanOrEqual(0.01);
  });
  H('harness H-DN-08: r1 = 2: degenerate region, Robot Arm on link 1 (K-DN-02)', (rec, sc) => {
    const s = stateAfter(sc);
    expect(toJS(captureOf(rec, 'r2'))).toBe(0);
    expect(evaluate(s).arm.robotArm.link).toBe(1);
    compareArm(captureOf(rec, 'arm'), s);
    expect(recordedRegion(gOf(rec)).area).toBeLessThan(1e-6);
  });
  H('harness H-DN-09: Robot Arm label on link 1 (r2 < 1) and on link 2 (r2 >= 1) with machine r1', (rec, sc) => {
    [1, 2].forEach((step) => {
      const s = stateAfter(sc, step);
      compareArm(captureOf(rec, 'arm', { step }), s);
    });
  });
  H('harness H-DN-10: theta2 = 0: the blue angle arc is a Point', (rec, sc) => {
    const s = stateAfter(sc);
    compareLocals(rec, s);
    const a = evaluate(s).arm;
    expect(a.arcs.theta2.kind).toBe('Point');
    const { pts } = compareArm(captureOf(rec, 'arm'), s);
    expect(pts.some((q) => ulpDiff(q[0], a.arcs.theta2.at[0]) <= 4 && ulpDiff(q[1], a.arcs.theta2.at[1]) <= 4)).toBe(true);
  });
  H('harness H-DN-11: dial pressed exactly at its centre: ArcTan[0., 0.] (K-DN-03)', (rec) => {
    // records the outcome only; the port ignores a dial press at the exact centre (D-TK-07)
    expect(captureOf(rec, '%messages')).toBeDefined();
  });
  H('harness H-DN-12: theta1 = pi/4 up to rounding: the tolerant Abs[theta1] > pi/4 hides the label', (rec, sc) => {
    const s = stateAfter(sc);
    compareLocals(rec, s);
    expect(evaluate(s).arm.theta1Label.visible).toBe(false);
    expect(findAll(captureOf(rec, 'arm'), 'Text').length).toBe(2); // "Robot Arm" and θ2 only
  });
  H('harness H-DN-13: the inert end-effector locator changes nothing (Q-DN-01)', (rec, sc) => {
    const s = stateAfter(sc);
    expect(evaluate(s)).toEqual(evaluate(initialState()));
    compareRegion(gOf(rec), s, { area: 0.958851077208406 });
  });
  H('harness H-DN-14: workspace square around the tip of snapshot 2, just inside the plot range', (rec, sc) => {
    const s = stateAfter(sc);
    compareLocals(rec, s);
    compareRegion(gOf(rec), s, { area: 1 });
    expect(toJS(captureOf(rec, '%plotRange'))).toEqual([[-2.5, 2.5], [-2.5, 2.5]]);
  });
  H('harness H-DN-15: all six snapshot Settings, including cORw = configuration (Q-DN-07)', (rec, sc) => {
    for (let k = 1; k <= 6; k++) {
      const s = stateAfter(sc, k);
      expect(toJS(captureOf(rec, 'cORw', { step: k }))).toBe(s.cORw);
      compareLocals(rec, s, k);
      compareRegion(gOf(rec, k), s);
    }
  });
});
