# Licence and attribution

## Demonstration content (the three ports)

The three applications in `demos/` are ports (derivative works) of these Wolfram Demonstrations:

| Port | Original | Authors |
|------|----------|---------|
| `demos/motion-planning/` | [Motion Planning for Robot Path around Obstacles](https://demonstrations.wolfram.com/MotionPlanningForRobotPathAroundObstacles/) | Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana |
| `demos/three-parametrizations/` | [Three Parametrizations of Rotations](https://demonstrations.wolfram.com/ThreeParametrizationsOfRotations/) | Aaron T. Becker and Benedict Isichei |
| `demos/euler-angles/` | [Euler Angles: Precession, Nutation, and Spin](https://demonstrations.wolfram.com/EulerAnglesPrecessionNutationAndSpin/) | Kevin Hernandez, based on a program by Sándor Kabai |

Wolfram Demonstrations Project content is published under the
**Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported licence (CC BY-NC-SA 3.0)**
(<https://creativecommons.org/licenses/by-nc-sa/3.0/>; terms at
<https://wolfram.com/legal/terms/wolfram-demonstrations-project.html>).

Because these ports are adapted from that material, they are distributed under the same licence,
CC BY-NC-SA 3.0: you may share and adapt them for non-commercial purposes, with attribution to the
original authors and to this port, and adaptations must use the same licence. The same applies to
the derived data in `tests/golden/` and `docs/original-source/` and to the teapot mesh in
`demos/three-parametrizations/teapot-data.js`, all extracted from the original notebooks.

Port: © 2026 the repository owner. Changes: complete re-implementation in JavaScript/SVG/WebGL;
see each `demos/*/DESIGN.md` for the list of deviations from the originals.

## Third-party software

- `vendor/three/` — three.js r186, MIT licence, © 2010-2026 three.js authors (see `vendor/three/LICENSE`).
- Development-only dependencies (not shipped to the website): Vitest (MIT), Playwright (Apache-2.0).

*Not legal advice; this file records the licensing intent of the repository.*
