# Licence, attribution and credits

## Summary

The three web applications in `demos/` are **adaptations** (JavaScript / SVG / WebGL translations)
of Wolfram Demonstrations Project content, which is licensed under the
**Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported licence (CC BY-NC-SA 3.0)**,
<https://creativecommons.org/licenses/by-nc-sa/3.0/>
(Wolfram's terms: <https://wolfram.com/legal/terms/wolfram-demonstrations-project.html>).

As required by that licence's ShareAlike term, **this repository is released under CC BY-NC-SA 3.0**.
You may share and adapt it for **non-commercial** purposes, provided you credit the original authors
and this adaptation, indicate any changes, and release adaptations under the same licence.
Because of the NonCommercial term this project is *source-available*, not "open source" in the OSI
sense. Third-party components keep their own licences (below).

Adaptation © 2026 Tico Hannan (<https://github.com/ticohannan/mathematica-web-ports>).
The adaptation code was generated with an AI coding assistant (Claude, Anthropic) and reviewed and
tested by the repository owner.

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
