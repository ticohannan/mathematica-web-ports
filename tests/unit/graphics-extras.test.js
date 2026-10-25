// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/graphics-extras.test.js — the Graphics options Axes, Frame, Ticks, labels (shared/graphics-extras.js).
import { describe, it, expect } from 'vitest';
import { decorationMargins, plotDecorations } from '../../shared/graphics-extras.js';
import { annotations, annotation, Cases, textOf } from '../../shared/graphics.js';

const R = [[-2, 2], [-1, 1]], V = [[-2.2, 2.2], [-1.2, 1.2]], u = 0.01;
const texts = (g) => Cases(g, 'Text').map((t) => textOf(t.expr));

describe('graphics-extras: plot decorations from Graphics options', () => {
  it('no options, no margins and nothing drawn', () => {
    expect(decorationMargins({ PlotRange: R })).toBe(null);
    expect(plotDecorations({}, { range: R, visible: V, unitsPerPx: u })).toEqual({ below: [], above: [] });
  });
  it('Axes -> True draws both axes with automatic ticks; {True, False} only the x axis; Axes alone needs no margins', () => {
    expect(decorationMargins({ Axes: true })).toBe(null);
    const both = plotDecorations({ Axes: true }, { range: R, visible: V, unitsPerPx: u }).below;
    expect(annotations(both).map((a) => a.id)).toEqual(['axis-x', 'axis-y']);
    // automatic ticks (svg-frame.js automaticTicks: about six major steps): step 0.5, no label at the origin
    expect(texts(annotation(both, 'axis-x').g)).toEqual(['−2.0', '−1.5', '−1.0', '−0.5', '0.5', '1.0', '1.5', '2.0']);
    const xOnly = plotDecorations({ Axes: [true, false] }, { range: R, visible: V, unitsPerPx: u }).below;
    expect(annotations(xOnly).map((a) => a.id)).toEqual(['axis-x']);
  });
  it('Ticks: a step, a list, None; AxesOrigin moves the axes; AxesLabel adds room at the positive ends', () => {
    const g = plotDecorations({ Axes: true, Ticks: [0.5, [-1, 1]], AxesOrigin: [1, 0] }, { range: R, visible: V, unitsPerPx: u }).below;
    expect(texts(annotation(g, 'axis-x').g)).toEqual(['−2.0', '−1.5', '−1.0', '−0.5', '0.0', '0.5', '1.5', '2.0']); // none at the origin x = 1
    expect(texts(annotation(g, 'axis-y').g)).toEqual(['−1', '1']);
    const yAxis = Cases(annotation(g, 'axis-y').g, 'Line')[0];
    expect(yAxis.pts).toEqual([[1, -1], [1, 1]]); // the axis spans `range`
    const none = plotDecorations({ Axes: true, Ticks: 'None' }, { range: R, visible: V, unitsPerPx: u }).below;
    expect(texts(none)).toEqual([]);
    expect(decorationMargins({ Axes: true, AxesLabel: ['x', 'y'] })).toEqual({ left: 0, right: 26, top: 16, bottom: 0 });
    expect(texts(plotDecorations({ Axes: true, Ticks: 'None', AxesLabel: ['x', 'y'] }, { range: R, visible: V, unitsPerPx: u }).below)).toEqual(['x', 'y']);
  });
  it('Frame -> True: frame at the padded range, labels left and bottom, room for them; FrameLabel and PlotLabel', () => {
    expect(decorationMargins({ Frame: true })).toEqual({ left: 34, right: 10, top: 8, bottom: 18 });
    expect(decorationMargins({ Frame: true, FrameLabel: ['t', 'x'], PlotLabel: 'P' })).toEqual({ left: 60, right: 10, top: 34, bottom: 42 });
    const d = plotDecorations({ Frame: true, FrameLabel: ['t', 'x'], PlotLabel: 'P' }, { range: R, visible: V, unitsPerPx: u });
    const frame = annotation(d.below, 'frame');
    expect(Cases(frame.g, 'Line')[0].pts).toEqual([[-2, -1], [2, -1], [2, 1], [-2, 1], [-2, -1]]);
    expect(annotations(d.above).map((a) => a.id)).toEqual(['frame-label-bottom', 'frame-label-left', 'plot-label']);
    expect(Cases(annotation(d.above, 'plot-label').g, 'Text')[0].pos[1]).toBeCloseTo(1.2 - 0.15, 12); // inside the top margin
    expect(Cases(annotation(d.above, 'frame-label-left').g, 'Rotate')[0].angle).toBeCloseTo(Math.PI / 2, 15);
  });
});
