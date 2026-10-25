// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm/model.js — pure port of "Probabilistic Roadmap Method" (Initialization code + one evaluation of the
// Manipulate body, with its picture as shared/graphics.js data). No DOM. Names, constants and order of operations follow the original
// (docs/original-source/prm.txt); the functions both PRM Demonstrations share are in demos/common/prm-core.js.
import { mLess, mGreater, mUnequal, roundTo } from '../../shared/mma.js';
import {
  Annotation, Polygon, Line, Point, Text, cachedGraphics, Thickness, AbsoluteThickness, CapForm, PointSize,
  AbsolutePointSize, FontSize, GrayLevel, Lighter, Darker, Black, Pink, Magenta, LightBlue, Blue, Green, Red, Purple,
} from '../../shared/graphics.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { configGlyph } from '../common/arm-view.js';
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

  const view = makeView(st, qsn, qfn);
  return { state: st, view, graphics: picture(view, st) };
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

// ---- the picture: Graphics[…, Axes -> True, AxesOrigin -> {0,0}, PlotRange -> {{0,2π},{0,2π}}] --------
// PORT DEVIATION (D-PR-01): ImageSize ≈ 380 px estimated from the snapshots. The axes span exactly 0…2π (as in
// prm-2.png); around the plot range the image keeps a margin of about 2 % of the range plus a few px (measured in
// prm-1.png) that holds the tick labels and the PlotLabel. PlotRangeClipping -> False (Mathematica's default):
// wrapped edges and polygons may extend beyond the plot range into that margin, up to the image edge.
export const IMAGE = 380;
const PAD = 0.02 * TWO_PI;
const MARGIN_PX = { left: 6, right: 0, bottom: 8, top: 10 }; // as measured in snapshot prm-1.png (labels overlap the padding)
const upx = (TWO_PI + 2 * PAD) / (IMAGE - MARGIN_PX.left - MARGIN_PX.right); // world units per nominal px
/** The picture's PlotRange (Thickness[t] / PointSize[d] are fractions of its width). */
export const RANGE = [[-PAD - MARGIN_PX.left * upx, TWO_PI + PAD + MARGIN_PX.right * upx], [-PAD - MARGIN_PX.bottom * upx, TWO_PI + PAD + MARGIN_PX.top * upx]];
const COLOUR = { Magenta, LightBlue, Blue, Green, LighterGreen: Lighter(Green) };
const MEDIUM = AbsolutePointSize(5.5); // PointSize[Medium], estimated from the snapshots (D-PR-02)
const axes = cachedGraphics(); // drawn once

/** Axes and ticks only on 0…2π: major ticks 0…6 with labels, minor ticks every 0.2 up to 6.2. */
const axesGraphics = () => {
  const ticks = [];
  for (let k = 0; k <= 31 && k * 0.2 <= TWO_PI; k++) {
    const t = k * 0.2, len = (k % 5 === 0 ? 4 : 2.5) * upx;
    ticks.push([AbsoluteThickness(0.75), Annotation(Line([[t, 0], [t, len]]), 'tick-x'), Line([[0, t], [len, t]])]);
    if (k % 5 === 0) ticks.push([Black, FontSize(11), Annotation(Text(String(k / 5), [t, -9 * upx]), `tick-x-${k / 5}`), Text(String(k / 5), [-7 * upx, t])]);
  }
  return [GrayLevel(0.6), CapForm('Butt'), AbsoluteThickness(1), Annotation(Line([[0, 0], [TWO_PI, 0]]), 'axis-x'),
    Annotation(Line([[0, 0], [0, TWO_PI]]), 'axis-y'), ticks];
};
/** toroidLine pieces: Line[…] in each piece's colour. */
const pieces = (list, id) => list.map((p) => [COLOUR[p.color], Annotation(Line(p.line), id)]);

/** The Graphics list of one evaluation (the view of makeView and the state after the evaluation). */
export const picture = (v, s) => [
  axes([], axesGraphics),
  s.showConfigObs && [Pink, s.polys.map((poly, i) => Annotation(Polygon(poly), `obstacle-${i + 1}`))], // If[showConfigObs, {Pink, Polygon[polys]}]
  [CapForm('Butt'), pieces(v.edges, 'roadmap-edge'), // toroidLines[edgesNN, LightBlue, Blue]
    v.direct && [Thickness(0.02), pieces(v.direct, 'direct-line')],
    [v.thickConnectors && Thickness(0.02), pieces(v.connectors, 'connector')],
    [Thickness(0.02), pieces(v.pathEdges, 'path-edge')]],
  v.endPoints && [Black, Point(s.qs), Point(s.qf)],
  v.progressPoint && [Purple, PointSize(0.04), Annotation(Point(v.progressPoint), 'progress-point')],
  // Darker[Green], PointSize[Medium], Point[goodPts], Red, Point[badPts]
  [Darker(Green), MEDIUM, s.goodPts.map((p) => Annotation(Point(p), 'good-point')), Red, s.badPts.map((p) => Annotation(Point(p), 'bad-point'))],
  // Locator[qs, If[ptInPolys[polys, qs], loc[Red], loc[Darker[Green]]]], then qf
  configGlyph(s.qs, v.qsInObstacle, 'icon-qs'), configGlyph(s.qf, v.qfInObstacle, 'icon-qf'),
  // PlotLabel -> If[…, "no path possible", StringForm["path length = ``", Round[totdist, .01]]]
  [GrayLevel(0.35), FontSize(13), Annotation(Text(v.label === 'no path possible' ? v.label : `${v.label.prefix}${mmaNumberString(v.label.value)}`,
    [TWO_PI / 2, TWO_PI + PAD - 3 * upx]), 'plot-label')],
];

