# Design document: Operating an AC Three-Phase Induction Motor

| | |
|---|---|
| Code version: | 0.1.41 |
| Document revision | 2 (2026-11-17) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Operating an AC Three-Phase Induction Motor", contributed by Harley H. Hartman, published 2008-06-18 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/OperatingAnACThreePhaseInductionMotor/> Source as text: [`docs/original-source/three-phase-induction-motor.txt`](../../docs/original-source/three-phase-induction-motor.txt); snapshots `docs/original-snapshots/three-phase-induction-motor-1…4.png`; saved states `tests/golden/three-phase-induction-motor.original-states.json` (`states[0]` the live state, `snapshots` the four snapshots' settings) |
| Port files | `model.js` (the rotor angle b, the skew d and e, the six phase bands, the Graphics3D of the motor, the plot of the supply and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`: the motor as a `View3D` picture, the plot as an SVG picture; the rims of the dark phase bands, D-TB-05), `index.html` |

## 1. Purpose and background

A three-phase supply drives the stator windings of an induction motor; the three currents, 120° apart, make a
magnetic field that turns, and the field drags the rotor round. The Demonstration draws a two-pole machine in 3D: a
translucent yellow stator with six phase bands (the winding sides; a band lights up while its phase is positive, so
the lit bands go round with the field), a green rotor with twelve red bars (skewed by an adjustable fraction of the
bar pitch), four white holes, a blue shaft and an orange position indicator that turns with the rotor. Beside it a
plot shows the three phase currents over one period and the sum of their squares, labelled "relative flux". The
phase position (the time) can be animated or set by a slider; an imbalance (the magnitude of the first phase) or a
phase shift of the first phase makes the flux pulsate, and the rotor then runs ahead of and behind the field during
each period ("the effect is exaggerated to allow this phenomenon to be observed", Details).

## 2. Scope

In scope: the original's five controls (an Animator and a slider of the phase position, the magnitude, the phase
shift and the skew), the 3D motor and the plot, the caption and the Details. Out of scope: anything the original does
not do (port additions are A- features in §4); a physical model of the motor (slip, torque, inertia: E-TB-01).

## 3. Users and use cases

- UC-TB-01: a student of electrical machines watches the field turn (play the animation, or move the phase
  position) and sees which bands light up in which order.
- UC-TB-02: the student unbalances the supply (magnitude or phase shift) and sees the flux curve pulsate and the rotor
  speed up and slow down during each turn.
- UC-TB-03: the student changes the skew of the rotor bars from straight (0 %) to one bar pitch (100 %).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TB-01 | Animator "animate" `{{a, 0, "animate"}, 0, 2π, .01, ControlType -> Animator, AppearanceElements -> {"PlayPauseButton", "FasterSlowerButtons"}, AnimationRate -> 30, AnimationRunning -> False}`: play/pause and faster/slower buttons (no progress slider); a runs at 30 units per second in steps of .01 and starts again at 0 after 2π; paused at start | the Demonstration's motion | v0.1.41 | e2e "has the five controls of the original with the saved values"; e2e "the animator runs a at AnimationRate 30 per second on the fixed page clock and wraps at 2π"; e2e "the faster button raises the rate by a quarter"; M-TB-05 |
| F-TB-02 | Slider "phase position" `{{a, 0, "phase position"}, 0, 2π, Appearance -> "Labeled"}`: a second control of the same variable a; the two stay in step (the Animator runs on from a value set with the slider) | to stop the field at any phase | v0.1.41 | e2e "the phase position slider by keyboard and mouse turns the rotor and keeps the animator in step"; e2e "has the five controls of the original with the saved values" |
| F-TB-03 | Slider "magnitude (±40%)" `{{m, 1, …}, 0.6, 1.4, Appearance -> "Labeled"}`: the amplitude of the first phase (plot, rotor) | a voltage imbalance | v0.1.41 | e2e "magnitude, phase shift and skew by keyboard change the rotor, the bars and the plot"; unit "the fourth curve is the sum of squares" |
| F-TB-04 | Slider "phase shift (±80°)" `{{p, 0, …}, -80, 80, Appearance -> "Labeled"}`: shifts the first phase by p degrees (`p/(180/π)` radians) in the plot, the rotor angle and the first pair of bands | a phase shift | v0.1.41 | e2e "magnitude, phase shift and skew by keyboard change the rotor, the bars and the plot"; unit "snapshot 3 (p = 80): the flux curve dips" |
| F-TB-05 | Slider "skew (% bar pitch)" `{{f, 50, …}, 0, 100, Appearance -> "Labeled"}`: d = b + (f π/12)/100, e = b − (f π/12)/100, so the bars are skewed by f % of the bar pitch π/6 | the skew of the rotor bars | v0.1.41 | unit "skew: d − e = f π/600"; e2e "magnitude, phase shift and skew by keyboard change the rotor, the bars and the plot" |
| F-TB-06 | Rotor angle `b = -a + Sqrt[(Sin[a + p/(180/π) + 0.7] m)^2 + Sin[a + 2π/3 + 0.7]^2 + Sin[a - 2π/3 + 0.7]^2]/1.3` (the 0.7 inside each Sin, Q-TB-02) | "the rotor speed is adjusted by a magnitude factor" | v0.1.41 | unit "rotor angle, balanced supply"; unit "rotor angle, unbalanced"; unit "the mean rotor speed is the field"; unit "the snapshots"; e2e "at each snapshot" |
| F-TB-07 | The Graphics3D (`Boxed -> False`, `ImageSize -> {275, 275}`, default ViewPoint {1.3, −2.4, 2} and lighting), in the original's order: the orange position indicator `{EdgeForm[Thick], Orange, Polygon[…]}` (a vertical rectangle from radius 3.5 to 7 at the angle b + π/4, z from −10 to 10); the stator `{Opacity[0.3], Yellow, Cylinder[{{0, 0, 10}, {0, 0, -10}}, 32]}` and `{Opacity[0.2], White, Cylinder[…, 22]}`; six phase bands (F-TB-08); the rotor `{Opacity[0.4], RGBColor[.2, .7, .3], Cylinder[…, 20]}`; the SlateBlue shaft `Cylinder[{{0, 0, 40}, {0, 0, -18}}, 3.5]`; four holes `{Opacity[0.7], White, Cylinder[…, 1.8]}` at radius 8 and the angles b + kπ/2; twelve bars `RGBColor[.8, .1, .4], Cylinder[{{18 Cos[d + kπ/6], 18 Sin[d + kπ/6], 12}, {18 Cos[e + kπ/6], 18 Sin[e + kπ/6], -12}}, 2]`; drawn by `View3D` (drag to rotate) | the motor | v0.1.41 | unit "the Graphics3D: 27 primitives in the original"; e2e "loads without errors and draws both pictures"; e2e "dragging the motor turns the view"; M-TB-02 |
| F-TB-08 | The six phase bands `Cylinder[{{27 Cos[t], 27 Sin[t], -10}, {27 Cos[t], 27 Sin[t], 10}}, 4.8]`: SlateBlue at t = π and 0 with `Opacity[∓Sin[a + p°]]`, lime `RGBColor[.47, 1, 0]` at π − 2π/3 and −2π/3 with `Opacity[∓Sin[a − 2π/3]]`, orange `RGBColor[1, .47, 0]` at π + 2π/3 and 2π/3 with `Opacity[∓Sin[a + 2π/3]]`; a band with a negative Opacity has invisible faces and visible rims (Q-TB-01, D-TB-05) | "the phase bands illuminate when the phase polarity is positive" | v0.1.41 | unit "phase bands: opposite bands have opacities ±Sin"; unit "snapshot 1 (a = 5.63): the bands at π, π/3 and 2π/3 are lit"; e2e "at each snapshot"; M-TB-03 |
| F-TB-09 | The plot `Plot[{Sin[a + p°] m, Sin[a + 2π/3], Sin[a - 2π/3], (Sin[a + p°] m)^2 + Sin[a + 2π/3]^2 + Sin[a - 2π/3]^2}, {a, 0, 2π}, AxesLabel -> {"time", "current / \nrelative flux"}, PlotRange -> {-1.5, 2.0}, PlotStyle -> {SlateBlue, RGBColor[1, .47, 0], RGBColor[.47, 1, 0], RGBColor[.6, .74, .36]} (each Thickness[0.01]), ImageSize -> {300, 300}]`: the curves over one period, whatever the Manipulate's a (Q-TB-03) | the three-phase supply | v0.1.41 | unit "the plot: four curves over one period"; unit "the fourth curve is the sum of squares"; e2e "loads without errors and draws both pictures" |
| F-TB-10 | The two pictures side by side (`Grid[{{Graphics3D[…], Plot[…]}}]`) under the controls (`ControlPlacement` Top, Mathematica's default) | the original's layout | v0.1.41 | e2e "loads without errors and draws both pictures"; M-TB-02 |
| F-TB-11 | Opening state = the notebook's live state a = 5.63, m = 1, p = 0, f = 50 (as snapshot 1) | the state the original opens in | v0.1.41 | unit "the opening state is the notebook"; e2e "has the five controls of the original with the saved values" |
| F-TB-12 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.41 | M-TB-01 |
| A-TB-01 | "Initial settings" button: the Manipulate's initial values a = 0, m = 1, p = 0, f = 50 (Mathematica's ⊕ > Initial Settings) | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings goes to the Manipulate" |
| A-TB-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, setClock, inkFraction, pixelAt, sceneToClient) from the Manipulate layer | automated tests | v0.1.41 | e2e "the animator runs a at AnimationRate 30"; e2e "at each snapshot" |
| A-TB-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-TB-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-TB-05 | Credits footer (author, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-TB-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: three-phase-induction-motor runs from its own folder" |
| A-TB-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TB-08 | Port note under the caption: the opening state, Initial settings, dragging the motor, the thin indicator outline | says what differs | v0.1.41 | M-TB-01 |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `animator-play-a` | F-TB-01 |
| `animator-faster-a` | F-TB-01 |
| `animator-slower-a` | F-TB-01 |
| `slider-a` | F-TB-02 |
| `value-a` | F-TB-02 |
| `plus-a` | F-TB-02 |
| `play-a` | F-TB-02 |
| `stepback-a` | F-TB-02 |
| `stepfwd-a` | F-TB-02 |
| `slider-m` | F-TB-03 |
| `value-m` | F-TB-03 |
| `plus-m` | F-TB-03 |
| `play-m` | F-TB-03 |
| `stepback-m` | F-TB-03 |
| `stepfwd-m` | F-TB-03 |
| `slider-p` | F-TB-04 |
| `value-p` | F-TB-04 |
| `plus-p` | F-TB-04 |
| `play-p` | F-TB-04 |
| `stepback-p` | F-TB-04 |
| `stepfwd-p` | F-TB-04 |
| `slider-f` | F-TB-05 |
| `value-f` | F-TB-05 |
| `plus-f` | F-TB-05 |
| `play-f` | F-TB-05 |
| `stepback-f` | F-TB-05 |
| `stepfwd-f` | F-TB-05 |
| `scene-canvas` | F-TB-07 |
| `reset` | A-TB-01 |
| `crumbs` | A-TB-04 |
| `details` | F-TB-12 |
| `credits` | A-TB-05 |

## 6. Design

- `model.js` (simple mode: plain arithmetic with `shared/wl.js` names, in the original's order): `rotorAngle(a, m, p)`
  (b), `skew(b, f)` (d, e), `phaseBands(a, p)` (opacity, colour and angle of each band), `phases` and `sumOfSquares`
  (the plot's curves), `motorGraphics` (the Graphics3D as `shared/graphics3d.js` data), `supplyPlot` (the `Plot` of
  `shared/plot.js`), `evaluate(state)` → `{ view: { b, d, e, bands, flux }, graphics: [motor, plot] }`;
  `initialState()` (the live state) and `initialSettings()` (the Manipulate's initial values).
- `main.js`: one `Manipulate({…})` of `shared/manipulate.js` — the five control specs in Mathematica's form (the
  Animator and the slider of a, as in the original), `ControlPlacement: 'Top'`, the motor drawn by `View3D`
  (`SphericalRegion: false`, `zoom: 1.36`, D-TB-02), the plot as an SVG picture. The body adds the rims of the bands with
  a negative Opacity as lines (D-TB-05); `after` keeps the Animator in step with the slider (N-TB-04).
- `index.html`: the two pictures in a flex row (`.tb-pictures`), wrapping on a narrow window.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- three-phase-induction-motor` → `dist/three-phase-induction-motor/`.
- Contents (generated with `node tools/bundle-app.mjs three-phase-induction-motor --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/three-phase-induction-motor/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/three-phase-induction-motor/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: three-phase-induction-motor runs from its own folder" (A-TB-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-TB-01: the controls look like the layer's (labels above the sliders, editable value fields, the ⊕ panels of the
  sliders); the Animator shows the original's play/pause and faster/slower buttons. The faster and slower buttons
  change the rate by a factor 1.25 (the shared Animator), not necessarily Mathematica's factor (M-TB-05).
- D-TB-02: the 3D picture is fitted to the scene's bounding box (`SphericalRegion: false`, Mathematica's default) with
  `zoom: 1.36`, measured on the snapshots: the stator is about 220 px wide of 275 as in snapshot 1 (about 225 px);
  Mathematica's own fit could not be reproduced exactly.
- D-TB-03: `EdgeForm[Thick]` of the orange indicator: its outline is drawn black and 1 px wide (the shared renderer
  draws edges 1 px wide); the snapshots show a thick black line.
- D-TB-04: the plot: curves sampled by `shared/plot.js` (adaptive, not Mathematica's sampler); `ImageSize -> {300, 300}`
  is drawn 300 px wide at the plot's own aspect ratio 1/GoldenRatio (Mathematica centres it in a 300 × 300 box: blank
  space above and below); the margins are measured on the snapshots (`ImagePadding -> {{26, 28}, {10, 40}}`), and the
  two-line y label is written as a Column with two empty lines after it, so that the layer (which centres a label on
  the axis end) sets it above the tick label 2.0 as Mathematica does; tick labels are grey, not black.
- D-TB-05: a band whose Opacity is negative: Mathematica draws its faces fully transparent but still draws the rims of
  its two caps as thin dark circles (snapshots 1–4: three pairs of circles, at the dark bands); the shared renderer
  fades the rims with the faces, so the port adds those rims as black lines at Opacity 0.6 (main.js `bandRims`). The
  rims of the other cylinders are faded with their faces (slightly paler than in the snapshots).
- D-TB-06: the 3D picture is drawn by View3D (three.js) with Mathematica's documented default lights; transparent
  cylinders are blended back to front by their centres, not with Mathematica's depth peeling (K-TB-02).
- Q-TB-01: the band opacities `Opacity[-Sin[…]]` and `Opacity[Sin[…]]` are negative for half of each period; the code
  relies on Mathematica drawing a negative opacity as fully transparent (the snapshots show it does); the port passes
  the same values (WebGL clamps them to 0) and draws the rims (D-TB-05). E-TB-04.
- Q-TB-02: the rotor angle uses the phases 0.7 rad later than the plot and the bands (`Sin[a + … + 0.7]` in each term):
  the rotor's speed-up and slow-down do not line up with the plotted flux at the same phase position. N-TB-05.
- Q-TB-03: the plot's iterator `{a, 0, 2π}` uses the Manipulate's variable name: inside `Plot` a is the plot's own
  variable, so the plot does not depend on the phase position (no marker of the current time); kept.
- Q-TB-04: the rotor turns backwards in a (b = −a + …): the field of the bands also turns clockwise (its angle is
  π/2 − a, unit "phase bands"), so the rotor follows the field.
- Q-TB-05: the code's comments call the lime bands (Sin[a − 2π/3]) "red phase bands" and the orange ones
  (Sin[a + 2π/3]) "green phase bands"; the colours drawn match the plot's curves, so only the comments are off.
- Q-TB-06: the Animator's `AnimationRate -> 30` runs a through 2π in about 0.21 s: at 60 frames per second a moves about
  0.5 rad per frame, close to the bar pitch π/6 ≈ 0.52, so the bars seem to stand nearly still or creep (a stroboscopic
  effect); kept (K-TB-01).
- K-TB-01: how fast the original's animation looks in Mathematica (its frame rate and whether every step .01 is shown
  at AnimationRate 30) is not known; M-TB-05 records it.
- K-TB-02: the four white holes (Opacity 0.7) inside the translucent rotor: three.js draws the holes in front after the
  front walls of the stator and rotor, so they look brighter (white bars) than in the snapshots, where only their tops
  stand out (review screenshots).
- N-TB-01: the opening state is the notebook's live state (a = 5.63, as snapshot 1); the Manipulate's initial value of
  a is 0, which "Initial settings" restores (A-TB-01), as Mathematica's ⊕ > Initial Settings does.
- N-TB-02: the skew is measured in bar pitches: d − e = f π/600, so f = 100 turns the bars by π/6, one bar pitch of the
  twelve bars (the label is right).
- N-TB-03: the fourth curve, the sum of squares, is 1 + m²/2 + (1 − m²) cos 2t / 2 for p = 0 (3/2 for a balanced
  supply): an unbalanced supply makes it pulsate at twice the supply frequency (unit "the fourth curve").
- N-TB-04: two controls of one variable: the layer updates the later control (the slider) when the first (the
  Animator) changes a, but not the other way round; `main.js` sets the Animator's value after every evaluation so that
  it runs on from a value set with the slider, as in Mathematica.
- N-TB-05: the rotor angle uses the phases 0.7 rad (40°) later than the plot and the bands (Q-TB-02), without explanation
  in the source, probably to tune the picture. Without the 0.7 the rotor's wobble would line up with the plotted flux;
  the rotor angle would change by 0.11 rad at snapshot 2 and 0.24 rad at snapshot 3 (up to about 0.56 rad within the
  controls' ranges).

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the original's Animator and four sliders, the rotor angle, the 3D motor with its six phase bands, rotor, shaft, holes and skewed bars, and the plot of the three-phase supply, in simple mode; opening state from the notebook; errors in the original (§11) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TB-01 | A marker of the current phase position on the plot (a vertical line at a) | links the bands and the rotor to the curves | differs from the original | Q-TB-03 |
| I-TB-02 | A rotor that lags the field (slip) and slows down under an unbalanced supply, from a simple torque–speed model | the picture would show what the caption claims | a new model, differs from the original | E-TB-01 |
| I-TB-03 | A thick outline for the indicator (`EdgeForm[Thick]`) in the shared renderer | as the snapshots | shared code | D-TB-03 |
| I-TB-04 | Depth-peeled transparency in the shared renderer | the holes and bands blended as in Mathematica | shared code, slower | K-TB-02, D-TB-06 |

## 11. Errors in the original (conceptual and mathematical)

Kind: conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these
words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TB-01 | conceptual | `b = -a + Sqrt[…]/1.3` and the caption "This will result in a change in speed of the rotor that represents a change in developed torque" | the rotor angle is a fixed function of the phase position, not a speed: the rotor turns exactly with the field (synchronous, no slip, which an induction motor needs to make torque), and whatever m and p, b(a + 2π) = b(a) − 2π, so its mean speed never changes; an imbalance only makes the rotor run ahead and behind during each turn (by ±0.13 rad at m = 1.4, p = 0; unit "the rotor runs ahead and behind"). The Details say the effect is exaggerated, but the mean speed does not change at all | keeps the original's formula (F-TB-06; unit "the mean rotor speed is the field") | a rotor with slip and a mean speed that drops with the imbalance would need a dynamic model (I-TB-02); every picture and the saved states would change | kept |
| E-TB-02 | conceptual | the fourth curve `(Sin[a + p°] m)^2 + Sin[a + 2π/3]^2 + Sin[a − 2π/3]^2` labelled "relative flux" | the sum of the squares of the three currents is not the magnitude of the field: the field's space vector i₁ + i₂ e^{j2π/3} + i₃ e^{−j2π/3} has the squared magnitude (3/2)·S − (i₁ + i₂ + i₃)²/2 (S the sum of squares), which is proportional to S only while i₁ + i₂ + i₃ = 0, that is for a balanced set (m = 1, p = 0); the plotted curve has the units of current squared (constant 3/2 when balanced) | keeps the original's curve and its use in b (F-TB-09; unit "the field magnitude is not the sum of squares") | the curve and the rotor's wobble would change shape and size for m ≠ 1 or p ≠ 0 (the field magnitude is constant 3/2 at m = 1, p = 0 as now) | kept |
| E-TB-04 | mathematical | `Opacity[-Sin[…]]` and `Opacity[Sin[…]]` of the phase bands | Opacity takes values from 0 to 1; half of the values passed are negative. Mathematica draws them as fully transparent, which gives the intended "lit while positive", but the dark bands' rims stay visible (snapshots) | passes the same values; the faces are clamped to transparent and the rims are drawn (Q-TB-01, D-TB-05) | `Opacity[Max[0, …]]` would draw the same picture; none visible | kept |
