// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/wl.test.js — shared/wl.js. Expected values are Mathematica's documented results, written by hand.
import { describe, it, expect } from 'vitest';
import * as W from '../../shared/wl.js';
import { createRng } from '../../shared/random.js';

const close = (a, b, d = 12) => { if (Array.isArray(b)) { expect(a.length).toBe(b.length); b.forEach((x, i) => close(a[i], x, d)); } else expect(a).toBeCloseTo(b, d); };

describe('shared/wl.js — construction and parts', () => {
  it('Range and Table iterators', () => {
    expect(W.Range(4)).toEqual([1, 2, 3, 4]);
    expect(W.Range(2, 5)).toEqual([2, 3, 4, 5]);
    close(W.Range(0, 1, 0.25), [0, 0.25, 0.5, 0.75, 1]);
    expect(W.Range(0, 1, 0.1)).toHaveLength(11); // no step lost to rounding
    expect(W.Range(5, 1, -2)).toEqual([5, 3, 1]);
    expect(W.Table((i) => i * i, [3])).toEqual([1, 4, 9]);
    expect(W.Table((i, j) => 10 * i + j, [2], [0, 1])).toEqual([[10, 11], [20, 21]]);
    expect(W.Table((x) => x, [['a', 'b']])).toEqual(['a', 'b']);
    expect(W.Subdivide(4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(W.Subdivide(-1, 1, 2)).toEqual([-1, 0, 1]);
    expect(W.Array((i, j) => i + j, [2, 2])).toEqual([[2, 3], [3, 4]]);
    expect(W.ConstantArray(0, [2, 3])).toEqual([[0, 0, 0], [0, 0, 0]]);
    expect(W.Dimensions([[1, 2, 3], [4, 5, 6]])).toEqual([2, 3]);
  });
  it('Part, Take, Drop and friends use 1-based and negative indices', () => {
    const l = [10, 20, 30, 40];
    expect(W.Part(l, 2)).toBe(20);
    expect(W.Part(l, -1)).toBe(40);
    expect(W.Part([[1, 2], [3, 4]], 2, 1)).toBe(3);
    expect(() => W.Part(l, 5)).toThrow(/does not exist/);
    expect(W.Take(l, 2)).toEqual([10, 20]);
    expect(W.Take(l, -2)).toEqual([30, 40]);
    expect(W.Take(l, [2, 3])).toEqual([20, 30]);
    expect(W.Drop(l, 1)).toEqual([20, 30, 40]);
    expect(W.Drop(l, [2, 3])).toEqual([10, 40]);
    expect([W.First(l), W.Last(l), W.Most(l), W.Rest(l)]).toEqual([10, 40, [10, 20, 30], [20, 30, 40]]);
    expect(W.RotateLeft(l)).toEqual([20, 30, 40, 10]);
    expect(W.RotateRight(l, 2)).toEqual([30, 40, 10, 20]);
    expect(W.Partition([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4]]);
    expect(W.Partition([1, 2, 3, 4], 2, 1)).toEqual([[1, 2], [2, 3], [3, 4]]);
    expect(W.Flatten([1, [2, [3]]])).toEqual([1, 2, 3]);
    expect(W.Flatten([1, [2, [3]]], 1)).toEqual([1, 2, [3]]);
    expect(W.Transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
    expect(W.Riffle([1, 2, 3], 0)).toEqual([1, 0, 2, 0, 3]);
    expect(l).toEqual([10, 20, 30, 40]); // nothing mutated
  });
});

describe('shared/wl.js — selecting, sets, folds', () => {
  it('Select, Position (1-based), Count, sets and Tally', () => {
    expect(W.Select([1, -2, 3, -4], (x) => x > 0)).toEqual([1, 3]);
    expect(W.Select([1, 2, 3, 4], (x) => x > 1, 2)).toEqual([2, 3]);
    expect(W.Position([1, 2, 1], 1)).toEqual([[1], [3]]);
    expect(W.Position([[0, 0], [1, 1]], [1, 1])).toEqual([[2]]);
    expect(W.Count([1, 2, 1], 1)).toBe(2);
    expect(W.MemberQ([[1, 2]], [1, 2])).toBe(true);
    expect(W.DeleteDuplicates([3, 1, 3, [1], [1]])).toEqual([3, 1, [1]]);
    expect(W.Union([3, 1], [2, 1])).toEqual([1, 2, 3]);
    expect(W.Intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(W.Complement([1, 2, 3], [2])).toEqual([1, 3]);
    expect(W.Tally(['a', 'b', 'a'])).toEqual([['a', 2], ['b', 1]]);
    expect(W.SortBy([[1, 'b'], [0, 'a'], [1, 'a']], (p) => p[0])).toEqual([[0, 'a'], [1, 'a'], [1, 'b']]); // ties: canonical order
    expect(W.MinimalBy([3, -1, 1], Math.abs)).toEqual([-1, 1]);
    expect(W.Sort([3, 1, 2], (a, b) => a > b)).toEqual([3, 2, 1]);
  });
  it('Fold, Nest, sums', () => {
    expect(W.FoldList((a, b) => a + b, 0, [1, 2, 3])).toEqual([0, 1, 3, 6]);
    expect(W.Fold((a, b) => a * b, 1, [2, 3, 4])).toBe(24);
    expect(W.NestList((x) => 2 * x, 1, 3)).toEqual([1, 2, 4, 8]);
    expect(W.NestWhile((x) => x / 2, 100, (x) => x > 10)).toBe(6.25);
    expect(W.FixedPoint((x) => Math.floor(x / 2), 37)).toBe(0);
    expect(W.Total([1, 2, 3])).toBe(6);
    expect(W.Total([[1, 2], [3, 4]])).toEqual([4, 6]); // vectors add componentwise
    expect(W.Mean([[0, 0], [2, 4]])).toEqual([1, 2]);
    expect(W.Median([3, 1, 4, 2])).toBe(2.5);
    expect(W.Max([1, [5, 2]], 3)).toBe(5);
    expect(W.Accumulate([1, 2, 3])).toEqual([1, 3, 6]);
    expect(W.Differences([1, 4, 9])).toEqual([3, 5]);
    expect(W.MapThread((a, b) => a + b, [[1, 2], [10, 20]])).toEqual([11, 22]);
    expect(W.MapIndexed((x, [i]) => x * i, [5, 5, 5])).toEqual([5, 10, 15]);
    expect(W.Outer((a, b) => a * b, [1, 2], [3, 4])).toEqual([[3, 4], [6, 8]]);
    expect(W.Tuples([0, 1], 2)).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });
});

describe('shared/wl.js — listable arithmetic and caching', () => {
  it('Plus, Subtract, Times, Divide thread over lists and broadcast numbers, as in Mathematica', () => {
    expect(W.Plus([1, 2], [3, 4])).toEqual([4, 6]);
    expect(W.Plus([1, 2], 1, [10, 20])).toEqual([12, 23]);
    expect(W.Subtract([[1, 1], [2, 2]], [1, 0])).toEqual([[0, 0], [2, 2]]); // as Mathematica: threads at the outer level
    expect(W.Times(2, [1, [2, 3]])).toEqual([2, [4, 6]]);
    expect(W.Times([1, 2], [3, 4])).toEqual([3, 8]);
    expect(W.Divide([2, 4], 2)).toEqual([1, 2]);
    expect(W.Minus([1, [-2]])).toEqual([-1, [2]]);
    expect(() => W.Plus([1, 2], [1, 2, 3])).toThrow(/different lengths/);
    // Plus @@ seg / 2 and l {Cos[t], Sin[t]}:
    expect(W.Divide(W.Plus([0, 0], [2, 4]), 2)).toEqual([1, 2]);
  });
  it('cacheLast recomputes only when a key changes', () => {
    const remember = W.cacheLast();
    let n = 0;
    const f = (a, b) => remember([a, b], () => { n++; return a + b; });
    expect([f(1, 2), f(1, 2), f(1, 3), f(1, 3)]).toEqual([3, 3, 4, 4]);
    expect(n).toBe(2);
  });
});

describe('shared/wl.js — vectors, matrices, numbers', () => {
  it('Dot in its four forms, Cross, Norm, Normalize', () => {
    expect(W.Dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(W.Dot([[1, 2], [3, 4]], [1, 1])).toEqual([3, 7]);
    expect(W.Dot([1, 1], [[1, 2], [3, 4]])).toEqual([4, 6]);
    expect(W.Dot([[1, 2], [3, 4]], [[0, 1], [1, 0]])).toEqual([[2, 1], [4, 3]]);
    expect(W.Cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(W.Norm([3, 4])).toBe(5);
    expect(W.Norm([3, -4], Infinity)).toBe(4);
    expect(W.Norm([3, -4], 1)).toBe(7);
    close(W.Normalize([3, 4]), [0.6, 0.8]);
    expect(W.Normalize([0, 0])).toEqual([0, 0]);
    expect(W.EuclideanDistance([0, 0], [3, 4])).toBe(5);
  });
  it('Det, Inverse, RotationMatrix and transforms', () => {
    expect(W.Det([[1, 2], [3, 4]])).toBeCloseTo(-2, 12);
    expect(W.Det([[2, 0, 0], [0, 3, 0], [0, 0, 4]])).toBe(24);
    expect(W.Det([[1, 2], [2, 4]])).toBe(0);
    close(W.Inverse([[1, 2], [3, 4]]).flat(), [-2, 1, 1.5, -0.5]);
    expect(() => W.Inverse([[1, 2], [2, 4]])).toThrow(/singular/);
    close(W.Dot(W.RotationMatrix(Math.PI / 2), [1, 0]), [0, 1]);
    close(W.Dot(W.RotationMatrix(Math.PI / 2, [0, 0, 1]), [1, 0, 0]), [0, 1, 0]);
    close(W.RotationTransform(Math.PI, [1, 1])([2, 1]), [0, 1]);
    expect(W.TranslationTransform([1, 2])([3, 4])).toEqual([4, 6]);
    close(W.AngleVector([1, 1], [2, Math.PI / 2]), [1, 3]);
    close(W.AngleVector([2, Math.PI / 2]), [0, 2]); // AngleVector[{r, θ}]
    close(W.VectorAngle([1, 0], [0, 2]), Math.PI / 2);
    expect(W.Nearest([[0, 0], [1, 0], [-1, 0]], [0.1, 0])).toEqual([[0, 0]]);
    expect(W.Nearest([1, -1, 3], 0)).toEqual([1, -1]); // ties: all, in list order
    expect(W.Nearest([5, 1, 3], 2, 2)).toEqual([1, 3]);
  });
  it('numbers: ArcTan argument order, Mod with the sign of n, Round to even, Clip, Rescale, Chop', () => {
    expect(W.ArcTan(-1, 0)).toBeCloseTo(Math.PI, 15); // ArcTan[x, y]
    expect(W.ArcTan(1)).toBeCloseTo(Math.PI / 4, 15);
    expect(W.Mod(-1, 3)).toBe(2);
    expect(W.Mod(7.5, 2)).toBe(1.5);
    expect(W.Mod(5, 3, 1)).toBe(2); // in [1, 4)
    expect(W.Mod(3, 3, 1)).toBe(3);
    expect([W.Round(2.5), W.Round(3.5), W.Round(-2.5), W.Round(2.4)]).toEqual([2, 4, -2, 2]);
    expect(W.Round(7, 5)).toBe(5);
    expect(W.Clip(3)).toBe(1);
    expect(W.Clip(-3, [-2, 2])).toBe(-2);
    expect(W.Rescale(5, [0, 10])).toBe(0.5);
    expect(W.Rescale(5, [0, 10], [-1, 1])).toBe(0);
    expect(W.Chop([1e-12, 1])).toEqual([0, 1]);
    expect(W.Log(2, 8)).toBeCloseTo(3, 14);
    expect(W.Degree * 180).toBeCloseTo(Math.PI, 15);
  });
  it('random functions use a given source reproducibly and stay in range', () => {
    const a = W.RandomReal([2, 3], 5, createRng({ seed: 7 }));
    const b = W.RandomReal([2, 3], 5, createRng({ seed: 7 }));
    expect(a).toEqual(b);
    expect(a.every((x) => x >= 2 && x < 3)).toBe(true);
    const ints = W.RandomInteger([1, 6], 200, createRng({ seed: 1 }));
    expect(new Set(ints)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(W.RandomInteger(1, [2, 3], createRng({ seed: 2 })).flat().every((x) => x === 0 || x === 1)).toBe(true);
    expect(W.RandomSample([1, 2, 3, 4], createRng({ seed: 3 })).sort()).toEqual([1, 2, 3, 4]);
    expect(['a', 'b']).toContain(W.RandomChoice(['a', 'b'], createRng({ seed: 4 })));
  });
});

describe('wl.js: the example of docs/NEW_APP.md §4', () => {
  it('Table with a [min, max, step] iterator and the mean via Times and Total', () => {
    const { Table, Total, Times, Cos, Sin, Pi } = W;
    const pts = Table((t) => [Cos(t), Sin(t)], [0, 2 * Pi, Pi / 12]);
    const c = Times(1 / pts.length, Total(pts));
    expect(pts.length).toBe(25); // both ends, as Table[…, {t, 0, 2 Pi, Pi/12}]
    expect(c[0]).toBeCloseTo(1 / 25, 12); // the point t = 0 counted twice
    expect(c[1]).toBeCloseTo(0, 12);
  });
});

describe('wl.js: review findings (v0.1.22)', () => {
  it('functions passed in get one argument, as Mathematica pure functions', () => {
    expect(W.Fold(W.Plus, 0, [1, 2, 3])).toBe(6);
    expect(W.Fold(W.Times, 1, [2, 3, 4])).toBe(24);
    expect(W.Fold(W.Min, 10, [5, 7])).toBe(5);
    expect(W.MinimalBy([[0, 0.5], [1, 0]], W.Norm)).toEqual([[0, 0.5]]);
    expect(W.MaximalBy([[0, 0.5], [1, 0]], W.Norm)).toEqual([[1, 0]]);
    expect(W.Count([1, 2, 3], (x, i) => i === undefined && x > 1)).toBe(2);
  });
  it('Riffle with a list as long as the first one also puts its last element at the end', () => {
    expect(W.Riffle(['a', 'b', 'c'], ['x', 'y', 'z'])).toEqual(['a', 'x', 'b', 'y', 'c', 'z']);
    expect(W.Riffle(['a', 'b', 'c'], ['x', 'y'])).toEqual(['a', 'x', 'b', 'y', 'c']);
  });
  it('canonical order: numbers by value, strings a < A < b, lists by length then elements', () => {
    expect(W.Union([[10, 0], [9, 0], [-1, 0], [-2, 0]])).toEqual([[-2, 0], [-1, 0], [9, 0], [10, 0]]);
    expect(W.Sort(['B', 'a', 'b', 'A'])).toEqual(['a', 'A', 'b', 'B']);
    expect(W.Sort([[1, 2, 3], [5], 'x', 2])).toEqual([2, 'x', [5], [1, 2, 3]]);
  });
  it('empty cases and a source as the only argument', () => {
    expect(W.Accumulate([])).toEqual([]);
    expect(W.Plus()).toBe(0);
    expect(W.Times()).toBe(1);
    const v = W.RandomInteger(createRng({ seed: 5 }));
    expect([0, 1]).toContain(v);
  });
});

describe('wl.js: comparisons with Mathematica\'s tolerance (v0.1.25)', () => {
  it('Equal ignores the last bits of machine reals: 0.1 + 0.2 == 0.3; a real difference stays unequal', () => {
    expect(W.Equal(0.1 + 0.2, 0.3)).toBe(true);
    expect(W.Unequal(0.1 + 0.2, 0.3)).toBe(false);
    expect(W.Equal(1, 1 + 1e-10)).toBe(false);
    expect(W.Equal(1, 1 + 2 ** -50)).toBe(true);
  });
  it('lists compare element by element; different shapes are unequal', () => {
    expect(W.Equal([0.1 + 0.2, 1], [0.3, 1])).toBe(true);
    expect(W.Unequal([[1, 2], [3, 4]], [[1, 2], [3, 4 + 1e-9]])).toBe(true);
    expect(W.Equal([1, 2], [1, 2, 3])).toBe(false);
  });
  it('Less and Greater are False for tolerantly equal numbers; LessEqual and GreaterEqual True', () => {
    expect(W.Less(0.3, 0.1 + 0.2)).toBe(false);
    expect(W.Greater(0.1 + 0.2, 0.3)).toBe(false);
    expect(W.LessEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(W.GreaterEqual(0.3, 0.1 + 0.2)).toBe(true);
    expect(W.Less(1, 2)).toBe(true);
  });
});

describe('wl.js: Det of a 2 × 2 by its expansion (v0.1.26)', () => {
  it('Det[{{a, b}, {c, d}}] = a d − b c exactly as written (no elimination rounding)', () => {
    const m = [[0.1, 0.7], [0.3, 2.1]];
    expect(W.Det(m)).toBe(0.1 * 2.1 - 0.7 * 0.3);
    expect(W.Det([[1, 2], [3, 4]])).toBe(-2);
    expect(W.Det([[2, 0, 0], [0, 3, 0], [0, 0, 4]])).toBe(24); // larger matrices by elimination, as before
  });
});

describe('wl v0.1.27: spans, Riffle, EvenQ/OddQ, ArcCos/ArcSin, DeleteCases, ToString, StringForm', () => {
  it('span / Take[list, {m, n, s}]: every s-th element from m to n, negative positions from the end, backwards', () => {
    const c = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(W.span(c, 1, -1, 4)).toEqual([1, 5, 9]); // c[[1;;-1;;4]]
    expect(W.span(c, 4, -1, 4)).toEqual([4, 8]);
    expect(W.Take(c, [2, -1, 3])).toEqual([2, 5, 8]);
    expect(W.span(c, -1, 1, -3)).toEqual([9, 6, 3]); // c[[-1;;1;;-3]]
    expect(W.Take(c, [2, 4])).toEqual([2, 3, 4]); // unchanged
    expect(() => W.span(c, 1, -1, 0)).toThrow(/step/);
  });
  it('Riffle: equal lengths, one fewer, and (as Mathematica) a shorter list used cyclically', () => {
    expect(W.Riffle([1, 5, 9], [4, 8])).toEqual([1, 4, 5, 8, 9]);
    expect(W.Riffle(['a', 'b'], ['x', 'y'])).toEqual(['a', 'x', 'b', 'y']);
    expect(W.Riffle(['a', 'b', 'c', 'd', 'e'], ['x', 'y'])).toEqual(['a', 'x', 'b', 'y', 'c', 'x', 'd', 'y', 'e']);
    expect(W.Riffle(['a', 'b', 'c'], 'x')).toEqual(['a', 'x', 'b', 'x', 'c']);
  });
  it('EvenQ, OddQ only for integers; ArcCos, ArcSin', () => {
    expect([W.EvenQ(0), W.EvenQ(4), W.EvenQ(3), W.EvenQ(2.5), W.OddQ(-3), W.OddQ(2)]).toEqual([true, true, false, false, true, false]);
    expect(W.ArcCos(0)).toBe(Math.PI / 2);
    expect(W.ArcSin(1)).toBe(Math.PI / 2);
    expect(Number.isNaN(W.ArcCos(2))).toBe(true);
  });
  it('DeleteCases: a value, a predicate, Null (null and undefined)', () => {
    expect(W.DeleteCases([1, 2, 3, 2], 2)).toEqual([1, 3]);
    expect(W.DeleteCases([1, null, 2, undefined], null)).toEqual([1, 2]);
    expect(W.DeleteCases([1, 2, 3, 4], (x) => x > 2)).toEqual([1, 2]);
    expect(W.DeleteCases([[1, 2], [3]], [3])).toEqual([[1, 2]]);
  });
  it('ToString: integers as they are, machine reals with six significant digits, "1." for a whole real', () => {
    expect(W.ToString(17)).toBe('17');
    expect(W.ToString(0.2387941683)).toBe('0.238794');
    expect(W.ToString(2.5)).toBe('2.5');
    expect(W.ToString(1, { real: true })).toBe('1.');
    expect(W.ToString(-123456.7)).toBe('-123457.');
    expect(W.ToString(1.5e-7)).toBe('1.5×10^-7');
    expect(W.ToString([1, 0.5])).toBe('{1, 0.5}');
    expect(W.ToString('text')).toBe('text');
  });
  it("StringForm: each `` replaced by the next argument's text", () => {
    expect(W.StringForm('compression ratio = ``\n', 0.17297716833)).toBe('compression ratio = 0.172977\n');
    expect(W.StringForm('move `` of ``', 2, 7)).toBe('move 2 of 7');
  });
});
