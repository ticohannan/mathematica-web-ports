// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/manipulate-autocreate.test.js — LocatorAutoCreate in shared/manipulate.js (v0.1.41): the pure reading of the
// option (True, All, {min, max}, {All, {min, max}}, {True, {min, max}}). The clicks themselves are browser behaviour:
// tests/e2e/vibrating-string.spec.js (All with {1, 10}) and the Alt-click tests of lowpass-filter-design and
// voronoi-diagrams (True, unchanged since v0.1.33).
import { describe, it, expect } from 'vitest';
import { locatorAutoCreate, All, parseControl, Locator } from '../../shared/manipulate.js';

describe('manipulate: LocatorAutoCreate', () => {
  it('True: Alt/⌘-click adds or deletes, no limits (the v0.1.33 behaviour)', () => {
    expect(locatorAutoCreate(true)).toEqual({ all: false, min: 0, max: Infinity });
    expect(locatorAutoCreate('True')).toEqual({ all: false, min: 0, max: Infinity });
  });
  it('All: a plain click away from the locators adds one, no limits', () => {
    expect(All).toBe('All');
    expect(locatorAutoCreate(All)).toEqual({ all: true, min: 0, max: Infinity });
  });
  it('{All, {min, max}} and {True, {min, max}} limit the number of locators', () => {
    expect(locatorAutoCreate([All, [1, 10]])).toEqual({ all: true, min: 1, max: 10 });
    expect(locatorAutoCreate([true, [2, 5]])).toEqual({ all: false, min: 2, max: 5 });
  });
  it('{min, max} alone is True with limits', () => {
    expect(locatorAutoCreate([3, 7])).toEqual({ all: false, min: 3, max: 7 });
  });
  it('False, None, a missing option or another value: no auto-creation', () => {
    for (const v of [false, undefined, null, 'False', 'None', 3, [All], [false, [1, 2]], [All, [1]]]) expect(locatorAutoCreate(v), String(v)).toBeNull();
  });
  it('the option stays in the locator control\'s opts', () => {
    const c = parseControl([['points', [[0.5, 1]]], [0.001, -2], [0.999, 2], Locator, { LocatorAutoCreate: [All, [1, 10]] }]);
    expect([c.kind, c.multi]).toEqual(['locator', true]);
    expect(locatorAutoCreate(c.opts.LocatorAutoCreate)).toEqual({ all: true, min: 1, max: 10 });
  });
});
