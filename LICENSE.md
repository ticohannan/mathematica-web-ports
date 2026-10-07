# Licence, attribution and credits

## Summary

The ten web applications in `demos/` are **adaptations** (JavaScript / SVG / WebGL translations)
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
| `demos/**` (all ten apps, incl. `teapot-data.js` and `demos/common/`) | CC BY-NC-SA 3.0 | adaptations of the Demonstrations |
| `index.html`, `README.md`, `LICENSE.md` | CC BY-NC-SA 3.0 | describe and present the adaptations |
| `docs/original-source/**`, `docs/original-snapshots/**`, `docs/MANUAL_TEST_CHECKLIST.md`, `docs/checklists/**` | CC BY-NC-SA 3.0 | readable copies of / pictures from / derived from the originals |
| `tests/**` except the MIT files below | CC BY-NC-SA 3.0 | encode the originals' behaviour and data (`tests/golden/*.json` is extracted from the notebooks) |
| `tools/**` | MIT | separable tooling (notebook decoder/extractor, local server, publish, exploration and comparison scripts, incl. the Wolfram Language scripts in `tools/wolfram/`, which contain no original code: `mp-original.wls` loads and runs the code from a notebook you supply; `extra-checks*.wls` are plain Wolfram Language checks; one of them repeats the Plot3D settings of the unit-balls original to measure its plot range). Data the tools *produce* from the notebooks stays CC BY-NC-SA |
| `shared/**` (`mma.js`, `mma-exact.js`, `mma-extra.js`, `mma-colors.js`, `mma-lighting.js`, `linalg.js`, `ui.js`, `ui-extra.js`, `svg-plot.js`, `three-helpers.js`, `random.js`, `requirements.js`, `style.css`) | MIT | generic helpers: Wolfram Language numeric and list semantics, colours and default lighting, 3×3 algebra, Manipulate-style controls, SVG and three.js helpers, random source, start-up notice, page style |
| `tests/unit/mma.test.js`, `tests/unit/mma-exact.test.js`, `tests/unit/licence-headers.test.js`, `tests/unit/motion-compare.test.js`, `tests/unit/design-docs.test.js`, `tests/e2e/helpers.js` | MIT | test the MIT helpers and tooling |
| `vitest.config.js`, `playwright.config.js`, `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`, `.nojekyll`, `REUSE.toml`, `LICENSES/**` | MIT | configuration |
| `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DESIGN_PROCESS.md` | MIT | generic project documentation |
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

All ten were published by the Wolfram Demonstrations Project under CC BY-NC-SA 3.0.

### What was changed (adaptation notice)

- Complete re-implementation of each Demonstration's Wolfram Language code in JavaScript, with SVG
  or three.js/WebGL graphics and HTML controls standing in for
  Mathematica's `Manipulate`.
- Every known difference from the original is listed in the demo's `DESIGN.md`: deviations
  (`D-` IDs), quirks of the original that were deliberately kept (`Q-` IDs) and features added by the
  port (`A-` IDs); the seven newer apps also list known issues (`K-` IDs) and owner observations (`O-` IDs).
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

## Third-party software

- `vendor/three/` — three.js r186, MIT licence, © 2010-2026 three.js authors (see `vendor/three/LICENSE`).
- The teapot shape is the Utah teapot (Martin Newell, 1975), as distributed in Mathematica's `ExampleData`.
- Development-only dependencies (installed by `npm install`, not part of the website): Vitest (MIT),
  Playwright (Apache-2.0).

*This file records the licensing intent of the repository; it is not legal advice.*
