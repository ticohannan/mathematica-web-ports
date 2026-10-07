// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Francesco Bernardini and Aaron T. Becker
// SPDX-FileCopyrightText: 2019 Nathan Lichtlé (reeds-shepp-curves, MIT; converted by the original's authors; see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/car-paths/carpaths.js — pure port of "Shortest Path for Forward and Reverse Motion of a Car"
// (Initialization code + the Manipulate body's computations). No DOM.
// Function names, constants and order of operations follow the original (docs/original-source/car-paths.txt);
// modπ / mod2π are spelled modPi / mod2Pi. Paths are lists of path elements [param, steer, gear] (machine reals,
// as after the original's N[path]).
import { mEqual, mLess, mGreater, mLessEq, mGreaterEq, mod, roundTo, total } from '../../shared/mma.js';
import { arcTan, norm as normExact } from '../../shared/mma-exact.js';
import { minimalBy } from '../../shared/mma-extra.js';

// ---- constants ----------------------------------------------------------------
export const sLEFT = -1, sSTRAIGHT = 0, sRIGHT = 1; // Constants for turning
export const gFORWARD = 1, gBACKWARD = -1; // Constants for movement direction
const PI = Math.PI;

// ---- Initialization functions ----------------------------------------------------

/**
 * getPos[path, pose, minRadius:1, progress:0]: pose of a car that started at `pose` = [x, y, Theta] and followed
 * `progress` (0..1) of `path` with minimum turning radius minRadius. Also returns Alpha, the signed turning radius
 * used for the front-wheel angle (minRadius on a left arc, -minRadius on a right arc, 0 straight).
 * Returns [pos, Theta, Alpha].
 */
export function getPos(path, pose, minRadius = 1, progress = 0) {
  let gear, steer, param, angS, angE, sectionParam;
  const distTrav = progress * pathLength(path);
  let distSoFar = 0;
  let pos = [pose[0], pose[1]];
  let Theta = pose[2];
  let breakHere = false;
  let Alpha = 0;
  let i = 0;
  while (i < path.length) {
    i = i + 1;
    param = path[i - 1][0]; steer = path[i - 1][1]; gear = path[i - 1][2];
    if (mLess(distTrav, distSoFar + param)) { breakHere = true; sectionParam = distTrav - distSoFar; } else sectionParam = param;
    if (mEqual(steer, -1)) { // Left
      angS = Theta - PI / 2;
      Alpha = minRadius;
      angE = angS + gear * sectionParam;
      pos = [pos[0] + minRadius * (Math.cos(angE) - Math.cos(angS)), pos[1] + minRadius * (Math.sin(angE) - Math.sin(angS))];
      Theta = Theta + gear * sectionParam;
    } else if (mEqual(steer, 1)) { // Right
      angS = Theta + PI / 2;
      Alpha = -minRadius;
      angE = angS - gear * sectionParam;
      pos = [pos[0] + minRadius * (Math.cos(angE) - Math.cos(angS)), pos[1] + minRadius * (Math.sin(angE) - Math.sin(angS))];
      Theta = Theta - gear * sectionParam;
    } else if (mEqual(steer, 0)) { // Straight
      Alpha = 0;
      // NOTE (N-CP-01): Times is Orderless in Mathematica; the product gear*minRadius*sectionParam may be formed in
      // another order there (last-bit differences in the drawn car position only).
      const k = gear * minRadius * sectionParam;
      pos = [pos[0] + k * Math.cos(Theta), pos[1] + k * Math.sin(Theta)];
    }
    if (breakHere) break;
    distSoFar = distSoFar + param;
  }
  return [pos, Theta, Alpha];
}

// ---- drawCar: geometry of the car icon as data --------------------------------------
const rot = ([x, y], a, [cx, cy] = [0, 0]) => {
  const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
  return [cx + c * dx - s * dy, cy + s * dx + c * dy];
};
const rectPts = ([a, b], [c, d]) => [[a, b], [c, b], [c, d], [a, d]];

/** Front-wheel angle of drawCar: If[Alpha == 0, 0, ArcTan[Alpha ∓ .375, 1.4]] (Mathematica ArcTan[x, y]!). */
export function wheelAngle(Alpha, side) {
  if (mEqual(Alpha, 0)) return 0;
  return side === 'left' ? arcTan(Alpha - 0.375, 1.4) : arcTan(Alpha + 0.375, 1.4);
}

/**
 * drawCar[xy, Theta, Alpha, opac]: car icon centred at the middle of the rear axle, as a list of primitives in WORLD
 * coordinates (the original's Translate[Rotate[Translate[{...}, {0.7, 0}], Theta, {0, 0}], xy] applied).
 *   { kind: 'polygon' | 'line' | 'arrow', pts, role, fill: 'inherit' | colour name, opacity, edge }
 * 'inherit' = the colour set by the caller (Green / Red / Blue). Colours named as in the original.
 */
export function drawCar(xy, Theta, Alpha, opac) {
  const inner = (p) => [p[0] + 0.7, p[1]]; // Translate[..., {0.7, 0}]
  const outer = (p) => { const q = rot(inner(p), Theta, [0, 0]); return [q[0] + xy[0], q[1] + xy[1]]; };
  const T = (pts) => pts.map(outer);
  const edge = { color: 'Black', opacity: opac }; // EdgeForm[Directive[Opacity[opac], Black]]
  const prims = [];
  // Rectangle[{-1, -1/2}, {1, 1/2}] in the caller's colour
  prims.push({ kind: 'polygon', role: 'body', pts: T(rectPts([-1, -1 / 2], [1, 1 / 2])), fill: 'inherit', opacity: opac, edge });
  // {Yellow, Opacity[0.8*opac], EdgeForm[{Thin, Black}], Polygon[...], Polygon[...]}
  const lightEdge = { color: 'Black', opacity: 0.8 * opac, thin: true };
  prims.push({ kind: 'polygon', role: 'headlight', pts: T([[1, 0.35], [4, 0.05], [4, 0.55]]), fill: 'Yellow', opacity: 0.8 * opac, edge: lightEdge });
  prims.push({ kind: 'polygon', role: 'headlight', pts: T([[1, -0.35], [4, -0.05], [4, -0.55]]), fill: 'Yellow', opacity: 0.8 * opac, edge: lightEdge });
  // Darker[Gray]: axles and tyres
  prims.push({ kind: 'line', role: 'axle', pts: T([[-0.7, 0.35], [-0.7, -0.35]]), stroke: 'DarkerGray', opacity: opac });
  prims.push({ kind: 'line', role: 'axle', pts: T([[0.7, 0.35], [0.7, -0.35]]), stroke: 'DarkerGray', opacity: opac });
  const aL = wheelAngle(Alpha, 'left'), aR = wheelAngle(Alpha, 'right');
  // Rotate[Rectangle[{.5, .35}, {.9, .4}], angle, {.7, .375}] (front left tyre)
  prims.push({ kind: 'polygon', role: 'tyre-front-left', pts: T(rectPts([0.5, 0.35], [0.9, 0.4]).map((p) => rot(p, aL, [0.7, 0.375]))), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-back', pts: T(rectPts([-0.5, 0.35], [-0.9, 0.4])), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-back', pts: T(rectPts([-0.5, -0.35], [-0.9, -0.4])), fill: 'DarkerGray', opacity: opac, edge });
  prims.push({ kind: 'polygon', role: 'tyre-front-right', pts: T(rectPts([0.5, -0.35], [0.9, -0.4]).map((p) => rot(p, aR, [0.7, -0.375]))), fill: 'DarkerGray', opacity: opac, edge });
  // Black, Arrowheads[.02], Arrow[{{0, 0}, {1.0, 0}}]
  prims.push({ kind: 'arrow', role: 'arrow', pts: T([[0, 0], [1.0, 0]]), stroke: 'Black', opacity: opac, arrowhead: 0.02 });
  return { prims, wheelAngles: [aL, aR] };
}

// ---- drawPath: geometry of the path as data -------------------------------------
/**
 * drawPath[color, path, pose, minRadius:1, showConstruction:False]: the path's pieces in drawing order.
 * Returns a list, one entry per path element:
 *   { kind: 'arc', center, r, angS, angE, construction: {center, r} | null }   (Circle[center, minRadius, {angS, angE}])
 *   { kind: 'line', from, to }                                                  (Line[{posOld, pos}])
 */
export function drawPath(path, pose, minRadius = 1, showConstruction = false) {
  let gear, steer, param, posOld, angS, angE, center;
  let pos = [pose[0], pose[1]];
  let Theta = pose[2];
  const out = [];
  for (const e of path) {
    param = e[0]; steer = e[1]; gear = e[2]; posOld = pos;
    if (mEqual(steer, -1)) { // Left
      center = [pos[0] + minRadius * Math.cos(Theta + PI / 2), pos[1] + minRadius * Math.sin(Theta + PI / 2)];
      angS = Theta - PI / 2; angE = angS + gear * param;
      pos = [pos[0] + minRadius * (Math.cos(angE) - Math.cos(angS)), pos[1] + minRadius * (Math.sin(angE) - Math.sin(angS))];
      Theta = Theta + gear * param;
      out.push({ kind: 'arc', center, r: minRadius, angS, angE, construction: showConstruction ? { center, r: minRadius } : null });
    } else if (mEqual(steer, 1)) { // Right
      center = [pos[0] + minRadius * Math.cos(Theta - PI / 2), pos[1] + minRadius * Math.sin(Theta - PI / 2)];
      angS = Theta + PI / 2; angE = angS - gear * param;
      pos = [pos[0] + minRadius * (Math.cos(angE) - Math.cos(angS)), pos[1] + minRadius * (Math.sin(angE) - Math.sin(angS))];
      Theta = Theta - gear * param;
      out.push({ kind: 'arc', center, r: minRadius, angS, angE, construction: showConstruction ? { center, r: minRadius } : null });
    } else if (mEqual(steer, 0)) { // Straight
      const k = gear * minRadius * param;
      pos = [posOld[0] + k * Math.cos(Theta), posOld[1] + k * Math.sin(Theta)];
      out.push({ kind: 'line', from: posOld, to: pos });
    } else {
      out.push(null); // If[...] without a matching branch gives Null
    }
  }
  return out;
}

// ---- coordinates and angles ----------------------------------------------------
/**
 * changeOfBasisR[p1, p2, minRadius:1]: p2 = {x2, y2, Theta2} in the frame with origin {x1, y1} and rotation Theta1,
 * lengths divided by minRadius (so the formulas below work with radius 1).
 */
export function changeOfBasisR(p1, p2, minRadius = 1) {
  const Theta1 = p1[2];
  const dx = (p2[0] - p1[0]) / minRadius;
  const dy = (p2[1] - p1[1]) / minRadius;
  const xn = dx * Math.cos(Theta1) + dy * Math.sin(Theta1);
  const yn = -dx * Math.sin(Theta1) + dy * Math.cos(Theta1);
  const Thetan = p2[2] - p1[2];
  return [xn, yn, Thetan];
}

/** modπ[Theta]: Phi = Mod[Theta, 2π]; If[Phi < -π, Phi += 2π]; If[Phi > π, Phi -= 2π] — result in (-π, π]. */
export function modPi(Theta) {
  let Phi = mod(Theta, 2 * PI);
  // ORIGINAL QUIRK (Q-CP-05): Phi < -π can never be true (Mod gives 0 <= Phi < 2π); dead branch kept.
  if (mLess(Phi, -PI)) Phi = Phi + 2 * PI;
  // tolerant Greater: a Phi within Mathematica's tolerance of π stays (≈ π), it is not mapped to ≈ -π
  if (mGreater(Phi, PI)) Phi = Phi - 2 * PI;
  return Phi;
}

/** mod2π[Theta]: Phi = Mod[Theta, 2π]; If[Phi < 0, Phi += 2π] — result in [0, 2π). */
export function mod2Pi(Theta) {
  let Phi = mod(Theta, 2 * PI);
  // ORIGINAL QUIRK (Q-CP-05): Phi < 0 can never be true after Mod; dead branch kept.
  if (mLess(Phi, 0)) Phi = Phi + 2 * PI;
  return Phi;
}

/** angfrom1to2[p1, p2] := Last@cart2Polar[p2 - p1]: angle of the vector from p1 to p2. */
export const angfrom1to2 = (p1, p2) => cart2Polar(p2[0] - p1[0], p2[1] - p1[1])[1];

/** cart2Polar[x, y]: {r, Theta} with r = Sqrt[x^2 + y^2], Theta = If[r > 0, ArcTan[x, y], 0]. */
export function cart2Polar(x, y) {
  const r = Math.sqrt(x * x + y * y);
  const Theta = mGreater(r, 0) ? arcTan(x, y) : 0;
  return [r, Theta];
}

// ---- path elements ---------------------------------------------------------------
/** createPathElement[{param, steer, gear}] := If[param < 0, reverseGear[{-param, steer, gear}], {param, steer, gear}] */
export const createPathElement = ([param, steer, gear]) => (mLess(param, 0) ? reverseGear([-param, steer, gear]) : [param, steer, gear]);
// "+ 0": Mathematica has no signed zero (-0. is 0.), so the straight steering 0 stays +0 when reflected.
export const reverseSteering = (e) => [e[0], -e[1] + 0, e[2]];
export const reverseGear = (e) => [e[0], e[1], -e[2] + 0];
/** pathLength[path] := Total[path[[;; , 1]]] */
export const pathLength = (path) => total(path.map((e) => e[0]));

/**
 * N[path]: the formulas below already compute machine reals; N only turns the exact π/2 into 1.5707963267948966.
 * PORT DEVIATION (D-CP-01): with EXACT inputs (the original's integer initial settings) Mathematica evaluates the
 * formulas symbolically and rounds here once; the port always uses machine arithmetic (last-bit differences).
 */
const N = (path) => path.map((e) => e.map((v) => v + 0));

// ---- optimal paths ------------------------------------------------------------------
/** getOptimalPath[start, end, minRadius:1] := {First@MinimalBy[paths, pathLength], paths} */
export function getOptimalPath(start, end, minRadius = 1) {
  const paths = getAllPaths(start, end, minRadius);
  // ORIGINAL QUIRK (Q-CP-03): ties keep generation order (First of MinimalBy).
  return [minimalBy(paths, pathLength)[0], paths];
}

/** getOptimalDubinsPath[start, end, minRadius:1] */
export function getOptimalDubinsPath(start, end, minRadius = 1) {
  const paths = getAllDubinsPaths(start, end, minRadius);
  return [minimalBy(paths, pathLength)[0], paths];
}

/**
 * DeleteCases[paths, {0, _, _}, 2] then DeleteCases[paths, {}, 2].
 * ORIGINAL QUIRK (Q-CP-04): the pattern {0, _, _} has the EXACT integer 0, which never matches the machine real 0.
 * of N[path], so zero-length elements are kept. Only empty paths are removed.
 */
function cleanPaths(paths) {
  // DeleteCases[paths, {0, _, _}, 2]: no element matches (every element is a list of three machine reals) — nothing
  // to do. DeleteCases[paths, {}, 2]: removes the empty paths (formulas whose condition failed).
  return paths.filter((p) => p.length > 0);
}

/** getAllDubinsPaths[start, end, minRadius:1]: the paths of the 6 Dubins words {dLSL, dLSR, dRSR, dRSL, dLRL, dRLR}. */
export function getAllDubinsPaths(start, end, minRadius = 1) {
  const pathFns = [dLSL, dLSR, dRSR, dRSL, dLRL, dRLR];
  const paths = [];
  const [x, y, Theta] = changeOfBasisR(start, end, minRadius);
  for (const getPath of pathFns) paths.push(getPath(x, y, Theta));
  return cleanPaths(paths);
}

/** getAllPaths[start, end, minRadius:1]: the 12 formulas, each in 4 variants (plain, timeflip, reflect, both). */
export function getAllPaths(start, end, minRadius = 1) {
  const pathFns = [path1, path2, path3, path4, path5, path6, path7, path8, path9, path10, path11, path12];
  const paths = [];
  const [x, y, Theta] = changeOfBasisR(start, end, minRadius);
  for (const getPath of pathFns) {
    paths.push(getPath(x, y, Theta));
    paths.push(timeflip(getPath(-x, y, -Theta)));
    paths.push(reflect(getPath(x, -y, -Theta)));
    paths.push(reflect(timeflip(getPath(-x, -y, Theta))));
  }
  return cleanPaths(paths);
}

// ---- Dubins words ----------------------------------------------------------------------
export function dLSL(x, y, Phi) {
  const path = [];
  let [u, t] = cart2Polar(x - Math.sin(Phi), y - 1 + Math.cos(Phi));
  t = mod2Pi(t);
  const v = mod2Pi(Phi - t);
  path.push(createPathElement([t, sLEFT, gFORWARD]));
  path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
  path.push(createPathElement([v, sLEFT, gFORWARD]));
  return N(path);
}

export function dRSR(x, y, Phi) {
  const path = [];
  let [u, t] = cart2Polar(x + Math.sin(Phi), -y + Math.cos(Phi) - 1);
  t = mod2Pi(t);
  const v = mod2Pi(-t - Phi);
  path.push(createPathElement([t, sRIGHT, gFORWARD]));
  path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
  path.push(createPathElement([v, sRIGHT, gFORWARD]));
  return N(path);
}

export function dLSR(x, y, Phi) {
  const path = [];
  const [rho, t1] = cart2Polar(x + Math.sin(Phi), y - 1 - Math.cos(Phi));
  if (mGreaterEq(rho, 2)) {
    const u = Math.sqrt(rho * rho - 4);
    const t = mod2Pi(t1 + arcTan(u, 2));
    const v = mod2Pi(t - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  return N(path);
}

export function dRSL(x, y, Phi) {
  const path = [];
  const [rho, t1] = cart2Polar(x - Math.sin(Phi), -y - 1 - Math.cos(Phi));
  if (mGreaterEq(rho, 2)) {
    const u = Math.sqrt(rho * rho - 4);
    const t = mod2Pi(t1 + arcTan(u, 2));
    const v = mod2Pi(t + Phi);
    path.push(createPathElement([t, sRIGHT, gFORWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
    path.push(createPathElement([v, sLEFT, gFORWARD]));
  }
  return N(path);
}

export function dLRL(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4)) {
    const a = Math.acos(rho / 4);
    const t = mod2Pi(Theta + PI / 2 + a);
    const u = mod2Pi(PI + 2 * a);
    const v = mod2Pi(Phi - t + u);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gFORWARD]));
    path.push(createPathElement([v, sLEFT, gFORWARD]));
  }
  return N(path);
}

export function dRLR(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = -y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4)) {
    const a = Math.acos(rho / 4);
    const t = mod2Pi(Theta + PI / 2 + a);
    const u = mod2Pi(PI + 2 * a);
    const v = mod2Pi(-Phi - t + u);
    path.push(createPathElement([t, sRIGHT, gFORWARD]));
    path.push(createPathElement([u, sLEFT, gFORWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  return N(path);
}

// ---- transforms --------------------------------------------------------------------------
/** timeflip[path] := Map[reverseGear, path] */
export const timeflip = (path) => path.map(reverseGear);
/** reflect[path] := Map[reverseSteering, path] */
export const reflect = (path) => path.map(reverseSteering);

// ---- the 12 Reeds–Shepp formulas ---------------------------------------------------------------
/** Formula 8.1: CSC (same turns) */
export function path1(x, y, Phi) {
  const path = [];
  const [u, t] = cart2Polar(x - Math.sin(Phi), y - 1 + Math.cos(Phi));
  const v = modPi(Phi - t);
  path.push(createPathElement([t, sLEFT, gFORWARD]));
  path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
  path.push(createPathElement([v, sLEFT, gFORWARD]));
  return N(path);
}

/** Formula 8.2: CSC (opposite turns) */
export function path2(x, y, Phi) {
  const path = [];
  const [rho, t1] = cart2Polar(x + Math.sin(Phi), y - 1 - Math.cos(Phi));
  if (mGreaterEq(rho, 2)) {
    const u = Math.sqrt(rho * rho - 4);
    const t = modPi(t1 + arcTan(u, 2));
    const v = modPi(t - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  return N(path);
}

/** Formula 8.3: C|C|C */
export function path3(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4)) {
    const a = Math.acos(rho / 4);
    const t = modPi(Theta + PI / 2 + a);
    const u = modPi(PI - 2 * a);
    const v = modPi(Phi - t - u);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gBACKWARD]));
    path.push(createPathElement([v, sLEFT, gFORWARD]));
  }
  return N(path);
}

/** Formula 8.4 (1): C|CC */
export function path4(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4)) {
    const a = Math.acos(rho / 4);
    const t = modPi(Theta + PI / 2 + a);
    const u = modPi(PI - 2 * a);
    const v = modPi(t + u - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gBACKWARD]));
    path.push(createPathElement([v, sLEFT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.4 (2): CC|C */
export function path5(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4) && mGreater(rho, 0)) {
    const u = Math.acos(1 - (rho * rho) / 8);
    const a = Math.asin((2 * Math.sin(u)) / rho);
    const t = modPi(Theta + PI / 2 - a);
    const v = modPi(t - u - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gFORWARD]));
    path.push(createPathElement([v, sLEFT, gBACKWARD]));
  }
  if (mEqual(rho, 0)) { // the original's extra branch for rho == 0 (a = 0); the Python source divides by zero here
    const u = Math.acos(1 - (rho * rho) / 8);
    const a = 0;
    const t = modPi(Theta + PI / 2 - a);
    const v = modPi(t - u - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gFORWARD]));
    path.push(createPathElement([v, sLEFT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.7: CCu|CuC */
export function path6(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = y - 1 - Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mLessEq(rho, 4)) {
    let a, t, u, v;
    if (mLessEq(rho, 2)) {
      a = Math.acos((rho + 2) / 4);
      t = modPi(Theta + PI / 2 + a);
      u = modPi(a);
      v = modPi(Phi - t + 2 * u);
    } else {
      a = Math.acos((rho - 2) / 4);
      t = modPi(Theta + PI / 2 - a);
      u = modPi(PI - a);
      v = modPi(Phi - t + 2 * u);
    }
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gFORWARD]));
    path.push(createPathElement([u, sLEFT, gBACKWARD]));
    path.push(createPathElement([v, sRIGHT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.8: C|CuCu|C */
export function path7(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = y - 1 - Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  const u1 = (20 - rho * rho) / 16;
  if (mLessEq(rho, 6) && mGreater(rho, 0) && mLessEq(0, u1) && mLessEq(u1, 1)) {
    const u = Math.acos(u1);
    const a = Math.asin((2 * Math.sin(u)) / rho);
    const t = modPi(Theta + PI / 2 + a);
    const v = modPi(t - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gBACKWARD]));
    path.push(createPathElement([u, sLEFT, gBACKWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  // ORIGINAL QUIRK (Q-CP-05): with rho == 0, u1 = 20/16 > 1, so this branch of the original can never run; kept.
  if (mEqual(rho, 0) && mLessEq(0, u1) && mLessEq(u1, 1)) {
    const u = Math.acos(u1);
    const a = 0;
    const t = modPi(Theta + PI / 2 + a);
    const v = modPi(t - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sRIGHT, gBACKWARD]));
    path.push(createPathElement([u, sLEFT, gBACKWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  return N(path);
}

/** Formula 8.9 (1): C|C[pi/2]SC */
export function path8(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mGreaterEq(rho, 2)) {
    const u = Math.sqrt(rho * rho - 4) - 2;
    const a = arcTan(u + 2, 2);
    const t = modPi(Theta + PI / 2 + a);
    const v = modPi(t - Phi + PI / 2);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([PI / 2, sRIGHT, gBACKWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gBACKWARD]));
    path.push(createPathElement([v, sLEFT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.9 (2): CSC[pi/2]|C */
export function path9(x, y, Phi) {
  const path = [];
  const xi = x - Math.sin(Phi);
  const eta = y - 1 + Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mGreaterEq(rho, 2)) {
    const u = Math.sqrt(rho * rho - 4) - 2;
    const a = arcTan(2, u + 2);
    const t = modPi(Theta + PI / 2 - a);
    const v = modPi(t - Phi - PI / 2);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
    path.push(createPathElement([PI / 2, sRIGHT, gFORWARD]));
    path.push(createPathElement([v, sLEFT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.10 (1): C|C[pi/2]SC */
export function path10(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = y - 1 - Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mGreaterEq(rho, 2)) {
    const t = modPi(Theta + PI / 2);
    const u = rho - 2;
    const v = modPi(Phi - t - PI / 2);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([PI / 2, sRIGHT, gBACKWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gBACKWARD]));
    path.push(createPathElement([v, sRIGHT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.10 (2): CSC[pi/2]|C */
export function path11(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = y - 1 - Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mGreaterEq(rho, 2)) {
    const t = modPi(Theta);
    const u = rho - 2;
    const v = modPi(Phi - t - PI / 2);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gFORWARD]));
    path.push(createPathElement([PI / 2, sLEFT, gFORWARD]));
    path.push(createPathElement([v, sRIGHT, gBACKWARD]));
  }
  return N(path);
}

/** Formula 8.11: C|C[pi/2]SC[pi/2]|C */
export function path12(x, y, Phi) {
  const path = [];
  const xi = x + Math.sin(Phi);
  const eta = y - 1 - Math.cos(Phi);
  const [rho, Theta] = cart2Polar(xi, eta);
  if (mGreaterEq(rho, 4)) {
    const u = Math.sqrt(rho * rho - 4) - 4;
    const a = arcTan(u + 4, 2);
    const t = modPi(Theta + PI / 2 + a);
    const v = modPi(t - Phi);
    path.push(createPathElement([t, sLEFT, gFORWARD]));
    path.push(createPathElement([PI / 2, sRIGHT, gBACKWARD]));
    path.push(createPathElement([u, sSTRAIGHT, gBACKWARD]));
    path.push(createPathElement([PI / 2, sLEFT, gBACKWARD]));
    path.push(createPathElement([v, sRIGHT, gFORWARD]));
  }
  return N(path);
}

// ---- the Manipulate's state and body ----------------------------------------------------------------
export const LOCS0 = [[-10, -5], [-10, -7], [8, 5], [10, 4]]; // {{locs, {{-10,-5},{-10,-7},{8,5},{10,4}}}, ...}
export const LOCATOR_RANGE = [[-14, -9], [14, 9]]; // {-14, -9}, {14, 9}: range of the Manipulate locators
export const POS_LIMIT = [13, 8]; // the body clamps the car positions to ±13 × ±8
export const PLOT_RANGE = [[-15, 15], [-10, 10]];
export const TYPES = ['Reeds-Shepp', 'Dubins'];

const copyLocs = (l) => l.map((p) => [...p]);

/** Initial values of the Manipulate variables (first value of each control spec). */
export function initialState() {
  return {
    locs: copyLocs(LOCS0),
    locsOld: copyLocs(LOCS0),
    progress: 0.0,
    progressOld: -1,
    optPath: [[0, 0, 1]],
    minRadius: 3,
    type: 'Reeds-Shepp',
  };
}

/** Button "swap start and goal": locs = Join[locs[[3;;4]], locs[[1;;2]]]; locsOld = locs */
export function swapStartGoal(st) {
  const locs = [...copyLocs(st.locs.slice(2, 4)), ...copyLocs(st.locs.slice(0, 2))];
  return { ...st, locs, locsOld: copyLocs(locs) };
}

const numericQ = (v) => typeof v === 'number' && Number.isFinite(v);

/** Round[x, 0.01] as displayed by the original's plot label. */
export const round01 = (x) => roundTo(x, 0.01);

/**
 * One evaluation of the Manipulate body, as Mathematica runs it after any control changed.
 * Takes the state (with `locs` possibly moved by the user) and returns { state, view }.
 */
export function evaluate(stateIn) {
  const st = { ...stateIn, locs: copyLocs(stateIn.locs), locsOld: copyLocs(stateIn.locsOld), optPath: stateIn.optPath.map((e) => [...e]) };
  const { locs, locsOld } = st;
  let sTheta, gTheta;
  // ORIGINAL QUIRK (Q-CP-02): positions are clamped to ±13 × ±8, tighter than the locator range ±14 × ±9.
  const clampPos = (p) => { // Tighter constraints on positions than on orientations
    if (mGreater(p[0], POS_LIMIT[0])) p[0] = POS_LIMIT[0];
    if (mLess(p[0], -POS_LIMIT[0])) p[0] = -POS_LIMIT[0];
    if (mGreater(p[1], POS_LIMIT[1])) p[1] = POS_LIMIT[1];
    if (mLess(p[1], -POS_LIMIT[1])) p[1] = -POS_LIMIT[1];
  };
  const marker = (p, th) => [p[0] + 2 * Math.cos(th), p[1] + 2 * Math.sin(th)]; // locs[[1]] + 2{Cos[θ], Sin[θ]}

  // start position moved: keep the OLD heading, move the orientation marker with the car
  if (!mEqual(locsOld[0], locs[0])) {
    clampPos(locs[0]);
    sTheta = angfrom1to2(locsOld[0], locsOld[1]);
    locs[1] = marker(locs[0], sTheta);
    locsOld[0] = [...locs[0]]; locsOld[1] = [...locs[1]];
  } else {
    sTheta = angfrom1to2(locs[0], locs[1]);
  }
  if (!mEqual(locsOld[1], locs[1])) {
    locs[1] = marker(locs[0], sTheta); // force orientation marker to be 2 units away
    locsOld[1] = [...locs[1]];
  }
  // goal: the same for locators 3 and 4
  if (!mEqual(locsOld[2], locs[2])) {
    clampPos(locs[2]);
    gTheta = angfrom1to2(locsOld[2], locsOld[3]);
    locs[3] = marker(locs[2], gTheta);
    locsOld[2] = [...locs[2]]; locsOld[3] = [...locs[3]];
  } else {
    gTheta = angfrom1to2(locs[2], locs[3]);
  }
  if (!mEqual(locsOld[3], locs[3])) {
    locs[3] = marker(locs[2], gTheta);
    locsOld[3] = [...locs[3]];
  }

  const start = [locs[0][0], locs[0][1], sTheta];
  const goal = [locs[2][0], locs[2][1], gTheta]; // m, m, radians
  // Input error correction
  if (!numericQ(st.minRadius)) st.minRadius = 3;
  if (mLess(st.minRadius, 0.001)) st.minRadius = 0.001;
  if (mGreater(st.minRadius, 10)) st.minRadius = 10;
  if (!numericQ(st.progress)) st.progress = 0;
  if (mLess(st.progress, 0)) st.progress = 0;
  if (mGreater(st.progress, 1)) st.progress = 1;

  // ORIGINAL QUIRK (Q-CP-06): "Only recompute path if something besides progress changes" — but progressOld starts at
  // -1 and is only assigned in the branch that needs progressOld != -1, so it stays -1 and the path is recomputed on
  // every evaluation. Kept as written.
  let paths = null, recomputed = false;
  if (mEqual(st.progress, st.progressOld) || mEqual(st.progressOld, -1)) {
    [st.optPath, paths] = st.type === 'Reeds-Shepp' ? getOptimalPath(start, goal, st.minRadius) : getOptimalDubinsPath(start, goal, st.minRadius);
    recomputed = true;
  } else {
    st.progressOld = st.progress;
  }

  const [ppos, pTheta, palpha] = getPos(st.optPath, start, st.minRadius, st.progress); // car state along the path

  // PlotLabel: Row[{"path length: ", Round[N[pathLength[optPath]*minRadius], 0.01], "   distance: ", N[Round[Norm[goal-start], 0.01]]}]
  // ORIGINAL QUIRK (Q-CP-01): "distance" is the norm of the {x, y, θ} difference (heading difference included).
  const pathLengthValue = round01(pathLength(st.optPath) * st.minRadius);
  const distanceValue = round01(normExact([goal[0] - start[0], goal[1] - start[1], goal[2] - start[2]]));
  return {
    state: st,
    view: { start, goal, sTheta, gTheta, ppos, pTheta, palpha, paths, recomputed, pathLengthValue, distanceValue },
  };
}
