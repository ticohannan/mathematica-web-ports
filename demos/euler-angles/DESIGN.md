# Design document: Euler Angles: Precession, Nutation, and Spin

| | |
|---|---|
| Code version: | 0.1.6 |
| Document revision | 2 (2026-10-03) — first full design document (rev. 1 was a feature list) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Euler Angles: Precession, Nutation, and Spin", contributed by Kevin Hernandez, based on a program by Sándor Kabai (CC BY-NC-SA 3.0). Readable source: [`docs/original-source/euler-angles.txt`](../../docs/original-source/euler-angles.txt) |
| Port files | `model.js` (orientations, bookmarks, geometry constants; pure), `main.js` (three.js scene and controls), `index.html` |
| Role in the project | practice port (the assignment evaluates only the motion-planning app) |

## 1. Purpose and background

The original uses a **gyroscope** to illustrate the three Euler angles of a 3-2-3 (z-y-z) rotation.
Caption: "Here a gyroscope is used to illustrate the Euler angles in a 3-2-3 rotation. The outer ring
is fixed in space. The angles are generally designated ψ, θ, φ or α, β, γ." Each nested body turns by
one angle: the middle ring by the **precession** angle about the fixed z axis, the inner ring
additionally by the **nutation** angle about the middle ring's y axis, and the rotor additionally by
the **spin** angle about its own z axis. Coordinate frames drawn on each body show how the three
rotations compose. The port makes this run in a browser with the same controls and geometry.

## 2. Scope

In scope: the original's three angle sliders, its bookmarks and bookmark animation, the gyroscope
geometry and frames, rotate/zoom of the 3D view (§4), plus the port additions in §4.4.
Out of scope (would need a design entry first): other Euler conventions, angle read-outs in other
units, physics (torque, real precession dynamics), saving views.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-EA-01 | student | change one Euler angle at a time and see which body turns about which axis |
| UC-EA-02 | student | step through the bookmarked sequence pos0 … pos6 that builds a rotation and undoes it |
| UC-EA-03 | student | look at the gyroscope from other directions |
| UC-EA-04 | tester | compare with the original's snapshot states |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-EA-01 | Three labelled sliders "precession angle" (a1), "nutation angle" (a2), "spin angle" (a3): 0 … 360 degrees, step 1, default 0, each with a value field and the ⊕ animation panel | set each Euler angle (UC-EA-01) | v0.1.0 | e2e "has the three labelled sliders of the original"; e2e "keyboard on a slider changes the angle"; e2e "typing a value in the field sets the angle"; e2e "slider animation" |
| F-EA-02 | Bookmarks menu (placeholder "—", then pos0 … pos6 = (0,0,0) (45,0,0) (45,30,0) (45,30,15) (0,30,15) (0,0,15) (0,0,0)); choosing one sets the three angles; the menu keeps showing the last choice after the sliders move | a ready-made sequence that applies the three rotations and removes them again (UC-EA-02) | v0.1.0 | e2e "bookmark pos3 = (45, 30, 15)"; unit "bookmark interpolation hits pos0..pos6"; golden "euler angles: snapshot states are the bookmark positions" |
| F-EA-03 | "Animate bookmarks": runs through pos0 … pos6 with linear interpolation (`InterpolationOrder -> 1`), 9 s per cycle, looping until stopped; each start begins at pos0; the angle fields show the interpolated (non-integer) values | shows the sequence as a movement | v0.1.0 | e2e "moves through the bookmarks and can be stopped"; M-EA-05 |

### 4.2 Model (`model.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-EA-04 | Nested rotations: middle ring Rz(a1); inner ring Rz(a1)·Ry(a2); rotor Rz(a1)·Ry(a2)·Rz(a3) (3-2-3 / ZYZ) | the meaning of the three Euler angles | v0.1.0 | unit "orientation is Rz(a1).Ry(a2).Rz(a3)"; unit "spin axis: tilted by the nutation angle"; unit "spin does not move the spin axis"; e2e "bookmark pos3 = (45, 30, 15)" |

### 4.3 Graphics (three.js, scene constants from the original)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-EA-05 | Outer torus (fixed): radius 16, tube 1, yellow (1, 1, 0.4), in the YZ plane | the fixed reference of the gyroscope | v0.1.0 | M-EA-02 |
| F-EA-06 | Middle torus: radius 12, light blue (0.6, 0.8, 1), turns with precession | shows the first rotation | v0.1.0 | M-EA-02 |
| F-EA-07 | Inner torus: radius 8, orange (1, 0.6, 0.4), turns with precession and nutation | shows the second rotation | v0.1.0 | M-EA-02 |
| F-EA-08 | Rotor: disk (radius 5, height 2) and cube (side 6), green-yellow (0.8, 1, 0.2), turns with all three angles | shows the third rotation (spin) | v0.1.0 | M-EA-02; e2e "loads without errors and draws a non-blank 3D scene" |
| F-EA-09 | Axles on both sides: yellow along z from 10.7 to 17.4 (radius 0.5, fixed), blue along y from 6.7 to 13.4 (radius 0.5, middle ring), red along z from 1 to 9.4 (radius 0.3, inner ring) | show the rotation axes physically | v0.1.0 | M-EA-03 |
| F-EA-10 | Coordinate frames, lines of length 25 with italic labels at 27: black X Y Z (fixed), blue x y z (middle ring), red x y z (inner ring), olive (0.4, 0.5, 0.1) x y z (rotor); one label per moving frame (z, y, z) shifted sideways so overlapping labels stay readable (the original pads it with four spaces) | show how each rotation moves the axes | v0.1.0 | M-EA-04 |
| F-EA-11 | View: plot range ±35, `ViewPoint -> 0.35 {6, 1, 2}`, `ViewAngle -> π/8`, z up, no bounding box; picture as wide as its column, at most 520 px (original 400, D-EA-04) | the original's camera | v0.1.0 | M-EA-01; review |
| F-EA-12 | Mouse drag rotates, wheel zooms and right-drag pans the 3D view | the original's "Rotate and Zoom in 3D" (UC-EA-03) | v0.1.0 | e2e "mouse drag on the scene rotates the view" |
| F-EA-13 | Title and caption of the original | explains what is shown | v0.1.0 | M-EA-07 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-EA-01 | "Initial settings" button: all angles to 0, bookmark menu cleared (see K-EA-01) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "resets all angles" |
| A-EA-02 | "Reset view" button: camera back to the original viewpoint | there is no other way back after rotating the view | v0.1.0 | inventory; M-EA-01 |
| A-EA-03 | `window.__demo` automation hook (state, orientations, rendered spin axis) | automated browser tests | v0.1.0 | e2e "bookmark pos3 = (45, 30, 15)" |
| A-EA-04 | "All demos" link back to the landing page | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-EA-05 | Credit footer: original title, authors, licence, adaptation notice, links | required by the CC BY-NC-SA 3.0 licence | v0.1.1 | e2e "attribution on" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest
ancestor); `*` matches any text. Checked by the browser test "every control on … is specified in
its design document".

| data-testid | Feature |
|-------------|---------|
| `*-a1` | F-EA-01 |
| `*-a2` | F-EA-01 |
| `*-a3` | F-EA-01 |
| `scene-canvas` | F-EA-12 |
| `bookmarks` | F-EA-02 |
| `animate-bookmarks` | F-EA-03 |
| `reset` | A-EA-01 |
| `reset-view` | A-EA-02 |
| `crumbs` | A-EA-04 |
| `credits` | A-EA-05 |

## 6. Design

- `model.js` holds the angle specification, the bookmarks, the orientation formulas and all
  geometry constants of the original's Initialization; it has no DOM or WebGL code and is unit-tested.
- `main.js` builds a three.js scene graph whose nesting mirrors the gyroscope: fixed → middle ring
  (rotated by a1 about z) → inner ring (a2 about y) → rotor (a3 about z). Changing an angle only sets
  the three group rotations and renders.
- Mathematica's view (`ViewPoint`, `ViewAngle`, z vertical) is emulated by `shared/three-helpers.js`;
  labels are HTML overlays; lighting approximates Mathematica's default.

## 7. Deviations (D) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-EA-01 | deviation | Lighting approximates Mathematica's default coloured lights; torus/rotor tessellation is smoother. |
| D-EA-02 | deviation | Bookmark animation (9 s per cycle) and slider animation (6 s per sweep) speeds are guesses; Mathematica's defaults may differ. |
| D-EA-03 | deviation | Labels are HTML overlays: always on top, never hidden behind geometry. |
| D-EA-04 | deviation | The 3D picture is as wide as its column, at most 520 px (original `ImageSize -> 400`). |
| K-EA-01 | known issue | While "Animate bookmarks" runs, "Initial settings" and slider moves are overwritten by the next animation frame (the animation is not stopped). Found by design review, v0.1.6; fix proposed as P-EA-01. |
| N-EA-01 | note | `s1 = a1/1°` in the extracted source is `(a1/1)°` = a1 degrees in radians (box grouping), not a bug. |
| N-EA-02 | note | Sliders go 0 … 360; the original has no negative angles. |

## 8. Proposed changes

One open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-EA-01 | proposed | design review / 2026-10-03 | "Initial settings" and any slider input stop a running bookmark animation | fixes K-EA-01: the reset should win | after pressing Initial settings during the animation, all angles stay 0 and the button shows "▶ Animate bookmarks" |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-02 | feature list written with the first port |
| 1 | v0.1.1 | 2026-10-03 | credit footer added (A-EA-05) |
| 2 | v0.1.6 | 2026-10-03 | full design document: purpose, scope, use cases, reasons, versions, UI inventory, design, change process; no feature changes |
