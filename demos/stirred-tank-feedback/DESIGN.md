# Design document: Feedback Control in a Stirred-Tank Reactor

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Feedback Control in a Stirred-Tank Reactor", contributed by R. Ricardo Sánchez, published 2021-05-24 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/FeedbackControlInAStirredTankReactor/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A stirred tank of water with a PI-controlled heater: the Demonstration solves the tank, heater, sensor and
integral equations over 200 hours, with a step disturbance of the inlet temperature at 120 h, and plots the temperatures
and the controller's heat input (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/stirred-tank-feedback.txt`) and checked against its snapshots (`docs/original-snapshots/stirred-tank-feedback-*.png`) and saved
settings (`tests/golden/stirred-tank-feedback.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-ST-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-ST-02: the owner compares the port with the original (checklist `docs/checklists/stirred-tank-feedback.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-ST-01 | Sliders (each under its label, ControlPlacement Left, Labeled): proportional constant K_p 0 … 20, integral constant τ_I 1 … 20, heat input Q₀ 0 … 500, inlet temperature 5 … 30, disturbance at 120 h 30 … 60, water flow 1 … 45 | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-ST-03 |
| F-ST-02 | NDSolve of T_R′ = F/V_r (T₀(t) − T_R) + Q/(V_r ρ_c c_pc), Q′ = (Q_c − Q)/τ_Q, T_sens′ = (T_R − T_sens)/τ_sens, Int′ = ε with ε = T_set − T_R, Q_c = Max[0, Q₀ + K_p ε + (K_p/τ_I) Int]; T₀ = inlet temperature before 120 h, the disturbance after | the original's model | v0.1.37 | unit "NDSolve agrees with an independent RK4"; unit "the disturbance at 120 h" |
| F-ST-03 | Temperature plot: T_r red, T_sens blue, T₀ black, T_set green, PlotRange {10, 110}, PlotTheme "Detailed" (frame, dotted grid), legend | the original's picture | v0.1.37 | e2e "the snapshot settings"; M-ST-05 |
| F-ST-04 | Heat-input plot: Q_c in magenta, PlotRange {−10, 1100}, legend | the original's picture | v0.1.37 | unit "snapshot 4" |
| F-ST-05 | Opening state: K_p 10, τ_I 4, Q₀ 100, inlet 20, disturbance 40, flow 3 | the saved settings | v0.1.37 | unit "the opening state"; M-ST-02 |
| F-ST-06 | Caption, nomenclature and reference | the original's explanation | v0.1.37 | M-ST-01 |
| F-ST-07 | K_p = 0 disconnects the controller (Details): Q_c = Q₀ | the original's use | v0.1.37 | unit "snapshot 4" |
| F-ST-08 | The two plots in one column (Multicolumn[…, 1]), ImageSize 1.125 {300, 200}, tick labels size 10, labels 14 | the original's layout | v0.1.37 | e2e "the snapshot settings" |
| F-ST-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings"; unit "snapshot 1" |
| A-ST-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-ST-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-ST-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-ST-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-ST-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-ST-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: stirred-tank-feedback runs from its own folder" |
| A-ST-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-ST-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-ST-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-ST)"; e2e "errata switch on stirred-tank-feedback: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-Kp` | F-ST-01 |
| `*-τI` | F-ST-01 |
| `*-Q0` | F-ST-01 |
| `*-inletT` | F-ST-01 |
| `*-pertur` | F-ST-01 |
| `*-Flu` | F-ST-01 |
| `reset` | A-ST-01 |
| `crumbs` | A-ST-04 |
| `details` | F-ST-06 |
| `credits` | A-ST-05 |
| `setter-errata-*` | A-ST-08 |
| `errata-details` | A-ST-08 |

## 6. Design

- `model.js` (pure): `solve(state, corrected)` with `NDSolve` of `shared/ode.js` and a breakpoint at t = 120 h (the
  jump of T₀: no step straddles it); `evaluate(state)` → two Plots with `PlotTheme: 'Detailed'` (new in v0.1.37) and
  `PlotLegends`.
- `main.js`: the original's headings and sliders, two pictures in a column.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- stirred-tank-feedback` → `dist/stirred-tank-feedback/`.
- Contents (generated with `node tools/bundle-app.mjs stirred-tank-feedback --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/stirred-tank-feedback/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `ode.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/stirred-tank-feedback/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: stirred-tank-feedback runs from its own folder" (A-ST-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-ST-01 | deviation | PlotTheme "Detailed" approximated: frame, dotted grey grid lines at the major ticks, the legend beside the plot; Mathematica's theme also changes fonts and tick styles slightly. |
| D-ST-02 | deviation | FrameTicksStyle -> 10 is supported (new in v0.1.37); the frame labels use LabelStyle 14 as in the original. |
| N-ST-01 | note | ρ_c = c_pc = 1: the units of the model are not physical (E-ST-02); the dynamics are what the Demonstration shows. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-ST-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-ST-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-ST-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): PI control by NDSolve with the disturbance as a breakpoint, PlotTheme "Detailed"; switch for E-ST-01 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-ST-01 | A derivative term (PID) | damps the overshoot | not in the original | F-ST-02 |
| I-ST-02 | Choose the disturbance time | explore | not in the original | F-ST-02 |
| I-ST-03 | Mathematica reference values | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-ST-01 | conceptual | εrr = Tset − TR[t] in Qc and Int′ | the controller acts on the true tank temperature T_r, not on the sensor's T_sens, so the sensor and its 2 h lag (drawn as T_sens) have no effect on the control | kept **Switch:** with "errors of the original: corrected" (A-ST-08, v0.1.37) — the controller acts on Tset − Tsens, the measured temperature (the error and its integral both); the sensor lag now enters the loop, and the oscillations after the start and the disturbance grow. | the controller uses T_set − T_sens; the sensor lag enters the loop and the oscillations grow (T_r at 50 h: 78.57 → 59.91) | switchable since v0.1.37 |
| E-ST-02 | conceptual | ρc = 1, Cpc = 1, Vr = 100 with heat in kJ/h and flows in m³/h | water has ρ c_p ≈ 4186 kJ/(m³ °C); with these values the heat input of a few hundred kJ/h heats 100 m³ by tens of degrees. The units are those of a teaching model, not of water | kept | a physical correction would change the whole picture; not offered | kept |
