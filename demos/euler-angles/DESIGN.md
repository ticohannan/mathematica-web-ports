# Design: Euler Angles: Precession, Nutation, and Spin

Original: Wolfram Demonstrations Project, contributed by Kevin Hernandez, based on a program by
Sándor Kabai. Readable original source: `docs/original-source/euler-angles.txt`.
Port files: `model.js` (pure), `main.js` (three.js scene + controls), `index.html`.

## 1. Features re-implemented

| ID | Original spec | Port | Verified by |
|----|---------------|------|-------------|
| F-EA-01 | Sliders `{{a1,0,"precession angle"},0,360,1}`, same for nutation (a2) and spin (a3), `Appearance->"Labeled"` | 3 sliders + value fields + ⊕ animation | e2e slider tests |
| F-EA-02 | Bookmarks pos0…pos6: (0,0,0) (45,0,0) (45,30,0) (45,30,15) (0,30,15) (0,0,15) (0,0,0) | bookmark menu | e2e "bookmark pos3…" |
| F-EA-03 | Bookmark animation, `InterpolationOrder -> 1` (linear) | "Animate bookmarks" | e2e, M-EA-05 |
| F-EA-04 | Nested rotations: gimbal Rz(a1); inner ring Rz(a1)Ry(a2); rotor Rz(a1)Ry(a2)Rz(a3) (3-2-3 / ZYZ) | three.js groups | unit "orientation is Rz.Ry.Rz", e2e rendered spin axis |
| F-EA-05 | Outer torus (fixed): R 16, tube 1, yellow (1,1,0.4), in the YZ plane | TorusGeometry | M-EA-02 |
| F-EA-06 | Middle torus R 12 light blue (0.6,0.8,1), rotates with precession | yes | M-EA-02 |
| F-EA-07 | Inner torus R 8 orange (1,0.6,0.4), rotates with precession + nutation | yes | M-EA-02 |
| F-EA-08 | Rotor: disk (cylinder z −1…1, r 5) + cube side 6, green-yellow (0.8,1,0.2) | yes | M-EA-02 |
| F-EA-09 | Axles: yellow along z (10.7…17.4, r 0.5, fixed), blue along y (6.7…13.4, r 0.5, gimbal), red along z (1…9.4, r 0.3, inner) | yes | M-EA-03 |
| F-EA-10 | Frames: black X Y Z fixed; blue x y z (gimbal); red x y z (inner); olive (0.4,0.5,0.1) x y z (rotor); lines length 25, italic labels at 27, one label per frame offset by 4 spaces | yes | M-EA-04 |
| F-EA-11 | View: PlotRange ±35, ViewPoint 0.35{6,1,2}, ViewAngle π/8, ViewVertical z, no box, ImageSize 400 | camera | M-EA-01 |
| F-EA-12 | Mouse rotate / zoom | OrbitControls | e2e "mouse drag…" |
| F-EA-13 | Caption text, credits | page | M-EA-07 |

Port additions: A-EA-01 "Initial settings", A-EA-02 "Reset view", A-EA-03 `window.__demo`.

## 2. Deviations / notes
| ID | Kind | Description |
|----|------|-------------|
| D-EA-01 | deviation | Lighting approximates Mathematica's default "Automatic" coloured lights; torus/rotor tessellation differs (smooth). |
| D-EA-02 | deviation | Bookmark animation speed (9 s per cycle) and slider animation speed are guesses; Mathematica's defaults may differ. |
| D-EA-03 | deviation | Labels are HTML overlays: always on top, never hidden behind geometry (Mathematica's Text can be occluded? — verify). |
| N-EA-01 | note | `s1 = a1/1°` in the extracted source is `(a1/1)°` = a1 degrees in radians (box grouping), not a bug. |
| N-EA-02 | note | Sliders go 0…360; the original has no negative angles. |

## 3. Test plan
- Unit: `tests/unit/rotations.test.js` (Euler gyroscope model section).
- Golden: the original's 4 snapshot states (0,0,0), (45,0,0), (45,30,0), (45,30,15) — screenshots
  of each are produced by `tests/e2e/euler.spec.js` for side-by-side comparison with the original's
  snapshot images.
- Browser: `tests/e2e/euler.spec.js`.
- Manual: checklist section EA.
