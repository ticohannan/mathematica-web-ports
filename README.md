# Wolfram Demonstrations — Browser Ports

**Live site:** <https://ticohannan.github.io/mathematica-web-ports/> · **Source:** <https://github.com/ticohannan/mathematica-web-ports>

Thirty-nine Mathematica `Manipulate` demonstrations re-implemented as a **static website**:
plain HTML + JavaScript (ES modules, no build step), SVG for 2D, three.js/WebGL for 3D.

| Demo | Folder | Rendering | Interaction |
|------|--------|-----------|-------------|
| Motion Planning for Robot Path around Obstacles (**main target**) | `demos/motion-planning/` | SVG | drag 6 locators, setter bars, progress slider |
| Three Parametrizations of Rotations | `demos/three-parametrizations/` | WebGL | method setter, 7 sliders, 2D slider, progress |
| Euler Angles: Precession, Nutation, and Spin | `demos/euler-angles/` | WebGL | 3 sliders, bookmarks, animation |
| Probabilistic Roadmap Method with Seven-Link Articulated Robot | `demos/prm-seven-link/` | SVG | drag 7 joints, movement and goal setters |
| Shortest Path for Forward and Reverse Motion of a Car | `demos/car-paths/` | SVG | drag 4 locators, r_min, Reeds–Shepp / Dubins, progress |
| Unit Balls for Different p-Norms in 2D and 3D | `demos/unit-balls/` | WebGL 2 | p setter and slider, 2D/3D |
| Art Gallery Problem | `demos/art-gallery/` | SVG | drag guards (and obstacles), number of guards, environment |
| Probabilistic Roadmap Method | `demos/prm/` | SVG | add samples, radius, drag start/goal, progress |
| Probabilistic Roadmap Method for Robot Arm | `demos/prm-robot-arm/` | SVG + WebGL 2 | add samples, radius, obstacle controls, drag start/goal, progress |
| Robot Singularities in Three-Link Manipulators | `demos/robot-singularities/` | WebGL 2 | robot type, joint sliders, linear/angular, ellipsoid |
| Forward and Inverse Kinematics for Two-Link Arm | `demos/two-link-kinematics/` | SVG | r₁ slider, two angle dials, elbow up?, joint-velocity pad, drag end effector and its velocity |
| Robot Motion with Obstacles | `demos/robot-motion-obstacles/` | SVG | drag 2 obstacles and the configuration, Q (grid resolution) |
| Breadth-First Search Robot Motion Planning | `demos/bfs-motion-planning/` | SVG | drag 2 obstacles, start and goal; Q (grid), P (progress along the path) |
| Distance Norms in Robot Workspace and Phase Space | `demos/distance-norms/` | SVG | norm space and norm type setters, d and r₁ sliders, two angle dials |
| Shortest Path for the Dubins Car | `demos/dubins-path/` | SVG | drag goal and heading locators, r_min, progress |
| Isochrons for a Dubins Car | `demos/dubins-isochrons/` | SVG | r, t, set = / ≤, path type, τ, p |
| Rapidly Exploring Random Tree (RRT) and RRT* | `demos/rrt/` | SVG | tree type, obstacles, add-node buttons, bias and goal radius sliders, drag the goal |
| Measuring Distance and Orientation Using Camera and Lasers | `demos/camera-lasers/` | SVG | drag the object, orientation dial, laser spacing and focal length sliders |
| Minkowski Sum of Convex Robot and Obstacle | `demos/minkowski-sum/` | SVG | drag 10 vertex locators, robot/obstacle edges, show normals, move animation |
| Configuration Space for Four-Bar Linkage | `demos/four-bar-linkage/` | SVG | drag in the configuration space, separation slider, link-length interval slider |
| Denavit-Hartenberg Parameters for a Three-Link Robot | `demos/dh-parameters/` | WebGL 2 | joint type setters, θ, d, r, α sliders for three joints, grip slider |
| Chart for a Torus | `demos/torus-chart/` | WebGL 2 + SVG dials | Torus → Plane slider with animation, two angle dials, rotate the 3D picture |
| Manipulability Ellipsoid of a Robot Arm | `demos/manipulability-ellipsoid/` | WebGL 2 + SVG dials | three joint-angle dials (π/32 steps, arrow keys), rotate the 3D picture |
| Common Robot Arm Configurations | `demos/arm-configurations/` | WebGL 2 | joint sliders (2–6, per robot), grip slider, show robot, popup of nine DH-table robots, DH table and end-effector transform H |
| Robot Manipulator Workspaces | `demos/manipulator-workspaces/` | WebGL 2 | robot popup menu (14 robots), three joint sliders, three range (interval) sliders, rotate the 3D picture |
| Probabilistic Roadmap Method in 3D | `demos/prm-3d/` | WebGL 2 | θ₁–θ₃ sliders, two sphere pads with height sliders, show C-obstacles, add 100 vertices, restart, new goal, radius, progress; rotate both 3D pictures |
| Graham Scan to Find the Convex Hull of a Set of Points in 2D | `demos/graham-scan/` | SVG | drag the points, step slider, number of points, generate n new points |
| Sensor Fusion with Normally Distributed Noise | `demos/sensor-fusion/` | SVG | number of measurements, four variance sliders, drag the measurements on the axis |
| Ensemble Control of Robots with Unicycle Kinematics | `demos/ensemble-control/` | SVG | number of robots, forward command, turn counter-clockwise button |
| Shortest Distance between Two Line Segments | `demos/segment-distance/` | WebGL 2 | four xy pads, four z sliders, show the two planes, rotate the 3D picture |
| Distribution of a Swarm of Robots in a Circular Workplace under Gravity | `demos/swarm-circle/` | SVG | β and h sliders, show particles, show values |
| Steering Multiple Radio Control (RC) Cars with One Joystick | `demos/steering-rc-cars/` | SVG | n, radius, mode (setup / running), robot (RC car, cell, particle), range, offset; drag cars and heading handles; a joystick locator drives all cars in real time |
| Visibility Region of a Polygon | `demos/visibility-region/` | SVG | drag the blue reference point; step slider through the vertices sorted by angle (sweep ray, active edge, J list and the region built so far) |
| Moving Two Particles with Shared Control Inputs Using Wall Friction | `demos/wall-friction/` | SVG | drag the two start squares and the two goal circles; progress and ϵ sliders; show the moves or the configuration space on the right |
| Reachable Set for a Drone | `demos/drone-reachable-set/` | SVG | drag the switching times (t̂R, t̂T) in their pad; T̂ final and t sliders, U min/max interval slider, drone and optimum checkboxes |
| 3D Reachability Set for a Dubins Car | `demos/dubins-reachability-3d/` | WebGL 2 | dimension 2D / 3D, r and t sliders, path type (six), switching-times interval slider, path progress; rotate the 3D set |
| Probabilistic Models for Robot Motion | `demos/probabilistic-motion/` | SVG | mode (velocity or odometry model, density or samples), θ, v, ω sliders, noise sliders α₁–α₆ |
| The Homicidal Chauffeur Problem | `demos/homicidal-chauffeur/` | SVG | r_min and speed-ratio sliders, mode (setup / running); drag the car, its heading and the pedestrian; when running, the pedestrian follows the locator and the car chases it in real time |
| Maximizing Apparent Velocity in a Camera's Frame | `demos/camera-apparent-velocity/` | WebGL 2 | camera x, y, z sliders, sphere radius r, show sphere / 2D view / drone, animate; rotate the 3D picture |

The apps came in groups: the first three (motion planning, rotations, Euler angles); seven more from the
seven-link PRM to robot singularities, added in v0.1.12 as further proofs of concept (developed first in a separate,
unpublished repository and added here in one commit); ten, from two-link kinematics to the four-bar linkage, added in
v0.1.15 as "batch A" (designed together, with common modules in `demos/common/`); six 3D apps from
Denavit-Hartenberg parameters to the PRM in 3D, added in v0.1.16 as "batch B" (sharing the DH-family modules moved
from robot singularities to `demos/common/`); and new demonstrations ported on the shared layer with the app
generator: five from the Graham scan to the swarm in a circle in v0.1.23, the RC cars steered with one joystick
in v0.1.24, and seven from the visibility region to the apparent velocity in a camera's frame in v0.1.26.

## Where the code runs

| | Server (GitHub Pages or any static web server) | Client (the visitor's browser) |
|---|---|---|
| What runs | nothing — files are only delivered | all computation, rendering, interaction |
| Files | `index.html`, `demos/**`, `shared/**`, `vendor/**` | same files, executed as ES modules |
| State | none (no database, no cookies, no logins) | control values in memory; motion-planning scenes can be shared as URL parameters; the PRM pages accept `?seed=N` for reproducible random samples |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details. Development tools (`tests/`, `tools/`, `node_modules/`) never run on the server.

## Quick start (Windows, Firefox)

1. Install **Node.js LTS** (<https://nodejs.org>) and **Git for Windows** (<https://git-scm.com>).
2. Open **Command Prompt** (not PowerShell — see the note in docs/TESTING.md) in the repository folder:
   ```bat
   npm install
   npm run serve
   ```
3. Open <http://127.0.0.1:8080/> in Firefox. (Opening `index.html` by double-click does **not** work: browsers block ES modules on `file://`.)

## Tests

```bat
npm test                              :: unit + golden parity tests (Node, no browser)
npx playwright install firefox chromium webkit  :: one-time
npm run test:e2e                      :: browser tests in Firefox, Chromium and WebKit
npm run bundle -- --all               :: every app as its own deployable folder in dist\ (see below)
npm run publish:tested                :: run everything, then tag + push to GitHub
node tools\explore-motion.mjs 300 1   :: randomized investigation of the motion planner
npm run compare:original              :: motion planning: port vs the ORIGINAL code run in local Mathematica
npm run test-run -- car-paths         :: fill-in file _internal\test-runs\<date>_car-paths.md for the manual checks of one app
npm run new-app -- my-demo --title "…" --slug WolframSlug --authors "A; B" [--3d]   :: start a new port (see below)
```

Human/manual tests: [docs/MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md) and, for the seventeen apps
added since v0.1.12, one file per app in [docs/checklists/](docs/checklists/); checks in Mathematica are step-by-step operator procedures, with the general
procedure in [docs/MATHEMATICA_CHECKS.md](docs/MATHEMATICA_CHECKS.md) and results in a test-run file per app and day
(`npm run test-run -- <dir>`). Where an original is probably wrong (conceptually or mathematically), its design
document lists it in §11 *Errors in the original*; the ports keep the original's behaviour until the owner decides.
Full guide: [docs/TESTING.md](docs/TESTING.md). Feature changes: [docs/DESIGN_PROCESS.md](docs/DESIGN_PROCESS.md).

## Deploying a single app

Every app can be taken out and hosted on its own (owner rule R-A). `npm run bundle -- prm-robot-arm` writes one app
to `dist\prm-robot-arm\` (add `--zip` for `dist\prm-robot-arm.zip` as well; `--all` instead of a name bundles every app;
`--out <folder>` writes elsewhere):

```bat
npm run bundle -- prm-robot-arm
npm run bundle -- --all --zip
```

`tools/bundle-app.mjs` starts at `demos/<app>/index.html` and follows everything the page loads (scripts, the import
map, static and literal dynamic imports, stylesheets, pictures), recursively through `shared/`, `demos/common/` and
`vendor/three/`, and copies exactly those files into `dist/<app>/` with the repository's folder layout, so no path is
rewritten. It adds a root `index.html` that opens the app (once per browser tab), a generated `README.md` (title, credits, licence, how to
serve and test), the app's `DESIGN.md`, `LICENSE.md` and the licence texts that apply, and an empty `.nojekyll`. It
stops with a list of problems if a reference cannot be resolved. Each `DESIGN.md` §6.1 lists what its bundle contains.

To host it, copy the folder to any static web server — e.g. push its contents to a GitHub repository and enable
GitHub Pages for that branch, or put it in an nginx/Apache/Netlify folder — or try it locally with
`npx serve dist\prm-robot-arm` or `node tools\serve.mjs 8081 dist\prm-robot-arm` and open the address shown. As for the
whole site, opening `index.html` from the file system does not work. `dist/` is git-ignored. The browser test
`tests/e2e/bundle.spec.js` bundles every app and runs it from its own folder.

## Starting a new port

`npm run new-app -- my-demo --title "Title of the Demonstration" --slug WolframSlug --authors "A. Author; B. Author"`
(add `--3d` for a three.js picture) writes a small working app — `demos/my-demo/` with `index.html`, `main.js` (one
`Manipulate({…})` of `shared/manipulate.js`), `model.js` (the body: state in, picture as Graphics data out), its
`DESIGN.md`, a unit test, a browser test and a manual checklist — and registers it on the landing page, in the test
app list, LICENSE.md, this README and `docs/DESIGN_PROCESS.md`, so `npm test` and the browser tests pass at once.
Replace the example with the Demonstration's code (list and vector functions with Mathematica's names are in
`shared/wl.js`; Graphics options `Axes`, `Frame`, `PlotLabel` … are understood by the layer) and keep the design
document in step. `npm run new-app -- --remove my-demo` undoes it. [docs/NEW_APP.md](docs/NEW_APP.md) is the
short guide for Mathematica users (Manipulate, Graphics and list functions side by side).

## Repository layout

```
index.html                 landing page
demos/<demo>/              index.html, main.js (page/rendering), pure model file, DESIGN.md
demos/common/              code shared by several apps (derived from the originals; owner and users in each file)
shared/                    mma.js (Mathematica semantics), mma-exact.js (bit-exact Det/Norm/ArcTan),
                           linalg.js, ui.js (Manipulate-style controls), three-helpers.js, style.css;
                           for the newer apps also svg-plot.js (Graphics as SVG, locators), ui-extra.js,
                           mma-extra.js, mma-colors.js, mma-lighting.js, random.js, requirements.js, beep.js;
                           for the batch A apps ui-interval.js (IntervalSlider), mma-text.js (text of exact
                           numbers), exact-pi.js (Cos/Sin of exact multiples of π), svg-frame.js (frame, ticks, axes)
vendor/three/              three.js r186 (MIT), served locally — no CDN needed
tests/unit/                Vitest unit + property tests
tests/golden/              fixtures extracted from the ORIGINAL notebooks (saved states) + parity tests
tests/e2e/                 Playwright browser tests
tests/support/             independent reference implementation used as a test oracle
tools/                     serve.mjs (local server), bundle-app.mjs (one app as its own folder, see above), explore-motion.mjs, compare-with-original.mjs (+ wolfram/,
                           lib/, data/), notebook extraction scripts, publish-tested.mjs; run-harness.mjs and
                           harness/ (Mathematica harness: wolfram/manipulate-harness.wls runs an original's stored
                           Manipulate code headless for scripted control changes; scenario extractor and checkers)
tests/harness/             Mathematica-harness scenario files (inputs; results become tests/golden/<dir>.harness.json)
docs/                      architecture, testing, checklists, readable original source, original snapshot pictures
dist/                      single-app bundles made by `npm run bundle` (git-ignored)
_internal/                 PRIVATE (git-ignored): notes, assignment material, original .nb files
```

## Licence and credits

These are adaptations (JavaScript translations) of Wolfram Demonstrations Project content by their
original authors — Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana (motion planning, art gallery, Minkowski
sum); Aaron T. Becker and Benedict Isichei (rotation parametrizations, distance norms); Kevin Hernandez, based on a
program by Sándor Kabai (Euler angles); Aaron T. Becker and Yitong Lu (the three PRM apps, robot singularities);
Francesco Bernardini and Aaron T. Becker (car paths); Aaron T. Becker and Ravi Patel (unit balls); Aaron T. Becker
and Lillian Lin (two-link kinematics); Aaron T. Becker and Haoran Zhao (robot motion with obstacles); Aaron T.
Becker, Benedict Isichei and Praveen Reddy Padala (breadth-first search motion planning); Aaron T. Becker and Shiva
Shahrokhi (Dubins car path, Dubins isochrons, four-bar linkage); Aaron T. Becker and Li Huang (rapidly exploring
random tree); Shiva Shahrokhi and Aaron T. Becker (camera and lasers) — licensed
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). This repository is released
under the same licence, for non-commercial use; separable tooling (`tools/`, `shared/`, configuration)
is MIT-licensed. Author of the adaptation: Tico Hannan (© 2026), who produced it with an AI
code-generation tool. Not affiliated with or endorsed by the original authors or Wolfram Research.
The car-path port carries code converted (by the original's authors) from the MIT-licensed Python library
*reeds-shepp-curves*; its notice is kept in LICENSE.md.
Full credits, sources, the per-file licence map and third-party licences: [LICENSE.md](LICENSE.md).
