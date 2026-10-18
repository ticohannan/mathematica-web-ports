// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/golden/manipulator-workspaces.golden.test.js — the port against values the ORIGINAL stored or drew:
//  * the live state (states[0]), the initial settings (specs) and the eight snapshot cells' Settings (raw notebook lines
//    8885, 11436, 13864, 15630, 17367, 19228, 21886, 24150), each with the original's ParametricPlot3D output
//    workspace3D (tests/golden/manipulator-workspaces.original-states.json, written by
//    `python3 tools/extract_state.py --snapshots <notebook> …`);
//  * what only the pictures docs/original-snapshots/manipulator-workspaces-1.png … -8.png show: the width of the ground
//    disc (pixels of the snapshots at 2 px per pt);
//  * the Mathematica-harness records H-MW-01 … H-MW-23 (tests/golden/manipulator-workspaces.harness.json, read through
//    tests/support/harness-json.js). These SKIP with the documented reason until the owner's harness run exists.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { harnessCase, captureOf, toJS, asHeadArgs, exactDouble, isMachineReal, sameDouble } from '../support/harness-json.js';
import {
  TYPES, initialState, initialSettings, evaluate, workspaceSurfaces, sampleSpeedSurface, typeOf, typeIndexOfStored,
  jointLabels, fitCamera, groundWidthFraction, MW_ZOOM, MESH_STYLE, BOUNDARY_STYLE, TYPE_NAMES, selectType,
} from '../../demos/manipulator-workspaces/model.js';
import { NAMED } from '../../shared/mma-colors.js';
import { flatten, cuboidCorners } from '../../demos/common/g3d.js';

const fx = JSON.parse(fs.readFileSync('tests/golden/manipulator-workspaces.original-states.json', 'utf8'));
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** a stored Manipulate state (live state, specs or snapshot Settings) as a port state */
function portState(S) {
  return {
    Type: typeIndexOfStored(S.Type), TypeOld: typeIndexOfStored(S.TypeOld), params: S.params.slice(),
    r1: S.r1.slice(), r2: S.r2.slice(), r3: S.r3.slice(), r1old: S.r1old.slice(), r2old: S.r2old.slice(), r3old: S.r3old.slice(),
  };
}
/** the parts of a stored workspace3D: vertices, polygon groups (directives + polygons), the line groups */
function storedGraphic(g) {
  const a = g.args[0];
  const gc = Array.isArray(a) ? a[0] : a;
  const [verts, [polys, lines]] = gc.args;
  return { verts, polys: polys.filter((p) => p.length), lines: lines.filter((p) => p.length), options: g.args[1] };
}
/** the port's 9 surfaces (grids, mesh lines, boundaries) and their functions for robot iType and ranges */
function portSurfaces(iType, r1, r2, r3) {
  const fs9 = workspaceSurfaces(typeOf(iType), r1, r2, r3);
  return { fs: fs9, s: fs9.map(sampleSpeedSurface) };
}
/** distance of p from the nearest of the points */
const nearestDist = (p, pts) => {
  let m = Infinity;
  for (const q of pts) { const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], d = dx * dx + dy * dy + dz * dz; if (d < m) m = d; }
  return Math.sqrt(m);
};
/**
 * Distance of p from the surface f (parameters in [0, 1]²): Gauss-Newton on |f(a, b) - p|² from the best of a dense
 * parameter grid (independent of the port's sampling). Returns {d, a, b}.
 */
function onSurface(f, p) {
  let best = { d: Infinity, a: 0, b: 0 };
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
    const d = dist(f(i / 40, j / 40), p);
    if (d < best.d) best = { d, a: i / 40, b: j / 40 };
  }
  let { a, b } = best;
  const h = 1e-7;
  for (let it = 0; it < 30; it++) {
    const q = f(a, b), r = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const fa = f(Math.min(1, a + h), b).map((v, k) => (v - q[k]) / (Math.min(1, a + h) - a || -h));
    const fb = f(a, Math.min(1, b + h)).map((v, k) => (v - q[k]) / (Math.min(1, b + h) - b || -h));
    const A = [[fa[0] * fa[0] + fa[1] * fa[1] + fa[2] * fa[2], fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2]], [0, fb[0] * fb[0] + fb[1] * fb[1] + fb[2] * fb[2]]];
    A[1][0] = A[0][1];
    const g = [fa[0] * r[0] + fa[1] * r[1] + fa[2] * r[2], fb[0] * r[0] + fb[1] * r[1] + fb[2] * r[2]];
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (!(Math.abs(det) > 1e-300)) break;
    const da = (A[1][1] * g[0] - A[0][1] * g[1]) / det, db = (A[0][0] * g[1] - A[1][0] * g[0]) / det;
    a = Math.min(1, Math.max(0, a - da)); b = Math.min(1, Math.max(0, b - db));
    if (Math.abs(da) + Math.abs(db) < 1e-16) break;
  }
  return { d: dist(f(a, b), p), a, b };
}
/**
 * Classify the stored vertices against the port: grid (within 2e-15 of a port grid vertex), near (within 1e-6 of one)
 * and the rest; for the rest, the surface each lies on (residual < 1e-9) and its parameters.
 */
function classify(verts, port) {
  const grid = port.s.flatMap((s) => s.grid.flat());
  const out = { grid: 0, near: 0, gridMax: 0, rest: [] };
  for (const p of verts) {
    const d = nearestDist(p, grid);
    if (d <= 2e-15) { out.grid++; out.gridMax = Math.max(out.gridMax, d); } else if (d <= 1e-6) out.near++;
    else {
      // the first surface (where Mathematica refined) first, then the others
      let on = { k: 0, ...onSurface(port.fs[0], p) };
      for (let k = 1; k < port.fs.length && !(on.d < 1e-9); k++) { const o = onSurface(port.fs[k], p); if (o.d < on.d) on = { k, ...o }; }
      out.rest.push({ p, ...on });
    }
  }
  return out;
}

describe('manipulator-workspaces golden: saved states and snapshot Settings', () => {
  it('manipulator workspaces: the saved Manipulate variables are the opening state of the port', () => {
    const S = fx.states[0];
    expect(S.dof).toBe(3);
    expect(portState(S)).toEqual(initialState());
    expect(TYPE_NAMES[typeIndexOfStored(S.Type) - 1]).toBe('planar robot arm');
    // the live state equals snapshot 1's Settings; the initial settings hold the elbow arm (COMMON-DECISIONS §6)
    expect(portState(fx.snapshots[1])).toEqual(initialState());
    expect(portState(fx.specs)).toEqual(initialSettings());
    // TypeOld = Type: the opening evaluation does not recompute
    expect(evaluate(portState(S)).view.recomputed).toBe(false);
    expect(evaluate(portState(fx.specs)).view.recomputed).toBe(false);
  });
  it('manipulator workspaces: the snapshot Settings name the robot of each picture and its joint types give the labels theta or d', () => {
    const want = {
      1: ['planar robot arm', ['θ1', 'θ2', 'θ3']], 2: ['spherical robot arm', ['θ1', 'θ2', 'd3']], 3: ['SCARA robot arm', ['θ1', 'θ2', 'd3']],
      4: ['CNC robot arm', ['d1', 'd2', 'd3']], 5: ['planar RPR arm', ['θ1', 'd2', 'θ3']], 6: ['cylindrical robot arm', ['θ1', 'd2', 'd3']],
      7: ['Stanford robot arm', ['θ1', 'θ2', 'd3']], 8: ['Cartesian robot arm', ['d1', 'd2', 'd3']],
    };
    for (let k = 1; k <= 8; k++) {
      const S = fx.snapshots[k];
      const t = typeIndexOfStored(S.Type);
      expect(TYPE_NAMES[t - 1], `snapshot ${k}`).toBe(want[k][0]);
      expect(S.Type[0]).toEqual(TYPES[t - 1][0]);
      expect(jointLabels(t)).toEqual(want[k][1]);
      expect(typeIndexOfStored(S.TypeOld)).toBe(t);
      expect(S.params).toEqual([0.5, 0.5, 0.5]);
    }
  });
  it('manipulator workspaces: the snapshot ranges lie on a 0.01 grid although the stored step is 0.1', () => {
    const lo = [[2, 'r1', 350], [3, 'r1', 358], [4, 'r1', 347], [6, 'r1', 364], [7, 'r1', 222], [7, 'r2', 222], [8, 'r1', 358], [2, 'r2', 220]];
    for (const [k, r, n] of lo) expect(fx.snapshots[k][r][0], `snapshot ${k} ${r}`).toBe(-3.1 + n * 0.01);
    expect(fx.snapshots[5].r1).toEqual([0.5, 1.8400000000000003]);
    expect(fx.snapshots[2].r1[1]).toBe(1.5000000000000004); // = -3.1 + 46·0.1
    expect(-3.1 + 46 * 0.1).toBe(1.5000000000000004);
    expect(fx.snapshots[7].r1[1]).toBe(0.9300000000000002);
    expect(-3.1 + 403 * 0.01).toBe(0.9300000000000002);
    expect(fx.snapshots[2].r2[1]).toBe(0.8999999999999999);
    for (const k of [3, 4, 6, 8]) expect(fx.snapshots[k].r1[1]).toBe(1.4999999999999996);
    expect(-3.1 + 460 * 0.01).not.toBe(1.4999999999999996); // not k·0.01 …
    expect(-3.1 + (6.2 * 460) / 620).toBe(1.4999999999999996); // … but min + (max - min)·k/n
  });
});

describe('manipulator-workspaces golden: the original\'s workspace3D against the port grid', { timeout: 60000 }, () => {
  const R = [0.5, 1.5];
  it('manipulator workspaces: 969 of the 1105 saved planar workspace vertices are the port grid vertices to 2e-15', () => {
    const g = storedGraphic(fx.states[0].workspace3D);
    expect(g.verts).toHaveLength(1105);
    const c = classify(g.verts, portSurfaces(1, R, R, R));
    expect(c.grid).toBe(969);
    expect(c.gridMax).toBeLessThanOrEqual(2e-15);
  });
  it('manipulator workspaces: all 1105 saved planar vertices lie on the port surfaces within 1e-6', () => {
    const g = storedGraphic(fx.states[0].workspace3D);
    const port = portSurfaces(1, R, R, R);
    const c = classify(g.verts, port);
    expect(c.near).toBe(120); // surface 1 sampled on a domain shrunk by ~1.1e-7 (D-MW-01)
    expect(c.rest).toHaveLength(16); // mid-cell points on surface 1's mesh lines
    for (const r of c.rest) {
      expect(r.d).toBeLessThan(1e-9);
      expect(Math.min(Math.abs(r.a - 0.5), Math.abs(r.b - 0.5))).toBeLessThan(1e-6);
    }
  });
  it('manipulator workspaces: the stored elbow workspace of the initial settings matches the port grid in the same way', () => {
    const g = storedGraphic(fx.specs.workspace3D);
    expect(g.verts).toHaveLength(1105);
    const c = classify(g.verts, portSurfaces(2, R, R, R));
    expect(c.grid).toBe(969);
    expect(c.grid + c.near + c.rest.length).toBe(1105);
    for (const r of c.rest) expect(r.d).toBeLessThan(1e-9);
  });
  it('manipulator workspaces: the saved boundary and mesh lines lie on the port boundary and middle lines', () => {
    const g = storedGraphic(fx.states[0].workspace3D);
    const port = portSurfaces(1, R, R, R);
    const P = (i) => g.verts[i - 1];
    const boundary = g.lines.filter((l) => l[1].head === 'Line' && l[0].head === 'Directive');
    expect(boundary).toHaveLength(9);
    boundary.forEach((l, k) => {
      const idx = l[1].args[0];
      expect(idx).toHaveLength(41);
      for (const i of idx) expect(nearestDist(P(i), port.s[k].boundary), `boundary ${k + 1}`).toBeLessThanOrEqual(1e-6);
    });
    const mesh = g.lines.filter((l) => l[0].head === 'GrayLevel');
    expect(mesh).toHaveLength(2);
    for (const group of mesh) {
      const ls = group.slice(1).map((x) => x.args[0]);
      expect(ls.map((x) => x.length)).toEqual([19, 11, 11, 11, 11, 11, 11, 11, 11]);
      ls.forEach((idx, k) => {
        const pts = port.s[k].mesh.flat();
        let extra = 0;
        for (const i of idx) {
          if (nearestDist(P(i), pts) <= 1e-6) continue;
          extra++;
          const on = onSurface(port.fs[k], P(i));
          expect(on.d).toBeLessThan(1e-9);
          expect(Math.min(Math.abs(on.a - 0.5), Math.abs(on.b - 0.5))).toBeLessThan(1e-6);
        }
        expect(extra).toBe(k === 0 ? 8 : 0);
      });
    }
  });
  it('manipulator workspaces: the 8 snapshot workspaces match the port grid of their robots and ranges', () => {
    for (let k = 1; k <= 8; k++) {
      const S = fx.snapshots[k];
      const t = typeIndexOfStored(S.TypeOld);
      const g = storedGraphic(S.workspace3D);
      expect(g.verts, `snapshot ${k}`).toHaveLength(1105);
      const c = classify(g.verts, portSurfaces(t, S.r1old, S.r2old, S.r3old));
      expect(c.grid, `snapshot ${k} (${TYPE_NAMES[t - 1]})`).toBe(k === 2 ? 987 : 969);
      expect(c.rest.length, `snapshot ${k}`).toBe(k === 2 ? 8 : 16);
      for (const r of c.rest) {
        expect(r.d, `snapshot ${k}`).toBeLessThan(1e-9);
        expect(r.k, `snapshot ${k}: the refined points are on surface 1`).toBe(0);
      }
    }
  });
  it('manipulator workspaces: saved styles are LightBlue, Opacity 0.5, Blue boundary, GrayLevel 0.2 mesh', () => {
    const g = storedGraphic(fx.states[0].workspace3D);
    expect(g.polys).toHaveLength(9);
    for (const p of g.polys) {
      expect(p[0]).toEqual({ head: 'EdgeForm', args: [] });
      expect(p[2]).toEqual({ head: 'RGBColor', args: [0.87, 0.94, 1] });
      expect(p[3]).toEqual({ head: 'Opacity', args: [0.5] });
    }
    expect(NAMED.LightBlue).toEqual([0.87, 0.94, 1]);
    const blue = g.lines[0][0].args[0];
    expect(blue).toEqual({ head: 'RGBColor', args: [0, 0, 1] });
    expect(BOUNDARY_STYLE.value).toEqual(blue.args);
    const gray = g.lines.find((l) => l[0].head === 'GrayLevel')[0];
    expect(gray.args).toEqual([0.2]);
    expect(MESH_STYLE.value).toEqual([0.2, 0.2, 0.2]);
    // the port's workspace graphic carries the same directives
    const prims = flatten(evaluate(initialState()).view.ws.graphic);
    const polys = prims.filter((p) => p.type === 'polygon');
    expect(polys).toHaveLength(900);
    expect(polys.every((p) => p.edgeForm === 'None' && p.opacity === 0.5 && p.color === NAMED.LightBlue)).toBe(true);
    // the saved graphic has Axes -> True (dropped by the combined graphic, K-MW-02)
    expect(g.options.some((o) => o.head === 'Rule' && o.args[0].sym === 'Axes' && o.args[1] === true)).toBe(true);
  });
  it('manipulator workspaces: with one zoom the ground disc widths of snapshots 1 to 7 are reproduced within 4 %, snapshot 8 is drawn more than 8 % smaller', () => {
    // widths of the peach disc top in the snapshot pictures (2 px per pt): 721, 654, 703, 734, 589, 654, 654, 796 px
    const want = [360.5, 327, 351.5, 367, 294.5, 327, 327, 398];
    const got = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => groundWidthFraction(fitCamera(evaluate(portState(fx.snapshots[k])).view.box, { zoom: MW_ZOOM })) * 425);
    got.slice(0, 7).forEach((w, i) => expect(Math.abs(w / want[i] - 1), `snapshot ${i + 1}: ${w.toFixed(1)} pt vs ${want[i]}`).toBeLessThanOrEqual(0.04));
    expect(got[7] / want[7] - 1).toBeLessThan(-0.08); // K-MW-08
  });
});

// ------------------------------------------------------------------------------------------- Mathematica harness
const QT = '{{"r"},{0},{-Pi/2},{1},{Subscript[q,1]}}'; // the Input cell's TypeOld: forces a recompute
/** a "wl:" DH table → the index of the port's TYPES (0 for QT and other tables of one joint) */
function typeFromWl(v) {
  const w = String(v).replace(/^wl:/, '').replace(/\s/g, '');
  if (w === QT.replace(/\s/g, '')) return 0;
  const json = w.replace(/Subscript\[q,(\d)\]/g, '"q$1"').replace(/(-?)(\d*)Pi(\/(\d+))?/g, (m, s, n, d, den) => String((s ? -1 : 1) * (n ? Number(n) : 1) * Math.PI / (den ? Number(den) : 1)))
    .replace(/(\d+)\/(\d+)/g, (m, a, b) => String(Number(a) / Number(b))).replace(/\{/g, '[').replace(/\}/g, ']').replace(/(^|[,[])\.(\d)/g, '$10.$2').replace(/-0(?=[,\]])/g, '0');
  const T = JSON.parse(json);
  const t = typeIndexOfStored(T);
  if (!t) throw new Error(`table not in the popup: ${w}`);
  return t;
}
/** replay a scenario through the port (start: the initial settings, COMMON-DECISIONS §6) */
function replay(scenario) {
  let st = initialSettings();
  let cache = null;
  const runs = [];
  for (const step of scenario.steps) {
    if (step.setFrom) st = portState(fx.snapshots[Number(String(step.setFrom).split(':')[1])]);
    else {
      for (const [k, raw] of Object.entries(step.set ?? {})) {
        if (k === 'Type') st = selectType(st, typeFromWl(raw));
        else if (k === 'TypeOld') st.TypeOld = typeFromWl(raw);
        else st[k] = toJS(raw);
      }
    }
    const r = evaluate(st, cache);
    st = r.state; cache = r.cache;
    runs.push({ st, view: r.view });
  }
  return runs;
}
/** a captured TransformationFunction or matrix → 4x4 numbers */
const matrixOf = (rec) => {
  const v = asHeadArgs(rec); // HW-45 {"h", "a"} → {head, args}
  if (Array.isArray(v) && Array.isArray(v[0][0])) return v;
  if (Array.isArray(v)) return v;
  if (v && v.head === 'TransformationFunction') return toJS(v.args[0]);
  throw new Error(`not a transform: ${JSON.stringify(v).slice(0, 80)}`);
};
const closeM = (A, B, tol, what) => A.forEach((r, i) => r.forEach((x, j) => expect(Math.abs(x - B[i][j]), `${what}[${i}][${j}]`).toBeLessThanOrEqual(tol)));
/** every vertex of a recorded workspace3D lies on the port surfaces of that evaluation (grid vertices within 1e-14) */
function checkWorkspace(rec, view, what) {
  const g = storedGraphic(asHeadArgs(rec)); // HW-45 {"h", "a"} → the fixtures' {head, args}
  const port = { fs: workspaceSurfaces(typeOf(view.wsType), ...view.wsRanges), s: view.ws.surfaces };
  // K-MW-07 (resolved by the 21 recorded workspaces): "Speed" sampling always gives 1105 vertices (9 × 121 grid
  // points + 16 on surface 1's mesh lines), also for full and wrapping ranges (H-MW-19, H-MW-21); D-MW-01 holds
  expect(g.verts, what).toHaveLength(1105);
  const c = classify(g.verts, port);
  expect(c.grid + c.near, `${what}: vertices at the port grid (2e-15) or near it (1e-6)`).toBeGreaterThanOrEqual(1081);
  expect(c.rest.length, what).toBeLessThanOrEqual(24);
  for (const r of c.rest) expect(r.d, `${what}: vertex ${JSON.stringify(r.p)}`).toBeLessThan(1e-6);
  return c;
}
/** a recorded machine number against the port's double, bit for bit */
const sameReal = (rec, x, what) => {
  expect(isMachineReal(rec), `${what} is a machine real`).toBe(true);
  expect(sameDouble(exactDouble(rec), x), `${what}: ${exactDouble(rec)} (recorded) vs ${x}`).toBe(true);
};
function check(ctx, id, extra = () => {}) {
  const h = harnessCase('manipulator-workspaces', id);
  if (h.status !== 'ok') return ctx.skip(h.reason);
  const runs = replay(h.scenario);
  runs.forEach((r) => { r.view.wsType = r.st.TypeOld; r.view.wsRanges = [r.st.r1old, r.st.r2old, r.st.r3old]; });
  const each = h.scenario.captureEachStep;
  const steps = each ? runs.map((r, k) => [r, k + 1]) : [[runs[runs.length - 1], null]];
  for (const [run, step] of steps) {
    const cap = (name) => captureOf(h.record, name, { step });
    for (const name of h.scenario.capture) {
      if (name === 'pm') cap(name).forEach((v, i) => sameReal(v, run.view.pm[i], `pm[${i + 1}]`));
      // Td bit for bit: Chop acts (H-AC-14) and the products are Mathematica's fused machine Dot (Q-MW-09)
      if (name === 'wl:Table[Td[i],{i,1,dof}]') {
        cap(name).forEach((T, i) => {
          expect(T.h).toBe('TransformationFunction');
          T.a[0].forEach((row, r) => row.forEach((e, c) => sameReal(e, run.view.Td[i][r][c], `Td[${i + 1}][${r + 1},${c + 1}]`)));
        });
      }
      if (['r1old', 'r2old', 'r3old'].includes(name)) expect(toJS(cap(name))).toEqual(run.st[name]);
      if (name === 'TypeOld') expect(typeIndexOfStored(toJS(cap(name)))).toBe(run.st.TypeOld);
      if (name === 'workspace3D') checkWorkspace(cap(name), run.view, `${id} workspace3D`);
      // True here only because Td[dof] is already chopped (Td[i] = Chop[…]); Chop does act on a TransformationFunction (H-AC-14)
      if (name === 'wl:Chop[Td[dof]] === Td[dof]') expect(cap(name)).toBe(true);
    }
  }
  extra(runs, h);
  return undefined;
}

// the robot of the scenario recomputed (TypeOld forced to the Input cell's one-joint table)
const recomputedLast = (runs) => expect(runs[runs.length - 1].view.recomputed).toBe(true);

describe('manipulator-workspaces golden: Mathematica harness records', { timeout: 120000 }, () => {
  it('manipulator workspaces: every harness scenario replays through the port (robot tables of the scenarios are popup entries)', () => {
    const file = JSON.parse(fs.readFileSync('tests/harness/manipulator-workspaces.scenarios.json', 'utf8'));
    expect(file.scenarios).toHaveLength(23);
    for (const sc of file.scenarios) {
      const runs = replay(sc);
      expect(runs.length, sc.id).toBe(sc.steps.length);
    }
    expect(typeFromWl(`wl:${QT}`)).toBe(0);
    expect(typeFromWl('wl:{{"r","r","p"},{1.2,.6,0},{0,Pi,0},{1.5,0,Subscript[q,3]},{Subscript[q,1],Subscript[q,2],0}}')).toBe(10);
    expect(typeFromWl('wl:{{"p","p","p"},{0,0,0},{0,0,-0},{Subscript[q,1],Subscript[q,2],Subscript[q,3]},{0,0,0}}')).toBe(14);
    // H-MW-22: planar, then back to the elbow arm of the initial settings: two recomputes
    const h22 = replay(file.scenarios.find((x) => x.id === 'H-MW-22'));
    expect(h22.map((r) => [r.st.TypeOld, r.view.recomputed])).toEqual([[1, true], [2, true]]);
  });
  // one test per scenario, titled harness "H-MW-nn" (HW-65); they skip until tests/golden/manipulator-workspaces.harness.json exists
  it('harness "H-MW-01"', (ctx) => check(ctx, 'H-MW-01', (runs) => expect(runs[0].view.recomputed).toBe(false)));
  it('harness "H-MW-02"', (ctx) => check(ctx, 'H-MW-02', recomputedLast));
  it('harness "H-MW-03"', (ctx) => check(ctx, 'H-MW-03', recomputedLast));
  it('harness "H-MW-04"', (ctx) => check(ctx, 'H-MW-04', recomputedLast));
  it('harness "H-MW-05"', (ctx) => check(ctx, 'H-MW-05', recomputedLast));
  it('harness "H-MW-06"', (ctx) => check(ctx, 'H-MW-06', recomputedLast));
  it('harness "H-MW-07"', (ctx) => check(ctx, 'H-MW-07', recomputedLast));
  it('harness "H-MW-08"', (ctx) => check(ctx, 'H-MW-08', recomputedLast));
  it('harness "H-MW-09"', (ctx) => check(ctx, 'H-MW-09', recomputedLast));
  it('harness "H-MW-11"', (ctx) => check(ctx, 'H-MW-11', recomputedLast));
  it('harness "H-MW-12"', (ctx) => check(ctx, 'H-MW-12', recomputedLast));
  it('harness "H-MW-13"', (ctx) => check(ctx, 'H-MW-13', recomputedLast));
  it('harness "H-MW-14"', (ctx) => check(ctx, 'H-MW-14', recomputedLast));
  it('harness "H-MW-15"', (ctx) => check(ctx, 'H-MW-15', recomputedLast));
  it('harness "H-MW-16"', (ctx) => check(ctx, 'H-MW-16', recomputedLast));
  it('harness "H-MW-10"', (ctx) => check(ctx, 'H-MW-10', (runs) => expect(runs[0].view.recomputed).toBe(false)));
  it('harness "H-MW-17"', (ctx) => check(ctx, 'H-MW-17', (runs, h) => {
    // %primitives records heads and dimensions only (HW-43 §6.1), not coordinates, so the reversed Cuboid corners of
    // K-MW-03 are not in the record (N-MW-09; a %g3d capture would decide it). What it does decide: the robot's
    // primitives in order — ground Cylinder, per joint the coordinate axes (Line, Rotate[Line], Rotate[Line]) and
    // three Cuboids (joints 2 and 3 in a GeometricTransformation), the wrist centre (axes and Point, transformed) — as
    // the port draws them.
    const prims = captureOf(h.record, '%primitives');
    const robot = prims.list.slice(0, prims.list.findIndex((p) => p.h === 'Point') + 1);
    const axes = ['Line', 'Rotate', 'Line', 'Rotate', 'Line'], joint = [...axes, 'Cuboid', 'Cuboid', 'Cuboid'], GT = 'GeometricTransformation';
    expect(robot.map((p) => p.h)).toEqual(['Cylinder', ...joint, GT, ...joint, GT, ...joint, GT, ...axes, 'Point']); // wrapper before its content
    expect(robot.filter((p) => p.h === 'Line').every((p) => JSON.stringify(toJS(p.dims)) === '[5,2,3]')).toBe(true);
    const cnt = (t) => runs[0].view.robotPrims.filter((p) => p.type === t).length;
    expect([cnt('cylinder'), cnt('cuboid'), cnt('point'), cnt('line')]).toEqual([1, 9, 1, 12 * 5]);
    const cub = runs[0].view.robotPrims.filter((p) => p.type === 'cuboid');
    expect(cub.some((c) => cuboidCorners(c).min[2] !== c.min[2])).toBe(true); // the port's reversed corner pair (K-MW-03 open)
  }));
  it('harness "H-MW-18"', (ctx) => check(ctx, 'H-MW-18', (runs) => expect(runs[0].view.recomputed).toBe(false)));
  it('harness "H-MW-19"', (ctx) => check(ctx, 'H-MW-19'));
  it('harness "H-MW-20"', (ctx) => check(ctx, 'H-MW-20', (runs, h) => {
    // K-MW-02 resolved: the Show graphic has Axes -> False, Boxed -> False, SphericalRegion -> True (the first graphic's
    // options; workspace3D's Axes -> True does not survive), ImageSize {425, 425}
    const [o] = captureOf(h.record, '%options:Axes,Boxed,SphericalRegion,ImageSize,PlotRange');
    expect(o.head).toBe('Graphics3D');
    const val = (k) => toJS(o.options[k][0].a[1]);
    expect([val('Axes'), val('Boxed'), val('SphericalRegion'), val('ImageSize')]).toEqual([false, false, true, [425, 425]]);
    expect(runs[0].view.graphic.options).toEqual({ SphericalRegion: true, ImageSize: 425, Boxed: false });
    // PlotRange All → the kernel's computed range = the port's bounding box of all shown objects (D-MW-04 input)
    const [pr] = captureOf(h.record, '%plotRange');
    expect([pr.method, toJS(pr.storedOption)]).toEqual(['AbsoluteOptions', { sym: 'All' }]);
    closeM(runs[0].view.box, toJS(pr.value), 0, 'PlotRange');
    expect(val('PlotRange')).toEqual(toJS(pr.value));
  }));
  it('harness "H-MW-21"', (ctx) => check(ctx, 'H-MW-21'));
  it('harness "H-MW-22"', (ctx) => check(ctx, 'H-MW-22', (runs) => expect(runs.map((r) => [r.st.TypeOld, r.view.recomputed])).toEqual([[1, true], [2, true]])));
  it('harness "H-MW-23"', (ctx) => check(ctx, 'H-MW-23', (runs) => {
    expect(runs.map((r) => r.view.pm)).toEqual([[0.5, 0.5, 0.5], [1.5, 1.5, 1.5]]);
    expect(runs.every((r) => !r.view.recomputed)).toBe(true);
  }));
});
