# Design document: Three Parametrizations of Rotations

| | |
|---|---|
| Code version: | 0.1.15 |
| Document revision | 5 (2026-10-17) — §11 Errors in the original (R-C); checklist items as operator procedures (R-B) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Three Parametrizations of Rotations" by Aaron T. Becker and Benedict Isichei (CC BY-NC-SA 3.0). Readable source: [`docs/original-source/three-parametrizations.txt`](../../docs/original-source/three-parametrizations.txt) |
| Port files | `rotations.js` (rotation matrices, conversions, progress; pure), `teapot-data.js` (the original's teapot mesh), `main.js` (three.js scene and controls), `index.html` |
| Role in the project | practice port (the assignment evaluates only the motion-planning app) |

## 1. Purpose and background

The original compares **three ways to parametrize the same 3D rotation**: Euler angles about ZYZ,
an angle about an arbitrary axis, and roll/pitch/yaw about the fixed XYZ axes. Caption: "The progress
slider rotates a teapot shape through these rotations, from an initial orientation in green to a
final orientation in red. The intermediate configurations of the teapot depend on the parametrization
chosen, but the final configuration is always the same." The user picks a method, sets its
parameters, and the app shows the resulting rotation, the equivalent parameters of the other two
methods (in the disabled controls), and how the teapot travels from start to end under the chosen
method. The port makes this run in a browser with the same controls and numbers.

## 2. Scope

In scope: the method setter, the parameter controls of all three methods with conversion between
them, the progress animation, the teapots, frames, rotation axis and axes box (§4), plus the port
additions in §4.5. Out of scope (would need a design entry first): other conventions (e.g. XYZ Euler,
quaternions), other models, numeric matrix display.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-TP-01 | student | set a rotation with one method and read the equivalent parameters of the other two |
| UC-TP-02 | student | see that different parametrizations reach the same final orientation by different intermediate motions |
| UC-TP-03 | student | look at the scene from other directions |
| UC-TP-04 | tester | compare converted values with the original's snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-TP-01 | "progress" slider on top: 0 … 1, step 0.01, default 1, labelled, value field, ⊕ animation panel (sweep 6 s, loops) | moves the teapot from the start to the final orientation (UC-TP-02) | v0.1.0 | e2e "progress slider: 0 = start orientation"; M-TP-06 |
| F-TP-02 | "method" setter: Euler ZYZ / axis/angle / roll pitch yaw (default Euler ZYZ) | chooses which parametrization drives the rotation | v0.1.0 | e2e "method setter enables exactly the sliders of the chosen parametrization" |
| F-TP-03 | φ, θ, ψ sliders: −3.15 … 3.15, step 0.01, labelled; enabled only for the Euler method | Euler ZYZ parameters | v0.1.0 | e2e "method setter enables exactly the sliders"; M-TP-04 |
| F-TP-04 | "axis lat/long" 2D slider: longitude −3.15 … 3.15, latitude −1.58 … 1.58, pointer input rounded to 0.01, with two value fields; enabled only for the axis/angle method | direction of the rotation axis | v0.1.0 | e2e "2D axis slider responds to mouse drag in axis/angle mode only"; M-TP-04 |
| F-TP-05 | "angle" slider: −3.15 … 3.15, **step 0.1**; enabled only for the axis/angle method | rotation angle about the axis | v0.1.0 | e2e "method setter enables exactly the sliders"; M-TP-04 |
| F-TP-06 | α, β, γ sliders (labels "R x₀, α", "R y₀, β", "R z₀, γ"): −3.15 … 3.15, step 0.01; enabled only for the roll-pitch-yaw method | roll/pitch/yaw parameters | v0.1.0 | e2e "method setter enables exactly the sliders"; M-TP-04 |
| F-TP-07 | The disabled controls show the current rotation converted to their method (rounded to 0.001), written back after every change | compare the three parametrizations of one rotation (UC-TP-01) | v0.1.0 | e2e "displayed converted values equal the original"; golden "three parametrizations: conversions match the original" |

### 4.2 Computation (`rotations.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-TP-10 | R_ZYZ = Rz(φ)·Ry(θ)·Rz(ψ) | Euler ZYZ rotation | v0.1.0 | unit "R_ZYZ entries" |
| F-TP-11 | R_ZYX = Rz(γ)·Ry(β)·Rx(α) | roll-pitch-yaw rotation | v0.1.0 | unit "R_ZYX entries" |
| F-TP-12 | Axis/angle: `RotationMatrix[angle, k]` with k from longitude/latitude | axis/angle rotation | v0.1.0 | unit "normalises the axis like Mathematica"; unit "is orthonormal for random axes/angles" |
| F-TP-13 | Conversions matrix → ZYZ, → roll-pitch-yaw, → axis/angle, vector → longitude/latitude, each rounded to 0.001 | fills the disabled controls (F-TP-07) | v0.1.0 | golden "three parametrizations: conversions match the original"; unit "conversions round-trip" |
| F-TP-14 | Progress: Euler and roll-pitch-yaw turn one angle per third of the slider; axis/angle scales the angle | shows the intermediate motion of each method (UC-TP-02) | v0.1.0 | unit "Euler progress: first third turns only phi about z"; unit "progress = 0 gives the identity"; unit "the final orientation is the same whichever method produced it" |

### 4.3 Graphics

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-TP-20 | Green teapot at 20 % opacity at the start orientation (identity) | the "from" of the rotation | v0.1.0 | M-TP-02 |
| F-TP-21 | Solid teapot at the progress orientation | the moving object | v0.1.0 | e2e "teapots in the scene use exactly the computed R and Rprog" |
| F-TP-22 | Red teapot at 20 % opacity at the final orientation R | the "to" of the rotation | v0.1.0 | e2e "teapots in the scene use exactly the computed R and Rprog" |
| F-TP-23 | Red fixed frame x₀ y₀ z₀: lines of length 1, labels at 1.1 | reference frame o₀x₀y₀z₀ | v0.1.0 | M-TP-03 |
| F-TP-24 | Blue rotated frame x₁ y₁ z₁: lines to R·0.9eᵢ, labels at R·eᵢ | rotated frame o₁x₁y₁z₁ | v0.1.0 | M-TP-03 |
| F-TP-25 | Purple axis of rotation, length 1.3 | shows the single equivalent axis (Euler's rotation theorem) | v0.1.0 | M-TP-05 |
| F-TP-26 | Axes with ticks and labels x₀ y₀ z₀, bounding box, plot range ±1.45, `ViewPoint {1.3, −2.4, 2}`; picture as wide as its column, at most 520 px (D-TP-05) | the original's 3D frame | v0.1.0 | M-TP-01; review |
| F-TP-27 | Mouse drag rotates, wheel zooms and right-drag pans the 3D view | the original's "Rotate and Zoom in 3D" (UC-TP-03) | v0.1.0 | M-TP-08 |
| F-TP-28 | Teapot mesh = the original's embedded `ExampleData` teapot (480 vertices, 432 quads), decoded from the notebook | same object as the original | v0.1.0 | M-TP-02; e2e "loads without errors and draws a non-blank scene" |

### 4.4 Page content

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-TP-30 | Title, caption and an abridged Details text (formulas, reference; the original's explicit 3×3 matrices are left out), collapsible; a port note where the text was corrected (D-TP-04) | explains the three parametrizations; part of the original | v0.1.0 | M-TP-09 |

### 4.5 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-TP-01 | "Initial settings" button: all controls back to the defaults | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | inventory; M-TP-01 |
| A-TP-02 | "Reset view" button: camera back to the original viewpoint | there is no other way back after rotating the view | v0.1.0 | inventory; M-TP-08 |
| A-TP-03 | `window.__demo` automation hook (state, matrices, rendered matrices, enabled controls) | automated browser tests | v0.1.0 | e2e "teapots in the scene use exactly the computed R and Rprog" |
| A-TP-04 | "All demos" link back to the landing page | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-TP-05 | Credit footer: original title, authors, licence, adaptation notice, links | required by the CC BY-NC-SA 3.0 licence | v0.1.1 | e2e "attribution on" |
| A-TP-06 | Recovers by itself after the browser restores a lost WebGL context (GPU reset, driver update, sleep): redraws the same view on the white background | without it the scene vanished and came back on black only after the next interaction | v0.1.11 | e2e "redraws by itself after the WebGL context is lost and restored" |
| A-TP-07 | Standalone bundle: `npm run bundle -- three-parametrizations` writes this app alone, with exactly the files it loads, a root page, README and licence texts, to `dist/three-parametrizations/` (§6.1) | owner rule R-A: anyone can take this one app and host it elsewhere | v0.1.15 | e2e "bundle: three-parametrizations runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest
ancestor); `*` matches any text. Checked by the browser test "every control on … is specified in
its design document".

| data-testid | Feature |
|-------------|---------|
| `*-progress` | F-TP-01 |
| `setter-typeRot-*` | F-TP-02 |
| `*-phi` | F-TP-03 |
| `*-theta` | F-TP-03 |
| `*-psi` | F-TP-03 |
| `pad-axis` | F-TP-04 |
| `value-axis-*` | F-TP-04 |
| `*-angle` | F-TP-05 |
| `*-alpha` | F-TP-06 |
| `*-beta` | F-TP-06 |
| `*-gamma` | F-TP-06 |
| `scene-canvas` | F-TP-27 |
| `details` | F-TP-30 |
| `reset` | A-TP-01 |
| `reset-view` | A-TP-02 |
| `crumbs` | A-TP-04 |
| `credits` | A-TP-05 |

## 6. Design

- `rotations.js` ports the original's functions (rotation matrices, the three conversions, the
  progress interpolation) without DOM or WebGL; `evaluate(state)` computes the Manipulate body:
  the rotation R for the chosen method, the progress rotation Rprog, the rotation axis k, and the
  state with the converted parameters written back (as the original writes them into its sliders).
- `main.js` keeps the state, builds the controls (`shared/ui.js`) and the three.js scene, enables
  only the chosen method's controls and redraws teapots, frames and axis after every change.
- Mathematica's view, line thickness and labels are emulated by `shared/three-helpers.js`.

### 6.1 Building and deploying this app alone

Owner rule R-A: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- three-parametrizations` → `dist/three-parametrizations/` (with `--zip` also `dist/three-parametrizations.zip`;
  `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the page loads (HTML, import
  map, static and literal dynamic imports, stylesheets, pictures) and copies exactly those, keeping the repository's
  folder layout, so no path is rewritten; it stops with a list of problems if a reference cannot be resolved.
- Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the
  collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/three-parametrizations/`) | 4 | `index.html`, `main.js`, `rotations.js`, `teapot-data.js` |
| `shared/` | 7 | `linalg.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `style.css`, `three-helpers.js`, `ui.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/three-parametrizations/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it and links
  to the app), a generated `README.md` (title, the credits of the footer, licence summary, how to serve and test),
  `.nojekyll` (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the
  copied files, and `vendor/three/LICENSE` (three.js).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a browser with ES modules and import maps (Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4);
  WebGL 2 (three.js draws the whole picture; this app has no start-up notice yet). No server-side code.
- Checked by e2e "bundle: three-parametrizations runs from its own folder" (`tests/e2e/bundle.spec.js`): the bundle folder alone is
  served, its root page must open the app, the app must start (`window.__demo.ready`) without page errors, every request
  must stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D) and original quirks kept (Q)

| ID | Kind | Description |
|----|------|-------------|
| D-TP-01 | deviation | `findAxisAngle` clamps the ArcCos argument to [−1, 1]. Mathematica would give a tiny complex number which its own `Chop[…,10^-7]` removes; near the identity the original may show k = {0,0,0} where the port shows {1,0,0}. |
| D-TP-02 | deviation | `Sqrt[1 - R31²]` (findRollPitchYaw), `Sqrt[1 - R33²]` (findZYZEuler) and the ArcSin argument in vectorToAzimuthAngle are guarded against rounding just outside their domain; `ArcTan[0,0]` is Indeterminate in Mathematica but 0 in JS (degenerate branch only). |
| D-TP-03 | deviation | Lighting, colours of the solid teapot and line widths approximate Mathematica's defaults; axis tick placement is simplified (fixed box edges). |
| D-TP-04 | deviation | Details text: the original writes R_ZYZ = R_z,φ R_y,θ R_z,φ (φ twice) and gives k with latitude/longitude swapped relative to its code; the port's text follows the code (noted on the page). |
| D-TP-05 | deviation | The 3D picture is as wide as its column, at most 520 px (original `ImageSize -> {375, 375}`); the progress slider is full width (original `ImageSize -> 480`); slider animation speed (6 s per sweep) is a guess. The 2D axis pad can be focused but has no keyboard control. |
| K-TP-01 | known issue (lead) | Lighting lead (found with K-RS-10 of the robot-singularities app, whose `shared/mma-lighting.js` reproduces Mathematica's documented default `Lighting`, confirmed in Mathematica 15.0.1): `shared/three-helpers.js` places the default lights with the colours of directional lights 1 and 3 swapped, the 4th light RGBColor[0, 0.18, 0.5] instead of RGBColor[0, 0, 0.18] and the green light at z = 2 instead of 3. Not changed (it is part of D-TP-03); to be compared with the original's snapshots before any change, which would go through §8. |
| Q-TP-01 | quirk kept | `findRollPitchYaw` degenerate branch always returns β = +π/2 (−π/2 also possible). |
| Q-TP-02 | quirk kept | `findZYZEuler` degenerate branch always returns θ = 0 (θ = π also degenerate). |
| Q-TP-03 | quirk kept | `findAxisAngle` returns θ in [0, π] (comment says −π…π); k is numerically ill-conditioned at exactly θ = π. |
| Q-TP-04 | quirk kept | Converted values are rounded to 0.001 and written back into slider variables, so switching method and back can shift the rotation by up to ~0.001 rad. |
| Q-TP-05 | quirk kept | The teapot data is not centred at the origin (x −0.25…1.36, z 0.30…1.05), so it swings around the origin when rotated. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TP-01 | implemented in v0.1.11 as A-TP-06 (approved by the owner 2026-10-05) | browser-compatibility investigation / 2026-10-05 | after the browser restores a lost WebGL context, redraw the scene with the white background | after a simulated loss and restore, three.js reset the clear colour to black and nothing redrew until the next interaction (scene missing, then on black); reload was the only recovery | after `WEBGL_lose_context` loss + restore, without any interaction the canvas shows the same picture as before (ink within 10 %) on white; existing tests pass |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-02 | feature list written with the first port |
| 1 | v0.1.1 | 2026-10-03 | credit footer added (A-TP-05) |
| 2 | v0.1.6 | 2026-10-03 | full design document: purpose, scope, use cases, reasons, versions, UI inventory, design, change process; page content F-TP-30 listed; no feature changes |
| 3 | v0.1.7 | 2026-10-03 | §10 *Improvements to consider* added; no feature changes |
| 3 | v0.1.8 | 2026-10-03 | no change (motion-planning numerics and comparison tooling only) |
| 3 | v0.1.9 | 2026-10-03 | no change (WebKit browser tests added, test tooling only) |
| 3 | v0.1.10 | 2026-10-03 | no change (WebKit browser tests now required to publish; test tooling only) |
| 4 | v0.1.11 | 2026-10-05 | P-TP-01 approved and implemented as A-TP-06: redraw after a WebGL context is restored (shared viewer code) |
| 4 | v0.1.12 | 2026-10-06 | no behaviour change (seven further apps added to the site; their additions to `shared/style.css` apply only to their own pages); lighting lead K-TP-01 recorded |
| 4 | v0.1.13 | 2026-10-12 | no change to this app (collision beep with a mute checkbox in prm-seven-link; new `shared/beep.js` used only there) |
| 4 | v0.1.14 | 2026-10-16 | no change to this app (Mathematica harness tooling; snapshot-state golden tests for the seven newer apps) |
| 5 | v0.1.15 | 2026-10-17 | §11 Errors in the original added (owner rule R-C); Mathematica checklist items rewritten as operator procedures (R-B); standalone bundle (owner rule R-A): §6.1, A-TP-07, tools/bundle-app.mjs; review fixes |

## 10. Improvements to consider (not implemented)

Ideas for making the app better than the original. **None of them is implemented**: the port
reproduces the original's behaviour. An idea becomes work only when the owner turns it into a
proposal in §8 and approves it.

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TP-01 | Treat rotations within a small tolerance of the identity explicitly (show "no rotation, axis undefined" instead of an arbitrary k) | no misleading axis near θ = 0 | differs from the original near the identity | D-TP-01, Q-TP-03 |
| I-TP-02 | In the degenerate (gimbal-lock) branches show that a family of solutions exists, or pick the one closest to the current slider values | learners see why roll/pitch/yaw and ZYZ Euler angles break down | text or extra output on the page (needs an F- entry) | Q-TP-01, Q-TP-02 |
| I-TP-03 | Keep the exact rotation when switching method instead of writing rounded values back into the sliders | switching method and back no longer drifts by up to 0.001 rad | slider values then show more digits or differ from the stored rotation | Q-TP-04 |
| I-TP-04 | Arrow-key control for the 2D axis pad | keyboard accessibility | small; new interaction (needs an A- entry) | D-TP-05 |
| I-TP-05 | Fourth parametrization: unit quaternion | links the axis/angle form to quaternions, used in graphics and robotics | new controls and text; out of scope of the original | §2 |
| I-TP-06 | Centre the teapot on the origin | the teapot turns in place instead of swinging around the origin | changes the picture compared with the original | Q-TP-05 |

## 11. Errors in the original (conceptual and mathematical)

Where the original is probably wrong, as distinct from the quirks of §7 that are merely unusual (owner rule R-C,
[`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) rule 9). Every row is an open question for the owner; the port
keeps the original's behaviour unless the row names a `D-` entry. Checked on 2026-10-17 against the readable source
[`docs/original-source/three-parametrizations.txt`](../../docs/original-source/three-parametrizations.txt) with a
symbolic computation of R<sub>z</sub>(φ)R<sub>y</sub>(θ)R<sub>z</sub>(ψ), R<sub>z</sub>(γ)R<sub>y</sub>(β)R<sub>x</sub>(α) and
the axis/angle matrix: the Details matrices R<sub>ZYX</sub> and R<sub>k,Ω</sub> are correct, and so are the general
branches of `findZYZEuler`, `findRollPitchYaw` and `findAxisAngle`; the rows below are the exceptions. Exact values
such as π or π/2 cannot be reached with the sliders (steps 0.01 and 0.1); they are reachable by typing `Pi` or `Pi/2`
into a slider's value field, which Mathematica accepts (to be confirmed, M-TP-07).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TP-01 | text | Details: "R<sub>ZYZ</sub> = R<sub>z,φ</sub>R<sub>y,θ</sub>R<sub>z,φ</sub>" | φ appears twice; the code (`rotZYZ`) and the matrix that follows are R<sub>z,φ</sub>R<sub>y,θ</sub>R<sub>z,ψ</sub>. | deviates on purpose: the page's Details text follows the code and says so in a port note (D-TP-04) | Text only (M-TP-09). Recording the owner's decision would turn this row into `kept` or `corrected in …`. | open |
| E-TP-02 | text | Details matrix R<sub>ZYZ</sub>, row 2, column 2: "−s<sub>φ</sub>c<sub>θ</sub>s<sub>ψ</sub> + c<sub>φ</sub>s<sub>ψ</sub>" | The entry is −s<sub>φ</sub>c<sub>θ</sub>s<sub>ψ</sub> + c<sub>φ</sub>c<sub>ψ</sub> (symbolic check; the code computes it correctly with `RotationMatrix`). A typo: s<sub>ψ</sub> for c<sub>ψ</sub>. | the page leaves the explicit matrices out (F-TP-30), so the typo is not shown | Text only; nothing computed changes. If the matrices are ever added to the page, the corrected entry must be used. | open |
| E-TP-03 | text | Details: "k = [c<sub>long</sub>c<sub>lat</sub>, c<sub>long</sub>s<sub>lat</sub>, s<sub>long</sub>]<sup>T</sup>"; control label "axis lat/long" | The code (`aizumuthAngleToVector[az, an]` = {Cos[az]Cos[an], Cos[az]Sin[an], Sin[az]} with az the latitude) gives k = [c<sub>lat</sub>c<sub>long</sub>, c<sub>lat</sub>s<sub>long</sub>, s<sub>lat</sub>]<sup>T</sup>: latitude and longitude are swapped in the text. The 2D control labelled "lat/long" holds {longitude, latitude} (x = longitude −3.15…3.15, y = latitude −1.58…1.58), the reverse of its label. | Details: deviates on purpose (D-TP-04); label: keeps "axis lat/long" (F-TP-04) | Text and label only. A relabelled control would change the inventory text checked by the e2e tests and M-TP-04. | open |
| E-TP-04 | mathematical | `findRollPitchYaw`, branch for `R[[3,2]]==0 && R[[3,3]]==0`: `Beta = π/2; Alpha=ArcTan[R[[3,3]],R[[3,2]]]; Gamma=ArcTan[R[[1,1]],R[[2,1]]]` | In this branch cos β = 0, so R<sub>33</sub> = R<sub>32</sub> = R<sub>11</sub> = R<sub>21</sub> = 0: both `ArcTan[0, 0]` are Indeterminate in Mathematica, and β = −π/2 (R<sub>31</sub> = +1) is reported as +π/2. Only α − γ (β = π/2: R<sub>12</sub> = sin(α−γ), R<sub>13</sub> = cos(α−γ)) or α + γ (β = −π/2) is determined; the comment above the branch even writes this matrix. Reachable when θ = π/2 and ψ = 0 are exact in Euler mode, e.g. `Pi/2` typed into θ. | keeps β = +π/2 (Q-TP-01); `ArcTan[0,0]` gives 0 in the port (D-TP-02) | The roll/pitch/yaw fields would show a valid triple (e.g. α = 0, γ from R<sub>12</sub>, R<sub>13</sub>, β = −ArcSin[R<sub>31</sub>]) instead of Indeterminate. No golden state is in this branch. Offered in part as I-TP-02. | open |
| E-TP-05 | mathematical | `findZYZEuler`, branch for `R[[1,3]]==0 && R[[2,3]]==0`: `Theta1 = 0; Phi1=ArcTan[R[[1,1]],R[[2,1]]]; Psi1=0` | The branch also covers θ = π (R<sub>33</sub> = −1), where it returns θ = 0 and a rotation about z only — a different rotation (R<sub>33</sub> = +1 instead of −1; symbolic check). Correct: θ = ArcTan[R<sub>33</sub>, 0] ∈ {0, π} and φ from R<sub>11</sub>, R<sub>21</sub> with the sign of R<sub>33</sub> (e.g. φ = ArcTan[−R<sub>11</sub>, −R<sub>21</sub>] for θ = π). Reachable with exact values, e.g. roll/pitch/yaw mode with α = `Pi` typed and β = γ = 0: the Euler fields then show (φ, θ, ψ) = (0, 0, 0), the identity. | keeps θ = 0 (Q-TP-02) | The Euler fields would show θ = π in such cases; the red teapot does not change (it is drawn from R). No golden state is in this branch. I-TP-02. | open |
| E-TP-06 | mathematical | `findAxisAngle`: `k=If[Sin[Theta]!=0, …, {1,0,0}]` with `Theta = ArcCos[(R[[1,1]]+R[[2,2]]+R[[3,3]]-1)/2]` | At Θ = π the axis cannot be taken from the antisymmetric part (it is 0); the code then returns k = {1, 0, 0} whatever the true axis is (it should come from R + I, e.g. k = column of (R + I)/2 normalised). Example: Euler mode with θ = `Pi` typed gives R = R<sub>y</sub>(π): angle π, axis shown as x (lat/long 0, 0), true axis y. With machine values just below π the formula is ill-conditioned but still about right. | keeps it (Q-TP-03; near the identity see D-TP-01) | The axis/angle fields and the purple axis line would point along the true axis for half-turns. No golden state is a half-turn. Related to I-TP-01. | open |
