# Design document: Quarter-Car Suspension Model with Double Spring

| | |
|---|---|
| Code version: | 0.1.39 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Quarter-Car Suspension Model with Double Spring", contributed by Jon Neades, published 2014-01-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/QuarterCarSuspensionModelWithDoubleSpring/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A quarter car with two masses (body and wheel) and two spring–damper pairs (suspension and tyre) meets a single
road hump or a sinusoidal road. The Demonstration solves the two equations of motion, plots both displacements over 10 s
and animates the masses, with the damping ratio and frequencies of each spring–mass pair (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/quarter-car-double-spring.txt`) and checked against its snapshots (`docs/original-snapshots/quarter-car-double-spring-*.png`) and saved
settings (`tests/golden/quarter-car-double-spring.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-QD-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-QD-02: the owner compares the port with the original (checklist `docs/checklists/quarter-car-double-spring.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-QD-01 | Trigger "play" (play/pause and reset) and the slider "time" on the same variable run 0 … 10 (0.05, AnimationRate 1) | the original's animation | v0.1.37 | e2e "the Trigger and the time slider move the same variable"; M-QD-05 |
| F-QD-02 | Sliders m₁ 200 … 1000, m₂ 5 … 100 (1), k₁, k₂ 10 000 … 200 000 (1000), c₁, c₂ 0 … 10 000 (100) under the headings mass, stiffness, damping | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-QD-03 |
| F-QD-03 | Input: radio buttons (vertical) single bump \| sinusoidal; height 0 … 0.2, duration 0.1 … 5, frequency 0 … 3 | the original's controls | v0.1.37 | e2e "the input type" |
| F-QD-04 | NDSolve of m₁x₁″ + k₁(x₁ − x₂) + c₁(x₁′ − x₂′) = 0, m₂x₂″ + k₁(x₂ − x₁) + c₁(x₂′ − x₁′) + k₂x₂ + c₂x₂′ = f(t) from rest on 0 … 10, f = k₂ × (a half-sine bump from t = 2, or h sin 2πωt) | the original's model | v0.1.37 | unit "the solution satisfies both equations"; unit "the input" |
| F-QD-05 | Top plot: x₁ (dark blue) and x₂ (dark red) on 0 … 10, PlotRange ±0.25, grey background, with points following the time | the original's picture | v0.1.37 | e2e "the snapshot settings" |
| F-QD-06 | The two masses (blue, red rectangles), the two zigzag springs, the road (green) with the contact point (pink) and the labels ζ, ω, f of each pair (NumberForm {3, 2}) | the original's picture | v0.1.37 | unit "the labels of snapshot 1"; M-QD-05 |
| F-QD-07 | Opening state: run 0, m₁ 400, m₂ 30, k₁ 20 000, k₂ 80 000, c₁ 2000, c₂ 0, single bump, h 0.15, duration 1, frequency 1 | the saved settings | v0.1.37 | unit "the opening state"; M-QD-02 |
| F-QD-08 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-QD-01 |
| F-QD-09 | Five snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings"; unit "snapshot 2" |
| A-QD-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-QD-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-QD-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-QD-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-QD-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-QD-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: quarter-car-double-spring runs from its own folder" |
| A-QD-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-QD-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-QD-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-QD)"; e2e "errata switch on quarter-car-double-spring: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `trigger-*-run` | F-QD-01 |
| `*-run` | F-QD-01 |
| `*-m1` | F-QD-02 |
| `*-m2` | F-QD-02 |
| `*-k1` | F-QD-02 |
| `*-k2` | F-QD-02 |
| `*-c1` | F-QD-02 |
| `*-c2` | F-QD-02 |
| `radio-type-*` | F-QD-03 |
| `*-h` | F-QD-03 |
| `*-wid` | F-QD-03 |
| `*-ω` | F-QD-03 |
| `reset` | A-QD-01 |
| `crumbs` | A-QD-04 |
| `details` | F-QD-08 |
| `credits` | A-QD-05 |
| `setter-errata-*` | A-QD-08 |
| `errata-details` | A-QD-08 |

## 6. Design

- `model.js` (pure): the Initialization's `CalcPulse`, `CalcForce`, `CalcCurve`, `CalcGround`; `solve(state)` with
  `NDSolve` (breakpoints at the bump's start and end); `modal(m, k, c)` for the labels; `evaluate(state)` → two pictures.
- `main.js`: a Trigger and a slider on the same variable (new in v0.1.37: several controls of one variable stay in
  step); RadioButton with Appearance -> "Vertical".

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- quarter-car-double-spring` → `dist/quarter-car-double-spring/`.
- Contents (generated with `node tools/bundle-app.mjs quarter-car-double-spring --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/quarter-car-double-spring/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `ode.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/quarter-car-double-spring/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: quarter-car-double-spring runs from its own folder" (A-QD-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-QD-01 | deviation | The Trigger has play/pause and reset (AppearanceElements -> {"PlayPauseButton", "ResetButton"}), as the original asks. |
| N-QD-01 | note | Each label pair (ζ, ω, f) treats one spring–mass pair alone (m₁ on k₁, m₂ on k₂); the coupled system's natural frequencies differ. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-QD-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-QD-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-QD-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): two-mass suspension by NDSolve, Trigger and slider on one variable, radio buttons; switch for E-QD-01 |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-QD-01 | The coupled system's two natural frequencies | correct modal data | not in the original | N-QD-01 |
| I-QD-02 | Road input through the tyre damper c₂ as well | complete model | not in the original | F-QD-04 |
| I-QD-03 | Mathematica reference values | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-QD-01 | text | the lower label, Row[{Subscript["ω", 2], " = ", Omegau, " Hz"}] | ω₂ is an angular frequency in rad/s (51.60 at the opening settings) but is labelled Hz; ω₁ above it says rad/s and f₂ = 8.22 Hz is the frequency | kept: "51.60 Hz" **Switch:** with "errors of the original: corrected" (A-QD-08, v0.1.37) — the label reads "ω2 = 51.60 rad/s". | the label reads "51.60 rad/s" | switchable since v0.1.37 |
| E-QD-02 | text | Details | the bump is described as "cosine shaped"; CalcPulse is half a sine period | kept | none | kept |
