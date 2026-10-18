# Testing guide

Six layers. Run them in this order; each one catches problems the others cannot.

| Layer | Command | Needs | What it proves |
|-------|---------|-------|----------------|
| 1. Unit & property tests | `npm test` | Node | the math functions behave correctly on hand-derived cases and random cases checked by an independent oracle |
| 2. Golden parity tests | `npm test` (same run) | Node | the port reproduces numbers **computed by the original Mathematica code** (cached in the .nb files) |
| 3. Browser tests | `npm run test:e2e` | Firefox, Chromium and WebKit (Playwright builds) | controls exist and work, the screen shows what the math computed, drag/keyboard interaction, error-free load |
| 4. Manual / exploratory | `docs/MANUAL_TEST_CHECKLIST.md`, `docs/checklists/`, `docs/MATHEMATICA_CHECKS.md`, `npm run test-run -- <dir>` | a person, a browser, ideally the original running in Mathematica | look & feel, behaviour compared with the original, things no script can judge |
| 5. Automated comparison with the original (motion planning) | `npm run compare:original` | local Mathematica / Wolfram Engine (`wolframscript`) | the port computes the same validity, C-obstacles, lines, path and trajectory as the **original code run live**, on many scenes, not only the 5 saved ones |
| 6. Mathematica harness (any definition notebook) | `npm run harness` | local Mathematica (`wolframscript`), the original notebooks in `_internal/originals/` | the original's stored Manipulate code, run headless for scripted control changes, produces the numbers the ports' golden tests compare with (`tests/golden/<dir>.harness.json`) |

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
   npx playwright install firefox chromium webkit
   ```
   The second command downloads Playwright's own builds of Firefox, Chromium and WebKit (~100 MB each). Tests
   drive those builds, not your installed browsers; your installed Firefox is for manual testing.

## Layer 1 + 2: `npm test`

Runs `tests/unit/*.test.js` and `tests/golden/*.test.js` with Vitest. Takes a few seconds.

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

### The seven newer apps (added in v0.1.12)
Their unit tests are `tests/unit/<app>.test.js` (plus `prm-core.test.js` for the code the two PRM apps share), their
golden tests `tests/golden/<app>.golden.test.js`. Their originals are Wolfram "definition" notebooks, which store their
snapshots as pictures (`docs/original-snapshots/`) and **one** live Manipulate state each
(`tests/golden/<app>.original-state.json`). Each snapshot cell also stores the full Manipulate state behind its
picture (`TaggingRules -> {"Settings" :> {…}}`, found 2026-10-12; 36 states in the seven notebooks). Since v0.1.14
`tools/extract_state.py --snapshots` reads them, together with the live state and the initial settings, into
`tests/golden/<app>.original-states.json`, and the golden tests "<app>: snapshot k: …" load each one into the port's
model (format below). More states come from saving the original after moving its
controls
(`tests/golden/<app>.owner-state-1.json`, saved in Mathematica 15.0.1) and extracting them:
```bat
python tools\extract_state.py path\to\Notebook.nb tests\golden\<app>.owner-state-2.json
```
The extractor writes every live Manipulate state it finds in the notebook; the golden tests use `states[0]` unless told otherwise.

#### Snapshot fixtures: `tests/golden/<app>.original-states.json`
Written by `python tools\extract_state.py --snapshots path\to\Notebook.nb tests\golden\<app>.original-states.json`
(the notebooks themselves are private and not in the repository). The default mode without `--snapshots` is unchanged
(its output is pinned in the self-test). Keys:
- `states[0]` — the live state of the Manipulate output cell (what the notebook shows when opened);
- `specs` — the initial settings, i.e. the Manipulate's stored `"Variables"` (restored by ⊕ → Initial Settings);
- `snapshots["k"]` — the `"Settings"` of snapshot cell k, k = 1, 2, … in file order = picture
  `docs/original-snapshots/<app>-k.png`; `snapshotCellIds["k"]` — its `CellID`;
- `source`, `note`, `format` — provenance and the number format below; `packedTypes` (only where it occurs) — the JSON
  pointer of each decoded packed array that the notebook stored with a narrower element type, and that type
  (e.g. `"UnsignedInteger8"` for `CompressedData` tag `b`).

Values: variable names without context and `$$`, Greek letters as Unicode (`θ1`); strings, `true`/`false`, `null`, lists;
symbols as `{"sym": name}`, other expressions as `{"head": name, "args": [...]}`; `CompressedData` decoded (incl. packed
integer arrays stored as unsigned bytes, tag `b`, in `tools/mdecode.py`). Numbers keep their Wolfram kind, in the same
encoding as the harness records (HW-45):
- a JSON integer (`2`) is an exact Wolfram integer, written plainly while |x| ≤ 2^53 − 1 (`Number.isSafeInteger`);
  larger integers are `{"wl": "<digits>"}` without a double;
- a JSON number with a decimal point or an exponent (`2.0`, `0.34900000000000003`, `1e-05`) is a machine real, bit-exact:
  the Wolfram text (`1.23`, ``1.23` ``, ``1.2246467991473532`*^-16``) is read with correct rounding and written as the
  shortest text that reads back as the identical double;
- any other exact number is `{"wl": "<a Wolfram-readable form>", "n": <its double>}`: `{"wl": "1/2", "n": 0.5}`,
  `{"wl": "-Pi/2", "n": -1.5707963267948966}`, `{"wl": "3*Pi/2", "n": 4.71238898038469}`, arbitrary-precision reals
  (``{"wl": "1.5`20.", "n": 1.5}``), unevaluated functions such as `Cos[5*Pi/32]`, and `{"wl": "Infinity"}` (no `n`).
  The `wl` text reads back as the same exact value but is not necessarily Mathematica's InputForm (`3*Pi/2` where
  InputForm writes `(3*Pi)/2`), so exact values are compared by value, not by text. `n` is the correctly rounded double
  for a rational or a rational multiple of π (Mathematica's own `N` may differ in the last bit). Readers also accept the
  older name `value` for `n`.

`JSON.parse` gives the same double for `2` and `2.0`; `tools/lib/wl-json.mjs` has `plain()` (exact objects → doubles),
`isIntegerLiteral()` (was this number written as an exact integer?) and `loadStates()`. Checks:
`python tools\extract_state.py --self-test` (synthetic notebook, no private notebook needed; `npm test` runs it when a
Python 3 interpreter is found, else skips it) and `tests/unit/extract-state.test.js` (one snapshot per picture, live state
equal to the older `<app>.original-state.json`, nothing left unparsed). A test that finds the port disagreeing with a
snapshot is marked `it.skip` with the `K-` lead that explains it (the port is not changed to match without a design
decision).
Questions only Mathematica can answer are collected as `K-` leads in each DESIGN.md and checked with plain Wolfram
Language scripts: `wolframscript -file tools\wolfram\extra-checks.wls` and `extra-checks-2.wls` (they write
`test-output\extra-checks*.txt`). An automated `compare:original` (layer 5) exists only for motion planning.

Numbers across engines: bit-exact comparisons only where the arithmetic is exact; elsewhere decisions are compared
exactly (collision yes/no, chosen path word, graph edges) and coordinates with a tolerance.

## Layer 3: `npm run test:e2e`

Starts `tools/serve.mjs` on port 8090 automatically and runs `tests/e2e/*.spec.js` in Firefox,
Chromium AND WebKit (three Playwright projects; `npm run test:e2e:firefox` / `test:e2e:chromium` /
`test:e2e:webkit` run one). `npm run publish:tested` requires all three to pass (WebKit since v0.1.10).

**WebKit** (the engine of Safari): `npm run test:e2e:webkit` runs the same tests in Playwright's WebKit
build (since v0.1.9). It is not Safari: on Windows and Linux it is a separate WebKit port with its own
graphics stack, fonts and WebGL, so a pass means "works in the WebKit engine", not "works in Safari on a
Mac or iPhone" — report it as *WebKit (Playwright)*. It passed 45/45 on its first run on the owner's
machine (v0.1.9) and is required by `publish:tested` since v0.1.10. A real-Safari check (macOS/iOS)
remains a manual test.

**Writing browser tests that hold in all three engines** (lessons of the owner's Firefox and WebKit runs, v0.1.15 and
v0.1.16; Chromium alone passed every time):
- Pointer moves are applied once per animation frame (`shared/svg-plot.js` locators; apps that evaluate in
  `requestAnimationFrame`). After `page.mouse.move` or a typed value, wait for the frame with `expect.poll(…)` instead
  of reading the state at once — WebKit had not run the frame yet and returned an earlier sample. After
  `page.mouse.up` the last pending position is applied at once.
- Do not assume every intermediate pointer event of a drag arrives: assert ranges that hold for any subset.
- Never aim within a few pixels of a snapping boundary or a slider end; aim at the middle of the target position, or
  move past the end of the track (the control clamps).
- Never expect the last bit of `Math.sin`/`Math.cos`/`Math.exp` (they differ between engines); allow ±2 per colour
  channel in pixel checks.
- Native keyboard behaviour of form controls is not the same everywhere: WebKit's vertical range input sends Home to
  the maximum (the top). `shared/ui-extra.js` therefore handles Home/End of its vertical slider itself (Home = minimum,
  End = maximum); check such keys in a test of their own.

- Results: terminal + HTML report (`npm run report`).
- `test-output/review-screenshots/<firefox|chromium|webkit>/*.png` — screenshots of every original snapshot state
  and other key states, **for human side-by-side comparison** with the original's snapshots.
  They are not compared automatically (pixel comparison across machines/GPUs is unreliable).
- Parallel: 6 browser workers by default (tests are independent). Change with the `PW_WORKERS`
  environment variable, e.g. `set PW_WORKERS=12` (Command Prompt) before `npm run test:e2e`, or
  `set PW_WORKERS=1` to debug one test at a time.
- Headed (watch it happen): `npm run test:e2e:headed`.

**Standalone bundles** (`tests/e2e/bundle.spec.js`, owner rule R-A, since v0.1.15): one test per app of
`tests/e2e/apps.js` (new apps are included automatically), titled "bundle: <dir> runs from its own folder". It bundles
the app with `tools/bundle-app.mjs` into `test-output/bundle-e2e/<browser>/<dir>/`, serves that folder **alone** with
`tools/serve.mjs` on a free port (a second server, next to the one on port 8090), opens the bundle's root page and
requires: the root page opens the app, the app starts (`window.__demo.ready`) without page errors, no request leaves
the bundle folder, no request fails (404s count), every script and stylesheet in the bundle was loaded (nothing
superfluous), and the app's "All demos" link reaches the bundle's root page. One page load per app and browser.
Run only these: `npx playwright test tests/e2e/bundle.spec.js` (add `-g "bundle: prm runs"` for one app).
The unit tests in `tests/unit/bundle-app.test.js` cover the collector on a small synthetic site (CSS `url()`,
`@import`, the import map, dynamic imports, a missing file, wrong letter case, non-literal imports), the licence lookup,
the zip writer, `tools/serve.mjs` with a root folder, and check that the contents table in each `DESIGN.md` §6.1 is
current (after a change of imports: `npm run bundle -- --update-docs`).

> Status: v0.1.0 was first run in Firefox (Playwright's Firefox 155) on Windows 10 on 2026-10-03 —
> 38/38 passed. It had previously been run only in Chromium in the AI tool's sandbox. Any later
> failure is a finding — record it.

## Layer 4: manual testing

The items are in `docs/MANUAL_TEST_CHECKLIST.md` (general items and the first three apps) and
`docs/checklists/<dir>.md` (the seven newer apps). Every item that involves the original notebook is an operator
procedure with the fixed headings Open / Prepare / Do / Record / Save / Port / Expected (owner rule R-B,
`docs/DESIGN_PROCESS.md` rule 8); the general procedure — starting Mathematica 15.0.1, Enable Dynamics, the ⊕ menu
and Initial Settings, invisible locators, how long to wait, saving states as golden data, what to do on errors, how
to send results back — is written once in [`docs/MATHEMATICA_CHECKS.md`](MATHEMATICA_CHECKS.md).

Results go into one test-run file per app and day, created from the template:
```bat
npm run test-run -- car-paths      :: writes _internal\test-runs\<today>_car-paths.md (never overwrites; --force to replace)
npm run test-run -- general        :: the M-GEN items
```
`tools/new-test-run.mjs` lists every `M-` item of the app with its Record instructions and empty Original / Port /
Result fields; `tests/unit/new-test-run.test.js` checks the generator and that every item has the fixed headings.
Completed test-run files and saved notebooks (`_internal\originals\saved\`) stay private in `_internal/` and are sent
back as a zip (MATHEMATICA_CHECKS.md §11). Where a check shows that the ORIGINAL is probably wrong (not just
unusual), the finding goes into §11 *Errors in the original* of the app's DESIGN.md.

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

## Mathematica harness

### What it is

`tools/wolfram/manipulate-harness.wls` generalises `mp-original.wls` (layer 5) to **any** definition notebook. It
reads the notebook without evaluating it, finds the Manipulate output cell, evaluates its stored `Initialization`
once and then, for each scenario, assigns the Manipulate's variables the way a control would (`set`, `drag` through
the control's own Dynamic setter, `press` of a stored button, `seed`, `settle`, `setFrom` a snapshot), evaluates the
stored `Body` and records what it computed: the variables, the Body's local variables (copied out at the exit of their
scope), graphics with every number, texts, messages, random draws and timings. Reals travel both ways bit for bit
(JSON numbers read lexically by `tools/lib/json-lexical.mjs`, so `1.0` and `1` stay a real and an integer). The design
and its requirements (HW-01…HW-77) are in the HARNESS-WL design document of batch A/B; the code cites them.

The scenarios come from the apps' TESTPLANs (lines starting with `{"id":"H-`) and are committed as
`tests/harness/<dir>.scenarios.json` (16 apps, 314 scenarios, plus `motion-planning.scenarios.json`, five scenarios
equivalent to `mp-original.wls`'s saved states for the parity check HW-72).

| File | Role |
|---|---|
| `tools/wolfram/manipulate-harness.wls` | the harness (runs in Mathematica) |
| `tools/run-harness.mjs` (`npm run harness`) | finds `wolframscript` and the notebook, writes the wire file, runs, checks the input echo, prints a summary |
| `tools/harness/extract-scenarios.mjs` | TESTPLAN lines → `tests/harness/<dir>.scenarios.json` (`--check` compares with the committed files) |
| `tools/harness/check-scenarios.py` | static check of scenario files against the notebooks without Mathematica: names, Body scopes, labels, `ctl:` indices, snapshot numbers → `test-output/harness/<dir>.index.json` |
| `tools/harness/check-wls.mjs` | static structure check of the `.wls` scripts (brackets, strings, escapes, argument counts, statement ends) |
| `tools/harness/apps.mjs` | app → notebook file name (and SHA-256 of the download the scenarios were written for) |
| `tests/support/harness-json.js` | read `tests/golden/<dir>.harness.json` in a port's golden tests (skips while there is no data, detects stale data) |

### Owner commands (Windows, Command Prompt, in the repository folder)

The notebooks are looked up by file name in `_internal\originals\` and `_internal\originals\batch-ab\` (or pass
`--originals=FOLDER`). `wolframscript` is taken from PATH or the standard install folders (or pass
`--wolframscript="C:\Program Files\Wolfram Research\WolframScript\wolframscript.exe"`).

```bat
npm run harness -- --all --smoke          :: 1. first run (a few minutes): reads every notebook, evaluates the Initialization and the initial settings once
npm run harness -- --all --self-check     :: 2. initial settings, live state and every snapshot evaluated once; lists what changed
npm run harness -- motion-planning --parity   :: 3. harness vs mp-original.wls on the five saved states (HW-72)
npm run harness -- rrt                    :: 4. one app's scenarios (or --all); --only=H-RT-03 repeats one scenario
npm run harness -- rrt --fresh-kernel --jobs=2   :: one kernel per scenario (determinism check, HW-71)
npm run harness -- rrt --diff             :: compare a run with the accepted golden file (timings ignored)
```

Each kernel run has a wall-clock limit (smoke 15 min, self-check 30 min, scenarios: number of scenarios × time limit
+ 10 min; change it with `--app-timeout=MIN`); a run over the limit is killed and the next app starts. The stored
Initialization has its own limit (`--init-time-limit=SEC`, default 600). The first console line shows the mode
(`MODE: smoke`), and the harness echoes it (`HARNESS-MODE: smoke`); a mismatch fails the app. If the harness stops
before it reads the first notebook, the other apps are not started: that is a problem of the script, so send the log.

Results go to `test-output\harness\`: `<dir>.smoke.json`, `<dir>.self-check.json`, `<dir>.harness.json` (with
`<dir>.harness.partial.jsonl` written scenario by scenario, so a crash keeps everything finished), a console log per
run (`<dir>.<mode>.log`) and `summary.<mode>.txt`. **Zip the whole `test-output\harness` folder and send it back**,
also (especially) when something fails. `--accept` (run by the AI in a later delivery) copies a checked run to
`tests/golden/<dir>.harness.json` (gzipped above 10 MB) and refuses unless a self-check with the same harness, notebook
and Mathematica version passed and every echoed input number is bit-identical to the scenario file.

**Status (v0.1.18).** Harness run 2 (owner, Mathematica 15.0.1, 2026-10-18) is accepted for all 16 batch A/B apps:
`tests/golden/<dir>.harness.json`; H-ME-11, rewritten after a prelude failure in run 2, was recorded in run 3 (the same
day), so all 314 scenarios have data. Every `harness "H-…"` golden test now compares the port with the original's recorded values; where
the port still differs on purpose, the test asserts the recorded difference and names the proposal (P-) in the app's
DESIGN.md. The numerics rules the run settled (division, sums, Dot, N of exact angles, Normalize, Total, Chop, Nearest,
Sort) are listed in each app's K- entries.

### What the AI checks without Mathematica

`npx vitest run` covers the lexical JSON, the extractor, the schema of every scenario file, the runner's wire format,
echo check, summaries and diffs, the golden-data helper, and the `.wls` structure check (which must pass on the harness
and on `mp-original.wls` and fail on deliberately broken copies). With the private notebooks present
(`HARNESS_ORIGINALS` or `_internal/originals/`) it also runs `check-scenarios.py` on all 16 apps. The end-to-end test of
the runner (`tests/unit/harness-runner-e2e.test.js`, with a fake `wolframscript`) is **skipped on Windows** (the fake is
a shebang script); it runs on Linux and macOS.

### What stays manual

Everything the front end does and the kernel cannot see (HARNESS-WL §3): which locator a press grabs, how many updates
a drag produces, whether the front end re-evaluates after the Body changed its own variables (the `settle` step gives
the fixed point, `{"set":{}}` one more update — which rule the front end follows is a manual check), `ControlActive`
timing, animation, `DynamicEvaluationTimeout`, Dynamic content of the control area, rendering and fonts. These stay in
the per-app checklists `docs/checklists/<dir>.md` (`M-…` items). Pictures (`--images`) need the front end and are for
human review only.

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
- Manual tests: `M-<demo>-NN`; errors in the original: `E-<demo>-NN` (DESIGN.md §11).
- Automated tests are referenced by file + test title.
Demo codes: `MP` motion planning, `TP` three parametrizations, `EA` Euler angles, `GEN` general.
