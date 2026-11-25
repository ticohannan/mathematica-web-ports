# Design document: Simple Crystal Structures and Miller Indices

| | |
|---|---|
| Code version: | 0.1.43 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Simple Crystal Structures and Miller Indices", contributed by Yunfeng Shi and Adam Bross, published 2018-04-02 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SimpleCrystalStructuresAndMillerIndices/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

A crystal is a unit cell repeated in three directions. The Demonstration builds small crystals of eight structures —
simple cubic (SC), body-centred cubic (BCC), face-centred cubic (FCC), hexagonal close-packed (HCP), caesium chloride
(CsCl), diamond, rock salt (NaCl) and zinc blende (ZnS) — as spheres, with up to five repeats of the cell in each
direction, two sphere radii (red and blue ions of the ceramic structures), the conventional unit cell as a box that can
be shifted by whole cells, and the families of lattice planes with Miller indices (h k l), h, k, l ∈ {−4, …, 4}. Its
caption lists seven tasks: repetition of the cell, the differences between the structures, the conventional cell, the
contact condition of the atoms (by changing the radius), close-packed directions and planes, Miller planes, and
exploring the crystal by rotating and zooming.

The original is one `Manipulate` of `Show[Graphics3D[…], planes, PlotRange -> …]` (no initialization code): the
spheres come from `Table`s over the cells, the cell is a `Cuboid`, and the planes are a `Plot3D` (l ≠ 0) or a
`ParametricPlot3D` (l = 0) of a `Table` of planes h x + k y + l z = d. The port draws the same on
`shared/graphics3d.js` (`Sphere`, `Cuboid`, `Line`, `Plot3D` of v0.1.41, `ParametricPlot3D`, `Show`) and
`shared/graphics3d-view.js`.

## 2. Scope

In scope: the Demonstration's thirteen controls, its picture (spheres, cell, planes, box with axes, the clipping at
the plot range, the rotation) and its caption. Out of scope: Mathematica's ⊕ menu items other than Initial Settings
(Autorun, snapshots, Paste Input); zooming the picture with the mouse wheel (the page scrolls; Mathematica's zoom is a
modifier drag, I-CM-03); the template texts of the notebook's unused sections (E-CM-06).

## 3. Users and use cases

- UC-CM-01: a student explores the eight structures in a browser, without Mathematica: repeats the cell, rotates the
  crystal, finds the radius at which the spheres touch (N-CM-04).
- UC-CM-02: a teacher shows a family of Miller planes, e.g. (1 1 1) in FCC (the close-packed planes), and how zero and
  negative indices change it.
- UC-CM-03: a reader compares the port with the original at the four snapshot settings (docs/checklists).

## 4. Features

The original's Miller index variables m, n, r are h, k, l (N-CM-01).

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-CM-01 | Popup menu "crystal structure" `{{CrystalType, "SC", "crystal structure"}, {"SC", "BCC", "FCC", "HCP", "CsCl", "Diamond", "NaCl", "ZnS"}, ControlType -> PopupMenu}` | chooses the structure | v0.1.41 | e2e "has the original"; e2e "the crystal structure popup chosen with the keyboard"; unit "the structures: popup values and atoms per Table" |
| F-CM-02 | Slider "repeats" `{{rp, 1, "repeats"}, 0, 5, 1, ImageSize -> Tiny, Appearance -> "Labeled"}` (value field and ⊕ animation panel) | the crystal has rp + 1 cells in each direction; the plot range is −1 … rp + 1 | v0.1.41 | e2e "a keyboard step of repeats builds"; unit "the structures: popup values and atoms per Table" |
| F-CM-03 | Sliders "radius (red)" `{{radius, 0.1, …}, 0.1, 1, …}` and "radius (blue)" `{{radius2, 0.1, …}, 0.1, 1, …}` (continuous) | the sphere radii: radius for every structure's (red or uncoloured) atoms, radius2 for the blue ions of NaCl and CsCl (Q-CM-01) | v0.1.41 | e2e "dragging the red radius slider with the mouse"; e2e "a typed blue radius changes the NaCl blue spheres only"; unit "colours and radii: NaCl and CsCl red radius" |
| F-CM-04 | An empty line, the heading "cell shifts" and sliders x, y, z `{{sx, 0, Style["x", Italic]}, 0, rp - 1, 1, …}` (sy, sz alike), their range following rp (D-CM-04) | moves the unit cell by whole cells (task 3) | v0.1.41 | e2e "unit cell and unit cell face checkboxes clicked with the mouse"; e2e "a keyboard step of repeats builds"; unit "the unit cell: Cuboid from" |
| F-CM-05 | Checkboxes "unit cell" `{{DrawCell, False, "unit cell"}, {True, False}}` and "unit cell face" (`Enabled -> DrawCell`) after an empty line | show the conventional cell, with or without blue faces | v0.1.41 | e2e "unit cell and unit cell face checkboxes clicked with the mouse"; e2e "has the original" |
| F-CM-06 | After an empty line, checkbox "Miller planes" `{{DrawPlanes, False, "Miller planes"}, {True, False}}` and popup menus Miller *h*, *k*, *l* `{{m, 1, Row[{"Miller ", Style["h", Italic]}]}, {-4, …, 4}, Enabled -> DrawPlanes}` (n, r alike; D-CM-06, N-CM-02) | show a family of lattice planes and choose its indices | v0.1.41 | e2e "Miller planes: the (1 1 1) family"; e2e "has the original" |
| F-CM-07 | The atoms: `Table[{Sphere[{x + a, y + b, z + c}, radius]}, {x, 0, rp}, {y, 0, rp}, {z, 0, rp}]` for each site (a, b, c) of the structure, joined in the original's order: SC (0, 0, 0); BCC + (½, ½, ½); FCC (0, 0, 0), (0, ½, ½), (½, 0, ½), (½, ½, 0) (also the fallback of the nested `If`); Diamond FCC + (¼, ¼, ¼), (¼, ¾, ¾), (¾, ¼, ¾), (¾, ¾, ¼); NaCl red FCC + blue (½, 0, 0), (½, ½, ½), (0, 0, ½), (0, ½, 0) with radius2; ZnS red FCC + blue tetrahedral sites (with radius, Q-CM-01); CsCl red (0, 0, 0) + blue (½, ½, ½) with radius2; HCP (x, √3 y, √(8/3) z), (x + ½, √3 (y + ½), …), (x, √3 (y + ⅓), √(8/3) (z + ½)), (x + ½, √3 (y + ⅚), …) | the structures (task 2); uncoloured spheres in Mathematica's default white under its coloured default lights | v0.1.41 | unit "the structures: popup values and atoms per Table"; unit "contact radii by hand"; unit "colours and radii: NaCl and CsCl red radius"; e2e "the picture shows the snapshot" |
| F-CM-08 | The cell: `{EdgeForm[{Thick, Black}], If[DrawCubeFace, FaceForm[Lighter[Blue]], FaceForm[]], If[DrawCell, Cuboid[{sx, sy, sz}, {sx + 1, sy + b, sz + c}], Point[{0, 0, 0}]]}` with b = √3, c = √(8/3) for HCP, 1 otherwise: thick black edges, faces Lighter[Blue] or none (D-CM-01) | the conventional cell (task 3) | v0.1.41 | unit "the unit cell: Cuboid from"; e2e "unit cell and unit cell face checkboxes clicked with the mouse"; e2e "the picture shows the snapshot" |
| F-CM-09 | The Miller planes h x + k y + l z = d, d = −3 rp … 3 rp: l ≠ 0 `Plot3D[Table[(d C − h x − k y B)/l, {d, …}], {x, 0, rp + 1}, {y, 0, rp + 1}, Mesh -> None]`; else k ≠ 0 `ParametricPlot3D[Table[{x, (d B − h x)/k, z}, …], {x, 0, rp + 1}, {z, 0, rp + 1}, Mesh -> None]`; else h ≠ 0 `{d/h, y, z}`; else `{d, y, z}` (Q-CM-03); B = √3, C = √(8/3) for HCP (E-CM-02); a zero index makes the planes parallel to that axis, a negative one turns them; all cut at the plot range (D-CM-02, Q-CM-06, Q-CM-07) | the Miller planes (task 6) | v0.1.41 | unit "Miller planes of the cubic structures"; unit "the planes are clipped to the box"; e2e "Miller planes: the (1 1 1) family" |
| F-CM-10 | The frame: `Show[…, PlotRange -> {{-1, rp + 1}, {-1, rp + 1}, {-1, rp + 1}}, SphericalRegion -> True, ImageSize -> {400, 400}]` with `Axes -> True, AxesLabel -> {x, y, z}` (D-CM-07), Mathematica's default box, ViewPoint {1.3, −2.4, 2} and lights; spheres and planes cut at the box (Q-CM-04); BoxRatios {1, 1, 0.4} while a Plot3D is shown (Q-CM-05); ticks and framing as the snapshots (D-CM-05) | the original's picture | v0.1.41 | unit "BoxRatios: {1, 1, 0.4} from the Plot3D"; unit "the ticks: every integer"; e2e "loads without errors and draws the opening picture"; e2e "Miller planes: the (1 1 1) family" |
| F-CM-11 | Rotating the picture by dragging it (Mathematica's 3D graphics, task 7); the rotation stays when a control changes | look at the crystal from any side | v0.1.41 | e2e "rotating the picture with the mouse keeps the view" |
| F-CM-12 | Opening state: SC, rp = 1, radius = radius2 = 0.1, shifts 0, no cell, no planes, (1 1 1) — the Manipulate's initial values, equal to the notebook's live state and snapshot 1 | the original as it opens | v0.1.41 | unit "the opening state"; e2e "has the original"; e2e "the picture shows the snapshot" |
| F-CM-13 | Caption (Objective, Goals/Tasks 1–7 and the note on speed, from the notebook) and Details (the original has none; the port names the structures) | the original's explanation | v0.1.41 | M-CM-01 |
| A-CM-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-CM-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction, camera, pixelAt, sceneToClient; the last two in the plot range's coordinates) from the Manipulate layer | automated tests | v0.1.41 | e2e "a keyboard step of repeats builds"; e2e "the picture shows the snapshot" |
| A-CM-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-CM-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-CM-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-CM-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: crystal-structures-miller runs from its own folder" |
| A-CM-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-CM-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-CM-01, E-CM-02, E-CM-03, E-CM-04, E-CM-05 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-CM)"; e2e "errata switch on crystal-structures-miller: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". Each slider
has `slider-<v>`, `value-<v>`, `plus-<v>` (⊕) and the animation panel's `stepback-<v>`, `play-<v>`, `stepfwd-<v>`;
popup menus `popup-<v>`, checkboxes `check-<v>`.

| data-testid | Feature |
|----|----|
| `*-CrystalType` | F-CM-01 |
| `*-rp` | F-CM-02 |
| `*-radius` | F-CM-03 |
| `*-radius2` | F-CM-03 |
| `*-sx` | F-CM-04 |
| `*-sy` | F-CM-04 |
| `*-sz` | F-CM-04 |
| `*-DrawCell` | F-CM-05 |
| `*-DrawCubeFace` | F-CM-05 |
| `*-DrawPlanes` | F-CM-06 |
| `*-m` | F-CM-06 |
| `*-n` | F-CM-06 |
| `*-r` | F-CM-06 |
| `scene-canvas` | F-CM-11 |
| `reset` | A-CM-01 |
| `crumbs` | A-CM-04 |
| `details` | F-CM-13 |
| `credits` | A-CM-05 |
| `setter-errata-*` | A-CM-08 |
| `errata-details` | A-CM-08 |

## 6. Design

- `model.js`: `initialState()`, `table(rp, site, scale)` (one `Table` of sphere centres), `atomGroups(state)` (the
  nested `If` of structures: colour, radius, site and centres of each `Table`), `cellCorners` and `boxEdges` (the
  cell), `planeOffsets` and `millerPlanes(state)` (the branch of the plane code and its functions of the plot
  variables), `plotRange`, `boxRatios` (Q-CM-05), `boxTicks` (D-CM-05) and `evaluate(state)` → `{ view, graphics }`:
  `Show(Graphics3D([atoms, cell], { Axes, AxesLabel }), planes)` with PlotRange, SphericalRegion, ImageSize, BoxRatios
  and Ticks. `view`: the number of atoms, each `Table`'s colour, radius, site and count, the cell's corners, the plane
  branch and its d values, the plot range and the box ratios.
- The planes: `Plot3D(f_d, [0, rp + 1], [0, rp + 1], { Mesh: 'None', PlotPoints: 2, PlotRange })` per d (a plane is
  exact with 2 × 2 samples; the shared Plot3D cuts it at its box in the data) or one `ParametricPlot3D` of all d
  (cut by View3D's clipping planes).
- `main.js`: one `Manipulate({…})` with the thirteen controls in the original's order, the empty lines and the heading,
  and the switch of `shared/errata.js`; the picture is `View3D({ ImageSize: 400, zoom: 0.92, thickPx: 2 })`. After every
  evaluation the Miller popups are enabled or disabled (D-CM-06) and the camera is fitted again when the box ratios
  change (`fitViewer`, the reader's viewing direction kept; D-CM-03). `index.html` gives the picture's area the image's
  width.
- `errata-mode.js`: the five corrections of the switch (§11); `model.js` reads the switch with `isCorrected(state)`.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- crystal-structures-miller` → `dist/crystal-structures-miller/`.
- Contents (generated with `node tools/bundle-app.mjs crystal-structures-miller --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/crystal-structures-miller/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 21 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/crystal-structures-miller/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: crystal-structures-miller runs from its own folder" (A-CM-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-CM-01 | deviation | The cell: View3D has no `FaceForm[]` and no edge thickness, so the cell's 12 edges are drawn as thick black lines (2 px, Mathematica's Thick) and, with "unit cell face", the faces as a Lighter[Blue] cuboid without edges; the picture is the same. |
| D-CM-02 | deviation | Planes: a Plot3D plane is sampled at its four corners (exact for a plane) and cut at x, y ∈ [0, rp + 1], z ∈ [−1, rp + 1] in the data; ParametricPlot3D planes are cut by clipping planes. Mathematica cuts both at the Show's plot range when it draws them; the visible parts are the same. |
| D-CM-03 | deviation | View3D builds its scaled BoxRatios group only when the first picture has BoxRatios, so the port always gives them: {1, 1, 1} (what Automatic gives for the cubic plot range) or {1, 1, 0.4} (Q-CM-05); the camera is fitted again (SphericalRegion) when they change. |
| D-CM-04 | deviation | With rp = 0 the cell-shift sliders' range `0, rp − 1` is {0, −1}; the port keeps them at {0, 0} (the value 0 is the only one either way). When rp is lowered below a shift, the shift keeps its value, as in Mathematica (Q-CM-08). |
| D-CM-05 | deviation | Ticks and framing: the major ticks follow the rule of demos/rectangular-membrane (every integer for the snapshots' boxes −1 … 2 and −1 … 3, every second integer from −1 … 6 on), minor ticks at a fifth (a quarter) of the step; the box is drawn at 0.92 of View3D's SphericalRegion fit, judged by eye against the four snapshots. The axes edges are View3D's fixed ones, which are Mathematica's in all four snapshots. |
| D-CM-06 | deviation | The Miller popups follow `Enabled -> DrawPlanes`: the shared layer builds a popup menu enabled whatever its Enabled says, so the page sets them after every evaluation (app-local workaround). |
| D-CM-07 | deviation | Axes labels: the port writes *x*, *y*, *z* (italic), as the live state and snapshot 1 show them; snapshots 2–4 show "Global\`x", "Global\`y", "Global\`z" (the symbols with their context, as the front end displayed them when those snapshots were made). |
| D-CM-08 | deviation | Layout and look: the controls use the page's shared layout (label above the control; checkbox labels below the box); value fields show numbers as JavaScript writes them; the sphere and plane colours come from Mathematica's documented default lights on Lambert materials (shared/mma-lighting.js), equal to the snapshots by eye, not pixel for pixel. |
| Q-CM-01 | quirk kept | ZnS draws its blue spheres with radius (red), so "radius (blue)" does nothing for ZnS (E-CM-01); for SC, BCC, FCC, HCP and Diamond it does nothing either (one kind of atom). |
| Q-CM-02 | quirk kept | The crystal grows towards positive x, y, z only, and every site is repeated for x, y, z = 0 … rp: the extra sites of the last cell (e.g. BCC's body centres at rp + ½) stick out beyond the corner atoms, and the cell at the origin is the only one with atoms on every corner and face inside the crystal's lower faces. |
| Q-CM-03 | quirk kept | Miller indices (0 0 0) draw the planes x = d, d = −3 rp … 3 rp, the (1 0 0) family (E-CM-05). |
| Q-CM-04 | quirk kept | HCP's crystal reaches y = √3 (rp + ⅚) and z = √(8/3) (rp + ½), beyond the plot range rp + 1: it is cut at the box (spheres cut open), and for rp = 1 only about a third of the y extent is visible. |
| Q-CM-05 | quirk kept | With Miller planes and l ≠ 0 the Plot3D brings its option BoxRatios -> {1, 1, 0.4} into the Show (Show joins the options of its graphics, and the first Graphics3D sets no BoxRatios): the box and the spheres are flattened to 40 % of their height. With l = 0 (ParametricPlot3D) the box stays a cube. K-CM-01. |
| Q-CM-06 | quirk kept | The planes are drawn only for x, y ∈ [0, rp + 1] (Plot3D) or x, z / y, z ∈ [0, rp + 1] (ParametricPlot3D), while the box starts at −1: they do not reach the box's faces at −1 (except in the plotted third coordinate). |
| Q-CM-07 | quirk kept | d runs over −3 rp … 3 rp: with rp = 0 only the plane through the origin is drawn, and when the positive (or the negative) indices add up to more than 3 the family stops inside the crystal (E-CM-04). |
| Q-CM-08 | quirk kept | The cell shifts are whole units for every structure, also HCP, whose cell is 1 × √3 × √(8/3) (E-CM-03), and a shift beyond rp − 1 left over from a larger rp puts the cell outside the crystal. |
| K-CM-01 | known issue (lead) | No snapshot or saved picture shows Miller planes: the plane colour (the default surface colour lit by the default lights), the flattened box of Q-CM-05 and the clipping are derived from the code and Mathematica's documented behaviour, not compared with a picture. Checklist M-CM-06 settles them. |
| K-CM-02 | known issue (lead) | Speed: rp = 5 with an eight-site structure draws 1728 spheres, each its own mesh; on a weak device a change takes a second or more (the original's caption warns of the same). |
| N-CM-01 | note | Names: the original's Miller index variables m, n, r are the indices h, k, l of the labels; the other variable names are the original's. |
| N-CM-02 | note | Mathematica draws a control whose list has nine values as a popup menu (the snapshots show popups for Miller h, k, l) and `{True, False}` as a checkbox; the port writes `ControlType: PopupMenu` for the Miller indices. |
| N-CM-03 | note | The HCP cell is the rectangular (orthohexagonal) cell a = 1, b = √3, c = √(8/3) with four atoms, not the hexagonal cell; the HCP Miller indices are three indices of this rectangular cell, not the four-index Miller–Bravais indices (h k i l). Its (0 0 1) planes hold every second close-packed layer, (0 0 2) all of them. |
| N-CM-04 | note | Contact radii (task 4), checked numerically: SC 0.5, BCC √3/4 ≈ 0.433, FCC √2/4 ≈ 0.354, HCP 0.5 (ideal c/a = √(8/3)), Diamond √3/8 ≈ 0.217; for the ion pairs red + blue = 0.5 (NaCl), √3/2 (CsCl). Snapshot 4's NaCl radii 0.288 + 0.259 = 0.547 overlap slightly. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the original's thirteen controls, its spheres, cell and Miller planes on `shared/graphics3d.js` (Plot3D, ParametricPlot3D, Show); compared with the four snapshots; §11 written, switch for E-CM-01 … E-CM-05 |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-CM-01 | Draw the spheres of one `Table` as one instanced mesh | rp = 5 crystals redraw several times faster | a change in `shared/graphics3d-three.js` (all 3D apps) | K-CM-02 |
| I-CM-02 | Miller–Bravais indices (h k i l) and the hexagonal cell for HCP | the indices used in textbooks for hexagonal crystals | a port addition, needs a decision | N-CM-03 |
| I-CM-03 | Zoom with the mouse wheel or a pinch (Mathematica: Ctrl/Alt-drag) | task 7 "rotation and zoom" | a shared View3D option; conflicts with page scrolling | §2 |
| I-CM-04 | A shared rule for Mathematica's automatic 3D ticks (`boxTicks`, now in two apps) | one rule for all 3D ports | changes other apps' ticks (opt-in) | D-CM-05 |

## 11. Errors in the original (conceptual and mathematical)

Checked: the sphere positions of all eight structures against their textbook sites (unit tests: site counts, nearest
neighbour distances, contact radii, HCP's B layer above the A triangles at distance 1), the cell's size and shifts,
the plane formulas of every branch for zero and negative indices (points of each plane put into h x + k y + l z = d;
a zero index gives planes parallel to its axis, intercept at infinity; a negative index turns the planes, and since d
runs symmetrically (−h −k −l) draws the same family as (h k l)), the HCP planes against the lattice points of its cell,
the range of d against the crystal, the Show's options, and the notebook's text sections.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-CM-01 | conceptual | `If[CrystalType == "ZnS", Join[…, Table[{Blue, Sphere[{x + 0.25, y + 0.25, z + 0.25}, radius]}, …], …]]` | the blue (tetrahedral) spheres of ZnS use radius, the red radius, while NaCl and CsCl use radius2 for their blue ions: the slider "radius (blue)" does nothing for ZnS (probably copied from the Diamond branch) | kept: ZnS's blue spheres have the red radius (Q-CM-01) **Switch:** with "errors of the original: corrected" (A-CM-08, v0.1.41) — the blue ZnS spheres use "radius (blue)", as for NaCl and CsCl. | ZnS's blue spheres follow "radius (blue)"; the opening state and the snapshots (no ZnS) unchanged | switchable since v0.1.41 |
| E-CM-02 | mathematical | `Plot3D[Table[(d If[HCP, Sqrt[8/3.], 1] - m x - n y If[HCP, Sqrt[3.], 1])/r, …]]` and `ParametricPlot3D[Table[{x, (d If[HCP, Sqrt[3.], 1] - m x)/n, z}, …]]` | for HCP the planes h x + √3 k y + l z = √(8/3) d and h x + k y = √3 d are not the lattice planes h x/a + k y/b + l z/c = d of the cell a = 1, b = √3, c = √(8/3) when two or three indices are nonzero: e.g. the (1 1 0) planes y = √3 d − x miss the atom (½, √3/2, 0) (it lies at d = 0.79), while the planes y = √3 (d − x) pass through it at d = 1 | kept: the original's formulas **Switch:** with "errors of the original: corrected" (A-CM-08, v0.1.41) — the planes h x/a + k y/b + l z/c = d of the cell a = 1, b = √3, c = √(8/3): the (h k l) planes cut the cell edges at a/h, b/k, c/l and pass through lattice points. | HCP planes with two or three nonzero indices pass through lattice points; cubic structures and HCP planes with one nonzero index unchanged | switchable since v0.1.41 |
| E-CM-03 | mathematical | `Cuboid[{sx, sy, sz}, {sx + 1, sy + If[HCP, Sqrt[3.], 1], sz + If[HCP, Sqrt[8/3.], 1]}]` | the HCP cell is 1 × √3 × √(8/3) but is shifted by whole units: with y or z shifted it does not sit on lattice points (the lattice repeats every √3 in y and √(8/3) in z) | kept: shifts in units (Q-CM-08) **Switch:** with "errors of the original: corrected" (A-CM-08, v0.1.41) — the HCP cell is shifted by whole cells: its corner is (sx, √3 sy, √(8/3) sz). | a shifted HCP cell is again a cell of the crystal; unshifted cells and cubic structures unchanged | switchable since v0.1.41 |
| E-CM-04 | mathematical | `Table[…, {d, -3 rp, 3 rp}]` in all plane branches | the planes h x + k y + l z = d meet the crystal for d between rp·Σ min(index, 0) and rp·Σ max(index, 0) (more for the extra sites), up to ±12 rp: when the positive (or the negative) indices add up to more than 3 the family stops inside the crystal (with one repeat (4 0 0) gives x = 0, ¼, ½, ¾ and misses x = 1), and with no repeats only the plane through the origin is drawn | kept: d = −3 rp … 3 rp (Q-CM-07) **Switch:** with "errors of the original: corrected" (A-CM-08, v0.1.41) — d runs over −D … D with D = max(3 rp, (rp + 1) × the sum of the absolute values of h, k, l), so the planes fill the whole plot range box. | complete families for every index; the families whose positive and negative indices each add up to at most 3 unchanged inside the crystal (more planes outside it) | switchable since v0.1.41 |
| E-CM-05 | conceptual | the last branch `ParametricPlot3D[Table[{d, y, z}, {d, -3 rp, 3 rp}], …]` (reached for m = n = r = 0) | (0 0 0) are no Miller indices (no plane has them): the code falls through to the planes x = d, the (1 0 0) family | kept: the planes x = d (Q-CM-03) **Switch:** with "errors of the original: corrected" (A-CM-08, v0.1.41) — (0 0 0) draws no planes. | no planes for (0 0 0) | switchable since v0.1.41 |
| E-CM-06 | text | the notebook's sections "Details & Citations" ("Details, references or citation information"), "References" ("References for demonstration."), "Submission Notes" ("Additional information for the reviewer."), "Keywords" ("keyword 1"), "Related Demonstrations", "External Links", "Related Symbols" (template items) | the authoring template's placeholders were left in the notebook (the published page shows no Details, references or links) | kept out of the page: the port's Details say that the original has none (F-CM-13) | none on the picture | kept |
