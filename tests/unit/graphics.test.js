// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics.test.js — the pure parts of shared/graphics.js: directive scoping (walk), colours, text helpers.
import { describe, it, expect } from 'vitest';
import {
  walk, DEFAULT_STYLE, Line, Disk, Polygon, Text, Rotate, Annotation, Style, Subscript, Italic, Bold, FontSize,
  Red, Blue, Black, Gray, Darker, Lighter, RGBColor, GrayLevel, EdgeForm, FaceForm, Directive, Opacity, Thin, Thick,
  AbsoluteThickness, Transparent, None, textOf, htmlOf, bounds, Rectangle, Point, Superscript, Row, Tooltip, cachedGraphics,
} from '../../shared/graphics.js';

const styles = (list) => { const out = []; walk(list, (p, st) => out.push([p.head, st])); return out; };

describe('graphics: directives apply to later primitives in the same list and in nested lists only', () => {
  it('a colour set in a nested list does not leak out', () => {
    const s = styles([Line([[0, 0], [1, 1]]), [Red, Disk([0, 0], 1)], Polygon([[0, 0], [1, 0], [0, 1]])]);
    expect(s.map(([h, st]) => [h, st.color])).toEqual([['Line', [0, 0, 0]], ['Disk', [1, 0, 0]], ['Polygon', [0, 0, 0]]]);
  });
  it('a directive affects the primitives after it, not before', () => {
    const s = styles([Disk([0, 0], 1), Blue, Disk([1, 0], 1)]);
    expect(s.map(([, st]) => st.color)).toEqual([[0, 0, 0], [0, 0, 1]]);
  });
  it('EdgeForm: default black 1 px, a colour, a Directive, or none', () => {
    const [[, a], [, b], [, c], [, d]] = styles([
      [EdgeForm(Red), Disk([0, 0], 1)], [EdgeForm(Directive(Opacity(0.7), Gray, Thick)), Disk([0, 0], 1)], [Disk([0, 0], 1)],
      [EdgeForm(Red), EdgeForm(), Disk([0, 0], 1)],
    ]);
    expect(a.edge).toEqual({ color: [1, 0, 0], thickness: { abs: 1 }, opacity: undefined, dash: undefined });
    expect(b.edge).toEqual({ color: [0.5, 0.5, 0.5], thickness: { abs: 2 }, opacity: 0.7, dash: undefined });
    expect(c.edge).toBe(null);
    expect(d.edge).toBe(null);
  });
  it('Transparent and FaceForm[None] remove the fill; FaceForm[c] sets it', () => {
    const [[, a], [, b], [, c]] = styles([[Transparent, Disk([0, 0], 1)], [FaceForm(None), Disk([0, 0], 1)], [FaceForm(Red), Blue, Disk([0, 0], 1)]]);
    expect(a.face).toBe(null);
    expect(b.face).toBe(null);
    expect([c.face, c.color]).toEqual([[1, 0, 0], [0, 0, 1]]);
  });
  it('Thin and Thick are AbsoluteThickness[0.25] and [2], as documented', () => {
    expect(Thin).toEqual(AbsoluteThickness(0.25));
    expect(Thick).toEqual(AbsoluteThickness(2));
  });
  it('primitives inside Rotate and Annotation are reached; false and null entries are skipped', () => {
    const s = styles([false, null, Rotate([Line([[0, 0], [1, 0]])], 1), Annotation(Disk([0, 0], 1), 'x')]);
    expect(s.map(([h]) => h)).toEqual(['Rotate', 'Annotation']);
  });
  it('a bare array is a list of primitives, never a colour (colours are RGBColor objects)', () => {
    expect(() => walk([[0.5, 0.2, 0.1]], () => {})).toThrow(/not a primitive or directive/);
  });
  it('what a failed `cond && x` leaves (false, 0, \'\', null) is skipped', () => {
    expect(styles([false, 0, '', null, undefined, Disk([0, 0], 1)]).map(([h]) => h)).toEqual(['Disk']);
  });
  it('the default style is black, no edge', () => {
    expect([DEFAULT_STYLE.color, DEFAULT_STYLE.edge]).toEqual([[0, 0, 0], null]);
  });
});

describe('graphics: text and other primitives', () => {
  it('Superscript and Row give plain text and HTML', () => {
    expect(textOf(Row(['r (', Subscript('L', 1), ')']))).toBe('r (L1)');
    expect(htmlOf(Row([Superscript('RRT', '*'), ' tree']))).toBe('RRT<sup>*</sup> tree');
  });
  it('Text offsets map to anchors and baselines; Tooltip, ellipse and cached parts are primitives', () => {
    expect(Text('a', [0, 0], [-1, 1])).toMatchObject({ anchor: 'start', baseline: 'text-before-edge' });
    expect(Text('a', [0, 0], [1, 0])).toMatchObject({ anchor: 'end', baseline: null });
    expect(styles([Tooltip(Disk([0, 0], [2, 1]), 'tip'), cachedGraphics()([1], () => [])]).map(([h]) => h)).toEqual(['Tooltip', 'Cached']);
  });
});

describe('graphics: Rotate and bounds', () => {
  it('Rotate without a point turns about the centre of the bounding box, as in Mathematica', () => {
    expect(Rotate(Rectangle([0, 0], [2, 1]), 1).about).toEqual([1, 0.5]);
    expect(Rotate([Line([[0, 0], [4, 0]]), Disk([0, 2], 1)], 1).about).toEqual([1.5, 1.5]); // box x −1…4, y 0…3
    expect(Rotate(Disk([0, 0], 1), 1, [5, 5]).about).toEqual([5, 5]);
  });
  it('bounds covers several lines, points and annotated primitives; other heads need an explicit centre', () => {
    expect(bounds([Line([[[0, 0], [1, 1]], [[3, -1], [2, 2]]]), Annotation(Point([[-1, 0], [0, 5]]), 'p')])).toEqual([[-1, -1], [3, 5]]);
    expect(() => Rotate(Text('a', [0, 0]), 1)).toThrow(/give Rotate a centre point for Text/);
  });
});

describe('graphics: colours', () => {
  it('Darker and Lighter blend with black and white by 1/3 by default', () => {
    expect(Darker(Gray).rgb).toEqual([0.5 + (0 - 0.5) / 3, 0.5 + (0 - 0.5) / 3, 0.5 + (0 - 0.5) / 3]); // Blend[{Gray, Black}, 1/3]
    expect(Lighter(Gray, 0.92).rgb[0]).toBeCloseTo(0.5 + 0.5 * 0.92, 15);
  });
  it('RGBColor and GrayLevel', () => {
    expect(RGBColor(1, 0.5, 0).rgb).toEqual([1, 0.5, 0]);
    expect(GrayLevel(0.25).rgb).toEqual([0.25, 0.25, 0.25]);
    expect(Black.rgb).toEqual([0, 0, 0]);
  });
});

describe('graphics: text expressions', () => {
  it('textOf gives plain text, with an optional separator before a subscript', () => {
    expect(textOf(Subscript('θ', 1))).toBe('θ1');
    expect(textOf(Subscript(Style('r', Italic), 'min'), { sep: ' ' })).toBe('r min');
    expect(textOf(42)).toBe('42');
  });
  it('htmlOf typesets italic, bold, subscripts and escapes HTML', () => {
    expect(htmlOf(Style('Q', Italic))).toBe('<i>Q</i>');
    expect(htmlOf(Subscript(Style('r', Italic), 'min'))).toBe('<i>r</i><sub>min</sub>');
    expect(htmlOf(Style('a<b', Bold))).toBe('<b>a&lt;b</b>');
  });
  it('Style accepts directives and an options object', () => {
    expect(Style('x', { FontSize: 14 }).ds).toEqual([FontSize(14)]);
    expect(Style('x', 14, Bold).ds).toEqual([FontSize(14), Bold]); // Style[expr, 14]
    expect(Text('x', [0, 0]).anchor).toBe('middle');
  });
});
