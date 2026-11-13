# Design document: Zero-Pole Cancellation in Transfer Functions

| | |
|---|---|
| Code version: | 0.1.39 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Zero-Pole Cancellation in Transfer Functions", contributed by Hugo Tadashi, published 2018-09-21 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ZeroPoleCancellationInTransferFunctions/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

Root loci of a unity-feedback loop for an unstable plant without compensation, with a zero cancelling the
unstable pole exactly, and with a slightly misplaced zero: only exact cancellation keeps the loop stable for every gain
(caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/zero-pole-cancellation.txt`) and checked against its snapshots (`docs/original-snapshots/zero-pole-cancellation-*.png`) and saved
settings (`tests/golden/zero-pole-cancellation.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-ZP-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-ZP-02: the owner compares the port with the original (checklist `docs/checklists/zero-pole-cancellation.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-ZP-01 | Slider gain 0 … 1 (continuous, Labeled) | the original's control | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture" |
| F-ZP-02 | Setter bar: without compensation \| precise pole‐zero cancellation \| imprecise pole‐zero cancellation | the original's control | v0.1.37 | e2e "the three transfer functions"; M-ZP-03 |
| F-ZP-03 | funcs = 1/((s + 0.5)(s + 1)(s − 0.1)), 1/((s + 0.5)(s + 1)), (s − 0.3)/((s + 0.5)(s + 1)(s − 0.1)) | the original's Initialization | v0.1.37 | unit "the snapshots’ pictures" |
| F-ZP-04 | RootLocusPlot[k funcs[[tf]], {k, 0, 1}, PlotRange -> All, AspectRatio -> 1]: one curve per branch in ColorData[97] order, poles × and zeros ○ | the original's picture | v0.1.37 | unit "the root locus"; e2e "the snapshot settings"; M-ZP-05 |
| F-ZP-05 | PoleZeroMarkers -> {Automatic, "ParameterValues" -> gain}: no marker is drawn at the gain (E-ZP-01) | the original's option | v0.1.37 | unit "the gain draws nothing in the original" |
| F-ZP-06 | Opening state: gain 0, without compensation | the saved settings | v0.1.37 | unit "the opening state"; M-ZP-02 |
| F-ZP-07 | Caption from the Demonstration (placeholder References) | the original's explanation | v0.1.37 | M-ZP-01 |
| F-ZP-08 | Controls above the picture | the original's layout | v0.1.37 | inventory |
| F-ZP-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-ZP-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-ZP-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-ZP-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-ZP-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-ZP-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-ZP-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: zero-pole-cancellation runs from its own folder" |
| A-ZP-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-ZP-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-ZP-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-ZP)"; e2e "errata switch on zero-pole-cancellation: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-gain` | F-ZP-01 |
| `setter-tf-*` | F-ZP-02 |
| `reset` | A-ZP-01 |
| `crumbs` | A-ZP-04 |
| `details` | F-ZP-07 |
| `credits` | A-ZP-05 |
| `setter-errata-*` | A-ZP-08 |
| `errata-details` | A-ZP-08 |

## 6. Design

- `model.js` (pure): `FUNCS` as TransferFunctionModels; `evaluate(state)` → `RootLocusPlot` of
  `shared/control-plots.js` (new in v0.1.37: roots of den + k num by companion-matrix eigenvalues, branches followed
  continuously with k refined near breakaway points, pole and zero markers, ParameterValues points).
- `main.js`: ControlPlacement Top.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- zero-pole-cancellation` → `dist/zero-pole-cancellation/`.
- Contents (generated with `node tools/bundle-app.mjs zero-pole-cancellation --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/zero-pole-cancellation/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `complex.js`, `control-plots.js`, `control.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `ode.js`, `plot.js`, `poly.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/zero-pole-cancellation/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: zero-pole-cancellation runs from its own folder" (A-ZP-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-ZP-01 | deviation | Which branch of a complex pair leaves a breakaway point upwards (and so its colour) is decided by continuity in the port; in snapshot 4 Mathematica colours the upper branch orange where the port draws it blue (the curves are the same). |
| D-ZP-02 | deviation | The k steps: 120 equal steps refined where a root moves more than 1/150 of the picture; Mathematica's sampling differs but the curves agree to well under a pixel. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-ZP-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-ZP-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-ZP-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): RootLocusPlot (shared control-plots.js) of the three transfer functions; switch for E-ZP-01 |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-ZP-01 | Show the closed-loop step response for the gain | links the locus to time behaviour | not in the original | F-ZP-05 |
| I-ZP-02 | Let the user move the compensating zero | explore imprecision | not in the original | F-ZP-03 |
| I-ZP-03 | Mathematica reference values (`tools/wolfram/export-control-reference.wls`) | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-ZP-01 | conceptual | PoleZeroMarkers -> {Automatic, "ParameterValues" -> gain} | the gain slider has no visible effect: no marker is drawn at the closed-loop poles for the gain (snapshots 2 and 4, gains 0.628 and 0.634, show none) | kept: no marker **Switch:** with "errors of the original: corrected" (A-ZP-08, v0.1.37) — the closed-loop poles at the chosen gain are drawn as points in the colours of their branches (at 0.628 without compensation: −1.436 and 0.018 ± 0.634 i, just right of the imaginary axis). | the closed-loop poles at the gain are drawn as points in their branches' colours | switchable since v0.1.37 |
| E-ZP-02 | text | Caption | scenario 2 is said to place a zero "precisely at the unstable pole" with a PD compensator, but funcs[[2]] simply drops the factor (s − 0.1); zeros are said to be marked by a dot "·" and are drawn as circles; "locus root" for root locus | kept | none | kept |
