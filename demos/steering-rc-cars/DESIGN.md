# Design document: Steering Multiple Radio Control (RC) Cars with One Joystick

| | |
|---|---|
| Code version: | 0.1.27 |
| Document revision | 3 (2026-10-26) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Steering Multiple Radio Control (RC) Cars with One Joystick", contributed by Aaron T. Becker and Javier Garcia, published 2018-03-14 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SteeringMultipleRadioControlRCCarsWithOneJoystick/> Source as text: [`docs/original-source/steering-rc-cars.txt`](../../docs/original-source/steering-rc-cars.txt); snapshots `docs/original-snapshots/steering-rc-cars-1…5.png`; saved states `tests/golden/steering-rc-cars.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values, `snapshots` the five snapshots' settings) |
| Port files | `model.js` (the Initialization definitions — collision radius and meeting points, the three robot pictures — and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.24): generator, `shared/wl.js`, `shared/graphics.js`, plain arithmetic; the first port whose body reads the clock |

## 1. Purpose and background

n robots receive the same commands (one radio frequency, one magnetic field): when car 1 is steered along a path,
every other car drives the same path, turned by the difference of its heading from car 1's and started from its own
position (Bretl 2007). Two robots i and j with different headings can meet at exactly one place
p<sub>i,j</sub>; the set of commands that brings them closer than 2r (r the robot radius) is a disk of radius
2r/√(2 − 2 cos(θ<sub>j</sub> − θ<sub>i</sub>)). In **setup** the gray disks show where pairs can collide (drag the cars
and their heading handles); in **running** the single locator is a joystick: car 1 drives toward it in real time,
the others follow, and the gray disks show where car 1 must be for a pair to collide, so a path of car 1 that
avoids every disk is collision-free for all cars. The robots can be drawn as RC cars, Tetrahymena cells or Janus
particles (the global field's direction is the cells' marker and the particles' green half).

## 2. Scope

In scope: the original's controls, picture and behaviour, including the real-time driving in running mode, with the
notebook's saved state as the opening state. Out of scope: anything the original does not do; port additions are the
A- features.

## 3. Users and use cases

- UC-SR-01: a student places four cars and their headings in setup and watches how the collision disks move.
- UC-SR-02: a student switches to running and drives car 1 around every gray disk with the joystick, so that no two
  cars ever collide (the Details' collision-free path).
- UC-SR-03: a teacher shows the same model for micro-robots (cells, particles) and a reproducible random start
  (`?seed=N`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SR-01 | Slider *n* `{{n, 4, Style["n", Italic]}, 2, 10, 1, Appearance -> "Labeled", Enabled -> (mode === "setup"), ImageSize -> 100}`; in setup a new n (n ≠ nold) draws n new robots: positions `RandomReal[{-.9, .9}, {n, 2}]`, headings `RandomReal[2π, n]`, empty path, handles; the page's random source (`?seed=N`) | the number of robots | v0.1.24 | unit "a new n (n ≠ nold, setup)"; e2e "the n slider makes new random cars (seeded)"; e2e "n is disabled" |
| F-SR-02 | Slider "radius" `{{rad, .143, "radius"}, .01, .5, .0001, ImageSize -> 100, Appearance -> "Labeled"}`: the robot radius r (pictures, collision radii, handle and arrow lengths) | the robots' size | v0.1.24 | unit "collisionRadius"; M-SR-05 |
| F-SR-03 | Setup: the Locator variable `loc` = the n positions and the n heading handles (2n locators, Mathematica's default glyph); a position locator moves its robot (ps = loc[[1;;n]]), its handle follows; moving robot 1 translates the path | placing the robots | v0.1.24 | unit "setup: a position locator moves its robot"; e2e "setup: dragging a car moves it and its handle" |
| F-SR-04 | Setup: when no robot moved, every heading is `ArcTan` of its handle; the handles snap back to distance 0.5·10^(range/2)·rad; turning robot 1 turns the path about robot 1 | setting the headings | v0.1.24 | unit "setup: a handle turns its robot"; e2e "dragging a handle turns the car" |
| F-SR-05 | Setter "mode" {setup, running}; switching to running makes `loc` one point at robot 1 (one locator: the joystick), runner = loc, runnerθ = θ₁ | the two modes | v0.1.24 | unit "switch to running"; e2e "running: one locator (the joystick)" |
| F-SR-06 | Running: while loc ≠ runner, runnerθ = ArcTan toward loc, dt = AbsoluteTime[] − lastTime clamped to [0.01, 0.1], the runner moves min(distance, dt) toward loc and is appended to the path; the body evaluates again until the runner arrives (Manipulate re-evaluates a body that changes its own variables) | real-time driving | v0.1.24 | unit "running: the runner moves min(distance, dt)"; e2e "the cars drive toward it in real time and stop there" |
| F-SR-07 | Running: robot i is drawn at p<sub>i</sub> + R(θ<sub>i</sub> − θ₁)(runner − p₁) with heading θ<sub>i</sub> + runnerθ − θ₁; the gray disks are `collisionDelta[θ₁, θ_i, θ_j, p₁, p_i, p_j]` (where car 1 must be for i and j to meet) | the common command | v0.1.24 | unit "running: every robot follows the same command"; unit "collisionDeltaRef" |
| F-SR-08 | Switching back to setup: the robots start where they stopped, headings turned by runnerθ − θ₁, handles first at 1.5·10^(range−1)·rad, then snapped; the path is kept | continuing from the driven state | v0.1.24 | unit "switch back to setup"; e2e "running: one locator (the joystick)" |
| F-SR-09 | Setter "robot" {RC car, cell, particle}: `drawRC` (axles, wheels, body, wings, cockpit in `ColorData[97]`, turned about its bounding box's centre), `drawCell` (green rounded body turned to the heading, red/white marker turned to θ₁ or runnerθ), `drawParticle` (red disk, green half on θ ± π/2) | the three robot models of the Details | v0.1.24 | unit "drawRC"; unit "drawCell"; e2e "the robot setter draws cells and Janus particles" |
| F-SR-10 | Slider "range" `{{range, 1}, 1, 2, 0.001, Appearance -> "Labeled", ImageSize -> 100}`: PlotRange 1.2·10^(range−1)·({−1, 1} + offset), arrows 0.85·10^(range/2)·rad, handles 0.5·10^(range/2)·rad | zoom | v0.1.24 | unit "range and offset set the PlotRange"; e2e "range and offset change the plot range" |
| F-SR-11 | 2D slider "offset" `{{offset, {0, 0}}, {-1, -1}, {1, 1}}`: moves the plot range | pan | v0.1.24 | unit "range and offset set the PlotRange"; M-SR-05 |
| F-SR-12 | The picture (`ImageSize -> {420, 420}`, `Axes -> False`): per pair i < j a gray disk (Opacity 0.5) of radius `collisionRadius` at the meeting point, its centre point and the label "i,j" (size 10) at +0.5 rad; the paths (Thick, ColorData[97]); the robots from n down to 1 with their numbers (size 12, {Left, Bottom} at +0.7 rad) and blue Thick heading arrows; opening state = the notebook's saved state | the original's drawing | v0.1.24 | unit "the picture of the opening state"; unit "evaluating the saved state reproduces it exactly"; e2e "loads without errors and draws the saved state"; M-SR-02 |
| F-SR-13 | The five snapshot settings (setup; running at the start, radius 0.1967; setup, radius 0.2177; particles; cells) give the snapshot pictures | the original's examples | v0.1.24 | unit "the notebook's five snapshot settings"; e2e "review screenshots at the five snapshot settings"; M-SR-09 |
| F-SR-14 | Caption and Details text (from the Demonstration) with the meeting-point formula and three references | the original's explanation | v0.1.24 | M-SR-01 |
| F-SR-15 | `collisionRadius[θ1, θ2, r] = 2r/√(2 − 2 cos(θ1 − θ2))` and `collisionDelta[θ1, θ2, p1, p2]` (the Details' p<sub>i,j</sub>) in setup | where two robots can meet | v0.1.24 | unit "collisionDelta: the one place p_ij"; unit "collisionRadius" |
| A-SR-01 | "Initial settings" restores the Manipulate's own initial values (n = 4, nold = 5, radius 0.143, setup, RC car, range 1): four new random cars, as Mathematica's Initial Settings | Manipulate's Initial Settings | v0.1.24 | e2e "Initial settings: the Manipulate's initial values"; M-SR-06 |
| A-SR-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, setRng, setClock) from the Manipulate layer | automated tests | v0.1.24 | e2e "setup: dragging a car moves it and its handle" |
| A-SR-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.24 | e2e "start-up notice when" |
| A-SR-04 | Breadcrumb link to all demos | navigation | v0.1.24 | inventory |
| A-SR-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.24 | e2e "attribution on" |
| A-SR-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.24 | e2e "bundle: steering-rc-cars runs from its own folder" |
| A-SR-07 | `?seed=N` in the address makes new random robots reproducible (seeded random source) | repeatable examples and tests | v0.1.24 | e2e "the n slider makes new random cars (seeded)"; unit "a new n (n ≠ nold, setup)" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-n` | F-SR-01 |
| `value-n` | F-SR-01 |
| `plus-n` | F-SR-01 |
| `play-n` | F-SR-01 |
| `stepback-n` | F-SR-01 |
| `stepfwd-n` | F-SR-01 |
| `slider-rad` | F-SR-02 |
| `value-rad` | F-SR-02 |
| `plus-rad` | F-SR-02 |
| `play-rad` | F-SR-02 |
| `stepback-rad` | F-SR-02 |
| `stepfwd-rad` | F-SR-02 |
| `setter-mode-setup` | F-SR-05 |
| `setter-mode-running` | F-SR-05 |
| `setter-robot-*` | F-SR-09 |
| `slider-range` | F-SR-10 |
| `value-range` | F-SR-10 |
| `plus-range` | F-SR-10 |
| `play-range` | F-SR-10 |
| `stepback-range` | F-SR-10 |
| `stepfwd-range` | F-SR-10 |
| `pad-offset` | F-SR-11 |
| `value-offset-x` | F-SR-11 |
| `value-offset-y` | F-SR-11 |
| `locator-loc*` | F-SR-03 |
| `reset` | A-SR-01 |
| `crumbs` | A-SR-04 |
| `details` | F-SR-14 |
| `credits` | A-SR-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names — `collisionRadius`, `collisionDelta` (4
  arguments), `collisionDeltaRef` (the 6-argument `collisionDelta`), `distPt2Pt`, `drawRC`, `drawCell`,
  `drawParticle`, `drawRobot` — and `evaluate(state, { rng, time })` → `{ state, view, graphics }`: the body line by
  line (the mode switch, setup, running), its assignments to Manipulate variables returned in `state`; Mathematica's
  `!=` on reals is `Unequal` of `shared/wl.js` (v0.1.25; before: `mUnequal` of `shared/mma.js`, the same function) (equality within the last seven bits), so that "the runner has
  arrived" and "nothing moved" mean what they mean in the original. `SAVED` (the live state) is the opening state,
  `SPECS` (the Manipulate's stored initial values) what Initial settings restores; `settles(state)` = running and
  loc ≠ runner. `view` reports the pairs, the disks, the drawn robot centres and headings, the step dt and the plot
  range for the tests.
- `main.js`: one `Manipulate({…})` — the original's control specs (hidden variables as `None` controls, the Locator
  `loc`), `random: true`, `clock: true` (the body's `time` is AbsoluteTime[]), `settle: settles`,
  `initialSettings`.
- The picture is drawn with `UpdateFrame` so that a new range or offset makes it again with the new plot range
  (Mathematica's PlotRange follows the variables).
- Shared code added for this port (v0.1.24, MIT): the Manipulate layer's clock (`clock`, `absoluteTime`, hook
  `setClock`), Locator variables whose value changes between one point and a list of points (setup ↔ running), sector
  disks `Disk[c, r, {a0, a1}]` (the particles' green half) and Opacity on points and text (the gray labels).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- steering-rc-cars` → `dist/steering-rc-cars/`.
- Contents (generated with `node tools/bundle-app.mjs steering-rc-cars --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/steering-rc-cars/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/steering-rc-cars/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: steering-rc-cars runs from its own folder" (A-SR-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-SR-01: new robots come from the page's random source, not Mathematica's `RandomReal` stream; the opening robots
  are the notebook's own.
- D-SR-02: for two robots with exactly equal headings the original's disk has an infinite radius and its centre
  involves Cot[0] (no meeting point; Mathematica cannot draw such a disk); the port leaves that pair's disk out. Only
  exactly equal headings are affected.
- Q-SR-01: Initial settings gives four new random cars, not the opening picture: the Manipulate's initial values have
  n = 4 but nold = 5, so the first evaluation re-randomizes (as in Mathematica).
- Q-SR-02: the speed depends on the evaluation rate: each evaluation moves the runner by the clock time since the last
  one, but at least 0.01 and at most 0.1; on displays faster than 100 frames per second the cars drive faster than
  one unit per second, and a drag adds evaluations (each at least 0.01).
- Q-SR-03: the path gets one point per evaluation and is never shortened while the page is open (only a new n clears
  it).
- Q-SR-04: in setup every evaluation in which no robot moved recomputes all headings from the handles (`ArcTan`),
  so headings are shown in (−π, π] (new robots' `RandomReal[2π]` headings are re-read at once).
- Q-SR-05: the robots are drawn from n down to 1 (robot 1 on top); Opacity 0.5 fades the disks, their points and the
  pair labels alike.
- N-SR-01: the locators are the Manipulate layer's glyphs (Mathematica's default locator) at `loc`; the original draws
  `Locator` primitives in the Graphics with the control's own glyph turned off — the same look and place. As in a
  Mathematica LocatorPane, a click on the picture moves the nearest locator there.
- N-SR-02: the snapshots 4 and 5 store radius 1/7 (exact). Since v0.1.25 a state given with exact numbers (as the
  saved states write them) shows "1/7" in the radius field until the slider is moved, as Mathematica does (e2e "an
  exact radius (1/7) is shown as 1/7"); v0.1.24 showed 0.142857.
- N-SR-03: the meeting points and radii were checked against the motion they describe: with the runner at a disk's
  centre the two cars are at the same place, on its circle exactly 2r apart (unit "collisionDeltaRef").
- N-SR-04: AbsoluteTime[] is counted in UTC here (Mathematica: the local time zone); only differences are used.
- N-SR-06: `distPt2Pt` is computed with `Math.hypot`, which does not underflow: with the plain square root a
  joystick placed exactly at the origin left the runner about 10⁻¹⁶³ away with distance 0, so it never arrived and
  the body kept evaluating (Mathematica switches to arbitrary precision there and arrives; unit "a joystick at the
  origin is reached too").
- N-SR-05: the RC car turns about the centre of its bounding box, (0.025 r, 0) from its position (Mathematica's
  `Rotate` without a centre), as in the original.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.23 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.24 | 2026-10-26 | the port: the original's controls, three robot pictures, collision disks, setup locators and real-time running mode in simple mode; opening state from the notebook |
| 3 | v0.1.25 | 2026-10-26 | `model.js` compares with `Unequal` of `shared/wl.js` (the same tolerant function as before, now under its Mathematica name); exact slider values from saved states shown as in Mathematica (N-SR-02, I-SR-03 done); the review screenshots set the snapshots' exact values; no change to behaviour or picture |
| 4 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (DOM parity with v0.1.25, except that a `Line` with no points is now an empty group instead of an empty polyline: nothing is drawn either way) |
| 5 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SR-01 | Drive by the clock alone (no 0.01 minimum per evaluation) | the same speed on every display and while dragging | differs from the original | Q-SR-02 |
| I-SR-02 | A button "clear path" | long drives stay readable | differs from the original | Q-SR-03 |
| I-SR-04 | Mark a collision while driving (a disk turns red when car 1 enters it, i.e. two cars touch) | shows the Details' point that a path avoiding every disk is collision-free | differs from the original; one test per pair and frame | F-SR-07 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the meeting point p<sub>i,j</sub> of the code equals the Details' formula, the
running-mode meeting point is p₁ − R(θ₁)(R(θ<sub>j</sub>) − R(θ<sub>i</sub>))⁻¹(p<sub>j</sub> − p<sub>i</sub>) as the
original's FullSimplify comment derives it, and the collision radius 2r/|R(θ<sub>i</sub>) − R(θ<sub>j</sub>)| =
2r/√(2 − 2 cos(θ<sub>i</sub> − θ<sub>j</sub>)) is right for disk robots of radius r (unit tests "collisionDelta",
"collisionDeltaRef").

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SR-01 | conceptual | `drawRC` and the collision model | the collision disks assume round robots of radius r, but the RC car picture reaches 1.10 r from its position (rear wing corners) and is turned about (0.025 r, 0): two car pictures can touch a little outside the gray disks | keeps the original's pictures and disks | either a smaller car picture or disks for radius 1.1 r; the disks would grow by about 10 % | kept |
| E-SR-02 | text | Details, reference [2] | the paper's title has a stray colon ("Many Magnetized: Tetrahymena Pyriformis Cells"; the published title reads "Many Magnetized Tetrahymena pyriformis Cells") | keeps the original's text | the title as published | kept |
