# Design document: Probabilistic Models for Robot Motion

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 2 (2026-10-27) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Probabilistic Models for Robot Motion", contributed by Aaron T. Becker and Renuka Pakeetharan, published 2016-01-12 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProbabilisticModelsForRobotMotion/> Source as text: [`docs/original-source/probabilistic-motion.txt`](../../docs/original-source/probabilistic-motion.txt); snapshots `docs/original-snapshots/probabilistic-motion-1…5.png`; saved states `tests/golden/probabilistic-motion.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values — the same here —, `snapshots` the five snapshots' settings) |
| Port files | `model.js` (the Initialization definitions — robot picture, triangular density, nominal motion, the velocity and odometry densities and samplers —, the curves of DensityPlot's exclusion gaps and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, `shared/graphics.js`, `shared/plot.js` (DensityPlot, an empty framed Plot, Show; RegionPlot to trace the gap curves), plain arithmetic |

## 1. Purpose and background

A mobile robot commanded to drive for one second with linear velocity *v* and angular velocity *ω* ends near the end
of an arc of radius *v*/*ω*, but wheel slip and unmodelled dynamics make its final position random. The Demonstration
shows four probabilistic motion models of Thrun, Burgard and Fox's *Probabilistic Robotics* (adapted to the wrapping
of angles at 2π): the **velocity model** (noise on the commanded *v* and *ω*, and a final rotation) and the **odometry
model** (the measured motion as a rotation, a translation and a second rotation, each with noise), each as a
probability density over the final position (DensityPlot) or as 500 random samples drawn as small robots. Six noise
parameters α₁ … α₆ set the variances (the odometry model uses α₁ … α₄). The initial pose is green, the nominal final
pose red; the velocity modes add the centre of rotation and the arcs the robot sweeps, the odometry modes the direction
of the translation and the two rotations.

## 2. Scope

In scope: the original's controls, picture and behaviour, including Mathematica's exclusion gaps in the OdometryPDF
picture (Q-PM-01), with the notebook's saved state as the opening state. Out of scope: anything the original does not
do; port additions are the A- features.

## 3. Users and use cases

- UC-PM-01: a student compares the density of a model with its samples for the same command and noise (VelocityPDF ↔
  VelocitySample, OdometryPDF ↔ OdometrySample).
- UC-PM-02: a student raises one noise parameter at a time and watches the density or the cloud stretch along the path
  (α₁: the speed) or across it (α₃: the turning rate), as the snapshots do.
- UC-PM-03: a teacher compares the velocity and the odometry model for the same command, and shows how the heading,
  a negative *v* (backwards) or *ω* = 0 (straight on) change the motion.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PM-01 | PopupMenu `{{mode, "VelocityPDF", ""}, {"VelocityPDF", "VelocitySample", "OdometryPDF", "OdometrySample"}, ControlType -> PopupMenu}` under the heading "mode": the model and its picture (density or samples) | the four probabilistic motion models of the caption | v0.1.26 | e2e "the mode popup switches the picture"; unit "the picture of each mode" |
| F-PM-02 | Slider `{{θ, 0, ""}, -3.14, 3.14, .001, Appearance -> "Labeled", ImageSize -> Tiny}` under the heading "heading *θ*": the initial heading | the robot's start pose | v0.1.26 | e2e "a slider step by keyboard changes the picture"; e2e "has the controls of the original with their saved values" |
| F-PM-03 | Slider `{{v, 2, ""}, -2, 2, .001, …}` under the heading "linear velocity *v*" (Row with an italic *v*): the commanded linear velocity, negative backwards | a command of the models | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "Initial settings restores the opening state"; M-PM-03 |
| F-PM-04 | Slider `{{ω, 1.57, ""}, -2, 2, .001, …}` under the heading "angular velocity *ω*": the commanded angular velocity | a command of the models | v0.1.26 | e2e "a slider step by keyboard changes the picture"; unit "nominalMotionModel" |
| F-PM-05 | Sliders `{{αi, .02, Subscript[α, i]}, 0, .1, .001, …}`, i = 1 … 4, under the heading "noise parameters": the variances α₁ v² + α₂ ω² of *v* and α₃ v² + α₄ ω² of *ω* (velocity), α₁ δrot1² + α₂ δtrans² of the rotations and α₃ δtrans² + α₄ (…) of the translation (odometry) | the noise of the models | v0.1.26 | e2e "a typed value is taken"; unit "sampleMotionModelVelocityNsamples"; unit "MotionModelOdometryNoAng" |
| F-PM-06 | Sliders `{{α5, .02, …}, 0, .5, .001, …}` and α₆, `Enabled -> mode == "VelocityPDF" \|\| mode == "VelocitySample"`: the variance α₅ v² + α₆ ω² of the velocity sampler's final rotation γ | the velocity model's third noise | v0.1.26 | e2e "the mode popup switches the picture; α5 and α6 are disabled in the odometry modes"; unit "motionModelVelocityNoAng" |
| F-PM-07 | `nominalMotionModel[v, ω, x, y, θ, ΔT]`: the Details' equations (an arc about the centre of rotation), straight on when ω == 0 (`Unequal`) | the noise-free motion | v0.1.26 | unit "nominalMotionModel" |
| F-PM-08 | VelocityPDF: `DensityPlot[motionModelVelocityNoAng[…], {xx, -3, 3}, {yy, -3, 3}, PlotRange -> {{-3, 3}, {-3, 3}, All}, ColorFunctionScaling -> False, …]` — the circle through the start (tangent to the heading) and the point gives the commands (vh, ωh), the density is the product of the triangular densities `probTriangularDistribution` of v − vh and ω − ωh; within 0.01 of the heading line the point counts as straight ahead (Q-PM-03) | the velocity model as a density | v0.1.26 | unit "motionModelVelocityNoAng"; unit "probTriangularDistribution"; e2e "loads without errors and draws the opening picture" |
| F-PM-09 | VelocitySample: 500 poses of `sampleMotionModelVelocityNsamples` (noise from `MyTriangularDistribution`: triangular, or uniform on {0, 0} for a zero range) drawn as small blue robots `DrawRobot[…, diam/15]` over `Plot[Null, {xx, -3, 3}, Frame -> {True, True, False, False}, AspectRatio -> 1, AxesOrigin -> {-3, -3}]` | the velocity model by sampling | v0.1.26 | unit "sampleMotionModelVelocityNsamples"; unit "MyTriangularDistribution"; e2e "the mode popup switches the picture" |
| F-PM-10 | OdometryPDF: `DensityPlot[MotionModelOdometryNoAng[…], …]` — the product of the triangular densities of the rotation's and the translation's errors — with the white gaps of Mathematica's `Exclusions -> Automatic` along the branch cuts and the If/Abs/Max boundaries of the function (Q-PM-01) | the odometry model as a density | v0.1.26 | unit "MotionModelOdometryNoAng"; unit "odometryExclusions"; e2e "the mode popup switches the picture" |
| F-PM-11 | OdometrySample: 500 poses of `sampleMotionModelOdometryNsamples` (rotation, translation, rotation, each with noise) drawn as in F-PM-09 | the odometry model by sampling | v0.1.26 | unit "sampleMotionModelOdometryNsamples"; e2e "the mode popup switches the picture" |
| F-PM-12 | `SeedRandom[1]` at the start of every evaluation: the same samples for the same settings, and a slider rescales the same draws (the cloud changes smoothly) | "make samples repeatable" | v0.1.26 | unit "SeedRandom[1] at every evaluation"; e2e "a typed value is taken; the samples are repeatable" |
| F-PM-13 | The robots `DrawRobot[x, y, θ, diam]` (a circle of diameter 1 and a heading line of length 1/1.5, Thick): the initial pose green, the nominal final pose red | the caption's colours | v0.1.26 | unit "DrawRobot"; unit "the picture of each mode" |
| F-PM-14 | Velocity modes: the line start – centre of rotation – end, the centre (`PointSize[Large]`) and the arcs of radius r ± diam/2 the robot sweeps (the inner one when r ≥ diam/2), from θ − π/2 (θ − 3π/2 when v/ω < 0) over ωΔT; nothing when ω == 0 | the nominal path | v0.1.26 | unit "the picture of each mode"; unit "ω == 0: no path circle" |
| F-PM-15 | Odometry modes: the black line in the direction of the end to 0.7 diam beyond it; the arc of the first rotation at the start (green) and of the second at the end (red), radius 0.6 diam, the angles moved by 2π with the sign of ω | the odometry model's rotation – translation – rotation | v0.1.26 | unit "the odometry path" |
| F-PM-16 | The picture: `Show[…, ImageSize -> 1.1 {400, 400}]`, plot range [−3, 3]²; the densities framed on four sides, the sample pictures on two (bottom, left) | the original's layout | v0.1.26 | unit "the picture of each mode"; e2e "review screenshots at the five snapshot settings" |
| F-PM-17 | Opening state = the notebook's saved state = the Manipulate's initial values: VelocityPDF, θ = 0, v = 2, ω = 1.57, every α 0.02 (shown "0", "2" as exact values) | the published Demonstration | v0.1.26 | unit "the opening state is the notebook's saved state"; e2e "has the controls of the original with their saved values"; M-PM-02 |
| F-PM-18 | The five snapshot settings (VelocityPDF; VelocitySample with three noises; OdometryPDF) give the snapshot pictures | the original's examples | v0.1.26 | unit "the notebook's five snapshot settings"; e2e "review screenshots at the five snapshot settings"; M-PM-07 |
| F-PM-19 | Caption and Details text (from the Demonstration) with the nominal model's equations and the reference | the original's explanation | v0.1.26 | M-PM-01 |
| A-PM-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.25 | e2e "Initial settings restores the opening state"; M-PM-04 |
| A-PM-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, setClock) from the Manipulate layer | automated tests | v0.1.25 | e2e "a slider step by keyboard changes the picture" |
| A-PM-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.25 | e2e "start-up notice when" |
| A-PM-04 | Breadcrumb link to all demos | navigation | v0.1.25 | inventory |
| A-PM-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.25 | e2e "attribution on" |
| A-PM-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.25 | e2e "bundle: probabilistic-motion runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `popup-mode` | F-PM-01 |
| `slider-θ` | F-PM-02 |
| `value-θ` | F-PM-02 |
| `plus-θ` | F-PM-02 |
| `play-θ` | F-PM-02 |
| `stepback-θ` | F-PM-02 |
| `stepfwd-θ` | F-PM-02 |
| `slider-v` | F-PM-03 |
| `value-v` | F-PM-03 |
| `plus-v` | F-PM-03 |
| `play-v` | F-PM-03 |
| `stepback-v` | F-PM-03 |
| `stepfwd-v` | F-PM-03 |
| `slider-ω` | F-PM-04 |
| `value-ω` | F-PM-04 |
| `plus-ω` | F-PM-04 |
| `play-ω` | F-PM-04 |
| `stepback-ω` | F-PM-04 |
| `stepfwd-ω` | F-PM-04 |
| `slider-α*` | F-PM-05, F-PM-06 |
| `value-α*` | F-PM-05, F-PM-06 |
| `plus-α*` | F-PM-05, F-PM-06 |
| `play-α*` | F-PM-05, F-PM-06 |
| `stepback-α*` | F-PM-05, F-PM-06 |
| `stepfwd-α*` | F-PM-05, F-PM-06 |
| `reset` | A-PM-01 |
| `crumbs` | A-PM-04 |
| `details` | F-PM-19 |
| `credits` | A-PM-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names, one function per definition, in its order —
  `DrawRobot`, `signedAngleDist`, `probTriangularDistribution`, `MyTriangularDistribution`, `probNormalDistribution`
  (defined, unused by the original), `nominalMotionModel`, `motionModelVelocityNoAng`,
  `sampleMotionModelVelocityNsamples`, `MotionModelOdometryNoAng`, `sampleMotionModelOdometryNsamples` (the samplers
  take the random source as a last argument) — and `evaluate(state)` → `{ view, graphics }`: the body's `Which` over
  the mode, then the second Graphics (robots and path) and `Show[…, ImageSize -> 1.1 {400, 400}]`. Mathematica's `==`,
  `!=`, `<`, `>`, `>=` on computed reals are `Equal`, `Unequal`, `Less`, `Greater`, `GreaterEqual` of `shared/wl.js`.
  `SeedRandom[1]` is a fresh `createRng({ seed: 1 })` (`shared/random.js`) per evaluation, used by `RandomVariate` of
  `shared/wl.js` (TriangularDistribution, UniformDistribution). The Manipulate variables keep the original's Greek
  names (`θ`, `ω`, `α1` … `α6`, N-PM-01). `view` reports the mode, the nominal end pose, the samples' count and mean
  and the exclusion curves for the tests.
- The PDF modes use `DensityPlot` of `shared/plot.js` (v0.1.26: a 150 × 150 raster with the default `DensityGradient`;
  `MaxRecursion` and `PerformanceGoal` accepted and ignored, D-PM-02); the sample modes `Show(Plot(() => null, …),
  Graphics([Blue, robots]))` — the empty framed plot of the original (a function that returns nothing draws no curve).
- Exclusion gaps (Q-PM-01, N-PM-03): `odometryExclusions` returns the curves Mathematica's symbolic analysis of
  `MotionModelOdometryNoAng` finds — four rays from the start (three branch cuts of ArcTan, the zero of p1's angle
  error), the circle where the translation error is 0, and the support boundaries of the two triangular densities as
  functions (negative inside) —; `exclusionGaps` draws them as white bands (`AbsoluteThickness[6.5]`, about 0.1 plot
  units) over the density, the support boundaries traced by `RegionPlot` (its boundary only, face `Opacity[0]`). The
  bands are part of the first picture of the Show, so the robots are drawn over them as over Mathematica's holes.
- `main.js`: one `Manipulate({…})` — the original's control list with its headings and empty strings (spacing),
  `PopupMenu`, `Enabled` of α₅ and α₆, `throttle: 'frame'` (at most one evaluation per frame while a slider is
  dragged: a density takes 20–60 ms, N-PM-07); the headings' italic letters are set after the controls are built
  (N-PM-05).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- probabilistic-motion` → `dist/probabilistic-motion/`.
- Contents (generated with `node tools/bundle-app.mjs probabilistic-motion --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/probabilistic-motion/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/probabilistic-motion/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: probabilistic-motion runs from its own folder" (A-PM-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-PM-01: the samples come from a seeded generator (`createRng({ seed: 1 })` at every evaluation, as the original's
  `SeedRandom[1]`), not from Mathematica's random stream: the same distributions and statistics, other numbers (the
  clouds of snapshots 2–4 have the same shape and spread, not the same points).
- D-PM-02: the densities are sampled at the centres of a 150 × 150 grid and drawn as an image the browser interpolates;
  Mathematica samples an adaptive mesh (`MaxRecursion -> 5`, `PerformanceGoal -> "Quality"`, both ignored here). The
  colours agree with the snapshots (N-PM-06); sharp corners of a density's support are a little softer. For θ = 0 the
  grid rows miss the band within 0.01 of the heading line (Q-PM-03), where the density is 0 anyway.
- D-PM-03: the exclusion gaps are white bands of constant width (about 0.1 plot units) drawn over the density;
  Mathematica cuts them out of its mesh, so its gaps are a little wider where two cross and around the start, and it
  also leaves out thin regions between two close gaps — in snapshot 5 the narrow sector between the two cuts left of
  the start (along y = 0 and the ray at θ + π) is white throughout, where the port shows two bands with the density
  (dark blue, 0) between them.
- D-PM-04: a sample whose coordinates are not numbers (ω̂ = 0 exactly in the velocity sampler: v̂/ω̂; only with ω = 0
  and α₃ = α₄ = 0) is left out; Mathematica gets Indeterminate coordinates and flags the picture.
- Q-PM-01: as in Mathematica, the OdometryPDF picture has white gaps along every curve where the symbolic form of
  `MotionModelOdometryNoAng` may jump (`Exclusions -> Automatic`, DensityPlot's default): the branch cuts of
  ArcTan[xp − x, yp − y] (the ray at angle π from the start), of `signedAngleDist[…, θ]` (the ray at θ + π) and of
  `signedAngleDist[δrot1, δhatrot1]` (θ + δrot1 + π); the zeros of the two errors (`If[a == 0, …]` and `Abs`: the ray
  through the nominal end and the circle of radius δtrans about the start); the support boundaries of the two triangular
  densities (`Max[0, …]`; only when that factor's variance is symbolic, i.e. not both of its α's 0). The densities are
  continuous across most of these curves. The VelocityPDF picture has no gaps: there the If on the point stays
  unevaluated and the symbolic result does not depend on xx, yy.
- Q-PM-02: α₅ and α₆ are enabled in VelocityPDF, but the density `motionModelVelocityNoAng` has no final rotation and
  does not use them (they act in VelocitySample only).
- Q-PM-03: `motionModelVelocityNoAng` treats a point within 0.01 of the heading line as straight ahead or behind
  (vh = ± its distance, ωh = 0), as the original's comment says ("should be != 0, but the inequality makes the graph
  look better").
- N-PM-08: the density pictures' frame, with its inward ticks, is drawn over the density, as Mathematica draws frames
  (snapshots 1 and 5 show gray ticks over the dark blue): shared/plot.js `DensityPlot` sets `FrameInFront`, which the
  layer honours since v0.1.26 (found with this port; until then the frame lay under the raster, K-PM-01 of the first
  draft). Other plots keep their frame under the content, as before.
- N-PM-01: the Manipulate variables are named as in the original and its saved states: `θ`, `ω`, `α1` … `α6` (JavaScript
  identifiers and test ids such as `slider-θ`, `value-α1`), so the snapshots' settings are passed to
  `window.__demo.setState` unchanged.
- N-PM-02: the original's second Graphics contains the assignment `{xp, yp, θp} = nominalMotionModel[…]`, whose value
  (a list of three numbers) stands in the primitives list and draws nothing; the port computes the pose before the
  list.
- N-PM-03: the gap curves were identified by drawing the computed curves over snapshot 5: all of them (four rays, the
  circle of radius δtrans = 1.99 sin 1 = 1.6745, the two spirals |a| = √(6·0.0214) r of p1's support and the closed
  curve of p2's) lie on the white bands, and no band is left over. The settings have δrot1 = ωΔT/2 = 1 (the chord of
  an arc points along the mean heading).
- N-PM-04: with v = 0 exactly (the slider reaches it) the nominal end is the start and the odometry functions take
  `ArcTan[0., 0.]`: Mathematica gives Indeterminate (with messages), so its OdometryPDF density is undefined everywhere
  and its odometry line and arcs are invalid primitives; `shared/wl.js` gives ArcTan[0, 0] = 0, so the port draws a
  density about the start and arcs from angle 0.
- N-PM-05: the headings "heading *θ*", "linear velocity *v*", "angular velocity *ω*" show the letter in italics as the
  original (its Row with `Style["v", Italic]`; the snapshots show θ and ω italic too); the layer writes headings as
  plain text, so `main.js` sets the letters in `<i>` after the controls are built (reported for the shared code:
  headings given as Row/Style expressions).
- N-PM-06: the density colours are `DensityGradient` of `shared/plot.js` (fitted to this app's snapshots); away from
  lines and gaps the review screenshots differ from snapshots 1 and 5 by less than 1/255 per channel on average (2/255
  at the 95th percentile).
- N-PM-07: `throttle: 'frame'` evaluates the body at most once per animation frame while a slider is dragged
  (Mathematica's front end also skips updates it cannot draw in time); setState and Initial settings evaluate at once.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-27 | the port: the four modes (velocity and odometry densities on the shared DensityPlot, seeded samplers over an empty framed plot), the robots and paths, Mathematica's exclusion gaps of the OdometryPDF picture, the original's controls with PopupMenu and Enabled; opening state from the notebook |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PM-01 | Imitate Mathematica's mesh at the gaps: leave out thin regions between close gaps and widen the crossings | closer to snapshot 5 (the white sector left of the start) | a heuristic that cannot be checked without Mathematica at other settings | D-PM-03, M-PM-08 |
| I-PM-02 | A finer raster (`PlotPoints -> 300`) in the PDF modes | sharper corners of the supports | four times the evaluation time (about 100–250 ms per change) | D-PM-02 |
| I-PM-03 | Sample with Thrun's `sample_triangular_distribution` (variance b², support ±√6 b) | the clouds fill the densities' supports | differs from the original | E-PM-01 |
| I-PM-04 | Density values from the original at a few points (Mathematica harness) as golden tests | the formulas checked against the original's own numbers | needs Mathematica | F-PM-08, F-PM-10 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C) against *Probabilistic Robotics* (Tables 5.1–5.6): the velocity density follows
`motion_model_velocity` without the final heading, with the authors' sign fix of v̂ (`a2 Cos[θ] >= 0`, right for forward
and backward motion and both turning directions) and the choice of the Δθ closest to ωΔt; the odometry density follows
`motion_model_odometry` without the second rotation; the velocity sampler follows `sample_motion_model_velocity`
(unit tests "motionModelVelocityNoAng", "MotionModelOdometryNoAng").

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-PM-01 | mathematical | `sampleMotionModelVelocityNsamples` and `sampleMotionModelOdometryNsamples`: `MyTriangularDistribution[Sqrt[b²] {-1, 1}]` | the samplers draw from TriangularDistribution[{−b, b}], whose variance is b²/6, while the densities (`probTriangularDistribution`, the book's `prob_triangular_distribution`) have variance b² and support ±√6 b (the book's `sample_triangular_distribution` also has variance b²): for the same α's every sample cloud is √6 ≈ 2.4 times narrower than the density it should sample | keeps the original's samplers (unit "sampleMotionModelVelocityNsamples": the v noise stays within ±b) | `TriangularDistribution[Sqrt[6 b²] {-1, 1}]` would widen every cloud by √6 to the density's support | kept |
| E-PM-02 | mathematical | `sampleMotionModelOdometryNsamples`, δhatrot2 | the noise of the second rotation has the variance α₁ δrot1² + α₂ δtrans² of the first; the book has α₁ δrot2² + α₂ δtrans² (it would change only the samples' headings, not their positions) | keeps the original's formula | none in this Demonstration: the odometry is always a nominal arc, for which δrot1 = δrot2 = ωΔT/2 (also backwards, after the wrapping) | kept |
