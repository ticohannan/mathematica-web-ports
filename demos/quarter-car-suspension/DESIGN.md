# Design document: Simulating Vehicle Suspension with a Simplified Quarter-Car Model

| | |
|---|---|
| Code version: | 0.1.39 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Simulating Vehicle Suspension with a Simplified Quarter-Car Model", contributed by Erik Mahieu, published 2011-03-11 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SimulatingVehicleSuspensionWithASimplifiedQuarterCarModel/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A quarter car (a mass on a spring and a shock absorber) drives over a sinusoidal road. The Demonstration
computes the car's motion with TransferFunctionModel and OutputResponse, plots road and car over five seconds and
animates the suspension, with the damping ratio and a "resonant frequency" (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/quarter-car-suspension.txt`) and checked against its snapshots (`docs/original-snapshots/quarter-car-suspension-*.png`) and saved
settings (`tests/golden/quarter-car-suspension.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-QC-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-QC-02: the owner compares the port with the original (checklist `docs/checklists/quarter-car-suspension.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-QC-01 | Trigger "start / pause / reset" on the time 0 … 20 s (step 0.25, AnimationRate 1) and the text "elapsed time in sec = …" | the original's animation | v0.1.37 | e2e "the Trigger plays and resets"; M-QC-05 |
| F-QC-02 | Sliders damping coefficient c 0 … 1, spring constant k 0.01 … 0.25, mass m 0.25 … 1 (0.001), road bump height h 0 … 0.2, bump frequency fb 0.1 … 2 (0.01); headings in bold | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-QC-03 |
| F-QC-03 | output = Re[OutputResponse[(k + c s)/(k + c s + m s²), h Sin[2π fb t], t]] | the original's model | v0.1.37 | unit "the output solves m x″ + c x′ + k x" |
| F-QC-04 | Top plot: road (blue) and car (thick red) from the time to 5 s later, PlotRange ±0.2, grey background, AspectRatio 0.2 | the original's picture | v0.1.37 | e2e "the snapshot settings" |
| F-QC-05 | The suspension at the time: car body (black mass m), the damper, the red translucent coil (6 turns), the wheel, the road (brown, green line), arrows x(t), y(t) and their axis ticks | the original's picture | v0.1.37 | unit "the coil"; M-QC-05 |
| F-QC-06 | Labels "damping ratio ζ = …", "resonant frequency = …" (NumberForm {3, 2}) | the original's labels | v0.1.37 | unit "the labels of the four snapshots" |
| F-QC-07 | Opening state: time 0, c 0.85, k 0.165, m 1, h 0.1, fb 1 | the saved settings | v0.1.37 | unit "the opening state"; M-QC-02 |
| F-QC-08 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-QC-01 |
| F-QC-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-QC-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-QC-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-QC-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-QC-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-QC-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-QC-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: quarter-car-suspension runs from its own folder" |
| A-QC-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-QC-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-QC-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-QC)"; e2e "errata switch on quarter-car-suspension: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `trigger-*-time` | F-QC-01 |
| `*-c` | F-QC-02 |
| `*-k` | F-QC-02 |
| `*-m` | F-QC-02 |
| `*-h` | F-QC-02 |
| `*-fb` | F-QC-02 |
| `reset` | A-QC-01 |
| `crumbs` | A-QC-04 |
| `details` | F-QC-08 |
| `credits` | A-QC-05 |
| `setter-errata-*` | A-QC-08 |
| `errata-details` | A-QC-08 |

## 6. Design

- `model.js` (pure): `outputOf(state)` with `OutputResponse` of `shared/control.js` (the sine input as a Signal: exact),
  `resonantOriginal`, `resonantCorrected` (E-QC-01), `spring(top, bottom, th)` (the coil), `evaluate(state)` → two
  pictures.
- `main.js`: the Trigger (new in v0.1.37: play/pause and reset buttons, AnimationRate in units per second of the page
  clock); the "elapsed time" heading is updated after each evaluation.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- quarter-car-suspension` → `dist/quarter-car-suspension/`.
- Contents (generated with `node tools/bundle-app.mjs quarter-car-suspension --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/quarter-car-suspension/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `complex.js`, `control.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `ode.js`, `plot.js`, `poly.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/quarter-car-suspension/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: quarter-car-suspension runs from its own folder" (A-QC-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-QC-01 | deviation | The Trigger is drawn as two buttons (play/pause, reset); Mathematica's has three (play, pause, reset). |
| D-QC-02 | deviation | The coil's line width: Thickness[0.25 k] inside the coil's own Plot is drawn about 170·th px wide in the snapshots (7 px at k = 0.165); the port uses that measured width. |
| N-QC-01 | note | The road picture moves with 2π fb but its spatial frequency (2 per unit) is fixed, as in the original. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-QC-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-QC-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-QC-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): OutputResponse to the sine input (shared control.js), the Trigger animation, the suspension picture; switch for E-QC-01 |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture; the browser test "the Trigger plays and resets" now waits for the animation's first frame before it moves the page clock (it failed in the owner's run when the first frame came late) |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-QC-01 | A frequency-response plot of the transmissibility | shows the resonance | not in the original | E-QC-01 |
| I-QC-02 | Units on the labels | clarity | not in the original | F-QC-06 |
| I-QC-03 | Mathematica reference values | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-QC-01 | mathematical | Omegap = Re[Sqrt[1 − c²/(2 k m)] Sqrt[k/m]] | ω_n√(1 − 2ζ²) is the resonance of a mass–spring–damper driven by a force; this model is driven through the spring and damper, (k + cs)/(k + cs + ms²), whose \|G(iω)\| peaks at ω_n√((√(1 + 8ζ²) − 1)/(4ζ²)); the formula also gives 0 for every ζ ≥ 0.71 though the model has a peak | kept: 0.00 at the opening settings **Switch:** with "errors of the original: corrected" (A-QC-08, v0.1.37) — the resonant frequency is the frequency of the peak of ∣(k + c iω)/(k + c iω − m ω²)∣, ωn√((√(1 + 8ζ²) − 1)/(4ζ²)) (0.28 at the opening settings). | the peak frequency of the model (0.28 at the opening settings; 0.34 → 0.38 in snapshot 4) | switchable since v0.1.37 |
| E-QC-02 | text | Details | "Snapshot 2: the damping ratio is 1" — snapshot 2 shows ζ = 2.00 (c = 1, k = 0.25, m = 0.25) | kept | none | kept |
| E-QC-03 | text | Caption | the differential equation is garbled ("c t x′ − c t y′ + …") and "affect" stands for "effect" | kept | none | kept |
