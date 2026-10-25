// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/dubins-isochrons.golden.test.js — the port against the ORIGINAL notebook: the live state with its cached
// plot (the "=" ParametricPlot lines and the Prolog's grey polygons), the initial settings, the five snapshot Settings
// with their own cached plots (snapshots 2–4: the "≤" region meshes), all in
// tests/golden/dubins-isochrons.original-states.json (`python3 tools/extract_state.py --snapshots`); the snapshot
// pictures docs/original-snapshots/dubins-isochrons-<k>.png; and the Mathematica-harness records
// (tests/golden/dubins-isochrons.harness.json; these tests skip until the owner's run exists).
import { describe, it, expect } from 'vitest';
import {
  initialState, evaluate, greyPolygons, isochronCurves, reachRegions, carState, FORMULAS, PLOT_ORDER, PLOT_COLOURS,
} from '../../demos/dubins-isochrons/isochrons.js';
import { loadStates, plain } from '../../tools/lib/wl-json.mjs';
import { harnessCase, captureOf, toJS, toJSNumeric } from '../support/harness-json.js';
import { readPng } from '../support/png.js';
import { Cases } from '../../shared/graphics.js';

const fx = loadStates('tests/golden/dubins-isochrons.original-states.json');
const ulp = (x) => { const b = new Float64Array([Math.abs(x)]); const i = new BigInt64Array(b.buffer); i[0] += 1n; return b[0] - Math.abs(x); };
const PI = Math.PI;
const SCALAR = ['r', 'rold', 't', 'told', 'set', 'setold', 'path', 'τ', 'p'];
const toPort = (s) => ({ r: s.r, rold: s.rold, t: s.t, told: s.told, set: s.set, setold: s.setold, path: s.path, tau: s['τ'], p: s.p });

/**
 * every head h inside an expression, in order; the fixture writes {head, args}, the harness record {h, a} (HW-45):
 * both are returned as {head, args}
 */
function findHeads(v, h, out = []) {
  if (Array.isArray(v)) v.forEach((x) => findHeads(x, h, out));
  else if (v && typeof v === 'object' && (typeof v.head === 'string' || typeof v.h === 'string')) {
    const e = typeof v.head === 'string' ? v : { head: v.h, args: v.a };
    if (e.head === h) out.push(e); else (e.args ?? []).forEach((x) => findHeads(x, h, out));
  }
  return out;
}
const colourKey = (c) => c.map((v) => v.toFixed(6)).join(',');
const WORD_OF = Object.fromEntries(PLOT_ORDER.map((w) => [colourKey(PLOT_COLOURS[w]), w]));
/** the cached "=" plot: the four Lines (in order, with their colours) and the Prolog polygons */
function savedIsochrons(plotReach) {
  const groups = findHeads(plotReach.args[0], 'Line').map((line) => line.args[0]);
  const colours = findHeads(plotReach.args[0], 'RGBColor').map((c) => colourKey(c.args));
  const prolog = plotReach.args[1].find((o) => o.head === 'Rule' && o.args[0].sym === 'Prolog').args[1];
  const plotRange = plotReach.args[1].find((o) => o.head === 'Rule' && o.args[0].sym === 'PlotRange').args[1];
  return { lines: groups, colours, polygons: findHeads(prolog, 'Polygon').map((p) => p.args[0]), plotRange };
}
/** the cached "≤" plot: per region its polygons (as point lists) and its boundary line */
function savedRegions(plotReach) {
  const gc = plotReach.args[0];
  const pts = gc.args[0];
  const out = {};
  for (const grp of gc.args[1][0]) {
    if (!Array.isArray(grp) || !grp.length) continue;
    const w = WORD_OF[colourKey(findHeads(grp, 'RGBColor')[0].args)];
    const polys = [];
    for (const P of findHeads(grp, 'Polygon')) {
      const a = P.args[0];
      for (const l of typeof a[0] === 'number' ? [a] : a) polys.push(l.map((ix) => pts[ix - 1]));
    }
    out[w] = { polys };
  }
  for (const grp of gc.args[1][1]) {
    const w = WORD_OF[colourKey(findHeads(grp, 'RGBColor')[0].args)];
    out[w].boundary = findHeads(grp, 'Line')[0].args[0].map((ix) => pts[ix - 1]);
  }
  return out;
}
/**
 * minimum distance from p to the parametric curve g(u), u in [0, 1]: dense sampling (cached per curve), then a
 * refinement around every sampled local minimum within one chord (the longest distance between neighbouring samples)
 * of the best sample. A curve with many turns or a self-crossing passes near p on several arcs, and where it folds back
 * at a cusp the distance is not unimodal between two samples; refining only the best sample by ternary search can land
 * in the wrong basin (harness H-DI-11, H-DI-12, H-DI-13, H-DI-17), so a miss is retried by a beam search.
 */
const samplesCache = new WeakMap();
function curveSamples(g, n) {
  let byN = samplesCache.get(g);
  if (!byN) samplesCache.set(g, (byN = new Map()));
  if (!byN.has(n)) {
    const pts = Array.from({ length: n + 1 }, (_, k) => g(k / n));
    let chord = 0;
    for (let k = 1; k <= n; k++) chord = Math.max(chord, Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    byN.set(n, { pts, chord });
  }
  return byN.get(n);
}
function distToCurve(p, g, n = 4000) {
  const D = (u) => { const q = g(u); return Math.hypot(q[0] - p[0], q[1] - p[1]); };
  const { pts, chord } = curveSamples(g, n);
  const d = pts.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1]));
  let bd = Infinity;
  for (const v of d) if (v < bd) bd = v;
  let out = bd;
  const near = [];
  for (let k = 0; k <= n; k++) if (d[k] <= bd + chord) near.push(k);
  for (const k of near) { // ternary search around the sampled local minima
    if ((k > 0 && d[k] > d[k - 1]) || (k < n && d[k] > d[k + 1])) continue;
    let a = Math.max(0, (k - 1) / n), b = Math.min(1, (k + 1) / n);
    for (let i = 0; i < 200; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (D(m1) < D(m2)) b = m2; else a = m1; }
    out = Math.min(out, D((a + b) / 2));
  }
  // every curve point lies within half a chord of a sample: if even that is farther than 1e-9, no refinement helps
  if (out <= 1e-12 || bd - chord > 1e-9) return out;
  for (const k of near) { // beam search around every sample within a chord: 16 sub-samples, the best 3 kept
    let beams = [[Math.max(0, (k - 1) / n), Math.min(1, (k + 1) / n)]];
    for (let i = 0; i < 20; i++) {
      const cand = [];
      for (const [x0, x1] of beams) {
        const w = (x1 - x0) / 16;
        for (let j = 0; j <= 16; j++) { const u = x0 + w * j; cand.push([D(u), Math.max(0, u - w), Math.min(1, u + w)]); }
      }
      cand.sort((x, y) => x[0] - y[0]);
      out = Math.min(out, cand[0][0]);
      beams = cand.slice(0, 3).map(([, x0, x1]) => [x0, x1]);
    }
  }
  return out;
}
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const h = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - h * dx, p[1] - a[1] - h * dy);
};
const polylineDist = (p, line) => { let d = Infinity; for (let i = 1; i < line.length; i++) d = Math.min(d, segDist(p, line[i - 1], line[i])); return d; };

describe('dubins-isochrons golden: the saved state and its cached plot', () => {
  it('dubins-isochrons: the initial settings equal the live state and evaluating them keeps the cached plot', () => {
    expect(fx.count).toBe(5);
    const init = initialState();
    for (const s of [fx.specs, fx.live, fx.snapshots[0]]) expect(toPort(s)).toEqual(toPort({ ...init, 'τ': init.tau }));
    for (const k of SCALAR) expect(fx.specs[k], k).toEqual(fx.live[k]);
    expect(fx.specs.plotReach).toEqual(fx.live.plotReach); // the same cached plot (D-DI-10)
    const { state, view } = evaluate(init);
    expect(view.recomputed).toBe(false);
    expect(state.plotReach).toBe(init.plotReach);
    expect([state.told, state.rold, state.setold]).toEqual([10, 2, '=']);
  });
  it('dubins-isochrons: the saved grey polygons are reproduced point by point', () => {
    const saved = savedIsochrons(fx.live.plotReach).polygons;
    const mine = greyPolygons(10, 2);
    expect(saved.map((p) => p.length)).toEqual([153, 153]);
    let same = 0, n = 0;
    saved.forEach((P, k) => P.forEach((pt, i) => pt.forEach((v, j) => {
      const m = mine[k][i][j];
      n++;
      if (m === v || (m === 0 && v === 0)) same++;
      // within one ulp of the terms' scale t = 10 (K-DI-03, K-DI-04): the saved cache was computed by the authoring
      // session's Mathematica with the products t (τ-1) X nested as t·((τ-1)·X); 15.0.1 and the port multiply from
      // left to right (harness H-DI-01: 50 of the 612 saved coordinates differ from 15.0.1's, by 1 ulp of 10 at most)
      else expect(Math.abs(m - v), `polygon ${k + 1} point ${i} coordinate ${j}`).toBeLessThanOrEqual(ulp(10));
    })));
    expect(n).toBe(612);
    expect(same).toBeGreaterThanOrEqual(0.9 * n); // V8's Math.sin/Math.cos and the left-to-right products: 556 of 612
  });
  it("dubins-isochrons: every point of the saved isochron lines lies on the port's curve", () => {
    const { lines, colours } = savedIsochrons(fx.live.plotReach);
    expect(lines.map((l) => l.length)).toEqual([772, 772, 984, 984]);
    expect(colours.map((c) => WORD_OF[c])).toEqual(['RS', 'LS', 'LR', 'RL']); // ColorData[97] 1–4 in the order mRS, mLS, mLR, mRL
    lines.forEach((line, k) => {
      const w = PLOT_ORDER[k], f = (s) => FORMULAS[w](s, 10, 2);
      expect(line[0]).toEqual(f(0).map((v) => v + 0));
      line.forEach((p) => expect(distToCurve(p, f, 2000)).toBeLessThanOrEqual(1e-9));
      const last = line[line.length - 1], end = f(1);
      expect(Math.hypot(last[0] - end[0], last[1] - end[1])).toBeLessThanOrEqual(1e-14);
    });
  }, 60000);
  it("dubins-isochrons: the port's isochrons are within 0.01 of the saved ParametricPlot lines", () => {
    const { lines } = savedIsochrons(fx.live.plotReach);
    const mine = isochronCurves(10, 2);
    lines.forEach((line, k) => {
      const port = mine[PLOT_ORDER[k]];
      let h = 0;
      for (const p of port) h = Math.max(h, polylineDist(p, line));
      for (const p of line) h = Math.max(h, polylineDist(p, port));
      expect(h, PLOT_ORDER[k]).toBeLessThanOrEqual(0.01);
    });
  }, 60000);
  it('dubins-isochrons: the saved plot range is within 2e-6 of the analytic extremes of the isochrons', () => {
    const [[x0, x1], [y0, y1]] = savedIsochrons(fx.live.plotReach).plotRange;
    expect([x0, x1, y0, y1]).toEqual([-8.858406252505215, 8.858406252505215, -3.716814366621081, 10]);
    // analytic extremes: max x of mRS near s = π/10, min y near s = π/5 (dense sampling, then refinement)
    const extreme = (g, sign) => {
      let a = 0, b = 1;
      for (let k = 0; k < 6; k++) {
        let best = a, bv = -Infinity;
        for (let i = 0; i <= 1000; i++) { const u = a + ((b - a) * i) / 1000, v = sign * g(u); if (v > bv) { bv = v; best = u; } }
        const w = (b - a) / 1000; a = Math.max(0, best - w); b = Math.min(1, best + w);
      }
      return sign * Math.max(sign * g(a), sign * g(b), sign * g((a + b) / 2));
    };
    const maxX = Math.max(...PLOT_ORDER.map((w) => extreme((s) => FORMULAS[w](s, 10, 2)[0], 1)));
    const minY = Math.min(...PLOT_ORDER.map((w) => extreme((s) => FORMULAS[w](s, 10, 2)[1], -1)));
    expect(Math.abs(maxX - 8.858407346)).toBeLessThan(1e-9);
    expect(Math.abs(minY - -3.716814693)).toBeLessThan(1e-9);
    expect(Math.abs(x1 - maxX)).toBeLessThanOrEqual(2e-6);
    expect(Math.abs(y0 - minY)).toBeLessThanOrEqual(2e-6);
    expect(x1).toBeLessThanOrEqual(maxX); // the saved samples lie inside the curve's extremes
    // the port's fixed samples (401 per curve) lie within 1e-4 (0.0015 px) of the extremes (D-DI-11)
    const curves = Object.values(isochronCurves(10, 2)).flat();
    expect(maxX - Math.max(...curves.map((q) => q[0]))).toBeLessThan(1e-4);
    expect(Math.min(...curves.map((q) => q[1])) - minY).toBeLessThan(1e-4);
  });
  it('dubins-isochrons: snapshot settings 2 to 4 regions agree with the saved region meshes', () => {
    const NX = 361, NY = 291, X0 = -9, Y0 = -4, H = 0.05; // a 0.05 grid over −9…9 × −4…10.5
    const raster = (polys) => {
      const g = new Uint8Array(NX * NY);
      for (const q of polys) {
        let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
        for (const [x, y] of q) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
        const i0 = Math.max(0, Math.ceil((minx - X0) / H)), i1 = Math.min(NX - 1, Math.floor((maxx - X0) / H));
        const j0 = Math.max(0, Math.ceil((miny - Y0) / H)), j1 = Math.min(NY - 1, Math.floor((maxy - Y0) / H));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const px = X0 + i * H, py = Y0 + j * H;
            let w = 0;
            for (let k = 0; k < q.length; k++) {
              const [x1, y1] = q[k], [x2, y2] = q[(k + 1) % q.length], c = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
              if (y1 <= py && y2 > py && c > 0) w++; else if (y1 > py && y2 <= py && c < 0) w--;
            }
            if (w) g[j * NX + i] = 1;
          }
        }
      }
      return g;
    };
    const port = reachRegions(10, 2);
    const portRaster = Object.fromEntries(PLOT_ORDER.map((w) => [w, raster(port[w].quads)]));
    for (const k of [2, 3, 4]) {
      const snap = fx.snapshots[k - 1];
      expect([snap.set, snap.r, snap.t]).toEqual(['≤', 2, 10]);
      const saved = savedRegions(snap.plotReach);
      for (const w of PLOT_ORDER) {
        const A = raster(saved[w].polys), B = portRaster[w];
        let either = 0, differ = 0;
        for (let i = 0; i < A.length; i++) { if (A[i] || B[i]) either++; if (A[i] !== B[i]) differ++; }
        expect(differ / either, `snapshot ${k} ${w}`).toBeLessThanOrEqual(0.005);
        // every saved boundary point lies on the image of the parameter rectangle's edges
        const f = FORMULAS[w];
        const edges = [(u) => f(0, u * 10, 2), (s) => f(s, 10, 2), (u) => f(1, u * 10, 2)];
        for (const p of saved[w].boundary) expect(Math.min(...edges.map((g) => distToCurve(p, g, 1000))), `snapshot ${k} ${w} boundary`).toBeLessThanOrEqual(1e-9);
      }
    }
  }, 120000);
});

// ---- golden-snapshot: the pictures (2× pictures; plot origin at pixel (810, 510), 24.67 px per unit)
const toPixel = ([x, y]) => [Math.round(810 + x * 24.67), Math.round(510 - y * 24.67)];
describe('dubins-isochrons golden: the snapshot pictures', () => {
  it('dubins-isochrons: snapshot 1 grey shading follows the even-odd rule', () => {
    const img = readPng('docs/original-snapshots/dubins-isochrons-1.png');
    const [P1, P2] = greyPolygons(10, 2);
    const winding = (poly, [px, py]) => {
      let w = 0;
      for (let k = 0; k < poly.length; k++) {
        const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % poly.length], c = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
        if (y1 <= py && y2 > py && c > 0) w++; else if (y1 > py && y2 <= py && c < 0) w--;
      }
      return w;
    };
    const points = [[-1, 3], [1.5, 2], [0.5, -1], [4, 2], [-5, 2], [5, -3], [6, 6], [-6, 6], [0.6, 8], [1, -3], [0.6, 12]];
    const want = [255, 255, 255, 204, 204, 204, 174, 174, 174, 255, 255];
    points.forEach((p, i) => {
      const [x, y] = toPixel(p);
      const grey = img.pixel(x, y)[0];
      expect(Math.abs(grey - want[i]), `picture at ${p}`).toBeLessThanOrEqual(3);
      // the levels follow the even-odd counts of the two polygons (0 → white, 1 → one layer, 2 → two layers)
      const layers = [P1, P2].filter((P) => winding(P, p) % 2 !== 0).length;
      expect(layers, `even-odd at ${p}`).toBe({ 255: 0, 204: 1, 174: 2 }[want[i]]);
    });
    // at (−1, 3) both winding numbers are ±2: a non-zero fill would make it dark, the picture is white
    expect(Math.abs(winding(P1, [-1, 3]))).toBe(2);
    expect(Math.abs(winding(P2, [-1, 3]))).toBe(2);
  });
  it('dubins-isochrons: snapshots 1 to 5 show the green car at the computed poses', () => {
    for (const k of [1, 3, 4, 5]) { // picture 2: the LR path is green too
      const s = toPort(fx.snapshots[k - 1]);
      const c = carState(s.path, s.r, s.t, s.tau, s.p);
      const img = readPng(`docs/original-snapshots/dubins-isochrons-${k}.png`);
      let sx = 0, sy = 0, n = 0;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const o = (y * img.width + x) * img.channels, r = img.data[o], g = img.data[o + 1], b = img.data[o + 2];
          if (g > 200 && r < 110 && b < 110) { sx += x; sy += y; n++; }
        }
      }
      const centroid = [(sx / n - 810) / 24.67, (510 - sy / n) / 24.67];
      const body = [c.cxy[0] + 0.7 * Math.cos(c.cTheta), c.cxy[1] + 0.7 * Math.sin(c.cTheta)];
      expect(Math.hypot(centroid[0] - body[0], centroid[1] - body[1]), `snapshot ${k}`).toBeLessThan(0.15);
    }
  }, 60000);
});

// ---- harness records (tools/wolfram/manipulate-harness.wls, scenarios tests/harness/dubins-isochrons.scenarios.json)
// Each test replays its scenario in the port (from the initial settings; one evaluation per step) and compares the
// captures: the car state and path graphics within 2 ulp (1e-15 absolute near 0), polySteps exactly, told/rold/setold
// exactly, whether plotReach changed per step, the Prolog polygons within 1 ulp, Table chain lengths exactly, the
// curves and regions geometrically (point-on-curve 1e-9, region coverage as T-DI-26) (TESTPLAN T-DI-29…T-DI-34).
// They skip until tests/golden/dubins-isochrons.harness.json exists.
function wlValue(v) {
  // scenario values are read lexically (LexNumber for 2 and 2.0 alike): plain doubles for the port
  if (typeof v !== 'string') return Array.isArray(v) ? v.map(wlValue) : toJS(v);
  if (!v.startsWith('wl:')) return v;
  const e = v.slice(3);
  if (e === '"\\[LessEqual]"') return '≤';
  if (/^"[^"]*"$/.test(e)) return e.slice(1, -1);
  if (!/^[-+*/ ().0-9Pi]+$/.test(e)) throw new Error(`unsupported wl value ${v}`);
  return Function('Pi', `return (${e});`)(PI);
}
const NAME = { 'τ': 'tau' };
function replay(scenario) {
  let state = initialState();
  const out = [];
  let everRecomputed = false, fromSnapshot = false;
  for (const step of scenario.steps) {
    if (step.setFrom) {
      fromSnapshot = true;
      const s = fx.snapshots[Number(step.setFrom.split(':')[1]) - 1];
      // the snapshot's cached plot is kept as it is (the port recomputes only by the cache rule)
      state = { ...toPort(s), plotReach: plain(s.plotReach) };
    }
    state = { ...state }; // a fresh object per step: earlier steps keep their evaluated state (captureEachStep)
    if (step.set) for (const [k, v] of Object.entries(step.set)) state[NAME[k] ?? k] = wlValue(v);
    const before = state.plotReach;
    const res = evaluate(state);
    state = res.state;
    everRecomputed ||= state.plotReach !== before;
    out.push({ state, view: res.view, changed: state.plotReach !== before, controlActive: step.controlActive === true, everRecomputed, fromSnapshot });
  }
  return out;
}
const tol = (b) => Math.max(2 * ulp(b), 1e-15);
function compare(name, rec, at) {
  const v = toJS(rec);
  if (name === 'plotReach') {
    // P-DI-01 (proposed): a plot recomputed by Mathematica 15.0.1 has its default style, curves and regions in
    // RGBColor[0.24, 0.6, 0.8], [0.95, 0.627, 0.1425], [0.455, 0.7, 0.21], [0.922526, 0.385626, 0.209179] with
    // AbsoluteThickness[2]; the notebook's saved plots (the authoring version) and the port use ColorData[97]'s first
    // four colours and AbsoluteThickness[1.6]
    if (!at.everRecomputed && !at.fromSnapshot) expect(findHeads(rec, 'RGBColor').slice(0, 4).map((c) => toJS(c.args))).toEqual(PLOT_ORDER.map((w) => PLOT_COLOURS[w]));
    else if (at.changed || at.everRecomputed) {
      expect(findHeads(rec, 'RGBColor').slice(0, 4).map((c) => toJS(c.args))).toEqual([[0.24, 0.6, 0.8], [0.95, 0.627, 0.1425], [0.455, 0.7, 0.21], [0.922526, 0.385626, 0.209179]]);
      expect(toJS(findHeads(rec, 'AbsoluteThickness')[0].args)).toEqual([2]);
      expect(PLOT_ORDER.map((w) => PLOT_COLOURS[w])[0]).toEqual([0.368417, 0.506779, 0.709798]);
    }
    if (at.state.plotReach.polygons) {
      const polys = findHeads(rec, 'Polygon').map((p) => toJS(p.args[0]));
      const mine = at.state.plotReach.polygons;
      if (polys.length === 2 && typeof polys[0][0][0] === 'number') {
        // bit for bit except the last bits of Math.sin/Math.cos (K-DI-03): at least 95 % of the coordinates identical,
        // the others within one ulp of the terms' scale max(t, r) (harness run 2: at most 1 ulp of it, 3.5 % differ)
        const scale = ulp(Math.max(at.state.t, at.state.r));
        // not recomputed since the start (H-DI-14 steps 1–4, H-DI-22): the record holds the notebook's saved cache,
        // computed by the authoring session's Mathematica (bit for bit the fixture's), so the rule of the saved-polygon
        // test applies (at least 90 % identical)
        const cached = !at.everRecomputed && !at.fromSnapshot;
        if (cached) expect(polys).toEqual(savedIsochrons(fx.live.plotReach).polygons);
        let n = 0, same = 0;
        polys.forEach((P, k) => {
          expect(P.length, `polygon ${k + 1} length`).toBe(mine[k].length);
          P.forEach((pt, i) => pt.forEach((x, j) => {
            const m = mine[k][i][j];
            n++;
            if (m === x || (m === 0 && x === 0)) same++;
            else expect(Math.abs(m - x), `polygon ${k + 1} point ${i} coordinate ${j}`).toBeLessThanOrEqual(Math.max(ulp(x), scale));
          }));
        });
        expect(same, 'bit-identical polygon coordinates').toBeGreaterThanOrEqual((cached ? 0.9 : 0.95) * n);
      }
      const lines = findHeads(rec, 'Line').map((l) => toJS(l.args[0]));
      lines.forEach((line, k) => { const f = (s) => FORMULAS[PLOT_ORDER[k]](s, at.state.t, at.state.r); for (const p of line) expect(distToCurve(p, f, 2000)).toBeLessThanOrEqual(1e-9); });
    }
    return;
  }
  const map = { maxAlpha: 'maxAlpha', cxy: 'cxy', cTheta: 'cTheta', cAlpha: 'cAlpha', fs: 'fs', polySteps: 'polySteps' };
  if (name in map) {
    const mine = at.view[map[name]];
    const cmp = (a, b) => (Array.isArray(b) ? b.forEach((x, i) => cmp(a[i], x)) : expect(Math.abs(a - b), `${name}: port ${a}, harness ${b}`).toBeLessThanOrEqual(name === 'polySteps' ? 0 : tol(b)));
    cmp(mine, v);
    return;
  }
  if (['told', 'rold', 'setold'].includes(name)) {
    if (at.controlActive && name !== 'setold') return; // ControlActive is not modelled (D-DI-08): the port sets told/rold always
    expect(at.state[name]).toEqual(v === '\\[LessEqual]' || v === '<=' ? '≤' : v);
    return;
  }
  if (name === 'pathGraphics') {
    const circles = findHeads(rec, 'Circle').map((c) => toJSNumeric(c.args)); // Circle[{r, 0}, r, {Pi, …}]: the symbol Pi
    const mine = Cases(at.view.pathGraphics.pieces, 'Circle'); // the port's pieces are Graphics data (v0.1.21)
    expect(circles.length).toBe(mine.length);
    circles.forEach(([c, r, [a1, a2]], i) => { [...c, r, a1, a2].forEach((x, j) => expect(Math.abs([...mine[i].c, mine[i].r, ...mine[i].angles][j] - x)).toBeLessThanOrEqual(tol(x))); });
  }
}
const SCENARIOS = [
  ['H-DI-01', 'dubins-isochrons harness H-DI-01: forced first computation at r 2, t 10'],
  ['H-DI-02', 'dubins-isochrons harness H-DI-02: the reachable regions at r 2, t 10'],
  ['H-DI-03', 'dubins-isochrons harness H-DI-03: the LS branch'],
  ['H-DI-04', 'dubins-isochrons harness H-DI-04: the RL branch of snapshot 3'],
  ['H-DI-05', 'dubins-isochrons harness H-DI-05: the LR branch of snapshot 2'],
  ['H-DI-06', 'dubins-isochrons harness H-DI-06: RS of snapshot 5'],
  ['H-DI-07', 'dubins-isochrons harness H-DI-07: the switching instant'],
  ['H-DI-08', 'dubins-isochrons harness H-DI-08: tau beyond t'],
  ['H-DI-09', 'dubins-isochrons harness H-DI-09: p 0'],
  ['H-DI-10', 'dubins-isochrons harness H-DI-10: still in the first turn'],
  ['H-DI-11', 'dubins-isochrons harness H-DI-11: Table with step 0.0245'],
  ['H-DI-12', 'dubins-isochrons harness H-DI-12: Table with step 0.0125'],
  ['H-DI-13', 'dubins-isochrons harness H-DI-13: Table with step 0.0072'],
  ['H-DI-14', 'dubins-isochrons harness H-DI-14: the plot cache'],
  ['H-DI-15', 'dubins-isochrons harness H-DI-15: machine r and t with the cache forced'],
  ['H-DI-16', 'dubins-isochrons harness H-DI-16: the smallest set'],
  ['H-DI-17', 'dubins-isochrons harness H-DI-17: curves with many turns'],
  ['H-DI-18', 'dubins-isochrons harness H-DI-18: regions at the extreme'],
  ['H-DI-19', 'dubins-isochrons harness H-DI-19: snapshot 4 recomputed'],
  ['H-DI-20', 'dubins-isochrons harness H-DI-20: before the switch on the LR path'],
  ['H-DI-21', 'dubins-isochrons harness H-DI-21: ControlActive during a drag'],
  ['H-DI-22', 'dubins-isochrons harness H-DI-22: the initial settings keep the cached plot'],
  ['H-DI-23', 'dubins-isochrons harness H-DI-23: snapshot 2 recomputed'],
];

describe('dubins-isochrons golden: Mathematica harness', () => {
  for (const [id, title] of SCENARIOS) {
    it(title, (ctx) => {
      const h = harnessCase('dubins-isochrons', id);
      if (h.status !== 'ok') return ctx.skip(h.reason);
      const steps = replay(h.scenario);
      const each = h.scenario.captureEachStep;
      steps.forEach((at, i) => {
        if (!each && i < steps.length - 1) return;
        for (const name of h.scenario.capture) compare(name, captureOf(h.record, name, each ? { step: i + 1 } : {}), at);
      });
    }, 120000);
  }
});
