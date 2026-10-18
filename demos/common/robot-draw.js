// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations "Robot Singularities in Three-Link Manipulators" by Aaron T. Becker and Yitong Lu and "Denavit-Hartenberg Parameters for a Three-Link Robot" by Aaron T. Becker and Mary Burbage and "Common Robot Arm Configurations" by Mohammad Sultan and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/robot-draw.js — the robot drawing functions of the DH-family Demonstrations as Graphics3D data
// (demos/common/g3d.js): drawZArrow, drawCoordAxes, the ground cylinder, drawJoint (three variants of the
// originals), drawWristCenter, drawGripper. Pure: no DOM, no three.js.
// drawZArrow, drawCoordAxes, GROUND, drawJoint 'rs' and drawWristCenter moved unchanged from
// demos/robot-singularities/model.js (v0.1.16, DH-family move; that file re-exports them). drawJoint 'dh' and
// drawGripper are the DH Demonstration's DrawJoint / DrawGripper; 'ac' is "Common Robot Arm Configurations'"
// drawJoint (a hybrid of the other two), checked element by element against that notebook's stored Initialization
// (unit test "drawJoint variant 'ac' is the source's drawJoint, element by element").
import { mUnequal } from '../../shared/mma.js';
import {
  Rotate, Line, Cuboid, Cylinder, Point, PointSize, Opacity, Thick, Red, Blue, Green, Gray, Orange, LightBlue, LightBrown,
} from './g3d.js';

const π = Math.PI;

/** drawZArrow[jr_] := Line[{{{0,0,0},{0,0,2jr}}, {{0,0,2jr},{1/32,0,3/2jr}}, ... 4 head strokes}] */
export const drawZArrow = (jr) => [
  Line([[0, 0, 0], [0, 0, 2 * jr]]),
  Line([[0, 0, 2 * jr], [1 / 32, 0, (3 / 2) * jr]]),
  Line([[0, 0, 2 * jr], [-1 / 32, 0, (3 / 2) * jr]]),
  Line([[0, 0, 2 * jr], [0, 1 / 32, (3 / 2) * jr]]),
  Line([[0, 0, 2 * jr], [0, -1 / 32, (3 / 2) * jr]]),
];

/** drawCoordAxes[jr_] := {Thick, {Red, drawZArrow[jr]}, {Blue, Rotate[drawZArrow[jr], π/2, {0,1,0}]}, {Green, Rotate[drawZArrow[jr], -π/2, {1,0,0}]}} */
export const drawCoordAxes = (jr) => [Thick,
  [Red, drawZArrow(jr)],
  [Blue, Rotate(drawZArrow(jr), π / 2, [0, 1, 0])],
  [Green, Rotate(drawZArrow(jr), -π / 2, [1, 0, 0])]];

/** The ground {LightBrown, Cylinder[{{0,0,-2/5},{0,0,-1/5-1/20}}, 2.2]} (a function: a fresh list per graphic) */
export const GROUND = () => [LightBrown, Cylinder([[0, 0, -2 / 5], [0, 0, -1 / 5 - 1 / 20]], 2.2)];

const PRISMATIC_AC = new Set(['Prismatic', 'prismatic', 'P', 'p']);

/**
 * drawJoint[j, d, r, Theta] (jr = 1/5, ar = 1/20) in one of three variants (opts.variant, default 'rs'):
 *
 * 'rs' — robot-singularities (and Robot Manipulator Workspaces):
 *   {drawCoordAxes[jr],
 *    {Gray, If["p" == j, Cuboid[{-ar,-ar,-jr-.01}, {ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01}, {0,0,Max[ar,d]+.01}}, ar]]},
 *    {LightBlue, If[j == "p", {Cuboid[{-jr,-jr,-jr}, {jr,jr,jr-.1}], Cuboid[{-jr,-jr,jr}, {jr,jr,jr+.05}]}, {Cylinder[{{0,0,-jr-.05}, {0,0,jr+.05}}, .7 jr]}]},
 *    If[r != 0, Rotate[{Gray, Cuboid[{-ar,-ar,d-ar}, {r,ar,d+ar}]}, Theta, {0,0,1}]]}
 *
 * 'dh' — Denavit-Hartenberg Parameters for a Three-Link Robot (DrawJoint):
 *   {DrawCoordAxes[jr], Opacity[1],
 *    {Opacity[0.5], Gray, If[j == "Prismatic", Cuboid[{-ar,-ar,-1+d-jr-.01}, {ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01}, {0,0,Max[ar,d]+.01}}, ar]]},
 *    {LightBlue, If[j == "Prismatic", Cuboid[{-jr,-jr,-jr}, {jr,jr,+jr}], {Cylinder[{{0,0,-jr}, {0,0,+jr}}, jr]}]},
 *    Rotate[{Opacity[0.5], Gray, Cuboid[{-ar,-ar,d-ar}, {r,ar,d+ar}]}, Theta, {0,0,1}]}
 *
 * 'ac' — Common Robot Arm Configurations (its draft F-AC-13): as 'dh' for the axis (test
 *   MemberQ[{"Prismatic","prismatic","P","p"}, j]) and the always-drawn translucent link, the joint body of 'rs'
 *   (test j == "p").
 *
 * 'dh' and 'ac' evaluate the prismatic axis' `-1+d-jr-.01` in COMMON-DECISIONS §7 order (`axisBottomZ`; pass
 * `dExact: [p, q]` when d is the exact p/q); 'rs' has no such sum and is unchanged.
 */
/**
 * The axis cuboid's lower z `-1 + d - jr - .01` of the 'dh' and 'ac' variants (jr = 1/5) in COMMON-DECISIONS §7 order:
 * Mathematica adds the machine terms first, in written order, then the exact terms (here -1 - 1/5 = -6/5, one exact
 * number): (d + -0.01) + N[-6/5] for a machine d. For an exact d = p/q (`dExact: [p, q]`, integers) the exact terms
 * combine first, -1 + p/q - 1/5 = (5p - 6q)/(5q), and the machine -0.01 is added to its double. Lead K-DH-06 / K-AC-10.
 */
export function axisBottomZ(d, dExact = null) {
  if (dExact) {
    const [p, q] = dExact;
    return -0.01 + (5 * p - 6 * q) / (5 * q);
  }
  return (d + -0.01) + -6 / 5;
}

export function drawJoint(j, d, r, Theta, { variant = 'rs', dExact = null } = {}) {
  const jr = 1 / 5, ar = 1 / 20;
  if (variant === 'rs') {
    return [
      drawCoordAxes(jr),
      [Gray, j === 'p'
        ? Cuboid([-ar, -ar, -jr - 0.01], [ar, ar, d + 0.01])
        : Cylinder([[0, 0, Math.min(-ar, d - jr) - 0.01], [0, 0, Math.max(ar, d) + 0.01]], ar)],
      [LightBlue, j === 'p'
        ? [Cuboid([-jr, -jr, -jr], [jr, jr, jr - 0.1]), Cuboid([-jr, -jr, jr], [jr, jr, jr + 0.05])]
        : [Cylinder([[0, 0, -jr - 0.05], [0, 0, jr + 0.05]], 0.7 * jr)]],
      mUnequal(r, 0) ? Rotate([Gray, Cuboid([-ar, -ar, d - ar], [r, ar, d + ar])], Theta, [0, 0, 1]) : null,
    ];
  }
  if (variant !== 'dh' && variant !== 'ac') throw new Error(`drawJoint: unknown variant ${variant}`);
  const axisPrismatic = variant === 'dh' ? j === 'Prismatic' : PRISMATIC_AC.has(j);
  const axis = [Opacity(0.5), Gray, axisPrismatic
    ? Cuboid([-ar, -ar, axisBottomZ(d, dExact)], [ar, ar, d + 0.01]) // -1 + d - jr - .01 (§7 order)
    : Cylinder([[0, 0, Math.min(-ar, d - jr) - 0.01], [0, 0, Math.max(ar, d) + 0.01]], ar)];
  const body = variant === 'dh'
    ? [LightBlue, j === 'Prismatic' ? Cuboid([-jr, -jr, -jr], [jr, jr, +jr]) : [Cylinder([[0, 0, -jr], [0, 0, +jr]], jr)]]
    : [LightBlue, j === 'p'
      ? [Cuboid([-jr, -jr, -jr], [jr, jr, jr - 0.1]), Cuboid([-jr, -jr, jr], [jr, jr, jr + 0.05])]
      : [Cylinder([[0, 0, -jr - 0.05], [0, 0, jr + 0.05]], 0.7 * jr)]];
  return [
    drawCoordAxes(jr),
    Opacity(1),
    axis,
    body,
    Rotate([Opacity(0.5), Gray, Cuboid([-ar, -ar, d - ar], [r, ar, d + ar])], Theta, [0, 0, 1]),
  ];
}

/** drawWristCenter[r_] := Module[{jr = 1/5, ar = 1/20}, {drawCoordAxes[jr], {PointSize[.02], Orange, Point[{0,0,0}]}}] */
export const drawWristCenter = () => [drawCoordAxes(1 / 5), [PointSize(0.02), Orange, Point([0, 0, 0])]];

/**
 * DrawGripper[g_, r_] := Module[{jr = 1/5, ar = 1/20}, {DrawCoordAxes[jr],
 *   If[r != 0,
 *     {Gray, Cuboid[{-2ar,-ar,-4ar},{0,ar,4ar}], Cuboid[{0ar,-ar,g 2ar},{4ar,ar,2(1+g)ar}], Cuboid[{0ar,-ar,-g 2ar},{4ar,ar,-2(1+g)ar}]},
 *     (*looks better if hand points along d*)
 *     {Gray, Cuboid[{-4ar,-ar,-2ar},{4ar,ar,0}], Cuboid[{g 2ar,-ar,0ar},{2(1+g)ar,ar,4ar}], Cuboid[{-g 2ar,-ar,0ar},{-2(1+g)ar,ar,4ar}]}]}]
 * (identical in the DH and the Arm Configurations Demonstrations; `r != 0` is Mathematica's tolerant Unequal;
 * the mirrored fingers list the larger corner first; the data keep them as written and g3d's `cuboidCorners`
 * normalises them where they are drawn, N-DH-06)
 */
export function drawGripper(g, r) {
  const jr = 1 / 5, ar = 1 / 20;
  const tenth = 2 * ar; // Mathematica: g 2 ar = Times[g, 2, 1/20] → (1/10) g, then N[1/10] g; 2(1+g)ar → (1/10)(1 + g)
  return [
    drawCoordAxes(jr),
    mUnequal(r, 0)
      ? [Gray, Cuboid([-2 * ar, -ar, -4 * ar], [0, ar, 4 * ar]),
        Cuboid([0, -ar, tenth * g], [4 * ar, ar, tenth * (1 + g)]),
        Cuboid([0, -ar, -tenth * g], [4 * ar, ar, -tenth * (1 + g)])]
      : [Gray,
        Cuboid([-4 * ar, -ar, -2 * ar], [4 * ar, ar, 0]),
        Cuboid([tenth * g, -ar, 0], [tenth * (1 + g), ar, 4 * ar]),
        Cuboid([-tenth * g, -ar, 0], [-tenth * (1 + g), ar, 4 * ar])],
  ];
}
