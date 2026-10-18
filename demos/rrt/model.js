// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Li Huang
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/rrt/model.js — pure port of "Rapidly Exploring Random Tree (RRT) and RRT*" (Initialization code and one
// evaluation of the Manipulate body). No DOM. Function names, constants and the order of operations follow the
// original (docs/original-source/rrt.txt); the vertex records keep the original's layout and 1-based indexes, so
// states compare directly with the saved ones (tests/golden/rrt.original-states.json).
//
//   verts: {xyloc, parent, IDnum, cost2go, childrenlist}   — here [[x, y], parent, id, cost, [children]]
//
// Random numbers come from an injectable `rng` (shared/random.js): createRng (seeded or not) or replayRng (draws
// recorded by the Mathematica harness). Per attempt, in the original's order: RandomReal[] (always), then
// RandomReal[{-20., 20.}, 2] unless the attempt is biased to the goal, then RandomInteger[{1, n}] for the Random Tree.
import { mLess, mGreater, mEqual, roundTo } from '../../shared/mma.js';
import { norm } from '../../shared/mma-exact.js';
import { euclidean, mmaNumberString, normalizeDnrm2, normalizeCR } from '../../shared/mma-extra.js';
import { angtest, ptInPoly } from '../common/prm-core.js';
import { Gamma, lineIntersectionPoint as lineIntersectionPointCommon, segmentIntersectionQ as segmentIntersectionQCommon, isExactSegment } from '../common/segments.js';

export { angtest, ptInPoly };
/** λ[{a, b}][p] (demos/common/segments.js Gamma). */
export const λ = Gamma;
/** lineIntersectionPoint and segmentIntersectionQ of demos/common/segments.js; in this app the first segment (a tree
 *  step between two machine-real locations — also when they happen to be integral, like the root {0., 0.}) is machine,
 *  the second (an obstacle edge) exact when its vertices are integers, as all of the original's are. */
const flags = ([, edge]) => ({ exact: [false, isExactSegment(edge)] });
export const lineIntersectionPoint = (segs) => lineIntersectionPointCommon(segs, flags(segs));
export const segmentIntersectionQ = (segs) => segmentIntersectionQCommon(segs, flags(segs));

// ------------------------------------------------------------------------------------------------ constants
/** rrtDist = 3: range used by RRT* to define 'neighbors' of a node. */
export const RRT_DIST = 3;
export const TREE_TYPES = ['Random Tree', 'RRT', 'RRT*'];
/** The original's third tree type, the typeset string of RRT with a superscript * (saved states use it). */
export const RRT_STAR_TYPESET = '\\!\\(\\*SuperscriptBox[\\(RRT\\), \\(*\\)]\\)';
export const OBSTACLE_TYPES = ['none', 'sparse', 'narrow passage', 'concave'];
/** obsedges = Piecewise[…]: the original's exact integer vertex lists. */
export const OBSEDGES = {
  'narrow passage': [
    [[5, 10], [6, 10], [6, 21], [5, 21]],
    [[5, 5], [6, 5], [6, -21], [5, -21]],
    [[-5, -7], [-6, -7], [-6, 21], [-5, 21]],
    [[-5, -9], [-6, -9], [-6, -21], [-5, -21]],
  ],
  sparse: [
    [[1, 1], [1, 17], [17, 17], [17, 1]],
    [[-1, 1], [-1, 17], [-17, 17], [-17, 1]],
    [[1, -1], [1, -17], [17, -17], [17, -1]],
    [[-1, -1], [-1, -17], [-17, -17], [-17, -1]], // -{{1,1},{1,17},{17,17},{17,1}}
  ],
  concave: [[[5, 3], [-6, 3], [-6, 4], [6, 4], [6, -4], [-6, -4], [-6, -3], [5, -3]]],
  none: [],
};
/** The four blue walls Rectangle[{-21,-21},{-20,21}], …: drawn, but not obstacles (Q-RT-03). */
export const WALLS = [[[-21, -21], [-20, 21]], [[20, -21], [21, 21]], [[-21, -21], [21, -20]], [[-21, 20], [21, 21]]];
export const PLOT_RANGE = [[-21, 21], [-21, 23]];
/** Drawing sizes (D-RT-03): PointSize[Medium] and PointSize[Large] as absolute diameters in px at ImageSize 400
 *  (measured in the snapshots), Thin, Thick, the label's font size (Style[…, 18]) and ImageSize. */
export const STYLE = { imageSize: 400, mediumPointPx: 5, largePointPx: 7.5, thinPx: 0.25, thickPx: 2, labelFontPx: 18, dashPx: [4, 2.7] };
/** {{finalGoal, {18, -18}}, {-19, -19}, {19, 19}, ControlType -> Locator} */
export const GOAL_RANGE = [[-19, -19], [19, 19]];
export const ROOT = () => [[0, 0], 0, 1, 0, []];

// ------------------------------------------------------------------------------------------------ Initialization
/**
 * inCollision[nv, np, obsedges]: first ptInPoly[obstacle, np] for every obstacle in order (the convex test, Q-RT-01),
 * then, while no collision, segmentIntersectionQ[{{nv, np}, edge}] for every edge of each closed obstacle polygon.
 */
export function inCollision(nv, np, obsedges) {
  for (const poly of obsedges) if (ptInPoly(poly, np)) return true;
  for (const poly of obsedges) {
    const n = poly.length;
    for (let k = 0; k < n; k++) if (segmentIntersectionQ([[nv, np], [poly[k], poly[(k + 1) % n]]])) return true;
  }
  return false;
}

// ------------------------------------------------------------------------------------------------ helpers
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
// ---- extended-precision length (K-RT-02) ------------------------------------------------------------------------
// Exact binary values {m, e} = m·2^e with BigInt m >= 0 (lengths only need magnitudes).
const DV = new DataView(new ArrayBuffer(8));
function decode(x) {
  DV.setFloat64(0, Math.abs(x));
  const bits = DV.getBigUint64(0), ex = Number((bits >> 52n) & 0x7ffn);
  const m = (bits & 0xfffffffffffffn) | (ex ? 0x10000000000000n : 0n);
  return { m, e: (ex || 1) - 1075 };
}
const bitLength = (m) => m.toString(2).length;
/** round {m, e} to p significant bits, to nearest, ties to even; `sticky` = discarded non-zero bits below m */
function roundBits({ m, e }, p, sticky = false) {
  const drop = bitLength(m) - p;
  if (drop <= 0) return { m, e };
  let q = m >> BigInt(drop);
  const rem = m - (q << BigInt(drop)), half = 1n << BigInt(drop - 1);
  if (rem > half || (rem === half && (sticky || (q & 1n)))) q += 1n;
  return { m: q, e: e + drop };
}
function addBits(a, b) {
  if (a.m === 0n) return b;
  if (b.m === 0n) return a;
  const e = Math.min(a.e, b.e);
  return { m: (a.m << BigInt(a.e - e)) + (b.m << BigInt(b.e - e)), e };
}
function isqrtBits(n) {
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x;
}
/** √{m, e} rounded to p bits (correct rounding of the exact root) */
function sqrtBits({ m, e }, p) {
  if (m === 0n) return { m, e };
  if (e % 2 !== 0) { m <<= 1n; e -= 1; }
  const shift = Math.max(0, p + 4 - (bitLength(m) >> 1));
  m <<= BigInt(2 * shift);
  const r = isqrtBits(m);
  return roundBits({ m: r, e: e / 2 - shift }, p, r * r !== m);
}
const toDouble = ({ m, e }) => Number(m) * 2 ** e; // m has at most 53 bits here
/**
 * Norm of a 2-vector as Mathematica 15.0.1 (Windows x86-64) computes it in Normalize: in x87 extended precision —
 * x², y², their sum and the square root each rounded to 64 significant bits — and then rounded to a double (double
 * rounding). Evidence: harness run 2, all 902 recorded unit steps of the RRT replays; the correctly rounded length gives
 * 901 (H-RT-05 node 812, a near-halfway case), dnrm2 511, the plain double formula 719 (K-RT-02).
 */
export function lengthExtended([x, y]) {
  const sq = (t) => { const d = decode(t); return roundBits({ m: d.m * d.m, e: 2 * d.e }, 64); };
  const s = roundBits(addBits(sq(x), sq(y)), 64);
  return toDouble(roundBits(sqrtBits(s, 64), 53));
}
/** Normalize[v] = v·(1/lengthExtended(v)) */
export function normalizeExtended(v) {
  const len = lengthExtended(v);
  if (len === 0) return v.map(() => 0);
  const r = 1 / len;
  return v.map((x) => x * r);
}

/**
 * The numerics of Normalize and EuclideanDistance (K-RT-02, resolved by harness run 2):
 *  MODEL_1501 — Mathematica 15.0.1 (the owner's version; the port's default): Normalize[v] = v·(1/extended-precision
 *    length) (normalizeExtended), EuclideanDistance[u, v] = Sqrt[(u1 - v1)^2 + (u2 - v2)^2] rounded step by step in
 *    doubles (`euclidean`); every random-draw replay (H-RT-02, H-RT-04 … H-RT-12, H-RT-16, H-RT-17) is reproduced
 *    bit for bit with it;
 *  MODEL_2018 — the version that saved the notebook's snapshots: both through the BLAS dnrm2 length (`norm`); the six
 *    saved trees fit it (golden tests), not MODEL_1501.
 * `length` is the Norm of the step test Norm[p - nv] > 1 (the records cannot tell the models apart there).
 */
export const MODEL_1501 = Object.freeze({ normalize: normalizeExtended, distance: (w) => euclidean(w, [0, 0]), length: norm });
export const MODEL_2018 = Object.freeze({ normalize: normalizeDnrm2, distance: norm, length: norm });
/** EuclideanDistance[u, v] = distance(u - v) (default MODEL_1501). */
export const euclideanDistance = (u, v, distance = MODEL_1501.distance) => distance(sub(u, v));
const deepClone = (x) => (Array.isArray(x) ? x.map(deepClone) : x);
const isStarType = (t) => t === 'RRT*' || t === RRT_STAR_TYPESET;

/**
 * Location lookups on verts[[;;, 1]] (a cache per verts array, grown as nodes are appended):
 * locs — the locations; first — map from the exact location to the FIRST index (1-based), i.e.
 * First@Flatten@Position[verts[[;;, 1]], x] (N-RT-03: Position's SameQ also matches within 1 ulp; duplicates here are
 * exact copies).
 */
const CACHE = new WeakMap();
const keyOf = (p) => `${p[0] + 0},${p[1] + 0}`;
function lookup(verts) {
  let c = CACHE.get(verts);
  if (!c) { c = { locs: [], first: new Map() }; CACHE.set(verts, c); }
  for (let i = c.locs.length; i < verts.length; i++) {
    const p = verts[i][0];
    c.locs.push(p);
    const k = keyOf(p);
    if (!c.first.has(k)) c.first.set(k, i + 1);
  }
  return c;
}
/** First@Flatten@Position[verts[[;;, 1]], x] (1-based; 0 if absent). */
export const positionOf = (verts, x) => lookup(verts).first.get(keyOf(x)) ?? 0;
/** verts[[;;, 1]] */
export const locations = (verts) => lookup(verts).locs;

/**
 * First@Nearest[pts, x]: the element at the least Euclidean distance, the earliest of equal ones (K-RT-01) — the
 * same result as shared/mma-extra.js nearest(pts, x)[0] (same distance function), by one linear scan.
 */
export function nearestFirst(pts, x) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = euclidean(pts[i], x);
    if (d < bd) { bd = d; best = i; }
  }
  return best < 0 ? null : pts[best];
}
/**
 * Nearest[pts -> Automatic, x, {All, r}] / Nearest[pts, x, {All, r}]: the indexes (0-based here) of every element
 * within distance r (inclusive), nearest first, equal distances in list order (K-RT-01).
 */
export function nearestWithin(pts, x, r) {
  const scored = [];
  for (let i = 0; i < pts.length; i++) {
    const d = euclidean(pts[i], x);
    if (d <= r) scored.push({ i, d });
  }
  scored.sort((a, b) => a.d - b.d || a.i - b.i);
  return scored.map((s) => s.i);
}

// ------------------------------------------------------------------------------------------------ addNode, in steps
/**
 * Pick a goal location: If[RandomReal[] < explorationBias, p = finalGoal, p = Round[RandomReal[{-20.0, 20.0}, 2], 0.01]]
 * (tolerant Less; Round[x, 0.01] = 0.01 Round[x/0.01], halves to even, K-RT-03).
 */
export function samplePoint(explorationBias, finalGoal, rng) {
  if (mLess(rng.randomReal([0, 1]), explorationBias)) return finalGoal.slice();
  return roundTo(rng.randomReal([-20, 20], 2), 0.01);
}

/**
 * The node to expand: RRT and RRT*: nv = First@Nearest[verts[[;;, 1]], p]; Random Tree: nv = verts[[RandomInteger[{1,
 * Length[verts]}], 1]]; then parent = the FIRST node at that location (Q-RT-05). Returns {nv, parent}.
 */
export function pickNode(verts, treeType, p, rng) {
  const locs = locations(verts);
  const nv = treeType === 'RRT' || isStarType(treeType) ? nearestFirst(locs, p) : locs[rng.randomInteger([1, locs.length]) - 1];
  return { nv, parent: positionOf(verts, nv) };
}

/** np = nv + If[Norm[p - nv] > 1, 1 Normalize[p - nv], p - nv] (tolerant Greater; Normalize: MODEL_1501 by default). */
export function extend(nv, p, { normalize = MODEL_1501.normalize, length = MODEL_1501.length } = {}) {
  const v = sub(p, nv);
  return add(nv, mGreater(length(v), 1) ? normalize(v) : v);
}

/**
 * RRT*: nvs = Nearest[verts[[;;, 1]], np, {All, rrtDist}]; eucDist = colliding neighbours ∞, else EuclideanDistance;
 * dists = cost of the first node at each location; indexMinDist = First@Ordering[dists + eucDist, 1] (the first
 * minimum); parent = the first node at nvs[[indexMinDist]], nv = its location. Returns {nvs, eucDist, parent, nv}.
 */
export function rrtStarChooseParent(verts, np, obsedges, { distance = MODEL_1501.distance } = {}) {
  const locs = locations(verts);
  const nvs = nearestWithin(locs, np, RRT_DIST).map((i) => locs[i]);
  const eucDist = nvs.map((vs) => (!inCollision(vs, np, obsedges) ? euclideanDistance(vs, np, distance) : Infinity));
  const dists = nvs.map((vs) => verts[positionOf(verts, vs) - 1][3]);
  let indexMinDist = 0;
  for (let i = 1; i < nvs.length; i++) if (dists[i] + eucDist[i] < dists[indexMinDist] + eucDist[indexMinDist]) indexMinDist = i;
  const parent = positionOf(verts, nvs[indexMinDist]);
  return { nvs, eucDist, parent, nv: verts[parent - 1][0] };
}

/**
 * AppendTo[verts, {np, parent, Length[verts] + 1, verts[[parent, 4]] + EuclideanDistance[nv, np], {}}];
 * verts[[parent, 5]] = Append[verts[[parent, 5]], Length[verts]]. Mutates verts.
 */
export function appendNode(verts, np, parent, nv, { distance = MODEL_1501.distance } = {}) {
  verts.push([np, parent, verts.length + 1, verts[parent - 1][3] + euclideanDistance(nv, np, distance), []]);
  verts[parent - 1][4].push(verts.length);
}

/**
 * updateCostToGo[index]: cost = parent's cost + EuclideanDistance[parent location, own location], then the same for
 * each child in its stored order (iterative here; the original recurses). Nothing happens for the root (parent 0).
 */
export function updateCostToGo(verts, index, { distance = MODEL_1501.distance } = {}) {
  const stack = [index];
  while (stack.length) {
    const i = stack.pop();
    const parent = verts[i - 1][1];
    if (parent === 0) continue;
    verts[i - 1][3] = verts[parent - 1][3] + euclideanDistance(verts[parent - 1][0], verts[i - 1][0], distance);
    const ch = verts[i - 1][4];
    for (let k = ch.length - 1; k >= 0; k--) stack.push(ch[k]);
  }
}

/**
 * RRT* rewiring: for each neighbour vs = nvs[[n]] in order: nn = the first node at vs, newdist = verts[[-1, 4]] +
 * eucDist[[n]]; if verts[[nn, 4]] > newdist (tolerant Greater): nn leaves its old parent's children, gets the new node
 * as parent and newdist as cost, is appended to the new node's children, and updateCostToGo[nn]. Mutates verts;
 * returns the number of rewired neighbours.
 */
export function rrtStarRewire(verts, nvs, eucDist, opts = {}) {
  let count = 0;
  const N = verts.length;
  nvs.forEach((vs, n) => {
    const nn = positionOf(verts, vs);
    const newdist = verts[N - 1][3] + eucDist[n];
    if (mGreater(verts[nn - 1][3], newdist)) {
      const old = verts[nn - 1][1];
      verts[old - 1][4] = verts[old - 1][4].filter((c) => c !== nn);
      verts[nn - 1][1] = N;
      verts[nn - 1][3] = newdist;
      verts[N - 1][4].push(nn);
      updateCostToGo(verts, nn, opts);
      count++;
    }
  });
  return count;
}

/**
 * addNode[treeType, obsedges] on state.verts (mutated): attempts until a step is free of collisions, then append (and
 * rewire for RRT*). Returns p (the sample of the successful attempt), which the body stores in newrand.
 * opts: the numerics model {normalize, distance, length} (default MODEL_1501, K-RT-02).
 */
export function addNode(state, treeType, obsedges, rng, opts = {}) {
  const { verts } = state;
  const star = isStarType(treeType);
  for (;;) {
    const p = samplePoint(state.explorationBias, state.finalGoal, rng);
    let { nv, parent } = pickNode(verts, treeType, p, rng);
    const np = extend(nv, p, opts);
    let nvs = null, eucDist = null;
    if (star) ({ nvs, eucDist, parent, nv } = rrtStarChooseParent(verts, np, obsedges, opts));
    if (!inCollision(nv, np, obsedges)) {
      appendNode(verts, np, parent, nv, opts);
      if (star) rrtStarRewire(verts, nvs, eucDist, opts);
      return p;
    }
  }
}

// ------------------------------------------------------------------------------------------------ state, evaluation
/** The Manipulate's stored "Variables" (initial settings): verts as a single record and the forcing *Old values (Q-RT-13). */
export function initialSettings() {
  return {
    verts: ROOT(), finalGoal: [18, -18], finalGoalOld: [10, 10], goalRadius: 1, goalRadiusOld: -1,
    treeType: 'RRT', treeTypeOld: 0, obstacles: 'narrow passage', obstaclesold: [], explorationBias: 0,
    newrand: [], path: [], cost: [], nodestoadd: 0, reachGoal: false,
  };
}
export const STATE_KEYS = Object.keys(initialSettings());

/** A saved state (plain numbers, e.g. tools/lib/wl-json.mjs plain()) as the port's state: the typeset RRT* → "RRT*". */
export function fromSaved(saved) {
  const s = {};
  for (const k of STATE_KEYS) s[k] = deepClone(saved[k]);
  for (const k of ['treeType', 'treeTypeOld']) if (s[k] === RRT_STAR_TYPESET) s[k] = 'RRT*';
  return s;
}

/** Unequal (!=) as the change checks use it: strings and mixed kinds by identity, numbers and lists tolerantly. */
function unequal(a, b) {
  if (typeof a === 'string' || typeof b === 'string') return a !== b;
  return !mEqual(a, b);
}

/** The goal check: the cheapest node within goalRadius of finalGoal (nearest first, tolerant Less) and its path. */
export function goalCheck(s) {
  const idx = nearestWithin(locations(s.verts), s.finalGoal, s.goalRadius);
  if (idx.length === 0) return;
  let cost = 10000, waypoint = null;
  for (const i of idx) {
    const v = s.verts[i];
    if (mLess(v[3], cost)) { waypoint = [v[0].slice(), v[1]]; cost = v[3]; }
  }
  const path = [waypoint];
  while (path[path.length - 1][1] !== 0) {
    const v = s.verts[path[path.length - 1][1] - 1];
    path.push([v[0].slice(), v[1]]);
  }
  s.cost = cost;
  s.path = path;
  s.reachGoal = true;
}

/**
 * One evaluation of the Manipulate body: the goal-change check, the reset check, If[nodestoadd > 0, …],
 * While[nodestoadd > 5, …], the goal check. Returns {state (a new object), view, treeChanged}.
 * opts: the numerics model for addNode (default MODEL_1501).
 */
export function evaluate(stateIn, rng, opts = {}) {
  const s = {};
  for (const k of STATE_KEYS) s[k] = deepClone(stateIn[k]);
  let treeChanged = false;
  if (unequal(s.finalGoalOld, s.finalGoal) || unequal(s.goalRadiusOld, s.goalRadius)) {
    s.reachGoal = false; s.path = []; s.finalGoalOld = s.finalGoal.slice(); s.goalRadiusOld = s.goalRadius;
  }
  if (unequal(s.treeTypeOld, s.treeType) || unequal(s.obstaclesold, s.obstacles)) {
    s.treeTypeOld = s.treeType; s.obstaclesold = s.obstacles;
    s.verts = [ROOT()]; s.path = []; s.newrand = []; s.reachGoal = false;
    treeChanged = true;
  }
  const obsedges = OBSEDGES[s.obstacles];
  if (s.nodestoadd > 0) {
    s.newrand = addNode(s, s.treeType, obsedges, rng, opts);
    s.nodestoadd -= 1;
    s.reachGoal = false;
    treeChanged = true;
  }
  while (s.nodestoadd > 5) {
    s.newrand = addNode(s, s.treeType, obsedges, rng, opts);
    s.nodestoadd -= 1;
  }
  if (s.reachGoal === false) goalCheck(s);
  return { state: s, view: makeView(s), treeChanged };
}

// ------------------------------------------------------------------------------------------------ texts and picture
/** Whether `cost` is the root's exact 0 (the waypoint is the root): the only exact cost (K-RT-06). */
export const costIsExact = (s) => s.reachGoal && s.path.length === 1 && s.path[0][1] === 0;

/** Text of a node's cost in its tooltip, as Mathematica prints it: the root's exact "0", reals "1.", "3.41421". */
export const tooltipText = (cost, isRoot) => (isRoot ? mmaNumberString(cost, { isReal: false }) : mmaNumberString(cost, { isReal: true }));

/**
 * The label StringForm["``, ``", If[Length[verts] == 1, "1 node", StringForm["`` nodes", n]],
 * If[reachGoal, StringForm["path length ``", Round[cost, 0.01]], "goal not yet reached"]]. Round[0, 0.01] of the
 * root's exact cost prints "0" (REGRESSION PIN, K-RT-06).
 */
export function labelText(s) {
  const n = s.verts.length;
  const a = n === 1 ? '1 node' : `${n} nodes`;
  let b = 'goal not yet reached';
  if (s.reachGoal) b = `path length ${costIsExact(s) ? '0' : mmaNumberString(roundTo(s.cost, 0.01), { isReal: true })}`;
  return `${a}, ${b}`;
}

/**
 * The picture as data, in the original's drawing order: workspace, goal disk, goal point, walls and obstacles, tree
 * edges, newest-node marks, nodes (with tooltips), newrand point, path, label.
 */
export function makeView(s) {
  const n = s.verts.length;
  const edges = [];
  for (let i = 1; i < n; i++) edges.push([s.verts[i][0], s.verts[s.verts[i][1] - 1][0]]);
  const last = s.verts[n - 1][0];
  const hasNewrand = Array.isArray(s.newrand) && s.newrand.length === 2;
  return {
    plotRange: PLOT_RANGE,
    workspace: [[-20, -20], [20, 20]],
    goal: { center: s.finalGoal.slice(), r: s.goalRadius, color: s.reachGoal ? 'Green' : 'Yellow' },
    goalPoint: s.finalGoal.slice(),
    walls: WALLS,
    obstacles: OBSEDGES[s.obstacles],
    edges,
    newest: n > 1 ? { line: hasNewrand ? [last, s.newrand.slice()] : null, point: last } : null,
    nodes: s.verts.map((v, i) => ({ at: v[0], tooltip: tooltipText(v[3], i === 0) })),
    newrand: hasNewrand ? s.newrand.slice() : null,
    path: s.reachGoal ? s.path.map((e) => e[0]) : null,
    label: { text: labelText(s), at: [0, 22], fontPx: 18 },
  };
}
