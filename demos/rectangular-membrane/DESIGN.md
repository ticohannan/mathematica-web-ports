# Design document: Vibrations of a Rectangular Membrane

| | |
|---|---|
| Code version: | 0.1.43 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Vibrations of a Rectangular Membrane", contributed by Alain Goriely, published 2007-12-13 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/VibrationsOfARectangularMembrane/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

The two-dimensional wave equation ∂<sub>t,t</sub>u = c²(∂<sub>x,x</sub>u + ∂<sub>y,y</sub>u) models a vibrating rectangular
membrane of length a and width b, fixed at its edges (u = 0 on the boundary). Its standing waves are the modes
sin(mπx/a) sin(nπy/b), each oscillating with its own angular frequency ω<sub>mn</sub> = cπ√(m²/a² + n²/b²). The
Demonstration starts the membrane at rest (no initial velocity) in a superposition of the four modes with m, n ∈ {1, 2},
with amplitudes B[m, n] set by sliders, and shows the surface u(x, y, t) = Σ B[m, n] cos(ω<sub>mn</sub>t) sin(mπx/a)
sin(nπy/b) at the time t chosen with a slider, as a `Plot3D` coloured by height.

The original is one `Manipulate` of a `Plot3D` (no initialization code). The port draws the same surface with the same
options on `shared/graphics3d.js` `Plot3D` (added for this app in v0.1.41) and `shared/graphics3d-view.js`.

## 2. Scope

In scope: the Demonstration's nine sliders, its picture (the surface, its colours, its box, ticks and mesh, the
clipping at the box) and its caption. Out of scope: Mathematica's ⊕ menu items other than Initial Settings (Autorun,
snapshots, Paste Input; N-RA-04); the template texts of the notebook's unused sections (E-RA-01).

## 3. Users and use cases

- UC-RA-01: a student explores the Demonstration in a browser, without Mathematica: sets the amplitudes of the four
  modes and watches the membrane at different times (the time slider's ⊕ panel plays it).
- UC-RA-02: a teacher shows how the shape of the rectangle (length, width) changes the frequencies of the modes, so
  that a mixed profile changes its shape over time.
- UC-RA-03: a reader compares the port with the original at the four snapshot settings (docs/checklists).

## 4. Features

The original's variables B[1,1], B[2,1], B[1,2], B[2,2] are `B11`, `B21`, `B12`, `B22` in the port (N-RA-01).

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-RA-01 | Slider "length" `{{a, 4, "length"}, 1, 10, .01, Appearance -> "Labeled", ImageSize -> Tiny}` (value field and ⊕ animation panel) | the length a of the membrane (x from 0 to a) | v0.1.41 | e2e "with their labels, defaults and ranges, in the original"; e2e "dragging the length slider with the mouse makes the membrane longer" |
| F-RA-02 | Slider "width" `{{b, 4, "width"}, 1, 10, .01, …}` | the width b (y from 0 to b) | v0.1.41 | e2e "with their labels, defaults and ranges, in the original"; unit "the box: PlotRange {{0, a}, {0, b}" |
| F-RA-03 | Heading "   mode" and four sliders `{{B[1,1], 0.5, "m=1, n=1"}, -2, 2, .01, …}`, `B[2,1]` "m=2, n=1", `B[1,2]` "m=1, n=2", `B[2,2]` "m=2, n=2" (initial 0) | the amplitudes of the four modes in the initial profile | v0.1.41 | e2e "with their labels, defaults and ranges, in the original"; e2e "a keyboard step of m=1, n=1 raises the membrane"; unit "the body solves the wave equation" |
| F-RA-04 | Slider "time" `{{t, 0, "time"}, 0, 10, .01, …}` | the time at which the membrane is shown (its ⊕ panel animates it) | v0.1.41 | e2e "a typed time inverts the (1,1) mode after 2√2"; unit "each mode has its own frequency" |
| F-RA-05 | Slider "wave speed" `{{c, 1, "wave speed"}, 0, 2, .01, …}` | c of the wave equation: scales every frequency | v0.1.41 | unit "each mode has its own frequency"; e2e "with their labels, defaults and ranges, in the original" |
| F-RA-06 | Slider "reduce box height" `{{zrange, 0, "reduce box height"}, 0, 2, 0.1, …}` | shrinks the box's z range symmetrically, cutting off the parts of the surface outside it | v0.1.41 | e2e "reduce box height: up to S the box gets flatter"; unit "reduce box height ≥ S" |
| F-RA-07 | Control layout: `Delimiter`s after width, after the modes and after wave speed; `ControlPlacement -> Left` | the original's grouping | v0.1.41 | e2e "with their labels, defaults and ranges, in the original"; M-RA-02 |
| F-RA-08 | The body: `Plot3D[Σ B[m,n] Cos[Sqrt[m²/a² + n²/b²] c π t] Sin[m π x/a] Sin[n π y/b], {x, 0, a}, {y, 0, b}, …]`, the four modes m, n ∈ {1, 2} | the solution of the wave equation with zero initial velocity | v0.1.41 | unit "the body solves the wave equation"; unit "each mode has its own frequency" |
| F-RA-09 | `ColorFunction -> Function[{x, y, z}, Hue[z/S]]`, S = Abs[B[1,1]] + Abs[B[2,1]] + Abs[B[1,2]] + Abs[B[2,2]], `ColorFunctionScaling -> False`: colour by height, Hue periodic (red at rest and at ±S; Q-RA-01), lit by Mathematica's neutral lights (D-RA-05) | shows the height | v0.1.41 | unit "the colours: Hue[z/S] at every vertex"; e2e "loads without errors and draws the membrane"; e2e "the original's settings give its box, ticks and colours" |
| F-RA-10 | `PlotRange -> {{0, a}, {0, b}, {-S + zrange, S - zrange}}` with `ClippingStyle -> None`: the surface is cut where it leaves the box, nothing drawn there | a box that holds every possible height (S bounds \|u\|), made lower with "reduce box height" | v0.1.41 | unit "ClippingStyle -> None at snapshot 4"; unit "the box: PlotRange {{0, a}, {0, b}" |
| F-RA-11 | Plot3D's frame and look: `BoxRatios -> Automatic` (the box in its true proportions), the box with axes and ticks on three edges (D-RA-02, D-RA-04), 15 mesh lines each way on the surface, `ImageSize -> {390, 350}`, Mathematica's default ViewPoint {1.3, −2.4, 2}, the box fitted to the image for every new picture (D-RA-03) | the original's picture | v0.1.41 | unit "the tick labels of the box as in the snapshots"; unit "the plot: 65 × 65 samples, 15 mesh lines each way"; e2e "the original's settings give its box, ticks and colours"; e2e "dragging the length slider with the mouse makes the membrane longer and fits the new box" |
| F-RA-12 | Rotating the picture by dragging it (Mathematica's 3D graphics); the rotation stays when a control changes | look at the surface from any side | v0.1.41 | e2e "rotating the picture with the mouse keeps the view when a slider moves" |
| F-RA-13 | Opening state: a = b = 4, B[1,1] = 0.5, the other modes 0, t = 0, c = 1, zrange = 0 — the Manipulate's initial values; the notebook's live state stores a, b, c, t, zrange with these values, and snapshot 1 is the same state (N-RA-02) | the original as it opens | v0.1.41 | unit "the opening state: the Manipulate"; e2e "with their labels, defaults and ranges, in the original" |
| F-RA-14 | Caption (from the notebook) and Details: the original has no Details text; the page's external link (MathWorld, "Wave Equation—Rectangle") | the original's explanation | v0.1.41 | M-RA-01 |
| A-RA-01 | "Initial settings" button restores the opening state | Manipulate's ⊕ > Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-RA-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction, camera, pixelAt, sceneToClient) from the Manipulate layer | automated tests | v0.1.41 | e2e "a keyboard step of m=1, n=1 raises the membrane"; e2e "loads without errors and draws the membrane" |
| A-RA-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.41 | e2e "start-up notice when"; e2e "start-up notice without WebGL 2, instead of an empty page" |
| A-RA-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-RA-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-RA-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: rectangular-membrane runs from its own folder" |
| A-RA-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-RA-08 | Defined pictures where the original's formulas give none: all amplitudes 0 (S = 0) draws a white surface, a box height reduced to 0 a flat box, a reduced range that turns round is used sorted (E-RA-02, E-RA-03, K-RA-01, K-RA-02) | the page keeps working in every reachable state | v0.1.41 | e2e "all four amplitudes 0: the page keeps working"; unit "all amplitudes 0: S = 0"; unit "reduce box height ≥ S" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". Each slider
has `slider-<v>`, `value-<v>`, `plus-<v>` (⊕) and the animation panel's `stepback-<v>`, `play-<v>`, `stepfwd-<v>`.

| data-testid | Feature |
|----|----|
| `*-a` | F-RA-01 |
| `*-b` | F-RA-02 |
| `*-B*` | F-RA-03 |
| `*-t` | F-RA-04 |
| `*-c` | F-RA-05 |
| `*-zrange` | F-RA-06 |
| `scene-canvas` | F-RA-12 |
| `reset` | A-RA-01 |
| `crumbs` | A-RA-04 |
| `details` | F-RA-14 |
| `credits` | A-RA-05 |

## 6. Design

- `model.js`: `initialState()`, `membrane(state)` (the body's function of x and y), `amplitudeSum` (S),
  `colorFunction`, `zPlotRange` (the z range as written), `boxTicks` (D-RA-04) and `evaluate(state)` → `{ view, graphics }`:
  `Plot3D(membrane, [0, a], [0, b], { ColorFunction, ColorFunctionScaling: false, PlotRange, ClippingStyle: 'None',
  ImageSize: [390, 350], BoxRatios: 'Automatic', PlotPoints: 65, Ticks })`. `view`: S, the z range as written and the
  box drawn, the height at the centre, the numbers of vertices, triangles, mesh lines and vertices without a colour.
- `shared/graphics3d.js` `Plot3D` (v0.1.41, opt-in): samples f on the grid, cuts the triangles and mesh lines at the
  plot range in the data (ClippingStyle -> None), evaluates the ColorFunction at every vertex, gives Lighting ->
  "Neutral" with a ColorFunction; `shared/graphics3d-three.js` draws the `plotSurface` primitive (vertex colours on a
  two-sided Lambert material, the mesh lines as thin lines). `Hue` there is periodic in h; Hue of a non-number is no
  colour (null).
- `main.js`: one `Manipulate({…})` with the nine labelled sliders, three `Delimiter`s and the heading "   mode"; the
  picture is `View3D({ SphericalRegion: false, zoom: 0.86, tickClass: 'ra-tick' })`; after every evaluation the camera
  is fitted again when the box changed (`fitViewer`, the reader's viewing direction kept; D-RA-03). `index.html` gives
  the picture's area the image's width and the tick labels an upright sans-serif font.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- rectangular-membrane` → `dist/rectangular-membrane/`.
- Contents (generated with `node tools/bundle-app.mjs rectangular-membrane --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/rectangular-membrane/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 22 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/rectangular-membrane/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: rectangular-membrane runs from its own folder" (A-RA-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-RA-01 | deviation | Sampling: the port samples the surface on a fixed grid of 65 × 65 points (`PlotPoints`), so the 15 mesh lines of each direction lie on grid lines; Mathematica starts from 15 points per direction and refines adaptively (MaxRecursion). The surface is smooth at this resolution; the cut edge of a clipped part follows the grid's triangles (straight pieces about a/64 long). |
| D-RA-02 | deviation | Axes edges: the port draws the x ticks on the front bottom edge, the y ticks on the back left top edge and the z ticks on the front left vertical edge (View3D's fixed AxesEdge). Mathematica chooses the edges for each picture: in snapshots 2, 3 and 4 they are these, in snapshot 1 (a flatter box) the y ticks are on the right bottom edge. |
| D-RA-03 | deviation | Framing: the box is fitted to the image from its corners (SphericalRegion -> False, Mathematica's default) with a margin for the tick labels (zoom 0.86, judged by eye against the snapshots), and fitted again whenever the box changes; Mathematica's own fit (which includes the labels) gives a box a few per cent larger. A rotation made with the mouse is kept when a control changes. |
| D-RA-04 | deviation | Ticks: Mathematica's automatic ticks are not documented; the port uses a rule that reproduces the major ticks of all four snapshots (the smallest step 1, 2 or 5 × 10ⁿ that divides the range into fewer than 5 parts; minor ticks at a fifth of the step, a quarter for steps 2 × 10ⁿ; labels with the step's decimals, "0.0"). Ranges not seen in the snapshots (e.g. a length of 10: ticks 0, 5, 10) may differ from Mathematica's. |
| D-RA-05 | deviation | Lighting and colours: the surface is lit by Mathematica's documented neutral lights (Lighting -> "Neutral", which Mathematica uses when a plot has a ColorFunction) on a Lambert material; the mesh lines are black at opacity 0.5, 1 px. The colours and shading agree with the snapshots by eye, not pixel for pixel (K-RA-03). |
| D-RA-06 | deviation | The value fields show numbers as JavaScript writes them ("0", "2"); Mathematica shows the saved real values of snapshots 2–4 as "0." and "2.". The slider layout (label above the slider, ⊕ next to the value field) is the page's shared layout. |
| Q-RA-01 | quirk kept | The colour Hue[z/S] runs through the hue circle twice over the box's height range −S … S: z = 0 and z = ±S are all red, and a crest and a trough of the same size ±S/2 are both cyan. With S the sum of the amplitudes (an upper bound of \|u\|, reached only when all four modes peak at one point), the top of the membrane is seldom red: in snapshot 1 (one mode) it is, in snapshot 2 it is blue-violet. Kept as in the original. |
| Q-RA-02 | quirk kept | "reduce box height" moves both limits of the z range by zrange, so at zrange = S the box has zero height and beyond S the range turns round (E-RA-03); the slider's range 0 … 2 does not follow S. |
| K-RA-01 | known issue (lead) | All amplitudes 0 (reachable: m=1, n=1 to 0): S = 0, the colour function is Hue[0./0.] = Hue[Indeterminate] (with the messages Power::infy and Infinity::indet) and the z range {0, 0}. What Mathematica draws then is not known here (the default surface colour? nothing? an error picture?). The port draws the flat membrane in white (the PlotStyle default) in a flat box. Checklist M-RA-06 settles it. |
| K-RA-02 | known issue (lead) | zrange ≥ S: the z range {−S + zrange, S − zrange} has zero height (zrange = S, e.g. the opening state with zrange 0.5) or is reversed (zrange > S). The port uses a reversed range sorted (the box grows again) and draws a flat empty box at zero height; whether Mathematica sorts, ignores or rejects such a PlotRange is not known here. Checklist M-RA-07 settles it. |
| K-RA-03 | known issue (lead) | The original was made with Mathematica 6, whose default lighting for a ColorFunction may differ from the documented "Neutral" lights of current versions; the snapshots match the neutral lighting by eye. Checklist M-RA-03 compares the colours. |
| N-RA-01 | note | Names: Mathematica's indexed Manipulate variables B[1,1], B[2,1], B[1,2], B[2,2] are `B11`, `B21`, `B12`, `B22` (Bmn = B[m, n]); in the snapshots' saved Settings they appear as `$9`, `$10`, `$11`, `$12` in the order of their controls (`SNAPSHOT_NAMES` in model.js). |
| N-RA-02 | note | Saved states: the notebook's live state and initial settings store a = 4, b = 4, c = 1, t = 0, zrange = 0 but not the amplitudes (indexed variables); the opening state takes them from the Manipulate's control specs (B[1,1] = 0.5, the others 0). Snapshot 1 has exactly these values. |
| N-RA-03 | note | The caption's "the first four Fourier modes" are the modes with m, n ∈ {1, 2}. They are the four lowest frequencies only while the rectangle is not too long: for a/b > √(8/3) ≈ 1.63 (or b/a > 1.63) the mode (3, 1) (or (1, 3)) is lower than (1, 2) (or (2, 1)). |
| N-RA-04 | note | `AutorunSequencing -> {1, 2, 3, 5, 7}` (the ⊕ menu's Autorun) has no counterpart: the port has no Autorun; each slider's own ⊕ panel animates it. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the original's nine sliders and its Plot3D on the new `shared/graphics3d.js` `Plot3D` (ColorFunction without scaling, ClippingStyle -> None, mesh lines); compared with the four snapshots; §11 written |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-RA-01 | Mathematica's automatic choice of the axes edges for each view (the edges on the outline nearest the viewer) | ticks where Mathematica puts them, also in snapshot 1 and after a rotation | a generic algorithm in `shared/graphics3d.js`; risk of changing other 3D apps (opt-in needed) | D-RA-02 |
| I-RA-02 | A colour scale over one hue cycle, e.g. Hue[(1 + z/S)/2] or Hue[2/3 (1 − z/S)/2] | crests and troughs told apart by colour | not the original's picture; needs a decision (an errors-switch correction or an option) | Q-RA-01 |
| I-RA-03 | Limit "reduce box height" to less than S (e.g. a dynamic slider maximum 0.9 S) | the box never collapses or turns round | changes the original's slider; needs a decision | E-RA-03, K-RA-02 |
| I-RA-04 | Adaptive sampling (MaxRecursion) for Plot3D | sharper cut edges with fewer samples | more code in the shared Plot3D | D-RA-01 |
| I-RA-05 | A play button for the time (an Animator or Trigger) next to the plot | the membrane moves without opening the ⊕ panel | a port addition | F-RA-04 |

## 11. Errors in the original (conceptual and mathematical)

Checked: the wave equation and its solution by separation of variables (u_tt = c²(u_xx + u_yy) tested numerically
by finite differences in the unit tests, u = 0 on the four edges, u_t = 0 at t = 0, the four frequencies
cπ√(m²/a² + n²/b²) matched to their modes and labels), the colour function and the plot range for every reachable value
of the sliders, the caption against the code (N-RA-03), and the notebook's text sections.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-RA-01 | text | the notebook's sections "Details & Citations" ("Details, references or citation information"), "References" ("References for demonstration."), "Related Demonstrations" ("Link to a related demonstration"), "Related Symbols" ("SymbolName (documented Wolfram Language symbol)") and "Submission Notes" ("Additional information for the reviewer.") | the authoring template's placeholder texts were left in the notebook instead of real content or empty sections (the published page shows no Details) | the page says that the original has no Details text and gives its external link; the placeholders are not shown | none for the computation; the page could be given real Details (a short derivation of the modes) | kept |
| E-RA-02 | mathematical | `ColorFunction -> Function[{x, y, z}, Hue[z/(Abs[B[1,1]] + Abs[B[2,1]] + Abs[B[1,2]] + Abs[B[2,2]])]]` | with all four amplitudes 0 (reachable: set m=1, n=1 to 0) the denominator is 0: Hue[0./0.] = Hue[Indeterminate] is not a colour and Mathematica issues Power::infy and Infinity::indet; what it then draws is not known (K-RA-01) | draws the flat membrane in white, the surface's default colour (A-RA-08, K-RA-01) | the flat membrane could be drawn red (Hue[0], the colour of every point at rest) by taking z/S = 0 when S = 0; no golden data or snapshot changes (none has S = 0); could be offered by the switch "errors of the original" once the corrected picture is decided | kept |
| E-RA-03 | mathematical | `PlotRange -> {…, {-(Abs[B[1,1]] + …) + zrange, Abs[B[1,1]] + … - zrange}}` with the slider `{{zrange, 0, "reduce box height"}, 0, 2, 0.1}` | the slider's range does not depend on S: for zrange = S the z range is empty ({0, 0}, the surface is cut away except where u = 0) and for zrange > S it is reversed (e.g. the opening state with zrange = 2 gives {1.5, −1.5}); "reduce" then makes the box grow again (if Mathematica sorts the range) or gives no valid range | uses a reversed range sorted and draws a flat box at zero height (A-RA-08, Q-RA-02, K-RA-02) | limiting zrange to less than S (I-RA-03) or clamping the range would keep a box of positive height; the snapshots (zrange 0 and 2 with S = 4.31) are unchanged; needs a decision on the limit | kept |
