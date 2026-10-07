// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/e2e/apps.js — every app of the site (used by site.spec.js and the design-doc test).
// spec: its browser-test file; notice: the page has the start-up notice / WebGL 2 notice of DEC-22 (the seven apps added
// in v0.1.12 have it; the first three do not yet); webgl: the page needs WebGL 2.
export const APPS = [
  { dir: 'motion-planning', prefix: 'MP', spec: 'motion-planning.spec.js', url: '/demos/motion-planning/', slug: 'MotionPlanningForRobotPathAroundObstacles', title: 'Motion Planning for Robot Path around Obstacles', authors: ['Shreyas Poyrekar', 'Aaron T. Becker', 'Arifa Sultana'], webgl: false, notice: false },
  { dir: 'three-parametrizations', prefix: 'TP', spec: 'three-parametrizations.spec.js', url: '/demos/three-parametrizations/', slug: 'ThreeParametrizationsOfRotations', title: 'Three Parametrizations of Rotations', authors: ['Aaron T. Becker', 'Benedict Isichei'], webgl: true, notice: false },
  { dir: 'euler-angles', prefix: 'EA', spec: 'euler.spec.js', url: '/demos/euler-angles/', slug: 'EulerAnglesPrecessionNutationAndSpin', title: 'Euler Angles: Precession, Nutation, and Spin', authors: ['Kevin Hernandez', 'Sándor Kabai'], webgl: true, notice: false },
  { dir: 'prm-seven-link', prefix: 'SL', spec: 'prm-seven-link.spec.js', url: '/demos/prm-seven-link/', slug: 'ProbabilisticRoadmapMethodWithSevenLinkArticulatedRobot', title: 'Probabilistic Roadmap Method with Seven-Link Articulated Robot', authors: ['Aaron T. Becker', 'Yitong Lu'], webgl: false, notice: true },
  { dir: 'car-paths', prefix: 'CP', spec: 'car-paths.spec.js', url: '/demos/car-paths/', slug: 'ShortestPathForForwardAndReverseMotionOfACar', title: 'Shortest Path for Forward and Reverse Motion of a Car', authors: ['Francesco Bernardini', 'Aaron T. Becker'], webgl: false, notice: true },
  { dir: 'unit-balls', prefix: 'UB', spec: 'unit-balls.spec.js', url: '/demos/unit-balls/', slug: 'UnitBallsForDifferentPNormsIn2DAnd3D', title: 'Unit Balls for Different p-Norms in 2D and 3D', authors: ['Aaron T. Becker', 'Ravi Patel'], webgl: true, notice: true },
  { dir: 'art-gallery', prefix: 'AG', spec: 'art-gallery.spec.js', url: '/demos/art-gallery/', slug: 'ArtGalleryProblem', title: 'Art Gallery Problem', authors: ['Shreyas Poyrekar', 'Arifa Sultana', 'Aaron T. Becker'], webgl: false, notice: true },
  { dir: 'prm', prefix: 'PR', spec: 'prm.spec.js', url: '/demos/prm/', slug: 'ProbabilisticRoadmapMethod', title: 'Probabilistic Roadmap Method', authors: ['Aaron T. Becker', 'Yitong Lu'], webgl: false, notice: true },
  { dir: 'prm-robot-arm', prefix: 'PA', spec: 'prm-robot-arm.spec.js', url: '/demos/prm-robot-arm/', slug: 'ProbabilisticRoadmapMethodForRobotArm', title: 'Probabilistic Roadmap Method for Robot Arm', authors: ['Aaron T. Becker', 'Yitong Lu'], webgl: true, notice: true },
  { dir: 'robot-singularities', prefix: 'RS', spec: 'robot-singularities.spec.js', url: '/demos/robot-singularities/', slug: 'RobotSingularitiesInThreeLinkManipulators', title: 'Robot Singularities in Three-Link Manipulators', authors: ['Aaron T. Becker', 'Yitong Lu'], webgl: true, notice: true },
];
