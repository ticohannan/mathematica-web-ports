# Design document: Moving Two Particles with Shared Control Inputs Using Wall Friction

| | |
|---|---|
| Code version: | 0.1.28 |
| Document revision | 2 (2026-10-27) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Moving Two Particles with Shared Control Inputs Using Wall Friction", contributed by Shiva Shahrokhi and Aaron T. Becker, published 2015-11-23 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MovingTwoParticlesWithSharedControlInputsUsingWallFriction/> Source as text: [`docs/original-source/wall-friction.txt`](../../docs/original-source/wall-friction.txt); snapshots `docs/original-snapshots/wall-friction-1…4.png`; saved states `tests/golden/wall-friction.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values, `snapshots` the four snapshots' settings) |
| Port files | `model.js` (the Initialization definitions under their names — the wall move in the four turned frames, the flips and mirrors, the best-first search, the point keeping — and one evaluation of the Manipulate body with its picture; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, `shared/graphics.js`, `shared/plot.js`, plain arithmetic; the first port with a framed plot as an `Inset` (a `RegionPlot` used as a framed canvas for its `Epilog`) |

## 1. Purpose and background

Two particles in a square workspace receive the same control input (a uniform magnetic gradient or electric field):
in free space they move by the same vector, so their spacing never changes. The Demonstration breaks this symmetry
with wall friction: a particle touching a wall does not move while the input pushes it into that wall [2]. So a move
first pushes both particles until one of them touches a wall; then that one is held and the other moves alone, which
changes the spacing. The body plans such moves with a best-first search: an entry is a sequence of moves with its
length; expanding it means either the last move straight to the goals (when the spacing is already the goal spacing)
or a push toward one of the four walls (the frame is turned so that the push is "up"; robot 1 is aimed at the wall on
the line to its goal's mirror image when the goal spacing can be reached in one move) followed by robot 2's adjustment;
the shortest entry is expanded next, and the first finished entry taken is the path. The picture shows the workspace
(dark red walls, the gray ε margin), each robot's start (square), goal (circle) and path in blue (robot 1) or magenta
(robot 2) up to the progress slider's position, and on the right either the Δ configuration space — the robots'
spacing p₂ − p₁ (red square), the goal spacing (green disk) and the spacings reachable in one move via a horizontal
wall (blue) or a vertical wall (green) — or the current move with the number of moves and the total distance.

## 2. Scope

In scope: the original's controls (setter, two sliders, four invisible locators), its search statement by statement
with its quirks, the picture with the Δ configuration space inset and the moves panel, with the notebook's saved state
as the opening state. Out of scope: anything the original does not do; port additions are the A- features. The search
is ported as it is: where it never ends (E-WF-02) the port gives up (D-WF-02).

## 3. Users and use cases

- UC-WF-01: a student drags the starts and goals and watches how the planned moves use the walls (and when a direct
  move suffices).
- UC-WF-02: a student moves the progress slider to follow the moves one by one and compares the robots' spacing with
  the reachable rectangles in the Δ configuration space.
- UC-WF-03: a teacher shows the moves panel (number of moves, total distance) and the effect of ε on how the robots
  approach the walls.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-WF-01 | Setter "on the right, show" `Row[{Control@{{ifMove, "Δ configuration space", "on the right, show"}, {"moves", "Δ configuration space"}}}]`; the inset is drawn for `ifMove == "Δ configuration space"` exactly, the moves for any other value (also the snapshots' "Δ Configuration Space", which selects no button; Q-WF-01) | the two right-hand views | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "the setter shows the moves"; e2e "review screenshots at the four snapshot settings"; unit "the notebook's four snapshot settings" |
| F-WF-02 | Slider "progress" `{{progress, 1, "progress"}, 0, 1, 1/420, Slider, Appearance -> "Labeled"}` (no ⊕ panel): exact steps k/420 shown reduced ("419/420", "3/4", "1"); `mvNum = Floor[progress (Length[path] − 1)]`, `mvFrac = FractionalPart[…]` taken exactly for the slider positions (N-WF-06); the robots at `path[[mvNum + 1]] + mvFrac (path[[mvNum + 2]] − path[[mvNum + 1]])` | following the moves | v0.1.26 | e2e "a progress slider step by keyboard moves the robots back along their paths"; unit "progressSplit: Floor and FractionalPart"; unit "progress 3/4 of the opening state" |
| F-WF-03 | Slider "ϵ" `{{ε, 1/20, "ε"}, 1/1000, 1/10, 1/1000, Slider, Appearance -> "Labeled"}` (no ⊕ panel), exact values shown reduced ("1/20", "13/500"): the white ε workspace `[ε, 1 − ε]²`, the gray disks of radius ε around robot 2's start and goal, the robots kept ε inside and ε apart, robot 1 nudged ε off a side wall in the wall move | how the particles approach the walls | v0.1.26 | e2e "the ϵ slider changes the workspace"; unit "the body writes the points back"; M-WF-03 |
| F-WF-04 | Four Locators `{{s1, {0.95, 0.95}}, {0, 0} + ε, {1, 1} − ε, Locator, Appearance -> None}` and likewise s2 {0.2, 0.8}, e1 {0.05, 0.95}, e2 {0.33, 0.66}: invisible, the range evaluated once with the opening ε (N-WF-01); as in a LocatorPane a click moves the nearest one there | the starts (squares) and goals (circles) | v0.1.26 | e2e "dragging robot 2's start with the mouse moves it and recomputes the paths"; e2e "a locator is kept in the opening ϵ workspace"; M-WF-05 |
| F-WF-05 | The body's `{s1, s2} = keepRobotsInWorkspaceAndSpaced[s1, s2, ε]` and the same for e1, e2, written back to the Manipulate variables: clipped to `[ε, 1 − ε]`; closer than ε: robot 2 moved along the line to distance ε when that is strictly inside, otherwise robot 1 put ε from robot 2 toward the centre {1/2, 1/2} (Q-WF-03); coincident: robot 1 ε to the left (to the right near the left wall) | points inside the workspace and apart | v0.1.26 | unit "keepRobotsInWorkspaceAndSpaced: clipped to [ε, 1 − ε]"; unit "the body writes the points back"; e2e "a locator is kept in the opening ϵ workspace" |
| F-WF-06 | The wall move: `wallFrictionMoveDir` (base case 1: spacing equal to the goal spacing within 0.00001 → the last move g2 − s2, finished; otherwise the frame turned by `rotate90`, `rotate180`, `rotate270`, the move made up and turned back) and `wallFrictionMoveUp` (`ensurer1r2`: robot 1 the top-left robot; the target spacing clipped to what one move can reach; m1 moves both until robot 1 touches the up wall, aimed at its goal's mirror image when reachable, kept inside, nudged ε off a side wall; m2 moves robot 2 alone, kept ε/2 off robot 1; robot 2 on the wall or m2 ≈ 0: a dead end, Infinity) | the Details' "pushing one robot to a wall and adjusting the relative position of the other" | v0.1.26 | unit "wallFrictionMoveUp aims robot 1 at the mirror image of its goal"; unit "wallFrictionMoveUp: a dead end (Infinity)"; unit "wallFrictionMoveDir: base case 1 for every direction"; unit "every move moves each robot by the shared input or leaves it at a wall" |
| F-WF-07 | `optimal2robotPath`: the best-first search statement by statement — the list starts with {Infinity, s1, s2, {{0, 0}}, {s1}, {s2}, False}; while the entry taken is not finished, its four expansions u, d, l, r are appended, the list is sorted with `SortBy[…, First]` (ties in canonical order of the whole entries), the first entry taken and deleted; the result is `optimalPathList[[1]]` after that (N-WF-02) | the Details' best-first search | v0.1.26 | unit "the search on the opening state (snapshot 1)"; unit "the notebook's four snapshot settings"; unit "aligned pairs whose spacing must grow" |
| F-WF-08 | The picture (`ImageSize -> 600`, `PlotRange -> {{−0.05, 1.75}, {−.05, 1.05}}`, N-WF-08): the walls `Darker[Red]` (−0.025 … 1.025), the square `Lighter[Gray, 0.8]`, the white ε workspace, gray ε disks around robot 2's start and goal; `PointSize[0.01]`, `Arrowheads[.03]`, `Thickness[0.005]`; per robot (Blue, Magenta) the faded dashed arrow start → goal (N-WF-07), the start point and square of side 4/3 r, the goal circle of radius r = 1/40, the path arrows of the moves made and of the current one, the current position (on a wall a point with a white centre) | the original's drawing | v0.1.26 | unit "the picture of the opening state"; e2e "loads without errors and draws the saved state"; M-WF-02 |
| F-WF-09 | The Δ configuration space: `Inset[RegionPlot[x < −3, {x, −1, 1}, {y, −1, 1}, Epilog -> {…}, FrameLabel -> {Δx, Δy}, LabelStyle -> Directive[Black, Bold], ImageSize -> 230], {1.38, .45}]` — a frame without a region; the Epilog: the spacings reachable in one move via a horizontal wall (`LightBlue`, `EdgeForm[Blue]`, {Δx − 1, Δy} … {1, 0} or mirrored) and via a vertical wall (`LightGreen`, `EdgeForm[Green]`, `Opacity[0.5]`, {0, −1} … {Δx, 1 + Δy} or mirrored; E-WF-04), the goal spacing as a green disk of radius 2r labelled "Δg", the current spacing as a red square of side 8/3 r labelled "Δr" (font size 16) | the Details' Δ configuration space | v0.1.26 | unit "the picture of the opening state"; unit "the blue rectangle holds what one move via a horizontal wall reaches"; e2e "loads without errors and draws the saved state"; M-WF-07 |
| F-WF-10 | The moves panel: "move k of n" and "total distance d " (`Darker[Red]`, size 18, at {1.4, .9} and {1.4, .8}; d = `Round[N[Total[…]], .01]` as Mathematica prints it), the current move as a faded arrow centred at {1.55, .5}, the part made as an arrow with a point at its tip; at progress 1 the last move, complete | the moves and their distances | v0.1.26 | unit "the moves panel"; e2e "the setter shows the moves"; e2e "review screenshots at the four snapshot settings" |
| F-WF-11 | Opening state = the notebook's saved state = its stored initial values: Δ configuration space, progress 1, ε = 1/20, s1 = (0.95, 0.95), s2 = (0.2, 0.8), e1 = (0.05, 0.95), e2 = (0.33, 0.66) | the published Demonstration's picture | v0.1.26 | unit "the opening state is the notebook's saved state"; e2e "has the controls of the original with their saved values"; M-WF-02 |
| F-WF-12 | The four snapshot settings give the snapshot pictures: 4, 5, 4 and 5 moves; the moves panel of snapshots 2 and 4 with total distance 1.89 and 1.93; ε shown as 1/20, 13/500, 1/1000, 61/1000 | the original's examples | v0.1.26 | unit "the notebook's four snapshot settings"; e2e "review screenshots at the four snapshot settings"; M-WF-08 |
| F-WF-13 | Caption and Details text (from the Demonstration) with the two references | the original's explanation | v0.1.26 | M-WF-01 |
| F-WF-14 | The Initialization definitions with the original's names and arguments: `wallFrictionMoveDir`, `wallFrictionMoveUp`, `returnr1r2`, `ensurer1r2`, `rotate270`, `rotate90inplace`, `rotate90`, `rotate270inplace`, `rotate180`, `rotate180inplace`, `mirror`, `mirrorInplace`, `distanceMoved`, `optimal2robotPath`, `keepRobotsInWorkspaceAndSpaced` | side-by-side comparison with the original | v0.1.26 | unit "the frame turns"; unit "ensurer1r2 makes robot 1 the top-left robot"; unit "distanceMoved = Total[Norm /@ moves]"; inventory |
| A-WF-01 | "Initial settings" restores the stored initial values (= the opening state) | Manipulate's Initial Settings | v0.1.26 | e2e "Initial settings restores the saved state"; M-WF-04 |
| A-WF-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient) from the Manipulate layer; `view()` reports the path, the robots' positions, the panel and the number of expansions | automated tests | v0.1.26 | e2e "a locator is kept in the opening ϵ workspace"; e2e "dragging robot 2's start with the mouse moves it and recomputes the paths" |
| A-WF-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.26 | e2e "start-up notice when" |
| A-WF-04 | Breadcrumb link to all demos | navigation | v0.1.26 | inventory |
| A-WF-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.26 | e2e "attribution on" |
| A-WF-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.26 | e2e "bundle: wall-friction runs from its own folder" |
| A-WF-07 | The invisible locators take the keyboard focus and move by 0.05 per arrow key (the layer's locator pane; K-WF-01) | use without a mouse | v0.1.26 | e2e "an invisible locator takes the keyboard focus and moves 0.05 per arrow key" |
| A-WF-08 | A search that has not ended after 300 expansions is given up and the picture shows `$Aborted` until a point moves (D-WF-02) | the page never hangs | v0.1.26 | e2e "aligned points whose spacing must grow"; unit "aligned pairs whose spacing must grow" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-ifMove-*` | F-WF-01 |
| `slider-progress` | F-WF-02 |
| `value-progress` | F-WF-02 |
| `slider-ϵ` | F-WF-03 |
| `value-ϵ` | F-WF-03 |
| `locator-*` | F-WF-04, A-WF-07 |
| `reset` | A-WF-01 |
| `crumbs` | A-WF-04 |
| `details` | F-WF-13 |
| `credits` | A-WF-05 |

## 6. Design

- `model.js`: the Initialization definitions in the original's order under its names (F-WF-14), one function each; a
  search entry is the original's list `[distance, r1, r2, path, path1, path2, done]` (Infinity for a dead end).
  `AppendTo[x, e]` is `x = Append(x, e)` (lists are values: the entries share no array that is changed later);
  Mathematica's `==`, `!=`, `<`, `<=`, `>`, `>=` on computed reals are `Equal`, `Unequal`, `Less`, `LessEqual`,
  `Greater`, `GreaterEqual` of `shared/wl.js`; `SortBy` of `shared/wl.js` breaks ties by the canonical order of the
  whole entries, as Mathematica's. `evaluate(state)` → `{ state, view, graphics }`: the point keeping (its results
  returned in `state`, as the original assigns the Manipulate variables), the search, `progressSplit`, the robots'
  positions and the picture; the Inset holds the `RegionPlot` of `shared/plot.js` with the original's options and
  `testid: 'config-plot'`. `SAVED` holds the notebook's saved state (the variable ϵ under the saved states' name).
- `main.js`: one `Manipulate({…})` — the setter in a Row, the two sliders in a Row as plain sliders (`ControlType:
  Slider`) whose `format` shows exact values as reduced fractions, the four Locators with `Appearance: None` and the
  range of the opening ε, `ControlPlacement: 'Top'`.
- `index.html`: the picture's container 602 px wide (the original's 600-px picture; the layer's default is 560 px).
- The search runs at every evaluation, as in the original: 0.2–1 ms (at most 17 expansions in 2000 random
  configurations; an evaluation with drawing about 3 ms in Chromium), 120–170 ms when it gives up after 300 expansions.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- wall-friction` → `dist/wall-friction/`.
- Contents (generated with `node tools/bundle-app.mjs wall-friction --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/wall-friction/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/wall-friction/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: wall-friction runs from its own folder" (A-WF-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-WF-01: every snapshot shows a 2-pixel magenta dot in the picture's top-left corner, at {−0.05, 1.05}, whatever
  the settings: probably Mathematica's drawing of the zero-length arrows (a robot held at a wall, the arrow to the
  current position at progress 1), whose heads have no direction, the last one drawn being robot 2's. The port draws
  nothing for a zero-length arrow (N-WF-05) and no dot.
- D-WF-02: where the original's search never ends (E-WF-02) Mathematica runs its While loop until the front end aborts
  the evaluation and the picture shows `$Aborted`; the port gives up after 300 expansions (`MAX_EXPANSIONS`; 120–170
  ms) and shows `$Aborted` in the middle of the picture until a point is moved (A-WF-08). A search that ends needs
  far fewer expansions (at most 17 in 2000 random configurations).
- D-WF-03: the Δ configuration space inset is laid out by the layer (shared/plot.js `RegionPlot`, shared/graphics-
  extras.js `insetLayout`, v0.1.26). Its plot range has Mathematica's 2 % padding (the frame at ±1.04, the RegionPlot
  default since v0.1.26); its margins are Mathematica's automatic ones measured on the snapshots and written as
  `ImagePadding -> {{40, 4}, {34, 4}}` (the layer's automatic margins are 60/10/42/8 px, which made the frame 160 px wide
  instead of 186 px). The tick labels are 11 px instead of about 10 px. The rotated "Δ*y*" stands at the layer's fixed
  43 px left of the frame (Mathematica: about 33 px, from the tick labels' width) and is a little larger (12 px bold;
  Mathematica about 11 px), so it reaches about 5 px over the right wall of the workspace at the opening state and
  snapshot 3 (in the original it stands in the white gap); "Δ*x*" is about 6 px lower. Frame labels placed from the tick
  labels' width is a proposal for the layer.
- D-WF-04: the controls look like the layer's: labels above the controls, ϵ's exact value inline ("1/20") where
  Mathematica writes it as a built-up fraction, an editable value field where Mathematica shows a label.
- Q-WF-01: snapshots 2 and 4 store `ifMove = "Δ Configuration Space"` (another spelling than the setter's values):
  no setter button is selected and, as the test is `ifMove == "Δ configuration space"`, the moves panel is shown — the
  same in the port.
- Q-WF-02: the progress slider gives every move the same share, whatever its length; at a move's start (mvFrac = 0)
  the arrow to the current position has zero length and the moves panel shows only the faded arrow and the point.
- Q-WF-03: `keepRobotsInWorkspaceAndSpaced` never moves robot 1 away from robot 2 (E-WF-01): when robot 2 cannot be moved
  to distance ε inside the workspace (strictly: a point on the edge of the ε workspace does not count), robot 1 is put
  ε from robot 2 toward the centre — so dragging a goal next to the other one on the workspace's edge moves the other
  goal.
- Q-WF-04: robot 1 is held at the wall during m2 also when m2 runs parallel to that wall (E-WF-03); the drawn path then
  shows it standing still.
- Q-WF-05: the starts and goals keep the positions the body gives them (written back to the locators): a point pulled
  beyond the ε workspace stays on its edge, a point moved closer than ε to its partner pushes one of the two away.
- K-WF-01: the arrow keys (A-WF-07) move a locator by 0.05, so two points easily end up exactly level (the same y, or
  the same x); so does pulling two points beyond the same edge (clipped to exactly ε or 1 − ε). With both pairs level
  and the goals farther apart than the starts, the search does not end (E-WF-02, D-WF-02).
- N-WF-01: the locators' range `{0, 0} + ε`, `{1, 1} − ε` is evaluated once, with the opening ε = 1/20 (Mathematica
  evaluates control ranges when it makes the controls): [0.05, 0.95]² whatever ε becomes; the body clips the points to
  the current ε workspace anyway.
- N-WF-02: `optimal2robotPath` returns `optimalPathList[[1]]` after the finished entry was taken off the list, i.e. not
  the entry it found but the next one; the four directions of an expansion return the same finished entry (base case 1
  comes before the direction), so the next one is an identical copy and the path is the same.
- N-WF-03: the frames of "r" and "l" are swapped: `rotate90` turns the left wall into the up wall, so "r" pushes left
  and "l" right. Harmless: all four directions are expanded every time, and the sort's ties are broken by the entries,
  not by their order.
- N-WF-04: a dead end returned early by `wallFrictionMoveUp` (robot 2 already on the up wall) keeps the flipped and
  mirrored positions and moves; it would be expanded only when every entry is a dead end (E-WF-02).
- N-WF-05: zero-length arrows — a robot held at a wall, the arrow to the current position at a move's start, the moves
  panel at fraction 0, a start equal to its goal — are not drawn; the layer would draw a round dot for them (D-WF-01).
- N-WF-06: Mathematica's progress slider gives exact rationals k/420, so `Floor` and `FractionalPart` of
  progress (Length[path] − 1) are exact; the port takes them of k·n/420 by an integer division for the slider positions.
  The machine product of the slider's value k·(1/420) and n gives the same move numbers for n ≤ 12, but at 13 of the move
  starts a fraction of about 10⁻¹⁶ instead of 0 (an interpolated position, an arrow of almost zero length); other values
  (possible only through the test hook) are taken as machine reals.
- N-WF-07: `Dashed` is drawn as the snapshots show it on these 3-px lines: 4-px dashes and gaps with flat ends; the
  dashed arrow's shaft is a `Line` and its head an `Arrow` over the last millionth of it, because the layer draws an
  Arrow's line with round caps, which close the gaps of `Dashed` (reported).
- N-WF-08: no `PlotRangePadding`: in the snapshots the dark red walls span 350 px for 1.05 units, i.e. 333.3 px per
  unit, so the 1.8 units of the plot range fill the 600 px.
- N-WF-09: the ε slider and the texts write ϵ (U+03F5), as Mathematica draws `\[Epsilon]` and as the saved states name
  the variable.
- N-WF-10: "total distance `` " ends with a space, which Mathematica centres with the text; the SVG text drops it, so the
  text stands about 2.5 px right of the snapshot's.
- N-WF-11: every expansion turns the whole history of positions into its frame and back, so the drawn path starts may
  differ in the last bit from the starts (0.19999999999999996 for 0.2) — the same IEEE arithmetic as Mathematica's,
  nothing visible.
- N-WF-12: the robot paths were checked against the friction model: in every move each robot moves by the shared move
  or stands at a wall, and no robot leaves the workspace (unit "every move moves each robot by the shared input or
  leaves it at a wall"; 2000 random configurations, where 9 % of the robot-moves are the parallel holds of E-WF-03).

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-27 | the port: the original's setter, sliders and four invisible locators, its search statement by statement, the picture with the Δ configuration space inset (`RegionPlot` in an `Inset`) and the moves panel, in simple mode; opening state from the notebook; tests against the snapshots and the friction model |
| 3 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |
| 4 | v0.1.28 | 2026-10-29 | version number; the shared slider gained the option `pauseWhenHidden` (off by default; motion planning, PA2 fix F-02) plays and steps a stored value outside its range from the position shown, and stops a playing animation when the slider is disabled (it went on) (v0.1.28); no change to this app's code, behaviour or picture (DOM parity with v0.1.27) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-WF-01 | End the search where both pairs are level and the spacing must widen (e.g. a first move that breaks the alignment) | no `$Aborted` for level points | changes the original's search | E-WF-02, D-WF-02 |
| I-WF-02 | Give m2 a small component into the wall when it runs parallel to it (and move robot 2 by it too) | paths that obey the friction model exactly | differs from the snapshots by that small amount | E-WF-03 |
| I-WF-03 | Add the missing semicolon in `keepRobotsInWorkspaceAndSpaced` | the point not dragged stays where it is more often | differs from the original | E-WF-01, Q-WF-03 |
| I-WF-04 | Correct the Details: the blue rectangle is reached via a horizontal wall, the green one via a vertical wall; the red square is the current spacing | the text matches the picture | changes the original's text | E-WF-04, E-WF-05 |
| I-WF-05 | Label the robots 1 (blue) and 2 (magenta) in the picture | the Details' "robot 1" and "robot 2" can be found | differs from the original | F-WF-08 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the robot paths against the friction model of the Details (N-WF-12), the
reachable rectangles against single moves of the original's own `wallFrictionMoveDir` (unit "the blue rectangle holds
what one move via a horizontal wall reaches"), the aimed first move against the reflection at the wall (unit
"wallFrictionMoveUp aims robot 1 at the mirror image of its goal"); the snapshot paths are right.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-WF-01 | conceptual | `keepRobotsInWorkspaceAndSpaced`: `tp = p2+ε((p1-p2))/(ds)` followed on the next line by `If[ε<tp[[1]]<1-ε && …, p1=tp, p1 = p2+ε(({1/2,1/2}-p2))/(…)]` | The semicolon after the assignment is missing, so the If becomes a factor of its right-hand side; it tests the old tp (the test that just failed) and always takes its second branch: the intended second alternative, robot 1 moved away from robot 2 to distance ε, is never used, and robot 1 is put ε from robot 2 toward the centre instead (tp gets a meaningless product) | keeps it (Q-WF-03; unit "keepRobotsInWorkspaceAndSpaced: clipped to [ε, 1 − ε]") | when robot 2 is on the workspace's edge, robot 1 moves straight away from it instead of toward the centre; both keep the spacing ε | kept |
| E-WF-02 | conceptual | `optimal2robotPath` (While loop) with `wallFrictionMoveUp` | When the starts are exactly level (the same y) and so are the goals, and the goals are farther apart than the starts in the same order (likewise with the same x), every expansion is a dead end: a push toward the top or bottom wall brings both robots to it at once (robot 2 on the wall), a push toward a side wall holds the robot nearer to it and can only bring the other one closer. All entries are Infinity; the loop keeps expanding the first one in canonical order and never ends (the list and its paths grow). Closing or swapping the spacing works (in 300 random level cases: every widening fails, no closing or swapping) | gives up after 300 expansions and shows `$Aborted` (D-WF-02; unit "aligned pairs whose spacing must grow") | a path for these positions (e.g. a first move that breaks the alignment) | kept |
| E-WF-03 | conceptual | `wallFrictionMoveUp`: m2 = {…, Δtgy − (r2y − r1y)} with robot 1 held | When the target spacing's y is already reached, m2 runs parallel to the up wall; under the Details' model ("zero velocity if the global control input pushes the particle into the wall") robot 1 would then slide along. Such a move is realizable only as the limit of moves with a small component into the wall, which would also move robot 2 by that amount | keeps it (Q-WF-04, N-WF-12) | paths realizable exactly, the end positions off by the chosen small amount | kept |
| E-WF-04 | text | Details: "The green rectangle represents Δx and Δy configurations reachable in one move by first colliding with a horizontal wall. The blue rectangle represents … a vertical wall." | The colours are swapped: by the code, the blue rectangle ({Δx − 1, Δy} … {1, 0}: the spacing's y between its current value and 0, its x almost free) is what one move via a horizontal wall reaches (the robot on the top or bottom wall is held, the other can only close the height difference), the green one ({0, −1} … {Δx, 1 + Δy}) what one move via a vertical wall reaches; every single move of the original's own wallFrictionMoveDir lands accordingly | keeps the text and the colours | the text names blue for horizontal and green for vertical walls | kept |
| E-WF-05 | text | Details: "The red square represents the starting Δx and Δy" | The red square is drawn at pm2 − pm1, the spacing at the progress slider's position: the starting spacing only at progress 0; at progress 1 (all snapshots) it sits on the green goal disk | keeps the text | "the current Δx and Δy" | kept |
