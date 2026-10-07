// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/singular-sets.js — the original's 64 hand-written ("precomputed") singularity
// graphics as data: singularspace3D (workspace) and singularphasespace3D (phase space = joint space), each
// for the 16 robots x {Linear, Angular} velocity Jacobian. Transcribed from the Manipulate body in the
// same order, with the same primitives, colours, opacities and thicknesses (g3d.js mirrors Graphics3D).
// Several workspace sets are ParametricPlot3D surfaces of o3coords (forward kinematics of the CURRENT
// robot), which is therefore passed in. Pure: no DOM.
import { arcTan } from '../../shared/mma.js';
import {
  Graphics3D, Show, ParametricPlot3D, Directive, Red, Thick, Opacity,
  Sphere, Line, Cylinder, Cuboid, Polygon, InfinitePlane,
} from './g3d.js';

const π = Math.PI;
const { cos: Cos, sin: Sin, sqrt: Sqrt, atan: ArcTan1 } = Math;
const None = 'None';
/** Table[{2/3 Cos[t], 2/3 Sin[t], z}, {t, 0, 6.5, .25}] (27 points; runs slightly past 2π) */
const ring23 = (z) => {
  const pts = [];
  for (let k = 0; k <= 26; k++) { const t = 0.25 * k; pts.push([(2 / 3) * Cos(t), (2 / 3) * Sin(t), z]); }
  return pts;
};

/**
 * singularspace3D for robot iType: If[isJLinearVel == "Linear", Piecewise[...linear...], Piecewise[...angular...]].
 * o3coords: (p1, p2, p3) => [x, y, z] of the current robot.
 */
export function singularspace3D(iType, isJLinearVel, o3coords) {
  const o3 = o3coords;
  if (isJLinearVel === 'Linear') {
    switch (iType) {
      case 1: return Show(
        ParametricPlot3D([(a) => o3(a, 0, 0), (a) => o3(a, 0, π)], [-π, π], null, { PlotStyle: [Red] }),
        ParametricPlot3D([(a, z) => [z * Cos(a), z * Sin(a), 0]], [-π, π], [0, 3], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) }));
      case 2: // elbow robot arm
      case 3: // PUMA robot arm (same graphic)
        return Graphics3D([Red, Sphere([[0, 0, 0], [0, 0, 2], [0, 0, 4]], 0.15), Thick, Opacity(0.4), Line([[0, 0, 0], [0, 0, 4]]),
          [Opacity(0.3), Sphere([0, 0, 2], 2)]]);
      case 4: return Show(
        Graphics3D([Red, Thick, Line(ring23(0)), Line(ring23(2)), Line(ring23(4))]),
        ParametricPlot3D([(a, b) => o3(a, b, 0), (a, b) => [(2 / 3) * Cos(a), (2 / 3) * Sin(a), (2 * b) / π + 2]], [-π, π], [-π, π],
          { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) }));
      case 5: return Show(
        ParametricPlot3D([(t) => [Cos(t), Sin(t), 1]], [0, 2 * π], null, { PlotStyle: Red }),
        ParametricPlot3D([(t, z) => [Cos(t), Sin(t), z]], [0, 2 * π], [0, 2], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) }));
      case 6: return Graphics3D([Red, Thick, Opacity(0.4), Line([[0, 0, 1], [0, 0, 2]])]);
      case 7: return Graphics3D([Red, Sphere([[0, 0, 1]], 0.2), Thick, Opacity(0.4), Line([[0, 0, 0], [0, 0, 1], [0, 0, 2]])]);
      case 8: return Show(
        ParametricPlot3D([(t, r) => [r * Cos(t), r * Sin(t), 0], (t, r) => [r * Cos(t), r * Sin(t), 2]], [0, 2 * π], [0, 1],
          { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) }),
        Graphics3D([Red, Sphere([[0, 0, 0], [0, 0, 2]], 0.2), [Opacity(0.3), Sphere([0, 0, 1], 1)]]));
      case 9: return Graphics3D([Red, Sphere([[0, 0, 2], [0, 0, 0]], 0.2), Thick, Opacity(0.4), Line([[0, 0, 2], [0, 0, 1 + Sqrt(2)]]),
        Line([[0, 0, 0], [0, 0, 1 - Sqrt(2)]]),
        [Opacity(0.3), Sphere([0, 0, 1], 1)]]);
      case 10: return ParametricPlot3D([(t, z) => [0.6 * Cos(t), 0.6 * Sin(t), z], (t, z) => [1.8 * Cos(t), 1.8 * Sin(t), z]], [0, 2 * π], [0.5, 1.5],
        { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) });
      case 11: return Show(
        ParametricPlot3D([(a, b) => [b * Cos(a), b * Sin(a), 0]], [-π, π], [0, Sqrt(10)], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) }),
        ParametricPlot3D([(a) => [3 * Cos(a), 3 * Sin(a), 0]], [-π, π], null, { PlotStyle: Red }));
      case 12: return ParametricPlot3D([], [-π, π], [-π, π]); // ParametricPlot3D[{ }, ...]: nothing
      case 13: return Graphics3D([Red, Opacity(0.3), Polygon([[0, 0, -1], [0, 1, -1], [0, 1, 1], [0, 0, 1]])]);
      case 14: return Graphics3D([Red, Thick, Line([[0, 0, 0], [0, 0, 3]])]);
      case 15: return Graphics3D([Red, Sphere([[0, 0, 0], [0, 0, 2]], 0.2), Line([[0, 0, 0], [0, 0, 2]]), [Opacity(0.3), Sphere([0, 0, 1], 0.2)]]);
      case 16: return Show(
        ParametricPlot3D([(a, b) => o3(a, b, π / 2), (a, b) => o3(a, b, -π / 2), (a, b) => o3(a, ArcTan1(Cos(b) / 2), b), (a, b) => o3(a, ArcTan1(Cos(b) / 2) + π, b)],
          [-π, π], [-π, π], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) }),
        ParametricPlot3D([(a) => o3(a, 0, -π / 2), (a) => o3(a, π, -π / 2)], [-π, π], null, { PlotStyle: Directive([Red, Thick]) }),
        Graphics3D([Red, Opacity(1), Sphere([[0, 0, 2], [0, 0, 0]], 0.2)]));
      default: throw new Error(`no robot type ${iType}`);
    }
  }
  // angular workspace singularities
  switch (iType) {
    case 1: return ParametricPlot3D([(a, z) => [z * Cos(a), z * Sin(a), 0]], [-π, π], [0, 3], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.5)]) });
    case 2:
    case 3: return Graphics3D([Red, [Opacity(0.4), Sphere([0, 0, 2], 2)]]);
    case 4: return ParametricPlot3D([(a, b) => o3(a, b, 0), (a, b) => [(2 / 3) * Cos(a), (2 / 3) * Sin(a), (2 * b) / π + 2]], [-π, π], [-π, π],
      { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) });
    case 5: return ParametricPlot3D([(a, b) => o3(a, b, 1), (a, b) => [Cos(a), Sin(a), b / π + 1]], [-π, π], [-π, π],
      { Mesh: None, PlotStyle: Directive([Red, Opacity(0.2)]) });
    case 6: return Graphics3D([Red, Opacity(0.6), Cylinder([[0, 0, 1], [0, 0, 2]], 1)]);
    case 7: return Graphics3D([Red, [Opacity(0.4), Sphere([0, 0, 1], 1)]]);
    case 8: return Show([
      Graphics3D([Red, [Opacity(0.3), Sphere([0, 0, 1], 1)]]),
      ParametricPlot3D([(t, r) => [r * Cos(t), r * Sin(t), 0], (t, r) => [r * Cos(t), r * Sin(t), 2]], [0, 2 * π], [0, 1],
        { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) }),
      ParametricPlot3D([(a, b) => o3(a, b, 0), (a, b) => o3(a, b, 1)], [-π, π], [-π, π], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) })]);
    case 9: return Graphics3D([Red, Opacity(0.3), Sphere([0, 0, 1], 1), Sphere([0, 0, 1], Sqrt(2))]);
    case 10: return ParametricPlot3D([
      (t, z) => [0.6 * Cos(t), 0.6 * Sin(t), z], (t, z) => [1.8 * Cos(t), 1.8 * Sin(t), z],
      (t, z) => [1.2 * z * Cos(t), 1.2 * z * Sin(t), 1.5], (t, z) => [1.2 * z * Cos(t), 1.2 * z * Sin(t), 0.5]], [0, 2 * π], [0.5, 1.5],
    { Mesh: None, PlotStyle: Directive([Red, Opacity(0.5)]) });
    case 11: return ParametricPlot3D([(a, b) => [b * Cos(a), b * Sin(a), 0]], [-π, π], [0, Sqrt(10)], { Mesh: None, PlotStyle: Directive([Red, Opacity(0.5)]) });
    case 12: return Graphics3D([Opacity(0.8), Red, Cuboid([0, 0, 0], [1, 1, 1])]);
    case 13: return Graphics3D([Opacity(0.8), Red, Polygon([[0, 0, -1], [0, 1, -1], [0, 1, 1], [0, 0, 1]])]);
    case 14: return Graphics3D([Red, Thick, Line([[0, 0, 0], [0, 0, 3]])]);
    case 15: return Graphics3D([Red, Line([[0, 0, 0], [0, 0, 2]])]);
    case 16: return ParametricPlot3D([(a, b) => [b * Cos(a), b * Sin(a), 2], (a, b) => [b * Cos(a), b * Sin(a), 0]], [-π, π], [0, 1],
      { Mesh: None, PlotStyle: Directive([Red, Opacity(0.3)]) });
    default: throw new Error(`no robot type ${iType}`);
  }
}

// the six thick lines and five planes shared by the elbow, PUMA and offset PUMA arms (Linear)
const elbowPhase = (phaseOpt) => Graphics3D([Red, Thick,
  Line([[-π, -π / 2, π], [π, -π / 2, π]]), Line([[-π, π / 2, π], [π, π / 2, π]]),
  Line([[-π, -π / 2, 0], [π, -π / 2, 0]]), Line([[-π, π / 2, 0], [π, π / 2, 0]]),
  Line([[-π, -π / 2, -π], [π, -π / 2, -π]]), Line([[-π, π / 2, -π], [π, π / 2, -π]]), Opacity(0.5),
  InfinitePlane([[1, 0, 0], [0, 1, 0], [0, 0, 0]]),
  InfinitePlane([[1, 0, π], [0, 1, π], [0, 0, π]]),
  InfinitePlane([[1, 0, -π], [0, 1, -π], [0, 0, -π]]),
  InfinitePlane([[1, 0, π], [0, π * (3 / 2), -2 * π], [0, π / 2, 0]]),
  InfinitePlane([[1, 0, -π], [0, π / 2, -2 * π], [0, -π / 2, 0]]),
], phaseOpt);
const wristPlanes = () => [
  Polygon([[-π, 0, -π], [-π, 0, π], [π, 0, π], [π, 0, -π]]),
  Polygon([[-π, π, -π], [-π, π, π], [π, π, π], [π, π, -π]]),
  Polygon([[-π, -π, -π], [-π, -π, π], [π, -π, π], [π, -π, -π]])];
const cubePi = () => Cuboid([-π, -π, -π], [π, π, π]); // Cuboid[-π{1,1,1}, π{1,1,1}]

/**
 * singularphasespace3D for robot iType (Graphics3D[..., phaseOpt] with the phase-space options passed in).
 */
export function singularphasespace3D(iType, isJLinearVel, phaseOpt) {
  if (isJLinearVel === 'Linear') {
    switch (iType) {
      case 1: return Graphics3D([Red, Thick,
        Line([[-π, 0, 0], [π, 0, 0]]), Line([[-π, -π, 0], [π, -π, 0]]), Line([[-π, π, 0], [π, π, 0]]),
        Line([[-π, 0, -π], [π, 0, -π]]), Line([[-π, -π, -π], [π, -π, -π]]), Line([[-π, π, -π], [π, π, -π]]),
        Line([[-π, 0, π], [π, 0, π]]), Line([[-π, -π, π], [π, -π, π]]), Line([[-π, π, π], [π, π, π]]),
        Opacity(0.3),
        cubePi()], phaseOpt);
      case 2: case 3: case 4: return elbowPhase(phaseOpt);
      case 5: return Graphics3D([Red, Thick, Line([[-π, π / 2, 0], [π, π / 2, 0]]), Line([[-π, -π / 2, 0], [π, -π / 2, 0]]), Opacity(0.5),
        InfinitePlane([[1, 0, 0], [1, 0, π], [0, 0, π]]),
        InfinitePlane([[1, -π, 0], [1, -π, π], [0, -π, π]]),
        InfinitePlane([[1, π, 0], [1, π, 1], [0, π, 1]]),
        InfinitePlane([[1, 0, 0], [1, 1, 0], [0, 1, 0]])], phaseOpt);
      case 6: return Graphics3D([Opacity(0.5), Red,
        InfinitePlane([[1, 0, 0], [1, 1, 0], [0, 1, 0]])], phaseOpt);
      case 7: return Graphics3D([Red, Opacity(0.5),
        InfinitePlane([[1, -π, 0], [1, -π, π], [0, -π, π]]),
        InfinitePlane([[1, π, 0], [1, π, 1], [0, π, 1]]),
        InfinitePlane([[1, 0, 0], [1, 0, 1], [0, 0, 1]]),
        Opacity(1), InfinitePlane([[1, 0, 0], [1, 1, 0], [0, 1, 0]])], phaseOpt);
      case 8: return Graphics3D([Red, Thick, Line([[-π, -π / 2, 0], [π, -π / 2, 0]]), Line([[-π, π / 2, 0], [π, π / 2, 0]]), Opacity(0.5),
        InfinitePlane([[1, -π / 2, 0], [1, -π / 2, π], [0, -π / 2, π]]),
        InfinitePlane([[1, π / 2, 0], [1, π / 2, 1], [0, π / 2, 1]]),
        InfinitePlane([[1, 0, 0], [1, 1, 0], [0, 1, 0]])], phaseOpt);
      case 9: return Show(
        Graphics3D([Red, Thick, Line([[-π, -π / 2, 0], [π, -π / 2, 0]]), Line([[-π, π / 2, 0], [π, π / 2, 0]]), Opacity(0.5), Red,
          InfinitePlane([[1, 0, 0], [1, 1, 0], [0, 1, 0]])], phaseOpt),
        // ORIGINAL QUIRK (Q-RS-07): the only surface without Mesh -> None, so it shows the default mesh lines
        ParametricPlot3D([(a, b) => [a, arcTan(-b, 1), b], (a, b) => [a, arcTan(-b, 1) - π, b]], [-π, π], [0, 1],
          { PlotStyle: Directive([Opacity(0.5), Red]) }));
      case 10: return Graphics3D([Opacity(0.5), Red, InfinitePlane([[1, 0, 0], [1, 0, π], [0, 0, π]]),
        InfinitePlane([[1, -π, 0], [1, -π, π], [0, -π, π]]),
        InfinitePlane([[1, π, 0], [1, π, 1], [0, π, 1]])], phaseOpt);
      case 11: return Graphics3D([Red, Thick, Line([[-π, 0, 0], [π, 0, 0]]), Opacity(0.3), Cuboid([-π, 0, -π], [π, 1, π])], phaseOpt);
      case 12: return Graphics3D([], phaseOpt);
      case 13: return Graphics3D([Opacity(0.3), Red, Cuboid([0, 0, 0], [1, 1, 1])], phaseOpt);
      case 14: return Graphics3D([Opacity(0.5), Red, Cuboid([0, 0, 0], [1, 1, 1])], phaseOpt);
      case 15: return Graphics3D([Red, Opacity(0.6), ...wristPlanes(), Opacity(0.3), Cuboid([-π, -π, -π], [π, π, π])], phaseOpt);
      case 16: return Show(
        Graphics3D([Red, Thick, Line([[-π, 0, π / 2], [π, 0, π / 2]]), Line([[-π, 0, -π / 2], [π, 0, -π / 2]]), Line([[-π, -π, π / 2], [π, -π, π / 2]]),
          Line([[-π, -π, -π / 2], [π, -π, -π / 2]]), Line([[-π, π, π / 2], [π, π, π / 2]]), Line([[-π, π, -π / 2], [π, π, -π / 2]])], phaseOpt),
        ParametricPlot3D([(a, b) => [a, b, π / 2], (a, b) => [a, b, -π / 2], (a, b) => [a, ArcTan1(Cos(b) / 2), b],
          (a, b) => [a, ArcTan1(Cos(b) / 2) + π, b], (a, b) => [a, ArcTan1(Cos(b) / 2) - π, b]], [-π, π], [-π, π],
        { Mesh: None, PlotStyle: Directive([Red, Opacity(0.4)]) }));
      default: throw new Error(`no robot type ${iType}`);
    }
  }
  // phase space angular velocity singularities
  switch (iType) {
    case 1: return Graphics3D([Red, Opacity(0.6), cubePi()], phaseOpt);
    case 2: case 3: case 4: return Graphics3D([Red, Opacity(0.4), cubePi()], phaseOpt);
    case 5: return Graphics3D([Red, Opacity(0.4), Cuboid([-π, -π, 0], [π, π, 1])], phaseOpt);
    case 6: return Graphics3D([Red, Opacity(0.6), Cuboid([-π, 0, 0], [π, 1, 1])], phaseOpt);
    case 7: case 8: case 9: return Graphics3D([Red, Opacity(0.4), Cuboid([-π, -π, 0], [π, π, 1])], phaseOpt);
    case 10: return Graphics3D([Red, Opacity(0.6), Cuboid([-π, -π, 0], [π, π, 1])], phaseOpt);
    case 11: return Graphics3D([Red, Opacity(0.6), Cuboid([-π, 0, -π], [π, 1, π])], phaseOpt);
    case 12: case 13: case 14: return Graphics3D([Opacity(0.8), Red, Cuboid([0, 0, 0], [1, 1, 1])], phaseOpt);
    case 15: case 16: return Graphics3D([Red, Opacity(0.4), ...wristPlanes()], phaseOpt);
    default: throw new Error(`no robot type ${iType}`);
  }
}
