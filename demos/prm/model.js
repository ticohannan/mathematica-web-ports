// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm/model.js — pure port of "Probabilistic Roadmap Method" (Initialization code + one evaluation of the
// Manipulate body). No DOM. Names, constants and order of operations follow the original
// (docs/original-source/prm.txt); the functions both PRM Demonstrations share are in demos/common/prm-core.js.
import { mLess, mGreater, mUnequal, roundTo } from '../../shared/mma.js';
import {
  TWO_PI, toroidDist, ptInPolys, pathOKT as pathOKTcore, connectPoints as connectPointsCore, planQuery,
  progressOnPath, toroidLine, toroidLines, circlePoints,
} from '../common/prm-core.js';

export { TWO_PI };

// ---- constants of the Manipulate ------------------------------------------------
export const DELTA = 0.1; // Module local: delta = .1 (local planner step)
export const POLY_N = 4; // {{polyN, 4}, None}
export const BATCH = 50; // "add 50 vertices"
export const LOC_MIN = -0.1, LOC_MAX = 2.1 * Math.PI; // Locator range {-.1,-.1} .. {2.1π, 2.1π}
export const QS0 = [1, 1], QF0 = [5, 5];

/** pathOKT[ps, pe, polys, delta]: the original's signature; obstacle test = ptInPolys[polys, pt]. */
export const pathOKT = (ps, pe, polys, delta) => pathOKTcore(ps, pe, (pt) => ptInPolys(polys, pt), delta);

/** connectPoints[goodPts, edgesNNadjin, polys, delta, edgesNNin, point2start, r] -> [edgesNNadj, edgesNN] */
export function connectPoints(goodPts, edgesNNadjin, polys, delta, edgesNNin, point2start, r) {
  return connectPointsCore(goodPts, edgesNNadjin, (ps, pe) => pathOKT(ps, pe, polys, delta), edgesNNin, point2start, r);
}

/**
 * The obstacles: polySides = RandomInteger[{3,7}, polyN]; polys = CirclePoints /@ polySides (regular polygons of
 * circumradius 1, flat bottom edge); polyXY = RandomReal[{0, 2π}, {polyN, 2}]; polys[[i]] = polyXY[[i]] + #.
 * CirclePoints is exact in Mathematica; prm-core's circlePoints reproduces its machine values (table for n = 7).
 */
// ORIGINAL QUIRK (Q-PR-02): the polygons are NOT wrapped across 0/2π, although distances, edges and samples are;
// the part of a polygon outside the square blocks nothing (no sample or planner point lies there).
export function makePolys(polySides, polyXY) {
  return polySides.map((n, i) => circlePoints(n).map(([x, y]) => [polyXY[i][0] + x, polyXY[i][1] + y]));
}

/** Initial values of the Manipulate variables (first value of each control spec). */
export function initialState() {
  return {
    qf: [...QF0], qs: [...QS0],
    pts: [], addPoints: false, restart: true,
    r: 0.5, progress: 0, showConfigObs: false,
    path: -1, rold: -1,
    badPts: [], goodPts: [], edgesNN: [], edgesNNadj: [],
    polyN: POLY_N, polySides: [], polys: [], polyXY: [],
  };
}

const cloneState = (s) => JSON.parse(JSON.stringify(s));

/**
 * One evaluation of the Manipulate body, as Mathematica runs it after a control changed.
 * `rng` supplies RandomInteger / RandomReal (shared/random.js). Returns { state, view }.
 */
export function evaluate(stateIn, rng) {
  const st = cloneState(stateIn);
  const delta = DELTA;

  if (st.restart) {
    st.restart = false;
    st.polyN = POLY_N;
    st.polySides = rng.randomInteger([3, 7], st.polyN);
    st.polyXY = rng.randomReal([0, TWO_PI], [st.polyN, 2]);
    st.polys = makePolys(st.polySides, st.polyXY);
    st.badPts = [];
    st.goodPts = [];
    st.pts = [];
    st.edgesNN = [];
    st.edgesNNadj = [];
  }

  // "Toroid assumption wraps locators across boundary."
  // ORIGINAL QUIRK (Q-PR-06): a locator dragged past an edge JUMPS to the opposite edge (qs[[1]] = 2π or 0),
  // it is not shifted by 2π.
  for (const q of [st.qs, st.qf]) {
    if (mLess(q[0], 0)) q[0] = TWO_PI;
    if (mGreater(q[0], TWO_PI)) q[0] = 0;
    if (mLess(q[1], 0)) q[1] = TWO_PI;
    if (mGreater(q[1], TWO_PI)) q[1] = 0;
  }

  if (st.addPoints) {
    st.addPoints = false;
    const point2start = st.goodPts.length + 1;
    const newpts = rng.randomReal([0, TWO_PI], [BATCH, 2]);
    st.pts = st.pts.concat(newpts);
    for (const p of newpts) (ptInPolys(st.polys, p) ? st.badPts : st.goodPts).push(p);
    // update the connected points (incrementally: only the new points look for neighbours, Q-PR-07)
    if (st.goodPts.length > point2start - 1) {
      st.edgesNNadj = st.edgesNNadj.concat(Array.from({ length: st.goodPts.length - point2start + 1 }, () => []));
      if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, st.polys, delta, st.edgesNN, point2start, st.r);
    }
  }

  if (mUnequal(st.r, st.rold) && st.goodPts.length > 5) {
    st.rold = st.r;
    st.edgesNN = [];
    st.edgesNNadj = st.goodPts.map(() => []);
    // Build an adjacency list:
    if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, st.polys, delta, st.edgesNN, 1, st.r);
  }

  // Check if we can go straight from qs to qf, else connect qs and qf to the map and search it
  const { path, qsn, qfn } = planQuery({
    qs: st.qs, qf: st.qf, r: st.r, goodPts: st.goodPts, edgesNNadj: st.edgesNNadj,
    pathOK: (a, b) => pathOKT(a, b, st.polys, delta),
    qsFree: () => !ptInPolys(st.polys, st.qs), qfFree: () => !ptInPolys(st.polys, st.qf),
  });
  st.path = path;

  return { state: st, view: makeView(st, qsn, qfn) };
}

/** Everything the Graphics[...] of the body draws, as data (no DOM). */
export function makeView(st, qsn, qfn) {
  const { qs, qf, goodPts, path, progress } = st;
  const isPathList = Array.isArray(path) && path.length > 0;
  const prog = progressOnPath({ qs, qf, goodPts, path, progress });
  let direct = null, connectors = [], pathEdges = [];
  if (path === -2) {
    direct = toroidLine([qs, qf], 'Magenta'); // Thickness[0.02]
  } else if (isPathList) {
    connectors = [...toroidLine([qs, qsn], 'Magenta'), ...toroidLine([qf, qfn], 'Magenta')]; // Thickness[0.02]
    for (let i = 0; i < path.length - 1; i++) pathEdges.push(...toroidLine([goodPts[path[i] - 1], goodPts[path[i + 1] - 1]], 'LighterGreen', 'Green'));
  } else {
    if (qsn) connectors.push(...toroidLine([qs, qsn], 'Magenta')); // default thickness
    if (qfn) connectors.push(...toroidLine([qf, qfn], 'Magenta'));
  }
  // PlotLabel -> If[Length[path]==0 && path==-1, "no path possible", StringForm["path length = ``", Round[totdist, .01]]]
  // (totdist is assigned while the Graphics list is built, so it is set whenever the label needs it)
  const totdist = prog ? prog.totdist : null;
  const label = path === -1 ? 'no path possible' : { prefix: 'path length = ', value: roundTo(totdist, 0.01) };
  return {
    qsn, qfn, direct, connectors, pathEdges, thickConnectors: path === -2 || isPathList,
    edges: toroidLines(st.edgesNN, 'LightBlue', 'Blue'),
    progressPoint: prog ? prog.point : null, totdist, label,
    endPoints: isPathList, // Black, Point[qs], Point[qf]
    qsInObstacle: ptInPolys(st.polys, qs), qfInObstacle: ptInPolys(st.polys, qf),
    progressEnabled: isPathList || path === -2, // Enabled -> Length[path] > 0 || path == -2
  };
}

/** Clip a locator position to its Manipulate range {-.1,-.1} .. {2.1π, 2.1π}. */
export const clampLoc = ([x, y]) => [Math.min(Math.max(x, LOC_MIN), LOC_MAX), Math.min(Math.max(y, LOC_MIN), LOC_MAX)];

export { toroidDist, ptInPolys };
