// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstrations by Aaron T. Becker and Lillian Lin; Aaron T. Becker and Benedict Isichei; Aaron T. Becker and Haoran Zhao; Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/common/two-link.js — the planar two-link (revolute-revolute) arm as the Demonstrations draw and test it:
// "Forward and Inverse Kinematics for Two-Link Arm" (Aaron T. Becker and Lillian Lin), "Distance Norms in Robot
// Workspace and Phase Space" (Aaron T. Becker and Benedict Isichei), "Robot Motion with Obstacles" (Aaron T. Becker
// and Haoran Zhao) and "Breadth-First Search Robot Motion Planning" (Aaron T. Becker, Benedict Isichei and Praveen
// Reddy Padala). Owner: two-link-kinematics (COMMON-DECISIONS §3). Pure: no DOM, importable in Node.
//
// Only geometry: no arcs (demos/common/arrow-arcs.js), no colours, no Jacobian / inverse kinematics / SVD (they stay
// in the two-link-kinematics model). Each expression is written in the originals' order of operations:
//   elbow  r1{Cos[θ1], Sin[θ1]}                                         (the elbow Point and the Rotate centre)
//   tip    {r1 Cos[θ1] + r2 Cos[θ1 + θ2], r1 Sin[θ1] + r2 Sin[θ1 + θ2]}   (forward kinematics)
//   link 1 Rotate[Rectangle[{-w, -w}, {r1 + w, w}, RoundingRadius -> w], θ1, {0, 0}]
//   link 2 Rotate[Rectangle[{r1 Cos[θ1] - w, r1 Sin[θ1] - w}, {r1 Cos[θ1] + r2 + w, r1 Sin[θ1] + w},
//          RoundingRadius -> w], θ1 + θ2, {r1 Cos[θ1], r1 Sin[θ1]}]
//   labels θ1 at ρ{Cos[θ1/2], Sin[θ1/2]} (ρ = l 2/5 in TK and DN, l/2 in RM and BFS) if Abs[θ1] > π/4;
//          θ2 at {r1 Cos[θ1] + r2/2 Cos[θ1 + θ2/2], r1 Sin[θ1] + r2/2 Sin[θ1 + θ2/2]} if Abs[θ2] > π/4
//          (tolerant Greater, shared/mma.js);
//   "Robot Arm": TK and DN `If[r2 < 1, Text[…, {r1/2, 0}]]` inside link 1's Rotate and `If[r2 >= 1, Text[…,
//          {r1 Cos[θ1] + r2/2, r1 Sin[θ1]}]]` inside link 2's (robotArmLabel 'byR2'); RM and BFS always on link 2
//          (robotArmLabel 'link2'); the text turns with its link.
import { mGreater, mLess } from '../../shared/mma.js';

/** The elbow r1{Cos[θ1], Sin[θ1]}. */
export const elbowPosition = (r1, theta1) => [r1 * Math.cos(theta1), r1 * Math.sin(theta1)];

/** The tip (end effector) {r1 Cos[θ1] + r2 Cos[θ1 + θ2], r1 Sin[θ1] + r2 Sin[θ1 + θ2]}. */
export function tipPosition(r1, r2, theta1, theta2) {
  const phi = theta1 + theta2;
  return [r1 * Math.cos(theta1) + r2 * Math.cos(phi), r1 * Math.sin(theta1) + r2 * Math.sin(phi)];
}

/**
 * The two links as segments [[base, elbow], [elbow, end]] with φ2 the ABSOLUTE angle of link 2 (θ1 + θ2, or
 * a1 − a2 in the configuration-space tables of robot-motion-obstacles): the originals' collision segments
 * {{0, 0}, l{Cos[θ1], Sin[θ1]}} and {l{Cos[θ1], Sin[θ1]}, l{Cos[θ1] + Cos[φ2], Sin[θ1] + Sin[φ2]}}. With l1 = l2 = l the
 * end is l·(Cos[θ1] + Cos[φ2]) as written there; different lengths give l1 Cos[θ1] + l2 Cos[φ2].
 */
export function armSegments(theta1, phi2, l1 = 1, l2 = l1) {
  const c1 = Math.cos(theta1), s1 = Math.sin(theta1), c2 = Math.cos(phi2), s2 = Math.sin(phi2);
  const elbow = [l1 * c1, l1 * s1];
  const end = l1 === l2 ? [l1 * (c1 + c2), l1 * (s1 + s2)] : [l1 * c1 + l2 * c2, l1 * s1 + l2 * s2];
  return [[[0, 0], elbow], [elbow, end]];
}

/** Rotate[p, angle, about] for a point: about + R(angle)·(p − about). */
export function rotatePoint([x, y], angle, [ax, ay] = [0, 0]) {
  const c = Math.cos(angle), s = Math.sin(angle), dx = x - ax, dy = y - ay;
  return [ax + c * dx - s * dy, ay + s * dx + c * dy];
}

const QUARTER_PI = Math.PI / 4;
/** If[Abs[θ] > π/4, …] (tolerant Greater against N[π/4]). */
export const angleLabelVisible = (theta) => mGreater(Math.abs(theta), QUARTER_PI);

/**
 * Everything of the arm the Graphics list draws, as data (drawing order of the originals: link 1, base point,
 * θ1 label, link 2, elbow point, θ2 label; the arcs come from arrow-arcs.js):
 *   base [0, 0]; elbow; tip (= rotated end of link 2's centre line);
 *   link1, link2: {rect: [[x0, y0], [x1, y1]] (the Rectangle before Rotate), radius: w (RoundingRadius),
 *     angle, about (Rotate's angle and centre), from, to (the rotated centre line of the stadium)};
 *   theta1Label, theta2Label: {at, visible};
 *   robotArm: {link: 1 | 2, anchor (Text position before Rotate), angle, about, at (rotated position)}.
 * Options: r1, r2 (link lengths; RM/BFS r1 = r2 = l = 1), theta1, theta2 (θ2 relative to link 1), w (half-width,
 * default 1/8), theta1LabelRadius (default 2/5 = TK/DN's l 2/5; RM/BFS 1/2), robotArmLabel 'byR2' (default) | 'link2'.
 */
export function armGeometry({ r1, r2, theta1, theta2, w = 1 / 8, theta1LabelRadius = 2 / 5, robotArmLabel = 'byR2' }) {
  if (robotArmLabel !== 'byR2' && robotArmLabel !== 'link2') throw new RangeError(`armGeometry: robotArmLabel 'byR2' | 'link2', got ${robotArmLabel}`);
  const base = [0, 0];
  const elbow = elbowPosition(r1, theta1);
  const phi = theta1 + theta2;
  const link1 = { rect: [[-w, -w], [r1 + w, w]], radius: w, angle: theta1, about: base, from: base, to: rotatePoint([r1, 0], theta1, base) };
  const link2End = [elbow[0] + r2, elbow[1]];
  const link2 = {
    rect: [[elbow[0] - w, elbow[1] - w], [elbow[0] + r2 + w, elbow[1] + w]], radius: w, angle: phi, about: elbow,
    from: elbow, to: rotatePoint(link2End, phi, elbow),
  };
  const half1 = theta1 / 2, half2 = theta2 / 2;
  const theta1Label = { at: [theta1LabelRadius * Math.cos(half1), theta1LabelRadius * Math.sin(half1)], visible: angleLabelVisible(theta1) };
  const theta2Label = {
    at: [elbow[0] + (r2 / 2) * Math.cos(theta1 + half2), elbow[1] + (r2 / 2) * Math.sin(theta1 + half2)],
    visible: angleLabelVisible(theta2),
  };
  const onLink1 = robotArmLabel === 'byR2' && mLess(r2, 1); // If[r2 < 1, …] on link 1, If[r2 >= 1, …] on link 2
  const robotArm = onLink1
    ? { link: 1, anchor: [r1 / 2, 0], angle: theta1, about: base }
    : { link: 2, anchor: [elbow[0] + r2 / 2, elbow[1]], angle: phi, about: elbow };
  robotArm.at = rotatePoint(robotArm.anchor, robotArm.angle, robotArm.about);
  return { base, elbow, tip: link2.to, link1, link2, theta1Label, theta2Label, robotArm };
}
