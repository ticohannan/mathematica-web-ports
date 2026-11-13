// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/truss-method-of-joints/model.js — one evaluation of the Manipulate body of "Method of Joints to Solve a Truss
// Problem" (pure): the member forces from the original's joint balances, and the two pictures — the truss (its supports
// and reactions, a reaction-force step, the labelled truss, one joint in focus, or the solved truss) and, under a joint
// in focus, its balances. Names follow the original (docs/original-source/truss-method-of-joints.txt).
import {
  Graphics, Annotation, Line, Polygon, Disk, Circle, Point, Text, Arrow, Style, Subscript, Row, Grid, Column, Framed, Italic,
  RGBColor, GrayLevel, White, Black, Blue, Red, Magenta, EdgeForm, FaceForm, None, Thick, Thin, Thickness, Dashed,
  PointSize, Arrowheads, Mouseover, RotatedText, fitPlotRange, CapForm, Cases, textOf,
} from '../../shared/graphics.js';
import { NumberForm } from '../../shared/number-form.js';
import { isCorrected } from '../../shared/errata.js';

export const initialState = () => ({ steps: 1, opt: 0, joints: 1, focus: false });
export const w = 1, Theta = Math.PI / 3, h = (w / 2) * Math.tan(Theta), δ = 0.25 * h, FC = 1;
export const colC = RGBColor(0, 0.6, 0), colT = RGBColor(1, 0, 0.25), colA = RGBColor(0.55, 0, 1);
const ORANGE = RGBColor(1, 0.4, 0);
const it = (s) => Style(s, Italic);
const th = it('θ'); // \[Theta] in the strings, drawn italic as in the snapshots
export const v = (c1, c2, col) => Style(Subscript(it(c1), c2), col);
const nf = (x, spec) => NumberForm(x, spec);
const FCtext = String(FC); // NumberForm[FC, {2, 2}] of the exact integer 1 shows "1" (the snapshots)
const sum = '∑ ';
const Fy = it(Subscript('F', 'y')), Fx = it(Subscript('F', 'x'));
const bg = { Background: White };
const RAxy = (d) => v('R', Row(['A, ', it(d)]), Blue);

/** the original's Solve (numerically, N@{…}): the reactions, then the joints A, B, C, D in turn; tension > 0 */
export function solve() {
  const s = Math.sin(Theta), c = Math.cos(Theta);
  const re = (w * FC) / (2 * w), ra = FC - re;
  const f1 = -ra / s, f2 = -f1 * c; // A
  const f3 = -f1, f4 = f1 * c - f3 * c; // B
  const f5 = (FC - f3 * s) / s, f6 = f2 + f3 * c - f5 * c; // C
  const f7 = -f5; // D
  return { RA: ra, RE: re, F1: f1, F2: f2, F3: f3, F4: f4, F5: f5, F6: f6, F7: f7 };
}

/**
 * PlotRange -> All: the box of everything drawn — the points of lines, arrows, polygons and points, disks and circles
 * (arcs sampled), and the texts with their extent: Mathematica's picture of a joint in focus keeps every label whole
 * (snapshot 5: the label F_AB above the end of the member is inside the picture). A text's box is estimated from its
 * font size and length (0.55 em per character, 1.5 em high: framed labels) at the scale of the picture, found by iterating.
 */
export function rangeAll(content, [W, H]) {
  const xs = [], ys = [], texts = [];
  const add = ([x, y]) => { xs.push(x); ys.push(y); };
  for (const q of Cases(content, () => true)) {
    if (['Line', 'Arrow', 'Polygon', 'Point'].includes(q.head)) (Array.isArray(q.pts[0]) ? q.pts : [q.pts]).forEach(add);
    else if (q.head === 'Text') { add(q.pos); texts.push(q); }
    else if (q.head === 'Disk' || q.head === 'Circle') {
      const r = Array.isArray(q.r) ? q.r : [q.r, q.r], [a0, a1] = q.angles ?? [0, 2 * Math.PI];
      for (let k = 0; k <= 64; k++) { const a = a0 + ((a1 - a0) * k) / 64; add([q.c[0] + r[0] * Math.cos(a), q.c[1] + r[1] * Math.sin(a)]); }
    }
  }
  const box0 = [[Math.min(...xs), Math.max(...xs)], [Math.min(...ys), Math.max(...ys)]];
  const sizeOf = (e) => { let fs = 12; for (let x = e; x && typeof x === 'object'; x = x.expr) if (x.head === 'Style') { const d = x.ds.find((y) => y.dir === 'fontSize'); if (d) fs = d.value; } return fs; };
  let box = box0;
  for (let iter = 0; iter < 4; iter++) {
    const k = Math.min(W / (box[0][1] - box[0][0]), H / (box[1][1] - box[1][0])); // px per unit
    const b = box0.map((r) => [...r]);
    for (const q of texts) {
      const fs = sizeOf(q.expr), tw = (0.55 * fs * textOf(q.expr).length) / k, thh = (1.5 * fs) / k;
      const x0 = q.anchor === 'start' ? q.pos[0] : q.anchor === 'end' ? q.pos[0] - tw : q.pos[0] - tw / 2;
      const y0 = q.baseline === 'text-before-edge' ? q.pos[1] - thh : q.baseline === 'text-after-edge' ? q.pos[1] : q.pos[1] - thh / 2;
      b[0][0] = Math.min(b[0][0], x0); b[0][1] = Math.max(b[0][1], x0 + tw); b[1][0] = Math.min(b[1][0], y0); b[1][1] = Math.max(b[1][1], y0 + thh);
    }
    box = b;
  }
  return box;
}

const jointLabel = (l, p) => Text(Framed(Style(` ${l} `, 15, GrayLevel(0.4)), { Background: White, RoundingRadius: 15 }), p);

export function evaluate(st) {
  const { steps, opt, joints, focus } = st;
  const S = solve(), { RA, RE, F1, F2, F3, F4, F5, F6, F7 } = S;
  const corrected = isCorrected(st);
  const thetaDeg = (Theta * 180) / Math.PI; // N@Theta*180/π: 60. (a machine real, shown "60.")

  // FULL TRUSS WITH SUPPORTS
  const arcTop = [], arcR = [], arcRb = [], arcRl = [], arcRr = [];
  for (let x = -0.035; x <= 0.035 + 1e-12; x += 0.001) arcTop.push([x, Math.sqrt(Math.max(0, 0.035 ** 2 - x * x))]);
  for (let k = 0; k <= 69; k++) { const x = 2 * w - 0.0345 + k * 0.001; arcR.push([x, Math.sqrt(Math.max(0, 0.035 ** 2 - (x - 2 * w) ** 2))]); }
  for (let x = 2 * w - 0.999 * 0.05; x <= 2 * w + 0.05 + 1e-12; x += 0.001) arcRb.push([x, -Math.sqrt(Math.max(0, 0.05 ** 2 - (x - 2 * w) ** 2)) - 0.05]);
  for (let x = 2 * w - 0.9999 * 0.05; x <= 2 * w - 0.044 + 1e-12; x += 0.0001) arcRl.push([x, Math.sqrt(Math.max(0, 0.05 ** 2 - (x - 2 * w) ** 2)) - 0.05]);
  for (let x = 2 * w + 0.044; x <= 2 * w + 1.019 * 0.05 + 1e-12; x += 0.001) arcRr.push([x, Math.sqrt(Math.max(0, 0.05 ** 2 - (x - 2 * w) ** 2)) - 0.05]);
  const truss = [
    ...[[0.022, Black], [0.015, GrayLevel(0.6)]].map(([t, c]) => [CapForm('Round'), Thickness(t), c,
      Line([[0, 0], [2 * w, 0], [1.5 * w, h], [0.5 * w, h], [0, 0]]), Line([[0.5 * w, h], [w, 0], [1.5 * w, h]])]),
    [GrayLevel(0.7), Polygon([[-0.07, -0.1], [0.07, -0.1], [0.035, 0], [-0.035, 0]]), Disk([0, 0], 0.035),
      Disk([2 * w, 0], 0.035), Disk([2 * w, -0.05], 0.05), Polygon([[2 * w - 0.0345, 0.0045], [2 * w - 0.044, -0.027], [2 * w + 0.044, -0.027], [2 * w + 0.0345, 0.0045]])],
    [Thin, Line([[-0.035, 0], [-0.07, -0.1], [0.07, -0.1], [0.035, 0]]), Line(arcTop),
      ...[-1, 1].map((k) => Line([[2 * w + k * 0.0345, 0.006], [2 * w + k * 0.044, -0.027]])), Line(arcR), Line(arcRb), Line(arcRl), Line(arcRr)],
    [Blue, Arrow([[-0.25 * h, 0], [0, 0]]), Arrow([[0, -0.25 * h], [0, 0]]),
      Text(Style(RAxy('x'), 18), [-0.25 * h, 0], [1, 0]), Text(Style(RAxy('y'), 18), [0, -0.25 * h], [0, 1.5])],
    [ORANGE, Arrow([[2 * w, -0.25 * h], [2 * w, 0]]), Text(Style(v('R', 'E', ORANGE), 18), [2 * w, -0.25 * h], [0, 1.5])],
    [Magenta, Arrow([[w, 0], [w, -0.5 * h]]), Text(Style(Row([v('F', 'C', Magenta), ' = ', FCtext, ' kN']), 18), [w, -0.5 * h], [0, 1.2])],
  ];

  // SOLVE FOR REACTION FORCES
  const calculatemoment = [
    [Thin, Dashed, GrayLevel(0.4), Line([[0, 0], [0, -0.25 * h]])],
    [Magenta, Arrow([[w, 0], [w, -0.5 * h]]), Text(Style(Row([v('F', 'C', Magenta), ' = ', FCtext, ' kN']), 18, Magenta), [w, -0.5 * h], [0, 1.2])],
    [Blue, Point([0, 0]), Text(Style('A', 18), [0, 0], [0, -1.7])],
    [ORANGE, Arrow([[2 * w, -0.25 * h], [2 * w, 0]]), Text(Style(v('R', 'E', ORANGE), 18), [2 * w, -0.25 * h], [0, 1.5]), Arrow([[0, -0.25 * h], [2 * w, -0.25 * h]])],
    [Magenta, Arrow([[0, -0.15 * h], [w, -0.15 * h]])],
    Text(Style(' w ', 17, Italic, bg), [w / 2, -0.15 * h]),
    Text(Style(Row([' 2 ', Style('w ', Italic)]), 17, bg), [w, -0.25 * h], [-1.5, 0]),
    Annotation(Mouseover(
      Text(Style(Grid([
        [Row([`sum of the moments about A: ${sum}`, v('M', 'A', Black), ' = 0 = ', Style('w ', Italic), v('F', 'C', Magenta), ' - 2 ', Style('w ', Italic), v('R', 'E', ORANGE)])],
        [Row(['reaction force E: ', v('R', 'E', ORANGE), ' = ', '1/2', v('F', 'C', Magenta)])],
        [Style(Row([v('R', 'E', ORANGE), ' = ', nf(RE, [4, 2]), ' kN']), ORANGE)],
      ], { Alignment: '=', Spacings: [0, 0.1] }), 18), [w, -0.95 * h]),
      Text(Style(Column(['the first term is positive because it would cause a', 'clockwise rotation and the second term is negative', 'because it would cause a counterclockwise rotation']), 18), [w, -0.9 * h]),
    ), 'moment-balance'),
  ];
  const Xforcebalance = [
    [Blue, Arrow([[-0.25 * h, 0], [0, 0]]), Arrow([[0, -0.25 * h], [0, 0]]), Arrow([[w, 0], [w, -0.5 * h]]), Arrow([[2 * w, -0.25 * h], [2 * w, 0]])],
    Text(Style(RAxy('x'), 18), [-0.25 * h, 0], [1, 0]), Text(Style(RAxy('y'), 18), [0, -0.25 * h], [0, 1]),
    Text(Style(Row([v('R', 'E', Blue), ' = ', nf(RE, [2, 2]), ' kN']), 18, Blue), [2 * w, -0.25 * h], [0, 1.5]),
    Text(Style(Row([v('F', 'C', Blue), ' = ', FCtext, ' kN']), 18, Blue), [w, -0.5 * h], [0, 1.5]),
    Annotation(Text(Style(Grid([
      [Row(['sum of the ', it('x'), ` forces: ${sum}`, Fx, ' = 0 = ', RAxy('x')])],
      [Row([it('x'), ' component of reaction force A: ', Style(Row([RAxy('x'), ' = 0 kN']), Blue)])],
    ], { Alignment: '=', Spacings: [0, 0.1] }), 18), [w, -0.9 * h]), 'x-balance'),
  ];
  const Yforcebalance = [
    Blue, Arrow([[2 * w, -0.25 * h], [2 * w, 0]]), Arrow([[w, 0], [w, -0.5 * h]]), Arrow([[0, -0.25 * h], [0, 0]]),
    Text(Style(Row([v('F', 'C', Blue), ' = ', FCtext, ' kN']), 18, Blue), [w, -0.5 * h], [0, 1.5]),
    Text(Style(v('R', 'A', Blue), 18, Blue), [0, -0.25 * h], [0, 1.5]),
    Text(Style(Row([v('R', 'E', Blue), ' = ', nf(RE, [2, 2]), ' kN']), 18, Blue), [2 * w, -0.25 * h], [0, 1.5]),
    Annotation(Text(Style(Grid([
      [Row(['sum of the ', it('y'), ` forces: ${sum}`, Fy, ' = 0 = ', v('R', 'A', Blue), ' - ', v('F', 'C', Blue), ' + ', v('R', 'E', Blue)])],
      [Row([it('y'), ' component of reaction force A: ', RAxy('y'), ' = ', v('F', 'C', Blue), ' - ', v('R', 'E', Blue)])],
      [Style(Row([v('R', 'A', Blue), ' = ', nf(RA, [4, 2]), ' kN']), Blue)],
    ], { Alignment: '=', Spacings: [0, 0.1] }), 18, Black), [w, -0.95 * h]), 'y-balance'),
  ];
  const solved = [
    Blue, Arrow([[0, -0.25 * h], [0, 0]]), Arrow([[w, 0], [w, -0.5 * h]]), Arrow([[2 * w, -0.25 * h], [2 * w, 0]]),
    Text(Style(Row([v('F', 'C', Blue), ' = ', FCtext, ' kN']), 18, Blue), [w, -0.5 * h], [0, 1.5]),
    ...[['A', RA, [0, -0.25 * h]], ['E', RE, [2 * w, -0.25 * h]]].map(([l, f, p]) => Annotation(Text(Style(Row([v('R', l, Blue), ' = ', nf(f, [2, 2]), ' kN']), 18, Blue), p, [0, 1.5]), `reaction-${l}`)),
  ];

  // DO BALANCES AT JOINTS
  const JP = { 1: [0, 0], 2: [0.5 * w, h], 3: [w, 0], 4: [1.5 * w, h], 5: [2 * w, 0] };
  const fullstructure = [
    Annotation([['AB', [w / 4, h / 2]], ['AC', [w / 2, 0]], ['BC', [0.75 * w, h / 2]], ['BD', [w, h]], ['CD', [1.25 * w, h / 2]], ['CE', [1.5 * w, 0]], ['DE', [1.75 * w, h / 2]]]
      .map(([l, p]) => Text(Framed(Style(Subscript(it('F'), l), 18), { Background: White, FrameStyle: None, FrameMargins: 'Tiny' }), p)), 'member-labels'),
    Annotation([['A', [0, 0]], ['B', [0.5 * w, h]], ['C', [w, 0]], ['D', [1.5 * w, h]], ['E', [2 * w, 0]]]
      .map(([l, p]) => Text(Framed(Style(Row([' ', l, ' ']), 15), { Background: White, RoundingRadius: 15 }), p)), 'joint-labels'),
    Annotation([Red, Dashed, Circle(JP[joints], 0.2)], 'joint-circle'),
  ];
  const fcBlue = (y) => Text(Style(Row([v('F', 'C', Blue), ' = ', FCtext, ' kN']), 18), [w, -0.5 * h], [0, y]);
  const partialstructure = [
    joints === 1 ? [Arrow([[w / 2, h], [0, 0.05 * h]]), Arrow([[0, 0], [w / 2, 0]]),
      Blue, Arrow([[0, -0.25 * h], [0, -0.05 * h]]), Text(Style(Row([v('R', 'A', Blue), ' = ', nf(RA, [2, 2]), ' kN']), 18), [0, -0.25 * h], [0, 1.5])] : [],
    joints === 2 ? [Arrow([[0, 0], [0.96 * (w / 2), 0.96 * h]]), Arrow([[w / 2, h], [w, 0]]), Arrow([[w, h], [(1.07 * w) / 2, h]])] : [],
    joints === 3 ? [Arrow([[w, 0], [0, 0]]), Arrow([[w, 0], [2 * w, 0]]), Arrow([[w, 0], [0.5 * w, h]]), Arrow([[w, 0], [1.5 * w, h]]),
      Blue, Arrow([[w, 0], [w, -0.5 * h]]), fcBlue(1.2)] : [],
    joints === 4 ? [Arrow([[0.5 * w, h], [0.96 * 1.5 * w, h]]), Arrow([[1.5 * w, h], [w, 0]]), Arrow([[2 * w, 0], [1.01 * 1.5 * w, 0.96 * h]])] : [],
  ];

  // INDIVIDUAL JOINTS
  const thetaRow = (num) => Row([th, ' = ', num]);
  const comp = (m, d, col) => v('F', Row([`${m}, `, it(d)]), col);
  const fTrig = (m, list) => list.map(([d, f, p, o]) => Text(Style(Row([comp(m, d, colA), ' = ', v('F', m, Blue), ' ', f, ' ', th]), 18, bg), p, o));
  const fNum = (m, F, list) => list.map(([d, k, p, o]) => Text(Style(Row([comp(m, d, colA), ' = ', nf(Math.abs(F) * k, [3, 2]), ' kN']), 18, colA, bg), p, o));
  const s = Math.sin(Theta), c = Math.cos(Theta);
  const jointA = [
    [Thick, Dashed, Circle([0, 0], 0.1, [0, Theta])],
    Text(Style(thetaRow('60 °'), 17), [0, 0], [-2.2, -1]), // Row[{"θ = ", Theta}] with Theta = 60°: "60 °"
    ...[['AB', [w / 2, h], [-1.5, -1.5]], ['AC', [w / 2, 0], [-1.5, 0]]].map(([m, p, o]) => Text(Style(v('F', m, Blue), 18), p, o)),
    [Dashed, colA, Arrow([[0.25 * w, 0.52 * h + δ], [0.25 * w, 0.52 * h]]), Arrow([[0.25 * w + δ, 0.52 * h], [0.25 * w, 0.52 * h]])],
    ...fTrig('AB', [['x', 'cos', [0.25 * w + δ, 0.5 * h], [-1, 0]], ['y', 'sin', [0.25 * w, 0.52 * h + δ], [0, -1.2]]]),
    jointLabel('A', [0, 0]),
  ];
  const jointB = [
    [Thick, Dashed, Circle([0.5 * w, h], 0.1, [-Theta, 0])],
    Text(Style(Row([th, ' = ', `${thetaDeg.toFixed(0)}.`, '°']), 18), [0.5 * w, h], [-2.2, 3]),
    Text(Style(Row([v('F', 'AB', Blue), ' = ', nf(Math.abs(F1), [3, 2]), ' kN']), 18, Blue), [0, 0], [0, 1.2]),
    ...[['BC', [w, 0], [0, 1.2]], ['BD', [w, h], [-1.2, 0]]].map(([m, p, o]) => Text(Style(v('F', m, Blue), 18), p, o)),
    [Dashed, colA, Arrow([[0.25 * w, 0.25 * h], [0.25 * w, 0.25 * h + δ]]), Arrow([[0.25 * w - δ, 0.5 * h], [0.25 * w, 0.5 * h]]),
      Arrow([[0.75 * w, 0.5 * h], [0.75 * w, 0.5 * h - δ]]), Arrow([[0.75 * w, 0.5 * h], [0.75 * w + δ, 0.5 * h]])],
    ...fNum('AB', F1, [['x', c, [0.25 * w - δ, 0.5 * h], [1, 0]], ['y', s, [0.25 * w, 0.25 * h], [0, 1.2]]]),
    ...fTrig('BC', [['x', 'cos', [0.75 * w + δ, 0.5 * h], [-1, 0]], ['y', 'sin', [0.75 * w, 0.5 * h - δ], [0, 1.2]]]),
    jointLabel('B', [w / 2, h]),
  ];
  const jointC = [
    [Thick, Dashed, Circle([w, 0], 0.1, [0, Theta])],
    Text(Style(Row([th, ' = ', `${thetaDeg.toFixed(0)}.`, '°']), 18), [w, 0], [-2, -1]),
    ...[['AC', F2, [0, 0], [1.2, 0]], ['BC', F3, [0.5 * w, h], [1, -1.2]]].map(([m, F, p, o]) => Text(Style(Row([v('F', m, Blue), ' = ', nf(Math.abs(F), [3, 2]), ' kN']), 18, Blue), p, o)),
    ...[['CD', [1.5 * w, h], [-1, -1.2]], ['CE', [2 * w, 0], [-1, 0]]].map(([m, p, o]) => Text(Style(v('F', m, Blue), 18), p, o)),
    [Dashed, colA, Arrow([[0.75 * w, 0.5 * h], [0.75 * w - δ, 0.5 * h]]), Arrow([[0.75 * w, 0.5 * h], [0.75 * w, 0.5 * h + δ]]),
      Arrow([[1.25 * w, 0.5 * h], [1.25 * w + δ, 0.5 * h]]), Arrow([[1.25 * w, 0.5 * h], [1.25 * w, 0.5 * h + δ]])],
    ...fNum('BC', F3, [['x', c, [0.75 * w - δ, 0.5 * h], [1, 0]], ['y', s, [0.75 * w, 0.5 * h + δ], [0.5, -1.2]]]),
    ...fTrig('CD', [['x', 'cos', [1.25 * w + δ, 0.5 * h], [-1, 0]], ['y', 'sin', [1.25 * w, 0.5 * h + δ], [-0.5, -1.2]]]),
    jointLabel('C', [w, 0]),
  ];
  const jointD = [
    [Thick, Dashed, Circle([1.5 * w, h], 0.1, [Math.PI, Math.PI + Theta])],
    Text(Style(Row([th, ' = ', `${thetaDeg.toFixed(0)}.`, '°']), 18), [1.5 * w, h], [2.2, 2]),
    ...[['BD', F4, [0.5 * w, h], [1.2, 0]], ['CD', F5, [w, 0], [1, 1.2]]].map(([m, F, p, o]) => Text(Style(Row([v('F', m, Blue), ' = ', nf(Math.abs(F), [3, 2]), ' kN']), 18, Blue), p, o)),
    Text(Style(v('F', 'DE', Blue), 18), [2 * w, 0], [-1, 1.2]),
    [Dashed, colA, Arrow([[1.25 * w, 0.5 * h], [1.25 * w, 0.5 * h - δ]]), Arrow([[1.25 * w, 0.5 * h], [1.25 * w - δ, 0.5 * h]]),
      Arrow([[1.75 * w, 0.5 * h - δ], [1.75 * w, 0.5 * h]]), Arrow([[1.75 * w + δ, 0.5 * h], [1.75 * w, 0.5 * h]])],
    ...fNum('CD', F5, [['x', c, [1.25 * w - δ, 0.5 * h], [1, 0]], ['y', s, [1.25 * w, 0.5 * h - δ], [0.5, 1.2]]]),
    ...fTrig('DE', [['x', 'cos', [1.75 * w + δ, 0.5 * h], [-1, 0]], ['y', 'sin', [1.75 * w, 0.5 * h - δ], [-0.5, 1.2]]]),
    jointLabel('D', [1.5 * w, h]),
  ];
  const members = [
    [F1, 'AB', [[0, 0], [0.5 * w, h]], [0.25 * w, 0.5 * h], Theta], [F2, 'AC', [[0, 0], [w, 0]], [0.5 * w, 0], 0], [F3, 'BC', [[0.5 * w, h], [w, 0]], [0.75 * w, 0.5 * h], -Theta],
    [F4, 'BD', [[0.5 * w, h], [1.5 * w, h]], [w, h], 0], [F5, 'CD', [[w, 0], [1.5 * w, h]], [1.25 * w, 0.5 * h], Theta], [F6, 'CE', [[w, 0], [2 * w, 0]], [1.5 * w, 0], 0],
    [F7, 'DE', [[1.5 * w, h], [2 * w, 0]], [1.75 * w, 0.5 * h], -Theta],
  ];
  const jointssolved = [
    Annotation(members.map(([f, m, pts, p, a]) => [
      ...(f < 0 ? [colC, Arrowheads([-0.05, 0.05])] : [colT, Arrowheads([[0.05, 0.275], [-0.05, 0.725]])]), Arrow(pts),
      Text(RotatedText(Style(Row([Subscript(it(' F'), m), ' = ', nf(Math.abs(f), [2, 2]), ' ']), 18, bg), a), p),
    ]), 'member-forces'),
    [Blue, Arrow([[0, -0.25 * h], [0, 0]]), Arrow([[w, 0], [w, -0.5 * h]]), Arrow([[2 * w, -0.25 * h], [2 * w, 0]]),
      ...[['A', RA, [0, -0.25 * h]], ['E', RE, [2 * w, -0.25 * h]]].map(([l, f, p]) => Text(Style(Row([v('R', l, Blue), ' = ', nf(f, [3, 2]), ' kN']), 18), p, [0, 1.5])),
      Text(Style(Row([v('F', 'C', Blue), ' = ', nf(FC, [3, 2]), ' kN']), 18), [w, -0.5 * h], [0, 1.5])],
    Text(Style(Row(['all ', Style('compression', colC), ' and ', Style('tension', colT), ' forces are in kN']), 17, GrayLevel(0.4)), [w, -0.86 * h]),
  ];

  // SOLVING FORCE BALANCES AT JOINTS
  const res = (m, F, kind) => Style(Row([v('F', m, Blue), ' = ', nf(Math.abs(F), [4, 2]), ` kN (${kind})`]), Blue);
  // E-TJ-01: joint C's two balances lack the "= 0" that every other balance has (Σ Fy = −FC + …); corrected: "= 0 = −FC + …"
  const eqC = corrected ? ' = 0 = -' : ' = -';
  const equations = {
    1: Grid([
      [Row([sum, Fy, ' = 0 = ', v('R', 'A', Blue), ' - ', v('F', 'AB', Blue), ' sin ', th]), Row([sum, Fx, ' = 0 = -', v('F', 'AB', Blue), ' cos ', th, ' + ', v('F', 'AC', Blue)])],
      [Row([v('F', 'AB', Blue), ' = ', v('R', 'A', Blue), '/sin ', th]), Row([v('F', 'AC', Blue), ' = ', v('F', 'AB', Blue), ' cos ', th])],
      [res('AB', F1, 'compression'), res('AC', F2, 'tension')],
    ], { Alignment: '=', Spacings: [5, 0.1] }),
    2: Grid([
      [Row([sum, Fy, ' = 0 = ', v('F', 'AB', Blue), ' sin ', th, ' - ', v('F', 'BC', Blue), ' sin ', th]),
        Row([sum, Fx, ' = 0 = ', v('F', 'AB', Blue), ' cos ', th, ' + ', v('F', 'BC', Blue), ' cos ', th, ' - ', v('F', 'BD', Blue)])],
      [Row([v('F', 'BC', Blue), ' = ', v('F', 'AB', Blue)]), Row([v('F', 'BD', Blue), ' = (', v('F', 'AB', Blue), ' + ', v('F', 'BC', Blue), ') cos ', th])],
      [res('BC', F3, 'tension'), res('BD', F4, 'compression')],
    ], { Alignment: '=', Spacings: [2, 0.1] }),
    3: Grid([
      [Row([sum, Fy, eqC, v('F', 'C', Blue), ' + ', v('F', 'BC', Blue), ' sin ', th, ' + ', v('F', 'CD', Blue), ' sin ', th]),
        Row([sum, Fx, eqC, v('F', 'AC', Blue), ' - ', v('F', 'BC', Blue), ' cos ', th, ' + ', v('F', 'CD', Blue), ' cos ', th, ' + ', v('F', 'CE', Blue)])],
      [Row([v('F', 'CD', Blue), ' = ', v('F', 'C', Blue), '/sin ', th, ' - ', v('F', 'BC', Blue)]),
        Row([v('F', 'CE', Blue), ' = ', v('F', 'AC', Blue), ' + (', v('F', 'BC', Blue), ' - ', v('F', 'CD', Blue), ') cos ', th])],
      [res('CD', F5, 'tension'), res('CE', F6, 'tension')],
    ], { Alignment: '=', Spacings: [0.4, 0.1] }), // Spacings -> {1, …}: the two long lines fit the 605 px only closer together
    4: Grid([
      [Row([sum, Fy, ' = 0 = -', v('F', 'CD', Blue), ' sin ', th, ' + ', v('F', 'DE', Blue), ' sin ', th])],
      [Row([v('F', 'DE', Blue), ' = ', v('F', 'CD', Blue)])],
      [res('DE', F7, 'compression')],
    ], { Alignment: '=', Spacings: [0.8, 0.1] }),
  };

  // the picture
  const focused = steps === 2 && focus && joints < 5;
  const content = [Thick, Arrowheads('Large'),
    focused || (steps === 1 && opt === 0) ? [] : Annotation([EdgeForm(Thick), FaceForm(None), Polygon([[0, 0], [0.5 * w, h], [w, 0]]), Polygon([[0.5 * w, h], [1.5 * w, h], [w, 0]]), Polygon([[1.5 * w, h], [2 * w, 0], [w, 0]])], 'members'),
    steps === 1
      ? Annotation([truss, calculatemoment, Xforcebalance, Yforcebalance, solved][opt], ['truss', 'calculate-moment', 'x-force-balance', 'y-force-balance', 'reactions'][opt])
      : focus ? [Annotation(partialstructure, 'partial-structure'), Annotation([null, jointA, jointB, jointC, jointD, jointssolved][joints], joints === 5 ? 'joints-solved' : `joint-${'ABCD'[joints - 1]}`)]
        : joints === 5 ? Annotation(jointssolved, 'joints-solved') : Annotation(fullstructure, 'full-structure'),
    steps === 1 || (steps === 2 && joints === 5) ? [[0, 0], [0.5 * w, h], [w, 0], [1.5 * w, h], [2 * w, 0]].map((p) => [PointSize(0.015), Point(p), White, PointSize(0.01), Point(p)]) : [],
  ];
  const size = [600, focused ? 300 : 395];
  let range, pad;
  if (steps === 1) { range = [[-0.37 * w, 2.25 * w], [opt === 0 || opt === 4 ? -0.64 * h : -1.2 * h, 1.1 * h]]; pad = 0; }
  else if (joints === 5 || focus) { range = rangeAll(content, size); pad = 0.02; } // PlotRange -> All (padded by Scaled[0.02])
  else { range = [[-0.21 * w, 2.21 * w], [-0.25 * h, 1.27 * h]]; pad = 0; }
  const padded = [[range[0][0] - pad * (range[0][1] - range[0][0]), range[0][1] + pad * (range[0][1] - range[0][0])], [range[1][0] - pad * (range[1][1] - range[1][0]), range[1][1] + pad * (range[1][1] - range[1][0])]];
  const picture = Graphics(content, { ImageSize: size[0], PlotRange: fitPlotRange(padded, size), PlotRangePadding: [0, 0], UpdateFrame: true });
  const eqPicture = Graphics(focused ? [Annotation(Text(Style(equations[joints], joints === 3 ? 15 : 17), [0, 0]), 'equations')] : [],
    { ImageSize: 605, PlotRange: [[-302.5, 302.5], [-40, 40]], PlotRangePadding: [0, 0] }); // ImageSize -> {605, 70}: 80 px here, room for the three rows; joint C's long balances at 15 instead of 17 px so that they fit the width in the browser's font
  const view = {
    ...S, ThetaDeg: thetaDeg, h, steps, opt, joints, focus, showEquations: focused,
    jointCBalanceHasZero: corrected, // E-TJ-01
    shown: steps === 1 ? ['truss', 'calculate moment', 'x-force balance', 'y-force balance', 'solved'][opt] : focus ? (joints === 5 ? 'solved' : `joint ${'ABCD'[joints - 1]}`) : joints === 5 ? 'solved' : 'full structure',
    compression: members.filter(([f]) => f < 0).map(([, m]) => m), tension: members.filter(([f]) => f >= 0).map(([, m]) => m),
  };
  return { view, graphics: [picture, eqPicture] };
}

