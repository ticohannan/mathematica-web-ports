# Design document: Longitudinal Standing Waves

| | |
|---|---|
| Code version: | 0.1.42 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Longitudinal Standing Waves", contributed by Kenneth E. Caviness, published 2020-11-25 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/LongitudinalStandingWaves/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

A sound wave in an organ pipe of length L = 7 is the superposition of a wave moving right and its reflection moving
left. The Demonstration draws the selected harmonic of an open pipe (λ = 2L/n), a pipe closed at its right end
(λ = 4L/(2n − 1)) or an endless pipe (no reflection), animated in time, in several representations at once: vertical
"pressure contour" lines and scattered "density" points displaced left and right by the wave, the corresponding
transverse waves for comparison, the longitudinal envelope (arrows of the largest displacements), the transverse
envelope, and the labels of displacement and pressure nodes and antinodes (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/longitudinal-standing-waves.txt`) and checked against its snapshots
(`docs/original-snapshots/longitudinal-standing-waves-*.png`) and saved settings
(`tests/golden/longitudinal-standing-waves.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-LS-01: a student explores the Demonstration in a browser, without Mathematica: picks a harmonic and a pipe end,
  plays the animation and switches the representations on and off.
- UC-LS-02: Tico compares the port with the original (checklist `docs/checklists/longitudinal-standing-waves.md`), with
  the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LS-01 | Setter buttons "harmonic *n*" 1 … 7, default 3 (`ControlType -> Setter`, drawn as a setter bar, N-LS-02) | the original's control | v0.1.41 | e2e "has its controls with their defaults"; e2e "a harmonic button changes the wavelength and the picture" |
| F-LS-02 | Setter bar "pipe end": open, closed, none (default open) | the original's control | v0.1.41 | e2e "pipe end: closed draws the end line, none the zigzag and neither arrows nor labels" |
| F-LS-03 | TogglerBar "options" of ten toggle buttons with the original's labels and tooltips (+, →, ←, \|\|\|\|\|, ⋮⋮⋮⋮⋮, the transverse icon, ≡≡, ⋰⋱, displacement nodes, pressure nodes); the value is the list of the buttons on, in toggle order (default {1, 4, 7, 8}) | the original's control | v0.1.41 | e2e "the option buttons: tooltips, labels and the transverse icon"; e2e "the option buttons toggle with the mouse and the keyboard, in toggle order" |
| F-LS-04 | Trigger "time *t*" 0 … 1 with a play/pause button and faster/slower buttons only (AppearanceElements), looping without end (AnimationRepetitions → ∞) | the original's animation | v0.1.41 | e2e "the time Trigger plays, loops past 1 and goes faster" |
| F-LS-05 | What the options show: waves 1 sum, 2 right, 3 left as contour lines (with option 4), density points (with 5) and transverse curves (with 6); 8 the transverse envelope; 7 the arrows; 9 and 10 the labels; for an endless pipe no left wave and no transverse envelope (the original's intersections) | the original's logic | v0.1.41 | unit "which waves each option shows: the intersections of the original (by hand)" |
| F-LS-06 | Wavelength λ = 4L/(2n − Boole[end == "closed"]): 4L/(2n − 1) closed, 2L/n open and none | the original's model | v0.1.41 | unit "the wavelength: 4L/(2n − 1) for a closed pipe, 2L/n for an open pipe and for none" |
| F-LS-07 | The plot: the selected transverse curves (sum, right + ε, left − ε thick black, blue, red; the envelope ±H cos 2πx/λ dotted grey with the grey filling between; the pipe's border ∓(H + 2ε) black) for 0 ≤ x ≤ L, PlotRange 1, no axes, 550 × 150 with AspectRatio Automatic | the original's picture | v0.1.41 | unit "the transverse curves: sum, right + ε, left − ε, envelope ±H cos 2πx/λ, pipe ∓(H + 2ε)"; unit "Filling between the two envelope curves, grey at Opacity 0.2"; unit "the picture: Plot of x from 0 to L"; e2e "the opening picture: contour lines of the standing wave, the grey envelope, the arrows" |
| F-LS-08 | Contour lines: the 421 x of lineData moved by 0.07λ·f(x, t) (f = fRight + fLeft, fRight, fLeft), vertical lines −H … H in black, blue, red, only those inside the pipe | the original's longitudinal picture | v0.1.41 | unit "lineData = Range[-0.8(2L), L + 0.8(2L), .01L]"; unit "contour lines: each x of lineData moved by 0.07λ(fRight + fLeft)" |
| F-LS-09 | Density points: a cloud of 5000 random points thinned to points at least 0.1 apart (Union with SameTest), moved like the lines, only those inside the pipe (D-LS-01) | the original's density picture | v0.1.41 | unit "the point cloud: 5000 random points, sorted, no two closer than 0.1"; unit "Union with SameTest keeps a point unless it is near a point kept before it"; unit "density points: the cloud moved by 0.07λ(…) along x" |
| F-LS-10 | Longitudinal envelope (option 7): five rows of grey double-headed arrows between the "massaged" x-coordinates x + 0.075λ sin(4πx/λ) (26, 14, 10 or 6 steps per wavelength; closed pipes add L), set back by ε; a point where they are closer than 0.1 (hArrows, memoized) | the original's envelope | v0.1.41 | unit "hArrows: arrows between the massaged x-coordinates" |
| F-LS-11 | Labels (options 9, 10): N_d, A_d above the pipe and A_p, N_p below it at odd and even multiples of λ/4 up to L; not for an endless pipe | the original's labels | v0.1.41 | unit "node labels: N_d at λ/4 + kλ/2"; unit "options 7, 9, 10 add the arrows and labels, except for an endless pipe" |
| F-LS-12 | Pipe end: nothing (open), a line at L + ε (closed), a zigzag between L and L + 0.08 (none) | the original's picture | v0.1.41 | unit "pipe caps: nothing for open, a line at L + ε for closed" |
| F-LS-13 | The waves fRight, fLeft use the wavelength 28/9 saved with the original, whatever the harmonic (Q-LS-01, E-LS-01) | faithfulness: the snapshots show it | v0.1.41 | unit "the waves use the saved wavelength 28/9 for every harmonic"; unit "the contour lines fold over in the original" |
| F-LS-14 | An endless pipe ("none"): the "sum" is the right-moving wave alone | the original's model | v0.1.41 | unit "an endless pipe: the" |
| F-LS-15 | Opening state = the notebook's live state = the initial settings: n = 3, open, options {1, 4, 7, 8}, t = 0 | the saved state | v0.1.41 | unit "the opening state is the live state of the notebook and its initial settings"; e2e "has its controls with their defaults" |
| F-LS-16 | The seven snapshot settings give the snapshots' pictures (D-LS-01 for the points) | faithfulness | v0.1.41 | unit "the seven snapshot settings: wavelengths and what is shown"; e2e "the snapshot settings + screenshots for review"; M-LS-04 |
| F-LS-17 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.41 | M-LS-01 |
| A-LS-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-LS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, setClock) from the Manipulate layer | automated tests | v0.1.41 | e2e "has its controls with their defaults" |
| A-LS-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-LS-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-LS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-LS-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: longitudinal-standing-waves runs from its own folder" |
| A-LS-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-LS-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-LS-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-LS)"; e2e "errata switch on longitudinal-standing-waves: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-n-*` | F-LS-01 |
| `setter-end-*` | F-LS-02 |
| `toggler-options-*` | F-LS-03 |
| `trigger-*-t` | F-LS-04 |
| `reset` | A-LS-01 |
| `crumbs` | A-LS-04 |
| `details` | F-LS-17 |
| `credits` | A-LS-05 |
| `setter-errata-*` | A-LS-08 |
| `errata-details` | A-LS-08 |

## 6. Design

- `model.js` (pure): the original's Initialization in its order — T, L, ε, H, `plotstyle`, `pts` (`makePts`, with
  `unionNear` for Union with SameTest), `lineData`, `lop`, `lopPoints`, `fRight`, `fLeft` (with the saved λ = 28/9,
  `λSaved`), `myArrow` (with `setBack` for Arrow's setback), `hArrows` (memoized), `dlabels`, `plabels`,
  `transverseIcon`, `pipecaps` — then `evaluate(state)`: the shown lists, λ, the Plot of `shared/plot.js` with its
  Filling, PlotStyle and Epilog (pipe cap, contour lines, density points, arrows and labels as annotated parts:
  `pipe-cap`, `contours`, `density`, `end-display`, `longitudinal-envelope`, `displacement-labels`, `pressure-labels`).
  The view reports λ, the waves' wavelength, the shown lists, the contour positions, the density counts and the
  standing wave at x = L (the errata scenario).
- `main.js`: one `Manipulate` with `ControlPlacement: 'Top'`: a setter bar for n, a setter bar for the end, a
  `TogglerBar` (new in v0.1.41) with `Tooltip` labels, a `Trigger` with `AnimationRepetitions: Infinity` and
  `AppearanceElements`; the switch of `shared/errata.js`; after the controls are built, the picture `transverseIcon` is
  drawn as a 19 px SVG into option 6's button (N-LS-03).
- `index.html`: a page style keeps the spaces of the option labels (`white-space: pre`).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- longitudinal-standing-waves` → `dist/longitudinal-standing-waves/`.
- Contents (generated with `node tools/bundle-app.mjs longitudinal-standing-waves --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/longitudinal-standing-waves/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/longitudinal-standing-waves/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: longitudinal-standing-waves runs from its own folder" (A-LS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-LS-01 | deviation | The density points: Mathematica's random numbers cannot be reproduced, so the cloud comes from the seeded generator of `shared/random.js` (seed 1), made the original's way: 5000 points, x in −11.2 … 18.2, y in −0.6 … 0.6, sorted and thinned by Union with SameTest (distance < 0.1). The port's cloud has 1717 points, the original's 1718 (stored with the notebook's saved definitions); the pictures with points (snapshot 4) agree in density, not point by point. In the original the cloud is made once, in the Initialization, and stored with the definitions: it is the same in every evaluation and at every opening of the notebook. |
| D-LS-02 | deviation | Two drawing defaults measured on the snapshots instead of the layer's: Dotted (the envelope) is dots every 5 px (the layer's Dotted is 0.5 px on, 2 px off), and points are 3.3 px across (the layer's default PointSize 0.008 of the width would be 4.4 px). |
| D-LS-03 | deviation | The Trigger is the layer's: a play/pause button and two buttons ⇈ ⇊ that change the speed by 1.25× (Mathematica's factor is not known, K-LS-01); it runs 0 → 1 in 5 s and, past 1, starts again at 0 in the frame that passes 1. |
| D-LS-04 | deviation | AutorunSequencing {1, 2, 4} (Mathematica's Autorun in the ⊕ menu) is not ported; the port has no Autorun. |
| Q-LS-01 | quirk kept | fRight and fLeft use the global λ = 28/9 that the original stored with its definitions, not the Manipulate's λ (E-LS-01): every transverse wave has the wavelength 3.11, and the contour lines fold over into thick black bands where 0.14λ·2π/(28/9) > 1 (at the opening settings and in snapshots 1, 5 and 7). |
| Q-LS-02 | quirk kept | The Details number the snapshots 1–6; they are the second to seventh snapshot pictures (the first is the opening state). The port note says so. |
| Q-LS-03 | quirk kept | With pipe end "none" the options 3 (left wave) and 8 (transverse envelope) do nothing, and the "sum" is the right-moving wave. |
| K-LS-01 | known issue | Mathematica's Trigger: the time it takes for 0 → 1 and the factor of its faster/slower buttons are not measured (checklist M-LS-03). |
| N-LS-01 | note | Evidence for Q-LS-01: the Manipulate's saved Initialization holds λ = 28/9 together with longitudinalShown = {1}, densityShown = {} and transverseShown = {1, 4, 5, 6, 7} — global values left from evaluating the body outside its Module (n = 5, closed), unused except λ in fRight and fLeft. The curve of snapshot 2 repeats every 233 px = 3.10 units (75 px per unit), the wavelength 28/9 = 3.11, not this harmonic's 28/13 = 2.15. |
| N-LS-02 | note | `ControlType -> Setter` with a list of values is one Setter button per value; the layer's setter bar draws the same row of joined buttons (as the snapshots show it). |
| N-LS-03 | note | Option 6's label is a picture (transverseIcon, a Plot of Cos on 0 … 3π, 19 px wide). The layer's toggler labels are text, so the button's text is the stand-in "∿" (its accessible name, with the tooltip) and `main.js` draws the curve as an inline SVG over it, from the model's Plot data. |
| N-LS-04 | note | ImageSize {550, 150} with AspectRatio Automatic: Mathematica fits the padded range (x −0.14 … 7.14, y −1 … 1) into 550 × 150, so the picture is 546 × 150 (75 px per unit, as measured on the snapshots); the model passes the width 546 (the layer fits a width only). The page scales the picture with the window, as every app. |
| N-LS-05 | note | Union with SameTest: the original's saved cloud is sorted with no two points closer than 0.1, and has 1718 points; "sort, then keep a point unless it is near a kept one" gives 1717–1737 points for seeds 1–6, while thinning in drawing order and sorting afterwards gives 1545–1595. The port uses the first rule. |
| N-LS-06 | note | "->" in a Mathematica string is shown as an arrow by the front end (the snapshots show "→"); the port's label is "→". The other labels are the original's strings with their spaces. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the original's Initialization and body on shared/plot.js, the TogglerBar and the Trigger of the layer, the seeded point cloud; switch for E-LS-01 |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-LS-01 | Use the original's own point cloud (stored in the notebook's saved definitions: 1718 points) as golden data | the density pictures match the original point for point | 1718 pairs of numbers in the repository (CC BY-NC-SA data) | D-LS-01 |
| I-LS-02 | Name the closed pipe's modes by their harmonic number (n = 1, 2, 3 … are the harmonics 1, 3, 5 …) | the label states what is shown | not in the original | E-LS-03 |
| I-LS-03 | A slider or step buttons for the time | look at one moment of the wave | not in the original | F-LS-04 |
| I-LS-04 | Draw each wave's contour lines and points as one SVG path | smoother animation with many options on | rendering code for one app | F-LS-08, F-LS-09 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9): the wavelength relations, the node and antinode positions of
the labels (displacement s ∝ cos 2πx/λ, pressure ∝ −∂s/∂x), the envelopes, the arrows and the option logic against the
code and the snapshots, with the independent computations of the unit tests. Kind: conceptual, mathematical, numerical
or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-LS-01 | mathematical | `fRight[x_, t_] := Cos[2π(x/λ - t/T)]`, `fLeft[…]` (Initialization) used inside `Module[{…, λ}, … λ = 4L/(2n - Boole[end == "closed"]) …]` | fRight and fLeft read the global λ, not the Module's λ (λ$nnn); the global λ = 28/9 was saved with the definitions, so every wave, contour line and density point moves with the wavelength 28/9 whatever n and the pipe end, while the envelopes, the arrows, the labels and the displacement size 0.07λ use the harmonic's λ. The standing wave then misses its nodes and antinodes (at the opening settings it has a node at the open end), does not fit its envelope (snapshot 4), and the contour lines fold over into black bands (0.14λ·2π/(28/9) > 1) instead of bunching at the pressure antinodes that the Details' snapshots 4 and 6 describe | kept: the waves use 28/9 (Q-LS-01) **Switch:** with "errors of the original: corrected" (A-LS-08, v0.1.41) — fRight and fLeft use the selected wavelength λ = 4L/(2n − Boole[end == "closed"]): the standing wave has its antinodes at the open ends and a node at a closed end, fits its envelope, and the contour lines and density points bunch at the pressure antinodes without folding over. | every picture with a wave changes (all snapshots but the sixth); the standing wave at the open end of the opening settings becomes −0.6 (an antinode) instead of 0; the contour lines never fold (slope 1 − 0.88 sin > 0); golden settings unchanged | switchable since v0.1.41 |
| E-LS-02 | text | Details: "Closed pipe: L = n(λ/2) + λ/4 = ((2n+1)λ)/4 ⟷ λ = (4L)/(2n+1), n = 0, 1, 2, …" | the formula counts n from 0, but the control "harmonic n" runs 1 … 7 and the code uses λ = 4L/(2n − 1): with the control's n the Details' formula gives the next mode (n = 1: 4L/3 instead of the fundamental 4L) | kept (the Details are the original's text) | none on the picture; the Details would read λ = 4L/(2n − 1), n = 1, 2, 3, … | kept |
| E-LS-03 | text | the control label "harmonic n" with pipe end "closed"; Details' Snapshot 1 "the … seventh harmonic in a closed pipe" | a pipe closed at one end has only odd harmonics: the mode λ = 4L/(2n − 1) has the frequency (2n − 1)·f₁, so n is the mode number, not the harmonic; n = 7 closed (snapshot 2's settings) is the 13th harmonic | kept | the label for closed pipes would name the harmonic 2n − 1 (I-LS-02); the open pipe is right as it is | kept |
