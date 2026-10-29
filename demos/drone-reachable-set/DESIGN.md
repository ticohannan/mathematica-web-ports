# Design document: Reachable Set for a Drone

| | |
|---|---|
| Code version: | 0.1.28 |
| Document revision | 2 (2026-10-27) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Reachable Set for a Drone", contributed by Mohammad Sultan and Aaron T. Becker, published 2019-12-09 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ReachableSetForADrone/> Source as text: [`docs/original-source/drone-reachable-set.txt`](../../docs/original-source/drone-reachable-set.txt); snapshots `docs/original-snapshots/drone-reachable-set-1…6.png`; saved states `tests/golden/drone-reachable-set.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values, `snapshots` the six snapshots' settings, each with the two plots the notebook had computed) |
| Port files | `model.js` (the Initialization definitions — the drone picture, the closed-form trajectories, the region and optimum plots, the LocatorPane's picture — and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`, with the t slider as a Control), `index.html` (the LocatorPane in the control column) |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, `shared/graphics.js`, `shared/plot.js` (the first port of a ParametricPlot region), plain arithmetic |

## 1. Purpose and background

The reachable set of a drone is the set of all positions it can reach at a given time. The Demonstration uses the
planar quadcopter model of Ritz, Hehn, Lupashin and D'Andrea, nondimensionalized by the maximum turning rate: the drone
pitches at a rate *U*<sub>R</sub> ∈ [−1, 1] and accelerates along its axis with a thrust *U*<sub>T</sub> between
*U*<sub>min</sub> and *U*<sub>max</sub> against gravity 1, so ẍ̂ = *U*<sub>T</sub> sin θ, z̈̂ = *U*<sub>T</sub> cos θ − 1. The candidate
optimal controls turn at the full rate and then fly straight (switching time *t̂*<sub>R</sub>), and use the minimum thrust
and then the maximum (switching time *t̂*<sub>T</sub>); the closed-form final positions over all (*t̂*<sub>R</sub>,
*t̂*<sub>T</sub>) ∈ [0, *T̂*]², together with their mirror images (turning the other way), fill the blue set. The locator in the
small (*t̂*<sub>R</sub>, *t̂*<sub>T</sub>) square chooses one control sequence: its path is the dashed line and the drone (or an
orange point) is shown at the time *t̂*. "optimum" draws the control sequences of the boundary in the colours of the square's
edges: blue maximum thrust throughout, green minimum thrust throughout, magenta no turning, brown turning throughout, red
the switching line *t̂*<sub>T</sub> = *t̂*<sub>R</sub> − π/2.

## 2. Scope

In scope: the original's controls (three sliders — one an IntervalSlider —, two checkboxes, the LocatorPane in the control
column), the picture with its automatic plot range and the original's quirks, with the notebook's saved state as the
opening state. Out of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-DR-01: a student moves the locator over the switching-time square and watches where the drone ends up inside the
  reachable set, and which corner or edge of the square gives which part of the boundary ("optimum").
- UC-DR-02: a student changes the final time and the thrust range and sees the set grow, fold over itself (darker blue)
  and, for a minimum thrust above 1, lift off the start (a crescent above the origin).
- UC-DR-03: a teacher drags *t̂* to show the drone flying along the path, turning until *t̂*<sub>R</sub>.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-DR-01 | Slider *T̂* final `{{T, 3, Row[{Style[T̂, Italic], " final"}]}, 0.1, 10, Appearance -> "Labeled", ImageSize -> 80}` (continuous): the final time of the set, the path and the square | the time of the reachable set | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "a new T: the region and the pane follow" |
| F-DR-02 | Slider *t̂* `{{t, T, Style[t̂, Italic]}, 0, T, T/100, Appearance -> "Labeled", ImageSize -> 80}`: range and step T/100 follow T; the initial value is the symbol T, so t follows T until the slider is moved (Q-DR-01); the body keeps t ≤ T (`If[t > T, t = T]`) | the time at which the drone is shown | v0.1.26 | e2e "a new T: the region and the pane follow; t = T follows T; the t slider (keyboard) moves by T/100"; unit "parameter checking: t and the locator are kept in [0, T]" |
| F-DR-03 | IntervalSlider *U*<sub>min/max</sub> `{{r1, {0.102, 2.04}}, 0, 5, 0.1, ControlType -> IntervalSlider, Method -> "Push", Appearance -> "Labeled", MinIntervalSize -> 0.1, ImageSize -> 50}`: the minimum and maximum thrust; a moved end pushes the other one, at least 0.1 apart; the label shows machine reals ("{0.1, 4.}") | the two parameters of the model | v0.1.26 | e2e "the IntervalSlider U min/max pushes the other end"; e2e "review screenshots at the six snapshot settings" |
| F-DR-04 | Checkbox "drone" `{{Drone, False, "drone"}, {True, False}}`: `drawdrone[Θ[t, tR, UR1, 0], x̂, ẑ, 1, Gray]` (body, arm, legs, four Lighter propeller ellipses, EdgeForm Black, turned by −Θ about its bounding box's centre) at the position at time t; unchecked an Orange point of PointSize Large | the drone and its attitude | v0.1.26 | e2e "the drone and optimum checkboxes draw the drone"; unit "drawdrone turns the drone by −Θ about the centre of its bounding box" |
| F-DR-05 | Checkbox "optimum": `optimumvalues[T, pg, Umin, Umax]` — Show of five Thick ParametricPlots: Blue tT = 0, Green tT = T, Magenta tR = 0, Brown tR = T, Red tT = tR − π/2 for tR ∈ [π/2, T] (only when T > π/2), each with its mirror image except Magenta | the control sequences of the boundary | v0.1.26 | e2e "the drone and optimum checkboxes draw the drone and the control sequences of the boundary"; unit "the optimum curves saved in the notebook lie on the port's curves" |
| F-DR-06 | The LocatorPane `{{tRtT, {1, 0}, Row[{t̂R, t̂T, "\ncontrol"}]}, (tRtTControl[#1, T] &)}` in the control column: `Plot[0, {tR, 0, T}]` (Thick Blue along tT = 0) with AxesLabel t̂R, t̂T, AspectRatio 1, PlotRange {{−0.1, 1.01 T}, {−0.1, 1.01 T}}, the LightBlue square [0, T]², Thick Brown tR = T, Green tT = T, Magenta tR = 0, Red tT = tR − π/2 (T > π/2) or a Blue point at the origin, ImageSize 1.125 {125, 125}; the locator stays in [0, T]² (the Dynamic's `Max[0, Min[T, …]]` and the body's checks); a click in the pane moves it there | choosing the switching times | v0.1.26 | e2e "dragging the locator in the LocatorPane sets the switching times"; unit "the LocatorPane picture: the square [0, T]²" |
| F-DR-07 | The model: `xphaseshift[t, tR, tT, θ0, UT1, UT2]` and `zphaseshift[…]` — the original's closed forms (If[tR <= tT, …, If[tR > tT, …]], each Piecewise in t), exact solutions of ẍ̂ = U sin θ, z̈̂ = U cos θ − 1 from rest; `Θ[t, tR, UR1, UR2]`; UR1 = 1 | the dynamics | v0.1.26 | unit "xphaseshift and zphaseshift solve"; unit "hand-derived trajectories"; unit "the two branches of the closed forms agree on tR = tT"; unit "Θ turns at UR1 until tR" |
| F-DR-08 | The reachable set `regions[T, pg, Umin, Umax]`: ParametricPlot of {x̂, ẑ} and {−x̂, ẑ} at time T over (ts1, ts2) ∈ [0, T]² — two regions, faces Blue at Opacity 0.3, darker where a region folds over itself or the two overlap, boundaries ColorData[97, 1] and [97, 2] (the images of the square's edges, the x̂ = 0 segment included) | the subject of the Demonstration | v0.1.26 | unit "the region boundaries saved in the notebook lie on the port's images of the four edges"; unit "the region plot: two mirrored regions"; e2e "loads without errors and draws the reachable set" |
| F-DR-09 | The path: ParametricPlot of (x̂, ẑ)(tv) for tv ∈ [0, T] with the locator's switching times, PlotStyle {Dashed, Black, Thick} | the chosen control sequence | v0.1.26 | unit "the picture of the opening state: the region, the dashed path"; e2e "loads without errors and draws the reachable set, the dashed path" |
| F-DR-10 | The picture `Show[regionsd, If[Optimum, regionsOpt, nothing], path, Graphics[…], PlotRange -> All]` with the region plot's options: Frame with automatic ticks, Axes inside the frame with the labels x̂ and ẑ at their ends beyond it, PlotRangePadding Scaled[0.05], LabelStyle Black, ImageSize {400, 400} with AspectRatio Automatic (centred); the drone widens the plot range (Q-DR-03); no horizontal axis where z = 0 is only the data's edge (Q-DR-04) | the original's drawing | v0.1.26 | unit "the picture of the opening state"; unit "pictureOptions fits the padded range"; unit "frameTickSpec: major steps"; unit "the notebook's six snapshot settings" |
| F-DR-11 | The plots are made again only when T or the thrust range changed: `If[tfold != T \|\| r1old != r1, …]` with the hidden variables tfold and r1old (regionsd, regionsOpt: N-DR-02) | the original's caching | v0.1.26 | unit "evaluating the saved state leaves it unchanged"; unit "parameter checking: t and the locator are kept in [0, T]" |
| F-DR-12 | Opening state = the notebook's saved state (T 3, t = T, thrust {0.102, 2.04}, locator {1, 0}, drone and optimum off); Initial settings = the Manipulate's own values (the same with tfold, r1old = −1, giving the same picture) | the published Demonstration | v0.1.26 | unit "the opening state is the notebook's saved state"; e2e "Initial settings restores the opening state"; M-DR-02 |
| F-DR-13 | The six snapshot settings give the snapshot pictures: the frames' proportions and the drone's positions as measured in them, the ticks (2 or 5), the crescent of snapshot 6 without its horizontal axis | the original's examples | v0.1.26 | unit "the notebook's six snapshot settings"; e2e "review screenshots at the six snapshot settings"; M-DR-07 |
| F-DR-14 | Caption and Details text (from the Demonstration) with the model's equations and two references | the original's explanation | v0.1.26 | M-DR-01 |
| F-DR-15 | ControlPlacement -> Left: the controls in a column at the left, each label right-aligned before its control, the LocatorPane with its label "t̂R t̂T control" below them | the original's layout | v0.1.26 | e2e "loads without errors and draws the reachable set, the dashed path, the orange point and the LocatorPane"; M-DR-06 |
| A-DR-01 | "Initial settings" button restores the Manipulate's initial values | Manipulate's Initial Settings | v0.1.25 | e2e "Initial settings restores the opening state" |
| A-DR-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient) from the Manipulate layer | automated tests | v0.1.25 | e2e "dragging the locator in the LocatorPane" |
| A-DR-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.25 | e2e "start-up notice when" |
| A-DR-04 | Breadcrumb link to all demos | navigation | v0.1.25 | inventory |
| A-DR-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.25 | e2e "attribution on" |
| A-DR-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.25 | e2e "bundle: drone-reachable-set runs from its own folder" |
| A-DR-07 | Arrow keys move the focused locator of the LocatorPane (0.05 per press), as on every page of the Manipulate layer | keyboard use | v0.1.26 | inventory |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-T` | F-DR-01 |
| `value-T` | F-DR-01 |
| `plus-T` | F-DR-01 |
| `play-T` | F-DR-01 |
| `stepback-T` | F-DR-01 |
| `stepfwd-T` | F-DR-01 |
| `slider-t` | F-DR-02 |
| `value-t` | F-DR-02 |
| `plus-t` | F-DR-02 |
| `play-t` | F-DR-02 |
| `stepback-t` | F-DR-02 |
| `stepfwd-t` | F-DR-02 |
| `islider-r1-lo` | F-DR-03 |
| `islider-r1-hi` | F-DR-03 |
| `check-Drone` | F-DR-04 |
| `check-Optimum` | F-DR-05 |
| `locator-tRtT` | F-DR-06, A-DR-07 |
| `reset` | A-DR-01 |
| `crumbs` | A-DR-04 |
| `details` | F-DR-14 |
| `credits` | A-DR-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names — `drawdrone`, `Theta`, `UR1`, `xphaseshift`,
  `zphaseshift` (the closed forms term by term, with θ0 and UR1), `nothing`, `regions`, `optimumvalues`, `tRtTControl` (the
  LocatorPane's Plot; `clampToSquare` its Dynamic's setter) — and `evaluate(state)` → `{ state, view, graphics: [picture,
  pane] }`: the body line by line (the parameter checking with Mathematica's tolerant `Greater`/`Less`, the tfold/r1old test
  with `Unequal`, the position at t, the path, the drone or the point, the Show). `SAVED` (the live state) is the opening
  state, `SPECS` what Initial settings restores; t may be `SYM_T` ({sym: 'T'}, as the saved states write it). The plots are
  kept by `cacheLast` keyed on T and the thrusts. PlotRange -> All is computed from everything drawn (`extentPoints`, also
  through the drone's Rotate and Translate), and `pictureOptions` turns it into the picture's options: the frame, the axes
  inside it, the margins (ImagePadding) that fit the plot range into 400 × 400 px and leave room for the tick labels and the
  axes labels, and the frame ticks (`frameTickSpec`); `axesLabels` draws x̂ and ẑ beyond the frame. `view` reports t, the
  switching times, the drone's position and angle, the plot ranges and which axes are drawn.
- `main.js`: one `Manipulate({…})` — the original's control specs (tfold and r1old as hidden variables, the Locator `tRtT`
  on picture 1), `initialSettings`, `throttle: 'frame'` (a new T makes the region again, up to about 40 ms at T = 10). The
  *t̂* slider is a `Control` of the page (`tSlider`): a slider of `shared/ui.js` made again when T changes (range 0 … T, step
  T/100) and showing the value of t also while t is the symbol T (the layer's dynamic ranges keep the first step, and its
  sliders need a number); `after` refreshes it after every evaluation.
- `index.html`: ControlPlacement -> Left — the controls column holds `#controls` and, below it, the LocatorPane's container
  `#graphic2` with its label; the picture `#graphic` at the right. Page CSS puts each label before its control and makes the
  IntervalSlider 50 px wide (ImageSize -> 50).
- Shared code used for the first time (v0.1.26, MIT): the region form of `ParametricPlot` in `shared/plot.js` (faces,
  folds, edge boundaries); Locator controls on a second picture (`{ picture: 1 }`); IntervalSlider with Method Push and
  MinIntervalSize; slider ranges given as functions of the state (here replaced by the Control, D-DR-05).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- drone-reachable-set` → `dist/drone-reachable-set/`.
- Contents (generated with `node tools/bundle-app.mjs drone-reachable-set --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/drone-reachable-set/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/drone-reachable-set/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: drone-reachable-set runs from its own folder" (A-DR-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-DR-01: the picture follows the controls while they are dragged. The original has ContinuousAction -> False: its body
  runs when a control is released (so its ControlActive[-1, T] and ControlActive["Speed", "Quality"] always give T and
  "Quality"; the port uses those values). The port's evaluation is fast enough to redraw at once.
- D-DR-02: the curves (path, optimum curves) are sampled by `shared/plot.js` (adaptive, not Mathematica's sampler); the
  notebook's saved optimum curves lie on the port's curves within 2·10⁻⁵ (unit test).
- D-DR-03: the region is sampled on a fixed grid of the switching-time square (`regionPlotPoints`: 60 × 60 up to T = 3,
  20 T × 20 T above, at most 120 × 120) where Mathematica refines its mesh adaptively (the saved plot at T = 3: 5429
  vertices, boundaries of 225 and 170 points; the port: boundaries of 241 points). The saved boundaries lie on the port's
  edge images within 2·10⁻⁵ and the extents agree within 10⁻³; at T = 10 each edge of the square is drawn with 120
  segments (a new T then takes up to about 40 ms).
- D-DR-04: the IntervalSlider has the layer's look (two small tabs above and below the track, the value as text) instead of
  Mathematica's (two circles, an editable field); its width is the original's 50 px (page CSS: the layer does not apply
  ImageSize to an IntervalSlider).
- D-DR-05: the *t̂* slider is made again whenever T changes (main.js `tSlider`, §6): an open ⊕ panel stays open, a
  running animation of t stops.
- Q-DR-01: t starts as the symbol T (the saved states store t = T unevaluated): until the *t̂* slider is moved, t follows
  T — its field shows T and the drone stays at the end of the path, as in all six snapshots; Initial settings restores the
  link. Once moved, t is a number: a larger T leaves it, a smaller T sets it to T.
- Q-DR-02: a smaller T moves the locator into the new square [0, T]² (the body's checks), and the square, the red line and
  the pane's ticks follow T; for T < 1 the pane's fixed lower end −0.1 leaves much of it empty.
- Q-DR-03: the plot range is PlotRange -> All of everything drawn: the drone (when shown) widens it, so the frame and its
  ticks change as the drone moves (snapshots 2 and 4: the range reaches below the set to the drone's propellers).
- Q-DR-04: AxesOrigin -> Automatic does not put the horizontal axis at z = 0 when z = 0 is only the edge of the data (the
  path's first point): with a minimum thrust above 1 (snapshot 6, the set above the start) or a maximum thrust below 1
  (the set below it) there is no horizontal axis and no label x̂, and the frame is wider (snapshot 6: 385 px instead of
  371). The port draws the axis only where 0 lies strictly inside the data.
- Q-DR-05: the path and the drone are those of the right region (turning at +1); the left region is their mirror image.
  For T > π the right region reaches x̂ < 0 and the two regions overlap (darker); a region's faces reach beyond its
  boundary lines where it folds over itself (the darker slivers in snapshot 1), because the boundaries are the images of
  the square's edges, not the outline.
- Q-DR-06: the drone is drawn with a fixed arm length 1.1 in the nondimensional units, so for small T it covers the set,
  for large T it is tiny; it turns about its bounding box's centre, 0.09 above the point (x̂, ẑ).
- K-DR-01: for the smallest T (about 0.1) the set is a narrow strip (AspectRatio Automatic, as in Mathematica): the frame is
  a few pixels wide and its bottom tick labels overlap.
- N-DR-01: the locator is the Manipulate layer's glyph (Mathematica's default locator) on picture 2 (`{ picture: 1 }`); as in
  a LocatorPane a click moves it to the click.
- N-DR-02: regionsd and regionsOpt (the cached plots, Manipulate variables of the original) are not variables of the port:
  `cacheLast` keyed on T and the thrusts keeps them; tfold and r1old are kept and set as in the original. The saved plots
  serve the unit tests as golden data.
- N-DR-03: the LocatorPane's label is text in `index.html` (the layer gives a locator no label); `ImageSize -> 10` of that
  control spec has no effect (the pane takes the Plot's size).
- N-DR-04: `shared/plot.js` gives ParametricPlot regions no frame (Mathematica's region plot has Frame -> True, Axes ->
  True, as the saved plot's options show) and draws no AxesLabel on a framed picture; the model sets Frame, Axes inside
  the frame, PlotRangePadding Scaled[0.05] and the margins itself and draws x̂ and ẑ as text beyond the frame
  (PlotRangeClipping off: everything else lies inside the range anyway).
- N-DR-05: the drone's Rotate gets its centre (0, 0.09 r) explicitly: `shared/graphics.js` bounds() does not handle
  `Disk[c, {rx, ry}]` (it gives NaN), so Rotate without a centre would fail on the propellers.
- N-DR-06: margins (ImagePadding) as measured in the snapshots: the picture's frame is 367 px wide (Mathematica 371), the
  left margin grows with the longest tick label; the pane's tick labels are 9 px (the layer's 11 px labels overlap in the
  140 px pane, where Mathematica's fit) and its axes labels 11 px.
- N-DR-07: `EdgeStyle -> None` inside the pane's Prolog list has no effect in the original (a rule among primitives); the
  square has no edge anyway.
- N-DR-08: PlotStyle -> {Dashed, Black, Thick} on one curve is one style in Mathematica (the snapshots show a black thick
  dashed path); `shared/plot.js` uses a list as one style per curve (only Dashed), so the model passes
  Directive[Dashed, Black, Thick].
- N-DR-09: the frame ticks are chosen by the model (`frameTickSpec`: 1, 2 or 5 × 10ⁿ nearest to a fifth of the range) to
  give the snapshots' steps; `shared/svg-frame.js` automaticTicks (a sixth of the range) gives 2 instead of 5 for snapshot
  5's z range 18.8.
- N-DR-10: the Details write θ and ω̄ (the notebook's \[Theta] and \[Omega]); its formulas are set as text lines.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-27 | the port: the original's controls (an IntervalSlider, the LocatorPane in the control column on a second picture), the closed-form model, the region and optimum plots, the path and the drone, PlotRange -> All with the frame and axes as in the snapshots; opening state and Initial settings from the notebook; golden checks against the notebook's saved plots |
| 3 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |
| 4 | v0.1.28 | 2026-10-29 | version number; the shared slider gained the option `pauseWhenHidden` (off by default; motion planning, PA2 fix F-02) plays and steps a stored value outside its range from the position shown, and stops a playing animation when the slider is disabled (it went on) (v0.1.28); no change to this app's code, behaviour or picture (DOM parity with v0.1.27) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-DR-01 | A 3D view: the set revolved about the z axis, as the Details suggest for a three-dimensional drone | shows the 3D reachable set | a second (3D) picture; not in the original | F-DR-08 |
| I-DR-02 | Show the switching times as numbers beside the LocatorPane (and accept typed values) | precise control sequences | differs from the original | F-DR-06 |
| I-DR-03 | A larger LocatorPane on touch screens | the 140 px square is small for a finger | differs from the original's layout | F-DR-06, F-DR-15 |
| I-DR-04 | Mark the drone's position at the two switching times on the path | shows where the control changes | differs from the original | F-DR-09 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the closed forms `xphaseshift` and `zphaseshift` are exact solutions of the
nondimensional model for both orders of the switching times, also with θ0 ≠ 0 (unit test against a numerical
integration), and agree on tR = tT; the region and the optimum curves the notebook saved lie on the port's curves. Not
checked: whether the two-parameter family of controls (turn then fly straight, minimum then maximum thrust, and the mirror
images) reaches the whole reachable set — the Details refer to [1, 2] for the candidate optimal controls.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-DR-01 | text | Details, the thrust bound | "U<sub>T</sub> ∈ [U<sub>Tmin</sub>, U<sub>Tmin</sub>]": the upper bound should be U<sub>Tmax</sub> | keeps the original's text | the interval reads [U<sub>Tmin</sub>, U<sub>Tmax</sub>] | kept |
| E-DR-02 | mathematical | Details, "U<sub>T</sub> = F<sub>T</sub>/m" | with x̂ = ω̄² x/g and t̂ = ω̄ t the dimensional ẍ = (F<sub>T</sub>/m) sin θ becomes ẍ̂ = (F<sub>T</sub>/(m g)) sin θ: the nondimensional thrust is the thrust-to-weight ratio F<sub>T</sub>/(m g), not F<sub>T</sub>/m | keeps the original's text (the code uses U<sub>T</sub> as the ratio, consistent with gravity 1) | the definition reads U<sub>T</sub> = F<sub>T</sub>/(m g) | kept |
| E-DR-03 | text | Details, the turning-rate bound | "U<sub>R</sub> = [−1, 1]" should read U<sub>R</sub> ∈ [−1, 1] | keeps the original's text | the bound reads as a range | kept |
