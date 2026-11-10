// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Adapted from Wolfram Demonstrations Project content (see LICENSE.md)
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/support/errata-scenarios.js — one browser scenario per app with the switch "errors of the original" (used by
// tests/e2e/errata-mode.spec.js and checked by tests/unit/errata-mode.test.js).
//   state:     set through window.__demo.setState before reading (omitted: the opening state)
//   probe:     source of a function (view, state, demo) → the value read on the page
//   original:  the value with "kept" (what the original Demonstration gives)
//   corrected: the value with "corrected" — derived independently of the port's code (see each app's unit tests,
//              block "corrected mode (E-XX)", for the derivation)
//   digits:    decimal places compared for numbers (default 6)
//   reapply:   true when the body changes the scenario's own variables: the state is set again after each switch
export const SCENARIOS = {
  // E-SD-01: the opening settings; 5.2684 is the true segment distance (independent routines, unit tests)
  'segment-distance': { probe: '(v) => v.dist', original: 5.50669, corrected: 5.26840, digits: 4 },
  // E-BF-03: the goal inside an obstacle region (the state of the app's browser test "a goal inside an obstacle region …")
  'bfs-motion-planning': { state: { pConfigF: [3.315625, 1.740625] }, probe: '(v) => v.label', original: 'robot phase space, path length = ∞ rads', corrected: 'robot phase space, no path exists' },
  // E-FB-01: L3 = 2.35 is longer than L1 + L2 + L4 = 0.9 (triangle inequality, by hand)
  'four-bar-linkage': { state: { links: [0.05, 0.15], spacing: 0.75 }, probe: '(v) => v.impossibleLinks', original: false, corrected: true },
  // E-PS-02: snapshot 2's setting, 17 spheres chosen (the original draws whole levels: 20)
  'packing-spheres-into-a-thin-cylinder': { state: { R: 2.361, NumSpheres: 17 }, probe: '(v) => v.spheres', original: 20, corrected: 17 },
  // E-PM-01: noise on v only (b = √(0.02·2²) = 0.2828); sd of the samples' x = sin(1)·b/√6 = 0.097, corrected sin(1)·b = 0.238
  'probabilistic-motion': { state: { mode: 'VelocitySample', θ: 0, v: 2, ω: 1, α1: 0.02, α2: 0, α3: 0, α4: 0, α5: 0, α6: 0 }, probe: '(v) => v.samples.spread[0]', original: 0.0972, corrected: 0.2380, digits: 1 },
  // E-DP-03: the turning circles exactly 2 r_min apart; LSR is two quarter circles of radius 1 = π
  'dubins-path': { state: { goalXY: [2, 2], goalXYold: [2, 2], goalThetaloc: [4, 2], minRadius: 1 }, probe: '(v) => v.label', original: '9.11 path length, 2.83 distance', corrected: '3.14 path length, 2.83 distance' },
  // E-MP-06: scene B1 (start and goal at the height of the square obstacle's centre); 4.3615 is the reference planner's shortest path
  'motion-planning': { state: { r1: [-3, -0.5], r2: [1, -0.5], o1: [2, 2.5], o2: [-1, -0.5], o3: [-2, -2.4], o4: [2, -1], n: 4, x: 4 }, probe: '(v) => v.path.slice(1).reduce((L, q, i) => L + Math.hypot(q[0] - v.path[i][0], q[1] - v.path[i][1]), 0)', original: 4, corrected: 4.3615, digits: 3 },
  // E-CV-01: the opening settings; 1.4 = the distance of the two projected points, λ = 5 times the original's 0.3
  'camera-apparent-velocity': { probe: '() => document.querySelector(\'[data-testid="coords-image"]\').textContent.includes("1.4")', original: false, corrected: true },
  // E-WF-01: robot 2 at the right edge, robot 1 0.02 to its left; moved straight away robot 1 stays at height 0.6
  'wall-friction': { state: { s1: [0.93, 0.6], s2: [0.99, 0.6], 'ϵ': 0.05 }, probe: '(v, s) => s.s1[1]', original: 0.589153, corrected: 0.6, digits: 5, reapply: true },
  // E-RS-03: joint 1 pushed to 1.01π; 2π less is −0.99π = −3.11018 (the original subtracts 6.28: −3.10699)
  'robot-singularities': { state: { params: [3.1730085801256, 0, 0] }, probe: '(v, s) => s.params[0]', original: -3.10699, corrected: -3.11018, digits: 4, reapply: true },
  // E-TS-01: a = 0, b = −2 on the ramp x(t) = 4 − 0.8 t: y(t) = x(2) = 2.4, a constant (the original has no constant)
  'time-shifting-scaling': { state: { α: 0, β: -2 }, probe: '(v) => (v.constants ? v.constants.y : null)', original: null, corrected: 2.4 },
  // E-PR-05: start and goal inside the triangle at (3, 3), 0.08 apart (the state of the unit test): path -2 = a direct path, -1 = none
  prm: { state: { restart: false, polySides: [3], polyXY: [[3, 3]], polys: [[[3.8660254037844384, 2.5], [3, 4], [2.1339745962155616, 2.5]]], polyN: 1, qs: [3, 3], qf: [3.08, 3] }, probe: '(v, s) => s.path', original: -2, corrected: -1 },
  // E-PA-04: link 1 at the orange sphere (θ1 = 2.9), the goal 0.08 rad further: both in collision
  'prm-robot-arm': { state: { pConfig: [4.653887472872686, 0], pConfigf: [4.703887472872686, 0] }, probe: '(v) => v.path', original: -2, corrected: -1 },
  // E-P3-03: the blue sphere on the end point of the start configuration (0.25, 0.25, 0.25), the goal 0.05 away
  'prm-3d': { state: { Obstaxy: [2.8785189552120833, 0.47966463907398726], Obstaz: 1.4871167285566245, qf: [0.3, 0.25, 0.25] }, probe: '(v) => v.path', original: -2, corrected: -1 },
};
