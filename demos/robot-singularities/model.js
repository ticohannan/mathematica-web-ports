// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-singularities/model.js — one evaluation of the Manipulate body of "Robot Singularities in
// Three-Link Manipulators" (pure: no DOM, no three.js): the initialisation functions drawZArrow,
// drawCoordAxes, drawJoint, drawWristCenter as Graphics3D data, the Manipulate variables and their initial
// values, and `evaluate`, which returns the two graphics (workspace, phase space) as data.
import { mUnequal, chop } from '../../shared/mma.js';
import {
  typeOf, joints, makeO3coords, wrapParams, computeAd, computeTd, jacobianFor, phaseOpt, defaultParams, DOF,
} from './robots.js';
import { singularspace3D, singularphasespace3D } from './singular-sets.js';
import { manipEllip } from './svd3.js';
import {
  Graphics3D, Show, GeometricTransformation, Rotate, Line, Cuboid, Cylinder, Sphere, Point, PointSize, Opacity,
  Thick, Red, Blue, Green, Gray, Orange, LightBlue, LightBrown, flatten, primitiveBounds,
} from './g3d.js';

const π = Math.PI;

// ---- Initialization code ---------------------------------------------------------------------------------
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

/**
 * drawJoint[j_, d_, r_, Theta_] := Module[{jr = 1/5, ar = 1/20, pr = 1/7, vr = 1/6}, {
 *   drawCoordAxes[jr],
 *   {Gray, If["p" == j, Cuboid[{-ar,-ar,-jr-.01}, {ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01}, {0,0,Max[ar,d]+.01}}, ar]]},
 *   {LightBlue, If[j == "p", {Cuboid[{-jr,-jr,-jr}, {jr,jr,jr-.1}], Cuboid[{-jr,-jr,jr}, {jr,jr,jr+.05}]}, {Cylinder[{{0,0,-jr-.05}, {0,0,jr+.05}}, .7 jr]}]},
 *   If[r != 0, Rotate[{Gray, Cuboid[{-ar,-ar,d-ar}, {r,ar,d+ar}]}, Theta, {0,0,1}]]}]
 */
export function drawJoint(j, d, r, Theta) {
  const jr = 1 / 5, ar = 1 / 20;
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

/** drawWristCenter[r_] := Module[{jr = 1/5, ar = 1/20}, {drawCoordAxes[jr], {PointSize[.02], Orange, Point[{0,0,0}]}}] */
export const drawWristCenter = () => [drawCoordAxes(1 / 5), [PointSize(0.02), Orange, Point([0, 0, 0])]];

// ---- Manipulate variables -----------------------------------------------------------------------------------
/**
 * The state the original notebook opens with: its saved DynamicModule values
 * (tests/golden/robot-singularities.original-state.json): iType 2, params {0,0,0}, both check boxes off,
 * "Linear", and iTypeOld = 2, isJLinearVelOld = "Linear" with the singular sets of an EARLIER version of the
 * code whose phase-space PlotLabel was "phase space". Because iTypeOld == iType, the sets are not
 * recomputed until the robot or the Jacobian choice changes. ORIGINAL QUIRK (Q-RS-05).
 */
export function initialState() {
  return {
    iType: 2,
    params: [0, 0, 0],
    showRobot: false,
    showManipulability: false,
    isJLinearVel: 'Linear',
    iTypeOld: 2,
    isJLinearVelOld: 'Linear',
    singularLabel: 'phase space', // PlotLabel inside the stored singularphasespace3D (saved state)
  };
}

/**
 * Choosing another robot in the popup menu: iType changes, Type changes, and the slider grid (a Dynamic
 * depending on Type) is rebuilt, which runs params[[i]] = 0 (0.5 for a prismatic joint) for every joint.
 * ORIGINAL QUIRK (Q-RS-02). Selecting the robot that is already selected changes nothing.
 */
export function selectType(st, iType) {
  if (iType === st.iType) return { ...st, params: st.params.slice() };
  return { ...st, iType, params: defaultParams(typeOf(iType)) };
}

const GROUND = () => [LightBrown, Cylinder([[0, 0, -2 / 5], [0, 0, -1 / 5 - 1 / 20]], 2.2)];

/** The robot drawing of the workspace (If[showRobot, {...}]) for joint values params. */
export function robotGraphics(Type, params, Td) {
  const J = joints(Type);
  const out = [];
  // first joint: in the base frame (not transformed)
  out.push(J[0].jointtype === 'r' ? drawJoint(J[0].jointtype, J[0].d, J[0].a, params[0]) : drawJoint(J[0].jointtype, params[0], J[0].a, J[0].theta));
  for (let i = 1; i < DOF; i++) {
    out.push(J[i].jointtype === 'r'
      ? GeometricTransformation(drawJoint(J[i].jointtype, J[i].d, J[i].a, params[i]), Td[i - 1])
      : GeometricTransformation(drawJoint(J[i].jointtype, params[i], J[i].a, J[i].theta), Td[i - 1]));
  }
  out.push(GeometricTransformation(drawWristCenter(0), chop(Td[DOF - 1])));
  return out;
}

/**
 * One evaluation of the Manipulate body. Returns {state, view}:
 *  state: the updated Manipulate variables (params wrapped, iTypeOld/isJLinearVelOld/singularLabel updated);
 *  view: {Type, o3 (end point), workspace and phase graphics (data), the singular sets, manip (SVD + ellipsoid
 *  or null), workspaceBox (PlotRange -> All of the shown objects), phaseOpt, recomputed}.
 */
export function evaluate(stateIn) {
  const st = { ...stateIn, params: stateIn.params.slice() };
  const Type = typeOf(st.iType);
  st.params = wrapParams(st.params);
  const o3coords = makeO3coords(Type);
  let recomputed = false;
  if (st.iTypeOld !== st.iType || st.isJLinearVelOld !== st.isJLinearVel) {
    // recalculate singularities only when needed
    st.iTypeOld = st.iType;
    st.isJLinearVelOld = st.isJLinearVel;
    st.singularLabel = 'Phase Space';
    recomputed = true;
  }
  // The stored sets are those of (iTypeOld, isJLinearVelOld), with the phase-space options of their time.
  const storedOpt = phaseOpt(typeOf(st.iTypeOld), st.singularLabel);
  const singSpace = singularspace3D(st.iTypeOld, st.isJLinearVelOld, makeO3coords(typeOf(st.iTypeOld)));
  const singPhase = singularphasespace3D(st.iTypeOld, st.isJLinearVelOld, storedOpt);

  const o3 = o3coords(st.params[0], st.params[1], st.params[2]);
  const manip = st.showManipulability ? manipEllip(jacobianFor(st.iType, st.isJLinearVel, st.params), o3) : null;

  const Ad = computeAd(Type, st.params);
  const Td = computeTd(Ad);
  const base = Graphics3D([GROUND(), st.showRobot ? robotGraphics(Type, st.params, Td) : null],
    { SphericalRegion: true, ImageSize: 325, Boxed: false, PlotLabel: 'Workspace' });
  const workspace = Show([base, singSpace, ...(manip ? [manip.graphics] : [])]);
  const phase = Show(singPhase, Graphics3D([Blue, Sphere(st.params, 0.2), st.showManipulability ? [Opacity(0.5), LightBlue, Sphere(st.params, 1 / 2)] : null]));
  const workspacePrims = flatten(workspace);
  return {
    state: st,
    view: {
      Type, o3, Td, base, workspace, phase, singSpace, singPhase, manip, recomputed,
      workspacePrims,
      workspaceBox: primitiveBounds(workspacePrims),
      phaseOpt: phase.options,
    },
  };
}
