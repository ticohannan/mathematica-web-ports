# Design document: Simulation of Feedback Control System with Controller and Second-Order Plant

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Simulation of Feedback Control System with Controller and Second-Order Plant", contributed by Nasser M. Abbasi, published 2012-05-31 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SimulationOfFeedbackControlSystemWithControllerAndSecondOrde/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A second-order plant (a mass–spring–damper) under P, PI, PD or PID control in a unity-feedback loop. The
Demonstration animates the plant and the closed loop as two mass–spring–damper pictures, shows the transfer functions,
the step responses, the open loop's Bode plots with its gain and phase margins and its Nyquist plot, and the closed-loop
poles in the s-plane (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/feedback-control-simulation.txt`) and checked against its snapshots (`docs/original-snapshots/feedback-control-simulation-*.png`) and saved
settings (`tests/golden/feedback-control-simulation.original-states.json`; the saved dashboard pictures `finalPlot` and
`lowerGrid`, 27 MB, are left out of it — the tests use the saved Bode, Nyquist and step-response plots). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-FC-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-FC-02: the owner compares the port with the original (checklist `docs/checklists/feedback-control-simulation.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-FC-01 | Buttons run (animate from t = 0) and stop (back to 0), the running time | the original's animation | v0.1.37 | e2e "run animates the masses and stop resets the time"; M-FC-05 |
| F-FC-02 | Sliders time 1 … 50 (1), slow … fast 0.1 … 3 (0.1), ζ 0.01 … 2, ω_n 0.1 … 2, DC gain 0.01 … 1.5; ContinuousAction -> False; each plant change stops the animation | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture" |
| F-FC-03 | Popup P \| PI \| PD \| PID, checkbox "show plant", sliders P 0.001 … 10, I 0 … 5 (enabled for PI, PID), D 0 … 5 (enabled for PD, PID) | the original's controls | v0.1.37 | e2e "the controller type enables I and D" |
| F-FC-04 | Plant ω_n² dc/(s² + 2ζω_n s + ω_n²), controller k_p + k_i/s + k_d s, closed loop L/(1 + L) (N@Simplify), step responses by OutputResponse | the original's classes | v0.1.37 | unit "the transfer functions of the snapshot table"; unit "the step responses agree with the original’s saved curves" |
| F-FC-05 | The two mass–spring–damper pictures (Árpád Kósa's spring, the padded displacement, stop guards at −0.2 and 1.5) | the original's makeMechanicalSystem | v0.1.37 | unit "the mechanical picture"; unit "run: the time advances" |
| F-FC-06 | The step-response plot (closed loop blue, plant black, set point red, "stable"/"unstable", legend) and the table of the two transfer functions | the original's getPlot | v0.1.37 | e2e "the snapshot settings"; M-FC-06 |
| F-FC-07 | Bode plots of the open loop with StabilityMargins and the tables of crossover and margin (the highest crossover) | the original's getBodePlot | v0.1.37 | unit "the Bode plot agrees with the original’s saved curves" |
| F-FC-08 | Nyquist plot of the open loop; the poles in the s-plane (⊗) and the list of closed-loop poles | the original's NyquistPlot and polesPlot | v0.1.37 | unit "the closed-loop poles as listed" |
| F-FC-09 | Opening state: PID 10, 3.730, 0.697; ζ 0.77, ω_n 1, DC gain 1; time 20, speed 0.2, plant shown; caption and Details | the saved settings | v0.1.37 | unit "the opening state"; M-FC-01; M-FC-02 |
| A-FC-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-FC-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-FC-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-FC-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-FC-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-FC-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: feedback-control-simulation runs from its own folder" |
| A-FC-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `button-run` | F-FC-01 |
| `button-stop` | F-FC-01 |
| `*-simulationTime` | F-FC-02 |
| `*-delta` | F-FC-02 |
| `*-zeta` | F-FC-02 |
| `*-wn` | F-FC-02 |
| `*-dcGain` | F-FC-02 |
| `popup-controllerType` | F-FC-03 |
| `check-showPlantResponse` | F-FC-03 |
| `*-propertional` | F-FC-03 |
| `*-integral` | F-FC-03 |
| `*-derivative` | F-FC-03 |
| `reset` | A-FC-01 |
| `crumbs` | A-FC-04 |
| `details` | F-FC-09 |
| `credits` | A-FC-05 |

## 6. Design

- `model.js` (pure): `plantTF`, `controllerTF`, `openLoopTF`, `closedLoopTF` (the classes of the Initialization as
  functions of the state), `stepResponse` (OutputResponse), `sortedPoles`/`poleText`, `rugo`, `paddedY`,
  `mechanicalSystem(y)`; `evaluate(state)` → the eight pictures and the advanced time (doSimulation: currentTime +
  delta per evaluation).
- `main.js`: the control panel as the original lays it out; `settle` re-evaluates on the next frame while the
  animation runs (the original's `tick` and SynchronousUpdating -> False); `after` writes the running time and the
  list of poles.
- Shared code: `shared/control.js` (margins by the polynomial method of python-control), `shared/control-plots.js`
  (BodePlot with StabilityMargins, NyquistPlot), `shared/graphics.js` Grid and Framed, `shared/number-form.js`.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- feedback-control-simulation` → `dist/feedback-control-simulation/`.
- Contents (generated with `node tools/bundle-app.mjs feedback-control-simulation --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/feedback-control-simulation/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `complex.js`, `control-plots.js`, `control.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `ode.js`, `plot.js`, `poly.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/feedback-control-simulation/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: feedback-control-simulation runs from its own folder" (A-FC-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-FC-01 | deviation | The dashboard is laid out by the page (CSS grid) after the original's Grid; the pictures are drawn as vector graphics, not rasterised (Rasterize in the original). |
| D-FC-02 | deviation | The slider values are shown in the sliders' own fields, not with padIt2's padded AccountingForm beside them. |
| D-FC-03 | deviation | The Bode frequency range is computed as 10^(⌊log₁₀ ω_min⌋ − 2) … 20 ω_max of the open loop's corner frequencies, which gives Mathematica's automatic range at the opening settings (0.001 … 279.28 rad/s); other settings are unverified. |
| D-FC-04 | deviation | The Nyquist plot is drawn on ±1.2 with the closing arc at infinity at radius 1 (as the snapshots show the region near −1); Mathematica's scaling and arrows differ in detail. |
| D-FC-05 | deviation | The animation advances by delta per frame of the browser (about 30 per second here), the original per front-end update; the speed differs. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): the whole dashboard: transfer functions, step responses, Bode plots with margins, Nyquist plot, poles, animation (shared control.js, control-plots.js); no correctable error found (no switch) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-FC-01 | Tooltips with the values under the mouse in the Bode plots | reading values | not in the original | F-FC-07 |
| I-FC-02 | The disturbance response | more of control | not in the original | F-FC-04 |
| I-FC-03 | Mathematica reference values for other settings (`tools/wolfram/export-control-reference.wls`) | pins D-FC-03, D-FC-04 | owner's Mathematica | D-FC-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| — | none found | — | — | — | — | — |
