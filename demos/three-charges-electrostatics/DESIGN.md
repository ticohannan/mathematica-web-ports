# Design document: Electrostatics of a Linear System of Three Charged Particles

| | |
|---|---|
| Code version: | 0.1.41 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Electrostatics of a Linear System of Three Charged Particles", contributed by Whasington Silvestre, published 2022-12-01 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ElectrostaticsOfALinearSystemOfThreeChargedParticles/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`, with an app-local slider over a list of values), `index.html` |

## 1. Purpose and background

Three point charges on a line: two sources *q*<sub>1</sub>, *q*<sub>2</sub> at *x*<sub>1</sub>, *x*<sub>2</sub> and a
"target particle" *q*<sub>t</sub> at *x*<sub>t</sub> (charges in μC, positions in m). The Demonstration shows the
Coulomb forces on the target (N), the fields of the sources at its place (MN/C), the net force and field as curves
along the line, and the equilibrium position *x*<sub>e</sub> where the two forces cancel. Two small figures at the top
show the directions and the relative sizes of the two forces on *q*<sub>t</sub> and of the two fields at
*x*<sub>t</sub>. It is meant for an introductory course on electrostatics (Coulomb's law, superposition, equilibrium).

## 2. Scope

In scope: every control, the plot with its curves, points, labels, the two data tables, the orange equilibrium point
and the two arrow figures, the caption. Out of scope: anything the original does not do. The original has no Details
text (the page has none); its keywords and related links are not shown.

## 3. Users and use cases

- UC-TA-01: a student moves the charges and the target and watches the force and field arrows change direction and size.
- UC-TA-02: a student finds the equilibrium position of the target for like and unlike source charges, and sees that
  equal and opposite charges have none ("±∞").
- UC-TA-03: a teacher shows the net force and field along the line with the two curves and reads exact values in the tables.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TA-01 | Charge sliders `{{q1, 5, Row[{Subscript[q, 1], " (μC)"}]}, Drop[Range[-20, 20, 1], {21}], ControlType -> Manipulator, Appearance -> "Labeled", ImageSize -> Small}`, the same for `q2` (5) and `qt` (−5): 40 positions, −20 … −1, 1 … 20 (no 0); the value field shows the value | the three charges in μC | v0.1.41 | e2e "has its controls with their defaults"; e2e "a charge slider skips 0 with the keyboard"; e2e "a typed charge goes to the nearest value of the list"; unit "the charge sliders run over −20 … 20 without 0" |
| F-TA-02 | Position sliders `{{x1, 0, …}, -10, 10, 1}`, `{{x2, 5, …}, -10, 10, 1}`, `{{xt, -8., …}, -10 + 0.5, 10 - 0.5}` (continuous), `Appearance -> "Labeled"`, `ImageSize -> Small`; `xt` is shown as a real ("-8.") | the positions in m | v0.1.41 | e2e "has its controls with their defaults"; e2e "dragging the position sliders with the mouse moves the charges" |
| F-TA-03 | The controls in a `Grid` at the top (charges, then positions) and a `Row` of four checkboxes "plot net force (N)", "plot net field (MN/C)", "show data at *x*<sub>t</sub>", "show equilibrium data" (all False at the start), `ControlPlacement -> Top` | choose what the picture shows | v0.1.41 | e2e "the checkboxes show the curves and the tables"; e2e "has its controls with their defaults" |
| F-TA-04 | `f1t`, `f2t`, `fnet` with `k = 8.99*10^9`, `a = 10^-6`: F = k q<sub>t</sub> q a² (x<sub>t</sub> − x)/\|x<sub>t</sub> − x\|³ in N | Coulomb's law with charges in μC | v0.1.41 | unit "f1t, f2t and fnet follow Coulomb's law (hand values)" |
| F-TA-05 | `Plot[{fnet[…, x, …], fnet[…, x, …]/qt}, {x, -10, xt}, Exclusions -> {x1, x2}, AspectRatio -> 1, AxesStyle -> Arrowheads[{-0.03, 0.03}], PlotStyle -> {If[force, Blue, Transparent], If[field, Green, Transparent]}, PlotRange -> {{-10, 10}, {-5, 5}}, ImageSize -> {425, 425}, Ticks -> {{-8, -6, -4, -2, 2, 4, 6, 8}}]`: the net force (blue) and net field (green) along the line, from −10 to x<sub>t</sub> only (Q-TA-01) | the force and field as functions of the target's position | v0.1.41 | unit "the plot runs from −10 to xt only, and an unchecked curve is transparent"; e2e "the checkboxes show the curves and the tables"; e2e "snapshot 2: the settings give the snapshot's picture and tables" |
| F-TA-06 | The charges as points (`PointSize[0.03]`; Red for a positive, Black for a negative charge) with a white "+" or "-" and the labels *q*<sub>1</sub>, *q*<sub>2</sub>, *q*<sub>t</sub> below them (`FontSize -> 16`) | where the charges are and their signs | v0.1.41 | e2e "loads without errors and draws the opening picture"; e2e "a charge slider skips 0 with the keyboard" |
| F-TA-07 | "show data at *x*<sub>t</sub>": the table (`Grid`, `Frame -> All`, `Background -> LightBlue`, `BaseStyle -> 12`, inset at {−5, 2.5}) of *x*<sub>t</sub>, *F*<sub>1t</sub>, *F*<sub>2t</sub>, *F*<sub>net</sub> (N), *E*<sub>1</sub>, *E*<sub>2</sub>, *E*<sub>net</sub> (MN/C), the numbers as `NumberForm[q*1., {8, 4}, ExponentFunction -> (Null &)]` | exact values at the target | v0.1.41 | unit "the tables at the four snapshots' settings are those of the snapshot pictures"; unit "nf writes NumberForm[q 1., {8, 4}] as the tables show it"; e2e "the checkboxes show the curves and the tables" |
| F-TA-08 | "show equilibrium data": `root = Quiet[NSolve[(q1/Abs[x-x1]^3)(x-x1) + (q2/Abs[x-x2]^3)(x-x2) == 0, x, Real]]`; one root: the table (Background LightOrange, at {5, 2.5}) of *x*<sub>e</sub> and the forces and fields there, and an orange point at {x<sub>e</sub>, 0}; no root: "±∞"; every x (x<sub>1</sub> = x<sub>2</sub>, q<sub>1</sub> = −q<sub>2</sub>): "everywhere" | where the target would be in equilibrium | v0.1.41 | unit "the equilibrium agrees with an independent scan of the line"; unit "opposite equal charges: no finite equilibrium (±∞); x1 == x2: everywhere when q1 + q2 = 0"; e2e "equal and opposite charges: ±∞, and everywhere when they coincide"; e2e "snapshot 3: the settings give the snapshot's picture and tables" |
| F-TA-09 | The field in MN/C as the force divided by q<sub>t</sub> in μC ("dividing by qt instead of qt*a to scale the field"), also for the green curve | fields of a size comparable to the forces | v0.1.41 | unit "the field in MN/C is the force divided by qt in μC" |
| F-TA-10 | The figure at the upper left (arrows `af1t`, `af2t` either side of a small *q*<sub>t</sub> at {−5, 4.5}) and at the upper right (arrows `ae1`, `ae2` either side of *x*<sub>t</sub> at {5, 4.5}): the direction of each force/field, the larger one 2 units long, the other 1 (`Arrowheads[Small]`, not to scale) | directions and the stronger contribution at a glance | v0.1.41 | unit "the arrow icons follow the sizes and directions of the original"; e2e "loads without errors and draws the opening picture" |
| F-TA-11 | Opening state = the notebook's live state = the initial settings (q1 = 5, q2 = 5, qt = −5, x1 = 0, x2 = 5, xt = −8., all boxes unchecked; also snapshot 1) | the original's opening picture | v0.1.41 | unit "the opening state is the notebook's live state and the initial settings"; e2e "has its controls with their defaults"; e2e "snapshot 1: the settings give the snapshot's picture and tables" |
| F-TA-12 | Caption text (three paragraphs, from the notebook) | the original's explanation | v0.1.41 | M-TA-01 |
| F-TA-13 | The four snapshots' settings give their pictures and table values (tables compared with the numbers in the snapshot pictures) | parity with the original | v0.1.41 | e2e "snapshot 2: the settings give the snapshot's picture and tables"; e2e "snapshot 4: the settings give the snapshot's picture and tables"; unit "the tables at the four snapshots' settings are those of the snapshot pictures"; M-TA-09 |
| F-TA-14 | x<sub>t</sub> typed onto x<sub>1</sub> or x<sub>2</sub>: "Indeterminate" in the table, no arrows in the two figures (Q-TA-03, K-TA-02) | the original's behaviour at a singular place | v0.1.41 | unit "xt on a charge gives Indeterminate and no icon arrows"; e2e "xt typed onto x1 shows Indeterminate and no icon arrows"; M-TA-08 |
| A-TA-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-TA-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.41 | e2e "snapshot 3: the settings give the snapshot's picture and tables" |
| A-TA-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-TA-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-TA-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-TA-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: three-charges-electrostatics runs from its own folder" |
| A-TA-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TA-08 | Port note under the caption: the charge sliders skip 0; x<sub>t</sub> typed onto a charge | says what the page does where it is unusual | v0.1.41 | M-TA-01 |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-q1` | F-TA-01 |
| `value-q1` | F-TA-01 |
| `plus-q1` | F-TA-01 |
| `play-q1` | F-TA-01 |
| `stepback-q1` | F-TA-01 |
| `stepfwd-q1` | F-TA-01 |
| `slider-q2` | F-TA-01 |
| `value-q2` | F-TA-01 |
| `plus-q2` | F-TA-01 |
| `play-q2` | F-TA-01 |
| `stepback-q2` | F-TA-01 |
| `stepfwd-q2` | F-TA-01 |
| `slider-qt` | F-TA-01 |
| `value-qt` | F-TA-01 |
| `plus-qt` | F-TA-01 |
| `play-qt` | F-TA-01 |
| `stepback-qt` | F-TA-01 |
| `stepfwd-qt` | F-TA-01 |
| `slider-x1` | F-TA-02 |
| `value-x1` | F-TA-02 |
| `plus-x1` | F-TA-02 |
| `play-x1` | F-TA-02 |
| `stepback-x1` | F-TA-02 |
| `stepfwd-x1` | F-TA-02 |
| `slider-x2` | F-TA-02 |
| `value-x2` | F-TA-02 |
| `plus-x2` | F-TA-02 |
| `play-x2` | F-TA-02 |
| `stepback-x2` | F-TA-02 |
| `stepfwd-x2` | F-TA-02 |
| `slider-xt` | F-TA-02 |
| `value-xt` | F-TA-02 |
| `plus-xt` | F-TA-02 |
| `play-xt` | F-TA-02 |
| `stepback-xt` | F-TA-02 |
| `stepfwd-xt` | F-TA-02 |
| `check-force` | F-TA-03 |
| `check-field` | F-TA-03 |
| `check-status` | F-TA-03 |
| `check-edata` | F-TA-03 |
| `reset` | A-TA-01 |
| `crumbs` | A-TA-04 |
| `credits` | A-TA-05 |

## 6. Design

- `model.js`: the original's Module in its order — `k`, `a`, `f1t`, `f2t`, `fnet`, `equilibrium` (the `root` of NSolve
  in Mathematica's list form: `[]` = {}, `[[]]` = {{}}, `[[xe]]` = {{x → xe}}), `arrows` (af1t, af2t, ae1, ae2 with the
  sizes f1ts, f2ts, e1s, e2s), `nf`, `tableRows`, and `evaluate(state)` → `{ view, graphics }`: the `Plot` of
  `shared/plot.js` with the Epilog as Graphics data. Test ids in the picture: `charge-1`, `charge-2`, `charge-t`
  (`data-color`), `sign-*`, `table-xt`, `table-eq`, `equilibrium-point` (`data-x`), `arrow-f1t`, `arrow-f2t`, `arrow-e1`,
  `arrow-e2`, `icon-qt`, `icon-xt`, `axis-arrowheads`, `force-curve` and `field-curve` (`data-visible`).
- The equilibrium: the line is cut at the charges; on each piece the equation is one quadratic, solved in closed form
  for the root on that piece (N-TA-02). The unit test compares it with an independent scan of the line (sign changes and
  bisection) for 240 combinations of charges and positions.
- The tables are drawn app-locally (background rectangle, frame lines, texts) with the sizes measured in the snapshots
  (D-TA-02); the axis arrowheads are drawn in the Epilog (D-TA-03).
- `main.js`: one `Manipulate({…})` — the controls in Mathematica's form: three Rows (the Grid's two rows and the Row of
  checkboxes); the charge sliders are `Control(listManipulator, { values: CHARGES })`, an app-local slider over the
  positions 1 … 40 that shows and reports the list's values (N-TA-01).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- three-charges-electrostatics` → `dist/three-charges-electrostatics/`.
- Contents (generated with `node tools/bundle-app.mjs three-charges-electrostatics --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/three-charges-electrostatics/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/three-charges-electrostatics/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: three-charges-electrostatics runs from its own folder" (A-TA-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-TA-01 | deviation | The charge sliders: the Manipulate layer has no slider over a list of values, so an app-local one runs over the positions 1 … 40 and shows and reports `CHARGES[[k]]` (the same 40 positions as Mathematica's Manipulator). A typed value goes to the nearest value of the list (0 → −1, the lower on a tie); what Mathematica does with a typed value that is not in the list is not checked (M-TA-07). |
| D-TA-02 | deviation | The two tables are drawn from rectangles, lines and texts with the sizes measured in the snapshots (columns 36, 96, 45 px, rows 16.9 px for `ItemSize -> {{3, 9, 4}}`, `BaseStyle -> 12`): the shared `Grid` has no per-column `ItemSize`. Fonts are the browser's, so the texts differ slightly in width. |
| D-TA-03 | deviation | `AxesStyle -> Arrowheads[{-0.03, 0.03}]` is drawn as plain triangular heads at both ends of each axis in the axis grey (the layer has no `AxesStyle`); Mathematica's heads are notched. `Arrowheads[Small]` of the two small figures is 0.016 of the picture's width, measured in the snapshots (heads about 7 px long). |
| D-TA-04 | deviation | The checkboxes: each label before its box, as in Mathematica, with app-local CSS; `Spacer[5]` and `Spacer[15]` between them are the row's ordinary gaps. |
| D-TA-05 | deviation | The curves are sampled at 400 points plus the layer's refinement (not Mathematica's adaptive sampler); values beyond ±10⁵ (the picture shows ±5) are held there before drawing, because a browser drops a path with coordinates near 10¹⁶, as the samples next to a charge give. The visible parts of the curves do not change. |
| Q-TA-01 | quirk | The curves run from −10 to x<sub>t</sub> only (`{x, -10, xt}`): the net force and field are drawn on the left of the target particle, not on the whole line (snapshots 2–4 show it). Kept. |
| Q-TA-02 | quirk | `Ticks -> {{-8, -6, …, 8}}` marks the y axis with the same list: −4, −2, 2, 4 within the range, no minor ticks (as the snapshots show). |
| Q-TA-03 | quirk | x<sub>t</sub> typed onto x<sub>1</sub> or x<sub>2</sub> (the field accepts any number): `Abs[xt - x1]^3 = 0` and the force is 0/0 = Indeterminate; the table shows "Indeterminate" for that force, the net force and the fields (E-TA-02). |
| Q-TA-04 | quirk | x<sub>1</sub> = x<sub>2</sub>: the two charges are drawn on top of each other (q<sub>2</sub> over q<sub>1</sub>, their labels overlap). The physics is right: the pair acts as one charge q<sub>1</sub> + q<sub>2</sub>. |
| Q-TA-05 | quirk | The orange point is always drawn; when it is not to be seen it is placed at x = 20, outside the picture. An equilibrium outside −10 … 10 is listed in the table but its point is outside the picture. |
| Q-TA-06 | quirk | The arrow sizes compare \|F<sub>1t</sub>\| with \|F<sub>2t</sub>\| (and \|E<sub>1</sub>\| with \|E<sub>2</sub>\|) with `>`: equal sizes (e.g. at the equilibrium, up to rounding) give both arrows length 1. |
| K-TA-01 | known issue | x<sub>1</sub> = x<sub>2</sub> with q<sub>1</sub> + q<sub>2</sub> ≠ 0: the equation becomes (q<sub>1</sub> + q<sub>2</sub>)(x − x<sub>1</sub>)/\|x − x<sub>1</sub>\|³ == 0; the port gives no root ("±∞"), assuming NSolve rejects x = x<sub>1</sub> (where the left side is 0/0). Not checked in Mathematica (M-TA-07). |
| K-TA-02 | known issue | x<sub>t</sub> on a charge: in Mathematica `If[Abs[Indeterminate] > …, 2, 1]` stays unevaluated, so the four arrows of the small figures get coordinates that are not numbers; such an `Arrow` is not a valid primitive and Mathematica probably marks the whole picture as erroneous (pink background). The port leaves out the four arrows and draws the rest. To be checked (M-TA-08). |
| K-TA-03 | known issue | A value that rounds to 0.0000 keeps the sign of its rounding residual: at snapshot 4 the original shows "−0.0000" for *E*<sub>net</sub> at the equilibrium, the port "0.0000" (its root differs from NSolve's in the last bits). All other digits of the four snapshots agree. |
| N-TA-01 | note | `listManipulator` in `main.js` (a slider over a list of values for `ControlType -> Manipulator`) and the measured `Arrowheads[Small]` are candidates for the shared layer; `Drop[list, {n}]` is written `Drop(list, [n, n])` because `shared/wl.js` reads a list as {m, n}. |
| N-TA-02 | note | There is never more than one real equilibrium when x<sub>1</sub> ≠ x<sub>2</sub>: between the charges a root exists iff q<sub>1</sub>q<sub>2</sub> > 0 (the left side falls monotonically from +∞ to −∞, or rises), outside iff q<sub>1</sub>q<sub>2</sub> < 0 and then only beyond the weaker charge, when \|q<sub>1</sub>\| ≠ \|q<sub>2</sub>\|. So `root[[1, 1, 2]]` never has to choose between roots. |
| N-TA-03 | note | Units: F/q<sub>t</sub> with q<sub>t</sub> in μC is in N/μC = 10⁶ N/C = MN/C, so the comment "dividing by qt instead of qt*a to scale the field" and the label "MN/C" agree (e.g. E<sub>1</sub> at snapshot 2: k · 5 μC/(9.5 m)² = 498 N/C = 0.0005 MN/C, as the table shows). |
| N-TA-04 | note | `nf`: 4 digits after the point, at most 8 significant digits (further ones shown as zeros), no exponent, the typeset minus "−", "Indeterminate" for 0/0. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: model, controls (charge sliders over the list without 0), plot with the two tables, the equilibrium and the arrow figures; compared with the four snapshots |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TA-01 | A slider over a list of values (`ControlType -> Manipulator` with a list) in `shared/manipulate.js` | other ports with such sliders need no local code | a shared change with its own tests | D-TA-01, N-TA-01 |
| I-TA-02 | `Grid` with per-column `ItemSize` and `AxesStyle` with `Arrowheads` in the shared layer | the tables and axis heads without local drawing code | a shared change | D-TA-02, D-TA-03 |
| I-TA-03 | Keep x<sub>t</sub> off the charges (or show "undefined" in the table and keep the figures) | no "Indeterminate" and no broken figures | departs from the original | E-TA-02, Q-TA-03 |
| I-TA-04 | Draw the curves over the whole line with a marker at x<sub>t</sub> | the force and field on both sides of the target | departs from the original's picture | Q-TA-01 |
| I-TA-05 | Show the stability of the equilibrium (stable or unstable along the line, which depends on the sign of q<sub>t</sub>) | a further lesson from the same picture | new text to design | F-TA-08 |

## 11. Errors in the original (conceptual and mathematical)

Checked: the force formula and its sign (unit test with hand values), the units of the field (N/μC = MN/C, N-TA-03),
the field directions of the arrow figure (E = F/q<sub>t</sub>), the equilibrium (closed form against an independent scan,
N-TA-02), "±∞" and "everywhere", the tables at the four snapshots, x<sub>t</sub> on a charge, x<sub>1</sub> = x<sub>2</sub>.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TA-01 | mathematical | `root = Quiet[NSolve[(q1/(Abs[x-x1])^3)*(x-x1) + ((q2)/(Abs[x-x2])^3)*(x-x2) == 0, x, Real]]` | `Real` is not a domain (`Reals` is); Mathematica takes an unknown third argument as a variable to eliminate (the warning is hidden by `Quiet`) and solves over the complex numbers. No visible effect: the field of two point charges vanishes only on the line through them, so there are no other solutions, and the snapshots show the real root. | finds the real roots on the line (N-TA-02), the result `Reals` would give | none visible; golden data, snapshots and tests stay as they are, so no errors switch is needed | kept |
| E-TA-02 | numerical | `f1t[x1_, xt_, q1_, qt_] := ((k*qt*q1*a*a)/(Abs[xt-x1])^3)*(xt-x1)` and `f2t`, with the slider `{{xt, -8., …}, -10 + 0.5, 10 - 0.5}` | no guard for x<sub>t</sub> = x<sub>1</sub> or x<sub>2</sub>, which a typed value reaches: 0/0 gives "Indeterminate" in the table and, through unevaluated `If`s, arrows that are not valid graphics (K-TA-02) | keeps "Indeterminate"; leaves out the four arrows (Q-TA-03, F-TA-14) | only these configurations change; what to show instead is a design choice (I-TA-03), not a local fix, so no switch | kept |
| E-TA-03 | text | Details & Citations, References (notebook) | the template placeholders "Details, references or citation information" and "References for demonstration." were left in the notebook; the published page shows no Details | not shown: the page has no Details, as the published page | none | kept |
