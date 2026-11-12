// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rob Lockhart
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/forward-kinematics/model.js — one evaluation of the Manipulate body of "Forward Kinematics" (pure: no DOM, no
// three.js): the four joint angles (exact multiples of π/32), the transforms TR1 … TR4 of the original's initialization
// code, the Graphics3D content in the original's order, and the table of the four local matrices as Mathematica
// evaluates them (exact entries in TraditionalForm, shared/traditional-form.js). Names follow the original
// (docs/original-source/forward-kinematics.txt).
import { Graphics3D, Opacity, RGBColor, Black, Cylinder, Cuboid, Rotate, Tube, Arrow, mul4, apply4 } from '../../shared/graphics3d.js';
import { cosPi, sinPi } from '../../shared/exact-pi.js';
import { trigEntry, intEntry } from '../../shared/traditional-form.js';
import { isCorrected } from '../../shared/errata.js';

/** the sliders' grid: an angle is the integer n of nπ/32 */
export const DEN = 32;
const π = Math.PI;
export const angleOf = (n) => (n * π) / DEN;
/** {{T1, 0, "base"}, 0, 2Pi, Pi/32}, {{T2, 5Pi/16, "link 1"}, 0, Pi, Pi/32}, {{T3, -Pi/2, "link 2"}, -Pi/2, Pi/2, Pi/32},
 *  {{T4, 7Pi/32, "end effector"}, -Pi/2, Pi/2, Pi/32} as integers n (value nπ/32) */
export const RANGES = { T1: [0, 64], T2: [0, 32], T3: [-16, 16], T4: [-16, 16] };
export const initialState = () => ({ T1: 0, T2: 10, T3: -16, T4: 7, FT: false });

// the original's colours
export const BLUE = [0.25, 0.43, 0.82], RED = [0.49, 0, 0];

/** the four local 4×4 matrices of the initialization code (TR1 … TR4), with exact cos/sin of nπ/32 (exact 0, ±1) */
export function localMatrices({ T1, T2, T3, T4 }) {
  const c = (n) => cosPi(n, DEN), s = (n) => sinPi(n, DEN);
  const ng = (x) => (x === 0 ? 0 : -x);
  const R1 = [[c(T1), ng(s(T1)), 0, 0], [s(T1), c(T1), 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const A = (n, dx, dz) => [[c(n), 0, ng(s(n)), dx], [0, 1, 0, 0], [s(n), 0, c(n), dz], [0, 0, 0, 1]];
  return { R1, A2: A(T2, 0, 3), A3: A(T3, 20, 0), A4: A(T4, 20, 0) };
}

/** TR1 … TR4 as the products R1, R1.A2, R1.A2.A3, R1.A2.A3.A4 and the point maps vec ↦ (M.{vec, 1})[[1;;3]] */
export function transforms(st) {
  const { R1, A2, A3, A4 } = localMatrices(st);
  const M1 = R1, M2 = mul4(M1, A2), M3 = mul4(M2, A3), M4 = mul4(M3, A4);
  return { M1, M2, M3, M4, TR1: (v) => apply4(M1, v), TR2: (v) => apply4(M2, v), TR3: (v) => apply4(M3, v), TR4: (v) => apply4(M4, v) };
}

/**
 * The matrices shown in the table, as Mathematica evaluates the exact expressions: TraditionalForm of
 *   base         {{Cos[T1], -Sin[T1], 0, 0}, {Sin[T1], Cos[T1], 0, 0}, {0, 0, 1, 0}, {0, 0, 0, 1}}
 *   link 1       {{Cos[T2], 0, -Sin[T2], 0}, {0, 1, 0, 0}, {Sin[T2], 0, Cos[T2], 0}, {0, 0, 0, 1}}
 *   link 2       {{Cos[T3], 0, -Sin[T3], 20}, {0, 1, 0, 0}, {Sin[T3], 0, Cos[T3], 0}, {0, 0, 0, 1}}
 *   end-effector {{Cos[T4], 0, -Sin[T4], 20}, {0, 1, 0, 0}, {Sin[T4], 0, Cos[T4], 0}, {0, 0, 0, 1}}
 * (link 1 without the 3 of TR2's matrix: N-FK-02).
 */
export function tableMatrices({ T1, T2, T3, T4 }) {
  const C = (n) => trigEntry('cos', n, DEN), S = (n, sg = 1) => trigEntry('sin', n, DEN, sg);
  const i = intEntry;
  const link = (n, dx) => [[C(n), i(0), S(n, -1), i(dx)], [i(0), i(1), i(0), i(0)], [S(n), i(0), C(n), i(0)], [i(0), i(0), i(0), i(1)]];
  return [
    ['base', [[C(T1), S(T1, -1), i(0), i(0)], [S(T1), C(T1), i(0), i(0)], [i(0), i(0), i(1), i(0)], [i(0), i(0), i(0), i(1)]]],
    ['link 1', link(T2, 0)],
    ['link 2', link(T3, 20)],
    ['end-effector', link(T4, 20)],
  ];
}

/** the table header: "local rotation matrix" (E-FK-01: corrected "local transformation matrix") */
export const tableHeader = (st) => (isCorrected(st) ? 'local transformation matrix' : 'local rotation matrix');

/** Graphics3D options of the original */
export const OPTIONS = Object.freeze({ Boxed: false, ImageSize: [350, 350], PlotRange: [[-50, 50], [-50, 50], [0, 55]], ViewAngle: π / 15, Lighting: 'Neutral' });

/**
 * One evaluation of the body: Pane[Grid[{{Graphics3D[{…}, Boxed -> False, ImageSize -> {350, 350},
 * PlotRange -> {{-50, 50}, {-50, 50}, {0, 55}}, ViewAngle -> π/15, Lighting -> "Neutral"], Text@Style[Grid[{…}],
 * FontSize -> 10]}}, Frame -> All], {575, 375}]. Returns { view, graphics: [Graphics3D, table] }.
 */
export function evaluate(st) {
  const { T1, FT } = st;
  const { M1, M2, M3, M4, TR1, TR2, TR3, TR4 } = transforms(st);
  const frame = (TR, o, k) => [Arrow([TR(o), TR([o[0], o[1] + k, o[2]])]), Arrow([TR(o), TR([o[0] + k, o[1], o[2]])]), Arrow([TR(o), TR([o[0], o[1], o[2] + k])])];
  const id = (v) => v;
  const content = [
    Opacity(0.9), RGBColor(...BLUE), Cylinder([[0, 0, -5], [0, 0, 0]], 10),
    RGBColor(...RED), Rotate(Cuboid([-3, -3, 0], [3, 3, 3]), angleOf(T1), [0, 0, 1]),
    Cylinder([TR1([0, -3, 3]), TR1([0, 3, 3])], 3),
    RGBColor(...BLUE), Cylinder([TR2([0, 0, 0]), TR2([20, 0, 0])], 2),
    RGBColor(...RED), Cylinder([TR2([20, -3, 0]), TR2([20, 3, 0])], 3),
    RGBColor(...BLUE), Cylinder([TR3([0, 0, 0]), TR3([20, 0, 0])], 2),
    RGBColor(...RED), Cylinder([TR3([20, -3, 0]), TR3([20, 3, 0])], 3),
    // JoinForm["Miter"]: the tube's two corners are drawn rounded (D-FK-02)
    RGBColor(...BLUE), Tube([TR4([6, 3, 0]), TR4([3, 3, 0]), TR4([3, -3, 0]), TR4([6, -3, 0])], 1),
    // Black, If[FT, Opacity[1], Opacity[0]]: the 15 frame arrows are always there, invisible unless "show frames"
    Black, Opacity(FT ? 1 : 0),
    ...frame(id, [0, 0, 3], 10), ...frame(TR1, [0, 0, 3], 10), ...frame(TR2, [0, 0, 0], 10), ...frame(TR3, [0, 0, 0], 10), ...frame(TR4, [0, 0, 0], 10),
  ];
  const graphics3d = Graphics3D(content, OPTIONS);
  const table = { head: 'MatrixTable', header: tableHeader(st), rows: tableMatrices(st) };
  const origins = [[0, 0, 3], TR1([0, 0, 3]), TR2([0, 0, 0]), TR3([0, 0, 0]), TR4([0, 0, 0])];
  const view = { M: [M1, M2, M3, M4], origins, gripper: [TR4([6, 3, 0]), TR4([3, 3, 0]), TR4([3, -3, 0]), TR4([6, -3, 0])], framesShown: !!FT, header: table.header };
  return { view, graphics: [graphics3d, table] };
}
