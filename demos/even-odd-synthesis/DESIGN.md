# Design document: Synthesis with Even and Odd Functions

| | |
|---|---|
| Code version: | 0.1.36 |
| Document revision | 2 (2026-11-06) — implemented after the owner's "go" (Q-1: the lower plot of even-odd-synthesis at 500 px); compared with the four snapshots |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Synthesis with Even and Odd Functions", contributed by Aaron T. Becker, published 2016-08-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SynthesisWithEvenAndOddFunctions/> |
| Port files | `model.js` (the seven signals from u, r and rect, the even and odd parts, the two plots; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, simple mode (v0.1.33): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

Every signal is the sum of an even part ½(x(t) + x(−t)) and an odd part ½(x(t) − x(−t)). The user picks one of
seven signals built from the unit step u, the ramp r and the rectangle (Step, RampUp, Cos, Sin, TopHat, StairStep,
Triangle) and shifts it by T; the top plot shows the input x(t − T), the bottom plot the input with its even and odd
parts filled to the axis.

Source as text: [`docs/original-source/even-odd-synthesis.txt`](../../docs/original-source/even-odd-synthesis.txt); snapshots `docs/original-snapshots/even-odd-synthesis-1…4.png`; saved states `tests/golden/even-odd-synthesis.original-states.json`. The saved definitions in the output cell are the initialization cell's (checked 2026-11-06).

## 2. Scope

In scope: the Manipulate (signal setter, T slider, the two plots) and the caption. The Demonstration's Details and
References are the template's placeholders ("Details, references or citation information"; E-EO-02): the page shows
the caption only. Out of scope: `δ` (DiracDelta), defined and never used.

## 3. Users and use cases

- UC-EO-01: a student sees that any signal is the sum of an even and an odd signal.
- UC-EO-02: a student sees how a shift changes the even and odd parts (a shifted cosine is no longer even).

## 4. Features

Source: the Manipulate and the initialization cell (u = UnitStep, r(t) = t u(t), rect = HeavisidePi).

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-EO-01 | Setter `signal` {"Step", "RampUp", "Cos", "Sin", "TopHat", "StairStep", "Triangle"} (`ControlType -> Setter`), initially "StairStep" | the input signal | v0.1.33 | e2e "has its controls with their defaults"; unit "the seven signals" |
| F-EO-02 | Slider `{{τ, 0, Style["T", Italic]}, -10, 10, 0.1, ImageSize -> 180, Appearance -> "Labeled"}`, beside the setter | the shift | v0.1.33 | e2e "has its controls with their defaults" |
| F-EO-03 | The signals X(t, τ): Step u(t − τ); RampUp ⅕(r(t − τ) − r(t − τ − 5)); Cos cos(t − τ); Sin sin(t − τ); TopHat ¼ rect((t − τ)/3) + ¾ rect(t − τ); StairStep ¼(u(t − τ) + u(t − τ − 1) + u(t − τ − 2) + u(t − τ − 3) − 4u(t − τ − 4)); Triangle ½(r(t − τ) − 2r(t − τ − 2) + r(t − τ − 4)); otherwise rect(t − τ) | the inputs | v0.1.33 | unit "the seven signals" |
| F-EO-04 | Top plot: `Plot[X[t, τ], {t, -10, 10}, ImageSize -> 500, AspectRatio -> 1/3, PlotRange -> {{-10, 10}, {-1, 1}}, ExclusionsStyle -> Dashed, Prolog -> Text["input signal", {-8, 1/2}], Epilog -> {PointSize -> Large, Point[{τ, 0}], Text["T", {τ, 0.1}]}]`: jumps drawn as dashed vertical lines | the input | v0.1.33 | e2e "loads without errors and draws the picture"; unit "the jumps of each signal" |
| F-EO-05 | Bottom plot: `Plot[{X[t, τ], ½(X[t, τ] + X[−t, τ]), ½(X[t, τ] − X[−t, τ])}, …, Filling -> {1 -> {1}, 2 -> Axis, 3 -> Axis}, AspectRatio -> 1/3, PlotStyle -> {Thin, Automatic, Automatic}, PlotLegends -> Placed[{"", "even: " x_even(t − T), "odd: " x_odd(t − T)}, {.1, .9}], PlotRange -> {{-10, 10}, {-1, 1}}]`: the even part (orange) and the odd part (green) filled to the axis; jumps break the curves (no ExclusionsStyle) | the decomposition | v0.1.33 | unit "even plus odd is the signal"; e2e "loads without errors and draws the picture"; M-EO-07 |
| F-EO-06 | The two plots in a column (`GraphicsColumn`) | layout | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-EO-07 | Opening state StairStep, T = 0 | the Manipulate's initial values | v0.1.33 | unit "the opening state" |
| F-EO-08 | The four snapshot settings load and give the original's pictures (the bottom plot larger, D-EO-01) | parity with the original | v0.1.33 | e2e "the four snapshot settings" |
| F-EO-09 | Caption (from the Demonstration) | the original's explanation | v0.1.33 | M-EO-01 |
| A-EO-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.33 | e2e "Initial settings restores the opening state" |
| A-EO-02 | Test and automation hook `window.__demo` from the Manipulate layer | automated tests | v0.1.33 | e2e "the T slider shifts the signal" |
| A-EO-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.33 | e2e "start-up notice when" |
| A-EO-04 | Breadcrumb link to all demos | navigation | v0.1.33 | inventory |
| A-EO-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.33 | e2e "attribution on" |
| A-EO-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.33 | e2e "bundle: even-odd-synthesis runs from its own folder" |
| A-EO-07 | Landing-page thumbnail `thumbnail.webp` | owner request 2026-11-05 | v0.1.33 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-signal-*` | F-EO-01 |
| `*-τ` | F-EO-02 |
| `reset` | A-EO-01 |
| `crumbs` | A-EO-04 |
| `credits` | A-EO-05 |

## 6. Design

- `model.js` (pure): `X(signal, t, τ)` (the Piecewise of the Manipulate, u, r and rect from `shared/wl.js` — S-6
  `HeavisidePi`), `jumpsOf(signal, τ)` (the jumps Mathematica finds symbolically), `evaluate(state)` → `{ view,
  graphics }`: the two plots of `shared/plot.js` — `Exclusions` at the jumps with `ExclusionsStyle: Dashed` on the
  upper one (S-1), the jumps and their mirror images on the lower one, which has none (the curves break), both 500 px
  wide (D-EO-01).
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, the Grid of the setter and the slider as one Row, two
  pictures in a column (`GraphicsColumn`).
- Size: model 72 lines, main 23 lines (the WL Manipulate is 20 lines, the initialization 4).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- even-odd-synthesis` → `dist/even-odd-synthesis/`.
- Contents (generated with `node tools/bundle-app.mjs even-odd-synthesis --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/even-odd-synthesis/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/even-odd-synthesis/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: even-odd-synthesis runs from its own folder" (A-EO-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-EO-01 | deviation (owner decision Q-1, 2026-11-06) | In all four published snapshots `GraphicsColumn` shrinks the bottom plot (no ImageSize) to about 110 × 37 px under the 500 px top plot, so the decomposition — the point of the Demonstration — is unreadable (E-EO-01). The port draws the bottom plot at the top plot's width (500 px), as the owner chose. |
| D-EO-02 | deviation | Mathematica finds the jumps of u and rect symbolically (automatic `Exclusions`); the port passes each signal's jump points to the shared `Exclusions` option (S-1). |
| Q-EO-01 | quirk kept | `Filling -> {1 -> {1}, …}` fills the input to itself: nothing. The input's legend entry has no text (""). |
| N-EO-01 | note | `δ[t_] := DiracDelta[t]` is defined and never used. |
| D-EO-03 | deviation | Image padding set by hand ({{30, 14}, {16, 10}} px) for the tick labels at the ends of the axes; Mathematica computes it. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.33 | 2026-11-06 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-06) |
| 2 | v0.1.33 | 2026-11-06 | implemented after the owner's "go" (2026-11-06); shared additions S-1 … S-7: `shared/plot.js` Exclusions/ExclusionsStyle, PlotMarkers, InterpolationOrder 0; `shared/ui-extra.js` + `shared/manipulate.js` CheckboxBar; `shared/svg-plot.js` + `shared/manipulate.js` LocatorAutoCreate; `shared/wl.js` HeavisidePi; `shared/graphics.js` JoinForm; compared with the four snapshots |
| 3 | v0.1.34 | 2026-11-10 | version number (v0.1.34: the switch "errors of the original: kept \| corrected" for the apps with code-level findings in §11, `shared/errata.js`); no change to this app's code, behaviour or picture |
| 4 | v0.1.35 | 2026-11-11 | version number (v0.1.35: two new apps, paths-inside-a-polygon and voronoi-diagrams; no shared code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.36 | 2026-11-11 | version number (v0.1.36: the full colour menu of voronoi-diagrams); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-EO-01 | Label the parts as "even part of x(t − T)" | the right meaning | differs from the original | E-EO-03 |
| I-EO-02 | A Details text (definitions of even and odd parts, the formulas) | the page explains itself | new text, not the original's | E-EO-02 |
| I-EO-03 | Dashed jump lines in the lower plot too (ExclusionsStyle as in the upper plot) | the two plots read alike | differs from the original | F-EO-05 |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-06 against the notebook, its snapshots and the Demonstration page.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-EO-01 | conceptual | `GraphicsColumn[{Plot[…, ImageSize -> {500}], Plot[…]}]` | the second plot has no ImageSize and is drawn tiny (all four snapshots): the even/odd decomposition cannot be read | draws it at 500 px (owner decision Q-1, D-EO-01) | the decomposition can be read | corrected in v0.1.33 |
| E-EO-02 | text | Details & Citations, References | template placeholders were published ("Details, references or citation information", "References for demonstration.") | shows no Details | write a Details text (I-EO-02) | open |
| E-EO-03 | conceptual | the legends "x_even(t − T)" and "x_odd(t − T)" | the plotted curves are the even and odd parts of the shifted signal x(t − T), not the parts of x shifted by T (a shifted even function is not even): the notation says the latter | keeps the legends | I-EO-01 | open |

