# Design document: Distribution of a Swarm of Robots in a Circular Workplace under Gravity

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 2 (2026-10-25) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Distribution of a Swarm of Robots in a Circular Workplace under Gravity", contributed by Haoran Zhao and Aaron T. Becker, published 2016-02-15 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DistributionOfASwarmOfRobotsInACircularWorkplaceUnderGravity/> Source as text: [`docs/original-source/swarm-circle.txt`](../../docs/original-source/swarm-circle.txt); snapshots `docs/original-snapshots/swarm-circle-1…2.png`; saved states `tests/golden/swarm-circle.original-states.json` (four snapshot settings) |
| Port files | `model.js` (the closed forms with the original's names, the lattice of particles, `arrowArc`, the five pictures as Graphics data; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` (texts and the two-column layout) |
| Role in the project | new demonstration, ported in simple mode (v0.1.23): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

A very large swarm of very small robots in a circular workplace (the unit disk) moves under a uniform force
("gravity") in the direction β. The swarm flows like a liquid and fills the circular segment under a chord, to
height *h* measured from the wall along β. The Demonstration gives the segment's mean, variances, covariance and
correlation in closed form (computed for β = 0 and rotated: Σ(β) = R(β)·diag(σx²(h), σy²(h))·R(β)ᵀ), plots each of
them against β for the chosen *h* with the current β marked, and draws the workplace: the filled segment, the obstacle
ring, the locus of means (a circle of radius r(h)), the gravity arrow, the mean and the covariance ellipse
`Ellipsoid[mean, 4 Σ]` (semi-axes 2σ); optionally the swarm as lattice particles and the numbers.

## 2. Scope

In scope: the original's four controls, five pictures and behaviour, opening in the notebook's initial settings. Out
of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-SC-01: a student turns the gravity direction β and sees the mean move on its circle and the covariance and
  correlation change sign with the quadrant.
- UC-SC-02: a student changes the fill level *h* and sees the segment become a full disk (h = 2: zero covariance,
  equal variances) or a thin sliver (small h: correlation ±1).
- UC-SC-03: a teacher shows the lattice particles and the numbers (area, mean, covariance) for an exercise.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SC-01 | Slider "β" `{{Beta, 4.712, "β"}, 0, 6.28, 0.01, Appearance -> "Labeled", ImageSize -> Small}` | the direction of gravity | v0.1.23 | e2e "has the controls of the original"; e2e "a β slider step by keyboard" |
| F-SC-02 | Slider *h* `{{h, .66, Style["h", Italic]}, 0.001, 2, 0.001, Appearance -> "Labeled", ImageSize -> Small}` | the fill level | v0.1.23 | e2e "has the controls of the original"; e2e "an h slider step by keyboard" |
| F-SC-03 | Checkboxes "show particles" and "show values" `{{showParticles, False, …}, {True, False}}`; all four controls in one row above the pictures (`Row[{Control@…, Spacer[10], …}]`, ControlPlacement Top) | the original's control row | v0.1.23 | e2e "has the controls of the original"; e2e "the checkboxes show the particles and the values" |
| F-SC-04 | Closed forms `Meanx`, `Meany`, `VarXh`, `VarYh`, `Varx`, `Vary`, `Covxy`, `Corxy` transcribed with the original's names; the stats area −(1 − h)√((2 − h)h) + ArcCos[1 − h] | the model | v0.1.23 | unit "half disk"; unit "full disk"; unit "the closed forms agree with a direct integration"; unit "rotation by β" |
| F-SC-05 | Plot "mean": `Meanx`, `Meany` against β on [0, 2π], ColorData[97] 1 and 2, legend "mean *x*", "mean *y*" `Placed` at {.65, .85}, PlotRange {{0, 2π}, {−1, 1}}, AxesOrigin {0, 0}; the current values as large points (Epilog) | the original's first plot | v0.1.23 | unit "the four plots"; e2e "loads without errors"; M-SC-07 |
| F-SC-06 | Plots "correlation" (ColorData 6, PlotRange 1.1{−1, 1}) and "covariance" (ColorData 5, PlotRange 0.1{−1, 1}), each with the current value as a large point; the three left plots ImageSize 220, ImagePadding {{30, 6}, {5, 20}}, Ticks {0, π/2, π, 3π/2, 2π} and Automatic, AxesLabel {"β", name} | the original's left column | v0.1.23 | unit "the four plots"; e2e "loads without errors"; M-SC-07 |
| F-SC-07 | Plot "variance": `Vary`, `Varx` (ColorData 3, 4), legend "var *y*", "var *x*" outside on the right, PlotRange {{0, 2π}, {0, 0.3}}, ImageSize 190, below the workplace | the original's right column | v0.1.23 | unit "the four plots"; e2e "loads without errors" |
| F-SC-08 | The workplace (ImageSize 300, PlotRange 7/6{{−1, 1}, {−1, 1}}): light-blue disk, white `Rotate[Rectangle[{−1, −1}, {1 − h, 1}], β, {0, 0}]` (the robot-free part), dark-green double arrow with two thin lines and the label "h", black ring `Thickness[0.05]` of radius 1.05 (the obstacle) | the original's picture | v0.1.23 | unit "the workplace picture"; e2e "loads without errors"; M-SC-08 |
| F-SC-09 | The mean's circle (ColorData 1, Thick, radius r(h)), the blue gravity arrow (length ½), the thin reference line, the angle arc with an arrow at its end (`arrowArc`, written in `model.js`) and "β" (only when \|β\| > π/6), the mean point (ColorData 2, PointSize Large) | the original's picture | v0.1.23 | unit "the workplace picture"; unit "arrowArc"; M-SC-08 |
| F-SC-10 | The covariance ellipse `Ellipsoid[mean, 4{{varx, cov}, {cov, vary}}]`: no fill (Opacity 0), edge Thick red | the original's picture | v0.1.23 | unit "the workplace picture"; e2e "loads without errors" |
| F-SC-11 | "show particles": the hexagonal lattice `swarmPts` (numPts = 20, inside the unit disk), those with {Cos β, Sin β}·(p − (1 − h){Cos β, Sin β}) > 0 (all at h = 2), PointSize 0.011, Lighter[Blue, .5] | the swarm itself | v0.1.23 | unit "swarmPts"; unit "the particles"; e2e "the checkboxes show the particles and the values" |
| F-SC-12 | "show values": the text "area=…", "mean={…}", "cov=…" (three lines, StringForm's 6 significant digits) centred at {0, 1/2} | the numbers | v0.1.23 | unit "the stats text"; e2e "the checkboxes show the particles and the values" |
| F-SC-13 | `PlotPoints -> ControlActive[9, Automatic]`: while a slider is dragged the plots are sampled from 9 points | responsiveness, as the original | v0.1.23 | unit "ControlActive" |
| F-SC-14 | Five pictures in the original's arrangement: column 1 the three plots, column 2 the workplace and the variance plot | the original's `Row[{Column[…], Column[…]}]` | v0.1.23 | e2e "loads without errors"; M-SC-07 |
| F-SC-15 | Opening state: the notebook's initial settings β = 4.712, h = 0.66, no particles, no values | the published state | v0.1.23 | unit "the opening state"; e2e "has the controls of the original"; M-SC-02 |
| F-SC-16 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.23 | M-SC-01 |
| A-SC-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.23 | e2e "Initial settings restores the opening state" |
| A-SC-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.23 | e2e "a β slider step by keyboard" |
| A-SC-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.23 | e2e "start-up notice when" |
| A-SC-04 | Breadcrumb link to all demos | navigation | v0.1.23 | inventory |
| A-SC-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.23 | e2e "attribution on" |
| A-SC-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.23 | e2e "bundle: swarm-circle runs from its own folder" |
| A-SC-07 | Slider value fields and ⊕ animation panels (Appearance "Labeled", as the Manipulate layer draws them) | Mathematica's labeled sliders | v0.1.23 | inventory; M-SC-03 |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-β` | F-SC-01 |
| `value-β` | F-SC-01, A-SC-07 |
| `plus-β` | F-SC-01, A-SC-07 |
| `play-β` | F-SC-01, A-SC-07 |
| `stepback-β` | F-SC-01, A-SC-07 |
| `stepfwd-β` | F-SC-01, A-SC-07 |
| `slider-h` | F-SC-02 |
| `value-h` | F-SC-02, A-SC-07 |
| `plus-h` | F-SC-02, A-SC-07 |
| `play-h` | F-SC-02, A-SC-07 |
| `stepback-h` | F-SC-02, A-SC-07 |
| `stepfwd-h` | F-SC-02, A-SC-07 |
| `check-showParticles` | F-SC-03, F-SC-11 |
| `check-showStats` | F-SC-03, F-SC-12 |
| `reset` | A-SC-01 |
| `crumbs` | A-SC-04 |
| `details` | F-SC-16 |
| `credits` | A-SC-05 |

## 6. Design

- `model.js`: the Initialization (closed forms, `numPts`, `swarmPtsS`, `swarmPts`, `arrowArc`) as exported functions
  and constants with the original's names; `initialState()`; `evaluate(state, { controlActive })` → `{ view, graphics }`
  with the five pictures (four `Plot`s of `shared/plot.js`, one `Graphics`). The plots' curves depend on *h* only: they
  are made once per (h, ControlActive) (`cacheLast`) and the β-dependent Epilog points are added to them
  (`withEpilog`); the workplace is built on every evaluation. `fmt` prints numbers as StringForm does. `view` reports
  the mean, variances, covariance, correlation, area, mean radius, particle count and stats lines for the tests.
- `main.js`: one `Manipulate({…})` with `Row([...])` of the four control specs, `ControlPlacement: 'Top'`,
  `ControlActive: true` and five picture containers `graphic` … `graphic5`.
- `index.html`: the two columns as page-level CSS (`.sc-pictures`, `.sc-col-1`, `.sc-col-2`); labels left of the
  sliders and checkboxes, as in the original.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- swarm-circle` → `dist/swarm-circle/`.
- Contents (generated with `node tools/bundle-app.mjs swarm-circle --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/swarm-circle/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/swarm-circle/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: swarm-circle runs from its own folder" (A-SC-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-SC-01: slider `ImageSize -> Small` is a 100 px track (measured in the snapshots; the layer's name for it since
  v0.1.23 gives the same).
- D-SC-02: tick labels π/2, 3π/2, 2π are plain text, not stacked fractions; the plots are sampled by `shared/plot.js`
  (adaptive, not Mathematica's sampler); the stats numbers imitate StringForm (6 significant digits, ×10^ below 10⁻⁵).
- Q-SC-01: the default β = 4.712 is not on the slider's 0.01 grid (and the maximum 6.28 is below 2π); the first step
  goes to a grid value (4.72 or 4.71), as in Mathematica.
- Q-SC-02: the white robot-free rectangle reaches beyond the disk (corners at √2), unseen on the white background;
  the ellipse's face colour (ColorData 3) is never seen (Opacity 0).
- Q-SC-03: the "β" text is drawn only for \|β\| > π/6; the arc's arrow is a tiny Arrow of length r/10⁶ (only its head
  shows).
- Q-SC-04: at h = 2 the particle test is skipped and all lattice points are drawn; the mean's circle has radius 0.
- K-SC-01: (resolved) `PointSize[Large]` is the layer's absolute 7 px point (v0.1.23), as measured in the snapshots.
- K-SC-02: `Arrowheads[.04 {-1, 1}]` (a head at each end) is drawn as two arrows; the layer has no list form. The
  gravity arrow and the arc arrow get explicit `Arrowheads(0.05)` and `Arrowheads(0.025)` in place of Mathematica's
  automatic heads (the layer's default head is narrower than a `Thickness[.01]` line and disappears).
- K-SC-03: (resolved) the variance plot's ImageSize is 190 and its legend is added beside it, as in Mathematica.
- K-SC-04: the three left plots: the x-axis label "β" falls in the 6 px right ImagePadding; Mathematica cuts it off
  completely, the port shows a sliver of it. The automatic y ticks omit the label "0.0" at the origin.
- N-SC-01: the closed forms agree with a direct numerical integration over the segment to 10⁻⁶ (unit "the closed forms
  agree with a direct integration"), and the Details' maxima (h ≈ 1.43, h ≈ 0.92) are reproduced.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.22 | 2026-10-25 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.23 | 2026-10-25 | the port: the original's controls, closed forms and five pictures in simple mode; opening state from the notebook |
| 3 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 4 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 5 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (DOM parity with v0.1.25) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SC-01 | Named point sizes, list Arrowheads and automatic arrowheads in `shared/graphics.js`; outside legends added to the ImageSize in `shared/plot.js` | the workarounds K-SC-01…03 go away | shared change, all plots re-checked | K-SC-01, K-SC-02, K-SC-03 |
| I-SC-02 | A harness run in Mathematica at the four snapshot settings (mean, variances, covariance, area) | the port checked against the original's own numbers | operator time | F-SC-04 |
| I-SC-03 | Correct the sign in the Details' formula for σx² (§11 E-SC-01) on the page | a reader who checks the formula is not misled | differs from the original text | F-SC-16 |
| I-SC-04 | Random particle positions in the segment instead of the lattice | looks more like a swarm | not the original | F-SC-11 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SC-01 | text | Details, formula for σx²(h) | It writes "+ sin[4 arccos(1 − h)]"; the code — and the integral of x² over the segment, θ/4 − sin 4θ/16 with θ = arccos(1 − h) — has + sin[4 arcsin(1 − h)] = − sin[4 arccos(1 − h)]. The code is right (unit "the closed forms agree with a direct integration"); only the text is wrong | keeps the original text on the page and the code's formula in the model | the Details formula would match the code | kept |
| E-SC-02 | text | Details, area of the segment | "½ L R − ½ C(1 − h)" uses C for the chord c and 1 − h for R − h (R = 1) | keeps the text | none | kept |
