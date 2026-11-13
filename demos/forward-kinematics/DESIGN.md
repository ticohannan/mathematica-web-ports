# Design document: Forward Kinematics

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 3 (2026-11-12) — v0.1.39: its own stylesheet for the matrices |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Forward Kinematics", contributed by Rob Lockhart, published 2011-03-07 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ForwardKinematics/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`, the matrix table), `errata-mode.js`, `index.html` |
| Role in the project | new demonstration (owner request 2026-11-12) |

## 1. Purpose and background

A three-link arm on a turntable (base, link 1, link 2 and a gripper as end effector) is posed by four joint angles. The
Demonstration draws the arm, optionally the coordinate frame of each joint, and lists the four local 4×4 matrices whose
product maps local coordinates to global ones: "take the dot product of all the matrices up to the frame of the point in
question, as well as the local coordinates" (caption). Inspired by Oussama Khatib's Introduction to Robotics course
(Details).

## 2. Scope

In scope: the Demonstration's controls, picture and table, reproduced from its Manipulate and initialization code
(`docs/original-source/forward-kinematics.txt`) and checked against its snapshots (`docs/original-snapshots/forward-kinematics-*.png`)
and saved settings (`tests/golden/forward-kinematics.original-states.json`). Out of scope: anything the original does not
do; the port's additions are the A- features.

## 3. Users and use cases

- UC-FK-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-FK-02: the owner compares the port with the original (checklist `docs/checklists/forward-kinematics.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-FK-01 | Sliders base 0 … 2π, link 1 0 … π, link 2 −π/2 … π/2, end effector −π/2 … π/2, step π/32 (exact values nπ/32), without value label, each with its ⊕ animation panel | the original's controls | v0.1.38 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-FK-03 |
| F-FK-02 | Checkbox "show frames" | the original's control | v0.1.38 | e2e "show frames draws the 15 frame arrows"; M-FK-05 |
| F-FK-03 | The arm as Graphics3D in the original's order: base disk (blue, Cylinder radius 10 from z = −5 to 0), turning block (red Cuboid, Rotate by the base angle), shoulder, elbow and wrist joints (red cylinders radius 3), the two links (blue cylinders radius 2, length 20), the gripper (blue Tube radius 1, a U at the end-effector frame); Opacity 0.9; Boxed -> False, ImageSize -> {350, 350}, PlotRange -> {{−50, 50}, {−50, 50}, {0, 55}}, ViewAngle -> π/15, Lighting -> "Neutral" (shared/mma-lighting.js); drag to rotate | the original's picture | v0.1.38 | unit "the picture: the original’s primitives in order, colours and opacity; 15 arrows, invisible unless show frames"; e2e "loads without errors and draws the picture"; M-FK-07 |
| F-FK-04 | The initialization's TR1 … TR4: the products of the local matrices (rotation about z by the base angle; rotations about −y by the link angles with the translations 3 in z, 20 and 20 in x) applied to local points | the original's model | v0.1.38 | unit "the transforms put the elbow and the end-effector frame where the planar geometry says"; unit "the gripper: a U of three segments at the end-effector frame" |
| F-FK-05 | The 15 frame arrows (black, length 10, five frames: world and base at (0, 0, 3), link 1, link 2, end effector), drawn with Opacity 1 when "show frames" is on and Opacity 0 otherwise | the original's picture | v0.1.38 | unit "the picture: the original’s primitives in order, colours and opacity; 15 arrows, invisible unless show frames"; e2e "show frames draws the 15 frame arrows" |
| F-FK-06 | The table Text@Style[Grid[{{"  ", "local rotation matrix"}, {"base", M}, {"link 1", M}, {"link 2", M}, {"end-effector", M}}], FontSize -> 10] with each M in TraditionalForm: exact entries as Mathematica evaluates them (cos and sin of nπ/32 rewritten to the first octant, e.g. Cos[5π/16] = sin(3π/16); 0, ±1 exact), built-up π fractions, tall parentheses (shared/traditional-form.js) | the original's table | v0.1.38 | unit "the matrices of the table, as the four snapshots show them"; unit "the table entries are the values of the drawing matrices (link 1 without its translation 3, N-FK-02)"; e2e "the snapshot settings + screenshots for review"; M-FK-06 |
| F-FK-07 | The output Pane[Grid[{{picture, table}}, Frame -> All], {575, 375}]: two framed cells side by side | the original's layout | v0.1.38 | M-FK-02 |
| F-FK-08 | Opening state: base 0, link 1 5π/16, link 2 −π/2, end effector 7π/32, frames off | the saved settings | v0.1.38 | unit "the opening state is the saved Initial Settings (T1 0, T2 5π/16, T3 −π/2, T4 7π/32, frames off)"; e2e "has its controls with their defaults" |
| F-FK-09 | Caption and Details from the Demonstration | the original's explanation | v0.1.38 | M-FK-01 |
| F-FK-10 | The four snapshot settings give the snapshots' pictures and tables | faithfulness | v0.1.38 | e2e "the snapshot settings + screenshots for review"; M-FK-06 |
| A-FK-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.38 | e2e "Initial settings restores the opening state" |
| A-FK-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, tableText, inkFraction, camera) from the Manipulate layer | automated tests | v0.1.38 | e2e "the snapshot settings + screenshots for review" |
| A-FK-03 | Start-up notice when the browser cannot run the page (DEC-22, WebGL 2 required) | no empty page | v0.1.38 | e2e "start-up notice when" |
| A-FK-04 | Breadcrumb link to all demos | navigation | v0.1.38 | inventory |
| A-FK-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.38 | e2e "attribution on" |
| A-FK-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.38 | e2e "bundle: forward-kinematics runs from its own folder" |
| A-FK-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.38 | e2e "every card on the landing page has a thumbnail that loads" |
| A-FK-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-FK-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.38 | unit "corrected mode (E-FK)"; e2e "errata switch on forward-kinematics: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-T1` | F-FK-01 |
| `*-T2` | F-FK-01 |
| `*-T3` | F-FK-01 |
| `*-T4` | F-FK-01 |
| `check-FT` | F-FK-02 |
| `scene-canvas` | F-FK-03 |
| `reset` | A-FK-01 |
| `crumbs` | A-FK-04 |
| `details` | F-FK-09 |
| `credits` | A-FK-05 |
| `setter-errata-*` | A-FK-08 |
| `errata-details` | A-FK-08 |

## 6. Design

- `model.js` (pure): `localMatrices` (the four 4×4 matrices of the initialization code with exact cos/sin of nπ/32,
  shared/exact-pi.js), `transforms` (TR1 … TR4 as matrix products), `tableMatrices` (the displayed matrices as exact
  entries, shared/traditional-form.js), `evaluate(state)` → `{ view, graphics: [Graphics3D, table] }`. The angles are
  kept as the integers n of nπ/32, so every value is exact, as in the original.
- `main.js`: the Manipulate with two pictures: the Graphics3D drawn by `View3D` (SphericalRegion false, the camera on
  the plot range, the clipping box widened by 0.05, D-FK-03) and the table drawn by a small renderer in `main.js`
  (`matrixElement` of shared/traditional-form.js).
- Shared code added for this port (v0.1.38, MIT, opt-in): `shared/traditional-form.js` (exact entries in
  TraditionalForm; its `.tf-*` styles in shared/traditional-form.css since v0.1.39) and `Lighting -> "Neutral"` (`MMA_NEUTRAL_LIGHTS` in
  shared/mma-lighting.js, used by shared/graphics3d-view.js).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- forward-kinematics` → `dist/forward-kinematics/`.
- Contents (generated with `node tools/bundle-app.mjs forward-kinematics --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/forward-kinematics/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 25 | `clock.js`, `errata.js`, `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma-text.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `traditional-form.css`, `traditional-form.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/forward-kinematics/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: forward-kinematics runs from its own folder" (A-FK-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-FK-01 | deviation | `JoinForm["Miter"]`: the gripper tube's two corners are drawn rounded (a sphere at each joint, shared/graphics3d-three.js), not mitred; with radius 1 the difference is about a pixel. |
| D-FK-02 | deviation | The arrowheads have the port's default size (0.04 of the plot range's diagonal); Mathematica's default 3D arrowheads look somewhat larger in snapshot 3. |
| D-FK-03 | deviation | The clipping box of PlotRange is widened by 0.05: the base cylinder ends exactly in the range's bottom plane z = 0, and without the margin its top face would be clipped away or flicker. Mathematica draws the face (snapshots). |
| D-FK-04 | deviation | The table is set in the page's system font at 10 px (Mathematica: FontSize 10 in its default font); the parentheses are drawn with CSS borders. Below 640 px of window width the two cells are stacked. |
| D-FK-05 | deviation | Mathematica shows faint lines across the cylinders' end caps (its polygon mesh); the port's caps are plain. |
| N-FK-01 | note | The frame arrows are always part of the picture; "show frames" only switches their opacity between 0 and 1, as in the original. |
| N-FK-02 | note | The table's "link 1" matrix has no translation, while the drawing's TR2 lifts the shoulder by 3. This is consistent: the world and base frames are drawn at (0, 0, 3), the shoulder's height, so the table describes the frames as drawn. |
| N-FK-03 | note | The link matrices {{cos θ, 0, −sin θ}, {0, 1, 0}, {sin θ, 0, cos θ}} rotate about −y, so a positive angle raises a link; the table shows exactly the matrices the drawing uses. |
| N-FK-04 | note | The sliders show no value (the original sets no Appearance); the ⊕ panel shows the exact value (e.g. 5π/16) and accepts a typed one ("π/2", "5 Pi/16" or radians). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-FK-01 | approved (owner request 2026-11-12), implemented in v0.1.38 as A-FK-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-FK-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.38 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.38 | 2026-11-12 | the port: the arm, its frames and the table of exact local matrices; `Lighting -> "Neutral"` and shared/traditional-form.js added to the shared code; switch for E-FK-01 |
| 3 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); the matrix styles (`.tf-*`) moved from shared/style.css into shared/traditional-form.css, which this page now links (Q-4 of selective testing; same look) |
| 4 | v0.1.40 | 2026-11-13 | version number (v0.1.40: three truss ports; shared/truss.js is new; shared/graphics.js gains Mouseover, RotatedText, rounded and line-less Framed, Arrowheads[Large] and heads at given places, Grid alignment at "=", styled scripts and fitPlotRange — the changes to existing drawing are a styled script keeping its style and the baseline after it, and framed or backed labels keeping their outer spaces); no change to this app's code or behaviour |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-FK-01 | Mitred tube joins in shared/graphics3d-three.js | JoinForm["Miter"] as in Mathematica | small; changes no other app (no other tube with a JoinForm) | D-FK-01 |
| I-FK-02 | Show the global matrices (the products up to each frame) as well | the caption's procedure made visible | not in the original | F-FK-04 |
| I-FK-03 | Mathematica's default 3D arrowhead size measured | closer arrows | owner's Mathematica | D-FK-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-FK-01 | text | the table's header, Grid[{{"  ", "local rotation matrix"}, …}] | the four matrices are 4×4 homogeneous transformations (a rotation and a translation: the 20 of link 2 and the end effector); a rotation matrix is only their 3×3 block | kept: "local rotation matrix" **Switch:** with "errors of the original: corrected" (A-FK-08, v0.1.38) — the header reads "local transformation matrix". | the header reads "local transformation matrix" | switchable since v0.1.38 |
| E-FK-02 | text | caption | "take the dot product of all the matrices": the matrices are multiplied (the matrix product, Mathematica's Dot); a dot product is the scalar product of two vectors | kept | none on the picture | kept |
