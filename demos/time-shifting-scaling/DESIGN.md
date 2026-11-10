# Design document: Time Shifting and Time Scaling in Signal Processing

| | |
|---|---|
| Code version: | 0.1.34 |
| Document revision | 2 (2026-11-06) — implemented after the owner's "go" (Q-1: the lower plot of even-odd-synthesis at 500 px); compared with the four snapshots |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Time Shifting and Time Scaling in Signal Processing", contributed by Aaron T. Becker and Mable Wan, published 2016-06-21 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/TimeShiftingAndTimeScalingInSignalProcessing/> |
| Port files | `model.js` (the five signals as break-point lists, the coupling of a, b and T, the two plots; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, simple mode (v0.1.33): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

Time scaling and time shifting of a signal: y(t) = x(at − b) = x(a(t − T)) with T = b/a. The user picks one of five
piecewise signals (RampDown, TopHat, StairStep, Triangle and "UH", the initials of the University of Houston drawn as
a signal), sets the scale a and either the shift b or the delay T (the two are coupled), and chooses which of x(t),
y(t), z(t) = x(t − b) and w(t) = x(at) are drawn. The top plot shows x(t) with the points T and b; the bottom plot the
chosen signals.

Source as text: [`docs/original-source/time-shifting-scaling.txt`](../../docs/original-source/time-shifting-scaling.txt); snapshots `docs/original-snapshots/time-shifting-scaling-1…4.png`; saved states `tests/golden/time-shifting-scaling.original-states.json`. The saved definitions in the output cell (PG-R-21) hold the same signal lists as the
initialization cell (checked 2026-11-06; the UH lists as evaluated: 66 break points).

## 2. Scope

In scope: the whole Manipulate (signal setter, sliders a, b, T, the "display" checkbox bar, the two plots), caption
and Details. Out of scope: the first, overwritten definitions of `uhT`/`uhX` (N-TS-02).

## 3. Users and use cases

- UC-TS-01: a student sees what scaling by a and shifting by b do, and why y(t) = x(a(t − T)) with T = b/a.
- UC-TS-02: a student compares the intermediate signals z(t) = x(t − b) and w(t) = x(at) with y(t).

## 4. Features

Source: the Manipulate and the initialization cell. Break-point lists (t, x): RampDown and Triangle are drawn
joined (`InterpolationOrder -> 1`), TopHat, StairStep and UH as steps (`InterpolationOrder -> 0`); ±10000 pad the ends.

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TS-01 | Setter bar `signal` {"RampDown", "TopHat", "StairStep", "Triangle", "UH"}, initially "RampDown" | the input signal | v0.1.33 | e2e "has its controls with their defaults"; unit "the five signals" |
| F-TS-02 | Slider b `{{β, 4, TraditionalForm[b]}, -10, 20, 0.1, ImageSize -> Small, Appearance -> "Labeled"}` | the shift | v0.1.33 | e2e "has its controls with their defaults" |
| F-TS-03 | Slider a `{{α, 2, TraditionalForm[a]}, -4, 4, 0.1, ImageSize -> Medium, Appearance -> "Labeled"}` | the scale | v0.1.33 | e2e "has its controls with their defaults" |
| F-TS-04 | Slider T `{{τ, 2, TraditionalForm[T == b/a]}, -10, 20, 0.1, ImageSize -> Small, Appearance -> "Labeled"}`, its value always a machine real (shown "2.") | the delay | v0.1.33 | e2e "has its controls with their defaults" |
| F-TS-05 | Coupling through the hidden variables bOld, aOld, TOld (`{{bOld, 0}, None}` …): a change of b sets T = b/a; a change of T sets b = T a; a change of a sets T = b/a; with a = 0 nothing is coupled and y, w are drawn with t × 10000 | b and T are two views of one shift | v0.1.33 | unit "b, a and T stay coupled as in the original"; e2e "moving T moves b"; M-TS-07 |
| F-TS-06 | Checkbox bar "display: " `checked` {1 → x(t), 2 → y(t) = x(at − b) = x(a(t − T)), 3 → z(t) = x(t − b), 4 → w(t) = x(at)}, initially {1, 2}; an unchecked curve is not drawn (the original moves it off the real axis), its legend entry stays | which signals are drawn | v0.1.33 | e2e "the display checkboxes hide and show the curves" |
| F-TS-07 | Top plot: `ListLinePlot[{x}]`, 600 × 200, PlotRange {{−10, 20}, {−1/2, 9/2}}, Thickness 0.005, legend x(t) placed at {0.1, 0.6}, AxesLabel {"time (s)", "signal"}, Epilog: red point T at (T, 0) with an italic "T" (18 pt) at (T − 1/2, 0.5), green point b at (b, 0) with "b" at (b − 1/2, 0.25) | the input and the two parameters | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-TS-08 | Bottom plot: the same frame with x(t) (default blue), y(t) at t = (t_x + b)/a (red), z(t) at t_x + b (the default third colour, D-TS-02), w(t) at t_x/a (default 4th colour), the four legend entries at {0.15, 0.6}, the same Epilog | the transformed signals | v0.1.33 | unit "y, z and w are x at the transformed times"; e2e "loads without errors and draws the picture" |
| F-TS-09 | The two plots in a column; controls in a 2 × 2 grid above (signal, b / a, T), the checkbox bar below | layout | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-TS-10 | Opening state: RampDown, b = 4, a = 2, T = 2, checked {1, 2} | the Manipulate's initial values | v0.1.33 | unit "the opening state" |
| F-TS-11 | The four snapshot settings load and give the original's pictures | parity with the original | v0.1.33 | e2e "the four snapshot settings" |
| F-TS-12 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.33 | M-TS-01 |
| A-TS-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.33 | e2e "Initial settings restores the opening state" |
| A-TS-02 | Test and automation hook `window.__demo` from the Manipulate layer | automated tests | v0.1.33 | e2e "moving T moves b" |
| A-TS-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.33 | e2e "start-up notice when" |
| A-TS-04 | Breadcrumb link to all demos | navigation | v0.1.33 | inventory |
| A-TS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.33 | e2e "attribution on" |
| A-TS-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.33 | e2e "bundle: time-shifting-scaling runs from its own folder" |
| A-TS-07 | Landing-page thumbnail `thumbnail.webp` | owner request 2026-11-05 | v0.1.33 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TS-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-TS-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-10: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.34 | unit "corrected mode (E-TS)"; e2e "errata switch on time-shifting-scaling: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-signal-*` | F-TS-01 |
| `*-β` | F-TS-02 |
| `*-α` | F-TS-03 |
| `*-τ` | F-TS-04 |
| `checkbar-checked-*` | F-TS-06 |
| `reset` | A-TS-01 |
| `crumbs` | A-TS-04 |
| `details` | F-TS-12 |
| `credits` | A-TS-05 |
| `setter-errata-*` | A-TS-08 |
| `errata-details` | A-TS-08 |

## 6. Design

- `model.js` (pure): the initialization cell (`UHsignal`, the five break-point lists, the second `uhT`/`uhX`);
  `couple(state)` — the three `If`s of the body applied until bOld, aOld and TOld stop changing, which is what
  Mathematica's re-evaluation of a body that sets its own variables is assumed to give (K-TS-01; every snapshot is
  already at this fixed point, so the golden data cannot show it; M-TS-07 checks it); `evaluate(state)` → `{ state, view,
  graphics }`: the transformed times, unchecked curves as NaN times (not drawn, legend kept), two
  `ListLinePlot`s of `shared/plot.js` with `InterpolationOrder` 0 or 1 (S-3), `Placed` legends and the Epilog.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, two pictures in a column; the Grid of controls as two Rows
  (D-TS-01), the T slider with a `format` that always shows a machine real ("2."), the hidden bOld, aOld, TOld and the
  checkbox bar (`ControlType: CheckboxBar`, S-4) with the four typeset legend labels.
- Size: model 128 lines, main 36 lines (the WL body is 76 lines, the initialization 15).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- time-shifting-scaling` → `dist/time-shifting-scaling/`.
- Contents (generated with `node tools/bundle-app.mjs time-shifting-scaling --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/time-shifting-scaling/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/time-shifting-scaling/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: time-shifting-scaling runs from its own folder" (A-TS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-TS-01 | deviation | Controls: the 2 × 2 `Grid` of controls is drawn as two rows of the shared layer (columns not aligned as in a Grid); `TraditionalForm` labels typeset with italic letters and a stacked b/a. |
| D-TS-02 | deviation | Colours: `ColorData[3][[3]]` (the style of z) is a part of the colour scheme's expression, not a colour, so Mathematica draws z in the default third colour ColorData[97][[3]] (measured on snapshot 2: RGB 143, 176, 50); `ColorData[3, "ColorList"][[4]]` (the point b and its label) is not in the shared code (only ColorData[97]): the port uses RGB(138, 182, 7) measured in the middle of the point on snapshots 1, 2 and 4. |
| Q-TS-01 | quirk kept | A hidden curve keeps its legend entry (snapshots 1, 2, 4). |
| Q-TS-02 | quirk kept | T is shown as a machine real ("2."), b and a as typed. T can leave its slider's range (a = 0.1, b = 4 gives T = 40): the slider then sits at its end while the value is kept. |
| Q-TS-03 | quirk kept | a = 0: y and w are drawn at t × 10000 (as the original's `Ty := 10000 Tx`): x stretched 10000 times about t = 0, so the window shows x(0−) left and x(0+) right of 0, and y ignores b; T keeps its last value. |
| N-TS-01 | note | Snapshots 2 and 3 have the same settings (TopHat, b = 4, a = 2, checked {1, 2, 3}); their pictures differ only in pixels. |
| N-TS-02 | note | The initialization cell defines `uhT`/`uhX` twice; the first, hand-written lists are overwritten by the second (sampled from `UHsignal` every 1/9). |
| D-TS-03 | deviation | Image padding set by hand ({{24, 60}, {18, 14}} px) for the tick and axes labels; the lower legend placed with its left edge at the plot's left (Mathematica centres it at {0.15, 0.6}; the port's legend text is wider and a legend is clipped to the plot range in the shared layer). |
| D-TS-04 | deviation | b keeps its exact display ("4") after a change of T until b's own slider is moved; in Mathematica b = 1.0 T a is then a machine real ("4.2" either way; "4." only when the value is whole). |
| K-TS-01 | known issue (lead) | Two assumptions not yet checked in Mathematica (M-TS-07): the front end evaluates the body again after it changed bOld, aOld or TOld until they stop changing (without that, a change of a would leave T stale for one evaluation); and the CheckboxBar's value lists the values in the order they were checked (the port appends; the pictures do not depend on the order). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TS-01 | approved (owner request 2026-11-10), implemented in v0.1.34 as A-TS-08 | owner / 2026-11-10 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-TS-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.33 | 2026-11-06 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-06) |
| 2 | v0.1.33 | 2026-11-06 | implemented after the owner's "go" (2026-11-06); shared additions S-1 … S-7: `shared/plot.js` Exclusions/ExclusionsStyle, PlotMarkers, InterpolationOrder 0; `shared/ui-extra.js` + `shared/manipulate.js` CheckboxBar; `shared/svg-plot.js` + `shared/manipulate.js` LocatorAutoCreate; `shared/wl.js` HeavisidePi; `shared/graphics.js` JoinForm; compared with the four snapshots |
| 3 | v0.1.34 | 2026-11-10 | A-TS-08: the switch "errors of the original: kept \| corrected" (owner request 2026-11-10); corrected mode for E-TS-01, default kept: the original's behaviour, golden data and pictures unchanged |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TS-01 | Hide the legend entries of hidden curves | the legend matches the picture | differs from the original | Q-TS-01 |
| I-TS-02 | Show y(t) = x(−b) (a constant) for a = 0 | correct for a = 0 | differs from the original | E-TS-01 |
| I-TS-03 | Widen the T slider or clamp T | the T slider always shows T | differs from the original | Q-TS-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-06 against the notebook (signals, transformed times, legends, Details).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TS-01 | mathematical | `If[α == 0, Ty := 10000 Tx; Tw := 10000 Tx, …]` | for a = 0, y(t) = x(−b) and w(t) = x(0) are constants; the original draws x stretched 10000 times instead (and T = b/a is undefined) | keeps it (Q-TS-03) **Switch:** with "errors of the original: corrected" (A-TS-08, v0.1.34) — for a = 0 both are the constants they are: y(t) = x(−b) and w(t) = x(0), drawn as horizontal lines (at a jump of x the value just after the jump). Every other value of a is unchanged. | I-TS-02 | switchable since v0.1.34 |
| E-TS-02 | text | Details: "When \|a\| < 1, the signal is expanded. When \|a\| > 1, the signal is compressed." | true, but for a < 0 the signal is also reversed in time, which the text does not mention while the slider allows −4 … 4 | keeps the text | add "a < 0 reverses the signal" | open |
| E-TS-03 | conceptual | the "display" legend | an unchecked curve's legend entry stays (Q-TS-01): the legend lists curves that are not drawn | keeps it | I-TS-01 | open |

