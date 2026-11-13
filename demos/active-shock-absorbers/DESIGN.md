# Design document: Active Shock Absorbers

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Active Shock Absorbers", contributed by Enrique Zeleny, published 2013-01-15 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ActiveShockAbsorbers/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

An active shock absorber is a damped oscillator m y″ + γ(y) y′ + k y = 0 whose damping depends on the
displacement (magnetorheological fluids). Three damping functions γ(y) can be chosen; the Demonstration draws the
absorber at time t, the phase-plane trajectory and y(t) (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/active-shock-absorbers.txt`) and checked against its snapshots (`docs/original-snapshots/active-shock-absorbers-*.png`) and saved
settings (`tests/golden/active-shock-absorbers.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-AS-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-AS-02: the owner compares the port with the original (checklist `docs/checklists/active-shock-absorbers.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-AS-01 | Popup γ: y(t)⁴ \| 1 − exp(−10 y(t)²) \| tan⁻¹(y(t)) | the original's control | v0.1.37 | e2e "has its controls with their defaults"; M-AS-03 |
| F-AS-02 | Sliders y₀ 0.1 … 1, y₀′ 0 … 1 (0.001), m 0.1 … 5, k 0.1 … 10 (0.01), t 1 … 50 (0.01); Labeled, Tiny, on the left | the original's controls | v0.1.37 | e2e "a control changes the picture"; M-AS-03 |
| F-AS-03 | NDSolve[{m y″ + γ(y) y′ + k y == 0, y(0) == y₀, y′(0) == y₀′}, y, {t, 0, 50}] | the original's model | v0.1.37 | unit "the initial values and the energy law" |
| F-AS-04 | The absorber at time t: base, rods (brown, red), the spring (a scaled triangle wave, `gr`), the blue seat frame; ImageSize {150, 250} | the original's picture | v0.1.37 | unit "the absorber picture"; M-AS-05 |
| F-AS-05 | Phase plane: ParametricPlot of {y, y′} for 0 … t, Frame, AspectRatio 1 | the original's picture | v0.1.37 | e2e "the snapshot settings" |
| F-AS-06 | y(t) for 0 … t, AspectRatio 1/3, axes labelled t and y(t) | the original's picture | v0.1.37 | e2e "the snapshot settings" |
| F-AS-07 | Opening state: γ = 1 − exp(−10y²), y₀ 0.1, y₀′ 0.2, m 0.1, k 1, t 35 | the saved settings | v0.1.37 | unit "the opening state"; M-AS-02 |
| F-AS-08 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-AS-01 |
| F-AS-09 | Four snapshot settings give the snapshots' pictures (snapshot 4: a limit cycle with γ = arctan y) | faithfulness | v0.1.37 | unit "snapshot 4"; e2e "the snapshot settings" |
| A-AS-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-AS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-AS-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-AS-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-AS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-AS-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: active-shock-absorbers runs from its own folder" |
| A-AS-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `popup-f` | F-AS-01 |
| `*-y0` | F-AS-02 |
| `*-yp0` | F-AS-02 |
| `*-m` | F-AS-02 |
| `*-k` | F-AS-02 |
| `*-tf` | F-AS-02 |
| `reset` | A-AS-01 |
| `crumbs` | A-AS-04 |
| `details` | F-AS-08 |
| `credits` | A-AS-05 |

## 6. Design

- `model.js` (pure): `DAMPING`, `solve(state)` with `NDSolve` of `shared/ode.js`, `absorber(y)` (the original's
  Graphics with the spring made from TriangleWave of `shared/numeric.js`), `evaluate(state)` → three pictures.
- `main.js` and the page: the absorber and the phase plane side by side, y(t) below (Column[{Row[…], …}]).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- active-shock-absorbers` → `dist/active-shock-absorbers/`.
- Contents (generated with `node tools/bundle-app.mjs active-shock-absorbers --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/active-shock-absorbers/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `complex.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `numeric.js`, `ode.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/active-shock-absorbers/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: active-shock-absorbers runs from its own folder" (A-AS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-AS-01 | deviation | The popup shows its choices as plain text (y(t)⁴, …), Mathematica as TraditionalForm. |
| D-AS-02 | deviation | Snapshot 4 shows "Global`y" in the frame labels (a Mathematica version effect); the port draws y(t), y′(t) as snapshots 1–3 do. |
| N-AS-01 | note | The spring keeps the plot's default colour: Orange set before it is overridden by the Plot primitives' own style (as the snapshots show it blue). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): NDSolve of the nonlinear oscillator (shared ode.js), the absorber, phase plane and y(t); no correctable error found (no switch) |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.40 | 2026-11-13 | version number (v0.1.40: three truss ports; shared/truss.js is new; shared/graphics.js gains Mouseover, RotatedText, rounded and line-less Framed, Arrowheads[Large] and heads at given places, Grid alignment at "=", styled scripts and fitPlotRange — the changes to existing drawing are a styled script keeping its style and the baseline after it, and framed or backed labels keeping their outer spaces); no change to this app's code or behaviour |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-AS-01 | Animate t | see the seat move | not in the original (the t slider's ⊕ panel can play it) | F-AS-02 |
| I-AS-02 | A user-defined damping function | explore | needs a parser | F-AS-01 |
| I-AS-03 | Mathematica reference values | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-AS-01 | text | Details | the equation is written with "Gamma" (γ) as a constant; it is the function γ(y) of the popup | kept | none | kept |
