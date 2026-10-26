# Design document: Sensor Fusion with Normally Distributed Noise

| | |
|---|---|
| Code version: | 0.1.24 |
| Document revision | 2 (2026-10-25) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Sensor Fusion with Normally Distributed Noise", contributed by Aaron Becker, published 2015-06-04 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SensorFusionWithNormallyDistributedNoise/> Source as text: [`docs/original-source/sensor-fusion.txt`](../../docs/original-source/sensor-fusion.txt); snapshots `docs/original-snapshots/sensor-fusion-1…4.png`; saved states `tests/golden/sensor-fusion.original-states.json` |
| Port files | `model.js` (the Manipulate body: the scalar Kalman update and the plot as Graphics data; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.23): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

The Demonstration shows how up to four unbiased measurements of one scalar quantity, each with independent normally
distributed noise of its own variance σ²ᵢ, combine into one estimate (sensor fusion). Each measurement is drawn as its
normal density around the measured value zᵢ; the combined estimate is again a normal density (purple, dashed), found
with the scalar Kalman filter: K = σ̂²/(σ̂² + σ²ᵢ), x̂ ← x̂ + K (zᵢ − x̂), σ̂² ← (1 − K) σ̂². The estimate is
pulled towards the measurements with small variance and is narrower than every single measurement (inverse variances
add). The measured values are dragged along the axis; the variances are set with sliders.

## 2. Scope

In scope: the original's controls, picture and behaviour, opening at the notebook's initial settings. Out of scope:
anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-SF-01: a student moves a measurement and sees the estimate follow by an amount set by the variances.
- UC-SF-02: a student makes one sensor precise (small variance) and sees it dominate the estimate.
- UC-SF-03: a teacher shows that one measurement gives the measurement itself and that more measurements narrow the
  estimate.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SF-01 | Setter bar "number of measurements" `{{u, 2, "number of measurements"}, {1, 2, 3, 4}}`: the number of measurements used (curves, legend rows, stems, visible locators) | the original's control | v0.1.23 | e2e "the setter"; e2e "has the controls of the original" |
| F-SF-02 | Heading "measurement variances" and four sliders σ²₁…σ²₄ `{{σSqk, init, σ_k^2}, 0.1, 20, Appearance -> "Labeled"}` (continuous; defaults 5, 10, 10, 10); σ²₂, σ²₃, σ²₄ `Enabled -> u > 1`, `u > 2`, `u > 3` | the measurements' noise variances | v0.1.23 | e2e "has the controls of the original"; e2e "a variance slider step by keyboard"; M-SF-03 |
| F-SF-03 | Four locators z1…z4 `{{zk, {x0, 0}}, {-rg, 0}, {rg, 0}, Locator}` (defaults 2, 4, 6, 8), restricted to the x axis in [−10, 10] | the measured values | v0.1.23 | e2e "dragging a measurement locator with the mouse"; M-SF-07 |
| F-SF-04 | Locator appearance `Style["⊙", MyColors[[k]], 24]`, and `Style[""]` (nothing drawn) for a measurement k > u | each measurement's marker in its colour | v0.1.23 | M-SF-07; e2e "loads without errors" |
| F-SF-05 | The fusion: `zEst = z1, σEst = σSq1`, then for n = 2 … u: `k = σEst/(σSq[[n]] + σEst); zEst += k (z[[n]] − zEst); σEst = (1 − k) σEst` | the scalar Kalman filter of the original | v0.1.23 | unit "the Kalman update by hand"; unit "the recursion equals the closed form"; unit "one measurement" |
| F-SF-06 | The curves: `Plot[{PDF[NormalDistribution[z[[n]], Sqrt[σSq[[n]]]], x] (n = 1…u), PDF[NormalDistribution[zEst, Sqrt[σEst]], x]}, {x, -rg, rg}, Filling -> 0]`, styles MyColors[[n]] and {Dashed, Purple} | the measurement densities and the combined estimate | v0.1.23 | unit "the picture"; unit "the estimate density peaks"; M-SF-02 |
| F-SF-07 | Stems: `ListPlot[{{z[[n]], 1/(Sqrt[2 π] Sqrt[σSq[[n]]])}}, Filling -> 0]` in MyColors — a point at each measurement's peak with a line down to 0 | marks each measurement's peak | v0.1.23 | unit "the picture" |
| F-SF-08 | Plot options: `PlotRange -> {All, {0, 1}}`, `Frame -> {True, True, False, False}`, `FrameLabel -> {"measurement value(s)\nDrag locators to change measurements", "probability"}`, `AxesOrigin -> {-rg, 0}`; legend outside right "measurement 1"…"measurement u", "combined estimate" (two lines) | the original's picture | v0.1.23 | e2e "loads without errors"; unit "the picture"; e2e "review screenshots at the four snapshot settings"; M-SF-02 |
| F-SF-09 | Hidden variables `{rg, 10, None}` and `{MyColors, {four RGBColor}, None}` (ColorData[97]'s first four colours) | the original's constants as Manipulate variables | v0.1.23 | unit "the opening state" |
| F-SF-10 | Opening state: the notebook's initial settings (u = 2, σ² = 5, 10, 10, 10, z = 2, 4, 6, 8) | the published state | v0.1.23 | unit "the opening state"; e2e "has the controls of the original"; M-SF-02 |
| F-SF-11 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.23 | M-SF-01 |
| A-SF-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.23 | e2e "Initial settings restores the opening state" |
| A-SF-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient) from the Manipulate layer | automated tests | v0.1.23 | e2e "a variance slider step by keyboard" |
| A-SF-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.22 | e2e "start-up notice when" |
| A-SF-04 | Breadcrumb link to all demos | navigation | v0.1.22 | inventory |
| A-SF-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.22 | e2e "attribution on" |
| A-SF-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.22 | e2e "bundle: sensor-fusion runs from its own folder" |
| A-SF-07 | Arrow keys move a focused locator (port addition of the Manipulate layer) | keyboard access | v0.1.23 | M-SF-05 |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-u-*` | F-SF-01 |
| `slider-σSq*` | F-SF-02 |
| `value-σSq*` | F-SF-02 |
| `plus-σSq*` | F-SF-02 |
| `play-σSq*` | F-SF-02 |
| `stepback-σSq*` | F-SF-02 |
| `stepfwd-σSq*` | F-SF-02 |
| `locator-z*` | F-SF-03, F-SF-04, A-SF-07 |
| `reset` | A-SF-01 |
| `crumbs` | A-SF-04 |
| `details` | F-SF-11 |
| `credits` | A-SF-05 |

## 6. Design

- `model.js`: `initialState()` (the notebook's initial settings, the colours as RGB triples), `fuse(z, σSq, u)` (the
  For loop) and `evaluate(state)` → `{ view, graphics }`: `Show[Plot[…], ListPlot[…]]` with `shared/plot.js` and
  `PDF` / `NormalDistribution` of `shared/wl.js`. `view` reports zEst, σEst, the gains, the peaks and the estimate's
  peak for the tests.
- `main.js`: one `Manipulate({…})` — the original's control specs; rg and MyColors hidden; the locator appearance a
  function of the state (`s.u >= k`), drawn as `Text[Style["⊙", colour, 24], {0, 0}]`.
- Picture size: `ImageSize -> 545` including the legend (D-SF-01).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- sensor-fusion` → `dist/sensor-fusion/`.
- Contents (generated with `node tools/bundle-app.mjs sensor-fusion --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/sensor-fusion/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 16 | `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/sensor-fusion/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: sensor-fusion runs from its own folder" (A-SF-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-SF-01: (resolved in v0.1.23 before release) the plot is 360 px wide as Mathematica's default and the legend is
  added beside it; the legend swatches are plain lines, as in the snapshots.
- D-SF-03: the slider labels are σ with subscript k, then superscript 2 (HTML `sub`/`sup`); the original's
  `SubsuperscriptBox` stacks the 2 above the k.
- D-SF-04: the legend's second line "estimate" is indented with six no-break spaces (the original's string has six
  ordinary spaces, which SVG would collapse).
- D-SF-05: (resolved) the controls stand above the picture (`ControlPlacement: 'Top'`), as Mathematica's default.
- Q-SF-01: the locators of unused measurements (k > u) are invisible (`Style[""]`) but still on the axis and still
  draggable, as in the original; moving one changes nothing until u includes it.
- Q-SF-02: `PlotRange -> {All, {0, 1}}` clips a density higher than 1 (any variance below 1/(2π) ≈ 0.159, or a
  combined estimate that narrow), as in the original.
- Q-SF-03: the stems' points sit exactly at the peaks of the measurement curves; the estimate has no stem.
- K-SF-01: the ⊙ glyph and the legend text use the browser's font: their sizes differ slightly from the snapshots.
- N-SF-01: the combined estimates at the four snapshot settings equal the closed form σ̂² = 1/Σ(1/σᵢ²),
  x̂ = σ̂² Σ zᵢ/σᵢ², and their peaks (0.219, 0.520, 0.268, 0.718) match the snapshot pictures (unit "snapshot").

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.22 | 2026-10-25 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.23 | 2026-10-25 | the port: the original's controls, Kalman update and plot in simple mode; opening state from the notebook |
| 3 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SF-01 | Show the numbers x̂ and σ̂² (and the gains K) under the picture | the Kalman equations of the Details become concrete | differs from the original | F-SF-05 |
| I-SF-02 | A harness run in Mathematica at the snapshot settings (zEst, σEst) | the port checked against the original's own numbers | operator time | F-SF-05 |
| I-SF-03 | A stacked σ subsuperscript label (a shared `Subsuperscript`) | labels exactly as in the original | a shared text form | D-SF-03 |
| I-SF-04 | A `shared/plot.js` rule for line-only legend swatches (as Mathematica's) | no app-side workaround | shared change | D-SF-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the Kalman update, the densities (`NormalDistribution[μ, σ]` with σ = √σ²) and
the peak height 1/(√(2π) σ) are correct.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SF-01 | text | Details, recursive equations | K_i and x̂_{i+1} use σ²₂ and z₂ where measurement i (σ²ᵢ, zᵢ) is meant; the code uses σSq[[n]] and z[[n]] correctly | shows the original text unchanged | text only | kept |
