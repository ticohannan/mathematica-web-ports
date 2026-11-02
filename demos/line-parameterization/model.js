// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 18 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/line-parameterization/model.js — one evaluation of the Manipulate body: the state in, { view, graphics } out
// (pure, no DOM). The normal form of a line, x cos θ + y sin θ = ρ (DESIGN.md §4).
import {
  Line, Arrow, BSplineCurve, Point, Text, Style, Rotate, Annotation, Arrowheads, PointSize, Thick,
  Red, Blue, Purple, Italic, Row,
} from '../../shared/graphics.js';
import { nearest32Index } from '../common/dial-control.js';

export const initialState = () => ({ rho: 1, p1: [1, 0] });

/**
 * myArrowArc2[c_, r_, {start_, end_}] := If[start === end, Point[c + r{Cos[start], Sin[start]}],
 *   Arrow[BSplineCurve[Table[c + r{Cos[t], Sin[t]}, {t, start, end, (end - start)/11}]]]]
 * Here start = 0 and end = θ (exact in the original: k π/32), so SameQ is k === 0.
 */
export function myArrowArc2(c, r, [start, end], same = start === end) {
  if (same) return Point([c[0] + r * Math.cos(start), c[1] + r * Math.sin(start)]);
  const step = (end - start) / 11;
  const pts = Array.from({ length: 12 }, (_, i) => start + i * step).map((t) => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
  return Arrow(BSplineCurve(pts));
}

/**
 * θ = ArcTan[p1[[1]], p1[[2]]]; If[θ < 0, θ = θ + 2π]. p1 is a point of the dial's table {Cos a, Sin a},
 * a = −π … π in steps of π/32 (exact in Mathematica), so θ = k π/32 with k = 0 … 63; k is kept exact.
 */
export function thetaIndex(p1) {
  const k = nearest32Index(p1); // −32 … 32: the angle of the table point is k π/32
  return ((k % 64) + 64) % 64; // ArcTan gives (−π, π]: −π/… + 2π; k = −32 is ArcTan[−1, 0] = π, i.e. 32
}

const EQUATION = Row([Style('x', Italic), ' cos θ + ', Style('y', Italic), ' sin θ = ρ']);

/** The Manipulate body (DESIGN.md F-LP-03 … F-LP-10), the primitives in the original's order. */
export function evaluate({ rho, p1 }) {
  const k = thetaIndex(p1);
  const theta = (k * Math.PI) / 32;
  const c = Math.cos(theta), s = Math.sin(theta);
  const u = (r) => [r * c, r * s]; // r {Cos θ, Sin θ}
  const n = [-s, c]; // {−Sin θ, Cos θ}
  const add = (a, b, f = 1) => [a[0] + f * b[0], a[1] + f * b[1]];
  const foot = u(rho);
  const graphics = [
    Annotation(Line([foot, u(rho - 0.2), add(u(rho - 0.2), n, 0.2), add(foot, n, 0.2)]), 'marker'),
    Red, Annotation(myArrowArc2([0, 0], rho / 2, [0, theta], k === 0), 'arc'),
    // If[Abs[θ] >= π/16, Text[…]]: exact in the original, k >= 2 here
    k >= 2 && Annotation(Text(Style('θ', 'Medium'), [rho * 0.75 * Math.cos(theta - Math.PI / 16), rho * 0.75 * Math.sin(theta - Math.PI / 16)]), 'theta-label'),
    Blue, Arrowheads([-0.03, 0.03]), Annotation(Arrow([[0, 0], foot]), 'rho-arrow'),
    Annotation(Text(Style('ρ', 'Medium'), add(u(rho / 2), n, 0.15)), 'rho-label'),
    Purple, Thick,
    Annotation(Line([add(foot, n, -5), add(foot, n, 5)]), 'line'),
    Annotation(Rotate(Text(Style(EQUATION, 'Medium'), u(1.2 * rho)), theta - Math.PI / 2), 'equation'),
    PointSize('Large'), Annotation(Point(foot), 'foot'),
  ];
  return { view: { k, theta, foot, normal: [c, s], rho }, graphics };
}
