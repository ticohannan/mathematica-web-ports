# Design document: The Homicidal Chauffeur Problem

| | |
|---|---|
| Code version: | 0.1.27 |
| Document revision | 2 (2026-10-26) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "The Homicidal Chauffeur Problem", contributed by Aaron T. Becker and Javier Garcia, published 2018-01-22 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/TheHomicidalChauffeurProblem/> Source as text: [`docs/original-source/homicidal-chauffeur.txt`](../../docs/original-source/homicidal-chauffeur.txt); snapshots `docs/original-snapshots/homicidal-chauffeur-1…5.png`; saved states `tests/golden/homicidal-chauffeur.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values — the same state here, `snapshots` the five snapshots' settings) |
| Port files | `model.js` (the Initialization definitions — the pedestrian and car pictures, the car's rectangle, distances and angles — and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, `shared/graphics.js`, plain arithmetic; the second real-time port after steering-rc-cars (the page clock for AbsoluteTime[] and Clock[…], `settle`) |

## 1. Purpose and background

The homicidal chauffeur (Isaacs 1951) is a pursuit-evasion game: a car that drives forward at a constant speed and
can turn no tighter than a circle of radius r<sub>min</sub> (a Dubins car) tries to run over a slower pedestrian who
can change direction at once. In **setup** the player places the pedestrian, the car and the car's heading with three
locators and sets r<sub>min</sub> and the speed ratio v<sub>car</sub>/v<sub>pedestrian</sub>; in **running** the one
locator is the pedestrian's goal: the pedestrian runs toward it at one unit per second, and after a three-second head
start the chauffeur chases it with a simple controller — it turns toward the pedestrian when the pedestrian cannot
escape into the turning disk on its side (the dashed circles), otherwise it turns away to gain room. When the
pedestrian's position enters the car's rectangle the game ends ("pedestrian hit!") and shows the running time.

## 2. Scope

In scope: the original's controls, picture and behaviour, including the real-time game in running mode, with the
notebook's saved state as the opening state. Out of scope: anything the original does not do; port additions are the
A- features.

## 3. Users and use cases

- UC-HC-01: a student places the pedestrian beside the car, starts running and tries to stay away from the car as long
  as possible (the caption's game), watching how the chauffeur turns away and toward.
- UC-HC-02: a student compares speed ratios and turning radii: for which values can the pedestrian escape forever
  (the Details: the algorithm is imperfect)?
- UC-HC-03: a teacher shows the Dubins car model (turning circles, bounded turn rate) and the head start.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-HC-01 | Slider r<sub>min</sub> `{{minRadius, 3, Row[{Subscript[Style["r", Italic], "min"]}]}, 0.001, 5, Enabled -> (state === "setup"), Appearance -> "Labeled", ImageSize -> 400}` (continuous): the car's minimum turning radius — the turning circles, the turn rate v<sub>car</sub>/r<sub>min</sub> and the controller | the pursuer's agility | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "a slider step by keyboard changes r_min and the turning circles"; unit "evaluating the saved state reproduces it" |
| F-HC-02 | Slider v<sub>car</sub>/v<sub>pedestrian</sub> `{{vcar, 2, Row[{Subscript[Style["v", Italic], "car"], "/", Subscript[Style["v", Italic], "pedestrian"]}]}, 1.1, 5, Enabled -> (state === "setup"), Appearance -> "Labeled", ImageSize -> 400}`: the car's speed in units per second (the pedestrian runs one unit per second) | the speed ratio of the game | v0.1.26 | e2e "a slider step by keyboard changes r_min and the turning circles, and v_car"; unit "running: the car waits three seconds" |
| F-HC-03 | Setter "mode" `{{state, "setup", "mode"}, {"setup", "running"}}`; the body sets "Collision" (neither button pressed); both sliders are enabled only in setup (also not in "Collision") | the two phases of the game | v0.1.26 | e2e "running: the countdown 3, 2, 1 at a fixed page clock"; e2e "the car runs over the pedestrian"; unit "switch to running" |
| F-HC-04 | Setup: the Locator variable `loc` = {pedestrian, car (middle of the rear axle), heading handle}; the pedestrian follows the first; a moved second locator moves the car (the handle follows); otherwise the heading is `ArcTan` of the handle (0 if the handle is on the car) and the handle snaps back to 2 units ahead of the car | placing the players | v0.1.26 | unit "setup: the first locator moves the pedestrian"; e2e "setup: dragging the locators with the mouse" |
| F-HC-05 | Mode switches: running clears both paths, makes `loc` = {runner} (one locator: the pedestrian's goal) and sets timer = AbsoluteTime[]; setup makes the three locators from the car's pose and keeps the paths | starting and stopping a run | v0.1.26 | unit "switch to running: paths cleared"; unit "after a collision: running again hits at once"; e2e "the car runs over the pedestrian" |
| F-HC-06 | Running, the pedestrian: dt = AbsoluteTime[] − lastTime, at least 0.01; it runs min(distance, dt) toward the locator (speed 1), faces it (θ = 0 when standing) and swings its arms only while moving; one path point per evaluation; the body evaluates itself again while running (Manipulate re-evaluates a body that changes its own variables) | the player's control | v0.1.26 | unit "running: dt = clock difference"; e2e "running: the countdown 3, 2, 1 at a fixed page clock" |
| F-HC-07 | Running, the head start and the car: for 3 s the countdown `Ceiling[3 + timer − cTime]` (blue, size 24, at {0, 5}); then each evaluation turns the car by ω·v<sub>car</sub>·dt/r<sub>min</sub> and drives v<sub>car</sub>·dt along the new heading (the Dubins car of the Details), appending to the red path | the pursuit | v0.1.26 | unit "running: the car waits three seconds"; e2e "running: the countdown 3, 2, 1 at a fixed page clock" |
| F-HC-08 | The chauffeur's controller: bearing `goalTheta = mod2pi[angPt2Pt[car, pedestrian] − θ]`; Alpha = the angle around the turning circle on the pedestrian's side (`mod0to2pi`); if (\|Alpha r<sub>min</sub>\| − ArcTan[2.5/r<sub>min</sub>] r<sub>min</sub>)/v<sub>car</sub> ≤ max(\|centre − pedestrian\| − r<sub>min</sub>, 0) it turns toward the pedestrian (ω = Sign[goalTheta], or exactly onto it within one step), otherwise away (ω = −Sign[goalTheta] until pointing straight away) | the Details' pursuit algorithm | v0.1.26 | unit "the controller turns toward the pedestrian"; unit "the controller turns away when the pedestrian could escape"; unit "a whole chase at 60 evaluations per second" |
| F-HC-09 | Collision: `ptInCar` — the pedestrian's position in the car's rectangle −0.3 ≤ x ≤ 1.7, −0.5 ≤ y ≤ 0.5 (car frame); while running the mode becomes "Collision" (one more evaluation puts the single locator on the pedestrian, then nothing moves); the text "pedestrian hit!" or "pedestrian missed." (size 20 at {0, 8.5}) | the end of the game | v0.1.26 | unit "ptInCar: the car's rectangle"; unit "collision: the car reaches the pedestrian"; e2e "the car runs over the pedestrian" |
| F-HC-10 | The running time ```StringForm["running time `` s", NumberForm[Round[cTime − timer, 0.01], {3, 1}, NumberPadding -> {" ", "0"}]]``` (size 20, left end at {−4, −8.5}); in setup and Collision the time of the last run | the score | v0.1.26 | unit "NumberForm[x, {3, 1}, NumberPadding"; e2e "review screenshots at the five snapshot settings"; e2e "running: the countdown 3, 2, 1 at a fixed page clock" |
| F-HC-11 | The picture: the pedestrian's path (blue, Thick), the pedestrian `drawRunner` (light blue, dark blue edges: shoulders, elliptic head, arms swinging with `Clock[1, .3]`), the car's path (red, Thick), the car `drawCar` (red body with black edges, yellow headlight beams, axles, wheels, black arrow), the turning circles (gray, dashed, radius r<sub>min</sub> left and right of the rear axle); `PlotRange -> {{-15, 15}, {-9, 12}}`, `ImageSize -> {600, 400}` (571 × 400), no padding, clipped at the plot range; opening state = the notebook's saved state | the original's drawing | v0.1.26 | unit "drawCar: body Rectangle"; unit "drawRunner: shoulders and an elliptic head"; unit "evaluating the saved state reproduces it"; e2e "loads without errors and draws the saved state"; M-HC-02 |
| F-HC-12 | The locators: the original's `Locator[#, Graphics[…]] & /@ loc` look (Mathematica's default locator: black cross hairs, a thin black circle, a black ring at opacity 0.3; 17 px) at `loc`, kept within {−15, −9} … {15, 10}; as in a LocatorPane a click on the picture moves the nearest locator there; in "Collision" the locator snaps back to the pedestrian | dragging the players and the goal | v0.1.26 | e2e "setup: dragging the locators with the mouse"; unit "the locators' look"; unit "collision: the car reaches the pedestrian"; M-HC-03 |
| F-HC-13 | The five snapshot settings (setup; Collision after 23.8 s; "Setup" at 26.9 s; Collision after 6.2 s with r<sub>min</sub> 5; "Setup" at 10.7 s) give the snapshot pictures | the original's examples | v0.1.26 | unit "the notebook's five snapshot settings"; e2e "review screenshots at the five snapshot settings"; M-HC-09 |
| F-HC-14 | Caption and Details text (from the Demonstration) with the Dubins car's and the pedestrian's equations and three references | the original's explanation | v0.1.26 | M-HC-01 |
| A-HC-01 | "Initial settings" restores the opening state (the notebook's saved state, which equals the Manipulate's stored initial values) and stops a run | Manipulate's Initial Settings | v0.1.26 | e2e "Initial settings restores the opening state"; unit "the opening state is the notebook's saved state"; M-HC-06 |
| A-HC-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient, setClock) from the Manipulate layer | automated tests | v0.1.26 | e2e "running: the countdown 3, 2, 1 at a fixed page clock" |
| A-HC-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.25 | e2e "start-up notice when" |
| A-HC-04 | Breadcrumb link to all demos | navigation | v0.1.25 | inventory |
| A-HC-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.25 | e2e "attribution on" |
| A-HC-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.25 | e2e "bundle: homicidal-chauffeur runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-minRadius` | F-HC-01 |
| `value-minRadius` | F-HC-01 |
| `plus-minRadius` | F-HC-01 |
| `play-minRadius` | F-HC-01 |
| `stepback-minRadius` | F-HC-01 |
| `stepfwd-minRadius` | F-HC-01 |
| `slider-vcar` | F-HC-02 |
| `value-vcar` | F-HC-02 |
| `plus-vcar` | F-HC-02 |
| `play-vcar` | F-HC-02 |
| `stepback-vcar` | F-HC-02 |
| `stepfwd-vcar` | F-HC-02 |
| `setter-state-setup` | F-HC-03 |
| `setter-state-running` | F-HC-03 |
| `locator-loc-*` | F-HC-04, F-HC-12 |
| `reset` | A-HC-01 |
| `crumbs` | A-HC-04 |
| `details` | F-HC-14 |
| `credits` | A-HC-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names — `drawRunner`, `drawCar`, `ptInCar`,
  `distPt2Pt`, `angPt2Pt`, `mod2pi`, `mod0to2pi` — the text forms `StringForm` and `NumberForm` (the one form the
  running time needs), `Clock`, the locators' look `LOCATOR_LOOK`, and `evaluate(state, { time })` →
  `{ state, view, graphics }`: the body line by line (Collision, the mode switch, setup, running, the picture), its
  assignments to Manipulate variables returned in `state`; Mathematica's `!=` on reals is `Unequal`, `<`, `>`, `<=` on computed reals `Less`, `Greater`, `LessEqual`
  of `shared/wl.js`, so that "the car did not move", "the pedestrian has arrived" and the car's edges mean what they
  mean in the original. `SAVED` is the opening state and what Initial settings restores (the notebook's live state
  and its stored initial values are the same); `settles(state)` = running, or a mode change still pending (stateP ≠
  state). `view` reports the pedestrian, the car, the turning circles, dt, the controller's values (goalTheta, Alpha,
  ω, branch), the hit, the texts and the countdown for the tests.
- `main.js`: one `Manipulate({…})` — the original's control specs (hidden variables as `None` controls, the Locator
  `loc` with its range and `Appearance: LOCATOR_LOOK`), `clock: true`, `settle: settles`, `ControlPlacement: 'Top'`.
- Time: `AbsoluteTime[]` is the body's `time` (the page clock of `shared/clock.js`; tests fix it with
  `window.__demo.setClock(t)` and step it). `Clock[1, .3]` — a time-dependent value that makes Mathematica's Dynamic
  update by itself — is read from the same clock: `Clock(1, 0.3, time)` = Mod[time, 0.3]/0.3, the sawtooth from 0 to 1
  every 0.3 s; it is only evaluated while the pedestrian runs, when the body re-evaluates every frame anyway (N-HC-01).
- The picture's size: `ImageSize -> {600, 400}` makes Mathematica fit the 30 × 21 plot range into 571.4 × 400 px;
  the layer does the same since v0.1.26 (`IMAGE_SIZE` = 400·30/21 remains the width used for the locators' look), with
  `PlotRangePadding: 0` (measured on snapshot 1: 19.05 px per unit, the turning circles'
  radius 57.1 px), and the page centres the picture in a 600 px wide box as Mathematica does.
- No shared code was changed for this port.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- homicidal-chauffeur` → `dist/homicidal-chauffeur/`.
- Contents (generated with `node tools/bundle-app.mjs homicidal-chauffeur --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/homicidal-chauffeur/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/homicidal-chauffeur/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: homicidal-chauffeur runs from its own folder" (A-HC-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-HC-01: `ArcTan[0, 0]` (the pedestrian exactly on the car's rear-axle point or on a turning circle's centre) is 0
  here; in Mathematica it is Indeterminate, which leaves the hit test and the status text unevaluated. Only exactly
  equal coordinates are affected.
- N-HC-08: `Pause[0.01]` in the body is reproduced with the layer's `settleInterval: 0.01` (v0.1.26, added for this
  port): while running, evaluations are at least 10 ms of real time apart, so the minimum step `If[dt < 0.01, dt =
  0.01]` never makes the game faster than real time, also on displays faster than 100 frames per second (until then
  the port evaluated once per animation frame: 1.2 × too fast at 120 Hz). A locator drag can still add an evaluation.
- Q-HC-01: dt has no upper limit: after a pause (a hidden tab, a busy browser) the next step is as long as the pause —
  the pedestrian jumps up to its goal, the car turns and drives the whole pause in one step, possibly across the
  pedestrian without a hit (the hit test looks only at the end of a step, E-HC-03).
- Q-HC-02: a collision is final while the car stays on the pedestrian: switching to running again hits at once (the car
  has not moved); switch to setup and move the car or the pedestrian first.
- Q-HC-03: in Collision the single locator snaps back to the pedestrian (`loc = {runner}` in every evaluation); the
  sliders are disabled outside setup.
- Q-HC-04: the pedestrian faces +x (runnerθ = 0) whenever it stands — in setup, in Collision and when it has reached its
  goal; its arms swing only while it moves.
- Q-HC-05: the paths grow by one point per evaluation (also while the pedestrian stands) and are cleared only when a
  run starts; setup and Collision keep them, and "running time" shows the last run's time in setup.
- Q-HC-06: snapshots 3 and 5 store the mode "Setup" (capital S, from an older version of the code): neither setter
  button is pressed, no branch of the body applies (nothing moves, the locators move without effect) and the sliders are
  disabled; the snapshot pictures are what the current code draws for these settings.
- Q-HC-07: the first evaluation after "running" uses dt = the time since the last running evaluation (lastTime is not
  reset; in the opening state the notebook's 2018 time) — harmless, because the pedestrian stands on its locator and
  the car waits.
- Q-HC-08: the turning circles are drawn where they were before the car's step of the same evaluation (computed before
  the car moves): they lag one step behind the car.
- Q-HC-09: the hit test uses the pedestrian's position, a point: the drawn pedestrian (shoulders ±0.5) can overlap the
  car without a hit (E-HC-01).
- K-HC-01: snapshots 4 and 5 store r<sub>min</sub> 5.0 (a machine real): Mathematica's field shows "5.", the port's "5"
  (the saved state's number reaches the page as 5; the layer's setState cannot tell a machine real from an integer).
  After a drag to the right end the port shows "5." too.
- N-HC-01: `Clock[1, .3]` (the arms) is read from the page clock: Mod[AbsoluteTime[], 0.3]/0.3. Mathematica's clock
  starts its cycle when it is first displayed; the period, the sawtooth shape and the arm lengths 0.65·2(Clock − 0.5)
  are the same, the phase differs.
- N-HC-02: AbsoluteTime[] is counted in UTC here (Mathematica: the local time zone); only differences are used. The
  saved timer and lastTime are the notebook's (2018).
- N-HC-03: no plot-range padding and the 571 × 400 plot area, measured on snapshot 1 (the turning circles' radius
  57.1 px = 3 units, 400/21 = 19.05 px per unit; drawn content ends at the plot range, x = ±15 at 38 and 610 px).
- N-HC-04: the original draws `Locator[#, Graphics[…]] & /@ loc` with the control's own glyph turned off
  (`Appearance -> None`); the port gives that Graphics (Mathematica's default locator, 17 px) to the control as its
  `Appearance` (`LOCATOR_LOOK`, in picture units, so it scales with the picture like the rest) — the same look and
  place. Not reproduced: `Antialiasing -> False` of the hairs and the circles' half-pixel offset {−0.5, 0.5}, which
  aligns them to Mathematica's raster (the port centres them on the point). The shared `darkLocatorGlyph` (other
  ports) is a larger filled disk.
- N-HC-05: the running time's `NumberForm[…, {3, 1}, NumberPadding -> {" ", "0"}]` is measured on the snapshots
  (" 23.8", "  6.2", "  0.0", " 10.7": room for the sign and two digits before the point); its spaces are kept with
  `white-space: pre` on the text itself (SVG collapses spaces, and Chromium's own style for `<text>` is `nowrap`, so a
  style on an enclosing group is not inherited). From 100 s on the port shows three digits of precision and a padded
  0 (" 123.0") — our reading of NumberForm, not seen in a snapshot.
- N-HC-06: `AutorunSequencing -> {1}` (the order of Mathematica's Autorun) and `SaveDefinitions` have no counterpart.
- N-HC-07: `distPt2Pt` is computed with `Math.hypot` (no underflow of tiny differences, as steering-rc-cars N-SR-06).

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-26 | the port: the original's controls, the pedestrian and the car, the setup locators, the real-time game with the three-second head start, the chauffeur's controller, collisions and the running time, in simple mode; opening state from the notebook |
| 3 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-HC-01 | Limit dt (as steering-rc-cars' original does, at 0.1 s) | no jumps of the car and the pedestrian after a hidden tab or a slow frame | differs from the original | Q-HC-01 |
| I-HC-02 | Test the collision along the car's step (swept rectangle) instead of at its end | no car passing through the pedestrian at large steps | differs from the original; more geometry per frame | E-HC-03 |
| I-HC-03 | Hit when the car's rectangle touches the pedestrian's body (the rectangle grown by the pedestrian's half-width) | what the Details describe | differs from the original | E-HC-01, Q-HC-09 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the car's equations of motion (heading changed by ω·v<sub>car</sub>·dt/r<sub>min</sub>
with |ω| ≤ 1, i.e. u ∈ [−1/r<sub>min</sub>, 1/r<sub>min</sub>], then v<sub>car</sub>·dt along it) are a correct
discretization of the Details' Dubins car; the pedestrian's step min(distance, dt) keeps its speed at most 1; the
turning circles' centres carXY + r<sub>min</sub>(cos(θ ± π/2), sin(θ ± π/2)) and the angles Alpha around them are right;
the countdown shows 3, 2, 1 for the three-second head start (unit tests "running: the car waits three seconds", "the
controller turns toward the pedestrian").

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-HC-01 | conceptual | Details ("determines collision if the car boundary intersects the pedestrian") and `ptInCar` | the code tests whether the pedestrian's position — a point — lies inside the car's rectangle; the drawn pedestrian (shoulders ±0.5, head 0.3 × 0.25) can overlap the car without a hit | keeps the original's test (Q-HC-09) | hits up to about half a unit earlier (the rectangle grown by the pedestrian's half-width) | kept |
| E-HC-02 | mathematical | `ptInCar`: `ptCarRef = d {Cos[θ − φ], Sin[θ − φ]}` | the point is turned into the car's frame by θ − φ instead of φ − θ, so its lateral coordinate has the wrong sign; harmless, the test −0.5 ≤ y ≤ 0.5 is symmetric | keeps the formula | none on the result | kept |
| E-HC-03 | numerical | the running branch: `dt = cTime − lastTime` with only a lower bound, the hit test after the step | a long step (slow evaluation, hidden window) moves the car up to v<sub>car</sub>·dt at once and can carry it across the pedestrian without a hit | keeps it (Q-HC-01) | a swept test or a capped dt would catch it | kept |
