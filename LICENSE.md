# Licence, attribution and credits

## Summary

The three web applications in `demos/` are **adaptations** (JavaScript / SVG / WebGL translations)
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
[`LICENSES/MIT.txt`](LICENSES/MIT.txt) (from the SPDX licence list). Each source file carries an
`SPDX-License-Identifier` header; [`REUSE.toml`](REUSE.toml) covers files that cannot (JSON, Markdown).

## Which licence applies to which file

| Path | Licence | Why |
|------|---------|-----|
| `demos/**` (all three apps, incl. `teapot-data.js`) | CC BY-NC-SA 3.0 | adaptations of the Demonstrations |
| `index.html`, `README.md`, `LICENSE.md` | CC BY-NC-SA 3.0 | describe and present the adaptations |
| `docs/original-source/**`, `docs/MANUAL_TEST_CHECKLIST.md` | CC BY-NC-SA 3.0 | readable copies of / derived from the originals |
| `tests/**` except the MIT files below | CC BY-NC-SA 3.0 | encode the originals' behaviour and data (`tests/golden/*.json` is extracted from the notebooks) |
| `tools/**` | MIT | separable tooling (notebook decoder/extractor, local server, publish, exploration and comparison scripts, incl. the Wolfram Language script `tools/wolfram/mp-original.wls`, which contains no original code: it loads and runs the code from a notebook you supply). Data the tools *produce* from the notebooks stays CC BY-NC-SA |
| `shared/**` (`mma.js`, `linalg.js`, `ui.js`, `three-helpers.js`, `style.css`) | MIT | generic helpers: Wolfram Language numeric semantics, 3×3 algebra, Manipulate-style controls, three.js helpers, page style |
| `tests/unit/mma.test.js`, `tests/unit/licence-headers.test.js`, `tests/unit/motion-compare.test.js`, `tests/e2e/helpers.js` | MIT | test the MIT helpers and tooling |
| `vitest.config.js`, `playwright.config.js`, `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`, `.nojekyll`, `REUSE.toml`, `LICENSES/**` | MIT | configuration |
| `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/GIT_AND_GITHUB_SETUP.md` | MIT | generic project documentation |
| `vendor/three/**` | MIT, © three.js authors | third-party |

## Original works adapted

| Port | Original Demonstration | Authors (as credited in the original) |
|------|------------------------|----------------------------------------|
| `demos/motion-planning/` | "Motion Planning for Robot Path around Obstacles" — <https://demonstrations.wolfram.com/MotionPlanningForRobotPathAroundObstacles/> | Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana |
| `demos/three-parametrizations/` | "Three Parametrizations of Rotations" — <https://demonstrations.wolfram.com/ThreeParametrizationsOfRotations/> | Aaron T. Becker and Benedict Isichei |
| `demos/euler-angles/` | "Euler Angles: Precession, Nutation, and Spin" — <https://demonstrations.wolfram.com/EulerAnglesPrecessionNutationAndSpin/> | Kevin Hernandez; based on a program by Sándor Kabai |

All three were published by the Wolfram Demonstrations Project under CC BY-NC-SA 3.0.

### What was changed (adaptation notice)

- Complete re-implementation of each Demonstration's Wolfram Language code in JavaScript, with SVG
  (motion planning) or three.js/WebGL (rotation demos) graphics and HTML controls standing in for
  Mathematica's `Manipulate`.
- Every known difference from the original is listed in the demo's `DESIGN.md`: deviations
  (`D-` IDs), quirks of the original that were deliberately kept (`Q-` IDs) and features added by the
  port (`A-` IDs).
- Derived data extracted from the original notebooks is also covered by this licence:
  `tests/golden/*.json` (saved states), `docs/original-source/*.txt` (readable source) and
  `demos/three-parametrizations/teapot-data.js` (the teapot mesh saved in that notebook).

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

## Third-party software

- `vendor/three/` — three.js r186, MIT licence, © 2010-2026 three.js authors (see `vendor/three/LICENSE`).
- The teapot shape is the Utah teapot (Martin Newell, 1975), as distributed in Mathematica's `ExampleData`.
- Development-only dependencies (installed by `npm install`, not part of the website): Vitest (MIT),
  Playwright (Apache-2.0).

*This file records the licensing intent of the repository; it is not legal advice.*
