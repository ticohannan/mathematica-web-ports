# Design document: Proportional Temperature Control

| | |
|---|---|
| Code version: | 0.1.38 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Proportional Temperature Control", contributed by Jeff Bryant and Housam Binous, published 2007-09-28 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProportionalTemperatureControl/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

Water flows through a heated tank; a proportional controller sets the heater from a lagging temperature
sensor. The Demonstration solves the three differential equations (tank, heater, sensor) and plots the sensor and tank
temperatures over 150 hours (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/proportional-temperature-control.txt`) and checked against its snapshots (`docs/original-snapshots/proportional-temperature-control-*.png`) and saved
settings (`tests/golden/proportional-temperature-control.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-PT-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-PT-02: the owner compares the port with the original (checklist `docs/checklists/proportional-temperature-control.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PT-01 | Plain sliders (no value fields) tank volume 10 … 100, water flow 1 … 20, heat input 1000 … 3000, outlet temperature 20 … 150, initial tank temperature 20 … 100 (step 1); ContinuousAction -> False: the plot is computed when a slider is released | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-PT-03 |
| F-PT-02 | NDSolve of V ρ c_p T_R′ = F ρ c_p (T₀ − T_R) + Q, Q′ = (Q_C − Q)/τ_Q, T_sens′ = (T_R − T_sens)/τ_sens with Q_C = Max[0, Q₀ + K_p (T_R,set − T_sens)], ρ = 1, c_p = 4.19, K_p = 300, τ_sens = 2, τ_Q = 1; T_R(0) = T_sens(0) = T₀, Q(0) = 2500 | the original's model | v0.1.37 | unit "the steady state" |
| F-PT-03 | Plot of T_sens and T_R (default colours) on 0 … 150, Frame on the bottom and left, PlotRange -> All with AxesOrigin {0, 0} (the range reaches 0) | the original's picture | v0.1.37 | unit "snapshot 1"; e2e "the snapshot settings" |
| F-PT-04 | PlotLabel: the five settings on two lines separated by grey bars | the original's label | v0.1.37 | unit "corrected mode (E-PT)" |
| F-PT-05 | Opening state: V 100, F 10, Q₀ 2500, T_R,set 80, T₀ 20 | the saved settings | v0.1.37 | unit "the opening state"; M-PT-02 |
| F-PT-06 | Caption and the placeholder References | the original's explanation | v0.1.37 | M-PT-01 |
| F-PT-07 | The heater's Max[0, …]: no cooling (the solver handles the kink) | the original's model | v0.1.37 | unit "the steady state" |
| F-PT-08 | Controls above the plot (no ControlPlacement) | the original's layout | v0.1.37 | inventory |
| F-PT-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-PT-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-PT-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-PT-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-PT-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-PT-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-PT-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: proportional-temperature-control runs from its own folder" |
| A-PT-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-PT-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-PT-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-PT)"; e2e "errata switch on proportional-temperature-control: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-V` | F-PT-01 |
| `*-F` | F-PT-01 |
| `*-Q0` | F-PT-01 |
| `*-TRset` | F-PT-01 |
| `*-T0` | F-PT-01 |
| `reset` | A-PT-01 |
| `crumbs` | A-PT-04 |
| `details` | F-PT-06 |
| `credits` | A-PT-05 |
| `setter-errata-*` | A-PT-08 |
| `errata-details` | A-PT-08 |

## 6. Design

- `model.js` (pure): `solve(state)` with `NDSolve` of `shared/ode.js` (new in v0.1.37: Dormand–Prince 5(4) with
  dense output); `evaluate(state)` → the Plot; the corrected mode changes only the label's units (E-PT-01).
- `main.js`: `ContinuousAction: false` for the whole Manipulate (new in v0.1.37: the body is evaluated when the mouse
  releases a slider; keys and typed values act at once).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- proportional-temperature-control` → `dist/proportional-temperature-control/`.
- Contents (generated with `node tools/bundle-app.mjs proportional-temperature-control --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/proportional-temperature-control/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `ode.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/proportional-temperature-control/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: proportional-temperature-control runs from its own folder" (A-PT-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-PT-01 | deviation | NDSolve: the port's solver keeps 10 digits (Mathematica's default about 8); the curves agree to well under a pixel. |
| N-PT-01 | note | The inlet water and the tank start at the same temperature T₀ (one slider for both, as in the original). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-PT-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-PT-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-PT-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): the three differential equations by NDSolve (shared ode.js), ContinuousAction -> False; switch for E-PT-01 |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-PT-01 | Show the heater power Q | explains the oscillation | not in the original | F-PT-02 |
| I-PT-02 | Let K_p vary | the controller's effect | not in the original | F-PT-02 |
| I-PT-03 | Mathematica reference values | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-PT-01 | conceptual | rho = 1 with cp = 4.19 and the label "volume = … m³", "water flow = … m³/h" | with c_p in kJ/(kg °C) a density of 1 means kilograms per litre: the volumes are litres, not cubic metres (in m³ the 2500 kJ/h heater would warm the water by hundredths of a degree) | kept: the label says m³ **Switch:** with "errors of the original: corrected" (A-PT-08, v0.1.37) — the label gives the volume in L and the flow in L/h, the units in which the model's numbers are right; the curves are unchanged. | the label says L and L/h; the curves are unchanged | switchable since v0.1.37 |
| E-PT-02 | text | Caption | the outlet temperature is said to be red; it is drawn orange (Mathematica's second default colour) — the snapshots show orange | kept | none | kept |
