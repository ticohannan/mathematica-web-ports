// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-robot-arm/model.js — pure port of "Probabilistic Roadmap Method for Robot Arm" (Initialization code +
// one evaluation of the Manipulate body). No DOM, no three.js. Names, constants and order of operations follow the
// original (docs/original-source/prm-robot-arm.txt); the functions both PRM Demonstrations share are in
// demos/common/prm-core.js.
import { mLess, mGreater, mUnequal, euclid, roundTo } from '../../shared/mma.js';
import {
  TWO_PI, toroidDist, pathOKT as pathOKTcore, connectPoints as connectPointsCore, planQuery, progressOnPath, toroidLine,
  toroidLines,
} from '../common/prm-core.js';

export { TWO_PI, toroidDist };

// ---- constants of the Initialization code and the Manipulate's Module ------------------------------------------
/** "to space the overlay plot": xMin = 2.9; yMin = -2; xMax = xMin + 3.8; yMax = yMin + 3.8 (machine arithmetic) */
export const xMin = 2.9, yMin = -2, xMax = xMin + 3.8, yMax = yMin + 3.8;
export const OBS_RAD = 0.5; // obsRad = 0.5
export const WIDTHA = 0.05; // widtha = .05
export const DELTA = 0.1; // delta = .1
export const BATCH = 100; // "add 100 vertices"
// w = 1/8 and l = 1 are Module locals the original never uses (N-PA-01); the base cylinder radius 1/8 is literal.
export const BASE_RADIUS = 1 / 8;

// ---- Initialization functions -----------------------------------------------------------------------------------
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * pointsegdis2[{seg, pointlist}]: the shortest distance between the segment seg = {a, b} and a list of points:
 * u = a - b, mean = (a + b)/2, s = -(2 (p - mean).u)/u.u, closest = mean - u Sign[s] Min[1, Abs[s]]/2.
 */
export function pointsegdis2([seg, pointlist]) {
  const u = sub3(seg[0], seg[1]);
  const mean = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2, (seg[0][2] + seg[1][2]) / 2];
  const uu = dot3(u, u);
  let best = Infinity;
  for (const p of pointlist) {
    const s = -(2 * dot3(sub3(p, mean), u)) / uu;
    const k = (Math.sign(s) * Math.min(1, Math.abs(s))) / 2;
    const c = [mean[0] - u[0] * k, mean[1] - u[1] * k, mean[2] - u[2] * k];
    const d = euclid(p, c);
    if (d < best) best = d;
  }
  return best;
}

/** isCollided[{seg, pointlist}, d]: 1 if pointsegdis2 < d else 0 — defined by the original, never used (N-PA-01). */
export const isCollided = (segPts, d) => (mLess(pointsegdis2(segPts), d) ? 1 : 0);

/** The three tested segments of the robot at (Theta1, Theta2): link 1, link 2, base (link 0). */
export function robotSegments(Theta1, Theta2, widtha = WIDTHA) {
  const c1 = Math.cos(Theta1), s1 = Math.sin(Theta1);
  const elbow = [c1, s1, 1];
  const dir2 = [s1 * Math.sin(Theta2), -c1 * Math.sin(Theta2), Math.cos(Theta2)];
  return {
    link1: [[0, 0, 1], elbow],
    link2: [elbow, [elbow[0] + dir2[0], elbow[1] + dir2[1], elbow[2] + dir2[2]]],
    base: [[0, 0, 0], [0, 0, 1 + 2 * widtha]],
  };
}

/**
 * detCollision[Theta1, Theta2, pObs3, obsRad, widtha]: link 1 ({0,0,1} -> {Cos θ1, Sin θ1, 1}) or link 2 (from the
 * elbow, direction {Sin θ1 Sin θ2, -Cos θ1 Sin θ2, Cos θ2}) closer than obsRad + widtha to a sphere centre, or the
 * base segment {0,0,0} -> {0,0,1+2 widtha} closer than obsRad + 2 widtha. `<` is Mathematica's tolerant Less;
 * Or stops at the first True.
 * ORIGINAL QUIRK (Q-PA-01): the base is DRAWN as a cylinder of radius 1/8 from z = -0.1 but TESTED as a segment from
 * z = 0 with margin 2 widtha = 0.1.
 */
export function detCollision(Theta1, Theta2, pObs3, obsRad, widtha) {
  const { link1, link2, base } = robotSegments(Theta1, Theta2, widtha);
  return mLess(pointsegdis2([link1, pObs3]), obsRad + widtha)
    || mLess(pointsegdis2([link2, pObs3]), obsRad + widtha)
    || mLess(pointsegdis2([base, pObs3]), obsRad + 2 * widtha);
}

/** pathOKTrobot[ps, pe, pObs3, obsRad, widtha, delta]: pathOKT with detCollision as the obstacle test. */
export const pathOKTrobot = (ps, pe, pObs3, obsRad, widtha, delta) => pathOKTcore(ps, pe, (pt) => detCollision(pt[0], pt[1], pObs3, obsRad, widtha), delta);

/** connectPoints[goodPts, edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r] */
export function connectPoints(goodPts, edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r) {
  return connectPointsCore(goodPts, edgesNNadjin, (ps, pe) => pathOKTrobot(ps, pe, pObs3, obsRad, widtha, delta), edgesNNin, point2start, r);
}

/**
 * draw2Drobot[widtha, q] as data (for the 3D view): Rotate[{Cylinder[{{0,0,1},{1+widtha,0,1}}, widtha] (link 1),
 * Rotate[{Cuboid[{1-widtha,-widtha,1-widtha}, {1+widtha,widtha,2+widtha}]} (link 2), q2, {1,0,0}, {1,0,1}]},
 * q1, {0,0,1}, {0,0,1}]. Returns the primitives in the robot's own frame and the two rotations, applied
 * inner (q2 about the x axis through {1,0,1}) then outer (q1 about the z axis through {0,0,1}).
 */
export function draw2Drobot(widtha, q) {
  return {
    cylinder: { from: [0, 0, 1], to: [1 + widtha, 0, 1], radius: widtha },
    cuboid: { min: [1 - widtha, -widtha, 1 - widtha], max: [1 + widtha, widtha, 2 + widtha] },
    inner: { angle: q[1], axis: [1, 0, 0], point: [1, 0, 1] },
    outer: { angle: q[0], axis: [0, 0, 1], point: [0, 0, 1] },
  };
}

/** Rotate a point by angle about the x or z axis through `point` (Rotate[g, θ, w, p] for w = {1,0,0} / {0,0,1}). */
export function rotateAbout(v, angle, axis, point) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const x = v[0] - point[0], y = v[1] - point[1], z = v[2] - point[2];
  if (axis[0] === 1) return [x + point[0], c * y - s * z + point[1], s * y + c * z + point[2]];
  return [c * x - s * y + point[0], s * x + c * y + point[1], z + point[2]];
}

/** Locator position (outer Graphics coordinates) -> angles: Theta = (p - min)/(max - min) 2π. */
export const toAngles = (p) => [((p[0] - xMin) / (xMax - xMin)) * TWO_PI, ((p[1] - yMin) / (yMax - yMin)) * TWO_PI];
/** Angles -> phase-space position in the outer coordinates (the Inset maps 0..2π onto xMin..xMax, yMin..yMax). */
export const toOuter = (q) => [xMin + (q[0] / TWO_PI) * (xMax - xMin), yMin + (q[1] / TWO_PI) * (yMax - yMin)];

/** Locator range {xMin-.1, yMin-.1} .. {xMax+.1, yMax+.1}. */
export const clampLoc = ([x, y]) => [Math.min(Math.max(x, xMin - 0.1), xMax + 0.1), Math.min(Math.max(y, yMin - 0.1), yMax + 0.1)];

// ---- the Manipulate's state and body --------------------------------------------------------------------------------
/** Initial values of the Manipulate variables (first value of each control spec). */
export function initialState() {
  return {
    pConfig: [5, 0], pConfigf: [4, -1],
    freeConfigSpace: [0, 0], highRes: false,
    obstaxy: [1, -0.6], obstaz: 0.4, obstbxy: [-0.8, 0.2], Obstbz: 0.5, viewAng: -Math.PI / 2, showConfigObs: false,
    pObsOld: [-3, -2, -2], pts: [], addPoints: false, restart: true,
    progress: 0, r: 1.0,
    path: -1, rold: -1, badPts: [], goodPts: [], edgesNN: [], edgesNNadj: [], obstOld: [],
  };
}

const cloneState = (s) => JSON.parse(JSON.stringify(s));

/**
 * One evaluation of the Manipulate body. `rng` supplies RandomReal; `controlActive` is Mathematica's ControlActive
 * (true while a control or locator is being dragged). Returns { state, view }.
 */
export function evaluate(stateIn, rng, { controlActive = false } = {}) {
  const st = cloneState(stateIn);
  const obsRad = OBS_RAD, widtha = WIDTHA, delta = DELTA;

  const restarted = st.restart;
  if (st.restart) {
    st.restart = false; st.highRes = false;
    st.badPts = []; st.goodPts = []; st.pts = []; st.edgesNN = []; st.edgesNNadj = [];
  }

  // Enable torus property. ORIGINAL QUIRK (Q-PA-02): a locator dragged past an edge jumps to the opposite edge.
  for (const p of [st.pConfig, st.pConfigf]) {
    if (mLess(p[0], xMin)) p[0] = xMax;
    if (mGreater(p[0], xMax)) p[0] = xMin;
    if (mLess(p[1], yMin)) p[1] = yMax;
    if (mGreater(p[1], yMax)) p[1] = yMin;
  }

  const [Theta1, Theta2] = toAngles(st.pConfig);
  const qs = [Theta1, Theta2];
  const qf = toAngles(st.pConfigf);
  const pObs3a = [st.obstaxy[0], st.obstaxy[1], st.obstaz];
  const pObs3b = [st.obstbxy[0], st.obstbxy[1], st.Obstbz];
  const pObs3 = [pObs3a, pObs3b];
  // pObsOld = pObs3 in the restart branch assigns the Module local pObs3 BEFORE it has a value, i.e. the symbol,
  // which gets its value here; pObsOld therefore holds this evaluation's pObs3 (as in the saved state). It is
  // never used (N-PA-02).
  if (restarted) st.pObsOld = pObs3.map((p) => p.slice());
  const inCollision = detCollision(Theta1, Theta2, pObs3, obsRad, widtha);
  const inCollisionf = detCollision(qf[0], qf[1], pObs3, obsRad, widtha);

  // An obstacle moved: re-classify ALL samples (the roadmap is rebuilt below because rold = -1).
  // ORIGINAL QUIRK (Q-PA-06): the rebuild needs more than 5 free samples; with fewer, the OLD edges stay.
  if (mUnequal(st.obstOld, pObs3)) {
    st.badPts = []; st.goodPts = [];
    for (const p of st.pts) (detCollision(p[0], p[1], pObs3, obsRad, widtha) ? st.badPts : st.goodPts).push(p);
    st.rold = -1;
    st.obstOld = pObs3;
    st.highRes = false;
  }

  if (st.addPoints) {
    st.addPoints = false;
    const point2start = st.goodPts.length + 1;
    const newpts = rng.randomReal([0, TWO_PI], [BATCH, 2]);
    st.pts = st.pts.concat(newpts);
    for (const p of newpts) (detCollision(p[0], p[1], pObs3, obsRad, widtha) ? st.badPts : st.goodPts).push(p);
    if (st.goodPts.length > point2start - 1) {
      st.edgesNNadj = st.edgesNNadj.concat(Array.from({ length: st.goodPts.length - point2start + 1 }, () => []));
      if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, pObs3, obsRad, widtha, delta, st.edgesNN, point2start, st.r);
    }
  }

  if (mUnequal(st.r, st.rold) && st.goodPts.length > 5) {
    st.rold = st.r;
    st.edgesNN = [];
    st.edgesNNadj = st.goodPts.map(() => []);
    if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, pObs3, obsRad, widtha, delta, st.edgesNN, 1, st.r);
  }

  // ORIGINAL QUIRK (Q-PA-03): `path` here is the Module local (initial -1), which shadows the Manipulate variable
  // `path`; the Manipulate's own path is never written and stays -1.
  const { path, qsn, qfn } = planQuery({
    qs, qf, r: st.r, goodPts: st.goodPts, edgesNNadj: st.edgesNNadj,
    pathOK: (a, b) => pathOKTrobot(a, b, pObs3, obsRad, widtha, delta),
    qsFree: () => !inCollision, qfFree: () => !inCollisionf,
  });

  // Calculate the robot progress
  const prog = progressOnPath({ qs, qf, goodPts: st.goodPts, path, progress: st.progress });
  const robotq = prog ? prog.point : qs;

  // The C-obstacle picture (RegionPlot) is computed only when "show obstacles" is on; highRes caches it.
  if (st.showConfigObs) {
    if (!st.highRes) {
      // highRes = ControlActive[False, True]: while a control is active the plot is recomputed on every update
      // (at Mathematica's "Speed" performance goal), once released it is computed once more and then kept.
      st.highRes = !controlActive;
      st.freeConfigSpace = { pObs3: pObs3.map((p) => p.slice()), quality: controlActive ? 'speed' : 'quality' };
    }
  } else {
    st.highRes = false;
    st.freeConfigSpace = { pObs3: null, quality: 'none' }; // RegionPlot[False, ...]: the empty frame
  }

  return { state: st, view: makeView(st, { qs, qf, path, qsn, qfn, prog, robotq, inCollision, inCollisionf, pObs3 }) };
}

function makeView(st, { qs, qf, path, qsn, qfn, prog, robotq, inCollision, inCollisionf, pObs3 }) {
  const isPathList = Array.isArray(path) && path.length > 0;
  let direct = null, connectors = [], pathEdges = [];
  if (path === -2) {
    direct = toroidLine([qs, qf], 'Magenta'); // Thickness[0.02]
  } else if (isPathList) {
    connectors = [...toroidLine([qs, qsn], 'Magenta'), ...toroidLine([qf, qfn], 'Magenta')]; // Thickness[0.02]
    for (let i = 0; i < path.length - 1; i++) pathEdges.push(...toroidLine([st.goodPts[path[i] - 1], st.goodPts[path[i + 1] - 1]], 'Orange', 'Green'));
  } else {
    if (qsn) connectors.push(...toroidLine([qs, qsn], 'Magenta'));
    if (qfn) connectors.push(...toroidLine([qf, qfn], 'Magenta'));
  }
  const totdist = prog ? prog.totdist : null;
  return {
    qs, qf, path, qsn, qfn, robotq, inCollision, inCollisionf, pObs3, totdist,
    direct, connectors, pathEdges, thickConnectors: path === -2 || isPathList, endPoints: isPathList,
    edges: toroidLines(st.edgesNN, 'LighterBrown', 'Brown'),
    // Style[Text[If[Length[path]==0 && path==-1, "No path possible", StringForm["Path length = ``", Round[totdist, .01]]]], Black, Italic]
    label: path === -1 ? 'No path possible' : { prefix: 'Path length = ', value: roundTo(totdist, 0.01) },
  };
}

// ---- the C-obstacle regions (RegionPlot) ------------------------------------------------------------------------------
/**
 * The two RegionPlot predicates for (a1, a2): the robot touches sphere a (blue) / sphere b (orange). Same formulas
 * as detCollision, one sphere at a time.
 */
export function regionTests(a1, a2, pObs3a, pObs3b, obsRad = OBS_RAD, widtha = WIDTHA) {
  const { link1, link2, base } = robotSegments(a1, a2, widtha);
  const one = (c) => mLess(pointsegdis2([link1, [c]]), obsRad + widtha) || mLess(pointsegdis2([link2, [c]]), obsRad + widtha)
    || mLess(pointsegdis2([base, [c]]), obsRad + 2 * widtha);
  return [one(pObs3a), one(pObs3b)];
}

/** Signed margin field (negative inside) for marching squares: min over the three segments of distance - limit. */
export function regionField(a1, a2, c, obsRad = OBS_RAD, widtha = WIDTHA) {
  const { link1, link2, base } = robotSegments(a1, a2, widtha);
  return Math.min(pointsegdis2([link1, [c]]) - (obsRad + widtha), pointsegdis2([link2, [c]]) - (obsRad + widtha),
    pointsegdis2([base, [c]]) - (obsRad + 2 * widtha));
}

/**
 * PORT DEVIATION (D-PA-01): RegionPlot is replaced by sampling regionField on an n × n grid over [0, 2π]² and
 * marching squares (linear interpolation of the field along cell edges). Returns, per sphere, the filled cell
 * polygons and the boundary segments, in (θ1, θ2) coordinates.
 */
export function regionPolygons(c, n) {
  const h = TWO_PI / n;
  const f = [];
  for (let j = 0; j <= n; j++) {
    const row = [];
    for (let i = 0; i <= n; i++) row.push(regionField(i * h, j * h, c));
    f.push(row);
  }
  const polys = [], segs = [];
  const lerp = (p, q, fp, fq) => { const t = fp / (fp - fq); return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]; };
  for (let j = 0; j < n; j++) {
    let run = -1; // start of a run of completely inside cells, merged into one rectangle
    const flush = (end) => {
      if (run >= 0) polys.push([[run * h, j * h], [end * h, j * h], [end * h, (j + 1) * h], [run * h, (j + 1) * h]]);
      run = -1;
    };
    for (let i = 0; i < n; i++) {
      const P = [[i * h, j * h], [(i + 1) * h, j * h], [(i + 1) * h, (j + 1) * h], [i * h, (j + 1) * h]];
      const F = [f[j][i], f[j][i + 1], f[j + 1][i + 1], f[j + 1][i]];
      const inside = F.map((v) => v < 0);
      const count = inside.filter(Boolean).length;
      if (count === 4) { if (run < 0) run = i; continue; }
      flush(i);
      if (count === 0) continue;
      // walk the square's corners and edge crossings in order, keeping the inside part
      const poly = [], cross = [];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        if (inside[k]) poly.push(P[k]);
        if (inside[k] !== inside[k2]) { const x = lerp(P[k], P[k2], F[k], F[k2]); poly.push(x); cross.push(x); }
      }
      polys.push(poly);
      for (let k = 0; k + 1 < cross.length; k += 2) segs.push([cross[k], cross[k + 1]]);
    }
    flush(n);
  }
  return { polys, segs };
}
