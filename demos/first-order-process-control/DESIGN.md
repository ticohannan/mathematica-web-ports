# Design document: First-Order Transfer Functions in Process Control

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "First-Order Transfer Functions in Process Control", contributed by Simon M. Lane, published 2014-05-06 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/FirstOrderTransferFunctionsInProcessControl/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

The response of a first-order process (gain K = 1, time constant τ) to a step, a ramp or a sinusoid of size a,
in closed form, with the quantities process-control courses read off each response: the time constant at 63.2 % of the
change, the lag of the ramp response, and the amplitude ratio and phase shift of the sinusoidal one (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/first-order-process-control.txt`) and checked against its snapshots (`docs/original-snapshots/first-order-process-control-*.png`) and saved
settings (`tests/golden/first-order-process-control.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-FO-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-FO-02: the owner compares the port with the original (checklist `docs/checklists/first-order-process-control.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-FO-01 | Setter bar "choose input": step \| ramp \| sinusoidal (`W`) | the original's control | v0.1.37 | e2e "has its controls with their defaults"; M-FO-03 |
| F-FO-02 | Sliders time constant τ 1 … 10 (step 1), input step size a 1 … 5 (0.5), angular frequency ω 0.5 … 5 (0.5) enabled only for the sinusoidal input (Labeled) | the original's controls | v0.1.37 | e2e "a control changes the picture"; e2e "ω is enabled only for the sinusoidal input" |
| F-FO-03 | Step: a(1 − e^(−t/τ)) on 0 … 25 with the 0.632 ΔSS and ΔSS markers, the inset input plot and the table "gain K = 1." / "time constant τ = …" | the original's plot4 | v0.1.37 | unit "the numbers of the four snapshots"; M-FO-05 |
| F-FO-04 | Ramp: a τ (e^(−t/τ) − 1) + a t and the input a t on 0 … 10, the marker at t = 10/a and the table "time constant τ = 10 − y(10/a) min" | the original's plot5 | v0.1.37 | unit "the numbers of the four snapshots" |
| F-FO-05 | Sinusoid: the closed-form response and a sin(ωt), the markers A (at t = 1.5/ω), B (the first maximum found by FindMaximum from t = 0.05) and ϕ, and the table of B, B/A and −ϕ | the original's plot6 | v0.1.37 | unit "the numbers of the four snapshots"; unit "FindMaximum finds the first maximum" |
| F-FO-06 | Opening state = the notebook's saved state (sinusoidal, τ 5, a 3, ω 1); Initial settings = the controls' values (step) | the saved settings | v0.1.37 | unit "the opening state"; e2e "Initial settings restores the opening state"; M-FO-02 |
| F-FO-07 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-FO-01 |
| F-FO-08 | The three formula labels above the plots (TraditionalForm in the original) | the original's labels | v0.1.37 | M-FO-05 |
| F-FO-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-FO-01 | "Initial settings" button restores the opening state (the step input, the controls' own initial values; the page opens with the notebook's saved state, the sinusoidal input) | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-FO-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-FO-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-FO-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-FO-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-FO-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: first-order-process-control runs from its own folder" |
| A-FO-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-FO-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-FO-01, E-FO-02, E-FO-03 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-FO)"; e2e "errata switch on first-order-process-control: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-W-*` | F-FO-01 |
| `*-T` | F-FO-02 |
| `*-α` | F-FO-02 |
| `*-w` | F-FO-02 |
| `reset` | A-FO-01 |
| `crumbs` | A-FO-04 |
| `details` | F-FO-07 |
| `credits` | A-FO-05 |
| `setter-errata-*` | A-FO-08 |
| `errata-details` | A-FO-08 |

## 6. Design

- `model.js` (pure): the three closed forms (`stepResponse`, `rampResponse`, `sineResponse`), `quantities(state)` (the
  Module's numbers, FindMaximum of `shared/numeric.js` for the first maximum), `evaluate(state)` → one Plot with the
  Epilog of lines, labels with a white background (`Style(…, { Background: White })`, new in v0.1.37) and the tables as
  `Grid` texts (new in v0.1.37: Frame -> {False, All}, Alignment).
- `main.js`: ControlPlacement Top; `initialSettings` gives the step input (the controls' own values).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- first-order-process-control` → `dist/first-order-process-control/`.
- Contents (generated with `node tools/bundle-app.mjs first-order-process-control --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/first-order-process-control/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 20 | `clock.js`, `complex.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `numeric.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/first-order-process-control/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: first-order-process-control runs from its own folder" (A-FO-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-FO-01 | deviation | Formula labels: three of the four snapshots show them with context marks ("K Global`a", "Global`e^…"), snapshot 1 without; the port draws them clean (owner's default, Q-3 of the plan). The sinusoidal one is written on one line instead of with built-up fractions. |
| D-FO-02 | deviation | The tables are drawn by the port's Grid; the column alignment on "=" and "." is approximated by right alignment. |
| D-FO-03 | deviation | FindMaximum[{…, 0.05 <= t <= 10}, {t, 0.05}]: Mathematica's constrained search reached the SECOND maximum in snapshot 4 (ω = 3.5: B = 0.27 at t = 2.67); the port climbs to the first (0.31 at t = 0.87). At the opening settings both give the first (0.91). Which maximum Mathematica finds for other settings is to be checked (M-FO-06). |
| Q-FO-01 | quirk kept | The input's peak marker A is drawn at t = 1.5/ω, not at the true peak π/(2ω) (1.571/ω). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-FO-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-FO-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-FO-01, E-FO-02, E-FO-03 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): the three responses in closed form with their markers and Grid tables; switch for E-FO-01 … E-FO-03 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-FO-01 | Mark the steady amplitude and lag in the sinusoidal plot | shows what the table should give | not in the original | E-FO-03 |
| I-FO-02 | A choice of gain K | the caption's K | not in the original | F-FO-03 |
| I-FO-03 | Mathematica reference values for FindMaximum (`tools/wolfram/export-control-reference.wls`) | resolves D-FO-03 | owner's Mathematica | D-FO-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-FO-01 | mathematical | PTV1, "phase shift ϕ = NumberForm[−Φ, 2] min" | the phase −Φ = arctan(ωτ) is an angle in radians, labelled as minutes; the time lag would be −Φ/ω | kept: "1.4 min" at the opening settings **Switch:** with "errors of the original: corrected" (A-FO-08, v0.1.37) — the phase shift is shown in rad, and a row "time lag ϕ/ω" gives the lag in minutes. | the row reads 1.4 rad and a row "time lag" 1.4 min (ω = 1) | switchable since v0.1.37 |
| E-FO-02 | mathematical | PTV2, τramp = 10 − yline | the ramp table's "time constant τ" is the vertical gap between input and response at t = 10/a, still in the transient (7.3 at τ = 5, a = 3), neither τ nor the steady gap a τ | kept **Switch:** with "errors of the original: corrected" (A-FO-08, v0.1.37) — the table shows τ (the time by which the response lags the ramp once the transient has died away), and the τ marker is the horizontal lag at the response's value at t = 10. | the table shows τ and the marker is the horizontal lag | switchable since v0.1.37 |
| E-FO-03 | mathematical | time2 = FindMaximum[…] in PTV1 | "amplitude output B" is the first maximum of the response, which includes the decaying transient, so B and B/A are not the steady values a/√(ω²τ² + 1) and 1/√(ω²τ² + 1) | kept: 0.91 and 0.3 **Switch:** with "errors of the original: corrected" (A-FO-08, v0.1.37) — B = K a/√(ω²τ² + 1), the amplitude of the steady sinusoid (0.59), and the ratio B/A = 1/√(ω²τ² + 1) (0.2). The markers in the plot stay at the first maximum. | B = 0.59 and B/A = 0.2 at the opening settings | switchable since v0.1.37 |
| E-FO-04 | text | Caption | the s-domain is called the "spatial domain" and the Details say "s = space domain" | kept | none | kept |
| E-FO-05 | text | Details | "ϕ = −tan⁻¹(ω t)" should be −tan⁻¹(ωτ); "time shift = −360/ϕ p" is garbled; "amplitude ratio = A/B" is the inverse of the plot's B/A; "τ = 0.632 ΔSS time constant" mixes a time and a response | kept | none | kept |
