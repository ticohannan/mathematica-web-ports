// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-sections/model.js — one evaluation of the Manipulate body of "Method of Sections to Solve a Truss"
// (pure): the member forces from the original's balance equations, and the two pictures — the truss (reaction forces,
// the labelled truss with its cut line, one cut zoomed in, or the solved truss) and, under a zoomed cut, its equations.
// Names follow the original (docs/original-source/truss-method-of-sections.txt): truss, calculatemoment, forcebalance,
// solved, fullstructure, partialstructure, cut1 … cut6, cutsolved, equations.
import {
  Graphics, Annotation, Line, Polygon, Disk, Point, Text, Arrow, Style, Subscript, Row, Grid, Column, Framed, Italic,
  RGBColor, GrayLevel, White, Black, Blue, Red, Magenta, EdgeForm, FaceForm, None, Thick, Thin, Thickness, Dashed,
  PointSize, AbsolutePointSize, Arrowheads, Blend, Mouseover, RotatedText, fitPlotRange,
} from '../../shared/graphics.js';
import { NumberForm } from '../../shared/number-form.js';
import { ToString } from '../../shared/wl.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ steps: 1, opt: 1, cuts: 1, zoom: false, moment: false, w: 8, h: 8 });
export const FD = 10, FF = 15;
const ORANGE = RGBColor(1, 0.4, 0), RED9 = RGBColor(0.9, 0, 0), GREEN7 = RGBColor(0, 0.7, 0);
export const colC = RGBColor(0, 0.6, 0), colT = RGBColor(1, 0, 0.25);


// the initialization: var[v1, v2, col] and the zoomed plot ranges — Interpolation of these points, read only at the
// integer cuts 1 … 6, where an interpolation through the points returns the points themselves
const XMIN = [-2.6, -3, -3.2, -3.8, -3.8, -5.3], XMAX = [14.1, 15.7, 24.4, 32.8, 40.9, 48.8];
const YMIN = [-5.4, -5.65, -6.4, -6, -6, -6.2], YMAX = [9.1, 9.6, 10.3, 15.5, 15.6, 18.5];
export const zoomRange = (cuts) => [[XMIN[cuts - 1], XMAX[cuts - 1]], [YMIN[cuts - 1], YMAX[cuts - 1]]];
const it = (s) => Style(s, Italic);
const th = it('θ'); // \[Theta] in the strings, drawn italic as in the snapshots
export const v = (v1, v2, col) => Style(Subscript(it(v1), v2), col);
const nf = (x) => NumberForm(x, [3, 1]);
const bg = { Background: White };

/**
 * The original's system (Solve of 18 balances for 18 unknowns, numerically: N@{…}) solved in the order of the cuts —
 * each cut adds the unknowns it can solve. Tension > 0 (the solved picture: compression green, tension red).
 */
export function solve(w, h) {
  const Theta = Math.atan(h / w), s = Math.sin(Theta), c = Math.cos(Theta);
  const rg = (3 * w * FD + 5 * w * FF) / (6 * w), ra = FD + FF - rg;
  const f0 = -ra / s, f2 = -f0 * c; // cut 1
  const f7 = ra / s, f3 = (w * ra) / h, f5 = -f3 - f7 * c; // cut 2
  const f12 = -ra / s, f8 = (-2 * w * ra) / h, f4 = -f8 - f12 * c; // cut 3
  const f10 = (ra - FD) / s, f11 = (3 * w * ra) / h, f13 = -f10 * c - f11; // cut 4
  const f16 = -(ra - FD) / s, f15 = (w * FD - 4 * w * ra) / h, f17 = -f15 - f16 * c; // cut 5
  const f19 = (ra - FD - FF) / s, f20 = -f19 * c; // cut 6
  return { Theta, RA: ra, RG: rg, F0: f0, F2: f2, F3: f3, F4: f4, F5: f5, F7: f7, F8: f8, F10: f10, F11: f11, F12: f12, F13: f13, F15: f15, F16: f16, F17: f17, F19: f19, F20: f20 };
}

/** the joints, by the original's letters, and the members by their force numbers (the zero members 1, 6, 9, 14, 18 too) */
export function geometry(w, h) {
  const J = { A: [0, 0], B: [w, h], C: [2 * w, h], D: [3 * w, h], E: [4 * w, h], F: [5 * w, h], G: [6 * w, 0], H: [5 * w, 0], I: [4 * w, 0], J: [3 * w, 0], K: [2 * w, 0], L: [w, 0] };
  const M = { 0: 'AB', 1: 'BL', 2: 'AL', 3: 'LK', 4: 'KJ', 5: 'BC', 6: 'CK', 7: 'BK', 8: 'CD', 9: 'DJ', 10: 'DI', 11: 'JI', 12: 'KD', 13: 'DE', 14: 'EI', 15: 'EF', 16: 'IF', 17: 'IH', 18: 'FH', 19: 'FG', 20: 'HG' };
  return { J, M };
}

// a roller at x (steps 1): the original's disks, trapezoid and outlines (its outlines are Tables with steps 0.01 and
// 0.0001; drawn here with 0.01, the same curve)
function roller(x) {
  const top = [], bot = [];
  for (let i = -65; i <= 65; i++) { const d = i / 100; top.push([x + d, Math.sqrt(Math.max(0, 0.65 ** 2 - d * d))]); }
  for (let i = -80; i <= 80; i++) { const d = i / 100; bot.push([x + d, -Math.sqrt(Math.max(0, 0.8 ** 2 - d * d)) - 0.8]); }
  return [EdgeForm(GrayLevel(0.6)), FaceForm(GrayLevel(0.6)), Disk([x, 0], 0.65), Disk([x, -0.8], 0.8),
    Polygon([[x - 0.65, 0], [x - 0.8, -0.8], [x + 0.8, -0.8], [x + 0.65, 0]]),
    Line([[x - 0.65, 0], [x - 0.8, -0.8]]), Line([[x + 0.65, 0], [x + 0.8, -0.8]]), Line(top), Line(bot),
    PointSize(0.015), Point([x, 0]), PointSize(0.007), White, Point([x, 0])];
}
// the cut line: x = sin(1.5 y)/2 + x0
const wave = (x0, y0, y1, dy) => { const pts = []; for (let k = 0; y0 + k * dy <= y1 + 1e-9; k++) { const y = y0 + k * dy; pts.push([Math.sin(1.5 * y) / 2 + x0, y]); } return Line(pts); };
const sum = '∑ ';
const Fy = it(Subscript('F', 'y')), Fx = it(Subscript('F', 'x'));
const joint = (l, p, moment) => Text(Framed(Style(` ${l} `, 15, GrayLevel(0.4)), { Background: White, RoundingRadius: 15, FrameMargins: 'Tiny', FrameStyle: moment ? Thick : Thin }), p);
const hLabel = (p) => Text(Framed(Style('h', 18, Italic), { Background: White, FrameStyle: None, FrameMargins: 'Tiny' }), p);

export function evaluate(st) {
  const { steps, opt, cuts, zoom, moment, w, h } = st;
  const S = solve(w, h), { Theta, RA, RG } = S;
  const corrected = isCorrected(st);
  const L = (cuts > 5 ? 6 : cuts) - 1;
  const color = (col) => Blend([col, White], moment ? 0.5 : 0);
  const coly = moment ? Magenta : Blue, coly2 = moment ? Red : Blue, colx = moment ? ORANGE : Blue;

  // FULL TRUSS AND ROLLERS
  const truss = [
    [EdgeForm(Thick), FaceForm(None), Polygon([[0, 0], [w, h], [5 * w, h], [6 * w, 0]])],
    Line([[w, h], [2 * w, 0], [3 * w, h], [4 * w, 0], [5 * w, h]]), ...[1, 2, 3, 4, 5].map((k) => Line([[k * w, 0], [k * w, h]])),
    steps === 1 ? [roller(0), roller(6 * w)] : [],
  ];

  // SOLVING REACTION FORCES
  const sumMA = Row([`sum of moments about A: ${sum}`, v('M', 'A', Black), ' = 0 = 3 ', it('w '), v('F', 'D', Magenta), ' + 5 ', it('w '), v('F', 'F', ORANGE), ' - 6 ', it('w '), v('R', 'G', RED9)]);
  const calculatemoment = [
    Magenta, Arrow([[0, -0.25 * h], [3 * w, -0.25 * h]]), Arrow([[3 * w, 1.85 * h], [3 * w, h]]),
    Text(Style(Row([v('F', 'D', Magenta), ' = ', FD, 'kN']), 17, Magenta), [3 * w, 1.85 * h], [0, -1.5]),
    ORANGE, Arrow([[0, -0.4 * h], [5 * w, -0.4 * h]]), Arrow([[5 * w, 2.3 * h], [5 * w, h]]),
    Text(Style(Row([v('F', 'F', ORANGE), ' = ', FF, ' kN']), 17, ORANGE), [5 * w, 2.3 * h], [0, -1.5]),
    RED9, Arrow([[0, -0.55 * h], [6 * w, -0.55 * h]]), Arrow([[6 * w, -1.5 * h], [6 * w, 0]]), Text(Style(v('R', 'G', RED9), 17), [6 * w, -1.5 * h], [0, 1.5]),
    Blue, PointSize(0.015), Point([0, 0]), Text(Style('A', 17, Blue), [0, 0], [0, -1.7]),
    Black, ...[[3, -0.25 * h], [5, -0.4 * h], [6, -0.55 * h]].map(([k, y]) => Text(Style(Row([' ', k, Style(' w ', Italic)]), 17, bg), [(k * w) / 2, y])),
    [Thick, Dashed, Line([[0, 0], [0, -0.5 * h]]), Line([[3 * w, 0], [3 * w, -0.25 * h]]), Line([[5 * w, 0], [5 * w, -0.4 * h]]), Line([[6 * w, 0], [6 * w, -0.55 * h]])],
    Annotation(Mouseover(
      Text(Style(Grid([
        [sumMA],
        [Row(['reaction force G: 6 ', v('R', 'G', RED9), ' = ', 3, v(' F', 'D', Magenta), ' + ', 5, v(' F', 'F', ORANGE)])],
        [Style(Row([v('R', 'G', RED9), ' = ', nf(RG), ' kN']), RED9)],
      ], { Alignment: '=', Spacings: [0, 0] }), 17, Black), [3 * w, -9.5]),
      Text(Style(Column(['the first two terms are positive because they would', 'cause a clockwise rotation and the third term is negative', 'because it would cause a counterclockwise rotation']), 18), [3 * w, -9.5]),
    ), 'moment-balance'),
  ];
  const forcebalance = [Blue,
    Arrow([[3 * w, 1.85 * h], [3 * w, h]]), Arrow([[5 * w, 2.3 * h], [5 * w, h]]),
    ...[['D', FD, [3 * w, 1.85 * h]], ['F', FF, [5 * w, 2.3 * h]]].map(([l, f, p]) => Text(Style(Row([v('F', l, Blue), ' = ', f, ' kN']), 16, Blue), p, [0, -1.5])),
    Arrow([[6 * w, -1.5 * h], [6 * w, 0]]), Text(Style(Row([v('R', 'G', Blue), ' = ', nf(RG), ' kN']), 16, Blue), [6 * w, -1.5 * h], [0, 1.5]),
    Arrow([[0, -0.64 * h], [0, 0]]), Text(Style(v('R', 'A', Blue), 17), [0, -0.64 * h], [-1, 1.5]),
    Annotation(Text(Style(Grid([
      [Row(['sum of the ', it('y'), ` forces: ${sum}`, Fy, ' = 0 = ', v('R', 'A', Blue), ' + ', v('R', 'G', Blue), ' - ', v('F', 'D', Blue), ' - ', v('F', 'F', Blue)])],
      [Row(['reaction force A: ', v('R', 'A', Blue), ' = ', v('F', 'D', Blue), ' + ', v('F', 'F', Blue), ' - ', v('R', 'G', Blue)])],
      [Style(Row([v('R', 'A', Blue), ' = ', nf(RA), ' kN']), Blue)],
    ], { Alignment: '=', Spacings: [0, 0] }), 17, Black), [3 * w, -8]), 'y-balance'),
  ];
  const solved = [Blue, Arrow([[3 * w, 1.85 * h], [3 * w, h]]), Arrow([[5 * w, 2.3 * h], [5 * w, h]]),
    ...[[FD, 'D', [3 * w, 1.85 * h]], [FF, 'F', [5 * w, 2.3 * h]]].map(([f, l, p]) => Text(Style(Row([Subscript(it('F'), l), ' = ', f, ' kN']), 16), p, [0, -1.5])),
    Arrow([[0, -0.64 * h], [0, 0]]), Arrow([[6 * w, -1.5 * h], [6 * w, 0]]),
    ...[[RA, 'A', [0, -0.64 * h]], [RG, 'G', [6 * w, -1.5 * h]]].map(([f, l, p]) => Annotation(Text(Style(Row([Subscript(it('R'), l), ' = ', ToString(f, { real: true }), ' kN']), 16), p, [0, 1.5]), `reaction-${l}`)),
  ];

  // MAKING CUTS
  const loadsAndReactions = (y0) => [Blue, Arrow([[3 * w, 1.85 * h], [3 * w, y0 * h]]), Arrow([[5 * w, 2.3 * h], [5 * w, y0 * h]]),
    ...[[FD, [3 * w, 1.85 * h]], [FF, [5 * w, 2.3 * h]]].map(([f, p]) => Text(Style(Row([f, ' kN']), 16), p, [0, -1.5]))];
  const fullstructure = [
    Annotation([[0, [w / 2, h / 2]], [1, [w, h / 2]], [2, [w / 2, 0]], [3, [1.5 * w, 0]], [4, [2.5 * w, 0]], [5, [1.5 * w, h]], [6, [2 * w, h / 2]], [7, [1.5 * w, h / 2]], [8, [2.5 * w, h]], [9, [3 * w, h / 2]], [10, [3.5 * w, h / 2]], [11, [3.5 * w, 0]], [12, [2.5 * w, h / 2]], [13, [3.5 * w, h]], [14, [4 * w, h / 2]], [15, [4.5 * w, h]], [16, [4.5 * w, h / 2]], [17, [4.5 * w, 0]], [18, [5 * w, h / 2]], [19, [5.5 * w, h / 2]], [20, [5.5 * w, 0]]]
      .map(([k, p]) => Text(Framed(Style(Subscript(it('F'), k), 15), { Background: White, FrameStyle: None, FrameMargins: 'Tiny' }), p)), 'member-labels'),
    Annotation([['A', [0, 0]], ['B', [w, h]], ['C', [2 * w, h]], ['D', [3 * w, h]], ['E', [4 * w, h]], ['F', [5 * w, h]], ['G', [6 * w, 0]], ['H', [5 * w, 0]], ['I', [4 * w, 0]], ['J', [3 * w, 0]], ['K', [2 * w, 0]], ['L', [w, 0]]]
      .map(([l, p]) => Text(Framed(Style(Row([' ', l, ' ']), 15), { RoundingRadius: 15, Background: White }), p)), 'joint-labels'),
    Annotation([Red, Dashed, wave((cuts - 0.25) * w, -0.25 * h, 1.25 * h, 0.05)], 'cut-line'),
    [...loadsAndReactions(1.1),
      Arrow([[0, -0.64 * h], [0, -0.05 * h]]), Arrow([[6 * w, -1.5 * h], [6 * w, -0.05 * h]]),
      ...[[RA, [0, -0.64 * h]], [RG, [6 * w, -1.5 * h]]].map(([f, p]) => Text(Style(Row([ToString(f, { real: true }), ' kN']), 16), p, [0, 1.5]))],
  ];

  const deg = NumberForm((Theta * 180) / Math.PI, [3, 1]);
  const partialstructure = [
    cuts < 4 ? Text(Style(Row([th, ' = ', deg, '°']), 18), [0, 0], [-1.8, -1.5]) : Text(Style(Row([deg, '°']), 18), [0, 0], [-2.5, -1]),
    [1 < cuts && cuts < 6 ? coly : Blue, Arrow([[0, -0.5 * h], [0, 0]]), Text(Style(Row([v('R', 'A', 1 < cuts && cuts < 6 ? coly : Blue), ' = ', nf(RA), ' kN']), 18), [0, -0.5 * h], [0, 1.5])],
    cuts >= 4 ? [Blue, Arrow([[3 * w, 1.75 * h], [3 * w, (cuts === 4 ? 1.1 : 1) * h]]), Text(Style(Row([v('F', 'D', Blue), ' = ', FD, ' kN']), 16), [3 * w, 1.75 * h], [0, -1.5])] : [],
    cuts === 6 ? [Blue, Arrow([[5 * w, 2 * h], [5 * w, h]]), Text(Style(Row([v('F', 'F', Blue), ' = ', FF, ' kN']), 16), [5 * w, 2 * h], [0, -1.5])] : [],
    cuts > 1 ? [Line([[L * w, h], [w, h], [0, 0], [L * w, 0]]), ...Array.from({ length: L }, (_, i) => Line([[(i + 1) * w, 0], [(i + 1) * w, h]])),
      Line([[w, h], [2 * w, 0], [3 * w, h], [4 * w, 0], [5 * w, h]].slice(0, L))] : [],
    [
      [[[0, 0], [w, 0]], [[w, h], [0, 0]]],
      [[[1.9 * w, h], [1.05 * w, h]], [[w, h], [1.9 * w, 0.1 * h]], [[w, 0], [1.9 * w, 0]]],
      [[[2.9 * w, h], [2 * w, h]], [[2 * w, 0], [2.9 * w, 0]], [[2.9 * w, 0.9 * h], [2.05 * w, 0.05 * h]]],
      [[[3.9 * w, h], [3.05 * w, h]], [[3 * w, 0], [3.9 * w, 0]], [[3.9 * w, 0.1 * h], [3.05 * w, 0.95 * h]]],
      [[[4.9 * w, h], [4 * w, h]], [[4 * w, 0], [4.9 * w, 0]], [[4 * w, 0], [4.9 * w, 0.9 * h]]],
      [[[5 * w, 0], [5.9 * w, 0]], [[5.9 * w, 0.1 * h], [5 * w, h]]],
      [],
    ][cuts - 1].map((pts) => Arrow(pts)),
  ];

  // CUTS
  const greenXY = (n, col, list) => list.map(([d, p, o]) => Text(Style(v('F', Row([`${n}, `, Style(d, Italic)]), col), 18, bg), p, o));
  const momentDims = (k, label, labelAt) => [Magenta, Line([[0, -0.1 * h], [k * w, -0.1 * h]]), [Thick, ...[0, k * w].map((x) => Line([[x, -0.15 * h], [x, -0.05 * h]]))]];
  const balance = (rows, p) => Annotation(Text(Style(Grid(rows.map((r) => [r]), { Alignment: '=', Spacings: [0, 0] }), 17), p), 'cut-balance');
  const cut1 = [
    [Dashed, Red, wave(w, -0.1 * h, 1.1 * h, 0.1)],
    [Dashed, GREEN7, Arrow([[w, 0.5 * h], [0.5 * w, 0.5 * h]]), Arrow([[0.5 * w, h], [0.5 * w, 0.5 * h]])],
    Text(Style(Row([v('F', Row(['0, ', it('x')]), GREEN7), ' = ', v('F', 0, Blue), ' cos ', th]), 18, bg), [w, 0.5 * h], [-1, 0]),
    Text(Style(Row([v('F', Row(['0, ', it('y')]), GREEN7), ' = ', v('F', 0, Blue), ' sin ', th]), 18), [0.5 * w, h], [0, -1]),
    ...[[0, [0.75 * w, 0.75 * h]], [2, [0.75 * w, 0]]].map(([n, p]) => Text(Style(v('F', n, Blue), 18, bg), p)),
  ];
  const cut2 = [
    [Dashed, Red, wave(1.9 * w, -0.1 * h, 1.1 * h, 0.1)],
    moment ? [
      [GrayLevel(0.55), Arrow([[1.9 * w, h], [1.05 * w, h]]), Arrow([[w, h], [1.9 * w, 0.1 * h]])],
      [Thickness(0.008), Line([[0, 0], [w, 0]]), ...momentDims(1), ORANGE, Arrow([[w, 0], [1.9 * w, 0]]), Line([[w, 0], [w, h]])],
      Text(Style(' w ', 18, Italic, bg), [0.5 * w, -0.1 * h]), hLabel([w, 0.5 * h]),
    ] : [],
    [Dashed, color(GREEN7), Arrow([[1.25 * w, 0.75 * h], [1.75 * w, 0.75 * h]]), Arrow([[1.25 * w, 0.75 * h], [1.25 * w, 0.25 * h]])],
    ...greenXY(7, color(GREEN7), [['x', [1.75 * w, 0.75 * h], [-1, 0]], ['y', [1.25 * w, 0.25 * h], [0, 1]]]),
    ...[[5, h], [7, 0.4 * h]].map(([n, y]) => Text(Style(v('F', n, color(Blue)), 18, bg), [1.6 * w, y])),
    Text(Style(v('F', 3, colx), 18, bg), [1.6 * w, 0]),
    joint('B', [w, h], moment),
  ];
  const cut3 = [
    [Dashed, Red, wave(2.9 * w, -0.1 * h, 1.1 * h, 0.1)],
    moment ? [
      [GrayLevel(0.55), Arrow([[2 * w, 0], [2.9 * w, 0]]), Arrow([[2.9 * w, 0.9 * h], [2.05 * w, 0.05 * h]])],
      [Thickness(0.008), Line([[0, 0], [2 * w, 0]]), ORANGE, Line([[2 * w, 0], [2 * w, h]]), Arrow([[2.9 * w, h], [2 * w, h]]), Magenta, Line([[0, -0.1 * h], [2 * w, -0.1 * h]]), Thick, ...[0, 2 * w].map((x) => Line([[x, -0.15 * h], [x, -0.05 * h]]))],
      Text(Style(Row([' 2 ', Style('w ', Italic)]), 18, bg), [w, -0.1 * h]), hLabel([2 * w, 0.5 * h]),
    ] : [],
    [Dashed, color(GREEN7), Arrow([[2.75 * w, 0.25 * h], [2.25 * w, 0.25 * h]]), Arrow([[2.25 * w, 0.75 * h], [2.25 * w, 0.25 * h]])],
    ...greenXY(12, color(GREEN7), [['x', [2.75 * w, 0.25 * h], [-1.2, 0]], ['y', [2.25 * w, 0.75 * h], [0, -1.2]]]),
    ...[[4, 0], [12, 0.6 * h]].map(([n, y]) => Text(Style(v('F', n, color(Blue)), 18, bg), [2.6 * w, y])),
    Text(Style(v('F', 8, colx), 18, bg), [2.6 * w, h]),
    joint('K', [2 * w, 0], moment),
    balance([
      Row([sum, Fx, ' = 0 = ', v('F', 4, Blue), ' - ', v('F', 8, Blue), ' - ', v('F', 12, Blue), ' cos ', th]),
      Row([v('F', 4, Blue), ' = ', v('F', 8, Blue), ' + ', v('F', 12, Blue), ' cos ', th]),
      Style(Row([v('F', 4, Blue), ' = ', nf(Math.abs(S.F4)), ' kN']), Blue),
    ], [12, -3.5]),
  ];
  const cut4 = [
    [Dashed, Red, wave(3.9 * w, -0.1 * h, 1.1 * h, 0.1)],
    moment ? [
      [GrayLevel(0.55), Arrow([[3.9 * w, h], [3.05 * w, h]]), Arrow([[3.9 * w, 0.1 * h], [3.05 * w, 0.95 * h]])],
      [Thickness(0.008), Line([[0, 0], [3 * w, 0]]), ORANGE, Line([[3 * w, h], [3 * w, 0]]), Arrow([[3 * w, 0], [3.9 * w, 0]]), Magenta, Line([[0, -0.1 * h], [3 * w, -0.1 * h]]), Thick, ...[0, 3 * w].map((x) => Line([[x, -0.15 * h], [x, -0.05 * h]]))],
      Text(Style(Row([' 3 ', Style('w ', Italic)]), 18, bg), [(3 * w) / 2, -0.1 * h]), hLabel([3 * w, 0.5 * h]),
    ] : [],
    [Dashed, color(GREEN7), Arrow([[3.75 * w, 0.75 * h], [3.25 * w, 0.75 * h]]), Arrow([[3.25 * w, 0.25 * h], [3.25 * w, 0.75 * h]])],
    ...greenXY(10, color(GREEN7), [['x', [3.75 * w, 0.75 * h], [-1.2, 0]], ['y', [3.25 * w, 0.25 * h], [0, 0.5]]]),
    ...[[10, 0.4 * h], [13, h]].map(([n, y]) => Text(Style(v('F', n, color(Blue)), 18, bg), [3.6 * w, y])),
    Text(Style(v('F', 11, colx), 18, bg), [3.6 * w, 0]),
    joint('D', [3 * w, h], moment),
    balance([
      Row([sum, Fx, ' = 0 = -', v('F', 10, Blue), ' cos ', th, ' + ', v('F', 11, Blue), ' - ', v('F', 13, Blue)]),
      Row([v('F', 13, Blue), ' = -', v('F', 10, Blue), ' cos ', th, ' + ', v('F', 11, Blue)]),
      // E-TX-01: the original prints |F12| here (10.6 kN at w = h = 8) under the label F13; corrected: |F13| (20.0 kN)
      Style(Row([v('F', 13, Blue), ' = ', nf(Math.abs(corrected ? S.F13 : S.F12)), ' kN']), Blue),
    ], [8, 11]),
  ];
  const cut5 = [
    [Dashed, Red, wave(4.9 * w, -0.1 * h, 1.1 * h, 0.1)],
    moment ? [
      [GrayLevel(0.55), Arrow([[4 * w, 0], [4.9 * w, 0]]), Arrow([[4 * w, 0], [4.9 * w, 0.9 * h]])],
      [Thickness(0.008), Line([[0, 0], [4 * w, 0]]), ORANGE, Line([[4 * w, h], [4 * w, 0]]), Arrow([[4.9 * w, h], [4 * w, h]]),
        Magenta, Line([[0, -0.1 * h], [4 * w, -0.1 * h]]), [Thick, ...[0, 4 * w].map((x) => Line([[x, -0.15 * h], [x, -0.05 * h]]))],
        Red, Line([[3 * w, -0.25 * h], [4 * w, -0.25 * h]]), Thick, ...[3 * w, 4 * w].map((x) => Line([[x, -0.2 * h], [x, -0.3 * h]]))],
      Text(Style(Row([' 4 ', Style('w', Italic)]), 18, bg), [2 * w, -0.1 * h]),
      Text(Style(Style(' w ', Italic), 18, bg), [3.5 * w, -0.25 * h]), hLabel([4 * w, 0.5 * h]),
    ] : [],
    [Dashed, color(GREEN7), Arrow([[4.25 * w, 0.25 * h], [4.25 * w, 0.75 * h]]), Arrow([[4.25 * w, 0.25 * h], [4.75 * w, 0.25 * h]])],
    ...greenXY(16, color(GREEN7), [['x', [4.75 * w, 0.25 * h], [-1.2, 0]], ['y', [4.25 * w, 0.75 * h], [0, -1.2]]]),
    ...[[16, [4.6 * w, 0.6 * h]], [17, [4.5 * w, 0]]].map(([n, p]) => Text(Style(v('F', n, color(Blue)), 18, bg), p)),
    Text(Style(v('F', 15, colx), 18, bg), [4.5 * w, h]),
    joint('I', [4 * w, 0], moment),
    balance([
      Row([sum, Fx, ' = 0 = -', v('F', 15, Blue), ' + ', v('F', 16, Blue), ' cos ', th, ' + ', v('F', 17, Blue)]),
      Row([v('F', 17, Blue), ' = ', v('F', 15, Blue), ' - ', v('F', 16, Blue), ' cos ', th]),
      Style(Row([v('F', 17, Blue), ' = ', nf(Math.abs(S.F17)), ' kN']), Blue),
    ], [8, 11]),
  ];
  const cut6 = [
    [Dashed, Red, wave(5.9 * w, -0.5 * h, 0.75 * h, 0.1)],
    [Dashed, GREEN7, Arrow([[5.65 * w, 0.85 * h], [5.15 * w, 0.85 * h]]), Arrow([[5.15 * w, 0.35 * h], [5.15 * w, 0.85 * h]])],
    ...greenXY(19, GREEN7, [['x', [5.65 * w, 0.85 * h], [-1.2, 0]], ['y', [5.15 * w, 0.35 * h], [0, 0.8]]]),
    Text(Style(v('F', 19, Blue), 18, bg), [5.6 * w, 0.4 * h]),
    Text(Style(v('F', 20, Blue), 18, bg), [5.5 * w, 0]),
  ];

  const memberArrows = [
    [S.F0, [[0, 0], [w, h]], [w / 2, h / 2], Theta], [S.F2, [[0, 0], [w, 0]], [0.5 * w, 0], 0], [S.F3, [[w, 0], [2 * w, 0]], [1.5 * w, 0], 0],
    [S.F4, [[2 * w, 0], [3 * w, 0]], [2.5 * w, 0], 0], [S.F5, [[w, h], [2 * w, h]], [1.5 * w, h], 0], [S.F7, [[w, h], [2 * w, 0]], [1.5 * w, 0.5 * h], -Theta],
    [S.F8, [[2 * w, h], [3 * w, h]], [2.5 * w, h], 0], [S.F10, [[3 * w, h], [4 * w, 0]], [3.5 * w, 0.5 * h], -Theta], [S.F11, [[3 * w, 0], [4 * w, 0]], [3.5 * w, 0], 0],
    [S.F12, [[2 * w, 0], [3 * w, h]], [2.5 * w, 0.5 * h], Theta], [S.F13, [[3 * w, h], [4 * w, h]], [3.5 * w, h], 0], [S.F15, [[4 * w, h], [5 * w, h]], [4.5 * w, h], 0],
    [S.F16, [[4 * w, 0], [5 * w, h]], [4.5 * w, 0.5 * h], Theta], [S.F17, [[4 * w, 0], [5 * w, 0]], [4.5 * w, 0], 0], [S.F19, [[5 * w, h], [6 * w, 0]], [5.5 * w, 0.5 * h], -Theta],
    [S.F20, [[5 * w, 0], [6 * w, 0]], [5.5 * w, 0], 0],
  ];
  const cutsolved = [Thick,
    ...[1, 2, 3, 4, 5].map((k) => Line([[k * w, 0], [k * w, h]])),
    [...loadsAndReactions(1), Arrow([[0, -0.64 * h], [0, 0]]), Arrow([[6 * w, -1.5 * h], [6 * w, 0]]),
      ...[[RA, [0, -0.64 * h]], [RG, [6 * w, -1.5 * h]]].map(([f, p]) => Text(Style(Row([ToString(f, { real: true }), ' kN']), 16), p, [0, 1.5]))],
    // Flatten@{If[F < 0, {colC, Arrowheads…}, {colT, Arrowheads…}], arrow, text}: the colour and heads apply to the arrow
    Annotation(memberArrows.map(([f, pts, p, a]) => [
      ...(f < 0 ? [colC, Arrowheads([-0.035, 0.035])] : [colT, Arrowheads([[0.035, 0.325], [-0.035, 0.675]])]),
      Arrow(pts), Text(RotatedText(Style(nf(Math.abs(f)), 18, bg), a), p),
    ]), 'member-forces'),
    Text(Style(Row(['all ', Style('compression', colC), ' and ', Style('tension', colT), ' forces are in kN']), 17), [3 * w, -4.5]),
  ];

  const yRow = (n, extra) => Row([sum, Fy, ' = 0 = ', v('R', 'A', Blue), ...extra, ' - ', v('F', n, Blue), ' sin ', th]);
  const eqGrid = (rows, opts = { Alignment: '=', Spacings: [5, 0] }) => Grid(rows, { ...opts, Spacings: [opts.Spacings?.[0] ?? 0.4, 0.1] }); // rows as close as the original's
  const momentRow = (pt, k, extra) => Row([sum, v('M', pt, Black), ` = 0 = ${k}`, Style('w ', Italic), v('R', 'A', coly), ...extra]);
  const equations = [
    null,
    eqGrid([
      [yRow(0, []), Row([sum, Fx, ' = 0 = -', v('F', 0, Blue), ' cos ', th, ' + ', v('F', 2, Blue)])],
      [Row([v('F', 0, Blue), ' = ', v('R', 'A', Blue), '/sin ', th]), Row([v('F', 2, Blue), ' = ', v('F', 0, Blue), ' cos ', th])],
      [Style(Row([v('F', 0, Blue), ' = ', nf(Math.abs(S.F0)), ' kN']), Blue), Style(Row([v('F', 2, Blue), ' = ', nf(Math.abs(S.F2)), ' kN']), Blue)],
    ]),
    eqGrid([
      [yRow(7, []), Row([sum, v('M', 'B', Black), ' = 0 = ', Style('w ', Italic), v('R', 'A', coly), ' - ', Style('h ', Italic), v('F', 3, colx)]),
        Row([sum, Fx, ' = 0 = ', v('F', 3, Blue), ' - ', v('F', 5, Blue), ' + ', v('F', 7, Blue), ' cos ', th])],
      [Row([v('F', 7, Blue), ' = ', v('R', 'A', Blue), '/sin ', th]), Row([v('F', 3, colx), ' = ', Style('w', Italic), '/', Style('h', Italic), v(' R', 'A', coly)]),
        // "\< = \>"var[…] (a missing comma): Times[" = ", F3], which displays as " = F3" — the same text
        Row([v('F', 5, Blue), ' = ', v('F', 3, Blue), ' + ', v('F', 7, Blue), ' cos ', th])],
      [Style(Row([v('F', 7, Blue), ' = ', nf(Math.abs(S.F7)), ' kN']), Blue), Style(Row([v('F', 3, colx), ' = ', nf(Math.abs(S.F3)), ' kN']), colx),
        Style(Row([v('F', 5, Blue), ' = ', nf(Math.abs(S.F5)), ' kN']), Blue)],
    ], { Alignment: '=' }),
    eqGrid([
      [yRow(12, []), momentRow('K', '2 ', [' - ', Style('h ', Italic), v('F', 8, colx)])],
      [Row([v('F', 12, Blue), ' = ', v('R', 'A', Blue), '/sin ', th]), Row([v('F', 8, colx), ' = 2 ', Style('w', Italic), '/', Style('h', Italic), v(' R', 'A', coly)])],
      [Style(Row([v('F', 12, Blue), ' = ', nf(Math.abs(S.F12)), ' kN']), Blue), Style(Row([v('F', 8, colx), ' = ', nf(Math.abs(S.F8)), ' kN']), colx)],
    ]),
    eqGrid([
      [Row([sum, Fy, ' = 0 = ', v('R', 'A', Blue), ' - ', v('F', 'D', Blue), ' + ', v('F', 10, Blue), ' sin ', th]), momentRow('D', '3 ', [' - ', Style('h ', Italic), v('F', 11, colx)])],
      [Row([v('F', 10, Blue), ' = (-', v('R', 'A', Blue), ' + ', v('F', 'D', Blue), ')/sin ', th]), Row([v('F', 11, colx), ' = 3 ', Style('w', Italic), '/', Style('h', Italic), v(' R', 'A', coly)])],
      [Style(Row([v('F', 10, Blue), ' = ', nf(Math.abs(S.F10)), ' kN']), Blue), Style(Row([v('F', 11, colx), ' = ', nf(Math.abs(S.F11)), ' kN']), colx)],
    ]),
    eqGrid([
      // E-TX-02: the original writes + w F_D in the moment about I (its Solve uses − w F_D, and the next line divides 4 R_A − F_D)
      [Row([sum, Fy, ' = 0 = ', v('R', 'A', Blue), ' - ', v('F', 'D', Blue), ' + ', v('F', 16, Blue), ' sin ', th]),
        momentRow('I', '4 ', [corrected ? ' - ' : ' + ', Style('w ', Italic), v('F', 'D', coly2), ' - ', Style('h ', Italic), v('F', 15, colx)])],
      [Row([v('F', 16, Blue), ' = (-', v('R', 'A', Blue), ' + ', v('F', 'D', Blue), ')/sin ', th]),
        Row([v('F', 15, colx), ' = ', Style('w', Italic), '/', Style('h', Italic), ' (4 ', v('R', 'A', coly), ' - ', v('F', 'D', coly2), ')'])],
      [Style(Row([v('F', 16, Blue), ' = ', nf(Math.abs(S.F16)), ' kN']), Blue), Style(Row([v('F', 15, colx), ' = ', nf(Math.abs(S.F15)), ' kN']), colx)],
    ]),
    eqGrid([
      [Row([sum, Fy, ' = 0 = ', v('R', 'A', Blue), ' - ', v('F', 'D', Blue), ' - ', v('F', 'F', Blue), ' + ', v('F', 19, Blue), ' sin ', th]),
        Row([sum, Fx, ' = 0 = -', v('F', 19, Blue), ' cos ', th, ' + ', v('F', 20, Blue)])],
      [Row([v('F', 19, Blue), ' = (-', v('R', 'A', Blue), ' + ', v('F', 'D', Blue), ' + ', v('F', 'F', Blue), ')/sin ', th]), Row([v('F', 20, Blue), ' = ', v('F', 19, Blue), ' cos ', th])],
      [Style(Row([v('F', 19, Blue), ' = ', nf(Math.abs(S.F19)), ' kN']), Blue), Style(Row([v('F', 20, Blue), ' = ', nf(Math.abs(S.F20)), ' kN']), Blue)],
    ]),
  ];

  // PUT IT ALL TOGETHER
  const zoomed = steps === 2 && zoom && cuts < 7;
  const joints = [[0, 0], [w, 0], [w, h], [2 * w, 0], [2 * w, h], [3 * w, 0], [3 * w, h], [4 * w, 0], [4 * w, h], [5 * w, 0], [5 * w, h], [6 * w, 0]];
  const content = [Thick, Arrowheads('Large'),
    steps === 1 || (steps === 2 && !zoom) ? Annotation(truss, 'truss') : [],
    steps === 1
      ? Annotation([calculatemoment, forcebalance, solved][opt - 1], ['calculate-moment', 'force-balance', 'reactions'][opt - 1])
      : zoom ? [cuts < 7 ? Annotation(partialstructure, 'partial-structure') : [], Annotation([cut1, cut2, cut3, cut4, cut5, cut6, cutsolved][cuts - 1], cuts === 7 ? 'cut-solved' : `cut-${cuts}`)]
        : cuts === 7 ? Annotation(cutsolved, 'cut-solved') : Annotation(fullstructure, 'full-structure'),
    steps === 1 || (steps === 2 && cuts === 7) ? joints.map((p) => [AbsolutePointSize(9), Point(p), White, AbsolutePointSize(6), Point(p)]) : [],
  ];
  const range = zoomed ? zoomRange(cuts) : steps === 2 && zoom ? [[-0.1, 6 * w], [-14.4, 20.7]] : [[-0.85, 6 * w], [-14.4, 20.7]];
  // PlotRangePadding: {{Scaled[0.05], Scaled[0.09]}, None} for the whole truss, None for a zoomed cut
  const pr = zoomed ? range : [[range[0][0] - 0.05 * (range[0][1] - range[0][0]), range[0][1] + 0.09 * (range[0][1] - range[0][0])], range[1]];
  const size = [605, zoomed ? 300 : 375];
  const picture = Graphics(content, { ImageSize: size[0], PlotRange: fitPlotRange(pr, size), PlotRangePadding: [0, 0], UpdateFrame: true });
  const eqPicture = Graphics(zoomed ? [Annotation(Text(Style(equations[cuts], 17), [0, 0]), 'equations')] : [], { ImageSize: 605, PlotRange: [[-302.5, 302.5], [-40, 40]], PlotRangePadding: [0, 0] }); // ImageSize -> {605, 70}: 80 px here, room for the three rows in the browser's fonts
  const view = {
    ...S, ThetaDeg: (Theta * 180) / Math.PI, steps, opt, cuts, zoom, moment, showEquations: zoomed,
    shown: steps === 1 ? ['calculate moment', 'force balance', 'reactions'][opt - 1] : zoom ? (cuts === 7 ? 'solved' : `cut ${cuts}`) : cuts === 7 ? 'solved' : 'full structure',
    printedF13: Math.abs(corrected ? S.F13 : S.F12), momentAboutI: corrected ? '4 w RA − w FD − h F15' : '4 w RA + w FD − h F15', // E-TX-01, E-TX-02
    compression: memberArrows.filter(([f]) => f < 0).length, tension: memberArrows.filter(([f]) => f >= 0).length,
  };
  return { view, graphics: [picture, eqPicture] };
}

