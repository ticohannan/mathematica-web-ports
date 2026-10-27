// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/wl.js — Wolfram Language list, vector and number functions under their Mathematica names, for NEW apps written
// on the Manipulate layer ("simple mode", internal porting guide §1). Plain JavaScript arithmetic: results agree with
// Mathematica up to rounding, not bit for bit. The course ports that must reproduce an original bit for bit keep their
// exact helpers (shared/mma.js, mma-exact.js, exact-pi.js); do not mix the two in one computation (the tolerant
// comparisons below are re-exported from shared/mma.js: the same semantics, no exact arithmetic).
//
// Conventions (as in Mathematica, adapted to JavaScript):
//   - lists are arrays, vectors are arrays of numbers, matrices arrays of rows; positions are 1-based where Mathematica
//     returns positions (Position, MapIndexed), and functions take negative indices like Take[list, -n];
//   - a function argument stands for a pure function: Select(list, (x) => x > 0) is Select[list, # > 0 &];
//   - iterators are arrays: [n] (1..n), [min, max], [min, max, step], or [[v1, v2, …]] (explicit values);
//   - nothing here mutates its arguments.
//
// Arithmetic Plus, Subtract, Times, Divide, Minus — listable like Mathematica's (vectors and numbers mix)
// Lists     Range, Table, Subdivide, Array, ConstantArray, Partition, Flatten, Transpose, Take, Drop, First, Last, Most,
//           Rest, Part, Join, Append, Prepend, Reverse, RotateLeft, RotateRight, Select, Position, Count, MemberQ,
//           FreeQ, DeleteDuplicates, Union, Intersection, Complement, Tally, Ordering, Accumulate, Differences, Fold, FoldList,
//           Nest, NestList, NestWhile, FixedPoint, Total, Mean, Median, Max, Min, Sort, SortBy, MinimalBy,
//           MaximalBy, MapThread, MapIndexed, Riffle, Thread, Outer, Tuples, Length, Dimensions
// Vectors   Dot, Cross, Norm, Normalize, EuclideanDistance, Det, Inverse, IdentityMatrix, RotationMatrix,
//           RotationTransform, TranslationTransform, AngleVector, VectorAngle, Nearest
// Numbers   Pi, E, Degree, Infinity, ArcTan, Mod, Quotient, Round, Floor, Ceiling, IntegerPart, FractionalPart, Sign,
//           Abs, Sqrt, Clip, Rescale, Chop, Boole, UnitStep, Sin, Cos, Tan, Exp, Log, Power, Min/Max of numbers
// Statistics Erf, Binomial, NormalDistribution, UniformDistribution, TriangularDistribution, PDF, CDF, Mean / Variance /
//           StandardDeviation (of a distribution or a list), RandomVariate (v0.1.23)
// Compare   Equal, Unequal, Less, Greater, LessEqual, GreaterEqual with Mathematica's tolerance for machine reals
//           (numbers equal in all but their last seven bits, ≈ 2⁻⁴⁶ relative; lists element by element) (v0.1.25)
// Caching   cacheLast() — recompute only when the arguments change (the originals' "…Old" variables)
// Random    RandomReal, RandomInteger, RandomChoice, RandomSample (optional last argument: a shared/random.js source,
//           e.g. Manipulate's ctx.rng or createRng({ seed }), for reproducible draws)

import { mEqual, mLess, mGreater, mLessEq, mGreaterEq } from './mma.js';

const isArr = Array.isArray;
const fail = (m) => { throw new Error(`wl: ${m}`); };

// ---- numbers -------------------------------------------------------------------------------------------------------
export const Pi = Math.PI, E = Math.E, Degree = Math.PI / 180, Infinity = globalThis.Infinity;
export const { sin: Sin, cos: Cos, tan: Tan, exp: Exp, sqrt: Sqrt, abs: Abs, floor: Floor, ceil: Ceiling, sign: Sign } = Math;
/** Log[x], Log[b, x] */
export const Log = (a, b) => (b === undefined ? Math.log(a) : Math.log(b) / Math.log(a));
export const Power = (a, b) => a ** b;
/** ArcTan[y/x] or ArcTan[x, y] (Mathematica's argument order: x first; ArcTan[0, 0] is 0 here, Indeterminate there). */
export const ArcTan = (x, y) => (y === undefined ? Math.atan(x) : Math.atan2(y + 0, x + 0)); // + 0: Mathematica has no −0 (ArcTan[−1, −0.] = π), v0.1.26
/** Mod[m, n] with the sign of n (also for reals); Mod[m, n, d] gives a result in [d, d + n). */
export const Mod = (m, n, d = 0) => m - n * Math.floor((m - d) / n);
export const Quotient = (m, n) => Math.floor(m / n);
/** Round[x] (halves to even, as Mathematica), Round[x, a] (nearest multiple of a). */
export function Round(x, a) {
  if (a !== undefined) return Round(x / a) * a;
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}
export const IntegerPart = (x) => Math.trunc(x);
export const FractionalPart = (x) => x - Math.trunc(x);
/** Clip[x], Clip[x, {min, max}] */
export const Clip = (x, [a, b] = [-1, 1]) => Math.min(Math.max(x, a), b);
/** Rescale[x, {min, max}] (to [0, 1]) or Rescale[x, {min, max}, {ymin, ymax}] */
export const Rescale = (x, [a, b], [c, d] = [0, 1]) => c + ((x - a) * (d - c)) / (b - a);
/** Chop[x] or Chop[list]: numbers with |x| < delta (default 1e-10) become 0. */
export const Chop = (x, delta = 1e-10) => (isArr(x) ? x.map((y) => Chop(y, delta)) : Math.abs(x) < delta ? 0 : x);
export const Boole = (b) => (b ? 1 : 0);
export const UnitStep = (x) => (x >= 0 ? 1 : 0);

// ---- listable arithmetic (Mathematica's Plus, Subtract, Times, Divide thread over lists; numbers broadcast) -------
const thread2 = (f) => function op(a, b) {
  if (isArr(a) && isArr(b)) { if (a.length !== b.length) fail('lists of different lengths'); return a.map((x, i) => op(x, b[i])); }
  if (isArr(a)) return a.map((x) => op(x, b));
  if (isArr(b)) return b.map((y) => op(a, y));
  return f(a, b);
};
const add2 = thread2((a, b) => a + b), mul2 = thread2((a, b) => a * b);
/** Plus[a, b, …]: Plus([1, 2], [3, 4]) → [4, 6]; Plus(p, 1) adds 1 to every element (also nested lists). */
export const Plus = (...xs) => (xs.length ? xs.reduce(add2) : 0);
/** Subtract[a, b] = a − b, threaded */
export const Subtract = thread2((a, b) => a - b);
/** Times[a, b, …]: Times(2, v) scales a vector; Times(u, v) multiplies elementwise (Dot for the inner product). */
export const Times = (...xs) => (xs.length ? xs.reduce(mul2) : 1);
/** Divide[a, b] = a / b, threaded */
export const Divide = thread2((a, b) => a / b);
/** Minus[a] = −a, threaded */
export const Minus = (a) => (isArr(a) ? a.map(Minus) : -a);

// ---- iterators and construction ------------------------------------------------------------------------------------
/** Range[n], Range[min, max], Range[min, max, step] (steps computed as min + k·step, so no drift accumulates). */
export function Range(a, b, step = 1) {
  if (b === undefined) [a, b] = [1, a];
  if (step === 0) fail('Range step 0');
  const n = Math.floor((b - a) / step + 1e-12) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, k) => a + k * step);
}
const iterValues = (it) => {
  if (!isArr(it)) fail('an iterator is an array: [n], [min, max], [min, max, step] or [[values…]]');
  if (it.length === 1) return isArr(it[0]) ? it[0] : Range(it[0]);
  return Range(it[0], it[1], it[2] ?? 1);
};
/** Table[f[i, j], {i, …}, {j, …}]: Table((i, j) => …, [1, 3], [0, 1, 0.5]) — nested lists, the first iterator outermost. */
export function Table(f, ...iters) {
  if (!iters.length) fail('Table needs an iterator');
  const go = (k, args) => iterValues(iters[k]).map((v) => (k === iters.length - 1 ? f(...args, v) : go(k + 1, [...args, v])));
  return go(0, []);
}
/** Array[f, n] (f(1) … f(n)) or Array[f, {n, m}]. */
export const Array_ = (f, dims) => (isArr(dims) ? Table(f, ...dims.map((n) => [n])) : Table(f, [dims]));
export { Array_ as Array };
export const ConstantArray = (c, dims) => (isArr(dims) && dims.length > 1
  ? Array.from({ length: dims[0] }, () => ConstantArray(c, dims.slice(1)))
  : Array.from({ length: isArr(dims) ? dims[0] : dims }, () => (isArr(c) ? structuredClone(c) : c)));
/** Subdivide[n] (0 … 1 in n parts), Subdivide[max, n], Subdivide[min, max, n]. */
export function Subdivide(a, b, n) {
  if (b === undefined) [a, b, n] = [0, 1, a];
  else if (n === undefined) [a, b, n] = [0, a, b];
  return Array.from({ length: n + 1 }, (_, k) => (k === n ? b : a + ((b - a) * k) / n));
}
export const Length = (list) => list.length;
export function Dimensions(x) {
  const d = [];
  for (let y = x; isArr(y); y = y[0]) d.push(y.length);
  return d;
}

// ---- parts -----------------------------------------------------------------------------------------------------------
const idx = (list, i) => (i > 0 ? i - 1 : list.length + i);
/** Part[list, i, j, …] — list[[i, j]] with 1-based (and negative) indices. */
export const Part = (list, ...ix) => ix.reduce((l, i) => {
  const k = idx(l, i);
  if (k < 0 || k >= l.length) fail(`Part ${i} of a list of length ${l.length} does not exist`);
  return l[k];
}, list);
export const First = (list) => Part(list, 1);
export const Last = (list) => Part(list, -1);
export const Most = (list) => list.slice(0, -1);
export const Rest = (list) => list.slice(1);
/** Take[list, n], Take[list, -n], Take[list, {m, n}] */
export const Take = (list, n) => (isArr(n) ? list.slice(idx(list, n[0]), idx(list, n[1]) + 1) : n >= 0 ? list.slice(0, n) : list.slice(n));
/** Drop[list, n], Drop[list, -n], Drop[list, {m, n}] */
export const Drop = (list, n) => (isArr(n) ? [...list.slice(0, idx(list, n[0])), ...list.slice(idx(list, n[1]) + 1)]
  : n >= 0 ? list.slice(n) : list.slice(0, n));
export const Join = (...lists) => [].concat(...lists);
export const Append = (list, x) => [...list, x];
export const Prepend = (list, x) => [x, ...list];
export const Reverse = (list) => [...list].reverse();
export const RotateLeft = (list, n = 1) => { const k = Mod(n, list.length || 1); return [...list.slice(k), ...list.slice(0, k)]; };
export const RotateRight = (list, n = 1) => RotateLeft(list, -n);
/** Partition[list, n] (non-overlapping, drops an incomplete tail), Partition[list, n, d] (offset d). */
export function Partition(list, n, d = n) {
  const out = [];
  for (let i = 0; i + n <= list.length; i += d) out.push(list.slice(i, i + n));
  return out;
}
/** Flatten[list] or Flatten[list, n] (n levels). */
export const Flatten = (list, n = Infinity) => list.flat(n);
export const Transpose = (m) => (m.length ? m[0].map((_, j) => m.map((row) => row[j])) : []);
/** Riffle[list, x] (x between the elements), Riffle[list, ys] (ys of length n − 1 between, or n: also after the last). */
export const Riffle = (list, x) => list.flatMap((v, i) => (isArr(x) ? (i < x.length ? [v, x[i]] : [v]) : i < list.length - 1 ? [v, x] : [v]));

// ---- selecting and counting ----------------------------------------------------------------------------------------
const test = (p) => (typeof p === 'function' ? (x) => p(x) : (x) => sameQ(x, p)); // one argument, as Mathematica's #
const sameQ = (a, b) => a === b || (isArr(a) && isArr(b) && a.length === b.length && a.every((x, i) => sameQ(x, b[i])));
export const Select = (list, p, n = Infinity) => { const out = []; for (const x of list) { if (out.length >= n) break; if (p(x)) out.push(x); } return out; };
/** Position[list, value or predicate] at level 1: [[i1], [i2], …] (1-based, as Mathematica). */
export const Position = (list, p) => list.flatMap((x, i) => (test(p)(x) ? [[i + 1]] : []));
export const Count = (list, p) => list.filter(test(p)).length;
export const MemberQ = (list, p) => list.some(test(p));
export const FreeQ = (list, p) => !MemberQ(list, p);
export const DeleteDuplicates = (list) => list.filter((x, i) => list.findIndex((y) => sameQ(x, y)) === i);
// Mathematica's canonical order: numbers by value, then strings (a < A < b < B), then lists (shorter first, then by
// elements)
const rank = (a) => (typeof a === 'number' ? 0 : typeof a === 'string' ? 1 : isArr(a) ? 2 : 3);
function canonical(a, b) {
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return a - b;
  if (ra === 1) {
    const la = a.toLowerCase(), lb = b.toLowerCase();
    if (la !== lb) return la < lb ? -1 : 1;
    return a === b ? 0 : a > b ? -1 : 1; // lower case first
  }
  if (ra === 2) {
    if (a.length !== b.length) return a.length - b.length;
    for (let i = 0; i < a.length; i++) { const c = canonical(a[i], b[i]); if (c) return c; }
    return 0;
  }
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
export const Sort = (list, cmp) => [...list].sort(cmp ? (a, b) => (cmp(a, b) ? -1 : cmp(b, a) ? 1 : 0) : canonical);
export const Union = (...lists) => Sort(DeleteDuplicates(Join(...lists)));
export const Intersection = (a, ...rest) => Sort(DeleteDuplicates(a.filter((x) => rest.every((l) => MemberQ(l, x)))));
export const Complement = (a, ...rest) => Sort(DeleteDuplicates(a.filter((x) => rest.every((l) => FreeQ(l, x)))));
/** Tally[list] → [[value, count], …] in order of first appearance. */
export const Tally = (list) => DeleteDuplicates(list).map((x) => [x, Count(list, x)]);
/** SortBy[list, f]: ties in f are ordered canonically by the elements themselves (as Mathematica). */
/** Ordering[list]: the 1-based positions that put the list in canonical order (ties keep their order). v0.1.23 */
export const Ordering = (list) => list.map((v, i) => [v, i]).sort((a, b) => canonical(a[0], b[0]) || a[1] - b[1]).map(([, i]) => i + 1);
export const SortBy = (list, f) => list.map((x) => [f(x), x]).sort((a, b) => canonical(a[0], b[0]) || canonical(a[1], b[1])).map((t) => t[1]);
export const MinimalBy = (list, f) => { const v = list.map((x) => f(x)); const m = Math.min(...v); return list.filter((_, i) => v[i] === m); };
export const MaximalBy = (list, f) => { const v = list.map((x) => f(x)); const m = Math.max(...v); return list.filter((_, i) => v[i] === m); };

// ---- folding and sums ----------------------------------------------------------------------------------------------
export const Fold = (f, x, list) => { let y = x; for (const v of list) y = f(y, v); return y; };
export const FoldList = (f, x, list) => { const out = [x]; for (const y of list) out.push(f(out[out.length - 1], y)); return out; };
export const Nest = (f, x, n) => { let y = x; for (let i = 0; i < n; i++) y = f(y); return y; };
export const NestList = (f, x, n) => { const out = [x]; for (let i = 0; i < n; i++) out.push(f(out[i])); return out; };
/** NestWhile[f, x, test] (at most max steps). */
export const NestWhile = (f, x, p, max = 1e6) => { let y = x; for (let i = 0; i < max && p(y); i++) y = f(y); return y; };
/** FixedPoint[f, x] (stops when sameQ, or after max steps). */
export const FixedPoint = (f, x, max = 1e6) => { let y = x; for (let i = 0; i < max; i++) { const z = f(y); if (sameQ(z, y)) return z; y = z; } return y; };
const plus = (a, b) => (isArr(a) ? a.map((x, i) => plus(x, b[i])) : a + b);
/** Total[list] (numbers, or vectors added componentwise). */
export const Total = (list) => (list.length ? list.slice(1).reduce(plus, list[0]) : 0);
export const Mean = (list) => { if (list?.dist) return MeanOf(list); const t = Total(list); return isArr(t) ? t.map((x) => x / list.length) : t / list.length; };
export const Median = (list) => { const s = Sort(list); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
/** Max[a, b, …] or Max[list] (also nested lists, as Mathematica flattens). */
export const Max = (...a) => Math.max(...a.flat(Infinity));
export const Min = (...a) => Math.min(...a.flat(Infinity));
export const Accumulate = (list) => (list.length ? FoldList(plus, list[0], list.slice(1)) : []);
export const Differences = (list) => list.slice(1).map((x, i) => plus(x, neg(list[i])));
const neg = (a) => (isArr(a) ? a.map(neg) : -a);

// ---- mapping -------------------------------------------------------------------------------------------------------
/** MapThread[f, {list1, list2, …}] */
export const MapThread = (f, lists) => lists[0].map((_, i) => f(...lists.map((l) => l[i])));
/** MapIndexed[f, list]: f(x, [i]) with the 1-based position, as Mathematica. */
export const MapIndexed = (f, list) => list.map((x, i) => f(x, [i + 1]));
/** Thread[{a1, a2, …} → {b1, b2, …}] as pairs: Thread([a, b]) → [[a1, b1], [a2, b2], …] */
export const Thread = (lists) => Transpose(lists);
/** Outer[f, list1, list2] */
export const Outer = (f, a, b) => a.map((x) => b.map((y) => f(x, y)));
/** Tuples[list, n] or Tuples[{list1, list2, …}] */
export function Tuples(list, n) {
  const lists = n === undefined ? list : Array.from({ length: n }, () => list);
  return lists.reduce((acc, l) => acc.flatMap((t) => l.map((x) => [...t, x])), [[]]);
}

// ---- vectors and matrices ------------------------------------------------------------------------------------------
/** Dot[a, b]: vector·vector, matrix·vector, vector·matrix, matrix·matrix. */
export function Dot(a, b) {
  const am = isArr(a[0]), bm = isArr(b[0]);
  if (!am && !bm) { if (a.length !== b.length) fail('Dot of vectors of different lengths'); return a.reduce((s, x, i) => s + x * b[i], 0); }
  if (am && !bm) return a.map((row) => Dot(row, b));
  if (!am && bm) return b[0].map((_, j) => a.reduce((s, x, i) => s + x * b[i][j], 0));
  return a.map((row) => b[0].map((_, j) => row.reduce((s, x, i) => s + x * b[i][j], 0)));
}
export const Cross = ([a1, a2, a3], [b1, b2, b3]) => [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1];
/** Norm[v] (Euclidean), Norm[v, p] (p-norm, p = Infinity for the maximum norm). */
export const Norm = (v, p = 2) => (p === Infinity ? Math.max(...v.map(Math.abs)) : p === 2 ? Math.hypot(...v) : v.reduce((s, x) => s + Math.abs(x) ** p, 0) ** (1 / p));
export const Normalize = (v) => { const n = Norm(v); return n === 0 ? v.slice() : v.map((x) => x / n); };
export const EuclideanDistance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
export const IdentityMatrix = (n) => Table((i, j) => (i === j ? 1 : 0), [n], [n]);
/** Det[m] for any square matrix (Gaussian elimination with partial pivoting). */
export function Det(m) {
  // v0.1.26: a 2 × 2 by its expansion a·d − b·c (what the visibility-region snapshots show Mathematica computing; the
  // elimination below can put a point exactly on a line where Mathematica's value does not); larger by elimination
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const a = m.map((r) => r.slice()), n = a.length;
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (a[p][c] === 0) return 0;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; d = -d; }
    d *= a[c][c];
    for (let r = c + 1; r < n; r++) { const f = a[r][c] / a[c][c]; for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]; }
  }
  return d;
}
/** Inverse[m] (Gauss–Jordan); throws for a singular matrix. */
export function Inverse(m) {
  const n = m.length, a = m.map((r, i) => [...r, ...IdentityMatrix(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-300) fail('Inverse of a singular matrix');
    [a[p], a[c]] = [a[c], a[p]];
    const pv = a[c][c];
    a[c] = a[c].map((x) => x / pv);
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c]; a[r] = a[r].map((x, k) => x - f * a[c][k]); }
  }
  return a.map((r) => r.slice(n));
}
/** RotationMatrix[θ] (2D) or RotationMatrix[θ, axis] (3D, right-handed about the axis). */
export function RotationMatrix(t, axis) {
  const c = Math.cos(t), s = Math.sin(t);
  if (axis === undefined) return [[c, -s], [s, c]];
  const [x, y, z] = Normalize(axis), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
/** RotationTransform[θ] / [θ, center] (2D) as a function of a point. */
export const RotationTransform = (t, center = [0, 0]) => (p) => plus(Dot(RotationMatrix(t), plus(p, neg(center))), center);
export const TranslationTransform = (v) => (p) => plus(p, v);
/** AngleVector[θ] = {Cos θ, Sin θ}; AngleVector[{r, θ}]; AngleVector[{x, y}, θ]; AngleVector[{x, y}, {r, θ}]. */
export function AngleVector(a, b) {
  if (b === undefined) return isArr(a) ? [a[0] * Math.cos(a[1]), a[0] * Math.sin(a[1])] : [Math.cos(a), Math.sin(a)];
  const [r, t] = isArr(b) ? b : [1, b];
  return [a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)];
}
/** VectorAngle[u, v] in [0, π]. */
export const VectorAngle = (u, v) => Math.atan2(Norm(Cross3(u, v)), Dot(u, v));
const Cross3 = (u, v) => (u.length === 2 ? [0, 0, u[0] * v[1] - u[1] * v[0]] : Cross(u, v));
/** Nearest[points, x] → the nearest points (all at the minimal distance, in list order); Nearest[points, x, n] → n nearest. */
export function Nearest(points, x, n) {
  const d = points.map((p, i) => [typeof p === 'number' ? Math.abs(p - x) : EuclideanDistance(p, x), i]);
  d.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (n !== undefined) return d.slice(0, n).map(([, i]) => points[i]);
  return d.filter(([v]) => v === d[0][0]).map(([, i]) => points[i]);
}

// ---- random --------------------------------------------------------------------------------------------------------
// The optional last argument is a random source of shared/random.js (createRng({ seed }) or replayRng(...), also
// Manipulate's ctx.rng / the body's opts.rng): draws then come from it (reproducible with ?seed=N); without it,
// Math.random. A count may be n or [n, m] (a matrix of draws).
const isRng = (x) => x && typeof x === 'object' && !isArr(x) && typeof x.randomReal === 'function';
const plain = { randomReal: ([a, b], n) => (n === undefined ? a + (b - a) * Math.random() : fillDims(n, () => a + (b - a) * Math.random())),
  randomInteger: ([a, b], n) => (n === undefined ? a + Math.floor((b - a + 1) * Math.random()) : fillDims(n, () => a + Math.floor((b - a + 1) * Math.random()))) };
const fillDims = (n, f) => { const d = isArr(n) ? n : [n]; const go = (k) => Array.from({ length: d[k] }, () => (k === d.length - 1 ? f() : go(k + 1))); return go(0); };
const args = (n, rng) => (isRng(n) ? [undefined, n] : [n, rng ?? plain]);
/** RandomReal[] , RandomReal[max], RandomReal[{min, max}], RandomReal[{min, max}, n], plus an optional source. */
export function RandomReal(range = [0, 1], n, rng) {
  if (isRng(range)) [range, n, rng] = [[0, 1], undefined, range];
  const [k, r] = args(n, rng);
  return r.randomReal(isArr(range) ? range : [0, range], k);
}
/** RandomInteger[max] (0 … max), RandomInteger[{min, max}], with optional count and source as RandomReal. */
export function RandomInteger(range = [0, 1], n, rng) {
  if (isRng(range)) [range, n, rng] = [[0, 1], undefined, range];
  const [k, r] = args(n, rng);
  return r.randomInteger(isArr(range) ? range : [0, range], k);
}
export function RandomChoice(list, n, rng) {
  const [k, r] = args(n, rng);
  const one = () => list[r.randomInteger([0, list.length - 1])];
  return k === undefined ? one() : Array.from({ length: k }, one);
}
/** RandomSample[list] (a random permutation) or RandomSample[list, n]. */
export function RandomSample(list, n, rng) {
  const [k, r] = args(n, rng);
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = r.randomInteger([0, i]); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k ?? a.length);
}

// ---- caching ---------------------------------------------------------------------------------------------------------
/**
 * cacheLast() → remember(keys, compute): compute() runs only when one of `keys` differs (===) from the previous call;
 * otherwise the previous result is returned — the originals' "…Old" variables (e.g. a collision grid recomputed only
 * when an obstacle or the resolution changed). Pure; the same helper as shared/manipulate.js cacheLast.
 */
export function cacheLast() {
  let keys = null, value;
  return (k, compute) => {
    if (!keys || k.length !== keys.length || k.some((x, i) => x !== keys[i])) { keys = k; value = compute(); }
    return value;
  };
}

// ---- distributions (v0.1.23) ---------------------------------------------------------------------------------------
/** Erf[x] (absolute error below 1e-14: series for |x| < 3, continued fraction beyond). */
export function Erf(x) {
  if (x < 0) return -Erf(-x);
  if (x < 3) {
    let term = x, sum = x;
    for (let n = 1; n < 200 && Math.abs(term) > 1e-17 * Math.abs(sum); n++) { term *= (-x * x) / n; sum += term / (2 * n + 1); }
    return (2 / Math.sqrt(Math.PI)) * sum;
  }
  // erfc by Lentz's continued fraction: erfc x = exp(−x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + …))))
  let f = x, C = x, D = 0;
  for (let n = 1; n < 300; n++) {
    const a = n / 2;
    D = x + a * D; D = 1 / D; C = x + a / C;
    const delta = C * D; f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
/** Binomial[n, k] for integers (a machine number; exact below 2^53). */
export function Binomial(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
/** NormalDistribution[μ, σ], UniformDistribution[{min, max}], TriangularDistribution[{min, max}, c] (c default the middle). */
export const NormalDistribution = (mu = 0, sigma = 1) => Object.freeze({ dist: 'Normal', mu, sigma });
export const UniformDistribution = ([a, b] = [0, 1]) => Object.freeze({ dist: 'Uniform', a, b });
export const TriangularDistribution = ([a, b] = [0, 1], c = (a + b) / 2) => Object.freeze({ dist: 'Triangular', a, b, c });
/** PDF[dist, x] */
export function PDF(d, x) {
  switch (d.dist) {
    case 'Normal': return Math.exp(-(((x - d.mu) / d.sigma) ** 2) / 2) / (d.sigma * Math.sqrt(2 * Math.PI));
    case 'Uniform': return x >= d.a && x <= d.b ? 1 / (d.b - d.a) : 0;
    case 'Triangular': {
      const { a, b, c } = d;
      if (x < a || x > b) return 0;
      return x <= c ? (c === a ? 2 / (b - a) : (2 * (x - a)) / ((b - a) * (c - a))) : (2 * (b - x)) / ((b - a) * (b - c));
    }
    default: return fail(`PDF: unknown distribution ${d.dist}`);
  }
}
/** CDF[dist, x] */
export function CDF(d, x) {
  switch (d.dist) {
    case 'Normal': return (1 + Erf((x - d.mu) / (d.sigma * Math.SQRT2))) / 2;
    case 'Uniform': return x <= d.a ? 0 : x >= d.b ? 1 : (x - d.a) / (d.b - d.a);
    case 'Triangular': {
      const { a, b, c } = d;
      if (x <= a) return 0;
      if (x >= b) return 1;
      return x <= c ? (x - a) ** 2 / ((b - a) * (c - a)) : 1 - (b - x) ** 2 / ((b - a) * (b - c));
    }
    default: return fail(`CDF: unknown distribution ${d.dist}`);
  }
}
/** Mean[dist] (also through Mean), Variance[dist or list], StandardDeviation[dist or list] (lists: the unbiased n − 1 form, as Mathematica) */
const MeanOf = (d) => (d.dist === 'Normal' ? d.mu : d.dist === 'Uniform' ? (d.a + d.b) / 2 : (d.a + d.b + d.c) / 3);
const VarianceOf = (d) => (d.dist === 'Normal' ? d.sigma ** 2 : d.dist === 'Uniform' ? (d.b - d.a) ** 2 / 12
  : (d.a ** 2 + d.b ** 2 + d.c ** 2 - d.a * d.b - d.a * d.c - d.b * d.c) / 18);
/**
 * RandomVariate[dist] or RandomVariate[dist, n], with an optional source as RandomReal (inverse-CDF sampling; the
 * normal by Box–Muller). Mathematica's own random stream cannot be reproduced: draws agree in distribution only.
 */
export function RandomVariate(d, n, rng) {
  const [k, r] = args(n, rng);
  const u = () => r.randomReal([0, 1]);
  const one = () => {
    switch (d.dist) {
      case 'Normal': { let s = u(); while (s === 0) s = u(); return d.mu + d.sigma * Math.sqrt(-2 * Math.log(s)) * Math.cos(2 * Math.PI * u()); }
      case 'Uniform': return d.a + (d.b - d.a) * u();
      case 'Triangular': {
        const { a, b, c } = d, p = u(), F = (c - a) / (b - a);
        return p < F ? a + Math.sqrt(p * (b - a) * (c - a)) : b - Math.sqrt((1 - p) * (b - a) * (b - c));
      }
      default: return fail(`RandomVariate: unknown distribution ${d.dist}`);
    }
  };
  return k === undefined ? one() : Array.from({ length: k }, one);
}
export function Variance(x) {
  if (x?.dist) return VarianceOf(x);
  const m = Mean(x);
  return x.reduce((a, v) => a + (v - m) ** 2, 0) / (x.length - 1);
}
export const StandardDeviation = (x) => Math.sqrt(Variance(x));

// ---- comparisons (v0.1.25) -----------------------------------------------------------------------------------------
// Mathematica's == and != on machine reals ignore the last seven bits (shared/mma.js): 0.1 + 0.2 == 0.3 is True. Use
// these where an original compares computed reals ("has the point arrived", "did anything move"); === is right for
// integers, strings and values copied unchanged.
/** Equal[a, b] (a == b): numbers within Mathematica's tolerance, or lists of the same shape element by element. */
export const Equal = (a, b) => mEqual(a, b);
/** Unequal[a, b] (a != b) = !Equal[a, b]. */
export const Unequal = (a, b) => !mEqual(a, b);
/** Less, Greater, LessEqual, GreaterEqual of numbers with the same tolerance (a < b is False when a == b). */
export const Less = (a, b) => mLess(a, b);
export const Greater = (a, b) => mGreater(a, b);
export const LessEqual = (a, b) => mLessEq(a, b);
export const GreaterEqual = (a, b) => mGreaterEq(a, b);
