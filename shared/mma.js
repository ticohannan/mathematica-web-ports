// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma.js
// Small helpers that reproduce Mathematica (Wolfram Language) numeric semantics
// the original notebooks rely on. Pure functions: no DOM, safe to import in Node tests.
//
// Why this exists: the ports are line-by-line translations. Mathematica's
// Equal/Less on machine reals use a tolerance, ArcTan[x, y] takes its
// arguments in the opposite order from Math.atan2, Mod has an offset form,
// Round rounds half to even, etc. Getting these wrong produces subtle
// geometry differences, so they are centralised here and unit tested.

/** Relative tolerance used by Mathematica Equal for machine reals
 *  ("differ in at most their last seven binary digits"): 2^-46. */
export const MMA_REL_TOL = 2 ** -46;

/** Default Chop tolerance in Mathematica. */
export const CHOP_TOL = 1e-10;

function isArr(x) { return Array.isArray(x); }

/** Mathematica Equal (==) for numbers or equal-shape nested arrays. */
export function mEqual(a, b) {
  if (isArr(a) || isArr(b)) {
    if (!isArr(a) || !isArr(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!mEqual(a[i], b[i])) return false;
    return true;
  }
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= MMA_REL_TOL * Math.max(Math.abs(a), Math.abs(b));
}
export const mUnequal = (a, b) => !mEqual(a, b);
export const mLess = (a, b) => a < b && !mEqual(a, b);
export const mGreater = (a, b) => a > b && !mEqual(a, b);
export const mLessEq = (a, b) => a < b || mEqual(a, b);
export const mGreaterEq = (a, b) => a > b || mEqual(a, b);

/** Chop[x, tol]: replace numbers with |x| < tol by 0. Works on nested arrays. */
export function chop(x, tol = CHOP_TOL) {
  if (isArr(x)) return x.map((v) => chop(v, tol));
  return Math.abs(x) < tol ? 0 : x;
}

/** Mathematica ArcTan[x, y] (note argument order!) = atan2(y, x), range (-pi, pi].
 *  "+ 0" converts IEEE negative zero to +0: Mathematica has no signed zero,
 *  so ArcTan[-1., 0.] is +pi, never -pi. */
export function arcTan(x, y) {
  return Math.atan2(y + 0, x + 0);
}

/** Mathematica Mod[m, n, d]: result in [d, d + n). */
export function mod(m, n, d = 0) {
  return m - n * Math.floor((m - d) / n);
}

/** Mathematica Round[x]: nearest integer, halves go to the even integer. */
export function roundHalfEven(x) {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return r;
}

/** Mathematica Round[x, a] = a * Round[x / a]. Works on nested arrays. */
export function roundTo(x, a) {
  if (isArr(x)) return x.map((v) => roundTo(v, a));
  return a * roundHalfEven(x / a);
}

/** Mathematica CirclePoints[n]: n points on the unit circle, counter-clockwise,
 *  first point at angle -pi/2 + pi/n (polygon has a flat bottom edge).
 *  Verified against coordinates cached in the original notebook. */
export function circlePoints(n) {
  // Mathematica evaluates CirclePoints[n] exactly (radicals such as Sqrt[3]/2),
  // so mirror-symmetric vertices have bit-identical coordinates and parallel
  // edges have EXACTLY equal normal angles. Math.cos/sin of the raw angles are
  // off by an ulp between symmetric angles, which changes the original's
  // Minkowski-sum tie order. So: use exact closed forms, chosen to reproduce the
  // coordinates cached in the original notebook bit for bit (tests/golden).
  const pts = [];
  for (let k = 0; k < n; k++) {
    const deg = -90 + 180 / n + (360 * k) / n;
    pts.push(exactCosSinDeg(deg));
  }
  return pts;
}

const S5 = Math.sqrt(5);
// cos/sin of reference angles 0..90 degrees as correctly rounded closed forms
const REF = {
  0: [1, 0],
  18: [Math.sqrt(10 + 2 * S5) / 4, (S5 - 1) / 4],
  30: [Math.sqrt(3) / 2, 0.5],
  36: [(1 + S5) / 4, Math.sqrt(10 - 2 * S5) / 4],
  45: [1 / Math.sqrt(2), 1 / Math.sqrt(2)], // 0.7071067811865475, as in the original's cached data (Math.SQRT1_2 is 1 ulp larger)
  54: [Math.sqrt(10 - 2 * S5) / 4, (1 + S5) / 4],
  60: [0.5, Math.sqrt(3) / 2],
  72: [(S5 - 1) / 4, Math.sqrt(10 + 2 * S5) / 4],
  90: [0, 1],
};

/** [cos, sin] of an angle in degrees, exact-symmetric for the angles CirclePoints[3..6] uses. */
export function exactCosSinDeg(deg) {
  let d = ((deg % 360) + 360) % 360;
  const q = Math.floor(d / 90);
  const r = d - 90 * q;
  const base = REF[r] ?? [Math.cos((r * Math.PI) / 180), Math.sin((r * Math.PI) / 180)];
  const [c, s] = base;
  const out = [[c, s], [-s, c], [-c, -s], [s, -c]][q];
  return [out[0] + 0, out[1] + 0]; // "+ 0" turns -0 into +0
}

/**
 * Mathematica Sort[list, p] emulation: merge sort where, when merging, the
 * left element is taken only if p[left, right] is True; otherwise the right
 * one is taken. With a strict predicate (Less) this places tied elements in
 * REVERSE input order, which is what the original Minkowski-sum code depends
 * on. (Behaviour confirmed by the golden-fixture tests against the cached
 * output of the original notebook; see tests/golden.test.js.)
 */
export function sortMma(list, p) {
  if (list.length <= 1) return list.slice();
  const mid = Math.floor(list.length / 2);
  const L = sortMma(list.slice(0, mid), p);
  const R = sortMma(list.slice(mid), p);
  const out = [];
  let i = 0, j = 0;
  while (i < L.length && j < R.length) {
    if (p(L[i], R[j]) === true) out.push(L[i++]);
    else out.push(R[j++]);
  }
  while (i < L.length) out.push(L[i++]);
  while (j < R.length) out.push(R[j++]);
  return out;
}

// --- small vector helpers (2D unless noted) ---------------------------------
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, s) => a.map((v) => v * s);
export const neg = (a) => a.map((v) => -v);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const norm = (a) => Math.hypot(...a);
export const dist = (a, b) => norm(sub(a, b));
export function normalize(a) {
  const n = norm(a);
  return n === 0 ? a.slice() : a.map((v) => v / n);
}
/** Det[{u, v}] for 2-vectors. */
export const det2 = (u, v) => u[0] * v[1] - u[1] * v[0];
/**
 * Mathematica Total[list] for machine reals. Total does not add strictly left
 * to right; a compensated (Neumaier) sum reproduces the original's cached
 * results bit for bit, plain left-to-right addition does not.
 */
export function total(xs) {
  let s = 0, c = 0;
  for (const x of xs) {
    const t = s + x;
    c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s;
    s = t;
  }
  return s + c;
}
/** EuclideanDistance[a, b] = Sqrt[Total[(a-b)^2]] (not Math.hypot, which rounds differently). */
export const euclid = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
/** Mean of a list of points. */
export function mean(pts) {
  const s = pts.reduce((acc, p) => add(acc, p), pts[0].map(() => 0));
  return scale(s, 1 / pts.length);
}
/** Canonical (lexicographic) comparison of flat or nested numeric arrays,
 *  matching Mathematica's canonical order for lists of equal shape. */
export function canonicalCompare(a, b) {
  if (isArr(a)) {
    for (let i = 0; i < a.length; i++) {
      const c = canonicalCompare(a[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}
/** Exact structural key for points / segments (SameQ-style matching). */
export const key = (x) => JSON.stringify(x);
/** Same result as `key(a) === key(b)` for nested arrays of finite numbers, without building strings. */
export function sameKey(a, b) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!sameKey(a[i], b[i])) return false;
    return true;
  }
  return a === b;
}
