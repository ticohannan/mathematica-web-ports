# Design document: AC Induction Motor Rotor Design

| | |
|---|---|
| Code version: | 0.1.43 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "AC Induction Motor Rotor Design", contributed by Harley H. Hartman, published 2007-11-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ACInductionMotorRotorDesign/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

The torque–speed curve of an AC induction motor and how the rotor design shapes it. Three sliders set the blocked rotor
voltage *E*<sub>BR</sub>, the rotor resistance *R*<sub>R</sub> and the rotor reactance *X*<sub>R</sub>; three buttons set
approximate values of the NEMA designs A, B and D. The plot shows the torque in % of full load against the speed from 0
to 1820 rpm (synchronous speed 1800 rpm),

T(s) = −21.12 e² r (s − 1800)/(3.24×10⁶ r² + (s − 1800)² x²),

the simplified rotor-circuit torque E² R s′/(R² + s′² X²) with the slip s′ = (1800 − s)/1800, scaled to % of full load.
Three labels give the locked-rotor torque (at 0 rpm), the maximum (breakdown) torque with its speed, and the speed at
which the motor delivers full-load torque (100 %), each with an arrow on the curve (caption; Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/induction-motor-rotor-design.txt`) and checked against its snapshots
(`docs/original-snapshots/induction-motor-rotor-design-*.png`) and saved settings
(`tests/golden/induction-motor-rotor-design.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-IM-01: a student explores the Demonstration in a browser, without Mathematica: how resistance, reactance and
  voltage move the starting torque, the breakdown torque and the full-load speed.
- UC-IM-02: a student compares the three NEMA designs with one button each.
- UC-IM-03: Tico compares the port with the original (checklist `docs/checklists/induction-motor-rotor-design.md`),
  with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-IM-01 | Slider "blocked rotor voltage (E<sub>BR</sub>)" `{{e, 150, …}, 130, 240, Appearance -> "Labeled"}` (continuous, ⊕ panel) | the original's control | v0.1.41 | e2e "the arrow keys move the blocked rotor voltage and the picture follows"; e2e "has its controls with their defaults" |
| F-IM-02 | Slider "rotor resistance (R<sub>R</sub>)" `{{r, 0.107, …}, 0.01, 1.0, Appearance -> "Labeled"}` | the original's control | v0.1.41 | e2e "a mouse press on the rotor resistance slider sets r and the labels" |
| F-IM-03 | Slider "rotor reactance (X<sub>R</sub>)" `{{x, 0.422, …}, 0.2, 0.85, Appearance -> "Labeled"}`; a typed value is used | the original's control | v0.1.41 | e2e "a value typed into the reactance field is used" |
| F-IM-04 | `Row[{"NEMA design", Button[" A ", r = 0.065; x = 0.3263; e = 150], Button[" B ", r = 0.0792; x = 0.405; e = 158], Button[" D ", r = 0.384; x = 0.384; e = 150]}]` | approximate NEMA designs (UC-IM-02) | v0.1.41 | e2e "the NEMA design buttons set r, x and e"; unit "the NEMA buttons set the original's values" |
| F-IM-05 | The plot: `Plot[T(s), {s, 0, 1820}]` with AxesLabel {"speed\nRPM", "torque\n% full load"}, PlotRange {0, 700}, PlotStyle SlateBlue with Thickness 0.01, the original's explicit Ticks, ImageSize {500, 300} | the original's picture | v0.1.41 | unit "the torque formula equals its slip form"; unit "the picture: the curve, the three labels and the arrows"; e2e "loads without errors and draws the picture" |
| F-IM-06 | Locked-rotor display: ↙ (Bold 20, purple RGB 0.5, 0.2, 0.5) at {50, T(0) + 30}; the label "locked rotor / torque / Round[T(0)] % full load" at {300, 610} | the original's picture | v0.1.41 | unit "the arrows:"; e2e "the snapshot settings show the snapshots' labels" |
| F-IM-07 | Maximum-torque display: ↓ (Bold 20, black) at {s_max, T_max + 25}, s_max = Round[1800 − 1800 r/x] (0 and the height T(0) + 25 when s_max < 0); the label "max torque / Round[0.0058667 e²/x] % full load / s_max rpm" at {1005, 610} | the original's picture | v0.1.41 | unit "the maximum of T lies at s = 1800 − 1800 r/x"; unit "the arrows:"; e2e "the snapshot settings show the snapshots' labels" |
| F-IM-08 | Full-load display: ← (Bold 20, red RGB 0.9, 0.1, 0.1) at {s_fl + 60, 100}; the label "full load / torque / Round[s_fl]  rpm" at {1710, 610}, s_fl the higher-speed root of T(s) = 100 | the original's picture | v0.1.41 | unit "the full-load speed is the higher-speed root of T(s) = 100"; unit "outside the ranges the full-load speed is complex"; e2e "the snapshot settings show the snapshots' labels" |
| F-IM-09 | The labels' numbers as Mathematica prints `Times[n, "text"]`: the number, a space, the text ("149 % full load", "1725  rpm" with the text's own leading space) | the original's labels | v0.1.41 | unit "is shown as Mathematica prints it"; unit "the snapshot settings give the labels printed in the snapshot pictures" |
| F-IM-10 | Opening state e = 150, r = 0.107, x = 0.422 (the notebook's live state = its initial settings) | the saved state | v0.1.41 | unit "the opening state is the notebook's live state"; e2e "has its controls with their defaults" |
| F-IM-11 | Caption and Details text from the Demonstration | the original's explanation | v0.1.41 | M-IM-01 |
| F-IM-12 | Controls above the picture (a Manipulate without ControlPlacement) | the original's layout | v0.1.41 | inventory |
| A-IM-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-IM-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.41 | e2e "has its controls with their defaults" |
| A-IM-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-IM-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-IM-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-IM-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: induction-motor-rotor-design runs from its own folder" |
| A-IM-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-IM-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-IM-02 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-IM)"; e2e "errata switch on induction-motor-rotor-design: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-e` | F-IM-01 |
| `value-e` | F-IM-01 |
| `plus-e` | F-IM-01 |
| `play-e` | F-IM-01 |
| `stepback-e` | F-IM-01 |
| `stepfwd-e` | F-IM-01 |
| `slider-r` | F-IM-02 |
| `value-r` | F-IM-02 |
| `plus-r` | F-IM-02 |
| `play-r` | F-IM-02 |
| `stepback-r` | F-IM-02 |
| `stepfwd-r` | F-IM-02 |
| `slider-x` | F-IM-03 |
| `value-x` | F-IM-03 |
| `plus-x` | F-IM-03 |
| `play-x` | F-IM-03 |
| `stepback-x` | F-IM-03 |
| `stepfwd-x` | F-IM-03 |
| `button-A` | F-IM-04 |
| `button-B` | F-IM-04 |
| `button-D` | F-IM-04 |
| `reset` | A-IM-01 |
| `crumbs` | A-IM-04 |
| `details` | F-IM-11 |
| `credits` | A-IM-05 |
| `setter-errata-*` | A-IM-08 |
| `errata-details` | A-IM-08 |

## 6. Design

- `model.js` (pure): `torque(e, r, x)` (the plotted expression as written in the original), `fullLoadSpeed` (the
  original's closed form; a complex result as `{re, im}`), `quantities(state)` (the numbers and positions of the three
  displays, in the original's order: locked rotor, maximum, full load), `timesText` (Mathematica's display of
  `Times[n, "text"]`), `evaluate(state)` → `{ view, graphics }` with the plot of `shared/plot.js` and its Epilog. The
  labels are `Text[Column[{Style[…, 12, colour], …}]]` at the original's positions; the arrows are the original's
  `\[LowerLeftArrow]`, `\[DownArrow]` and `\[LeftArrow]` (↙ ↓ ←) as text. Test ids `locked-arrow`, `locked-label`,
  `max-arrow`, `max-label`, `full-load-arrow`, `full-load-label`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top; the three sliders with their typeset labels
  (`Row([…, Subscript('E', 'BR'), …])`), the Row of the heading and the three Buttons (each assigns r, x and e), and the
  switch `ErrataControl(CORRECTIONS)`.
- `errata-mode.js`: the correction of E-IM-02 (§11).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- induction-motor-rotor-design` → `dist/induction-motor-rotor-design/`.
- Contents (generated with `node tools/bundle-app.mjs induction-motor-rotor-design --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/induction-motor-rotor-design/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/induction-motor-rotor-design/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: induction-motor-rotor-design runs from its own folder" (A-IM-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-IM-01 | deviation | ImagePadding {{44, 63}, {28, 41}} px is given explicitly (Mathematica computes it): the layer's automatic margins leave no room for two-line axes labels. The values are the snapshots' margins divided by 1.1 (N-IM-02). The y label is a Column with an empty third line, so that the two lines end above the plot as in the snapshots. |
| D-IM-02 | deviation | The tick label "0" under the origin of the speed axis is not drawn (the layer leaves out tick labels where the axes cross); the snapshots show it. |
| D-IM-03 | deviation | A value typed into a slider's field is kept within the slider's range (the layer's sliders); the original's labelled field is believed to take values outside it (to be checked, M-IM-07). The complex case of E-IM-03 therefore cannot be reached from the page. |
| D-IM-04 | deviation | The arrows ↙ ↓ ← are drawn with the browser's fonts (Bold, 20 px); Mathematica's glyphs are heavier and slightly larger. |
| D-IM-05 | deviation | The controls are drawn in the layer's style: each slider's label above it, the value field and ⊕ at its right, the text "NEMA design" as a bold heading beside the three buttons (Mathematica: labels left of the sliders, plain text). |
| Q-IM-01 | quirk kept | The red label "full load torque" gives a speed in rpm (N-IM-05). |
| Q-IM-02 | quirk kept | PlotRange {0, 700}: for large e²/x the maximum is above 700 % (up to 1690 % at e = 240, x = 0.2): the curve is cut at the top, an arrow above 700 is not shown (clipped with the plot), and the curve may run through the labels (K-IM-01). |
| Q-IM-03 | quirk kept | With r > x the "max torque" label prints the unconstrained maximum next to "0 rpm" (E-IM-02; corrected mode only with the switch). |
| Q-IM-04 | quirk kept | The numbers are printed as `Times[n, "text"]`: a rounded value of 1 would print the text alone and 0 would print "0" alone; with the sliders' ranges the values stay above 2 (smallest locked-rotor torque 2.7 % at e = 130, r = 0.01, x = 0.85). |
| K-IM-01 | known issue | Whether Mathematica clips Epilog insets outside the PlotRange (the arrows of Q-IM-02) as the port does: M-IM-06. |
| K-IM-02 | known issue | The complex full-load speed (E-IM-03): the port prints the rounded complex number "(a + b ⅈ)  rpm" (assumed form) and draws no red arrow; what Mathematica shows (the label, and the Inset at a complex position) is to be checked with typed values, M-IM-07. |
| N-IM-01 | note | Snapshots 2–4 have the rotor resistance of designs A, B and D (0.065, 0.0792, 0.384) but x = 0.422 and e = 150 (their saved Settings): they were not made with the buttons, which also set x and e. The port shows them from their Settings, with the labels of the pictures. |
| N-IM-02 | note | The snapshots are drawn at 1.1 × the ImageSize: the plot is 528 × 330 px for 500 × 300 (the plot area is 410 px wide for the padded speed range −36.4 … 1856.4 and 254 px high for 0 … 700; AspectRatio 1/GoldenRatio limits the width). |
| N-IM-03 | note | Checked numerically (unit tests): the curve's maximum is at s = 1800 − 1800 r/x with the value 21.12 e²/(3600 x) = 0.0058667 e²/x (a brute-force search agrees); the full-load formula is the higher-speed root of T(s) = 100 (an independent solution of the quadratic); the locked-rotor arrow ↙ at {50, T(0) + 30} points at the curve's start. |
| N-IM-04 | note | The drawn "1725  rpm" keeps the double space with a no-break space (SVG text collapses spaces); the label's text in the hook is the original's. |
| N-IM-05 | note | The red label "full load / torque / 1725 rpm" gives the speed at which the motor delivers full-load (100 %) torque, the full-load speed; the label is terse (I-IM-01 would name it "full load speed"). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the torque–speed plot with the original's three labels and arrows, the three sliders and the NEMA buttons, the switch for E-IM-02 |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-IM-01 | Name the red label "full load speed" | the label says what its number is | the text differs from the original's snapshots | E-IM-01 |
| I-IM-02 | Say "no full-load point" when the largest torque is below 100 % | no complex number for typed values | only reachable outside the sliders' ranges | E-IM-03 |
| I-IM-03 | A PlotRange that grows with the maximum, or a note when the curve leaves the plot | the maximum stays visible for large e²/x | the picture's scale changes while sliding | Q-IM-02 |
| I-IM-04 | Show the NEMA design whose values are set (the pressed button highlighted until a slider moves) | the reader knows which design is shown | not in the original | F-IM-04 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-IM-03. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-IM-02 | mathematical | the "max torque" label `Round[(0.005866666666666667 e^2)/x, 1] "% full load"` with the speed `If[Round[1800 - 1800 r/x, 1] < 0, 0, …]` | for r > x the curve's maximum s = 1800 − 1800 r/x lies at a negative speed, outside the plot: the speed is set to 0 and the arrow moved to the locked-rotor torque, but the printed value is still the unconstrained maximum 0.0058667 e²/x, which the motor reaches at no plotted speed (e = 150, r = 1, x = 0.422: "313 % full load" at "0 rpm", where the curve is at 224 %) | kept: Q-IM-03 **Switch:** with "errors of the original: corrected" (A-IM-08, v0.1.41) — in that case the "max torque" label shows the largest torque on the plotted speeds, the locked-rotor torque at 0 rpm (the value the arrow points at); for r ≤ x nothing changes. | for r > x the label shows T(0), matching the arrow and the curve; no snapshot is affected (all have r < x); design D (r = x) gives the same value either way | switchable since v0.1.41 |
| E-IM-03 | mathematical | the full-load speed `(1/x^2)(-0.1056 e^2 r + 1800 x^2 + 0.1056 Sqrt[r^2 (e^4 - 2.90547520661157*^8 x^2)])` | when e⁴ < 2.905×10⁸ x² the largest torque is below 100 %: the motor cannot carry full load, the square root is imaginary and the label shows a rounded complex number, the arrow a complex position. With the sliders' ranges this cannot happen (the smallest e⁴/(2.905×10⁸ x²) is 1.36, at e = 130, x = 0.85); typed values can reach it (e < 120.4 at x = 0.85, or x > 0.991 at e = 130) | kept: the complex label, no arrow (K-IM-02); the page keeps typed values in range (D-IM-03), so only `window.__demo.setState` reaches it | a guard would print "no full-load point" (I-IM-02); nothing visible changes for values within the ranges | kept |
