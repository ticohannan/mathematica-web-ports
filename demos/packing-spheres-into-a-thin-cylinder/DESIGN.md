# Design document: Packing Spheres into a Thin Cylinder

| | |
|---|---|
| Code version: | 0.1.27 |
| Document revision | 2 (2026-10-28) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Packing Spheres into a Thin Cylinder", contributed by Aaron T. Becker and Li Huang, published 2016-05-04 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/PackingSpheresIntoAThinCylinder/> Source as text: [`docs/original-source/packing-spheres-into-a-thin-cylinder.txt`](../../docs/original-source/packing-spheres-into-a-thin-cylinder.txt); snapshots `docs/original-snapshots/packing-spheres-into-a-thin-cylinder-1…4.png`; saved states `tests/golden/packing-spheres-into-a-thin-cylinder.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values, `snapshots` the four snapshots' settings); the notebook's own sampled compression plot `tests/golden/packing-spheres-into-a-thin-cylinder.saved-plot.json` |
| Port files | `model.js` (the two Initialization functions `tubeSphereStackParamsFAST` and `sphereToSphereContacts`, the compression plot `BestCompressionPlot`, the sphere centres and one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`: the plot as an SVG picture, the cylinder as a `View3D` picture), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.27): generator, `shared/wl.js`, `shared/plot.js`, `shared/graphics3d.js`, plain arithmetic |

## 1. Purpose and background

Identical spheres of radius *r* are pushed into a cylinder of radius *R* (*R* ≥ *r*); how densely can they be packed?
For *R* = *r* they stand in a line; as the tube widens, the line zigzags, splits into two columns that twist into a
helix, then into layers of two, three, four and five spheres, and the layers twist again until hexagons form at
*R* = 3*r*. The Demonstration shows, for the chosen *R*/*r*, the densest arrangement among eight known structures
(the optimum for small *R*/*r*, upper bounds up to *R*/*r* = 3; Mughal et al. found 40 densest arrangements up to
2.873). The top picture plots the **compression ratio** — the length of tube a sphere takes, as a fraction of its
diameter — of each structure against *R*/*r* (a black point marks the current one); the bottom picture shows the
spheres (red, adjustable opacity) in the tube (light blue), the pushing rods at both ends (purple), the sphere–sphere
contacts (blue) and the sphere–tube contacts (black).

## 2. Scope

In scope: the original's four controls, both pictures and their behaviour, with the notebook's saved state as the
opening state. Out of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-PS-01: a student slides *R*/*r* from 1 to 3 and watches the line, the zigzag, the helix and the layers appear,
  with the black point moving along the plot's lowest curve.
- UC-PS-02: a student makes the spheres transparent to see the contact network (sphere opacity near 0, snapshot 4).
- UC-PS-03: a teacher compares the structures' compression ratios with the Details' critical radii (2, 2.1547,
  2.41421, 2.7013, 3).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PS-01 | Slider "tube radius / sphere radius" (a stacked fraction) `{{R, r, …}, r, 3 r, .01, ImageSize -> Small, Appearance -> "Labeled"}` with r = 1: *R*/*r* from 1 to 3 | the tube's width, the Demonstration's parameter | v0.1.27 | e2e "has the four controls of the original"; e2e "a slider step of R"; unit "the opening state" |
| F-PS-02 | Slider "stacking plane angle" `{{θ, 0., …}, 0, 3.14159, 0.001}`: turns every sphere about the tube's axis | to see the arrangement from other sides | v0.1.27 | e2e "has the four controls of the original"; unit "the stacking plane angle turns every centre" |
| F-PS-03 | Slider "sphere opacity" `{{SphereOpacity, .6, …}, 0, 1, 0.01}` | to see the contacts behind the spheres | v0.1.27 | e2e "has the four controls of the original"; unit "the picture of the opening state" |
| F-PS-04 | Slider "spheres" `{{NumSpheres, 8, …}, 8, 32, 1}`: the number of levels is `Ceiling[NumSpheres/numsides]` (Q-PS-01) | the length of the stack | v0.1.27 | e2e "has the four controls of the original"; unit "the number of spheres" |
| F-PS-05 | The four controls in a 2 × 2 `Grid` of `Control`s above the pictures (R and θ, then opacity and spheres), small labelled sliders | the original's layout | v0.1.27 | e2e "has the four controls of the original"; M-PS-02 |
| F-PS-06 | `tubeSphereStackParamsFAST[W, r]` (W = 2*R*): the twelve-branch `Piecewise` of {*z*, numsides} by *W*/*r* (line and zigzag ≤ 2 + √3; twisted zigzag < 4; two at a time ≤ 2(2/√3 + 1); three ≤ (2/7)(7 + √70); two ≤ 2 + √6; two twisted ≤ 2(1 + √2); four ≤ (2/79)(79 + √(1106(2 + 9√2))); three ≤ 2 + √(8 + 8/√5); five ≤ 2 + 16√(2(155 − 9√5)/5905); three ≤ 2(1 + √3); three twisted ≤ 6; otherwise {1/8, 4}), and for the three twisted ranges IsTwist, the twist angle Ang2 and the level offset z2; Alpha = π/numsides | the eight structures | v0.1.27 | unit "the compression ratios of the snapshots"; unit "the structure changes at the critical radii"; unit "neighbouring spheres never overlap" |
| F-PS-07 | The sphere centres: `Ceiling[NumSpheres/numsides]` levels i of numsides spheres j at x = r + 2 z i numsides (+ j z2 or z2 for odd j when twisted), on the circle of radius w/2 − r at the angle Alpha(2j + [i odd]) + θ, or (twisted) Alpha 2j + (Ang2 + 2 Alpha) i + θ for numsides = 2 and Alpha 2j + (2π − Ang2) i + θ otherwise | where the spheres are | v0.1.27 | unit "the centres of the opening state"; unit "neighbouring spheres never overlap"; unit "every sphere touches the tube" |
| F-PS-08 | `sphereToSphereContacts[w, r, centers]`: the polylines through touching centres for each structure (columns `c[[k;;-1;;s]]`, `Riffle`d pairs, the three-twisted `Mod[i, 12]` pairs) drawn Blue, Thick | the contact network | v0.1.27 | unit "the contact lines join touching spheres"; unit "the contacts of snapshot 2" |
| F-PS-09 | The sphere–tube contacts: for w > 2r a Black, Thick line from each centre to the tube wall | which spheres touch the tube | v0.1.27 | unit "the sphere–tube contacts end on the tube wall"; unit "the picture of the opening state" |
| F-PS-10 | The spheres `Sphere[centre]` (radius r = 1) Red at `Opacity[SphereOpacity]`; the tube `Cylinder[{{0, 0, 0}, {2r + endC, 0, 0}}, w/2]` LightBlue at Opacity 0.3, endC = the last centre's x + r; the pushing rods `Cylinder[{{−2r, 0, 0}, {0, 0, 0}}, w/2]` and `Cylinder[{{endC, 0, 0}, {2r + endC, 0, 0}}, w/2]` RGBColor[0.5, 0, 0.5] at Opacity 0.2 | the packing in its tube | v0.1.27 | unit "the picture of the opening state"; e2e "review screenshots at the four snapshot settings" |
| F-PS-11 | `BestCompressionPlot`: eight curves of the compression ratio against *R*/*r* ∈ [1, 3] — one, two, three, four and five at a time (solid, `Max[Re[…], 1/n]` after their critical radius, 1 before), the three twisted structures (Dotted, only where they exist); legend of five sphere-in-circle icons `Placed[…, {.08, .51}]`; `AxesLabel -> {R / r, "compression ratio"}`, `ImageSize -> {600, 160}`, `AspectRatio -> 1/4` | which structure is densest where | v0.1.27 | unit "the plot's curves lie on the notebook's sampled plot"; unit "the plot: eight curves"; e2e "review screenshots at the four snapshot settings" |
| F-PS-12 | The marker on the plot (`Show` with a Graphics): `Line[{{1, z}, {w/(2r), z}, {w/(2r), 0}}]` Black, Thin and `Point[{w/(2r), z}]` with PointSize[Large] | the current structure on the plot | v0.1.27 | unit "the marker"; e2e "a slider step of R" |
| F-PS-13 | The 3D picture `Graphics3D[…, Boxed -> False, ImageSize -> {600, 250}]` (default view point, drag to rotate) with `Epilog -> Inset[Text[Style[StringForm["compression ratio = ``", z], 20]], {Center, Bottom}]` | the packing, and its number | v0.1.27 | e2e "loads without errors and draws both pictures"; e2e "the caption under the 3D picture"; unit "the caption text" |
| F-PS-14 | The two pictures in a `Column` (plot above, cylinder below) | the original's layout | v0.1.27 | e2e "loads without errors and draws both pictures" |
| F-PS-15 | Opening state = the notebook's live state = the Manipulate's initial values: R 1, θ 0., SphereOpacity 0.6, NumSpheres 8 | what the published Demonstration shows | v0.1.27 | unit "the opening state"; e2e "Initial settings restores the opening state" |
| F-PS-16 | The four snapshot settings (R 1; 2.361; 2.708; 1.924 with opacity 0.024; 17 spheres in the last three) give the snapshot pictures (compression ratios 1, 0.238794, 0.172977, 0.461848) | the original's examples | v0.1.27 | unit "the compression ratios of the snapshots"; e2e "review screenshots at the four snapshot settings" |
| F-PS-17 | Caption and Details text (from the Demonstration) with the critical radii and the reference | the original's explanation | v0.1.27 | M-PS-01 |
| A-PS-01 | "Initial settings" restores the opening state | Manipulate's Initial Settings | v0.1.27 | e2e "Initial settings restores the opening state" |
| A-PS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction) from the Manipulate layer | automated tests | v0.1.27 | e2e "a slider step of R" |
| A-PS-03 | Start-up notice when the browser cannot run the page (DEC-22, WebGL 2 required) | no empty page | v0.1.27 | e2e "start-up notice when" |
| A-PS-04 | Breadcrumb link to all demos | navigation | v0.1.27 | inventory |
| A-PS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.27 | e2e "attribution on" |
| A-PS-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.27 | e2e "bundle: packing-spheres-into-a-thin-cylinder runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-R` | F-PS-01 |
| `value-R` | F-PS-01 |
| `plus-R` | F-PS-01 |
| `play-R` | F-PS-01 |
| `stepback-R` | F-PS-01 |
| `stepfwd-R` | F-PS-01 |
| `slider-θ` | F-PS-02 |
| `value-θ` | F-PS-02 |
| `plus-θ` | F-PS-02 |
| `play-θ` | F-PS-02 |
| `stepback-θ` | F-PS-02 |
| `stepfwd-θ` | F-PS-02 |
| `slider-SphereOpacity` | F-PS-03 |
| `value-SphereOpacity` | F-PS-03 |
| `plus-SphereOpacity` | F-PS-03 |
| `play-SphereOpacity` | F-PS-03 |
| `stepback-SphereOpacity` | F-PS-03 |
| `stepfwd-SphereOpacity` | F-PS-03 |
| `slider-NumSpheres` | F-PS-04 |
| `value-NumSpheres` | F-PS-04 |
| `plus-NumSpheres` | F-PS-04 |
| `play-NumSpheres` | F-PS-04 |
| `stepback-NumSpheres` | F-PS-04 |
| `stepfwd-NumSpheres` | F-PS-04 |
| `scene-canvas` | F-PS-13 |
| `reset` | A-PS-01 |
| `crumbs` | A-PS-04 |
| `details` | F-PS-17 |
| `credits` | A-PS-05 |

## 6. Design

- `model.js`: the original's definitions under their names — `tubeSphereStackParamsFAST(W, r)` (one `if` chain for the
  `Piecewise`, as written), `sphereToSphereContacts(W, r, c)` (spans `c[[k;;-1;;s]]` with `Take` of `shared/wl.js`,
  `Riffle`), `bestCompressionPlot()` (the eight curves as `shared/plot.js` `Plot`, computed once), `centers(…)` and
  `evaluate(state)` → `{ view, graphics: [plot, graphics3D] }`. `Re[Sqrt[x]]` of a negative x is 0 (`reSqrt`); a curve
  value `I` (no real value) is NaN, which `Plot` leaves out.
- `main.js`: one `Manipulate({…})`: the controls as two `Row`s (the 2 × 2 Grid), `ControlPlacement: 'Top'`, two
  pictures: `graphic` (the plot, SVG) and `graphic2` (`View3D`, ImageSize [600, 250], the caption as its Epilog).
- Shared code added for this port (MIT, with tests): §7 N-PS-04.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- packing-spheres-into-a-thin-cylinder` → `dist/packing-spheres-into-a-thin-cylinder/`.
- Contents (generated with `node tools/bundle-app.mjs packing-spheres-into-a-thin-cylinder --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/packing-spheres-into-a-thin-cylinder/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/packing-spheres-into-a-thin-cylinder/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: packing-spheres-into-a-thin-cylinder runs from its own folder" (A-PS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-PS-01: the plot's curves are sampled by `shared/plot.js` (adaptive), not by Mathematica's `Plot`; the unit tests
  check that every point of the notebook's own sampled plot (saved with the Manipulate's definitions) lies on the
  port's curves.
- D-PS-02: the 3D picture is drawn by View3D (three.js): Mathematica's default lighting, but smoother spheres and a
  different blending of the transparent spheres, tube and rods (WebGL draws transparent objects back to front by their
  centres, not with Mathematica's depth peeling): the spheres behind the tube's centre are drawn before the tube and
  look paler than the nearer ones (snapshot 1: five pale, three bright), where Mathematica tints all of them alike; the
  review screenshots are compared by eye.
- D-PS-03: the caption writes an integer-valued compression ratio as "1"; Mathematica writes "1" for the exact opening
  state and "1." once *R* has been moved back to 1 with the slider (a machine number).
- D-PS-04: the controls look like the layer's (labels above the sliders, editable value fields); the R label is a
  stacked fraction as in the original.
- D-PS-05: the legend icons (a circle with one to five red disks) are drawn by the shared legend at 15 px; the legend
  is placed with Mathematica's `Placed[…, {.08, .51}]` meaning (the legend's own point {.08, .51} at that point of the
  plot), written `Placed(icons, [[0.08, 0.51], [0.08, 0.51]])`; it stands about 12 px further right than in the
  snapshots (the layer measures scaled positions in the plot range, Mathematica in the image).
- D-PS-06: the plot's range and margins: `Show` with the marker (its line ends at {w/2r, 0}) makes Mathematica's y range
  reach 0, written `PlotRange -> {{1, 3}, {0, 1}}` with 2 % / 3 % padding; the margins are Mathematica's automatic ones
  measured on the snapshots, `ImagePadding -> {{44, 46}, {20, 26}}` (the layer's automatic margins cut the y axis label).
- D-PS-07: the 3D picture is fitted to the tube's bounding box (`SphericalRegion: false`, Mathematica's default — the
  shared View3D's default is the bounding sphere) with `zoom: 1.05` (the box's square corners stick out of the round
  tube): a long tube is drawn about 5 % smaller than in snapshots 1 and 4, a short wide one about 15 % larger than in
  snapshots 2 and 3 (Mathematica's own fit could not be reproduced exactly), and the caption stands about 12 px lower (Mathematica's {Center, Bottom} is the bottom of the
  plot region, the layer's the bottom of the image).
- D-PS-08: the angle slider shows the opening value as "0" where the snapshot shows "0." (a machine zero; the snapshots
  2–4 show "0").
- Q-PS-01: the "spheres" control sets the number of levels, `Ceiling[NumSpheres/numsides]`, so up to numsides − 1 more
  spheres are drawn than chosen (17 → 18 or 20 in snapshots 2–4).
- Q-PS-02: the angle slider ends at 3.14159, not π.
- Q-PS-03: the body's `t`, `len`, `contact1f`, `contact2s`, `contact2f` and the parameter `e` are never used.
- Q-PS-04: r is a global constant 1; the formulas use W and W/r interchangeably (E-PS-03).
- Q-PS-05: at *R* = *r* the sphere–tube lines are left out (`If[w > 2r, …]` gives Null).
- N-PS-01: the definitions saved with the Manipulate output (SaveDefinitions) were compared with the Input cells: the
  same `tubeSphereStackParamsFAST` and `sphereToSphereContacts`; they also hold the sampled `BestCompressionPlot` (used
  as golden data, D-PS-01) and `W = 2` (unused).
- N-PS-02: geometry checks of the original (unit tests): for every structure and 8 … 32 spheres no two spheres overlap,
  every sphere touches the tube, and every blue contact line joins two touching spheres — except five at a time
  (E-PS-01).
- N-PS-03: the structure changes at R/r = 1.8660, 2, 2.1547, 2.1952, 2.2247, 2.4142, 2.6156, 2.7013, 2.7099, 2.7321
  (the `Piecewise` bounds), matching the Details' critical radii; at every slider step from 1 to 2.99 the chosen
  structure's z is the lowest curve of the plot (unit test). The five-at-a-time range (2.7013 … 2.7099) lies between
  two slider steps: it is reached by typing a value (snapshot 3: 2.708).
- N-PS-04: library pieces added for this port (MIT, generic, with tests): `shared/wl.js` `span` / `Take[list, {m, n, s}]`,
  cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString`, `StringForm`; `shared/plot.js` `Automatic`
  in a PlotStyle list, `Placed[…, {{x, y}, {ax, ay}}]`; `shared/graphics-extras.js` legend labels that are pictures;
  `shared/graphics.js` `Fraction` (FractionBox) in labels; `shared/graphics3d.js` `Line` with several polylines;
  `shared/graphics3d-view.js` `Epilog` (2D text over a 3D image) and `SphericalRegion: false`.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.26 | 2026-10-28 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.27 | 2026-10-28 | the port: the original's four controls, both definitions, the compression plot with its marker and the 3D packing with its caption, in simple mode; opening state from the notebook; errors in the original (§11) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PS-01 | Correct the five-at-a-time compression ratio (E-PS-01): √(4 − (3 − √5)(W − 2)²/8)/10, and move its upper bound to the new crossing with three at a time (R/r ≈ 2.7228) | the drawn layers touch, the plot is right from R/r = 2.7013 | differs from the original | E-PS-01 |
| I-PS-02 | Draw exactly NumSpheres spheres (drop the extra spheres of the last level) | the control means what it says | differs from the original; the tube gets shorter | Q-PS-01, E-PS-02 |
| I-PS-03 | Let the user change r (the formulas would need W/r throughout) | general radii | the original fixes r = 1; needs E-PS-03 corrected | E-PS-03 |

## 11. Errors in the original (conceptual and mathematical)

Kind: conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these
words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-PS-01 | mathematical | `tubeSphereStackParamsFAST`, the five-at-a-time branch (and the plot's fifth curve): z = √(4 + (1/32)(−5 + √5)(W − 2)²)/(10r) | Each level is a ring of five spheres on a circle of radius ρ = W/2 − r, the next level turned by π/5 (`Alpha(2j + 1)`). Two neighbouring spheres on adjacent levels are a chord 2ρ sin(π/10) apart sideways, so they touch when the level spacing h satisfies h² = 4r² − (W − 2r)²(3 − √5)/8; the formula uses (5 − √5)/32 instead of (3 − √5)/8. The drawn levels therefore do not touch (gap 0.026 r at R/r = 2.708, snapshot 3), and the compression ratio shown, 0.172977, is larger than this arrangement's tight value, 0.169874 | keeps the original's formula (snapshot 3's 0.172977) | the ratio drops by about 0.0031 for 2.7013 < R/r ≤ 2.7099 (I-PS-01); the blue lines then join touching spheres. The five-at-a-time bound 2 + 16√(2(155 − 9√5)/5905) (R/r = 2.70986) is where the original's curve crosses the three-at-a-time curve, so with the corrected formula the bound moves to R/r ≈ 2.7228 as well (and the 0.01 slider steps 2.71 and 2.72 would show five at a time; as published no slider step reaches it — snapshot 3's 2.708 was typed) | kept |
| E-PS-02 | conceptual | the body: `Table[…, {i, 0, Ceiling[NumSpheres/numsides] − 1}]` | the control "spheres" sets the number of levels, so up to numsides − 1 extra spheres are drawn (snapshot 2: 20 for 17) | draws the original's count (Q-PS-01) | exactly the chosen number (I-PS-02) | kept |
| E-PS-03 | mathematical | `tubeSphereStackParamsFAST` and `BestCompressionPlot` | the bounds compare Wn = W/r with constants, but several formulas use W where W/r is meant (z2 of the three-twisted branch uses Wn where W is meant) and the plot tests W against constants without r; all are right only for r = 1 | r = 1 as in the original, so nothing changes | none while r = 1; needed for I-PS-03 | kept |
