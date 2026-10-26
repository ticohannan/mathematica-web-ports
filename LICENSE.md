# Licence, attribution and credits

## Summary

The thirty-two web applications in `demos/` are **adaptations** (JavaScript / SVG / WebGL translations)
of Wolfram Demonstrations Project content, which is licensed under the
**Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported licence (CC BY-NC-SA 3.0)**,
<https://creativecommons.org/licenses/by-nc-sa/3.0/>
(Wolfram's terms: <https://wolfram.com/legal/terms/wolfram-demonstrations-project.html>).

As required by that licence's ShareAlike term, **the adapted demonstrations, and everything derived
from the original notebooks, are released under CC BY-NC-SA 3.0**. You may share and adapt them for
**non-commercial** purposes, provided you credit the original authors and this adaptation, indicate
any changes, and release adaptations under the same licence. Because of the NonCommercial term these
parts are *source-available*, not "open source" in the OSI sense.

**Separable tooling and generic helpers that are not derived from the Demonstrations are released
under the MIT licence** (see the table below). Third-party components keep their own licences.

Author of the adaptation and of the MIT-licensed tooling: **Tico Hannan**, © 2026
(<https://github.com/ticohannan/mathematica-web-ports>). The code was produced with an AI
code-generation tool (Claude, by Anthropic) used by the author; the tool is not an author.

Licence texts: [`LICENSES/CC-BY-NC-SA-3.0.txt`](LICENSES/CC-BY-NC-SA-3.0.txt) and
[`LICENSES/MIT.txt`](LICENSES/MIT.txt) (from the SPDX licence list), and
[`docs/third-party/reeds-shepp-curves-LICENSE.txt`](docs/third-party/reeds-shepp-curves-LICENSE.txt) (upstream notice, see below). Each source file carries an
`SPDX-License-Identifier` header; [`REUSE.toml`](REUSE.toml) covers files that cannot (JSON, Markdown).

## Which licence applies to which file

| Path | Licence | Why |
|------|---------|-----|
| `demos/**` (all thirty-two apps, incl. `teapot-data.js` and `demos/common/`) | CC BY-NC-SA 3.0 | adaptations of the Demonstrations |
| `demos/common/two-link.js`, `demos/common/arrow-arcs.js`, `demos/common/dial-control.js` (common to the batch A apps; owner two-link-kinematics) | CC BY-NC-SA 3.0 | derived from the Initialization and Manipulate code of "Forward and Inverse Kinematics for Two-Link Arm", "Distance Norms in Robot Workspace and Phase Space", "Robot Motion with Obstacles", "Breadth-First Search Robot Motion Planning", "Configuration Space for Four-Bar Linkage", "Measuring Distance and Orientation Using Camera and Lasers", "Manipulability Ellipsoid of a Robot Arm" and "Chart for a Torus" (authors in each file's header) |
| `tests/unit/two-link.test.js`, `tests/unit/arrow-arcs.test.js`, `tests/unit/dial-control.test.js`, `tests/e2e/dial-control.spec.js`, `tests/e2e/fixtures/dial-control.html` | CC BY-NC-SA 3.0 | test the three common modules above against the originals' definitions |
| `demos/two-link-kinematics/**`, `tests/unit/two-link-kinematics.test.js`, `tests/golden/two-link-kinematics.golden.test.js`, `tests/golden/two-link-kinematics.original-states.json`, `tests/e2e/two-link-kinematics.spec.js`, `docs/original-source/two-link-kinematics.txt`, `docs/original-snapshots/two-link-kinematics-*.png`, `docs/checklists/two-link-kinematics.md` | CC BY-NC-SA 3.0 | the port of "Forward and Inverse Kinematics for Two-Link Arm" (Aaron T. Becker and Lillian Lin), its tests, the states and pictures extracted from its notebook and its manual checks |
| `demos/common/arm-grid.js`, `demos/common/arm-view.js` (common to robot-motion-obstacles and bfs-motion-planning; owner robot-motion-obstacles) | CC BY-NC-SA 3.0 | derived from the Initialization and Manipulate code of "Robot Motion with Obstacles" and "Breadth-First Search Robot Motion Planning" (arm-view.js also draws the `loc` icon of "Probabilistic Roadmap Method for Robot Arm"; authors in each file's header) |
| `tests/unit/arm-grid.test.js` | CC BY-NC-SA 3.0 | tests the two common modules above against the originals' code |
| `demos/robot-motion-obstacles/**`, `tests/unit/robot-motion-obstacles.test.js`, `tests/golden/robot-motion-obstacles.*`, `tests/e2e/robot-motion-obstacles.spec.js`, `docs/checklists/robot-motion-obstacles.md`, `docs/original-source/robot-motion-obstacles.txt`, `docs/original-snapshots/robot-motion-obstacles-*.png` | CC BY-NC-SA 3.0 | the port of "Robot Motion with Obstacles", its tests and the states and pictures taken from its original |
| `demos/bfs-motion-planning/**`, `tests/unit/bfs-motion-planning.test.js`, `tests/golden/bfs-motion-planning.*`, `tests/e2e/bfs-motion-planning.spec.js`, `docs/checklists/bfs-motion-planning.md`, `docs/original-source/bfs-motion-planning.txt`, `docs/original-snapshots/bfs-motion-planning-*.png` | CC BY-NC-SA 3.0 | the port of "Breadth-First Search Robot Motion Planning", its tests and the states and pictures taken from its original |
| `tests/support/png.js` (PNG reader of the golden-snapshot tests) | CC BY-NC-SA 3.0 | reads the snapshot pictures stored in the original notebooks for the golden tests |
| `demos/common/car-icon.js` (common car icon; owner dubins-path) | CC BY-NC-SA 3.0 | derived from the `drawCar` definitions of "Shortest Path for Forward and Reverse Motion of a Car" (Francesco Bernardini and Aaron T. Becker), "Shortest Path for the Dubins Car" and "Isochrons for a Dubins Car" (both Aaron T. Becker and Shiva Shahrokhi) |
| `tests/unit/car-icon.test.js` | CC BY-NC-SA 3.0 | tests the common car icon against the originals' definitions |
| `demos/dubins-path/**`, `tests/unit/dubins-path.test.js`, `tests/golden/dubins-path.*`, `tests/e2e/dubins-path.spec.js`, `docs/checklists/dubins-path.md`, `docs/original-source/dubins-path.txt`, `docs/original-snapshots/dubins-path-*.png` | CC BY-NC-SA 3.0 | the port of "Shortest Path for the Dubins Car", its tests and the states and pictures taken from its original |
| `demos/dubins-isochrons/**`, `tests/unit/dubins-isochrons.test.js`, `tests/golden/dubins-isochrons.*`, `tests/e2e/dubins-isochrons.spec.js`, `docs/checklists/dubins-isochrons.md`, `docs/original-source/dubins-isochrons.txt`, `docs/original-snapshots/dubins-isochrons-*.png` | CC BY-NC-SA 3.0 | the port of "Isochrons for a Dubins Car", its tests and the states and pictures taken from its original |
| `demos/common/segments.js` (common segment geometry; owner rrt) and its test `tests/unit/segments.test.js` | CC BY-NC-SA 3.0 | derived from the Initialization code of "Rapidly Exploring Random Tree (RRT) and RRT*", "Measuring Distance and Orientation Using Camera and Lasers" and "Probabilistic Roadmap Method with Seven-Link Articulated Robot" (authors in the file's header) |
| `demos/rrt/**`, `tests/unit/rrt.test.js`, `tests/golden/rrt.golden.test.js`, `tests/golden/rrt.original-states.json`, `tests/e2e/rrt.spec.js`, `docs/checklists/rrt.md`, `docs/original-source/rrt.txt`, `docs/original-snapshots/rrt-*.png` | CC BY-NC-SA 3.0 | the RRT port, its tests and data derived from "Rapidly Exploring Random Tree (RRT) and RRT*" |
| `demos/camera-lasers/**`, `tests/unit/camera-lasers.test.js`, `tests/golden/camera-lasers.golden.test.js`, `tests/golden/camera-lasers.original-states.json`, `tests/e2e/camera-lasers.spec.js`, `docs/checklists/camera-lasers.md`, `docs/original-source/camera-lasers.txt`, `docs/original-snapshots/camera-lasers-*.png` | CC BY-NC-SA 3.0 | the camera-lasers port, its tests and data derived from "Measuring Distance and Orientation Using Camera and Lasers" |
| `demos/common/polygon-core.js` (common polygon helpers; owner minkowski-sum) | CC BY-NC-SA 3.0 | derived from the Initialization code of "Motion Planning for Robot Path around Obstacles", "Art Gallery Problem" and "Minkowski Sum of Convex Robot and Obstacle" (authors in the file's header); moved there from `demos/motion-planning/planner.js` and `demos/art-gallery/visibility.js` |
| `demos/minkowski-sum/**`, `tests/unit/minkowski-sum.test.js`, `tests/unit/polygon-core.test.js`, `tests/golden/minkowski-sum.*`, `tests/e2e/minkowski-sum.spec.js`, `docs/checklists/minkowski-sum.md`, `docs/original-source/minkowski-sum.txt`, `docs/original-snapshots/minkowski-sum-*.png` | CC BY-NC-SA 3.0 | the Minkowski-sum port, its tests and the data and pictures taken from its original |
| `demos/four-bar-linkage/**` (incl. `recorded-samples.json`, the original's stored Plot samples), `tests/unit/four-bar-linkage.test.js`, `tests/golden/four-bar-linkage.*`, `tests/e2e/four-bar-linkage.spec.js`, `docs/checklists/four-bar-linkage.md`, `docs/original-source/four-bar-linkage.txt`, `docs/original-snapshots/four-bar-linkage-*.png` | CC BY-NC-SA 3.0 | the four-bar port, its tests and the data and pictures taken from its original |
| `demos/common/svd3.js` (`manipEllip`; it re-exports the generic SVD of `shared/svd3.js`), `demos/common/dh-chain.js` (the DH chain; it re-exports the generic 4×4 products of `shared/graphics3d.js`), `demos/common/robot-draw.js` (the DH family, moved from robot-singularities in v0.1.16; owner dh-parameters; the generic Graphics3D model and renderer moved on to MIT `shared/` in v0.1.21), `tests/unit/fixtures/robot-singularities.pre-move.json` | CC BY-NC-SA 3.0 | derived from the Initialization and Manipulate code of "Robot Singularities in Three-Link Manipulators", "Denavit-Hartenberg Parameters for a Three-Link Robot" and (the `drawJoint` variant `ac` in `robot-draw.js`) "Common Robot Arm Configurations" (authors in each file's header); the fixture holds robot-singularities' values recorded before the move |
| `demos/dh-parameters/**`, `tests/unit/dh-parameters.test.js`, `tests/golden/dh-parameters.golden.test.js`, `tests/golden/dh-parameters.original-states.json`, `tests/e2e/dh-parameters.spec.js`, `docs/original-source/dh-parameters.txt`, `docs/original-snapshots/dh-parameters-*.png`, `docs/checklists/dh-parameters.md` (batch B) | CC BY-NC-SA 3.0 | the port of "Denavit-Hartenberg Parameters for a Three-Link Robot" (Aaron T. Becker and Mary Burbage), its tests, the states and pictures extracted from its notebook and its manual checks |
| `demos/torus-chart/**`, `tests/unit/torus-chart.test.js`, `tests/golden/torus-chart.golden.test.js`, `tests/golden/torus-chart.original-states.json`, `tests/e2e/torus-chart.spec.js`, `docs/checklists/torus-chart.md`, `docs/original-source/torus-chart.txt`, `docs/original-snapshots/torus-chart-*.png` | CC BY-NC-SA 3.0 | the port of "Chart for a Torus" (Aaron T. Becker and Haoran Zhao), its tests and the states and pictures taken from its original |
| `demos/manipulability-ellipsoid/**`, `tests/unit/manipulability-ellipsoid.test.js`, `tests/golden/manipulability-ellipsoid.golden.test.js`, `tests/golden/manipulability-ellipsoid.original-states.json`, `tests/e2e/manipulability-ellipsoid.spec.js`, `docs/checklists/manipulability-ellipsoid.md`, `docs/original-source/manipulability-ellipsoid.txt`, `docs/original-snapshots/manipulability-ellipsoid-*.png` | CC BY-NC-SA 3.0 | the port of "Manipulability Ellipsoid of a Robot Arm" (Aaron T. Becker and Mary Burbage), its tests and the states and pictures taken from its original |
| `demos/arm-configurations/**`, `tests/unit/arm-configurations.test.js`, `tests/golden/arm-configurations.golden.test.js`, `tests/golden/arm-configurations.original-states.json`, `tests/e2e/arm-configurations.spec.js`, `docs/checklists/arm-configurations.md`, `docs/original-source/arm-configurations.txt`, `docs/original-snapshots/arm-configurations-*.png` (batch B) | CC BY-NC-SA 3.0 | the port of "Common Robot Arm Configurations" (Mohammad Sultan and Aaron T. Becker), its tests, the states and pictures extracted from its notebook and its manual checks |
| `demos/manipulator-workspaces/**`, `tests/unit/manipulator-workspaces.test.js`, `tests/golden/manipulator-workspaces.golden.test.js`, `tests/golden/manipulator-workspaces.original-states.json`, `tests/e2e/manipulator-workspaces.spec.js`, `docs/checklists/manipulator-workspaces.md`, `docs/original-source/manipulator-workspaces.txt`, `docs/original-snapshots/manipulator-workspaces-*.png` (batch B) | CC BY-NC-SA 3.0 | the port of "Robot Manipulator Workspaces" (Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati), its tests, the states and pictures extracted from its notebook and its manual checks |
| `demos/prm-3d/**`, `tests/unit/prm-3d.test.js`, `tests/golden/prm-3d.golden.test.js`, `tests/golden/prm-3d.original-states.json`, `tests/e2e/prm-3d.spec.js`, `docs/checklists/prm-3d.md`, `docs/original-source/prm-3d.txt`, `docs/original-snapshots/prm-3d-*.png`; `demos/common/prm-core.js` (common to the three PRM ports, generalised to n dimensions in v0.1.16; owner prm-3d) | CC BY-NC-SA 3.0 | the port of "Probabilistic Roadmap Method in 3D" (Aaron T. Becker and Yitong Lu), its tests and the states and pictures taken from its original; prm-core.js is derived from the identical Initialization code of "Probabilistic Roadmap Method", "Probabilistic Roadmap Method for Robot Arm" and "Probabilistic Roadmap Method in 3D" (all by Aaron T. Becker and Yitong Lu) |
| `demos/graham-scan/**`, `tests/unit/graham-scan.test.js`, `tests/e2e/graham-scan.spec.js`, `tests/golden/graham-scan.original-states.json`, `docs/checklists/graham-scan.md`, `docs/original-source/graham-scan.txt`, `docs/original-snapshots/graham-scan-*.png` | CC BY-NC-SA 3.0 | the port of "Graham Scan to Find the Convex Hull of a Set of Points in 2D" (Aaron T. Becker, Yitong Lu and Daniel Biediger), its tests and the states, texts and pictures taken from its original |
| `demos/sensor-fusion/**`, `tests/unit/sensor-fusion.test.js`, `tests/e2e/sensor-fusion.spec.js`, `tests/golden/sensor-fusion.original-states.json`, `docs/checklists/sensor-fusion.md`, `docs/original-source/sensor-fusion.txt`, `docs/original-snapshots/sensor-fusion-*.png` | CC BY-NC-SA 3.0 | the port of "Sensor Fusion with Normally Distributed Noise" (Aaron Becker), its tests and the states, texts and pictures taken from its original |
| `demos/ensemble-control/**`, `tests/unit/ensemble-control.test.js`, `tests/e2e/ensemble-control.spec.js`, `tests/golden/ensemble-control.original-states.json`, `docs/checklists/ensemble-control.md`, `docs/original-source/ensemble-control.txt`, `docs/original-snapshots/ensemble-control-*.png` | CC BY-NC-SA 3.0 | the port of "Ensemble Control of Robots with Unicycle Kinematics" (Aaron Becker), its tests and the states, texts and pictures taken from its original |
| `demos/segment-distance/**`, `tests/unit/segment-distance.test.js`, `tests/e2e/segment-distance.spec.js`, `tests/golden/segment-distance.original-states.json`, `docs/checklists/segment-distance.md`, `docs/original-source/segment-distance.txt`, `docs/original-snapshots/segment-distance-*.png` | CC BY-NC-SA 3.0 | the port of "Shortest Distance between Two Line Segments" (Aaron T. Becker, Victor M. Baez and Nikhil Navkar), its tests and the states, texts and pictures taken from its original |
| `demos/swarm-circle/**`, `tests/unit/swarm-circle.test.js`, `tests/e2e/swarm-circle.spec.js`, `tests/golden/swarm-circle.original-states.json`, `docs/checklists/swarm-circle.md`, `docs/original-source/swarm-circle.txt`, `docs/original-snapshots/swarm-circle-*.png` | CC BY-NC-SA 3.0 | the port of "Distribution of a Swarm of Robots in a Circular Workplace under Gravity" (Haoran Zhao and Aaron T. Becker), its tests and the states, texts and pictures taken from its original |
| `demos/steering-rc-cars/**`, `tests/unit/steering-rc-cars.test.js`, `tests/e2e/steering-rc-cars.spec.js`, `tests/golden/steering-rc-cars.original-states.json`, `docs/checklists/steering-rc-cars.md`, `docs/original-source/steering-rc-cars.txt`, `docs/original-snapshots/steering-rc-cars-*.png` | CC BY-NC-SA 3.0 | the port of "Steering Multiple Radio Control (RC) Cars with One Joystick" (Aaron T. Becker and Javier Garcia), its tests and the states, texts and pictures taken from its original |
| `index.html`, `README.md`, `LICENSE.md` | CC BY-NC-SA 3.0 | describe and present the adaptations |
| `docs/original-source/**`, `docs/original-snapshots/**`, `docs/MANUAL_TEST_CHECKLIST.md`, `docs/checklists/**` | CC BY-NC-SA 3.0 | readable copies of / pictures from / derived from the originals |
| `demos/distance-norms/**`, `tests/unit/distance-norms.test.js`, `tests/golden/distance-norms.golden.test.js`, `tests/golden/distance-norms.original-states.json`, `tests/e2e/distance-norms.spec.js`, `docs/original-source/distance-norms.txt`, `docs/original-snapshots/distance-norms-*.png`, `docs/checklists/distance-norms.md` (batch A) | CC BY-NC-SA 3.0 | the "Distance Norms in Robot Workspace and Phase Space" port, its tests and the data and pictures taken from its original |
| `tests/**` except the MIT files below | CC BY-NC-SA 3.0 | encode the originals' behaviour and data (`tests/golden/*.json` is extracted from the notebooks) |
| `tools/**` | MIT | separable tooling (notebook decoder/extractor, local server, single-app bundler `bundle-app.mjs` and its `bundle-app.config.json`, publish, exploration and comparison scripts, the test-run template generator `new-test-run.mjs`, incl. the Wolfram Language scripts in `tools/wolfram/`, which contain no original code: `mp-original.wls` and `manipulate-harness.wls` load and run the code from a notebook you supply; `extra-checks*.wls` are plain Wolfram Language checks; one of them repeats the Plot3D settings of the unit-balls original to measure its plot range). Data the tools *produce* from the notebooks stays CC BY-NC-SA |
| `shared/**` (`mma.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `exact-pi.js`, `mma-colors.js`, `mma-lighting.js`, `linalg.js`, `ui.js`, `ui-extra.js`, `ui-interval.js`, `svg-plot.js`, `svg-frame.js`, `three-helpers.js`, `random.js`, `requirements.js`, `beep.js`, `manipulate.js`, `graphics.js`, `graphics-extras.js`, `graphics3d.js`, `graphics3d-three.js`, `graphics3d-view.js`, `svd3.js`, `plot3d.js`, `region-plot3d.js`, `wl.js`, `plot.js`, `geometry.js`, `style.css`) | MIT | generic helpers: Mathematica's Manipulate and 2D and 3D Graphics as data (with their SVG and three.js renderers), 3×3 SVD, Plot3D frames, RegionPlot3D meshing, Wolfram Language numeric and list semantics, text of exact numbers, exact trigonometry of multiples of π, colours and default lighting, 3×3 algebra, Manipulate-style controls, SVG plot frames and three.js helpers, random source, start-up notice, alert tone, page style |
| `tests/unit/mma.test.js`, `tests/unit/mma-exact.test.js`, `tests/unit/licence-headers.test.js`, `tests/unit/motion-compare.test.js`, `tests/unit/design-docs.test.js`, `tests/unit/beep.test.js`, `tests/unit/extract-state.test.js`, `tests/unit/new-test-run.test.js`, `tests/unit/bundle-app.test.js`, `tests/unit/ui.test.js`, `tests/unit/ui-interval.test.js`, `tests/unit/mma-extra.test.js`, `tests/unit/mma-text.test.js`, `tests/unit/exact-pi.test.js`, `tests/unit/svg-frame.test.js`, `tests/unit/three-helpers.test.js`, `tests/unit/graphics.test.js`, `tests/unit/manipulate.test.js`, `tests/unit/graphics3d.test.js`, `tests/unit/graphics3d-view.test.js`, `tests/unit/svd3.test.js`, `tests/unit/mma-lighting.test.js`, `tests/unit/plot3d.test.js`, `tests/unit/region-plot3d.test.js`, `tests/unit/wl.test.js`, `tests/unit/plot.test.js`, `tests/unit/geometry.test.js`, `tests/unit/graphics-extras.test.js`, `tests/unit/new-app.test.js`, `tests/e2e/graphics-options.spec.js`, `tests/e2e/fixtures/graphics-options.html`, `tests/e2e/fixtures/new-app-example.html`, `tests/e2e/plot.spec.js`, `tests/e2e/fixtures/plot.html`, `tests/e2e/realtime.spec.js`, `tests/e2e/fixtures/realtime.html`, `tests/e2e/helpers.js`, `tests/e2e/bundle.spec.js`, `tests/e2e/shared-controls.spec.js`, `tests/e2e/fixtures/shared-controls.html` | MIT | test the MIT helpers and tooling |
| `tests/harness/*.scenarios.json` (Mathematica-harness scenario files: steps, values and captures written for this project), `tests/support/harness-json.js`, `tests/unit/harness-*.test.js`, `tests/unit/fixtures/fake-wolframscript.mjs` | MIT | test inputs and generic test helpers for the harness `tools/wolfram/manipulate-harness.wls`; the results the harness computes from the originals (`tests/golden/*.harness.json`) are CC BY-NC-SA 3.0 like all golden data |
| `tests/harness/prm-3d.scenarios.json`, its file-level `"definitions"` | CC BY-NC-SA 3.0 (the rest of the file MIT) | five assignments copied from the Input cells of the original notebook |
| `tests/harness/motion-planning.scenarios.json`, its locator coordinates | CC BY-NC-SA 3.0 (the rest of the file MIT) | the five saved states copied from `tests/golden/motion-planning.original-states.json` (values of the original) |
| `vitest.config.js`, `playwright.config.js`, `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`, `.nojekyll`, `REUSE.toml`, `LICENSES/**` | MIT | configuration |
| `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DESIGN_PROCESS.md`, `docs/MATHEMATICA_CHECKS.md`, `docs/NEW_APP.md` | MIT | generic project documentation (NEW_APP.md: writing a new app on the shared layer) (MATHEMATICA_CHECKS.md: the general operator procedure for checks in Mathematica; it names the original notebooks but contains no original content) |
| `vendor/three/**` | MIT, © three.js authors | third-party |

## Original works adapted

| Port | Original Demonstration | Authors (as credited in the original) |
|------|------------------------|----------------------------------------|
| `demos/motion-planning/` | "Motion Planning for Robot Path around Obstacles" — <https://demonstrations.wolfram.com/MotionPlanningForRobotPathAroundObstacles/> | Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana |
| `demos/three-parametrizations/` | "Three Parametrizations of Rotations" — <https://demonstrations.wolfram.com/ThreeParametrizationsOfRotations/> | Aaron T. Becker and Benedict Isichei |
| `demos/euler-angles/` | "Euler Angles: Precession, Nutation, and Spin" — <https://demonstrations.wolfram.com/EulerAnglesPrecessionNutationAndSpin/> | Kevin Hernandez; based on a program by Sándor Kabai |
| `demos/prm-seven-link/` | "Probabilistic Roadmap Method with Seven-Link Articulated Robot" — <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodWithSevenLinkArticulatedRobot/> | Aaron T. Becker and Yitong Lu |
| `demos/car-paths/` | "Shortest Path for Forward and Reverse Motion of a Car" — <https://demonstrations.wolfram.com/ShortestPathForForwardAndReverseMotionOfACar/> | Francesco Bernardini and Aaron T. Becker |
| `demos/unit-balls/` | "Unit Balls for Different p-Norms in 2D and 3D" — <https://demonstrations.wolfram.com/UnitBallsForDifferentPNormsIn2DAnd3D/> | Aaron T. Becker and Ravi Patel |
| `demos/art-gallery/` | "Art Gallery Problem" — <https://demonstrations.wolfram.com/ArtGalleryProblem/> | Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker |
| `demos/prm/` | "Probabilistic Roadmap Method" — <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethod/> | Aaron T. Becker and Yitong Lu |
| `demos/prm-robot-arm/` | "Probabilistic Roadmap Method for Robot Arm" — <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodForRobotArm/> | Aaron T. Becker and Yitong Lu |
| `demos/robot-singularities/` | "Robot Singularities in Three-Link Manipulators" — <https://demonstrations.wolfram.com/RobotSingularitiesInThreeLinkManipulators/> | Aaron T. Becker and Yitong Lu |
| `demos/two-link-kinematics/` | "Forward and Inverse Kinematics for Two-Link Arm" — <https://demonstrations.wolfram.com/ForwardAndInverseKinematicsForTwoLinkArm/> (published 2016-06-20) | Aaron T. Becker and Lillian Lin |
| `demos/robot-motion-obstacles/` | "Robot Motion with Obstacles" — <https://demonstrations.wolfram.com/RobotMotionWithObstacles/> (published 2016-04-18) | Aaron T. Becker and Haoran Zhao |
| `demos/bfs-motion-planning/` | "Breadth-First Search Robot Motion Planning" — <https://demonstrations.wolfram.com/BreadthFirstSearchRobotMotionPlanning/> (published 2017-12-12) | Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala |
| `demos/distance-norms/` | "Distance Norms in Robot Workspace and Phase Space" — <https://demonstrations.wolfram.com/DistanceNormsInRobotWorkspaceAndPhaseSpace/> (published 2017-12-13, CC BY-NC-SA 3.0) | Aaron T. Becker and Benedict Isichei |
| `demos/dubins-path/` | "Shortest Path for the Dubins Car" (published 2017-12-14) — <https://demonstrations.wolfram.com/ShortestPathForTheDubinsCar/> — CC BY-NC-SA 3.0 | Aaron T. Becker and Shiva Shahrokhi |
| `demos/dubins-isochrons/` | "Isochrons for a Dubins Car" (published 2017-12-18) — <https://demonstrations.wolfram.com/IsochronsForADubinsCar/> — CC BY-NC-SA 3.0 | Aaron T. Becker and Shiva Shahrokhi |
| `demos/rrt/` | "Rapidly Exploring Random Tree (RRT) and RRT*" (published January 16, 2018) — <https://demonstrations.wolfram.com/RapidlyExploringRandomTreeRRTAndRRT/> | Aaron T. Becker and Li Huang |
| `demos/camera-lasers/` | "Measuring Distance and Orientation Using Camera and Lasers" (published June 29, 2016) — <https://demonstrations.wolfram.com/MeasuringDistanceAndOrientationUsingCameraAndLasers/> | Shiva Shahrokhi and Aaron T. Becker |
| `demos/minkowski-sum/` | "Minkowski Sum of Convex Robot and Obstacle" — <https://demonstrations.wolfram.com/MinkowskiSumOfConvexRobotAndObstacle/> (published April 23, 2019) | Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker |
| `demos/four-bar-linkage/` | "Configuration Space for Four-Bar Linkage" — <https://demonstrations.wolfram.com/ConfigurationSpaceForFourBarLinkage/> (published January 11, 2018) | Aaron T. Becker and Shiva Shahrokhi |
| `demos/dh-parameters/` | "Denavit-Hartenberg Parameters for a Three-Link Robot" — <https://demonstrations.wolfram.com/DenavitHartenbergParametersForAThreeLinkRobot/> (published June 16, 2016) | Aaron T. Becker and Mary Burbage |
| `demos/torus-chart/` | "Chart for a Torus" — <https://demonstrations.wolfram.com/ChartForATorus/> (published May 2, 2016) | Aaron T. Becker and Haoran Zhao |
| `demos/manipulability-ellipsoid/` | "Manipulability Ellipsoid of a Robot Arm" — <https://demonstrations.wolfram.com/ManipulabilityEllipsoidOfARobotArm/> (published June 24, 2016) | Aaron T. Becker and Mary Burbage |
| `demos/arm-configurations/` | "Common Robot Arm Configurations" — <https://demonstrations.wolfram.com/CommonRobotArmConfigurations/> (published June 28, 2017) | Mohammad Sultan and Aaron T. Becker |
| `demos/manipulator-workspaces/` | "Robot Manipulator Workspaces" — <https://demonstrations.wolfram.com/RobotManipulatorWorkspaces/> (published December 13, 2017) | Aaron T. Becker, Benedict Isichei, Muhammad Sultan and Maruthi S. Chemudupati |
| `demos/prm-3d/` | "Probabilistic Roadmap Method in 3D" — <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodIn3D/> (published February 26, 2020) | Aaron T. Becker and Yitong Lu |
| `demos/graham-scan/` | "Graham Scan to Find the Convex Hull of a Set of Points in 2D" — <https://demonstrations.wolfram.com/GrahamScanToFindTheConvexHullOfASetOfPointsIn2D/> (published 2020-11-25) | Aaron T. Becker, Yitong Lu and Daniel Biediger |
| `demos/sensor-fusion/` | "Sensor Fusion with Normally Distributed Noise" — <https://demonstrations.wolfram.com/SensorFusionWithNormallyDistributedNoise/> (published 2015-06-04) | Aaron Becker |
| `demos/ensemble-control/` | "Ensemble Control of Robots with Unicycle Kinematics" — <https://demonstrations.wolfram.com/EnsembleControlOfRobotsWithUnicycleKinematics/> (published 2014-10-03) | Aaron Becker |
| `demos/segment-distance/` | "Shortest Distance between Two Line Segments" — <https://demonstrations.wolfram.com/ShortestDistanceBetweenTwoLineSegments/> (published 2023-05-26) | Aaron T. Becker, Victor M. Baez and Nikhil Navkar |
| `demos/swarm-circle/` | "Distribution of a Swarm of Robots in a Circular Workplace under Gravity" — <https://demonstrations.wolfram.com/DistributionOfASwarmOfRobotsInACircularWorkplaceUnderGravity/> (published 2016-02-15) | Haoran Zhao and Aaron T. Becker |
| `demos/steering-rc-cars/` | "Steering Multiple Radio Control (RC) Cars with One Joystick" — <https://demonstrations.wolfram.com/SteeringMultipleRadioControlRCCarsWithOneJoystick/> (published 2018-03-14) | Aaron T. Becker and Javier Garcia |

All thirty-two were published by the Wolfram Demonstrations Project under CC BY-NC-SA 3.0.

### What was changed (adaptation notice)

- Complete re-implementation of each Demonstration's Wolfram Language code in JavaScript, with SVG
  or three.js/WebGL graphics and HTML controls standing in for
  Mathematica's `Manipulate`.
- Every known difference from the original is listed in the demo's `DESIGN.md`: deviations
  (`D-` IDs), quirks of the original that were deliberately kept (`Q-` IDs) and features added by the
  port (`A-` IDs); the newer apps also list known issues (`K-` IDs) and owner observations (`O-` IDs).
- Derived data extracted from the original notebooks is also covered by this licence:
  `tests/golden/*.json` (saved states, including states saved after interacting with the originals),
  `docs/original-source/*.txt` (readable source), `docs/original-snapshots/*.png` (the snapshot pictures stored in
  the notebooks) and `demos/three-parametrizations/teapot-data.js` (the teapot mesh saved in that notebook).

### No endorsement; trademarks

This adaptation is not affiliated with, sponsored or endorsed by the original authors or by Wolfram
Research, Inc. Mathematica, Wolfram Language and Wolfram Demonstrations Project are trademarks of
Wolfram Research, Inc.

## Sources credited inside the original Motion Planning Demonstration

The original Wolfram code itself credits these sources in its comments and Details section; they are
kept here for provenance:

- S. M. LaValle, *Planning Algorithms*, Cambridge University Press, 2006 (reflex vertices, bitangents).
- D.-T. Lee, "Proximity and Reachability in the Plane," Ph.D. dissertation, University of Illinois at
  Urbana-Champaign, 1978 (rotational-sweep visibility).
- Wikipedia, "Line–line intersection" (intersection formula), "Visibility Graph", "A* Search Algorithm".
- University of Pennsylvania SYS 502 notes, "Polygon Area and Centroid" (area and centroid formulas).
- Autodesk developer blog (adndevblog), "Finding the angle between two vectors along a given direction"
  (clockwise angle).
- Mathematica Stack Exchange questions 111629 (angle of a line to the x axis) and 66152 (segment–polygon
  intersection).

Reference cited by "Three Parametrizations of Rotations": M. W. Spong, S. Hutchinson and
M. Vidyasagar, *Robot Modeling and Control*, Wiley, 2006.

## Upstream sources credited by the seven newer originals

The originals themselves build on other people's work; the ports carry that code over, so the credits carry over too.

- **Shortest Path for Forward and Reverse Motion of a Car** states that its Reeds–Shepp code was converted from the
  Python library *reeds-shepp-curves* by Nathan Lichtlé and contributors
  (<https://github.com/nathanlct/reeds-shepp-curves>), **MIT licence, Copyright (c) 2019 Nathan Lichtlé** — full text in
  [`docs/third-party/reeds-shepp-curves-LICENSE.txt`](docs/third-party/reeds-shepp-curves-LICENSE.txt); its comments also cite
  S. M. LaValle's `rs.c`. Mathematical sources: J. A. Reeds and L. A. Shepp (1990); L. E. Dubins (1957); P. Souères and
  J.-P. Laumond (1996); K. M. Lynch and F. C. Park, *Modern Robotics* (2017).
- **Art Gallery Problem** uses visibility code with the same upstream credits as the authors' "Motion Planning for
  Robot Path around Obstacles": Wikipedia "Line–line intersection"; S. M. LaValle, *Planning Algorithms* (`reflex`);
  the Autodesk/adndevblog post on clockwise angles (`getClockwiseAngle`); Mathematica Stack Exchange question 111629
  (`getAngle`); D.-T. Lee, "Proximity and Reachability in the Plane" (1978); Wikipedia "Isovist", "Visibility
  polygon", "Visibility graph", "Art gallery problem".
- **Probabilistic Roadmap Method** and **… for Robot Arm**: the A* search follows the Wikipedia "A* search algorithm"
  pseudocode (comments carried over); L. E. Kavraki, P. Švestka, J.-C. Latombe and M. H. Overmars (1996).
- **Seven-Link Articulated Robot**: obstacles from Figure 2 of Kavraki et al. (1996).
- **Robot Singularities**: M. W. Spong, S. Hutchinson and M. Vidyasagar, *Robot Modeling and Control* (2006);
  `splineCircle` from Mathematica Stack Exchange question 10957.
- **Robot Motion with Obstacles** and **Breadth-First Search Robot Motion Planning**: M. Spong, S. Hutchinson and
  M. Vidyasagar, *Robot Modeling and Control* (2006).
- **Minkowski Sum of Convex Robot and Obstacle**: the Graham scan follows "Graham Scan" of the Arcane Algorithm Archive
  (<https://www.algorithm-archive.org/contents/graham_scan/graham_scan.html>, cited in the code); area and centroid
  formulas from the University of Pennsylvania SYS 502 notes "Polygon Area and Centroid"; S. M. LaValle, *Planning
  Algorithms* (2006).
- **Configuration Space for Four-Bar Linkage**: the loop-closure equations from K. M. Lynch and F. C. Park, *Modern
  Robotics* (2017).

## Third-party software

- `vendor/three/` — three.js r186, MIT licence, © 2010-2026 three.js authors (see `vendor/three/LICENSE`).
- The teapot shape is the Utah teapot (Martin Newell, 1975), as distributed in Mathematica's `ExampleData`.
- Development-only dependencies (installed by `npm install`, not part of the website): Vitest (MIT),
  Playwright (Apache-2.0).

*This file records the licensing intent of the repository; it is not legal advice.*
