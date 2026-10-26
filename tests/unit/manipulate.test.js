// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/manipulate.test.js — the pure parts of shared/manipulate.js: Manipulate control specs, the test-hook copy,
// cacheLast. The browser behaviour is covered by the e2e tests of the apps built on it.
import { describe, it, expect } from 'vitest';
import {
  parseControl, Locator, Delimiter, None, Rule, hookCopy, hookRead, cacheLast, Control, Button, Row, PopupMenu, VerticalSlider,
  IntervalSlider, Slider, SetterBar, absoluteTime, exactLabel, numbersOf,
} from '../../shared/manipulate.js';
import { Style, Italic } from '../../shared/graphics.js';

describe('manipulate: Manipulate control specs', () => {
  it('{{x, x0, label}, min, max, step, opts} is a slider', () => {
    expect(parseControl([['Quality', 2, 'Q'], 1, 10, 1, { Appearance: 'Labeled' }])).toEqual({
      kind: 'slider', name: 'Quality', init: 2, label: 'Q', min: 1, max: 10, step: 1, plain: false, opts: { Appearance: 'Labeled' },
    });
  });
  it('a slider without a step is continuous; the label defaults to the name', () => {
    const c = parseControl([['progress', 0.25], 0, 1]);
    expect([c.kind, c.step, c.label, c.opts]).toEqual(['slider', 0, 'progress', {}]);
  });
  it('{{x, x0, label}, {v1, v2, …}} is a setter bar; Rule gives a value its own label', () => {
    expect(parseControl([['s', 1, 'number of guards'], [1, 2, 3]]).values).toEqual([{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]);
    expect(parseControl([['m', 'a'], [Rule('a', 'first'), 'b']]).values).toEqual([{ value: 'a', label: 'first' }, { value: 'b', label: 'b' }]);
  });
  it('{{p, p0}, min, max, Locator, opts} is a locator; a list of points gives several', () => {
    const c = parseControl([['p', [1, 2]], [-2, -2], [2, 2], Locator, { Appearance: None }]);
    expect([c.kind, c.min, c.max, c.multi, c.opts.Appearance]).toEqual(['locator', [-2, -2], [2, 2], false, None]);
    expect(parseControl([['pts', [[0, 0], [1, 1]]], [-4, -4], [4, 4], Locator]).multi).toBe(true);
  });
  it('{{p, p0, label}, {xmin, ymin}, {xmax, ymax}} is a 2D slider', () => {
    expect(parseControl([['v', [0, 0], 'v'], [-1, -1], [1, 1]]).kind).toBe('slider2D');
  });
  it('hidden variables, delimiters and headings', () => {
    expect(parseControl(['freeConfigSpace', 0, None])).toEqual({ kind: 'hidden', name: 'freeConfigSpace', init: 0 });
    expect(parseControl([['highRes', false], None]).kind).toBe('hidden');
    expect(parseControl(Delimiter).kind).toBe('delimiter');
    expect(parseControl('plot parameters')).toEqual({ kind: 'heading', label: 'plot parameters' });
  });
  it('a label may be a Style expression', () => {
    expect(parseControl([['Q', 2, Style('Q', Italic)], 1, 10, 1]).label).toEqual(Style('Q', Italic));
  });
  it('the short forms {x, xmin, xmax(, step)} and {x, {v1, …}} start at xmin and v1', () => {
    expect(parseControl(['x', 0, 1])).toMatchObject({ kind: 'slider', name: 'x', init: 0, min: 0, max: 1, step: 0 });
    expect(parseControl(['n', 1, 10, 1])).toMatchObject({ kind: 'slider', init: 1, step: 1 });
    expect(parseControl(['mode', ['a', 'b']])).toMatchObject({ kind: 'setter', init: 'a' });
    expect(parseControl(['mode', [Rule('a', 'first'), 'b']])).toMatchObject({ kind: 'setter', init: 'a' });
  });
  it('None anywhere after the variable, or ControlType -> None, hides it ({{goalTheta, 0}, -π, π, None})', () => {
    expect(parseControl([['goalTheta', 0], -Math.PI, Math.PI, None]).kind).toBe('hidden');
    expect(parseControl([['t', 0], 0, 1, { ControlType: None }]).kind).toBe('hidden');
  });
  it('{{p, p0}, Locator} is a locator with no range', () => {
    expect(parseControl([['p', [0, 0]], Locator])).toMatchObject({ kind: 'locator', min: null, max: null });
  });
  it('{False, True} is a checkbox, as in Mathematica, unless ControlType -> SetterBar', () => {
    expect(parseControl([['show', false, 'show'], [false, true]]).kind).toBe('checkbox');
    expect(parseControl([['show', false], [false, true], { ControlType: SetterBar }]).kind).toBe('setter');
  });
  it('ControlType gives popups, vertical, interval and plain sliders', () => {
    expect(parseControl([['m', 'a'], ['a', 'b'], { ControlType: PopupMenu }]).kind).toBe('popup');
    expect(parseControl([['h', 0], 0, 2, { ControlType: VerticalSlider }]).kind).toBe('vslider');
    expect(parseControl([['w', [0, 1]], 0, 2, 0.1, { ControlType: IntervalSlider }])).toMatchObject({ kind: 'interval', min: 0, max: 2, step: 0.1 });
    expect(parseControl([['k', 1], 0, 2, { ControlType: Slider }])).toMatchObject({ kind: 'slider', plain: true });
  });
  it('a range may depend on the state (functions), Control(factory) and Button and Row parse', () => {
    const f = (s) => s.n;
    expect(parseControl([['s', 1], 1, f, 1])).toMatchObject({ kind: 'slider', min: 1, max: f });
    const factory = () => ({});
    expect(parseControl([['d', [1, 0], 'θ'], Control(factory, { size: 3 })])).toMatchObject({ kind: 'custom', factory, options: { size: 3 } });
    expect(parseControl(Button('restart', () => {}))).toMatchObject({ kind: 'button', buttonName: 'restart' });
    const r = parseControl(Row([Button('1', () => {}, { name: 'add-1' }), [['x', 0], 0, 1]], { name: 'add' }));
    expect([r.kind, r.items.map((i) => i.kind), r.opts.name]).toEqual(['row', ['button', 'slider'], 'add']);
  });
  it('a malformed spec is reported with the variable name', () => {
    expect(() => parseControl([['x', 1], 'nonsense'])).toThrow(/unrecognised control spec for x/);
    expect(() => parseControl([1, 2, 3])).toThrow(/starts with \[name, init, label\]/);
  });
});

describe('manipulate: test hook copies and cacheLast', () => {
  it('hookCopy writes ±Infinity as "Infinity"/"-Infinity" and hookRead reads them back', () => {
    const x = { a: [1, Infinity], b: { c: -Infinity } };
    expect(hookCopy(x)).toEqual({ a: [1, 'Infinity'], b: { c: '-Infinity' } });
    expect(hookRead(hookCopy(x))).toEqual(x);
  });
  it('cacheLast recomputes only when a key changes (===)', () => {
    let n = 0;
    const c = cacheLast();
    const grid = [[0]];
    expect(c([grid], () => ++n)).toBe(1);
    expect(c([grid], () => ++n)).toBe(1);
    expect(c([[[0]]], () => ++n)).toBe(2);
    expect(c([grid, 1], () => ++n)).toBe(3);
  });
});

describe('manipulate: the clock (v0.1.24)', () => {
  it('absoluteTime() is AbsoluteTime[]: seconds since 1900-01-01 (2208988800 s before the Unix epoch)', () => {
    const t = absoluteTime(), unix = Date.now() / 1000;
    expect(Math.abs(t - (unix + 2208988800))).toBeLessThan(5);
    expect(absoluteTime()).toBeGreaterThanOrEqual(t);
  });
});

describe('manipulate: exact values from saved states (v0.1.25)', () => {
  it('exactLabel: rationals and multiples of π as Mathematica\'s slider field shows them; other forms null', () => {
    expect(exactLabel('1/7')).toBe('1/7');
    expect(exactLabel('-1/2')).toBe('-1/2');
    expect(exactLabel('3')).toBe('3');
    expect(exactLabel('5*Pi/32')).toBe('5π/32');
    expect(exactLabel('-13*Pi/16')).toBe('-13π/16');
    expect(exactLabel('Pi/4')).toBe('π/4');
    expect(exactLabel('-Pi')).toBe('-π');
    expect(exactLabel('(3*Pi)/4')).toBe('3π/4');
    expect(exactLabel('Infinity')).toBe('∞');
    expect(exactLabel('(-5*Pi)/32')).toBe('-5π/32');
    expect(exactLabel('-1/2*Pi')).toBe('-π/2');
    expect(exactLabel('3/2*Pi')).toBe('3π/2');
    expect(exactLabel('-(Pi/2)')).toBe('-π/2');
    expect(exactLabel('Pi')).toBe('π');
    expect(exactLabel('(2)^(-1/2)')).toBe('1/√2');
    expect(exactLabel('1/Sqrt[2]')).toBe('1/√2');
    expect(exactLabel('Sqrt[3]')).toBe('√3');
    expect(exactLabel('x/2')).toBeNull();
    expect(exactLabel('3.728068747094218`16.324058901481486*^9')).toBeNull();
  });
  it('numbersOf: {wl, n} become their doubles, also inside lists; other values unchanged', () => {
    expect(numbersOf({ wl: '1/7', n: 1 / 7 })).toBe(1 / 7);
    expect(numbersOf([{ wl: '1/2', n: 0.5 }, 2, [{ wl: 'Pi', n: Math.PI }]])).toEqual([0.5, 2, [Math.PI]]);
    expect(numbersOf({ wl: 'Infinity' })).toBe(Infinity);
    expect(numbersOf({ wl: '-Infinity' })).toBe(-Infinity);
    expect(numbersOf({ a: 1 })).toEqual({ a: 1 });
    expect(numbersOf({ exact: { d1: { wl: '1/2', n: 0.5 } } })).toEqual({ exact: { d1: 0.5 } });
    const big = [[1, 2], [3, 4]], obj = { a: [1] };
    expect(numbersOf(big)).toBe(big); // nothing exact: the same array (identity-keyed caches keep working)
    expect(numbersOf(obj)).toBe(obj);
    expect(numbersOf('setup')).toBe('setup');
  });
});
