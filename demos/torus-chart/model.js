// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/torus-chart/model.js — "Chart for a Torus": TorusToPlane, the two angles read from the dial points, the plot
// label and one evaluation of the Manipulate body (the green ball). Pure: no DOM, no three.js, importable in Node.
//
//   TorusToPlane[λ_, u_, v_] := If[λ <= 1,
//     {(1)/(3) π (3 - Cos[u] (-2 - λ + (λ-1) Cos[v])), (1)/(3) π (3 - (-2 - λ + (λ-1) Cos[v]) Sin[u]),
//      -λ (v - π) + (1 - λ) Sin[v]},
//     {(λ-1) (v) + (2-λ) (π + Cos[u] π), (λ-1) (2π - u) + (2-λ) (π + Sin[u] π), (λ-2) (v - π)}]
//   Body: Theta = ArcTan[p1[[1]], p1[[2]]]; If[Theta < 0, Theta = Theta + 2π]; Phi the same from p2;
//         config = Graphics3D[{Green, Sphere[TorusToPlane[λ, Theta, Phi], 2/10]}];
//         PlotLabel -> If[λ < 1/2, "2-Torus", If[λ < 1.2, "Cylinder", "Plane"]]
//
// Order of operations (K-TC-09, resolved by the harness records H-TC-01 … H-TC-14, bit for bit): every Plus is added
// left to right in the written order, its exact constant included where it is written (-2 - λ + (λ-1) Cos[v] =
// (-2 + -λ) + (λ-1)·Cos v); in (1)/(3) π (…) the numbers are multiplied first and the constant π last:
// ((…)·N[1/3])·N[π]. Refuted by the records: the exact constants added last (H-TC-03 y) and (1/3·π)·(…) (H-TC-03, H-TC-04,
// H-TC-12, H-TC-14).
import { mLess, mLessEq } from '../../shared/mma.js';
import { arcTan } from '../../shared/mma-exact.js';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI; // N[2π]
const THIRD = 1 / 3;
const nz = (x) => x + 0; // Mathematica has no negative zero

/** The Manipulate's stored "Variables" (⊕ > Initial Settings): λ = 0, p1 = p2 = {1, 0} (F-TC-09). */
export const INITIAL_SETTINGS = Object.freeze({ λ: 0, p1: Object.freeze([1, 0]), p2: Object.freeze([1, 0]) });
/** The live state saved in the output cell's DynamicModule (= snapshot 1's Settings; λ is the machine real 2.). */
export const SAVED_STATE = Object.freeze({
  λ: 2, p1: Object.freeze([0.5472493629827029, -0.8369696139735457]), p2: Object.freeze([0.5754934061746134, 0.8178064193007667]),
});
const copy = (s) => ({ λ: s.λ, p1: s.p1.slice(), p2: s.p2.slice() });
/** The opening state of the page: the saved live state (F-TC-09, COMMON-DECISIONS §6). */
export const initialState = () => copy(SAVED_STATE);
/** What "Initial settings" restores (A-TC-01). */
export const initialSettings = () => copy(INITIAL_SETTINGS);
export const cloneState = copy;

/** TorusToPlane[λ, u, v] (tolerant λ <= 1), term by term as the source, in Mathematica's evaluation order (K-TC-09). */
export function TorusToPlane(λ, u, v) {
  if (mLessEq(λ, 1)) {
    const lm1 = λ + -1; // (λ-1)
    const P = (-2 + -λ) + lm1 * Math.cos(v); // -2 - λ + (λ-1) Cos[v], left to right (H-TC-03)
    const x = (-(Math.cos(u) * P) + 3) * THIRD * PI; // (1)/(3) π (3 - Cos[u] P): the numbers first, π last
    const y = (-(P * Math.sin(u)) + 3) * THIRD * PI;
    const z = -(λ * (v + -PI)) + (-λ + 1) * Math.sin(v);
    return [nz(x), nz(y), nz(z)];
  }
  const lm1 = λ + -1, tml = -λ + 2;
  const x = lm1 * v + tml * (Math.cos(u) * PI + PI);
  const y = lm1 * (-u + TWO_PI) + tml * (Math.sin(u) * PI + PI);
  const z = (λ + -2) * (v + -PI);
  return [nz(x), nz(y), nz(z)];
}

/** Theta = ArcTan[p[[1]], p[[2]]]; If[Theta < 0, Theta = Theta + 2π]: an angle in [0, 2π] (2π itself by rounding). */
export function angleOf(p) {
  const a = arcTan(p[0], p[1]);
  return mLess(a, 0) ? a + TWO_PI : a;
}

/** PlotLabel -> If[λ < 1/2, "2-Torus", If[λ < 1.2, "Cylinder", "Plane"]] (tolerant Less, Q-TC-03). */
export function plotLabel(λ) {
  if (mLess(λ, 1 / 2)) return '2-Torus';
  if (mLess(λ, 1.2)) return 'Cylinder';
  return 'Plane';
}

/** Sphere radius of the point (θ, φ): 2/10. */
export const BALL_RADIUS = 2 / 10;
/** PlotRange -> {{-m, 2π+m}, {-m, 2π+m}, {-π-m, π+m}} with m = .2 */
export const M = 0.2;
export const PLOT_RANGE = Object.freeze([[-M, TWO_PI + M], [-M, TWO_PI + M], [-PI - M, PI + M]]);
/** FaceForm[front, back] of PlotStyle, Opacity[0.8] (raw notebook; the readable source shows <<GraphicsBox>>). */
export const FACE_FRONT = Object.freeze([0.34398, 0.49112, 0.89936]);
export const FACE_BACK = Object.freeze([0.97, 0.606, 0.081]);
export const OPACITY = 0.8;

/**
 * One evaluation of the Manipulate body for the state {λ, p1, p2}: the two angles, the ball (config) and the label.
 * A dial point (0, 0) (Normalize[{0, 0}] at the exact centre) is no special case: ArcTan[0., 0.] = 0. without a message
 * (harness H-TC-11, K-TC-03 resolved), so θ = 0 like a point on the positive x axis.
 */
export function evaluate(st) {
  const θ = angleOf(st.p1);
  const φ = angleOf(st.p2);
  return { θ, φ, config: { center: TorusToPlane(st.λ, θ, φ), radius: BALL_RADIUS }, label: plotLabel(st.λ) };
}
