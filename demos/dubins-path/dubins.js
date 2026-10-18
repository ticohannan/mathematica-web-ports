// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/dubins-path/dubins.js — pure port of "Shortest Path for the Dubins Car" (Initialization code + one evaluation
// of the Manipulate body). No DOM. Function names and order of operations follow the original
// (docs/original-source/dubins-path.txt): angPt2Pt, distPt2Pt, arcLen, drawLSL, drawLSR, drawRSR, drawRSL, drawLRL,
// drawRLR; the Sort selection; the moving-car Module. Greek names spelled out (θ → Theta, α → Alpha, β → Beta, γ → Gamma).
//
// A word is [length, drawing]; drawing = { colour, word, pieces } with pieces
//   { kind: 'arc', c, r, a1, a2 }   Circle[c, r, {a1, a2}]
//   { kind: 'line', from, to }      Line[{from, to}]
// pieces[0..2] are the original's drawing[[2]] … drawing[[4]]; a word that does not exist is [Infinity, null]
// (the original's {∞, {}}).
// Numerics (DESIGN §6): tolerant comparisons of reals (shared/mma.js), comparisons with exact 0 plain, Chop 1e-10,
// a bit-exact ArcTan[x, y] (shared/mma-exact.js), Sqrt of the sum of squares, a/b of machine numbers as a·(1/b) with
// the grouping of the stored definitions.
import { mUnequal, mGreater, mLess, mLessEq, chop, roundTo } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

const PI = Math.PI;
const TWO_PI = 2 * PI;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const times = (k, a) => [k * a[0], k * a[1]];
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0); // Sign (machine 0 → 0)

// ---- Initialization ----------------------------------------------------------------------

/** angPt2Pt[ps, pe] := Chop[N[ArcTan[pe[[1]] - ps[[1]], pe[[2]] - ps[[2]]]]] (angles below 1e-10 become exact 0). */
export function angPt2Pt(ps, pe) {
  return chop(arcTan(pe[0] - ps[0], pe[1] - ps[1])) + 0;
}

/** distPt2Pt[ps, pe] := Sqrt[(pe[[1]] - ps[[1]])^2 + (pe[[2]] - ps[[2]])^2]. */
export function distPt2Pt(ps, pe) {
  const dx = pe[0] - ps[0], dy = pe[1] - ps[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * arcLen[aS, aE, dir]: the arc from aS to aE turning left (dir > 0) or right (dir < 0), within one turn.
 * Returns [Abs[Theta], a1, a2] (a2 moved by multiples of 2π with Theta).
 */
export function arcLen(aS, aE, dir) {
  let a1 = aS, a2 = aE, Theta = a2 - a1;
  while (dir > 0 && Theta < 0) { Theta += TWO_PI; a2 += TWO_PI; }
  while (dir < 0 && Theta > 0) { Theta -= TWO_PI; a2 -= TWO_PI; }
  if (mGreater(Theta, TWO_PI)) { Theta -= TWO_PI; a2 -= TWO_PI; }
  if (mLess(Theta, -TWO_PI)) { Theta += TWO_PI; a2 += TWO_PI; }
  return [Math.abs(Theta), a1, a2];
}

/** The six colours (RGBColor arguments) — Sort's tie-break compares them (Q-DP-01, K-DP-02). */
export const WORD_COLOURS = {
  Pink: [1, 0.5, 0.5], Blue: [0, 0, 1], DarkerYellow: [2 / 3, 2 / 3, 0], Orange: [1, 0.5, 0],
  Brown: [0.6, 0.4, 0.2], DarkerGreen: [0, 2 / 3, 0],
};
const arc = (c, r, arcL) => ({ kind: 'arc', c, r, a1: arcL[1], a2: arcL[2] });

/** drawLSL[csL, ceL, Theta, minRadius]: outer tangent of the two left circles (Pink). */
export function drawLSL(csL, ceL, Theta, minRadius) {
  const dLL = distPt2Pt(csL, ceL), AlphaL2L = angPt2Pt(csL, ceL);
  const oLSL = times(minRadius, [Math.cos(AlphaL2L - PI / 2), Math.sin(AlphaL2L - PI / 2)]);
  const arc1 = arcLen(-PI / 2, AlphaL2L - PI / 2, 1);
  const arc2 = arcLen(AlphaL2L - PI / 2, Theta - PI / 2, 1);
  const dLSL = dLL + minRadius * (arc1[0] + arc2[0]);
  return [dLSL, { colour: 'Pink', word: 'LSL', pieces: [
    arc(csL, minRadius, arc1), { kind: 'line', from: add(oLSL, csL), to: add(oLSL, ceL) }, arc(ceL, minRadius, arc2)] }];
}

/** drawLSR[csL, ceR, Theta, minRadius]: inner tangent, only If[dLR > 2 minRadius, …] (Blue). */
export function drawLSR(csL, ceR, Theta, minRadius) {
  const dLR = distPt2Pt(csL, ceR), AlphaL2R = angPt2Pt(csL, ceR);
  let dLSR = Infinity, drawing = null;
  if (mGreater(dLR, 2 * minRadius)) {
    const GammaLSR = Math.acos(2 * (minRadius * (1 / dLR))); // ArcCos[2 (minRadius/dLR)]
    const oLSR = times(minRadius, [Math.cos(AlphaL2R - GammaLSR), Math.sin(AlphaL2R - GammaLSR)]);
    const arc1 = arcLen(-PI / 2, AlphaL2R - GammaLSR, 1);
    const arc2 = arcLen(PI + AlphaL2R - GammaLSR, Theta + PI / 2, -1);
    drawing = { colour: 'Blue', word: 'LSR', pieces: [
      arc(csL, minRadius, arc1), { kind: 'line', from: add(oLSR, csL), to: sub(ceR, oLSR) }, arc(ceR, minRadius, arc2)] };
    dLSR = distPt2Pt(add(oLSR, csL), sub(ceR, oLSR)) + minRadius * (arc1[0] + arc2[0]);
  }
  return [dLSR, drawing];
}

/** drawRSR[csR, ceR, Theta, minRadius]: outer tangent of the two right circles (Darker[Yellow]). */
export function drawRSR(csR, ceR, Theta, minRadius) {
  const dRR = distPt2Pt(csR, ceR), AlphaR2R = angPt2Pt(csR, ceR);
  const oRSR = times(minRadius, [Math.cos(AlphaR2R + PI / 2), Math.sin(AlphaR2R + PI / 2)]);
  const arc1 = arcLen(PI / 2, AlphaR2R + PI / 2, -1);
  const arc2 = arcLen(AlphaR2R + PI / 2, Theta + PI / 2, -1);
  const dRSR = dRR + minRadius * (arc1[0] + arc2[0]);
  return [dRSR, { colour: 'DarkerYellow', word: 'RSR', pieces: [
    arc(csR, minRadius, arc1), { kind: 'line', from: add(oRSR, csR), to: add(oRSR, ceR) }, arc(ceR, minRadius, arc2)] }];
}

/** drawRSL[csR, ceL, Theta, minRadius]: inner tangent, only If[dRL > 2 minRadius, …] (Orange). */
export function drawRSL(csR, ceL, Theta, minRadius) {
  const dRL = distPt2Pt(csR, ceL), AlphaR2L = angPt2Pt(csR, ceL);
  let dRSL = Infinity, drawing = null;
  if (mGreater(dRL, 2 * minRadius)) {
    const GammaRSL = Math.acos(2 * (minRadius * (1 / dRL))); // ArcCos[2 (minRadius/dRL)]
    const oRSL = times(minRadius, [Math.cos(AlphaR2L + GammaRSL), Math.sin(AlphaR2L + GammaRSL)]);
    const arc1 = arcLen(PI / 2, AlphaR2L + GammaRSL, -1);
    const arc2 = arcLen(-PI + AlphaR2L + GammaRSL, Theta - PI / 2, 1);
    drawing = { colour: 'Orange', word: 'RSL', pieces: [
      arc(csR, minRadius, arc1), { kind: 'line', from: add(oRSL, csR), to: sub(ceL, oRSL) }, arc(ceL, minRadius, arc2)] };
    dRSL = distPt2Pt(add(oRSL, csR), sub(ceL, oRSL)) + minRadius * (arc1[0] + arc2[0]);
  }
  return [dRSL, drawing];
}

/** drawLRL[csL, ceL, Theta, minRadius]: three arcs, only If[dLL < 4 minRadius, …] (Brown). */
export function drawLRL(csL, ceL, Theta, minRadius) {
  const dLL = distPt2Pt(csL, ceL);
  let dLRL = Infinity, drawing = null;
  if (mLess(dLL, 4 * minRadius)) {
    const AlphaL2L = angPt2Pt(csL, ceL);
    const LRLBeta = -Math.acos(dLL * (1 / (4 * minRadius))); // -ArcCos[(dLL)/(4 minRadius)]
    const arc1 = arcLen(-PI / 2, AlphaL2L - LRLBeta, 1);
    const arc2 = arcLen(AlphaL2L - LRLBeta - PI, AlphaL2L + LRLBeta, -1);
    const arc3 = arcLen(AlphaL2L + LRLBeta - PI, Theta - PI / 2, 1);
    dLRL = minRadius * (arc1[0] + arc2[0] + arc3[0]);
    const cC = add(csL, times(2 * minRadius, [Math.cos(AlphaL2L - LRLBeta), Math.sin(AlphaL2L - LRLBeta)]));
    drawing = { colour: 'Brown', word: 'LRL', pieces: [arc(csL, minRadius, arc1), arc(cC, minRadius, arc2), arc(ceL, minRadius, arc3)] };
  }
  return [dLRL, drawing];
}

/** drawRLR[csR, ceR, Theta, minRadius]: three arcs, only If[dRR < 4 minRadius, …] (Darker[Green]). */
export function drawRLR(csR, ceR, Theta, minRadius) {
  const dRR = distPt2Pt(csR, ceR);
  let dRLR = Infinity, drawing = null;
  if (mLess(dRR, 4 * minRadius)) {
    const AlphaR2R = angPt2Pt(csR, ceR);
    const RLRBeta = -Math.acos(dRR * (1 / (4 * minRadius))); // -ArcCos[(dRR)/(4 minRadius)]
    const arc1 = arcLen(PI / 2, AlphaR2R + RLRBeta, -1);
    const arc2 = arcLen(PI + (AlphaR2R + RLRBeta), AlphaR2R - RLRBeta, 1);
    const arc3 = arcLen(PI + AlphaR2R - RLRBeta, Theta + PI / 2, -1);
    dRLR = minRadius * (arc1[0] + arc2[0] + arc3[0]);
    const cC = add(csR, times(2 * minRadius, [Math.cos(AlphaR2R + RLRBeta), Math.sin(AlphaR2R + RLRBeta)]));
    drawing = { colour: 'DarkerGreen', word: 'RLR', pieces: [arc(csR, minRadius, arc1), arc(cC, minRadius, arc2), arc(ceR, minRadius, arc3)] };
  }
  return [dRLR, drawing];
}

/**
 * (Sort[{dLSL, dLSR, dRSR, dRSL, dLRL, dRLR}]) in canonical order: lengths numerically (∞ after every number), on
 * equal lengths the drawings, i.e. the colours' RGB arguments lexicographically (Q-DP-01): LSR, RLR, LRL, RSR, RSL,
 * LSL. Returns the sorted list; [[1]] is the shortest path.
 */
export function sortWords(cands) {
  const cmpColour = (a, b) => {
    if (!a || !b) return a ? 1 : b ? -1 : 0; // {} (no drawing) before a longer list
    const ca = WORD_COLOURS[a.colour], cb = WORD_COLOURS[b.colour];
    for (let i = 0; i < 3; i++) if (ca[i] !== cb[i]) return ca[i] < cb[i] ? -1 : 1;
    return 0;
  };
  return cands.map((c, i) => [c, i]).sort(([a, i], [b, j]) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    return cmpColour(a[1], b[1]) || i - j;
  }).map(([c]) => c);
}

/**
 * The inner moving-car Module: the blue car after progress·length along the shortest path.
 * Returns { distTrav, ang1, ang2, ang3, angP, xyP, Alpha, segment } (segment 1, 2 or 3: which branch ran).
 */
export function movingCar(shortestPath, progress, minRadius) {
  const L = shortestPath[0];
  const distTrav = progress * L;
  const [p1, p2, p3] = shortestPath[1].pieces; // drawing[[2]], drawing[[3]], drawing[[4]]
  const ang1 = p1.a2 - p1.a1;
  const ang3 = p3.a2 - p3.a1;
  let angP, xyP, Alpha, ang2 = null, segment;
  if (mLessEq(distTrav, Math.abs(minRadius * ang1))) {
    // ORIGINAL QUIRK (Q-DP-02): Sign[ang1 + 10^-6] — a right first arc of (almost) zero length turns the car by +π/2.
    const m1 = Math.abs(minRadius * ang1);
    angP = p1.a1 + ang1 * (m1 === 0 ? 0 : distTrav * (1 / m1));
    xyP = add(p1.c, times(minRadius, [Math.cos(angP), Math.sin(angP)]));
    Alpha = sign(ang1) * minRadius;
    angP += sign(ang1 + 1e-6) * (PI / 2);
    segment = 1;
  } else if (mLessEq(distTrav, L - Math.abs(minRadius * ang3))) {
    segment = 2;
    // If[Head[drawing[[3]]] == Circle, …]; If[Head[drawing[[3]]] == Line, …] (N-DP-04: a plain kind test)
    if (p2.kind === 'arc') {
      ang2 = p2.a2 - p2.a1;
      // K-DP-10: no guard against a zero-length middle arc (as the original)
      angP = p2.a1 + ang2 * ((distTrav - Math.abs(minRadius * ang1)) * (1 / Math.abs(minRadius * ang2)));
      xyP = add(p2.c, times(minRadius, [Math.cos(angP), Math.sin(angP)]));
      angP += sign(ang2) * (PI / 2);
      Alpha = sign(ang2) * minRadius;
    }
    if (p2.kind === 'line') {
      Alpha = 0;
      angP = arcTan(p2.to[0] - p2.from[0], p2.to[1] - p2.from[1]);
      const k = (distTrav - Math.abs(minRadius * ang1)) * (1 / distPt2Pt(p2.to, p2.from));
      xyP = add(p2.from, times(k, sub(p2.to, p2.from)));
    }
  } else { // in 3rd segment
    segment = 3;
    const m3 = Math.abs(minRadius * ang3);
    angP = p3.a1 + ang3 * ((distTrav - (L - m3)) * (1 / m3));
    xyP = add(p3.c, times(minRadius, [Math.cos(angP), Math.sin(angP)]));
    angP += sign(ang3) * (PI / 2);
    Alpha = sign(ang3) * minRadius;
  }
  return { distTrav, ang1, ang2, ang3, angP, xyP, Alpha, segment };
}

/** Round[x, 0.01] (half to even) as the label shows it. */
export const round01 = (x) => roundTo(x, 0.01);

/** The label's text of a machine real (StringForm of a machine number): "20.76", "22.5", "8.". */
export const labelNumber = (v) => mmaNumberString(v, { isReal: true });

// ---- the Manipulate's state and body ---------------------------------------------------------
export const PLOT_RANGE = [[-15, 15], [-10, 10]];
export const GOAL_RANGE = [[-13, -8], [13, 8]]; // {{goalXY, {2, 2}}, {-13, -8}, {13, 8}, Locator}
/** ORIGINAL QUIRK (Q-DP-07): the Module's placeholder value of shortestPath, always overwritten before use. */
export const SHORTEST_PATH_PLACEHOLDER = [20, { colour: 'Pink', word: null, pieces: [
  { kind: 'arc', c: [0, 3], r: 3, a1: -3, a2: -1.3 }, { kind: 'line', from: [0.7, 0.1], to: [4, 1] },
  { kind: 'arc', c: [2, 2], r: 3, a1: -1.3, a2: (5 * PI) / 4 }] }];

/**
 * The live state = the initial settings (output cell "Variables"/"Specifications", F-DP-12), as machine numbers
 * (D-DP-01): goalXY {2, 2}, Theta -π/4, goalThetaloc {2 + √2, 2 - √2}, progress 0.25, minRadius 3.
 */
export function initialState() {
  return {
    goalXY: [2, 2], goalXYold: [2, 2],
    Theta: -PI / 4,
    goalThetaloc: [3.414213562373095, 0.5857864376269049], // N[{2 + √2, 2 - √2}] as Mathematica gives it (H-DP-01, H-DP-25; D-DP-09)
    goalTheta: 0, // {{goalTheta, 0}, -π, π, None}: never used (Q-DP-03)
    progress: 0.25,
    minRadius: 3,
  };
}

const EXACT_OPENING = initialState();
/** true while goal and heading locator are still at the original's exact opening values (D-DP-09) */
export const isExactOpening = (st) => st.goalXY[0] === 2 && st.goalXY[1] === 2 && st.Theta === EXACT_OPENING.Theta
  && st.goalThetaloc[0] === EXACT_OPENING.goalThetaloc[0] && st.goalThetaloc[1] === EXACT_OPENING.goalThetaloc[1];

/**
 * One evaluation of the Manipulate body, as Mathematica runs it after any control changed.
 * Takes the state (goalXY / goalThetaloc possibly moved by the user) and returns { state, view }.
 */
export function evaluate(stateIn) {
  const st = { ...stateIn, goalXY: [...stateIn.goalXY], goalXYold: [...stateIn.goalXYold], goalThetaloc: [...stateIn.goalThetaloc] };
  const r = st.minRadius;
  // a moved goal keeps the old heading and carries the heading locator (tolerant Unequal on the two lists)
  if (mUnequal(st.goalXYold, st.goalXY)) {
    st.goalThetaloc = add(st.goalXY, times(2, [Math.cos(st.Theta), Math.sin(st.Theta)]));
    st.goalXYold = [...st.goalXY];
  }
  // The opening state is exact in the original (Theta -π/4, goalThetaloc {2 + √2, 2 - √2}): Mathematica re-derives the
  // same exact values on every evaluation until a locator is dragged, so the port keeps the correctly rounded
  // constants instead of recomputing them with the browser's Math.cos/Math.sin, whose last bit differs between
  // engines (D-DP-09).
  const dTheta = distPt2Pt(st.goalXY, st.goalThetaloc);
  if (!isExactOpening(st)) {
    // ORIGINAL QUIRK (Q-DP-04): the heading locator dropped on the goal centre gives Theta = 0
    st.Theta = dTheta > 0 ? arcTan(st.goalThetaloc[0] - st.goalXY[0], st.goalThetaloc[1] - st.goalXY[1]) : 0;
    st.goalThetaloc = add(st.goalXY, times(2, [Math.cos(st.Theta), Math.sin(st.Theta)]));
  }

  // circles of minimum turning radius at start and end
  const csL = [0, +r];
  const csR = [0, -r];
  const ceL = add(st.goalXY, times(r, [Math.cos(st.Theta + PI / 2), Math.sin(st.Theta + PI / 2)]));
  const ceR = add(st.goalXY, times(r, [Math.cos(st.Theta - PI / 2), Math.sin(st.Theta - PI / 2)]));
  // CSC words, then the two CCC words
  const dLSL = drawLSL(csL, ceL, st.Theta, r);
  const dLSR = drawLSR(csL, ceR, st.Theta, r);
  const dRSR = drawRSR(csR, ceR, st.Theta, r);
  const dRSL = drawRSL(csR, ceL, st.Theta, r);
  const dLRL = drawLRL(csL, ceL, st.Theta, r);
  const dRLR = drawRLR(csR, ceR, st.Theta, r);
  const words = [dLSL, dLSR, dRSR, dRSL, dLRL, dRLR];
  const shortestPath = sortWords(words)[0];
  const pathLength = round01(shortestPath[0]); // Round[N[shortestPath[[1]]], 0.01]
  const distance = round01(Math.sqrt(st.goalXY[0] * st.goalXY[0] + st.goalXY[1] * st.goalXY[1]));
  const label = `${labelNumber(pathLength)} path length, ${labelNumber(distance)} distance`;
  const car = movingCar(shortestPath, st.progress, r);
  return {
    state: st,
    view: {
      dTheta, csL, csR, ceL, ceR, words, shortestPath, word: shortestPath[1].word,
      lengths: { LSL: dLSL[0], LSR: dLSR[0], RSR: dRSR[0], RSL: dRSL[0], LRL: dLRL[0], RLR: dRLR[0] },
      pathLength, distance, label, car,
    },
  };
}

/** True when two states agree on every Manipulate variable bit for bit (used by tests and the page). */
export const sameState = (a, b) => ['goalXY', 'goalXYold', 'Theta', 'goalThetaloc', 'progress', 'minRadius']
  .every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
