# Design document: Integral Error Criteria for Controller Tuning

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Integral Error Criteria for Controller Tuning", contributed by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi, published 2015-12-30 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/IntegralErrorCriteriaForControllerTuning/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A PI-controlled loop (Seborg et al., Fig. 10.8) responds to a set-point step; the Demonstration plots the
response with the area of the error and gives the three integral error criteria IAE, ISE and ITAE (integrated to t =
5000), and plots tables of each criterion against the gain with its optimum (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/integral-error-criteria.txt`) and checked against its snapshots (`docs/original-snapshots/integral-error-criteria-*.png`) and saved
settings (`tests/golden/integral-error-criteria.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-IE-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-IE-02: the owner compares the port with the original (checklist `docs/checklists/integral-error-criteria.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-IE-01 | Setter response \| tuning (`ctrl2`), controller gain K_c 1 … 7.6 (0.05, Labeled) enabled only for the response, radio buttons IAE \| ISE \| ITAE (`ctrl`); ControlPlacement Top | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-IE-03 |
| F-IE-02 | b[q] = InverseLaplaceTransform[(1/s) q (1 + s)/(q + 5s(1 + 3s + 2s²)), s, t]: the closed-loop step response | the original's model | v0.1.37 | unit "b is the closed-loop step response" |
| F-IE-03 | The response plot: the set point 1 (dashed dark red) and b (dark green) on 0 … 50, the area between them filled grey, GridLines, AspectRatio 1 | the original's picture | v0.1.37 | e2e "the snapshot settings"; M-IE-05 |
| F-IE-04 | PlotLabel: IAE, ISE (NumberForm {4, 3}) and ITAE ({6, 3}) of NIntegrate[…, {t, 0, 5000}] | the original's criteria | v0.1.37 | unit "the integrals at the snapshot gains"; unit "at the marginal gain 7.5" |
| F-IE-05 | The tuning plots: ListPlot of the authors' eight values per criterion (dark red points) and the optimum (blue point), its value and gain in the label | the original's tuning | v0.1.37 | unit "the tuning plots draw the authors’ tables"; e2e "the tuning plots" |
| F-IE-06 | Opening state: response, K_c 1.25, IAE | the saved settings | v0.1.37 | unit "the opening state"; M-IE-02 |
| F-IE-07 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-IE-01 |
| F-IE-08 | K_c = 7.5 makes the loop marginally stable: sustained oscillation, criteria in the thousands (snapshot 6) | the original's range | v0.1.37 | unit "at the marginal gain 7.5" |
| F-IE-09 | Six snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-IE-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-IE-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-IE-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-IE-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-IE-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-IE-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: integral-error-criteria runs from its own folder" |
| A-IE-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-IE-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-IE-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-IE)"; e2e "errata switch on integral-error-criteria: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-ctrl2-*` | F-IE-01 |
| `*-Kc` | F-IE-01 |
| `radio-ctrl-*` | F-IE-01 |
| `reset` | A-IE-01 |
| `crumbs` | A-IE-04 |
| `details` | F-IE-07 |
| `credits` | A-IE-05 |
| `setter-errata-*` | A-IE-08 |
| `errata-details` | A-IE-08 |

## 6. Design

- `model.js` (pure): `b(q)` with `InverseLaplaceTransform` of `shared/control.js` (Heaviside's expansion for simple
  poles: fast enough to integrate thousands of times), `criteria(q)` with `NIntegrate` of `shared/numeric.js` (adaptive
  Gauss–Kronrod, memoised by gain), the authors' tables and optima, `recomputedTables()` for the corrected mode
  (E-IE-01); `evaluate(state)` → the response or a tuning plot.
- `main.js`: ControlPlacement Top; RadioButton (new in v0.1.37) for the criterion.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- integral-error-criteria` → `dist/integral-error-criteria/`.
- Contents (generated with `node tools/bundle-app.mjs integral-error-criteria --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/integral-error-criteria/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 24 | `clock.js`, `complex.js`, `control.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `numeric.js`, `ode.js`, `plot.js`, `poly.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/integral-error-criteria/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: integral-error-criteria runs from its own folder" (A-IE-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-IE-01 | deviation | The criteria in the label are computed accurately: IAE and ITAE differ from Mathematica's (snapshot 1: IAE 5.059, ITAE 25.529; the port 5.060, 25.678; snapshot 2: ITAE 41.090, the port 37.313) because Mathematica's NIntegrate misses the kinks of \|1 − b\| over 0 … 5000 (E-IE-01; a midpoint sum confirms the port's values). ISE agrees to all shown digits. |
| D-IE-02 | deviation | The tuning plots' vertical range: ListPlot's automatic range includes 0 when the data lie closer to 0 than their spread (the ITAE plot of snapshot 5); the port applies that rule. |
| K-IE-01 | known issue | At K_c = 7.5 the three integrals take about 2 s (thousands of oscillations); the page is unresponsive meanwhile, as Mathematica is. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-IE-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-IE-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-IE-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): closed-loop response by an inverse Laplace transform, the three criteria by NIntegrate, the tuning plots; switch for E-IE-01 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-IE-01 | Let the integral time τ_I vary | tuning in two parameters | not in the original | F-IE-02 |
| I-IE-02 | Compute the tuning tables in the page (as the corrected mode does) | consistent values | changes the original's plot | E-IE-01 |
| I-IE-03 | Mathematica reference values (`tools/wolfram/export-control-reference.wls`) | pins D-IE-01 | owner's Mathematica | D-IE-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-IE-01 | numerical | f1, f3 and the tables IAE, ITAE, w1, w3 | NIntegrate[Abs[1 − b[q]], {t, 0, 5000}] and the time-weighted one are computed inaccurately (the kinks of the absolute value over a long range); the authors’ tables carry the same errors (IAE at gain 1: 5.3547, accurately 5.3448; ITAE at 1.25: 25.529, accurately 25.678) and so do the optima (IAE optimum at gain 1.488, accurately 1.452) | kept: the authors’ tables and optima in the tuning plots; the response label is computed accurately (D-IE-01) **Switch:** with "errors of the original: corrected" (A-IE-08, v0.1.37) — the three tables and their optima are computed in the page with an adaptive integration that resolves the kinks (checked against a fine midpoint sum): optimum gains 1.452 (IAE), 2.084 (ISE) and 1.033 (ITAE). | the tuning plots show recomputed tables and optima (IAE 1.452, ISE 2.084, ITAE 1.033) | switchable since v0.1.37 |
