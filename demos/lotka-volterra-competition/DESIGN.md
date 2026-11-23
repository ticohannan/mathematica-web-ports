# Design document: Lotka-Volterra Competition Model

| | |
|---|---|
| Code version: | 0.1.42 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Lotka-Volterra Competition Model", contributed by Richard Cangelosi, published 2021-06-04 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/LotkaVolterraCompetitionModel/> |
| Port files | `model.js` (one evaluation of the Manipulate body: the rescaled equations, their equilibria, the three phase portraits, the separatrices and basins, the time plot; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

The classic Lotka–Volterra competition equations describe two species that compete for the same resources; each grows
logistically without the other. The original rescales each population by its carrying capacity:
x′ = r1 x (1 − x − α (k2/k1) y), y′ = r2 y (1 − y − β (k1/k2) x), so x and y are fractions (shown as percents) of
k1 and k2. The phase portrait (`StreamPlot` of the field on [0, 1]²) shows one of three outcomes: stable coexistence
(the community equilibrium inside the square and stable: the nullclines are drawn), competitive exclusion (the
community equilibrium outside the square: one species always wins) and the saddle case (the outcome depends on the
initial densities: the separatrices of the saddle and the two basins of attraction in colour). A small time plot in the
control column shows both populations from 35 % each over 0 ≤ t ≤ 120.

Source as text: [`docs/original-source/lotka-volterra-competition.txt`](../../docs/original-source/lotka-volterra-competition.txt);
snapshots `docs/original-snapshots/lotka-volterra-competition-1…4.png`; saved states
`tests/golden/lotka-volterra-competition.original-states.json`. The live state equals the initial settings.

## 2. Scope

In scope: the Manipulate (six sliders, the "reset" button, the phase portrait in its three forms, the time plot with
its legend), the caption and the Details. Out of scope: Mathematica's exact streamline seeding (D-LV-01).

## 3. Users and use cases

- UC-LV-01: a student varies the competition coefficients and sees the three outcomes and where the nullclines cross.
- UC-LV-02: a student in the saddle case sees which initial densities lead to which winner (the basins).
- UC-LV-03: a student compares the time plot with the phase portrait (the same equations from 35 %, 35 %).

## 4. Features

Source: the Manipulate.

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LV-01 | Sliders `{{Alpha, 0.63, "species 1"}, 0.01, 2, 0.01}` and `{{Beta, 0.53, "species 2"}, 0.01, 2, 0.01}` under "competition coefficients" (`Appearance -> "Labeled"`, `ImageSize -> 70`, `ControlType -> Slider`) | the original's controls | v0.1.41 | e2e "has its controls with their defaults"; e2e "a keyboard step on a slider changes the picture"; e2e "dragging the β slider with the mouse to the right end gives the exclusion case" |
| F-LV-02 | Sliders r1, r2 (0 … 2, step 0.01, default 0.55) under "intrinsic growth rates" and k1, k2 (10 … 300, step 1, default 100) under "carrying capacities"; the heading "Lotka–Volterra competition model" and the delimiters; `ControlPlacement -> Left` | the original's controls | v0.1.41 | e2e "has its controls with their defaults"; e2e "typing values gives the bistable case with separatrices and basins" |
| F-LV-03 | Button "reset": α = 0.63, β = 0.53, k1 = k2 = 120, r1 = r2 = 0.15 (the original's values, not the initial settings, Q-LV-01) | the original's button | v0.1.41 | e2e "the reset button sets the original values"; unit "the reset button sets the original values (not the initial ones)" |
| F-LV-04 | The equations `sys`, the equilibria (`Solve[sys == {0, 0}, vars, Reals]`: (0, 0), (0, 1), (1, 0) and {xEq, yEq} = {(k1 − k2 α)/(k1 (1 − α β)), (k2 − k1 β)/(k2 (1 − α β))}) drawn as black points (`PointSize[0.02]`) | the original's model | v0.1.41 | unit "the rescaled equations and the equilibria (hand derivation)" |
| F-LV-05 | The case: `stable = Det[D[sys, {vars}]] > 0` at {xEq, yEq}; coexistence when stable and inside [0, 1]², exclusion when {xEq, yEq} is outside, the saddle case otherwise; the plot label (a Column of three lines) for each | the original's logic | v0.1.41 | unit "the three cases at the snapshot settings"; e2e "the four snapshot settings" |
| F-LV-06 | Coexistence: `StreamPlot` of the field (StreamPoints → 25, shared/plot.js), the nullclines `ContourPlot[sys == 0]` (brown, `ContourStyle -> {Thickness[0.006], RGBColor[.63, .24, .18]}`) and `ParametricPlot[{t, −yEq/(1 − xEq)(t − 1)}]` (thick dark green), the axis lines x = 0 green and y = 0 brown, the equilibria | the original's picture | v0.1.41 | e2e "loads without errors and draws the picture"; unit "the pictures of each case have their parts" |
| F-LV-07 | Exclusion: the StreamPlot, the equilibria and black arrows up the y axis and along the x axis (`Arrowheads[0.02]`) | the original's picture | v0.1.41 | unit "the pictures of each case have their parts"; e2e "dragging the β slider with the mouse to the right end gives the exclusion case" |
| F-LV-08 | Saddle case: the separatrices (`sepICS` at the saddle with eps = 10⁻⁷, NDSolve over t = −1000 … 1000 stopped by the two WhenEvents; RK4 here), the basin polygons (`Partition`, `MapAt[Reverse]`, `Nearest` corners within 0.01) pale blue and light gray, `StreamPlot` with the default seeding, `Axes -> True` | the original's picture | v0.1.41 | unit "sepICS gives the four eigen-directions of the saddle in increasing angle"; unit "the separatrices of snapshot 4: the invariant line y = (1 − β)/(1 − α) x and the branches to (0, 1) and (1, 0)"; unit "the basins: pale blue above the separatrix (species 2 wins), light gray below (species 1 wins)"; e2e "typing values gives the bistable case with separatrices and basins" |
| F-LV-09 | Frame ticks as percents (`PercentForm` of 0, .25, …, 1), the frame labels "species 1 / population densities as a percent of carrying capacity" and "species 2", ImageSize {370, 400}, framed | the original's picture | v0.1.41 | unit "percent ticks as PercentForm writes them"; M-LV-02 |
| F-LV-10 | The time plot (the Dynamic in the control column): u, v of `NDSolve` from u(0) = v(0) = 0.35 over 0 … 120 in dark green and reddish brown, PlotRange {0, 1}, ticks 0 %, 50 %, 100 %, "time", the two-line top label, framed, the legend "species 1", "species 2" below | the original's plot | v0.1.41 | unit "the time solution agrees with an independent RK4 (snapshots 1, 3 and 4)"; e2e "the time plot and its legend" |
| F-LV-11 | Opening state = the notebook's live state = the initial settings (α = 0.63, β = 0.53, r1 = r2 = 0.55, k1 = k2 = 100) | the saved state | v0.1.41 | unit "the opening state is the saved live state and the initial settings"; e2e "has its controls with their defaults" |
| F-LV-12 | The four snapshot settings give the snapshots' pictures (D-LV-01 for the streamlines) | faithfulness | v0.1.41 | e2e "the four snapshot settings"; M-LV-05 |
| F-LV-13 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.41 | M-LV-01 |
| A-LV-01 | "Initial settings" button restores the opening state (the original's ⊕ > Initial Settings) | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-LV-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.41 | e2e "the four snapshot settings" |
| A-LV-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-LV-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-LV-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-LV-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: lotka-volterra-competition runs from its own folder" |
| A-LV-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-LV-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-LV-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-LV)"; e2e "errata switch on lotka-volterra-competition: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-α` | F-LV-01 |
| `value-α` | F-LV-01 |
| `slider-β` | F-LV-01 |
| `value-β` | F-LV-01 |
| `slider-r1` | F-LV-02 |
| `value-r1` | F-LV-02 |
| `slider-r2` | F-LV-02 |
| `value-r2` | F-LV-02 |
| `slider-k1` | F-LV-02 |
| `value-k1` | F-LV-02 |
| `slider-k2` | F-LV-02 |
| `value-k2` | F-LV-02 |
| `button-reset-button` | F-LV-03 |
| `reset` | A-LV-01 |
| `crumbs` | A-LV-04 |
| `details` | F-LV-13 |
| `credits` | A-LV-05 |
| `setter-errata-*` | A-LV-08 |
| `errata-details` | A-LV-08 |

## 6. Design

- `model.js` (pure): `SPECS`, `RESET`, `field` (sys), `jacobian`, `communityEquilibrium` ({xEq, yEq}), `equilibria`,
  `portraitCase` (the If of the body), `timeSolution` (sol, shared/ode.js NDSolve), `sepICS`, `separatrix` (the
  original's NDSolve with its two WhenEvents, as RK4 with step 0.02 and the events located by bisection of the step;
  the corrected mode of E-LV-01), `separatrices`, `nearCorner`, `basinPolygons`, then `phasePortrait` (the three
  pictures, annotated parts `stream-lines`, `stream-arrows`, `equilibria`, `u-nullcline`, `v-nullcline`, `axis-green`,
  `axis-brown`, `axis-arrows`, `basins`, `separatrices`, `plot-label`), `timePlot` and `evaluate`. The view reports the
  case, {xEq, yEq}, the equilibria, u(120), v(120), the label and the separatrices' last points (the errata scenario).
- `shared/plot.js` (v0.1.41, added for this port, opt-in): `StreamPlot` (evenly spaced streamlines, colours by speed,
  arrowheads) and `ContourPlot` of an equation (marching squares); unit tests `tests/unit/plot-stream-contour.test.js`.
- `main.js`: one `Manipulate` with the original's control list (headings, delimiters, `ControlType: Slider`), the
  button, the switch of `shared/errata.js`; two pictures (`graphic`: the phase portrait, `graphic2`: the time plot).
- `index.html`: `ControlPlacement -> Left` as a column of the controls and, below them, the framed time plot with its
  legend (HTML, D-LV-04); the phase portrait framed (`Framed`).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- lotka-volterra-competition` → `dist/lotka-volterra-competition/`.
- Contents (generated with `node tools/bundle-app.mjs lotka-volterra-competition --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/lotka-volterra-competition/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `ode.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/lotka-volterra-competition/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: lotka-volterra-competition runs from its own folder" (A-LV-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-LV-01 | deviation | The streamlines are placed by the port's evenly spaced seeding (shared/plot.js StreamPlot), not by Mathematica's, so the individual lines and arrowheads lie elsewhere; their density was matched to the snapshots (StreamPoints → 25: separation 0.06; the default: 0.042 with lines at most 0.22 long), the directions are the field's and the colours follow the speed with Mathematica's default stream colours fitted to the snapshots. |
| D-LV-02 | deviation | The three-line plot labels are drawn in the margin above the frame (the layer's PlotLabel is one line high); the time plot's top frame label is its PlotLabel. |
| D-LV-03 | deviation | α β = 1 (e.g. α = 0.5, β = 2): {xEq, yEq} divides by 0. Mathematica gets Indeterminate or ComplexInfinity and its If stays unevaluated (the output is code, with messages); the port shows the exclusion case with the three boundary equilibria. |
| D-LV-04 | deviation | The time plot's legend (`PlotLegends -> Placed[…, Below]`) is HTML under the plot (the layer places legends at the right or inside); its frame has ticks on all four sides (the original: none on the top and the right). |
| Q-LV-01 | quirk kept | The "reset" button sets k1 = k2 = 120 and r1 = r2 = 0.15, not the initial values 100 and 0.55 ("Initial settings" restores those). The rescaled picture depends on k1/k2 only, so k = 120 changes nothing; r = 0.15 slows the time plot. |
| Q-LV-02 | quirk kept | The Details number the snapshots 1–3; the notebook has four snapshot cells, the first two identical (the opening state), so the Details' snapshots 2 and 3 are the pictures 3 and 4. |
| Q-LV-03 | quirk kept | `ContourStyle -> {Thickness[0.006], RGBColor[.63, .24, .18]}` is a list of two styles, one per contour: the species-1 nullcline gets the thickness in the default colour (hidden under the green line), the species-2 nullcline the brown colour at the default thickness. |
| K-LV-01 | known issue | r1 = 0 or r2 = 0: Mathematica's Solve gives lines of equilibria and its picture shows errors; the port draws the stream plot, the four candidate points and (in the saddle branch) no separatrices. |
| N-LV-01 | note | With r1 = r2 and k1 = k2 the line y = (1 − β)/(1 − α) x is invariant, so the stable separatrix of snapshot 4 is the straight line to (1, 0.889) that the snapshot shows; the unit test uses this as an independent check. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the three phase portraits on the new StreamPlot and ContourPlot of shared/plot.js, the separatrices and basins, the time plot; switch for E-LV-01 |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-LV-01 | A locator for the time plot's initial densities (fixed at 35 %, 35 %), its trajectory drawn on the phase portrait | connects the two pictures | not in the original | F-LV-10 |
| I-LV-02 | Show the time plot over a span that scales with 1/r (tMax = 120 is short for small r) | the outcome is visible for every growth rate | not in the original | F-LV-10 |
| I-LV-03 | Mathematica's streamline seeding (if its rules can be measured) | pictures closer to the snapshots | measurement time | D-LV-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9): the rescaling (x = N1/K1, y = N2/K2 turns the classic
equations into `sys`), the equilibrium formula, the stability test (det > 0 with trace −(r1 xEq + r2 yEq) < 0 is a
stable node), the nullclines and axis arrows, the eigen-directions of `sepICS`, the polygon construction and colours
against the basins (independent RK4 runs in the unit tests), at the snapshot settings and for growth rates 0.01 … 2.
Kind: conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these
words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-LV-01 | numerical | `NDSolve[{…, WhenEvent[…]}, vars, {t, -1000, 1000}]` in `separatrices` | the separatrices start 10⁻⁷·Norm[p0] from the saddle and move at a speed proportional to the growth rates; the fixed span t = −1000 … 1000 is too short below about r1 = r2 = 0.1 (α = 1.45, β = 1.4): the curves to (0, 1) and (1, 0) stop short (at r1 = r2 = 0.05 they hardly leave the saddle), the `Nearest` corners within 0.01 are not found, and the basin polygons no longer cover the basins | kept: the fixed span (F-LV-08) **Switch:** with "errors of the original: corrected" (A-LV-08, v0.1.41) — each separatrix is integrated until it leaves the square, comes back to the saddle or reaches another equilibrium (no fixed time span), so the curves end at (0, 0), (0, 1) and (1, 0) and the basins are coloured correctly for every growth rate. With the opening settings the picture is the same as the original's. | the saddle-case pictures for small growth rates show the true separatrices and basins; the snapshots and the opening settings are unchanged | switchable since v0.1.41 |
