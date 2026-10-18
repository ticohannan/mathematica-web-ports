// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/manipulator-workspaces/model.js — one evaluation of the Manipulate body of "Robot Manipulator Workspaces"
// (pure: no DOM, no three.js): the 14 DH tables of the popup menu, the Manipulate variables (live state and initial
// settings), pm, the recompute test, the nine workspace surfaces sampled as ParametricPlot3D's "Speed" result
// (11 × 11 grid, one mesh line per direction, the boundary), Ad, Td and the combined graphic as Graphics3D data.
// Names and order of operations follow the original (docs/original-source/manipulator-workspaces.txt).
import { mUnequal } from '../../shared/mma.js';
import { joints, makeO3coords, computeAd, computeTd, DOF } from '../common/dh-chain.js';
import { drawJoint, drawWristCenter, GROUND } from '../common/robot-draw.js';
import {
  Graphics3D, GeometricTransformation, Polygon, Line, EdgeForm, LightBlue, Opacity, RGBColor, flatten, primitiveBounds,
} from '../common/g3d.js';

const PI = Math.PI;

/** The popup menu {<table> -> "planar robot arm", ...} in the original's order (the port stores the 1-based index). */
export const TYPE_NAMES = [
  'planar robot arm', 'elbow robot arm', 'PUMA robot arm', 'offset PUMA arm', 'Stanford robot arm',
  'cylindrical robot arm', 'spherical robot arm', 'offset spherical arm', 'twisted spherical', 'SCARA robot arm',
  'planar RPR arm', 'CNC robot arm', 'Cartesian robot arm', 'linear robot arm',
];
/** {{Type, <elbow DH table>, ""}, ...}: the popup's default value is the elbow robot arm (index 2) */
export const DEFAULT_TYPE = 2;

// Subscript[q, i] entries: "this joint's variable"; never read (a revolute joint's theta and a prismatic joint's d are
// replaced by pm).
const q1 = 'q1', q2 = 'q2', q3 = 'q3';

/**
 * The 14 DH tables {jointtypes, a, alpha, d, theta} of the popup menu, transcribed in order. The exact angles of the
 * tables (Pi/2, -Pi/2, Pi, 0, -0) are these doubles; demos/common/dh-chain.js gives them exact cos/sin (its
 * table-constant rule, N-MW-07). ORIGINAL QUIRKS (Q-MW-04): the planar arm's theta row is {q1, q2, q2} and the planar
 * RPR arm's {q1, 0, q2}; harmless (a revolute joint's theta is never read).
 */
export const TYPES = [
  /* 1 planar robot arm */ [['r', 'r', 'r'], [1, 1, 1], [0, 0, 0], [0, 0, 0], [q1, q2, q2]],
  /* 2 elbow robot arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 0, 0], [q1, q2, q3]],
  /* 3 PUMA robot arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 1 / 3, -1 / 3], [q1, q2, q3]],
  /* 4 offset PUMA arm */ [['r', 'r', 'r'], [0, 1, 1], [PI / 2, 0, 0], [2, 1 / 3, 1 / 3], [q1, q2, q3]],
  /* 5 Stanford robot arm */ [['r', 'r', 'p'], [0, 0, 0], [-PI / 2, +PI / 2, 0], [1, 1, q3], [q1, q2, 0]],
  /* 6 cylindrical robot arm */ [['r', 'p', 'p'], [0, 0, 0], [0, -PI / 2, 0], [1, q2, q3], [q1, 0, 0]],
  /* 7 spherical robot arm */ [['r', 'r', 'p'], [0, 0, 0], [-PI / 2, PI / 2, 0], [1, 0, q3], [q1, q2, 0]],
  /* 8 offset spherical arm */ [['r', 'r', 'p'], [0, 1, 0], [-PI / 2, 0, 0], [1, 0, q3], [q1, q2, 0]],
  /* 9 twisted spherical */ [['r', 'r', 'p'], [0, 1, 0], [-PI / 2, PI / 2, 0], [1, 0, q3], [q1, q2, 0]],
  /* 10 SCARA robot arm */ [['r', 'r', 'p'], [1.2, 0.6, 0], [0, PI, 0], [1.5, 0, q3], [q1, q2, 0]],
  /* 11 planar RPR arm */ [['r', 'p', 'r'], [1, 1, 1], [PI / 2, PI / 2, 0], [0, q2, 0], [q1, 0, q2]],
  /* 12 CNC robot arm */ [['p', 'p', 'p'], [0, 0, 0], [-PI / 2, PI / 2, 0], [q1, q2, q3], [-PI / 2, -PI / 2, 0]],
  /* 13 Cartesian robot arm */ [['p', 'p', 'p'], [0, 0, 0], [-PI / 2, -PI / 2, -0], [q1, q2, q3], [0, 0, 0]],
  /* 14 linear robot arm */ [['p', 'p', 'p'], [0, 0, 0], [0, 0, -0], [q1, q2, q3], [0, 0, 0]],
];
export const typeOf = (iType) => TYPES[iType - 1];

// ---- Manipulate variables -----------------------------------------------------------------------------------
/**
 * The Manipulate variables: Type and TypeOld (indexes 1…14 standing for the DH tables, N-MW-04), params (the joint
 * sliders' fractions 0…1), r1, r2, r3 (the IntervalSliders) and r1old, r2old, r3old (the recompute cache keys).
 * initialState() = the live state the notebook opens with (states[0] = snapshot 1's Settings, F-MW-09): planar robot
 * arm, TypeOld = Type, so the opening evaluation does not recompute.
 */
export function initialState() {
  return {
    Type: 1, TypeOld: 1, params: [0.5, 0.5, 0.5],
    r1: [0.5, 1.5], r2: [0.5, 1.5], r3: [0.5, 1.5],
    r1old: [0.5, 1.5], r2old: [0.5, 1.5], r3old: [0.5, 1.5],
  };
}
/** The initial settings (the output cell's stored Variables, ⊕ → Initial Settings; K-MW-04): the elbow robot arm. */
export function initialSettings() {
  return { ...initialState(), Type: DEFAULT_TYPE, TypeOld: DEFAULT_TYPE };
}
export const cloneState = (s) => ({
  Type: s.Type, TypeOld: s.TypeOld, params: s.params.slice(),
  r1: s.r1.slice(), r2: s.r2.slice(), r3: s.r3.slice(), r1old: s.r1old.slice(), r2old: s.r2old.slice(), r3old: s.r3old.slice(),
});

/**
 * Choosing a robot in the popup: Type changes, the Dynamic joint grid (it depends on Type) is rebuilt and its
 * `Slider[params[[i]] = 0.5; Dynamic[params[[i]]], …]` sets every joint to 0.5. Choosing the current robot changes
 * nothing. ORIGINAL QUIRK (Q-MW-01).
 */
export function selectType(st, iType) {
  const s = cloneState(st);
  if (iType === st.Type) return s;
  s.Type = iType;
  s.params = [0.5, 0.5, 0.5];
  return s;
}

/** The joint grid's labels: Subscript["d", i] for a prismatic joint, Subscript["Theta", i] (θ) otherwise. */
export const jointLabels = (iType) => typeOf(iType)[0].map((jt, i) => `${jt === 'p' ? 'd' : 'θ'}${i + 1}`);

/** pm = {r1[[1]] + params[[1]] (r1[[2]] - r1[[1]]), …} (F-MW-05, this order of operations) */
export function pmOf(st) {
  const r = [st.r1, st.r2, st.r3];
  return [0, 1, 2].map((i) => r[i][0] + st.params[i] * (r[i][1] - r[i][0]));
}

// ---- the workspace -----------------------------------------------------------------------------------------------
/**
 * The nine surfaces of workspace3D = ParametricPlot3D[{…}, {a, 0, 1}, {b, 0, 1}, …] in the original's order: joint 3
 * at its minimum and maximum, joint 2 at min and max, joint 1 at min and max, then joints 3, 2, 1 at the middle; each
 * joint value r[[1]] + t (r[[2]] - r[[1]]) with t = a, b, 0, 1 or 1/2. Returns 9 functions (a, b) → [x, y, z].
 */
export function workspaceSurfaces(Type, r1, r2, r3) {
  const o3coords = makeO3coords(Type);
  const L1 = (t) => r1[0] + t * (r1[1] - r1[0]);
  const L2 = (t) => r2[0] + t * (r2[1] - r2[0]);
  const L3 = (t) => r3[0] + t * (r3[1] - r3[0]);
  return [
    (a, b) => o3coords(L1(a), L2(b), L3(0)),
    (a, b) => o3coords(L1(a), L2(b), L3(1)),
    (a, b) => o3coords(L1(a), L2(0), L3(b)),
    (a, b) => o3coords(L1(a), L2(1), L3(b)),
    (a, b) => o3coords(L1(0), L2(a), L3(b)),
    (a, b) => o3coords(L1(1), L2(a), L3(b)),
    (a, b) => o3coords(L1(a), L2(b), L3(1 / 2)),
    (a, b) => o3coords(L1(a), L2(1 / 2), L3(b)),
    (a, b) => o3coords(L1(1 / 2), L2(a), L3(b)),
  ];
}

/**
 * PerformanceGoal -> "Speed" with Mesh -> 1 (D-MW-01): the parameters k/9 (k = 0 … 9) plus the mesh value 1/2, in
 * increasing order: 0, 1/9, …, 4/9, 1/2, 5/9, …, 1 (11 values).
 */
export const SPEED_PARAMS = [0, 1, 2, 3, 4].map((k) => k / 9).concat([1 / 2], [5, 6, 7, 8, 9].map((k) => k / 9));
const MID = 5; // index of 1/2

/**
 * One surface sampled as the "Speed" result: grid[i][j] = f(SPEED_PARAMS[i], SPEED_PARAMS[j]) (11 × 11 vertices,
 * 100 quads), the two mesh lines (a = 1/2: grid[5][*]; b = 1/2: grid[*][5]; 11 points each) and the closed boundary
 * (41 points: a = 0 for b up, b = 1 for a up, a = 1 for b down, b = 0 for a down; first = last).
 */
export function sampleSpeedSurface(f) {
  const n = SPEED_PARAMS.length;
  const grid = SPEED_PARAMS.map((a) => SPEED_PARAMS.map((b) => f(a, b)));
  const quads = [];
  for (let i = 0; i + 1 < n; i++) for (let j = 0; j + 1 < n; j++) quads.push([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]);
  const meshA = grid[MID].slice();
  const meshB = grid.map((row) => row[MID]);
  const boundary = [];
  for (let j = 0; j < n; j++) boundary.push(grid[0][j]);
  for (let i = 1; i < n; i++) boundary.push(grid[i][n - 1]);
  for (let j = n - 2; j >= 0; j--) boundary.push(grid[n - 1][j]);
  for (let i = n - 2; i >= 0; i--) boundary.push(grid[i][0]);
  return { grid, quads, mesh: [meshA, meshB], boundary };
}

/** Mathematica's default 3D mesh style (as stored in the saved graphic): GrayLevel[0.2] */
export const MESH_STYLE = RGBColor(0.2, 0.2, 0.2);
/** BoundaryStyle -> Blue */
export const BOUNDARY_STYLE = RGBColor(0, 0, 1);

/**
 * workspace3D for the robot `Type` and the ranges r1, r2, r3: {surfaces: [sampleSpeedSurface(f)] × 9, graphic}. The
 * graphic, as Graphics3D data, has the saved graphic's structure: per surface {EdgeForm[], LightBlue, Opacity[.5],
 * Polygon…}, then the nine blue boundary lines and the two GrayLevel[0.2] mesh groups; its own option Axes -> True
 * (which the combined graphic drops, K-MW-02).
 */
export function workspace3D(Type, r1, r2, r3) {
  const surfaces = workspaceSurfaces(Type, r1, r2, r3).map(sampleSpeedSurface);
  const content = [
    ...surfaces.map((s) => [EdgeForm(), LightBlue, Opacity(0.5), ...s.quads.map(Polygon)]),
    ...surfaces.map((s) => [BOUNDARY_STYLE, Line(s.boundary)]),
    [MESH_STYLE, ...surfaces.map((s) => Line(s.mesh[0]))],
    [MESH_STYLE, ...surfaces.map((s) => Line(s.mesh[1]))],
  ];
  return { surfaces, graphic: Graphics3D(content, { Axes: true }) };
}

/**
 * Show[{g1, g2}] as this Demonstration's pictures show it (K-MW-02): the primitives of both, the options of the
 * first graphic only (no axes, no box although workspace3D carries Axes -> True).
 */
export function showFirstOptions(g1, g2) {
  return { head: 'Graphics3D', content: [g1.content, g2.content], options: { ...g1.options } };
}

const wsKey = (st) => JSON.stringify([st.TypeOld, st.r1old, st.r2old, st.r3old]);

/**
 * One evaluation of the Manipulate body, in its order: (1) pm; (2) the joints of Type; (3) If[TypeOld != Type ||
 * r1old != r1 || …] (tolerant Unequal on the range lists, Q-MW-03; Type compared by index, N-MW-04) updates TypeOld
 * and r…old and recomputes workspace3D; (4) Ad and Td from pm (Td chopped, the fused machine Dot, Q-MW-09); (5) Show[{Graphics3D[{ground,
 * joints, wrist centre}, …], workspace3D}].
 * cache: {key, ws} of the previous evaluation (the original keeps workspace3D in a variable) or null. The workspace is
 * that of (TypeOld, r1old, r2old, r3old); when the cache does not hold it (the opening, "Initial settings") the port
 * computes it without a recompute in the original's sense (D-MW-08).
 * Returns {state, view, cache}; view: {Type, pm, Ad, Td, o3, recomputed, computed, ws, robot, graphic, robotPrims, box}.
 */
export function evaluate(stIn, cache = null) {
  const st = cloneState(stIn);
  const pm = pmOf(st);
  const Type = typeOf(st.Type);
  const J = joints(Type);
  let recomputed = false;
  if (st.TypeOld !== st.Type || mUnequal(st.r1old, st.r1) || mUnequal(st.r2old, st.r2) || mUnequal(st.r3old, st.r3)) {
    // recalculating the workspace is slow, so only do this when needed
    st.TypeOld = st.Type;
    st.r1old = st.r1.slice();
    st.r2old = st.r2.slice();
    st.r3old = st.r3.slice();
    recomputed = true;
  }
  const key = wsKey(st);
  let ws, computed = false;
  if (!recomputed && cache && cache.key === key) ws = cache.ws;
  else { ws = workspace3D(typeOf(st.TypeOld), st.r1old, st.r2old, st.r3old); computed = true; }
  const Ad = computeAd(Type, pm);
  const Td = computeTd(Ad, { chop: true, fma: true }); // Chop acts (H-AC-14, Q-MW-09); Mathematica's machine Dot (H-MW-04)
  // the originals' jr = 1/5 is exact: 3/2 jr = 3/10 is drawn as 0.3 (as dh-parameters' H-DH-01 records; MW's own
  // record has no coordinates of the robot, N-MW-09)
  const X = { exactJr: true };
  const robotContent = [
    GROUND(),
    J[0].jointtype === 'r' ? drawJoint(J[0].jointtype, J[0].d, J[0].a, pm[0], X) : drawJoint(J[0].jointtype, pm[0], J[0].a, J[0].theta, X),
  ];
  for (let i = 1; i < DOF; i++) {
    robotContent.push(J[i].jointtype === 'r'
      ? GeometricTransformation(drawJoint(J[i].jointtype, J[i].d, J[i].a, pm[i], X), Td[i - 1])
      : GeometricTransformation(drawJoint(J[i].jointtype, pm[i], J[i].a, J[i].theta, X), Td[i - 1]));
  }
  robotContent.push(GeometricTransformation(drawWristCenter(0, X), Td[DOF - 1])); // Chop[Td[dof]] = Td[dof]: Td[3] is chopped already (Q-MW-09)
  const robot = Graphics3D(robotContent, { SphericalRegion: true, ImageSize: 425, Boxed: false });
  const graphic = showFirstOptions(robot, ws.graphic);
  const robotPrims = flatten(robot);
  const box = primitiveBounds([...robotPrims, ...ws.surfaces.flatMap((s) => s.grid.flat()).map((p) => ({ type: 'point', points: [p] }))]);
  const T = Td[DOF - 1];
  return {
    state: st,
    cache: { key, ws },
    view: { Type, pm, Ad, Td, o3: [T[0][3], T[1][3], T[2][3]], recomputed, computed, ws, robot, graphic, robotPrims, box },
  };
}

// ---- framing (D-MW-04) ----------------------------------------------------------------------------------------
/** Mathematica's default ViewPoint */
export const VIEWPOINT = [1.3, -2.4, 2];
/**
 * Zoom of the SphericalRegion fit (demos/common/g3d-three.js fitViewer: the bounding sphere × 1.04 fills the image,
 * zoom > 1 draws larger), fitted to the ground-disc widths of the eight snapshots (D-MW-04, golden test).
 */
export const MW_ZOOM = 1.35;

/** The camera fitViewer sets for `box` when the viewing direction is the default ViewPoint (pure copy for tests). */
export function fitCamera(box, { zoom = MW_ZOOM, viewPoint = VIEWPOINT } = {}) {
  const c = box.map(([a, b]) => (a + b) / 2);
  const longest = Math.max(...box.map(([a, b]) => b - a));
  const radius = 0.5 * Math.hypot(...box.map(([a, b]) => b - a));
  const vpLen = Math.hypot(...viewPoint);
  const dist = vpLen * longest;
  const dir = viewPoint.map((v) => v / vpLen);
  const half = Math.atan(Math.tan(Math.asin(Math.min(0.99, radius / dist)) * 1.04) / zoom);
  return { target: c, position: c.map((x, i) => x + dir[i] * dist), fovDeg: (2 * half * 180) / PI };
}

/** Projected width of the ground disc as a fraction of the image width for a square camera (copied from dh-parameters). */
export function groundWidthFraction(cam) {
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const n = Math.hypot(...a); return a.map((x) => x / n); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = unit(sub(cam.target, cam.position));
  const right = unit(cross(f, [0, 0, 1]));
  const t = Math.tan((cam.fovDeg * PI) / 360);
  let lo = Infinity, hi = -Infinity;
  for (const z of [-2 / 5, -1 / 5 - 1 / 20]) {
    for (let k = 0; k < 360; k++) {
      const a = (2 * PI * k) / 360;
      const v = sub([2.2 * Math.cos(a), 2.2 * Math.sin(a), z], cam.position);
      const x = dot(v, right) / (dot(v, f) * t);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return (hi - lo) / 2;
}

// ---- golden data -------------------------------------------------------------------------------------------------
/**
 * The index of a stored DH table (a snapshot's Type: rows with machine numbers, {wl, n} exact angles, typeset
 * Subscript[q, i] cells) among TYPES: compares joint types, a, alpha and d by value (the q entries of d are skipped).
 */
export function typeIndexOfStored(T) {
  const num = (v) => (typeof v === 'number' ? v : v && typeof v === 'object' && typeof v.n === 'number' ? v.n : v && typeof v === 'object' && typeof v.text === 'string' ? Number(v.text) : null);
  for (let k = 0; k < TYPES.length; k++) {
    const R = TYPES[k];
    let ok = R[0].every((jt, i) => jt === T[0][i]);
    for (const row of [1, 2, 3]) {
      for (let i = 0; i < 3 && ok; i++) {
        const want = R[row][i];
        if (typeof want !== 'number') continue;
        const got = num(T[row][i]);
        if (got === null || Math.abs(got - want) > 1e-12) ok = false;
      }
    }
    if (ok) return k + 1;
  }
  return null;
}
