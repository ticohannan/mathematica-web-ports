# Design document: Artificial Potential Fields

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 4 (2026-11-24) — Dr. Becker's changes: the name, the obstacle pad, ρ<sub>0</sub> for the sum, the circle colours |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | "Demonstration of Attractive, Repulsive, and Combination Potential Fields" by Aaron T. Becker: ECE 6311 Lecture 22 notebook `Lecture-22-PotentialFields.nb` (not a published Demonstration; CC BY-NC-SA 3.0, as the author's Demonstrations) |
| Port files | `model.js` (Uatt, Urep, the four Manipulate bodies, the automatic height range and the contour colours; pure), `main.js` (four Manipulates on `shared/manipulate.js`, one per tab, and the tabs), `obstacle-pad.js` (the obstacles' control: a locator per obstacle, Add and Remove), `index.html` (the tab bar and four panels) |
| Test data | `tests/golden/potential-fields.original-states.json` (the notebook's seven saved Manipulate states and the first Manipulate's initial values, `tools/extract_state.py`); `tests/golden/potential-fields.screenshot-contours.json` (Tico's screenshots of the contour tab in Mathematica 15.0.1, 2026-11-23: two states, their levels and 800 points with their band colours); `tests/golden/potential-fields.saved-contour.json` (the notebook's older saved contour picture: its state fitted to its contour lines, its levels, height range and 200 points with their band colours) |

## 1. Purpose and background

The notebook, from Dr. Becker's ECE 6311 (robotics) Lecture 22, shows the potential fields used for motion planning in
four Manipulates: the attractive potential of a goal at the origin (quadratic up to the distance d, conic beyond, with
the "switch line" where the two parts meet), the repulsive potential of one obstacle (½ η (1/ρ − 1/ρ0)² within ρ0), and
their sum with two obstacles, as a surface and as a contour plot. It has no caption or Details. Tico asked for the four
to be separate tabs of one page (2026-11-23). Dr. Becker asked for changes (2026-11-24, by Tico): the name "Artificial
Potential Fields", a ρ<sub>0</sub> slider for the sum, parameter names with subscripts (ρ<sub>0</sub>, not ρ0), all
the obstacles of a tab in one control as locators of different colours with buttons to add and remove them, the
ρ<sub>0</sub> circles white and the d<sub>i</sub> circle red (A-PF-10 … A-PF-14).

## 2. Scope

In scope: the four Manipulates (their controls, pictures and behaviour) and the notebook's two definitions. Out of
scope: the notebook's last cell, a static contour plot (it is used as test data, §4 F-PF-12). Port additions are A-
features: the tabs, a caption and Details, and Dr. Becker's changes (A-PF-10 … A-PF-14).

## 3. Users and use cases

- UC-PF-01: a student explores the lecture's potential fields in a browser, without Mathematica.
- UC-PF-02: the lecturer shows one tab at a time in class (a link such as `…/potential-fields/#cont` opens a tab).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PF-01 | `Uatt[x, y, ζ, d]` and `Urep[x, y, xo, yo, η, ρ0]` as defined in the notebook's first cell (`If` on dist ≤ d and dist ≤ ρ0; Infinity at the obstacle) | the notebook's model | v0.1.42 | unit "Uatt: quadratic inside d, conic beyond, continuous with equal slopes at d"; unit "Urep: ½ η (1/ρ − 1/ρ0)² inside ρ0, 0 beyond, Infinity at the obstacle"; unit "the sum of the last two tabs uses η = 1 and ρ0 = 2" |
| F-PF-02 | Tab "Attractive" (the first Manipulate): sliders d<sub>i</sub> `{{di, 1, "d_i"}, 0.01, 4}` and ζ<sub>i</sub> `{{ζi, 1, "ζ_i"}, 0, 4}` | the notebook's controls | v0.1.42 | unit "the opening states are the initial values of each Manipulate"; e2e "attractive: the d slider moves the switch line; ζ = 0 is flat" |
| F-PF-03 | Its picture: `Show[{Plot3D[Uatt[x, y, ζi, di], {x, -4, 4}, {y, -4, 4}, PlotLabel -> "Attractive Potential"], Graphics3D[{Red, Thick, Line[Table[{di Cos[θ], di Sin[θ], ζi di²/2}, {θ, 0, 2π, π/32}]]}]}]`; drag to rotate | the notebook's picture | v0.1.42 | unit "attractive: the switch line is the circle dist = d at height ζ d²/2, 65 points"; e2e "loads without errors; the first tab shows its surface, the others are hidden" |
| F-PF-04 | Tab "Repulsive" (the second Manipulate): the obstacle obs `{{obs, {-1, 1}}, {-4, -4}, {4, 4}}` (now a locator of the obstacle pad, A-PF-11), sliders ρ<sub>0</sub> `{{ρ0, 2}, 0, 5}` and η<sub>i</sub> `{{ηi, 10}, 0, 200}` (labels A-PF-13) | the notebook's controls | v0.1.42 | unit "the opening states are the initial values of each Manipulate"; e2e "repulsive: dragging a locator moves its obstacle; the surface stays within −0.1 … 10" |
| F-PF-05 | Its picture: `Plot3D[Urep[x, y, obs[[1]], obs[[2]], ηi, ρ0], {x, -4, 4}, {y, -4, 4}, PlotLabel -> "Repulsive Potential", PlotRange -> {Automatic, Automatic, {-0.1, 10}}]`, the peak cut at 10 (D-PF-03); with several obstacles the sum of their Urep (A-PF-11) | the notebook's picture | v0.1.42 | unit "repulsive: the z range of the notebook, the surface cut at 10 (no hole at the pole)"; M-PF-09 |
| F-PF-06 | Tab "Attractive + repulsive" (the third Manipulate): d<sub>i</sub>, ζ<sub>i</sub> as F-PF-02 and the obstacles obs and obs2 (the notebook: a row of two unlabelled 2D sliders `Row[{Control[{{obs, {-1, 1}}, {-4, -4}, {4, 4}, ControlType -> Slider2D}], Control[{{obs2, {-1, 1}}, …}]}]`; now two locators of the obstacle pad, A-PF-11) | the notebook's controls | v0.1.42 | e2e "attractive + repulsive: one pad for all the obstacles, Add and Remove, and the rho_0 slider" |
| F-PF-07 | Its picture: `Plot3D[Uatt + Urep(obs) + Urep(obs2)` (η = 1, ρ0 = 2 fixed in the Module; now ρ<sub>0</sub> from its slider, A-PF-10, and every obstacle, A-PF-11) `, …, ExclusionsStyle -> Red, PlotLabel -> "Attractive+Repulsive Potential"]` with the switch line; automatic height range (D-PF-04), exclusion curves (D-PF-05, colours A-PF-12) | the notebook's picture | v0.1.42 | unit "attractive + repulsive: the d_i circle in red, the rho_0 circles in white, and the switch line" |
| F-PF-08 | Tab "Contour plot" (the fourth Manipulate): the controls of F-PF-06 | the notebook's controls | v0.1.42 | e2e "Initial settings restores the opening state of each tab" |
| F-PF-09 | Its picture: `ContourPlot[` the same sum `, {x, -4, 4}, {y, -4, 4}, ExclusionsStyle -> Red, PlotLabel -> "Attractive+Repulsive Potential"]`: bands in Mathematica's default contour colours (D-PF-06), contour lines black at opacity 0.5, values above the range white, the exclusion circles (A-PF-12), frame with ticks; the switch line is computed but not shown (`Show[{Energy(*,switchLine*)}]`) | the notebook's picture | v0.1.42 | unit "initial settings: the automatic contour levels of the screenshot"; unit "saved state 2: the automatic contour levels of the screenshot"; unit "initial settings: every sampled point has the band colour of the screenshot"; unit "saved state 2: every sampled point has the band colour of the screenshot"; unit "the gradient passes through the stored band colours, from dark purple to light orange"; e2e "contour: at saved state 2, the levels of the Mathematica screenshot and the exclusion circles" |
| F-PF-10 | Opening states: the Manipulates' initial values (d = 1, ζ = 1; obs = {−1, 1}, ρ<sub>0</sub> = 2, η = 10; obs = obs2 = {−1, 1} and ρ<sub>0</sub> = 2) — the notebook's live states differ (N-PF-01) | the Manipulates' own initial settings, as "Initial settings" restores | v0.1.42 | unit "the opening states are the initial values of each Manipulate"; e2e "Initial settings restores the opening state of each tab" |
| F-PF-11 | Plot labels above the 3D pictures and in the contour plot ("Attractive Potential", "Repulsive Potential", "Attractive+Repulsive Potential") | the notebook's PlotLabels | v0.1.42 | e2e "loads without errors; the first tab shows its surface, the others are hidden" |
| F-PF-12 | The notebook's last cell, a saved contour plot of the fourth Manipulate, is not shown; it is test data of F-PF-09 (§1, N-PF-02) | the only saved picture of the notebook | v0.1.42 | unit "the notebook older saved picture: its seven levels are the lowest levels of the port" |
| A-PF-01 | Each tab has its own "Initial settings" button, restoring that tab's opening state | Manipulate's Initial Settings, per Manipulate | v0.1.42 | e2e "Initial settings restores the opening state of each tab" |
| A-PF-02 | Test and automation hook: `window.__demos.{att, rep, comb, cont}` (each Manipulate's getState, setState, view, graphics; inkFraction, camera, pixelAt for the 3D tabs); `window.__demo` is the hook of the tab on show | automated tests | v0.1.42 | e2e "a click on a tab shows its panel and makes its hook window.__demo" |
| A-PF-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.42 | e2e "start-up notice when" |
| A-PF-04 | Breadcrumb link to all demos | navigation | v0.1.42 | inventory |
| A-PF-05 | Credits footer (author, the notebook's title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.42 | e2e "attribution on" |
| A-PF-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.42 | e2e "bundle: potential-fields runs from its own folder" |
| A-PF-07 | Landing-page thumbnail `thumbnail.webp`: the first tab at its initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.42 | e2e "every card on the landing page has a thumbnail that loads" |
| A-PF-08 | The four Manipulates as four tabs (a tab list with the WAI-ARIA tab pattern: click, arrow keys, Home, End); the tab is kept in the address (`#att`, `#rep`, `#comb`, `#cont`) so a link opens it | requested by Tico 2026-11-23: "expose those within separate tabs" | v0.1.42 | e2e "a click on a tab shows its panel and makes its hook window.__demo"; e2e "arrow keys, Home and End move between the tabs"; e2e "a link to a tab opens it" |
| A-PF-09 | A caption and Details written for the port (the notebook has none), marked as the port's | the page explains what it shows | v0.1.42 | M-PF-01 |
| A-PF-10 | The sum (third and fourth tab) has a ρ<sub>0</sub> slider, `{{ρ0, 2}, 0, 5}` as in the repulsive tab (the notebook: ρ0 = 2 fixed in the Module); the initial value keeps the notebook's picture | requested by Dr. Becker 2026-11-24 | v0.1.43 | unit "the sum of the last two tabs uses η = 1 and ρ0 = 2"; e2e "attractive + repulsive: one pad for all the obstacles, Add and Remove, and the rho_0 slider" |
| A-PF-11 | One control for all the obstacles of a tab (`obstacle-pad.js`): a 150 px pad with a locator per obstacle, each in its own colour (Mathematica's plot colours, ColorData[97], in order), buttons Add (a new obstacle at a free spot) and Remove (the selected one, ringed), at least one and at most eight obstacles; x and y fields for the selected locator; a press on the pad moves the nearest locator there (as LocatorPane); a focused locator moves with the arrow keys (0.1, Shift 0.5) and Delete removes it. The obstacles' Urep add up. The opening obstacles are the notebook's (one; two at {−1, 1}) | requested by Dr. Becker 2026-11-24: "put them all in the same controller, but different colors (make them locators and have a button to add/remove locators" | v0.1.43 | unit "any number of obstacles: their Urep add up (none: 0)"; unit "eight colours, the plot colours of Mathematica in order; Add picks a free spot"; e2e "repulsive: dragging a locator moves its obstacle; the surface stays within −0.1 … 10"; e2e "attractive + repulsive: one pad for all the obstacles, Add and Remove, and the rho_0 slider"; e2e "contour: a focused locator moves with the arrow keys and Delete removes it" |
| A-PF-12 | The ρ<sub>0</sub> circles white and the d<sub>i</sub> circle red, in the 3D sum (thick curves on the surface) and the contour plot (4 px); the repulsive tab's white rings as before (the notebook: `ExclusionsStyle -> Red` for all) | requested by Dr. Becker 2026-11-24 | v0.1.43 | unit "attractive + repulsive: the d_i circle in red, the rho_0 circles in white, and the switch line"; unit "the contour plot: the rho_0 circles white, the d_i circle red, one rho_0 circle per obstacle" |
| A-PF-13 | Parameter labels with subscripts: d<sub>i</sub>, ζ<sub>i</sub>, ρ<sub>0</sub>, η<sub>i</sub> (the notebook labels the repulsive tab's sliders with the variable names ρ0 and ηi) | requested by Dr. Becker 2026-11-24: "use underscores for the parameters (rho_0 not rho0)" | v0.1.43 | M-PF-01 |
| A-PF-14 | The app's name "Artificial Potential Fields" (title, heading, landing card); the folder and links stay `potential-fields` | requested by Dr. Becker 2026-11-24 | v0.1.43 | e2e "attribution on" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `tab-att` | A-PF-08 |
| `tab-rep` | A-PF-08 |
| `tab-comb` | A-PF-08 |
| `tab-cont` | A-PF-08 |
| `reset-*` | A-PF-01 |
| `slider-att-di` | F-PF-02 |
| `plus-att-di` | F-PF-02 |
| `play-att-di` | F-PF-02 |
| `stepback-att-di` | F-PF-02 |
| `stepfwd-att-di` | F-PF-02 |
| `slider-att-zi` | F-PF-02 |
| `plus-att-zi` | F-PF-02 |
| `play-att-zi` | F-PF-02 |
| `stepback-att-zi` | F-PF-02 |
| `stepfwd-att-zi` | F-PF-02 |
| `slider-comb-di` | F-PF-06 |
| `plus-comb-di` | F-PF-06 |
| `play-comb-di` | F-PF-06 |
| `stepback-comb-di` | F-PF-06 |
| `stepfwd-comb-di` | F-PF-06 |
| `slider-comb-zi` | F-PF-06 |
| `plus-comb-zi` | F-PF-06 |
| `play-comb-zi` | F-PF-06 |
| `stepback-comb-zi` | F-PF-06 |
| `stepfwd-comb-zi` | F-PF-06 |
| `slider-cont-di` | F-PF-08 |
| `plus-cont-di` | F-PF-08 |
| `play-cont-di` | F-PF-08 |
| `stepback-cont-di` | F-PF-08 |
| `stepfwd-cont-di` | F-PF-08 |
| `slider-cont-zi` | F-PF-08 |
| `plus-cont-zi` | F-PF-08 |
| `play-cont-zi` | F-PF-08 |
| `stepback-cont-zi` | F-PF-08 |
| `stepfwd-cont-zi` | F-PF-08 |
| `slider-rep-rho0` | F-PF-04 |
| `slider-rep-eta` | F-PF-04 |
| `plus-rep-rho0` | F-PF-04 |
| `plus-rep-eta` | F-PF-04 |
| `play-rep-rho0` | F-PF-04 |
| `play-rep-eta` | F-PF-04 |
| `stepback-rep-rho0` | F-PF-04 |
| `stepback-rep-eta` | F-PF-04 |
| `stepfwd-rep-rho0` | F-PF-04 |
| `stepfwd-rep-eta` | F-PF-04 |
| `slider-comb-rho0` | A-PF-10 |
| `plus-comb-rho0` | A-PF-10 |
| `play-comb-rho0` | A-PF-10 |
| `stepback-comb-rho0` | A-PF-10 |
| `stepfwd-comb-rho0` | A-PF-10 |
| `slider-cont-rho0` | A-PF-10 |
| `plus-cont-rho0` | A-PF-10 |
| `play-cont-rho0` | A-PF-10 |
| `stepback-cont-rho0` | A-PF-10 |
| `stepfwd-cont-rho0` | A-PF-10 |
| `locator-*-obs-*` | A-PF-11 |
| `value-*-obs-*` | A-PF-11 |
| `add-*-obs` | A-PF-11 |
| `remove-*-obs` | A-PF-11 |
| `scene-canvas-att` | F-PF-03 |
| `scene-canvas-rep` | F-PF-05 |
| `scene-canvas-comb` | F-PF-07 |
| `crumbs` | A-PF-04 |
| `details` | A-PF-09 |
| `credits` | A-PF-05 |

## 6. Design

- `model.js`: `Uatt`, `Urep`, `Ucombined`; `initialStates.{att, rep, comb, cont}()` and `evaluators` (one body per
  tab) → `{ view, graphics }`. The 3D tabs use `Plot3D` and `Show` of `shared/graphics3d.js`; the contour tab is drawn
  with `DensityPlot` of `shared/plot.js` (its colour function gives each band its colour) plus the contour lines from
  `implicitCurves` and the exclusion circles as Epilog (white at ρ<sub>0</sub>, red at d<sub>i</sub>). `automaticZRange` and `automaticContours` stand in for
  Mathematica's automatic height range and contours (D-PF-04); `CONTOUR_GRADIENT` holds the measured band colours.
- `main.js`: four `Manipulate({…})` of `shared/manipulate.js`, each with its own elements (`controls-<tab>`,
  `graphic-<tab>`, `reset-<tab>`) and control names prefixed with the tab; `View3D` for the 3D tabs. All four are
  built when the page opens (the inactive panels are `hidden`), so every control exists for the inventory test; the
  tab script swaps `window.__demo` and the address.
- `obstacle-pad.js`: the obstacles' control (A-PF-11), a `Control(obstaclePad, { name, min, max, minCount })` factory
  of `shared/manipulate.js`; its value is the list of the obstacles' points (the state's `obs`).
- No shared code is changed: everything new is app-local (the tabs, the clipped tops, the exclusion curves, the
  contour plot, the obstacle pad), so the other apps are unaffected.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- potential-fields` → `dist/potential-fields/`.
- Contents (generated with `node tools/bundle-app.mjs potential-fields --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/potential-fields/`) | 4 | `index.html`, `main.js`, `model.js`, `obstacle-pad.js` |
| `shared/` | 21 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/potential-fields/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: potential-fields runs from its own folder" (A-PF-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-PF-01 | deviation | Layout: the four Manipulates are tabs of one page (A-PF-08) instead of four cells of a notebook; the controls use the layer's look; the obstacles are locators of one 150 px pad per tab with value fields for the selected one (A-PF-11). |
| D-PF-02 | deviation | Surfaces are sampled on a fixed 65 × 65 grid (Mathematica refines adaptively); the contour plot is a 240 × 240 raster of band colours with contour lines from marching squares on a 160 × 160 grid, where Mathematica draws polygons. Bands and lines agree with the saved picture (unit tests: levels identical, 0.03 colour tolerance). |
| D-PF-03 | deviation | Mathematica's default `ClippingStyle -> Automatic` caps the parts of a surface above the plot range with a light grey top (Tico's screenshots, 2026-11-23). The port cuts the surface at the top of the box and draws a flat grey top over the cut-off area (app-local `topCap`, colour `CAP`); the port lights it like the surface, so it shows a light beige where Mathematica's is neutral grey. The obstacle itself (Infinity) is treated as above the box, not as a hole. |
| D-PF-04 | deviation | Automatic height range (third and fourth tab): Mathematica leaves out the poles at the obstacles by a rule it does not document. The port's rule (`automaticZRange`): on a 101 × 101 grid, the top is the upper quartile plus 2.5 interquartile ranges, or the largest value when that is lower; the bottom likewise below the lower quartile. Fitted to Tico's screenshots: at the initial values the contours 1 … 7 and a 3D box up to about 7 (port 7.33), at the notebook's second saved state of the fourth Manipulate the contours 5 … 30 (both levels identical). The notebook's older saved picture has a top of 1.55 where the rule gives 1.64 (one more contour, 1.6; N-PF-02). Contours: the round values 1, 2 or 5 × 10^k apart that give the number of bands nearest to ten. M-PF-08 checks other states. |
| D-PF-05 | deviation | Exclusions: Mathematica treats the conditions of the `If`s (dist = d about the origin, dist = ρ0 about each obstacle) as possible discontinuities (Q-PF-01). With `ExclusionsStyle -> Red` (last two tabs) it draws them in red; without it (repulsive tab) it leaves a gap that shows as a white ring in Tico's screenshots. The port draws the circles as lines of 4 px (contour tab) and as thick curves on the surface (3D sum), complete circles clipped to the plot, white at ρ<sub>0</sub> and red at d<sub>i</sub> (A-PF-12), and as a thick white curve on the surface at dist = ρ0 (repulsive tab). In the attractive tab the red switch line covers the gap at dist = d. |
| D-PF-06 | deviation | Mathematica's default contour colours are not documented. `CONTOUR_GRADIENT` holds the band colours of Tico's two screenshots of the contour tab (Mathematica 15.0.1) at the scaled middle of their bands, dark purple 0.4, 0.051, 0.4 … light orange 1, 0.729, 0.482 at 0.75, linear between them; above 0.75 (not in the screenshots) it goes on to 1, 0.882, 0.647 at the top, a guess. The notebook's older saved picture uses other colours (blue to yellow, an older Mathematica). |
| D-PF-07 | deviation | The plot labels of the 3D tabs are page text above the picture (View3D's PlotLabel element). |
| D-PF-08 | deviation | The contour plot has no padding inside its frame (Mathematica's PlotRangePadding is 2 % on each side). |
| Q-PF-01 | quirk kept | The red exclusion curves mark where the `If`s switch, but the potentials are continuous there (Uatt even with its slope); Mathematica cannot tell that from the `If`s. Kept as the notebook shows it. |
| Q-PF-02 | quirk kept | In the third tab the red switch line is drawn at height ζ d²/2, the attractive part alone: where an obstacle is within reach the surface is above it. |
| Q-PF-03 | quirk kept | In the last two tabs both obstacles start at {−1, 1}, one on top of the other (so one obstacle of twice the strength); in the pad the second locator covers the first ("2 obstacles" below the buttons). |
| Q-PF-04 | quirk kept | ρ0 = 0 (reachable) gives a flat repulsive potential (the condition holds only at the obstacle itself). |
| K-PF-01 | known issue (closed in v0.1.42) | The default Plot3D look, from Tico's screenshots (2026-11-23): an orange surface lit to yellow under Mathematica's default lights (`SURFACE`, fitted to the screenshots' colours), Plot3D's box ratios 1 : 1 : 0.4 in a 360 × 300 picture, the z ticks on the left front edge and the y ticks on the right (`AxesEdge`), 15 mesh lines each way. The lighting differs in detail (the port's steep sides are more olive). M-PF-07. |
| N-PF-01 | note | The notebook's saved live states are d = 2.04, ζ = 2.655; d = 0.01, ζ = 2.11; d = 3.085, ζ = 2.195 (three more outputs of the first cell), the second Manipulate's initial values, and for the last two {d = 1, ζ = 1, obs = {−1.8, 0.5}, obs2 = {−1, 1}} and {d = 1.5, ζ = 3.115, obs = {0.62, 1.35}, obs2 = {−2.12, 1.02}} (in the golden file). The port opens at the initial values, which "Initial settings" restores. |
| N-PF-02 | note | The saved contour plot (the notebook's last cell) is of none of the saved states: fitted to its seven contour lines (rms 0.0027) it shows d = 1.753, ζ = 0.1415, obs = {−1.30, 0.35}, obs2 = {0.20, 1.30}; its bands span 0.0225 … 1.55, in the colours of an older Mathematica. The port follows Tico's screenshots of the current version (D-PF-04, D-PF-06). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.42 | 2026-11-23 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.42 | 2026-11-23 | the port: the notebook's four Manipulates as four tabs (A-PF-08), Uatt and Urep, three Plot3D tabs with the cut-off tops and red exclusion curves, the contour tab checked against the notebook's saved contour picture (levels, band colours), an automatic height range fitted to it (D-PF-04) |
| 3 | v0.1.42 | 2026-11-23 | the look of Tico's screenshots: orange surfaces, box and axes as Mathematica (K-PF-01 closed), grey caps, the white gap ring of the repulsive tab, the current contour colours and an automatic range fitted to the screenshots (D-PF-03 … D-PF-06) |
| 4 | v0.1.43 | 2026-11-24 | Dr. Becker's changes: the name "Artificial Potential Fields" (A-PF-14), one obstacle pad per tab with coloured locators, Add and Remove (A-PF-11), a ρ<sub>0</sub> slider for the sum (A-PF-10), white ρ<sub>0</sub> and red d<sub>i</sub> circles (A-PF-12), labels with subscripts (A-PF-13) |
| 5 | v0.1.44 | 2026-11-27 | version number (v0.1.44: eight new apps, on predator–prey agents, Gaussian autocorrelation, solar mountings, asteroid-belt resonances, a planetary atmosphere, batch distillation, degrees of freedom of a distillation and Carnot cycles; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PF-01 | An unlit grey for the caps (needs an unlit surface style in `shared/graphics3d.js`) | the caps neutral grey as in Mathematica | a shared change: every 3D app retested | D-PF-03 |
| I-PF-02 | A fifth tab or overlay: the negative gradient as arrows (StreamPlot of −∇U) and a path from a start point | shows how a robot moves in the field (the lecture's point) | a feature the notebook does not have; needs Tico's decision | — |
| I-PF-03 | Mathematica's adaptive sampling near the obstacles | smoother peaks | more code | D-PF-02 |

## 11. Errors in the original (conceptual and mathematical)

To be checked when the Demonstration's code is ported (rule 9). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| — | none found | — | — | — | — | — |

Checked: Uatt is the standard quadratic–conic attractive potential (continuous, with the slope ζ d on both sides of d:
unit test); Urep the standard repulsive potential (0 at ρ0, unbounded at the obstacle); the switch line lies on the
attractive surface; the fixed η = 1, ρ0 = 2 of the last two tabs are stated in their Module (ρ<sub>0</sub> is a slider
there since v0.1.43, A-PF-10). The red exclusion curves
(Q-PF-01) and the shared starting point of the two obstacles (Q-PF-03) are quirks, not errors.
