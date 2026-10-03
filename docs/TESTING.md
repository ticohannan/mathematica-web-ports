# Testing guide

Four layers. Run them in this order; each one catches problems the others cannot.

| Layer | Command | Needs | What it proves |
|-------|---------|-------|----------------|
| 1. Unit & property tests | `npm test` | Node | the math functions behave correctly on hand-derived cases and random cases checked by an independent oracle |
| 2. Golden parity tests | `npm test` (same run) | Node | the port reproduces numbers **computed by the original Mathematica code** (cached in the .nb files) |
| 3. Browser tests | `npm run test:e2e` | Firefox (Playwright build) | controls exist and work, the screen shows what the math computed, drag/keyboard interaction, error-free load |
| 4. Manual / exploratory | `docs/MANUAL_TEST_CHECKLIST.md` | a person, a browser, ideally the original running in Wolfram software | look & feel, behaviour compared with the original, things no script can judge |

Plus an investigation tool: `node tools/explore-motion.mjs` (randomized differential testing).

---

## One-time setup on Windows

1. Install **Node.js LTS** from <https://nodejs.org> (default options).
2. Install **Git for Windows** from <https://git-scm.com/download/win> (default options).
3. Use **Command Prompt** (`cmd.exe`). In PowerShell, `npm` may fail with
   *"running scripts is disabled on this system"*; either use Command Prompt, call `npm.cmd`
   instead of `npm`, or run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
4. In the repository folder:
   ```bat
   npm install
   npx playwright install firefox
   ```
   The second command downloads Playwright's own build of Firefox (~100 MB). Tests drive that
   build, not your installed Firefox; your installed Firefox is for manual testing.

## Layer 1 + 2: `npm test`

Runs `tests/unit/*.test.js` and `tests/golden/parity.test.js` with Vitest. Takes a few seconds.

- **mma.test.js** — Mathematica-semantics helpers.
- **planner.test.js** — polygon helpers, winding test, segment intersection, Minkowski sum
  (incl. the property *robot overlaps obstacle ⇔ centre inside C-obstacle* checked with an
  independent separating-axis test), configuration-space boundary, A*, discretisation, scene
  behaviour, and 25 random scenes compared with the independent reference planner in
  `tests/support/reference-planner.js` (path collision-free and of optimal length).
- **rotations.test.js** — rotation matrices, the formulas in the Details text, round-trip
  conversions for 200 random rotations, progress behaviour, gyroscope orientation.
- **golden/parity.test.js** — for each saved state of the original notebooks: obstacle/robot
  polygons, Minkowski sums (vertex order too), visibility lines, bitangent lines and the full
  robot trajectory must equal the original's (polygons, C-obstacles and lines bit for bit, trajectory
  to 1e-15); the rotation conversions shown in
  the disabled sliders must equal the original's saved values.

### Where the golden data comes from
The `.nb` files store the last state of each `Manipulate` (thumbnail + snapshots), including
variables the original computed (e.g. `discretePath`, `prevRobotobstconfig`). `tools/extract_golden.py`
decodes them (`tools/mdecode.py` reads Mathematica's `CompressedData`). To regenerate:
```bat
python tools\extract_golden.py _internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb motion tests\golden\motion-planning.original-states.json
```
Limits: only 3 distinct motion-planning scenes (boundary 3/4, robot 3/4 sides) and 4 rotation
states are cached. Boundary 5 and robot 5 have **no** golden data — test those manually.

## Layer 3: `npm run test:e2e`

Starts `tools/serve.mjs` on port 8090 automatically and runs `tests/e2e/*.spec.js` in Firefox.

- Results: terminal + HTML report (`npm run report`).
- `test-output/review-screenshots/firefox/*.png` — screenshots of every original snapshot state
  and other key states, **for human side-by-side comparison** with the original's snapshots.
  They are not compared automatically (pixel comparison across machines/GPUs is unreliable).
- Headed (watch it happen): `npm run test:e2e:headed`.
- Second engine (optional): `npx playwright install chromium` then `npx playwright test --project=chromium`.

> Status note (first version): the browser suite was run in Chromium in the authoring sandbox
> (Playwright's Firefox download was blocked there). Your first Firefox run is therefore the first
> Firefox run ever — failures there are real findings, not setup noise. Record them.

## Layer 4: manual testing

Use `docs/MANUAL_TEST_CHECKLIST.md`. Copy it per test session (e.g.
`2026-10-05_alice_checklist.md`), fill it in, email it back. Completed copies are kept in
`_internal/test-runs/` (private) unless decided otherwise.

### Getting the ORIGINAL running for comparison (demonstrations.wolfram.com is down)
You have the author notebooks (`_internal/originals/*.nb`). Options, cheapest first — check each
vendor's current terms, they change:
1. **Wolfram Player** (free desktop app, Windows) — opens `.nb` files and should run their
   `Manipulate` interactively. You can drag locators and sliders but cannot edit code.
2. **Wolfram Cloud** (free basic account) — upload the `.nb`, run it in the browser; you can edit code,
   e.g. change the initial locator positions to reproduce a scene exactly.
3. **Wolfram Engine** (free for developers, non-commercial) + Jupyter/`wolframscript` — scriptable.
4. The live site, when it returns.

To reproduce a specific port scene in the original (e.g. a lead from the exploration tool), edit the
initial values in the Manipulate, e.g. `{{r1,{-2.0,2.75}},…}` → `{{r1,{2.84,0.34}},…}`, and re-evaluate.

## Investigation tool: `tools/explore-motion.mjs`

```bat
npm run serve                              :: in one window (so report links open)
node tools\explore-motion.mjs 400 11       :: in another: 400 scenes, seed 11
```
Generates random scenes (valid start/goal, direct line usually blocked), runs the port and the
independent reference planner, and writes `test-output/explore-motion.md` listing every
disagreement with a **link that opens the exact scene in the browser**. Kinds reported:
`port-path-collides`, `port-path-longer-than-shortest`, `port-finds-no-path-but-one-exists`,
`start/goal-validity-differs`, `port-exception`, ...
Each row is a lead: the cause may be (a) a port bug, (b) behaviour inherited from the original
algorithm, (c) a limitation of the sampling-based reference. Deciding which needs a person —
ideally by reproducing the scene in the original (above).
`--uniform` samples start/goal anywhere (exercises invalid-position handling).

## Test ID conventions

- Design features: `F-<demo>-NN` (in each DESIGN.md), deviations `D-…`, original quirks `Q-…`.
- Manual tests: `M-<demo>-NN`.
- Automated tests are referenced by file + test title.
Demo codes: `MP` motion planning, `TP` three parametrizations, `EA` Euler angles, `GEN` general.
