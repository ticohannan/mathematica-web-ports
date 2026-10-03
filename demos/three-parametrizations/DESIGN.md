# Design: Three Parametrizations of Rotations

Original: Wolfram Demonstrations Project, by Aaron T. Becker and Benedict Isichei.
Readable original source: `docs/original-source/three-parametrizations.txt`.
Port files: `rotations.js` (pure computation), `teapot-data.js` (the original's teapot mesh),
`main.js` (three.js scene + controls), `index.html`.

## 1. Features re-implemented

### Controls
| ID | Original spec | Port | Verified by |
|----|---------------|------|-------------|
| F-TP-01 | `{{progress,1},0,1,0.01, Appearance->"Labeled", ControlPlacement->Top}` | top slider + value field + ⊕ animation | e2e progress test, M-TP-06 |
| F-TP-02 | `{{typeRot,1,"method"}, {1->"Euler ZYZ", 2->"axis/angle", 3->"roll pitch yaw"}}` | setter bar | e2e "method setter enables…" |
| F-TP-03 | φ, θ, ψ: −3.15…3.15 step 0.01, labelled, enabled only for method 1 | sliders | e2e |
| F-TP-04 | `{{axis,{0,0},"axis lat/long"},{-3.15,-1.58},{3.15,1.58}}` 2D slider, enabled only for method 2 | SVG 2D pad + fields | e2e "2D axis slider…", M-TP-04 |
| F-TP-05 | angle: −3.15…3.15 **step 0.1**, enabled only for method 2 | slider | M-TP-04 |
| F-TP-06 | α, β, γ (labels R x₀,α / R y₀,β / R z₀,γ): −3.15…3.15 step 0.01, enabled only for method 3 | sliders | e2e |
| F-TP-07 | Disabled controls show the converted values of the current rotation (rounded to 0.001) | write-back after each evaluation | e2e snapshot tests, golden |

### Computation (`rotations.js`)
| ID | Feature | Original | Verified by |
|----|---------|----------|-------------|
| F-TP-10 | R_ZYZ = Rz(φ)Ry(θ)Rz(ψ) | `rotZYZ` | unit "R_ZYZ entries" |
| F-TP-11 | R_ZYX = Rz(γ)Ry(β)Rx(α) | `rotZYX` | unit "R_ZYX entries" |
| F-TP-12 | Axis/angle: `RotationMatrix[angle, k]`, k from latitude/longitude | `aizumuthAngleToVector` | unit, golden |
| F-TP-13 | Matrix → ZYZ, → roll-pitch-yaw, → axis/angle, vector → lat/long, all `Round[…, 0.001]` | `findZYZEuler`, `findRollPitchYaw`, `findAxisAngle`, `vectorToAzimuthAngle` | golden (4 states), unit round-trips |
| F-TP-14 | Progress: Euler and RPY animate one angle per third of the slider; axis/angle animates the angle | Manipulate body | unit "Euler progress…", e2e |

### Graphics
| ID | Feature | Verified by |
|----|---------|-------------|
| F-TP-20 | Green 20 % teapot at the start (identity) | M-TP-02 |
| F-TP-21 | Solid teapot at Rprog (progress orientation) | e2e "teapots… use exactly R and Rprog" |
| F-TP-22 | Red 20 % teapot at the final orientation R | same |
| F-TP-23 | Red fixed frame x₀ y₀ z₀ (length 1, labels at 1.1) | M-TP-03 |
| F-TP-24 | Blue rotated frame x₁ y₁ z₁ (lines to R·0.9eᵢ, labels at R·eᵢ) | M-TP-03 |
| F-TP-25 | Purple axis of rotation, length 1.3, Thickness 0.01 | M-TP-05 |
| F-TP-26 | Axes with ticks, axis labels x₀ y₀ z₀, bounding box, PlotRange ±1.45, ViewPoint {1.3,−2.4,2}, ImageSize 375 | M-TP-01 |
| F-TP-27 | Mouse rotate / zoom of the 3D view | M-TP-08 |
| F-TP-28 | Teapot mesh = the original's `ExampleData` teapot (480 vertices, 432 quads), decoded from the notebook | M-TP-02 |

### Port additions
A-TP-01 "Initial settings" and "Reset view" buttons; A-TP-02 `window.__demo` hook.

## 2. Deviations (D) and preserved original quirks (Q)

| ID | Kind | Description |
|----|------|-------------|
| D-TP-01 | deviation | `findAxisAngle` clamps the ArcCos argument to [−1, 1]. Mathematica would give a tiny complex number which its own `Chop[…,10^-7]` removes; near the identity the original may show k = {0,0,0} where the port shows {1,0,0}. |
| D-TP-02 | deviation | `Sqrt[1 - R31²]` guarded against tiny negative arguments; `ArcTan[0,0]` is Indeterminate in Mathematica but 0 in JS (degenerate branch only). |
| D-TP-03 | deviation | Lighting, colours of the solid teapot and line widths approximate Mathematica's defaults; axis tick placement is simplified (fixed box edges). |
| D-TP-04 | deviation | Details text: the original writes R_ZYZ = R_z,φ R_y,θ R_z,φ (φ twice) and gives k with latitude/longitude swapped relative to its code; the port's text follows the code (noted on the page). |
| Q-TP-01 | quirk kept | `findRollPitchYaw` degenerate branch always returns β = +π/2 (−π/2 also possible). |
| Q-TP-02 | quirk kept | `findZYZEuler` degenerate branch always returns θ = 0 (θ = π also degenerate). |
| Q-TP-03 | quirk kept | `findAxisAngle` returns θ in [0, π] (comment says −π…π); k is numerically ill-conditioned at exactly θ = π (e.g. typed value 3.14159…). |
| Q-TP-04 | quirk kept | Converted values are rounded to 0.001 and written back into slider variables, so switching method and back can shift the rotation by up to ~0.001 rad. |
| Q-TP-05 | quirk kept | The teapot data is not centred at the origin (x −0.25…1.36, z 0.30…1.05), so it swings around the origin when rotated. |

## 3. Test plan
- Golden: 4 original snapshot states — all converted values must match (`tests/golden/parity.test.js`).
- Unit: `tests/unit/rotations.test.js`.
- Browser: `tests/e2e/three-parametrizations.spec.js` (incl. values displayed in the disabled fields).
- Manual: checklist section TP.
- Gaps: exact visual match (lighting, label placement) can only be judged by eye against the original.
