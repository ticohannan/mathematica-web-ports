# Wolfram Demonstrations — Browser Ports

**Live site:** <https://ticohannan.github.io/mathematica-web-ports/> · **Source:** <https://github.com/ticohannan/mathematica-web-ports>

Ten Mathematica `Manipulate` demonstrations re-implemented as a **static website**:
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

The last seven were added in v0.1.12 as further proofs of concept (developed first in a separate, unpublished
repository and added here in one commit).

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
npm run publish:tested                :: run everything, then tag + push to GitHub
node tools\explore-motion.mjs 300 1   :: randomized investigation of the motion planner
npm run compare:original              :: motion planning: port vs the ORIGINAL code run in local Mathematica
```

Human/manual tests: [docs/MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md) and, for the seven newer apps,
[docs/checklists/](docs/checklists/).
Full guide: [docs/TESTING.md](docs/TESTING.md). Feature changes: [docs/DESIGN_PROCESS.md](docs/DESIGN_PROCESS.md).

## Repository layout

```
index.html                 landing page
demos/<demo>/              index.html, main.js (page/rendering), pure model file, DESIGN.md
demos/common/              code shared by the two PRM apps (derived from the originals)
shared/                    mma.js (Mathematica semantics), mma-exact.js (bit-exact Det/Norm/ArcTan),
                           linalg.js, ui.js (Manipulate-style controls), three-helpers.js, style.css;
                           for the newer apps also svg-plot.js (Graphics as SVG, locators), ui-extra.js,
                           mma-extra.js, mma-colors.js, mma-lighting.js, random.js, requirements.js
vendor/three/              three.js r186 (MIT), served locally — no CDN needed
tests/unit/                Vitest unit + property tests
tests/golden/              fixtures extracted from the ORIGINAL notebooks (saved states) + parity tests
tests/e2e/                 Playwright browser tests
tests/support/             independent reference implementation used as a test oracle
tools/                     serve.mjs (local server), explore-motion.mjs, compare-with-original.mjs (+ wolfram/,
                           lib/, data/), notebook extraction scripts, publish-tested.mjs
docs/                      architecture, testing, checklists, readable original source, original snapshot pictures
_internal/                 PRIVATE (git-ignored): notes, assignment material, original .nb files
```

## Licence and credits

These are adaptations (JavaScript translations) of Wolfram Demonstrations Project content by their
original authors — Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana (motion planning, art gallery);
Aaron T. Becker and Benedict Isichei (rotation parametrizations); Kevin Hernandez, based on a program by
Sándor Kabai (Euler angles); Aaron T. Becker and Yitong Lu (the three PRM apps, robot singularities);
Francesco Bernardini and Aaron T. Becker (car paths); Aaron T. Becker and Ravi Patel (unit balls) — licensed
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/). This repository is released
under the same licence, for non-commercial use; separable tooling (`tools/`, `shared/`, configuration)
is MIT-licensed. Author of the adaptation: Tico Hannan (© 2026), who produced it with an AI
code-generation tool. Not affiliated with or endorsed by the original authors or Wolfram Research.
The car-path port carries code converted (by the original's authors) from the MIT-licensed Python library
*reeds-shepp-curves*; its notice is kept in LICENSE.md.
Full credits, sources, the per-file licence map and third-party licences: [LICENSE.md](LICENSE.md).
