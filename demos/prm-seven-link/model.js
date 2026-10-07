// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-seven-link/model.js — pure port of "Probabilistic Roadmap Method with Seven-Link
// Articulated Robot" (Initialization code + the Manipulate body's computations). No DOM.
// Function names, constants and order of operations follow the original (docs/original-source/prm-seven-link.txt).
import { mEqual, mLessEq, roundTo } from '../../shared/mma.js';
import { arcTan, det } from '../../shared/mma-exact.js';
import { accumulate, clip } from '../../shared/mma-extra.js';

// ---- constants of the Manipulate's Module ----------------------------------
export const LINK_LEN = 140;
export const MIN_X = 18, MIN_Y = 7, MAX_X = 884, MAX_Y = 884;
export const ORIGIN = [445, 846];
export const THETA_STEP = 0.05; // radians per evaluation (the original's comment: "1 degree = 0.0174…")

/** obs: polygonal obstacles "taken from Figure 2, in [1]" (Kavraki et al. 1996). */
export const OBS = [
  [[153, 500], [153, 570], [88, 570], [88, 620], [272, 620], [272, 570], [202, 570], [202, 500]],
  [[327, 570], [327, 620], [480, 620], [480, 570], [410, 570], [410, 500], [362, 500], [362, 570]],
  [[532, 570], [532, 620], [825, 620], [825, 570], [688, 570], [688, 500], [636, 500], [636, 570]],
  [[16, 218], [100, 218], [100, 263], [16, 263]],
  [[200, 218], [200, 263], [362, 263], [362, 340], [410, 340], [410, 218]],
  [[546, 218], [546, 263], [688, 263], [688, 218]],
  [[820, 218], [820, 264], [884, 263], [884, 218]],
];

/** locstart: robot initial joint positions (7 joints after the base ORIGIN). */
export const LOC_START = [[321, 780], [181, 785], [104, 668], [42, 542], [144, 446], [144, 306], [133, 167]];

/** goals: relative joint angles; rows 1..7 are selectable (c2..c8), row 8 = initial position (c1). */
export const GOALS = [
  [5.12, 5.90, -0.08, 6.01, 0.93, 0.97, 0.42], // c2
  [3.35, 1.3, 0.16, 0.55, -0.01, 5.34, 5.57], // c3
  [5.23, 5.76, 6.08, 5.22, 4.78, 5.94, 0.22], // c4
  [3.37, 1.26, 0.22, 5.22, 0.62, 0.22, 5.61], // c5
  [5.8, 0.5, 5.75, 5.4, 5.5, 0.6, 6.3], // c6
  [5.1, 5.89, 6.23, 6.29, 5.78, 5.4, 5.73], // c7
  [3.79, 0.67, 0.10, 5.63, 0.6, 0.45, 1.31], // c8
  [3.63, 5.76, 1.02, 0.13, 1.27, 5.47, 6.20], // initial position of robot
];

// ---- Initialization functions ------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const isInt2 = (v) => Number.isInteger(v[0]) && Number.isInteger(v[1]);
/** Det[{a, b}] of two 2-vectors. Integer entries: Mathematica computes exactly (small integers are exact in
 *  doubles too); machine reals: Mathematica's LU-based Det, bit-exact via shared/mma-exact.js. (An integral
 *  machine real such as 300. cannot be told from 300 in JavaScript; it does not arise from moved joints.) */
const det2 = (a, b) => (isInt2(a) && isInt2(b) ? a[0] * b[1] - a[1] * b[0] : det([a, b]));

/** Gamma[{a,b}][p] := ((a-p).(a-b))/((a-b).(a-b)) */
export const Gamma = ([a, b]) => (p) => dot(sub(a, p), sub(a, b)) / dot(sub(a, b), sub(a, b));

/** lineIntersectionPoint[{{a,b},{c,d}}] := (Det[{a,b}](c-d) - Det[{c,d}](a-b)) / Det[{a-b,c-d}] */
export function lineIntersectionPoint([[a, b], [c, d]]) {
  const dab = det2(a, b), dcd = det2(c, d), den = det2(sub(a, b), sub(c, d));
  return [(dab * (c[0] - d[0]) - dcd * (a[0] - b[0])) / den, (dab * (c[1] - d[1]) - dcd * (a[1] - b[1])) / den];
}

/** segmentIntersectionQ[{p1:{a,b}, p2:{c,d}}] := If[Det[{a-b,c-d}]==0, False, 0<=Gamma[p1][p]<=1 && 0<=Gamma[p2][p]<=1]
 *  Comparisons use Mathematica's tolerant LessEqual (shared/mma.js). ORIGINAL QUIRK (Q-SL-02): parallel or
 *  collinear overlapping segments count as "no intersection". */
export function segmentIntersectionQ([p1, p2]) {
  const [a, b] = p1, [c, d] = p2;
  if (mEqual(det2(sub(a, b), sub(c, d)), 0)) return false;
  const p = lineIntersectionPoint([p1, p2]);
  const g1 = Gamma(p1)(p), g2 = Gamma(p2)(p);
  return mLessEq(0, g1) && mLessEq(g1, 1) && mLessEq(0, g2) && mLessEq(g2, 1);
}

/** angDiff[a,b] := If[a==b, 0, ArcTan[Cos[a-b], Sin[a-b]]] */
export const angDiff = (a, b) => (mEqual(a, b) ? 0 : arcTan(Math.cos(a - b), Math.sin(a - b)));

/** lineList[list_] := Partition[Append[list, First[list]], 2, 1] */
export const lineList = (list) => list.map((p, i) => [p, list[(i + 1) % list.length]]);

/** listofAllLines = Flatten[lineList[#] & /@ obs, 1] */
export const LIST_OF_ALL_LINES = OBS.flatMap(lineList);

// ---- the Manipulate's state and body ------------------------------------------
/** Initial values of the Manipulate variables (first value of each control spec). */
export function initialState() {
  return {
    isCollide: false,
    movement: 'relative',
    locOld: LOC_START.map((p) => [...p]),
    loc: LOC_START.map((p) => [...p]),
    goal: 1,
    collideState: -1,
    collisions: 0,
  };
}

/** Button["restart", collisions=0; isCollide=False; loc=locstart; locOld=locstart] */
export function restart(st) {
  return { ...st, collisions: 0, isCollide: false, loc: LOC_START.map((p) => [...p]), locOld: LOC_START.map((p) => [...p]) };
}

/** Goal configuration in the workspace: og = Accumulate[Prepend[Table[linklen {Cos[tg[[i]]], Sin[tg[[i]]]}, {i,1,7}], origin]] */
export function goalJoints(goal) {
  const tg = accumulate(GOALS[goal - 1]);
  let x = ORIGIN[0], y = ORIGIN[1];
  const og = [[x, y]];
  for (let i = 0; i < 7; i++) {
    x += LINK_LEN * Math.cos(tg[i]);
    y += LINK_LEN * Math.sin(tg[i]);
    og.push([x, y]);
  }
  return og;
}

const norm = ([x, y]) => Math.sqrt(x * x + y * y);
const samePoint = (p, q) => mEqual(p[0], q[0]) && mEqual(p[1], q[1]);

/**
 * One evaluation of the Manipulate body, as Mathematica runs it after any control changed.
 * Takes the state (with `loc` possibly moved by the user) and returns { state, view }.
 * ORIGINAL QUIRKS kept: only the FIRST changed locator is processed (Break[]), its angle moves by at
 * most THETA_STEP per evaluation (Q-SL-01), "success" uses the state BEFORE this evaluation (Q-SL-04),
 * the first link (base -> joint 1) is never collision-checked (Q-SL-03).
 */
export function evaluate(stateIn) {
  const st = structuredCloneState(stateIn);
  const og = goalJoints(st.goal);
  // worstError = Max[Norm /@ (og - Prepend[locOld, origin])]
  const chainOld = [ORIGIN, ...st.locOld];
  let worstError = -Infinity;
  for (let k = 0; k < og.length; k++) worstError = Math.max(worstError, norm(sub(og[k], chainOld[k])));
  const success = worstError < 20 && !st.isCollide;

  const { loc, locOld } = st;
  for (let i = 0; i < 7; i++) {
    if (samePoint(locOld[i], loc[i])) continue;
    const prev = i === 0 ? ORIGIN : loc[i - 1];
    let Theta = arcTan(loc[i][0] - prev[0], loc[i][1] - prev[1]);
    const Thetaold = arcTan(locOld[i][0] - prev[0], locOld[i][1] - prev[1]);
    const Thetad = clip(angDiff(Theta, Thetaold), [-THETA_STEP, THETA_STEP]);
    Theta = Thetaold + Thetad;
    loc[i] = [prev[0] + LINK_LEN * Math.cos(Theta), prev[1] + LINK_LEN * Math.sin(Theta)];
    if (st.movement === 'relative') {
      // loc[[i+1;;]] = (loc[[i]] - locOld[[i]] + #) & /@ locOld[[i+1;;]]
      const dx = loc[i][0] - locOld[i][0], dy = loc[i][1] - locOld[i][1];
      for (let j = i + 1; j < 7; j++) loc[j] = [dx + locOld[j][0], dy + locOld[j][1]];
    } else {
      // angs = Table[ArcTan[locOld[[j,1]] - locOld[[j-1,1]], locOld[[j,2]] - locOld[[j-1,2]]], {j, i+1, 7}]
      const angs = [];
      for (let j = i + 1; j < 7; j++) angs.push(arcTan(locOld[j][0] - locOld[j - 1][0], locOld[j][1] - locOld[j - 1][1]));
      for (let j = 0; j < angs.length; j++) {
        const p = loc[i + j];
        loc[i + j + 1] = [p[0] + LINK_LEN * Math.cos(Thetad + angs[j]), p[1] + LINK_LEN * Math.sin(Thetad + angs[j])];
      }
    }
    break; // Break[]: only the first changed locator
  }

  // isCollide: any joint outside the workspace, or any link 1..6 (joint i -> joint i+1) crossing an obstacle edge
  const out = loc.some(([x, y]) => x < MIN_X || x > MAX_X || y < MIN_Y || y > MAX_Y);
  let isCollide = out;
  if (!out) {
    isCollide = false;
    for (let i = 0; i < loc.length - 1 && !isCollide; i++) {
      for (const edge of LIST_OF_ALL_LINES) if (segmentIntersectionQ([[loc[i], loc[i + 1]], edge])) { isCollide = true; break; }
    }
  }
  st.isCollide = isCollide;
  let beep = false;
  if (!isCollide) {
    st.locOld = loc.map((p) => [...p]);
    st.collideState = 0;
  } else if (st.collideState === 0) {
    st.collisions += 1;
    beep = true; // Beep[] in the original (not reproduced, D-SL-02)
    st.collideState = 1;
  } else {
    st.loc = st.locOld.map((p) => [...p]);
  }
  return { state: st, view: { og, worstError, success, beep } };
}

function structuredCloneState(s) {
  return { ...s, loc: s.loc.map((p) => [...p]), locOld: s.locOld.map((p) => [...p]) };
}

/** Round[x, .1] = 0.1 Round[x/0.1] (half to even), as shared/mma.js roundTo. */
export const roundTenth = (x) => roundTo(x, 0.1);
