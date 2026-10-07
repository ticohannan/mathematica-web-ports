// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/mma-extra.js — further Wolfram Language list semantics needed by the second set of ports.
// Kept separate from shared/mma.js so that file stays unchanged for the first three apps.
// Pure functions, no DOM.

/**
 * Nearest[pts, x, {n, r}, DistanceFunction -> dist]: up to n elements of pts within distance r of x,
 * nearest first. Ties (equal distance) keep the input order — an ASSUMPTION: Mathematica's tie order
 * for a custom DistanceFunction is not documented (lead to check against the original).
 * n = Infinity allowed; r = Infinity allowed.
 */
export function nearest(pts, x, { n = 1, r = Infinity } = {}, dist = euclidean) {
  const scored = [];
  for (let i = 0; i < pts.length; i++) {
    const d = dist(pts[i], x);
    if (d <= r) scored.push({ i, d });
  }
  scored.sort((a, b) => a.d - b.d || a.i - b.i);
  return scored.slice(0, n).map((s) => pts[s.i]);
}

export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** MinimalBy[list, f] (all minimal elements, in input order). First@MinimalBy = minimalBy(...)[0]. */
export function minimalBy(list, f) {
  let best = Infinity;
  const vals = list.map(f);
  for (const v of vals) if (v < best) best = v;
  return list.filter((_, i) => vals[i] === best);
}

/** Position[list, x, 1, 1] style lookup with exact (===, element-wise) equality; returns 0-based index or -1. */
export function positionOf(list, x) {
  outer: for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (Array.isArray(x)) {
      if (!Array.isArray(e) || e.length !== x.length) continue;
      for (let k = 0; k < x.length; k++) if (e[k] !== x[k]) continue outer;
      return i;
    }
    if (e === x) return i;
  }
  return -1;
}

/** Accumulate[list] (running sums, left to right). */
export function accumulate(xs) {
  let s = 0;
  return xs.map((v) => (s += v));
}

/** Clip[x, {min, max}] */
export const clip = (x, [a, b]) => Math.min(Math.max(x, a), b);

/** Ceiling, as Mathematica (for finite reals). */
export const ceiling = Math.ceil;

/**
 * Number formatting like Mathematica's StandardForm output of a machine real in text:
 * shortest round-trip digits, at most 6 significant digits shown (Mathematica shows 6 by default),
 * trailing "." for integral reals (e.g. 3.), integers unchanged.
 */
export function mmaNumberString(v, { isReal = !Number.isInteger(v) } = {}) {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'Indeterminate';
  if (!isReal) return String(v);
  if (v === 0) return '0.';
  let s = Number(v.toPrecision(6)).toString();
  if (/e/.test(s)) {
    const [m, e] = s.split('e');
    return `${m}×10^${Number(e)}`;
  }
  if (!s.includes('.')) s += '.';
  return s;
}
