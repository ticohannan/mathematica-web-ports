// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/bfs-motion-planning/model.js — "Breadth-First Search Robot Motion Planning" (Aaron T. Becker, Benedict Isichei
// and Praveen Reddy Padala): bfsTorus, getShortestPath, the locator → cell rule and exactly one evaluation of the
// Manipulate body, in the original's order of operations. Pure: no DOM, importable in Node. Grid cells are 1-based
// {row, column} pairs as in Mathematica, so states compare directly with the ones saved in the notebook. The shared
// grid code is in demos/common/arm-grid.js (owner robot-motion-obstacles).
import { mGreater, mUnequal, roundHalfEven, roundTo } from '../../shared/mma.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { armGeometry } from '../common/two-link.js';
import { arrowArc } from '../common/arrow-arcs.js';
import { W, L, xMin, yMin, xMax, yMax, applyTorus, armHits, cSpaceTable } from '../common/arm-grid.js';
import { piOver } from '../../shared/exact-pi.js';

const STRAIGHT = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIAGONAL = [[1, 1], [-1, 1], [-1, -1], [1, -1]];

/**
 * bfsTorus[cSpace, start] exactly as written (a FIFO label-correcting search, Q-BF-01): queue = {start}; lvl all Infinity
 * except lvl[[start]] = 0.0; parent all {0.0, 0.0}; while the queue is not empty take its First (the port keeps a head
 * index instead of Rest); for the straight neighbours {{1,0},{0,1},{-1,0},{0,-1}} with mylc = lvl[[v]] + 1.0, then the
 * diagonal ones {{1,1},{-1,1},{-1,-1},{1,-1}} with mylc = lvl[[v]] + 1.41: neighbour = v + coords wrapped round the
 * torus (r < 1 → d1, r > d1 → 1, the same for c); if cSpace[[r, c]] > -0.5 && lvl[[r, c]] > mylc (tolerant Greater,
 * Q-BF-02): parent[[r, c]] = v, lvl[[r, c]] = mylc, AppendTo[queue, {r, c}].
 * Defined only for a start inside the grid (`/; 1 <= start[[1]] <= d1 && 1 <= start[[2]] <= d2`): otherwise null (the
 * call stays unevaluated in Mathematica). Option greater: the comparison (default the tolerant mGreater; tests pass `>`).
 * Returns { parent, lvl, pushes } — parent[r - 1][c - 1] = [row, col] of the parent ([0, 0] when none).
 */
export function bfsTorus(cSpace, start, { greater = mGreater } = {}) {
  const d1 = cSpace.length, d2 = d1 ? cSpace[0].length : 0;
  if (!(start[0] >= 1 && start[0] <= d1 && start[1] >= 1 && start[1] <= d2)) return null;
  const parent = Array.from({ length: d1 }, () => Array.from({ length: d2 }, () => [0, 0]));
  const lvl = Array.from({ length: d1 }, () => new Array(d2).fill(Infinity));
  lvl[start[0] - 1][start[1] - 1] = 0.0;
  const queue = [[start[0], start[1]]];
  let head = 0;
  const visit = (v, coords, inc) => {
    for (const cr of coords) {
      const mylc = lvl[v[0] - 1][v[1] - 1] + inc;
      let r = cr[0] + v[0], c = cr[1] + v[1];
      if (r < 1) r = d1;
      if (r > d1) r = 1;
      if (c < 1) c = d2;
      if (c > d2) c = 1;
      if (cSpace[r - 1][c - 1] > -0.5 && greater(lvl[r - 1][c - 1], mylc)) {
        parent[r - 1][c - 1] = [v[0], v[1]];
        lvl[r - 1][c - 1] = mylc;
        queue.push([r, c]);
      }
    }
  };
  while (head < queue.length) {
    const v = queue[head++];
    visit(v, STRAIGHT, 1.0);
    visit(v, DIAGONAL, 1.41);
  }
  return { parent, lvl, pushes: queue.length };
}

const inGrid = (grid, p) => Array.isArray(grid) && p[0] >= 1 && p[0] <= grid.length && p[1] >= 1 && p[1] <= (grid[0]?.length ?? 0)
  && Number.isInteger(p[0]) && Number.isInteger(p[1]);

/**
 * getShortestPath[parents, start, end]: path = {end}; if parents[[end]] != {0, 0}, follow the parents until start == ps,
 * appending each cell. Returns the path from the goal back to the start (the caller reverses it). A goal that was never
 * reached, or that equals the start, gives {end}. PORT GUARD (D-BF-07, provisional): a walk that reaches a cell outside
 * the grid or without a parent stops there (Mathematica would run into Part errors; reachable only with cells outside
 * the grid, E-BF-07).
 */
export function getShortestPath(parents, start, end) {
  let ps = [end[0], end[1]];
  const path = [ps];
  if (!inGrid(parents, ps)) return path;
  const first = parents[ps[0] - 1][ps[1] - 1];
  if (first[0] !== 0 || first[1] !== 0) {
    let guard = parents.length * parents[0].length + 1;
    while ((start[0] !== ps[0] || start[1] !== ps[1]) && guard-- > 0) {
      const next = parents[ps[0] - 1][ps[1] - 1];
      ps = [next[0], next[1]];
      path.push(ps);
      if (!inGrid(parents, ps) || (ps[0] === 0 && ps[1] === 0)) break;
    }
  }
  return path;
}

/**
 * The locator → cell rule of the stored Body: pS = {L ((x - xMin)/(xMax - xMin)), L (1 - (y - yMin)/(yMax - yMin))} with
 * L = Length[freeConfigSpace], then Round[{.5 + pS[[2]], Max[1, pS[[1]] + .5]}] (row, column; Round half to even, no
 * other guard: Q-BF-08). Division as a·(1/b) (COMMON-DECISIONS §4; K-BF-03). Returns { pS, cell }.
 */
export function cellOf([x, y], len) {
  const pS = [len * ((x - xMin) * (1 / (xMax - xMin))), len * (1 - (y - yMin) * (1 / (yMax - yMin)))];
  return { pS, cell: [roundHalfEven(0.5 + pS[1]), roundHalfEven(Math.max(1, pS[0] + 0.5))] };
}

/** ccord = path[[Max[1, Ceiling[progress*Length[path]]]]] (machine arithmetic, Q-BF-09); returns the 1-based index. */
export const progressIndex = (progress, n) => Math.max(1, Math.ceil(progress * n));

/** Theta1 = ((2. c - 1.)/L) Pi, Theta2 = (-(2. r - 1.)/L) Pi at the centre of cell {r, c} (division as a·(1/b)). */
export function cellAngles([r, c], len) {
  return [((2.0 * c - 1.0) * (1 / len)) * Math.PI, ((-(2.0 * r - 1.0)) * (1 / len)) * Math.PI];
}

/**
 * The label number Round[(2. (Pi/L)) costmap[[lE]], 0.01] and its text as Mathematica shows it ("1.57", "4.", "∞").
 * L = Length[costmap] is an exact integer, so 2. (Pi/L) is twice the correctly rounded π/L (piOver, K-BF-09).
 */
export function pathLengthLabel(cost, len) {
  const piL = Number.isInteger(len) && len > 0 ? piOver(len) : Math.PI * (1 / len);
  const value = Number.isFinite(cost) ? roundTo((2 * piL) * cost, 0.01) : cost;
  const text = Number.isNaN(value) ? 'Indeterminate' : mmaNumberString(value, { isReal: true });
  return { value, text: `robot phase space, path length = ${text} rads` };
}

/**
 * The Input cell's values: obstacles {1.1, 1.1}, {1.1, -1.1}; start {4.5, 0.0}, goal {5.5, 0.0}; Q 2, P 1;
 * freeConfigSpace 0 ({freeConfigSpace, {0, 0}, None}), costmap = parents = path = {{0, 0}}, highRes False,
 * pObsOld = pObs2Old = {-3, -2}, updatedCspace = updatedcostmap = False, lS = lE = {1.0, 1.0}, QualityOld 1. The first
 * evaluation computes grid, search and path: the live state saved in the notebook (D-BF-08).
 */
export function initialState() {
  return {
    pObs: [1.1, 1.1], pObs2: [1.1, -1.1], pConfigI: [4.5, 0.0], pConfigF: [5.5, 0.0], Quality: 2, progress: 1,
    freeConfigSpace: 0, costmap: [[0, 0]], parents: [[0, 0]], path: [[0, 0]], highRes: false,
    pObsOld: [-3, -2], pObs2Old: [-3, -2], updatedCspace: false, updatedcostmap: false, lS: [1.0, 1.0], lE: [1.0, 1.0], QualityOld: 1,
  };
}

const costAt = (costmap, p) => (inGrid(costmap, p) ? costmap[p[0] - 1][p[1] - 1] : NaN);

/**
 * One evaluation of the Manipulate body (`controlActive` = ControlActive[] during it). Returns { state, view }: the new
 * Manipulate variables (the input is not modified) and the Module locals and drawing data: pS, pE, ccord, costmapcolor,
 * Theta1, Theta2, inCollision, label, resolution, flags of what was recomputed (grid, search, path), geometry, arcs.
 */
export function evaluate(input, { controlActive = false } = {}) {
  const st = { ...input, pObs: [...input.pObs], pObs2: [...input.pObs2] };
  st.pConfigI = applyTorus(input.pConfigI);
  st.pConfigF = applyTorus(input.pConfigF);
  const pObsV = [st.pObs, st.pObs2];
  let resolution, gridRecomputed = false, searched = false, walked = false, searchFailed = false;
  if (mUnequal(st.pObsOld, st.pObs) || mUnequal(st.pObs2Old, st.pObs2) || mUnequal(st.QualityOld, st.Quality) || !st.highRes) {
    if (controlActive) { st.highRes = false; resolution = 4 * st.Quality; } else { st.highRes = true; resolution = 16 * st.Quality; }
    st.freeConfigSpace = cSpaceTable(pObsV, resolution, -1, 0, { exactPi: true }); // 1. (Pi/resolution): K-BF-09
    st.pObsOld = [...st.pObs]; st.pObs2Old = [...st.pObs2]; st.QualityOld = st.Quality;
    st.updatedCspace = true;
    gridRecomputed = true;
  }
  const len = Array.isArray(st.freeConfigSpace) ? st.freeConfigSpace.length : 0;
  const { pS, cell: cS } = cellOf(st.pConfigI, len);
  const { pS: pE, cell: cE } = cellOf(st.pConfigF, len);
  // (*only update these if locators change or config space change*)
  if (mUnequal(st.lS, cS) || st.updatedCspace) {
    st.lS = cS;
    const r = bfsTorus(st.freeConfigSpace, st.lS);
    // {parents, costmap} = bfsTorus[…]: an unevaluated call (start outside the grid) leaves both unchanged (D-BF-07)
    if (r) { st.parents = r.parent; st.costmap = r.lvl; } else searchFailed = true;
    searched = true;
    st.updatedCspace = false;
    st.updatedcostmap = true;
  }
  // (*only update these if locators change or cost map change*)
  if (mUnequal(st.lE, cE) || st.updatedcostmap) {
    st.lE = cE;
    st.path = getShortestPath(st.parents, st.lS, st.lE).reverse();
    walked = true;
    st.updatedcostmap = false;
  }
  const costmapcolor = st.costmap.map((row) => row.slice());
  for (const p of st.path) if (inGrid(costmapcolor, p)) costmapcolor[p[0] - 1][p[1] - 1] = 'Green';
  const ccord = st.path[progressIndex(st.progress, st.path.length) - 1];
  if (inGrid(costmapcolor, ccord)) costmapcolor[ccord[0] - 1][ccord[1] - 1] = 'Blue';
  const clen = st.costmap.length;
  const [Theta1, Theta2] = cellAngles(ccord, clen);
  const inCollision = armHits(Theta1, Theta1 + Theta2, pObsV);
  const label = pathLengthLabel(costAt(st.costmap, st.lE), clen);
  const geometry = armGeometry({ r1: L, r2: L, theta1: Theta1, theta2: Theta2, w: W, theta1LabelRadius: L / 2, robotArmLabel: 'link2' });
  const arcs = [
    arrowArc({ center: [0, 0], r: L / 3, start: 0, end: Theta1 }),
    arrowArc({ center: geometry.elbow, r: L / 3, start: Theta1, end: Theta1 + Theta2 }),
  ];
  return {
    state: st,
    view: {
      pS, pE, ccord, costmapcolor, Theta1, Theta2, inCollision, label, resolution, gridRecomputed, searched, walked, searchFailed,
      geometry, arcs, glyph: inCollision ? 'red' : 'green', gridSize: clen, pObsV,
    },
  };
}

/** Number of blocked cells (−1) of a grid. */
export const blockedCount = (grid) => (Array.isArray(grid) ? grid.reduce((s, row) => s + row.reduce((t, v) => t + (v === -1 ? 1 : 0), 0), 0) : 0);
