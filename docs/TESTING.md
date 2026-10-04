# Testing guide

Five layers. Run them in this order; each one catches problems the others cannot.

| Layer | Command | Needs | What it proves |
|-------|---------|-------|----------------|
| 1. Unit & property tests | `npm test` | Node | the math functions behave correctly on hand-derived cases and random cases checked by an independent oracle |
| 2. Golden parity tests | `npm test` (same run) | Node | the port reproduces numbers **computed by the original Mathematica code** (cached in the .nb files) |
| 3. Browser tests | `npm run test:e2e` | Firefox and Chromium (Playwright builds) | controls exist and work, the screen shows what the math computed, drag/keyboard interaction, error-free load |
| 4. Manual / exploratory | `docs/MANUAL_TEST_CHECKLIST.md` | a person, a browser, ideally the original running in Wolfram software | look & feel, behaviour compared with the original, things no script can judge |
| 5. Automated comparison with the original (motion planning) | `npm run compare:original` | local Mathematica / Wolfram Engine (`wolframscript`) | the port computes the same validity, C-obstacles, lines, path and trajectory as the **original code run live**, on many scenes, not only the 5 saved ones |

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
   npx playwright install firefox chromium
   ```
   The second command downloads Playwright's own builds of Firefox and Chromium (~100 MB each). Tests
   drive those builds, not your installed browsers; your installed Firefox is for manual testing.

## Layer 1 + 2: `npm test`

Runs `tests/unit/*.test.js` and `tests/golden/parity.test.js` with Vitest. Takes a few seconds.

- **mma.test.js** — Mathematica-semantics helpers.
- **mma-exact.test.js** — bit-exact `Det`, `Norm`, `ArcTan`, `VectorAngle` and the fused multiply-add
  (`shared/mma-exact.js`): fast paths against exact BigInt arithmetic, and results recorded from
  Mathematica 15.0.1 (`tests/unit/fixtures/mma-exact.recorded.json`, taken from a trace run).
- **planner.test.js** — polygon helpers, winding test, segment intersection, Minkowski sum
  (incl. the property *robot overlaps obstacle ⇔ centre inside C-obstacle* checked with an
  independent separating-axis test), configuration-space boundary, A*, discretisation, scene
  behaviour, and 25 random scenes compared with the independent reference planner in
  `tests/support/reference-planner.js` (path collision-free and of optimal length). "Independent"
  means it shares no code with the port; it was written with knowledge of the original algorithm,
  so it is not a clean-room implementation.
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

Starts `tools/serve.mjs` on port 8090 automatically and runs `tests/e2e/*.spec.js` in Firefox AND
Chromium (two Playwright projects; `npm run test:e2e:firefox` / `test:e2e:chromium` run one).
`npm run publish:tested` requires both to pass.

- Results: terminal + HTML report (`npm run report`).
- `test-output/review-screenshots/<firefox|chromium>/*.png` — screenshots of every original snapshot state
  and other key states, **for human side-by-side comparison** with the original's snapshots.
  They are not compared automatically (pixel comparison across machines/GPUs is unreliable).
- Parallel: 6 browser workers by default (tests are independent). Change with the `PW_WORKERS`
  environment variable, e.g. `set PW_WORKERS=12` (Command Prompt) before `npm run test:e2e`, or
  `set PW_WORKERS=1` to debug one test at a time.
- Headed (watch it happen): `npm run test:e2e:headed`.

> Status: v0.1.0 was first run in Firefox (Playwright's Firefox 155) on Windows 10 on 2026-10-03 —
> 38/38 passed. It had previously been run only in Chromium in the authoring sandbox. Any later
> failure is a finding — record it.

## Layer 4: manual testing

Use `docs/MANUAL_TEST_CHECKLIST.md`. Copy it per test session (e.g.
`2026-10-05_alice_checklist.md`), fill it in, email it back. Completed copies are kept in
`_internal/test-runs/` (private) unless decided otherwise.

### Getting the ORIGINAL running for comparison
You have the author notebooks (`_internal/originals/*.nb`). Options — check each vendor's current
terms, they change:
1. **Mathematica** or the **Wolfram Engine** (free for developers, non-commercial) — open the
   notebook (Mathematica) or run it headless with `wolframscript`; used by the automated
   comparison below.
2. **Wolfram Player** (free desktop app) — opens `.nb` files and runs their `Manipulate`
   interactively. You can drag locators and sliders but cannot edit code.
3. **Wolfram Cloud** (free basic account) — upload the `.nb` and run it in the browser.
4. The published Demonstration on demonstrations.wolfram.com (online again since Oct 2026).

To reproduce a specific port scene by hand, edit the initial values in the Manipulate, e.g.
`{{r1,{-2.0,2.75}},…}` → `{{r1,{2.84,0.34}},…}`, and re-evaluate.

## Layer 5: automated comparison with the original (`npm run compare:original`)

Needs a local Mathematica or Wolfram Engine with `wolframscript`. The comparison runs the
**original code itself** — the definitions and the Manipulate body stored in the author notebook —
headless, for many scenes, and compares its numbers with the port's.

```bat
where wolframscript                                   :: find it (PowerShell: Get-Command wolframscript)
npm run compare:original                              :: 5 saved states + 20 named + 40 random scenes
npm run compare:original -- --random=200 --seed=7     :: more random scenes
npm run compare:original -- --history                 :: also the "after a drag" variant of each scene
npm run compare:original -- --images --only=A1,B1,C1  :: pictures: original (PNG) next to port (screenshot)
npm run compare:original -- --history --jobs=4        :: 4 Mathematica kernels in parallel (licence permitting)
npm run compare:original -- --trace=C2,C3             :: diagnostics: where exactly do port and original part ways?
npm run compare:original -- --wolframscript="C:\Program Files\Wolfram Research\WolframScript\wolframscript.exe"
```

How it works
1. `tools/compare-with-original.mjs` writes the scenes to `test-output/compare-original/scenes.json`
   (coordinates as exact fractions `m/2^k`, so Mathematica gets the identical doubles).
2. It calls `wolframscript -file tools/wolfram/mp-original.wls <notebook> <scenes> <results>`. The
   script reads the notebook without evaluating it, takes the stored `Initialization` and `"Body"`,
   evaluates the definitions, and for every scene sets the Manipulate variables the way the front end
   would and evaluates the body. The only change to the original code is instrumentation: the final
   `Graphics[…]` is wrapped so the body's local variables (path, validity, C-obstacles, …) are
   copied out, and messages are collected instead of silenced. Reals are written with 20 digits from
   their exact binary value (bit-exact transfer back to JavaScript).
3. The port (`planner.js`) and the independent reference planner run on the same scenes.

Read `test-output/compare-original/report.md`:
- **Harness self-check** — the notebook contains results the original computed when it was saved;
  the harness must reproduce them in your Mathematica. If this FAILS, fix the harness or note the
  Mathematica-version difference before trusting anything else in the report.
- **Verdict per scene**: `identical` (bit for bit), `last-bit` (only rounding-level differences),
  `DIFFERENT` (validity, route, lines or shapes differ: a port fault, or a behaviour that depends on
  the Mathematica version), `original-error` (timeout or error in the original).
- **Reference checks** — paths through obstacles, detours, missed paths, validity disagreements;
  `inherited` means the original shows the same problem (report it as a property of the original
  algorithm that the port reproduces), `port only` means the port is at fault.
- **Messages** the original produced (e.g. the `First::normal` case the port treats as "no path").

**Trace mode** (`--trace=ID,…`) records every call of the original's functions (and of the built-ins
`Det`, `VectorAngle`, `Norm`, `ArcTan`, `EuclideanDistance`) in the given scenes, replays each call through
the port's function with the same arguments, and reports per function how many results differ and where
the first difference occurs (`test-output/compare-original/trace-report.md`). It also evaluates those
built-ins on a few thousand seeded probe arguments and scores alternative formulas (e.g. `a*d - b*c` versus
an LU decomposition for `Det`) — the formula with 0 mismatches is the one Mathematica uses. This is how a
remaining difference is traced to its root cause instead of guessed. Section 1d of the report lists a few
free-form Wolfram Language checks (`WL_CHECKS` in the tool), used for questions that are not about one
built-in, such as how Mathematica compares a 3-digit number with a machine number.

Limits: the harness evaluates the stored code in a fresh kernel, not in the front end, and it clears
the original's change-detection caches before every scene (`--history` adds the drag variant); the
pictures (`--images`) need the Wolfram front end and are for human review only.

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
