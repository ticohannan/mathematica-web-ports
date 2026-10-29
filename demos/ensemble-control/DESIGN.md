# Design document: Ensemble Control of Robots with Unicycle Kinematics

| | |
|---|---|
| Code version: | 0.1.28 |
| Document revision | 2 (2026-10-25) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Ensemble Control of Robots with Unicycle Kinematics", contributed by Aaron Becker, published 2014-10-03 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/EnsembleControlOfRobotsWithUnicycleKinematics/> Source as text: [`docs/original-source/ensemble-control.txt`](../../docs/original-source/ensemble-control.txt); snapshots `docs/original-snapshots/ensemble-control-1…4.png`; saved states `tests/golden/ensemble-control.original-states.json` |
| Port files | `model.js` (the Manipulate body: re-randomization, error, best command, both pictures as Graphics data; the button's action; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.23): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

Many robots with unicycle kinematics (position (*x*ᵢ, *y*ᵢ), heading *θ*ᵢ) all receive the same two commands: move
forward by *v*, or turn counter-clockwise. Each turn differs a little from robot to robot (noise), and these
differences are what make it possible to steer the whole ensemble to n goal positions on a circle — a control Lyapunov
function approach (Becker et al., IJRR 2014). The plot beside the robots shows the mean squared distance to the goals
as a function of the forward command *v*; its minimum *v*<sub>optimal</sub> (red) is the move that reduces the error
most. Moving by about *v*<sub>optimal</sub> and turning, again and again, brings the robots to their goals.

## 2. Scope

In scope: the original's controls, two pictures and behaviour, with the notebook's saved robots as the opening state.
Out of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-EC-01: a student drives two robots to their goals by hand: set the forward command near the red point, press
  "turn counter-clockwise", repeat.
- UC-EC-02: a student increases the number of robots and sees that one broadcast command still lowers the total error.
- UC-EC-03: a teacher shows a reproducible run (`?seed=N`) of new robots and turns.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-EC-01 | Slider "number of robots" `{{n, 2, "number of robots"}, 2, 15, 1, Appearance -> "Labeled"}` | the size of the ensemble | v0.1.23 | e2e "has the controls of the original"; e2e "the number of robots slider makes n new robots" |
| F-EC-02 | Hidden variables `nold, θinit, xinit, yinit, xGoal, yGoal, xpath, ypath` (`ControlType -> None`), written by the body and the button and returned by the model in `state` | the original keeps the robots in Manipulate variables | v0.1.23 | unit "a new n (nold ≠ n)"; e2e "Initial settings restores the opening state" |
| F-EC-03 | `If[nold != n, …]`: new headings `RandomReal[{-π, π}, n]` and positions `RandomReal[{-r, r}, n]`, goals `r {Cos[2π k/n], Sin[2π k/n]}`, k = 0…n−1, paths reset to the positions; the page's random source (`?seed=N`) | a new problem for each n | v0.1.23 | unit "a new n (nold ≠ n)"; unit "the goals"; e2e "the number of robots slider makes n new robots" |
| F-EC-04 | Slider "forward command" `{{vin, 0, "forward command"}, -r, r, Appearance -> "Labeled"}` (continuous): every robot is drawn moved by vin along its heading, the blue point follows | the broadcast forward command | v0.1.23 | e2e "the forward command slider (keyboard)"; unit "the picture" |
| F-EC-05 | Button "turn counter‑clockwise": positions += vin (cos θ, sin θ), appended to the paths, vin = 0, θ += π/3 + `RandomReal[{0, π/3}, n]` | the broadcast turn with noise | v0.1.23 | unit "the button"; e2e "the turn button moves the robots" |
| F-EC-06 | Left picture (`Graphics`, `ImageSize -> Medium`, `PlotRange -> 1.3 {{-r, r}, {-r, r}}`, r = 10): a white square 1.1 r; per robot k in `Hue[k/n]`: its path (Opacity 0.3, Thick), goal disk r/20, dashed heading line ±1.1 r, the robot at its position (Opacity 0.3) and the robot moved by vin; `DrawRobot` = white disk r/25, thick circle r/20, heading line r/15 | the original's drawing | v0.1.23 | unit "the picture"; unit "DrawRobot"; e2e "loads without errors"; M-EC-02 |
| F-EC-07 | Right picture: `Plot` of the mean squared error (1/n) Σ (xᵢ + v cos θᵢ − x_Goal)² + (yᵢ + v sin θᵢ − y_Goal)² for v ∈ [−r, r], `PlotStyle -> Thick`, `AspectRatio -> 2`, `Frame -> {True, True, False, False}`, FrameLabel "forward command", "sum squared error", automatic y range that follows the state | the guidance for the next command | v0.1.23 | unit "the mean squared error"; unit "the error plot range is automatic"; M-EC-03 |
| F-EC-08 | The plot's Epilog: red vertical line and red point at distBest = (1/n) Σ (x_Goal − x) cos θ + (y_Goal − y) sin θ (the minimum), blue point at vin | shows the optimal and the current command | v0.1.23 | unit "the best command"; unit "the picture"; e2e "loads without errors" |
| F-EC-09 | Opening state: the notebook's initial settings — n = 2 and its saved headings, positions, goals and paths, vin = 0 | the published state | v0.1.23 | unit "the opening state"; M-EC-02 |
| F-EC-10 | The four snapshot settings (n = 2; n = 11 with saved paths; n = 2 after nine turns; n = 2 with vin = −3.65) give the snapshot pictures | the original's examples | v0.1.23 | unit "snapshot"; e2e "review screenshots at the four snapshot settings"; M-EC-07 |
| F-EC-11 | Caption and Details text (from the Demonstration) with its two references | the original's explanation | v0.1.23 | M-EC-01 |
| A-EC-01 | "Initial settings" button restores the opening state (also the robots and paths) | Manipulate's Initial Settings | v0.1.23 | e2e "Initial settings restores the opening state" |
| A-EC-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, setRng) from the Manipulate layer | automated tests | v0.1.23 | e2e "the forward command slider (keyboard)" |
| A-EC-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.23 | e2e "start-up notice when" |
| A-EC-04 | Breadcrumb link to all demos | navigation | v0.1.23 | inventory |
| A-EC-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.23 | e2e "attribution on" |
| A-EC-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.23 | e2e "bundle: ensemble-control runs from its own folder" |
| A-EC-07 | `?seed=N` in the address makes new robots and turns reproducible (seeded random source) | repeatable examples and tests | v0.1.23 | e2e "the number of robots slider makes n new robots"; unit "a new n (nold ≠ n)" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-n` | F-EC-01 |
| `value-n` | F-EC-01 |
| `plus-n` | F-EC-01 |
| `play-n` | F-EC-01 |
| `stepback-n` | F-EC-01 |
| `stepfwd-n` | F-EC-01 |
| `slider-vin` | F-EC-04 |
| `value-vin` | F-EC-04 |
| `plus-vin` | F-EC-04 |
| `play-vin` | F-EC-04 |
| `stepback-vin` | F-EC-04 |
| `stepfwd-vin` | F-EC-04 |
| `button-turn` | F-EC-05 |
| `reset` | A-EC-01 |
| `crumbs` | A-EC-04 |
| `details` | F-EC-11 |
| `credits` | A-EC-05 |

## 6. Design

- `model.js`: `r`, `DrawRobot`, `goalsOf`, `meanSquaredError`, `bestCommand` (the original's formulas), `SAVED` (the
  notebook's initial settings) and `evaluate(state, { rng })` → `{ state, view, graphics }`: the body as written in the
  original — `If[nold != n, …]` is `rerandomize(state, rng)`, whose assignments are returned in `state`; the two
  pictures of the `Grid` are a list of two `Graphics` (the second made by `shared/plot.js` `Plot`).
  `turnCounterClockwise(s, rng)` is the button's action. `view` reports n, distBest, the errors at distBest and vin,
  the plot range and the moved positions for the tests.
- `main.js`: one `Manipulate({…})` — the original's control specs (the hidden variables as `None` controls),
  `ControlPlacement: 'Top'`, `random: true`, two pictures `graphic` and `graphic2`.
- `index.html`: the two picture containers side by side in a `.pictures` row (page CSS).
- The plot's frame and ticks are made again when its automatic y range changes (`UpdateFrame` of `shared/plot.js`).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- ensemble-control` → `dist/ensemble-control/`.
- Contents (generated with `node tools/bundle-app.mjs ensemble-control --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/ensemble-control/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/ensemble-control/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: ensemble-control runs from its own folder" (A-EC-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-EC-01: new robots and turns come from the page's random source, not Mathematica's `RandomReal` stream; the opening
  robots are the notebook's own.
- D-EC-02…05: (resolved in v0.1.23 before release by `shared/plot.js` and the layer) `PointSize[Large]` is an absolute
  7 px dot, `ImageSize -> {220, 300}` fits plot area and labels into 220 × 300 px, the Epilog is clipped to the plot
  range (PlotRangeClipping), and the axis at v = 0 is drawn inside the Frame without ticks — all as the original's
  options say.
- Q-EC-01: the goals depend only on n and are made again together with new random robots whenever n changes; going
  back to an earlier n does not restore its robots (`nold` is the only memory), as in the original.
- Q-EC-02: the plot is labelled "sum squared error" but shows the mean (the sum divided by n), as in the original
  (E-EC-01).
- Q-EC-03: the red line runs from 0 to 10¹² in the plot's coordinates, so it always spans the whole frame height.
- Q-EC-04: Hue[k/n] for k = n is red, the same as Hue[0]; the colours of the n robots are k/n, k = 1…n.
- K-EC-01: the automatic y range is padded by 5 % (Mathematica's looks about 6 % in the snapshots), and the automatic
  frame ticks are sometimes denser than Mathematica's (20, 40, … where snapshot 3 has 50, 100, …).
- N-EC-01: the snapshot values read off the original pictures (distBest and the error at vin) are reproduced within the
  reading accuracy (unit "snapshot values read off the pictures").

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.22 | 2026-10-25 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.23 | 2026-10-25 | the port: the original's controls, robots, error plot and button in simple mode; opening state from the notebook |
| 3 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 4 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 5 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (DOM parity with v0.1.25) |
| 6 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |
| 7 | v0.1.28 | 2026-10-29 | version number; the shared slider gained the option `pauseWhenHidden` (off by default; motion planning, PA2 fix F-02) plays and steps a stored value outside its range from the position shown, and stops a playing animation when the slider is disabled (it went on) (v0.1.28); no change to this app's code, behaviour or picture (DOM parity with v0.1.27) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-EC-01 | A button "move by v<sub>optimal</sub> and turn" (one step of the Lyapunov controller) and an autorun | shows the convergence the Details describe without manual steering | differs from the original | F-EC-05, F-EC-08 |
| I-EC-02 | Keep the robots of each n (going back to an earlier n restores them) | less surprise when the slider is moved by mistake | differs from the original (Q-EC-01) | Q-EC-01 |
| I-EC-03 | Named point sizes and the automatic plot-range padding of `shared/plot.js` as in Mathematica | D-EC-02 and K-EC-01 disappear | shared-library change | D-EC-02, K-EC-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the error S(v) is a quadratic in v with leading coefficient (1/n) Σ (cos² θᵢ +
sin² θᵢ) = 1, so its minimum is at v = (1/n) Σ (x_Goal − xᵢ) cos θᵢ + (y_Goal − yᵢ) sin θᵢ, which is the code's
distBest (unit "the best command"). The Details' formulas are those of the code.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-EC-01 | text | the plot's FrameLabel "sum squared error" and the Details' "sum of the squared distance errors S" | the plotted value (and the Details' formula) includes the factor 1/n: it is the mean squared error | keeps the label (Q-EC-02) | the label would read "mean squared error"; the curve and the red point do not change | kept |
