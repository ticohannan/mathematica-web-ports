// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/harness/apps.mjs — which original notebook belongs to which app (Mathematica harness, HARNESS-WL §7).
//
// `notebook` is the FILE NAME only: the owner keeps the pristine downloads in the git-ignored folders
// _internal/originals/ and _internal/originals/batch-ab/ (tools/run-harness.mjs searches both). `sha256` is the
// hash of the download the scenario files were written against (a different download gives a warning, not an
// error). `start` is the scenario file's default start state when the TESTPLAN does not say (COMMON-DECISIONS §6).
// Apps without a TESTPLAN (the published ones) are listed so that --smoke and --self-check can read their notebooks.

export const HARNESS_APPS = [
  // ---- batch A/B (TESTPLAN harness scenarios, tests/harness/<dir>.scenarios.json)
  { dir: 'minkowski-sum', prefix: 'MS', notebook: 'Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb', sha256: '27c1d60a273ea7420f449d39961ff4380342b43c7d6855dfe620b0803b2a5185' },
  { dir: 'four-bar-linkage', prefix: 'FB', notebook: 'Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb', sha256: 'cc11b2422e9416afd5d3b9e3b8e398e3943a6c01d33f94d615970624ac20b5bc' },
  { dir: 'dubins-path', prefix: 'DP', notebook: 'Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb', sha256: '24d74ee13de24a269ef063d3c528a6fa21080e1461e2d088a59830e0400a260a' },
  { dir: 'dubins-isochrons', prefix: 'DI', notebook: 'Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb', sha256: '48c6db5c4d052f6a167ef8e792fc20af36adff8f3ae030f83f4d8b52cc516034' },
  { dir: 'two-link-kinematics', prefix: 'TK', notebook: 'Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb', sha256: 'f0979536afbe62b970027c49f3f34cd48583fc73c96dccd0f933de13270612ec' },
  { dir: 'distance-norms', prefix: 'DN', notebook: 'Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb', sha256: '712f8d74a61dba9ad5e80a6592b80eca72078668332c81098d9f923f20786355' },
  { dir: 'robot-motion-obstacles', prefix: 'RM', notebook: 'Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb', sha256: '4108a30e4e80ed067552b459f3a6cebac4db34a66fe76dc1b238f26e0f8c64c4' },
  { dir: 'bfs-motion-planning', prefix: 'BF', notebook: 'Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb', sha256: '6bbecc3b93eeb819270707a1f14f1832acc53329b98c6441d8cf4df7e5b69914' },
  { dir: 'rrt', prefix: 'RT', notebook: 'Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb', sha256: '50200ee5b7b55850261067a405070a6495c6f5b9fd90ba562f3378d1433558e0' },
  { dir: 'camera-lasers', prefix: 'CL', notebook: 'Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb', sha256: '7c122719202ab9f5226b81dda62d612597b0b7e5422985434c229ce061d5892a' },
  { dir: 'manipulability-ellipsoid', prefix: 'ME', notebook: 'Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb', sha256: 'fab444f502b7c33f7f52ccbf6218b7b47014d3074e92cad44ab5eddac96af7e9' },
  { dir: 'dh-parameters', prefix: 'DH', notebook: 'Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb', sha256: 'a376af88b3647f65acd891279ccd9ccda7f85407c5142041a3b06dbfa7dab634' },
  { dir: 'arm-configurations', prefix: 'AC', notebook: 'Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb', sha256: '804b638abd765253346ea7606b61c814a63d9e470b21c92ef8c0696802c97513' },
  { dir: 'manipulator-workspaces', prefix: 'MW', notebook: 'Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb', sha256: '7256f5be8993ff3537374ae75583c8edd326af0b29d563153bdd262103abf1d3' },
  { dir: 'torus-chart', prefix: 'TC', notebook: 'Demonstration-Chart-for-a-Torus-1-0-0-definition.nb', sha256: '290bc414db9f64a3076c45ece391b77d3f2b3ab77995fea725c4ab2e6bee1c08' },
  { dir: 'prm-3d', prefix: 'P3', notebook: 'Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb', sha256: 'a1a74696b2b529957c3c7da36b6187e9d24d3c6b0b67a55a16f83971b25b48c5' },
  // ---- motion planning: parity set for HW-72 (scenarios generated from tests/golden/motion-planning.original-states.json)
  { dir: 'motion-planning', prefix: 'MP', notebook: 'MotionPlanningForRobotPathAroundObstacles-author.nb', sha256: null, parity: true },
  // ---- published apps without harness scenarios yet (smoke / self-check only)
  { dir: 'art-gallery', prefix: 'AG', notebook: 'Demonstration-Art-Gallery-Problem-1-0-0-definition.nb', sha256: 'f44f5bebc494e1dad881cc8fccfb7967e89e8220c92cda542fb660344a4c9b0e', structureOnly: true },
  { dir: 'prm', prefix: 'PR', notebook: 'Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb', sha256: '3ec55d67573e789e8929d5919d512530b6e7d05dc0abd7a2861df48433d24dfa', structureOnly: true },
  { dir: 'prm-robot-arm', prefix: 'PA', notebook: 'Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb', sha256: '781b59ae06825da87dff7960e9a8e6fe844390881e1b51b7ceec86515a65241e', structureOnly: true },
  { dir: 'prm-seven-link', prefix: 'SL', notebook: 'Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb', sha256: '189c5e306b6523b68ffe0b3186a8eafb87cd52e3f05fb268adcfb986a61212c4', structureOnly: true },
  { dir: 'robot-singularities', prefix: 'RS', notebook: 'Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb', sha256: '5df3c7e9ecef2d3d5d7757ae302196fea426dcd24ea4aec71e3a8e2c82163c9f', structureOnly: true },
  { dir: 'car-paths', prefix: 'CP', notebook: 'Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb', sha256: '5b2234a1d1a860929395a253886e2b25778581a0f1c9e6412180cb65c6e9ce98', structureOnly: true },
  { dir: 'unit-balls', prefix: 'UB', notebook: 'Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb', sha256: '1bc6925b38eabb28c93f44ba4c0676eb0e437d5c8844024799950a0b9de32b80', structureOnly: true },
];

export const appByDir = (dir) => HARNESS_APPS.find((a) => a.dir === dir);
export const appByPrefix = (p) => HARNESS_APPS.find((a) => a.prefix === p);
/** Folders (relative to the repository) searched for a notebook file name, in order. */
export const ORIGINALS_DIRS = ['_internal/originals', '_internal/originals/batch-ab'];
