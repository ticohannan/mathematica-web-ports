// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Jon Neades
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/quarter-car-double-spring/model.js — "Quarter-Car Suspension Model with Double Spring": one evaluation of the
// Manipulate body, the state in, { view, graphics } out (pure, no DOM). Simple mode: shared/ode.js NDSolve (two masses),
// shared/plot.js Plot.
import {
  Graphics, Annotation, Line, Rectangle, Point, Polygon, Text, Style, Row, Column, Subscript, Black, Blue, Red, Pink, Green,
  Darker, LightGray, PointSize, RGBColor, Inset,
} from '../../shared/graphics.js';
import { Plot, Show } from '../../shared/plot.js';
import { NDSolve } from '../../shared/ode.js';
import { NumberForm } from '../../shared/number-form.js';
import { isCorrected } from '../../shared/errata.js';

export const MAXTIME = 10, STARTX = -0.75, DIA = 0.2;
export const initialState = () => ({ run: 0, m1: 400, m2: 30, k1: 20000, k2: 80000, c1: 2000, c2: 0, type: 1, h: 0.15, wid: 1, ω: 1 });

// the Initialization's functions
export const CalcPulse = (ti, tmin, length, he) => (ti >= tmin && ti <= tmin + length ? he * Math.sin((Math.PI / length) * (ti - tmin)) : 0);
export const CalcForce = (ti, typ, k, wi, he, omega) => (typ === 1 ? k * CalcPulse(ti, 2, wi, he) : k * he * Math.sin(2 * Math.PI * omega * ti));
export const CalcCurve = (ti, typ, ru, wi, he, omega) => (typ === 1 ? -2 + CalcPulse(ti + ru - STARTX, 2, wi, he) : -2 + he * Math.sin(2 * Math.PI * omega * (ru + ti - STARTX)));
export const CalcGround = (typ, ru, wi, he, omega) => (typ === 1 ? -2 + CalcPulse(ru, 2, wi, he) : -2 + he * Math.sin(2 * Math.PI * omega * ru));

/** NDSolve of the two equations with zero initial values on {t, 0, maxtime}: x1 the sprung mass, x2 the unsprung. */
export function solve({ m1, m2, k1, k2, c1, c2, type, h, wid, ω }) {
  const f = (t) => CalcForce(t, type, k2, wid, h, ω);
  return NDSolve((t, [x1, v1, x2, v2]) => [
    v1, -(k1 * (x1 - x2) + c1 * (v1 - v2)) / m1,
    v2, (f(t) - k1 * (x2 - x1) - c1 * (v2 - v1) - k2 * x2 - c2 * v2) / m2,
  ], [0, 0, 0, 0], [0, MAXTIME], { breakpoints: type === 1 ? [2, 2 + wid] : [] });
}
/** ζ, ω = Re[Sqrt[1 − c²/(2 k m)] Sqrt[k/m]] and f = ω/(2π) of one mass, as the labels give them. */
export const modal = (m, k, c) => { const a = 1 - (c * c) / (2 * k * m), ω = a < 0 ? 0 : Math.sqrt(a) * Math.sqrt(k / m); return { ζ: c / (2 * Math.sqrt(m * k)), ω, f: ω / (2 * Math.PI) }; };

/** The zigzag spring between `top` (y) and `bottom`: Line[Join[a, b, c]] with ten corners. */
function zigzag(top, bottom) {
  const len = top - bottom - 0.2;
  return Line([[STARTX, top], [STARTX, top - 0.1],
    ...Array.from({ length: 10 }, (_, i) => { const n = i + 1; return [STARTX + DIA * Math.sin(Math.PI * n - Math.PI / 2), top - 0.1 - (n * len) / 11]; }),
    [STARTX, bottom + 0.1], [STARTX, bottom]]);
}

/** The Manipulate body: Column[{Show[dispx, followu, follows], dispgraphics}]. */
export function evaluate(state) {
  const { run, m1, m2, k1, k2, c1, c2, type, h, wid, ω } = state;
  const corrected = isCorrected(state);
  const sol = solve(state);
  const sols = (t) => sol(t)[0], solu = (t) => sol(t)[2];
  const s = modal(m1, k1, c1), u = modal(m2, k2, c2);
  const dispx = Plot([sols, solu], [0, MAXTIME], {
    PlotRange: [-0.25, 0.25], Background: LightGray, PlotStyle: [Darker(Blue), Darker(Red)], Axes: false, Ticks: 'None',
    AspectRatio: 0.3, ImageSize: 400, label: 'Displacements of the two masses',
  });
  const top = Show(dispx, Graphics([PointSize('Large'), RGBColor(0.49, 0, 0), Annotation(Point([run, solu(run)]), 'follow-u')]),
    Graphics([PointSize('Large'), RGBColor(0, 0, 0.49), Annotation(Point([run, sols(run)]), 'follow-s')]));
  const ys = sols(run), yu = solu(run);
  const ground = CalcGround(type, run, wid, h, ω);
  const road = [];
  for (let i = 0; i <= 300; i++) { const t = -3 + (6 * i) / 300; road.push([t, CalcCurve(t, type, run, wid, h, ω)]); }
  const n2 = (x) => NumberForm(x, [3, 2]);
  const sub = (a, i) => Subscript(a, String(i));
  const picture = [
    Annotation(zigzag(0.5 + ys, -0.5 + yu), 'upper-spring'), Annotation(zigzag(-1.25 + yu, ground), 'lower-spring'),
    Darker(Blue), Annotation(Rectangle([STARTX - 1, 0.5 + ys], [STARTX + 1, 1.5 + ys]), 'sprung-mass'),
    Darker(Red), Annotation(Rectangle([STARTX - 0.5, -1.25 + yu], [STARTX + 0.5, -0.5 + yu]), 'unsprung-mass'),
    Black,
    Text(Style(Column([Row([sub('ζ', 1), ' = ', n2(s.ζ)]), Row([sub('ω', 1), ' = ', n2(s.ω), ' rad/s']), Row([sub('f', 1), ' = ', n2(s.f), ' Hz'])]), 14), [1.75, 0.5]),
    // E-QD-01: the original writes "Hz" after ω₂
    Text(Style(Column([Row([sub('ζ', 2), ' = ', n2(u.ζ)]), Row([sub('ω', 2), ' = ', n2(u.ω), corrected ? ' rad/s' : ' Hz']), Row([sub('f', 2), ' = ', n2(u.f), ' Hz'])]), 14), [1.75, -1.25]),
    [Darker(Green, 0.6), Polygon([[-3, -2.5], ...road, [3, -2.5]])], [Darker(Green), Line(road)],
    PointSize('Large'), Pink, Point([STARTX, ground]),
  ];
  return {
    view: { xs: ys, xu: yu, ground, sprung: s, unsprung: u, max: Math.max(...Array.from({ length: 201 }, (_, i) => Math.abs(sols(i / 20)))), corrected },
    graphics: [
      Graphics([Annotation(top.list, 'displacement-plot')], top.options),
      Graphics(picture, { PlotRange: [[-3, 3], [-2.5, 2]], ImageSize: 400, PlotRangePadding: 0 }),
    ],
  };
}
