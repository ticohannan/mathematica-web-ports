# Design document: Degree-of-Freedom Analysis on a Distillation Process

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Degree-of-Freedom Analysis on a Distillation Process", contributed by Rachael L. Baumann, Janet deGrazia, John L. Falconer, Nathan S. Nelson and Nick Bongiardina, published 2016-03-30 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DegreeOfFreedomAnalysisOnADistillationProcess/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

A degree-of-freedom analysis of a distillation process with a column, a condenser and a reboiler and seven streams.
Each stream has a flow m and a mole fraction of species A (and of B, or 1 − A, depending on the representation). A
chosen number of the variables is unknown (blue), the others known (black), drawn at random for each "new problem".
For the chosen balance (column, condenser, reboiler or overall) the explanation counts the unknowns of its streams,
subtracts the two species balances and the extra information (the equilibrium ratio of a partial condenser or of the
reboiler, the equal compositions of a total condenser, and with z<sub>B</sub> the sum of each stream's mole fractions) and
says whether the balance is solvable (0), underspecified (> 0) or overspecified (< 0) (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/distillation-degrees-of-freedom.txt`) and checked against its snapshots
(`docs/original-snapshots/distillation-degrees-of-freedom-*.png`) and saved settings
(`tests/golden/distillation-degrees-of-freedom.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-DD-01: a student practises degree-of-freedom analysis in a browser, without Mathematica: which unit to balance
  first, and how the representation of species B changes the count.
- UC-DD-02: Tico compares the port with the original (checklist `docs/checklists/distillation-degrees-of-freedom.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-DD-01 | PopupMenu "balance on" `{1 -> "column", 2 -> "condenser", 3 -> "reboiler", 4 -> "overall"}`: the unit's outer rectangle dashed green, its name bold green, its streams green; the streams of each balance column {1, 2, 3, 6, 7}, condenser {2, 4, 6}, reboiler {3, 5, 7}, overall {1, 4, 5} | the original's control | v0.1.44 | e2e "the balance popup changes the unit; the condenser setter only shows for the condenser" |
| F-DD-02 | Setter "species B representation" `{1 -> " 1−z_A", 2 -> " z_B"}`: with 1 − z<sub>A</sub> the B fractions are the black "1−" with the A fraction in its colour (known with it); with z<sub>B</sub> they are variables of their own | the original's control | v0.1.44 | e2e "the representation setter shows the zB labels and the u2 slider"; unit "with 1 - zA, the 1 - A label is unknown exactly when A is" |
| F-DD-03 | Button " new problem " (Background cyan): reset + 1 (− 1 at 1000); `SeedRandom[reset]; RandomSample[…]` chooses the known variables (D-DD-01) | the original's control | v0.1.44 | e2e "new problem draws other known variables; the unknowns slider sets their number"; unit "the random draw: as many known as variables minus unknowns, the same for the same problem number, another for the next" |
| F-DD-04 | Slider "total number of unknowns" `{{u1, 5}, 1, 13, 1}` with 1 − z<sub>A</sub>, `{{u2, 10}, 1, 20, 1}` with z<sub>B</sub> (PaneSelector on the representation), Appearance "Labeled" | the original's control | v0.1.44 | e2e "the representation setter shows the zB labels and the u2 slider"; e2e "has its controls with their defaults" |
| F-DD-05 | Setter " partial condenser " \| " total condenser " shown while the condenser is chosen (PaneSelector on select): stream 4 is vapour (y<sub>4</sub>) or liquid (x<sub>4</sub>); the extra information K<sub>c</sub> = y<sub>4</sub>/x<sub>6</sub> (1) or y<sub>2</sub> = x<sub>4</sub> = x<sub>6</sub> (2) | the original's control | v0.1.44 | e2e "the balance popup changes the unit; the condenser setter only shows for the condenser"; unit "14 variables to choose from with 1 - zA, 21 with zB; the extra information of each unit" |
| F-DD-06 | The count: unknowns of the unit's streams − 2 species balances − extra information (the sums Σ c<sub>n</sub> = 1 of streams with an unknown fraction, with z<sub>B</sub>; 1 for the partial condenser and the reboiler's K<sub>r</sub> = y<sub>7</sub>/x<sub>5</sub>, 2 for the total condenser) = degrees of freedom; "solvable", "overspecified", "underspecified" in green, yellow, red boxes | the original's analysis | v0.1.44 | unit "the four snapshots: the counts printed beside the flowsheets"; unit "the sums of zB: one per stream with an unknown composition in the balance" |
| F-DD-07 | The pictures: the title "unknowns - species balances - extra information = degrees of freedom" (17), the flowsheet (405 × 375: three units, seven arrows, the labels m<sub>n</sub>, c<sub>n,A</sub>, c<sub>n,B</sub> or 1−c<sub>n,A</sub>, FontSize 17) and the explanation (195 × 375: the unit's name, the unknowns of the balance five to a row in Complement's order, the counts, the relation, the status) | the original's picture | v0.1.44 | e2e "loads without errors and draws the title, the flowsheet and the explanation"; unit "the picture: the title, the flowsheet with the chosen unit and the explanation" |
| F-DD-08 | Opening state: condenser, 1 − z<sub>A</sub>, problem 1, u1 = 5, u2 = 10, partial condenser (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-DD-09 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-DD-01 |
| F-DD-10 | Controls above the pictures in two rows (the original's Grid) | the original's layout | v0.1.44 | inventory |
| A-DD-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-DD-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "new problem draws other known variables; the unknowns slider sets their number" |
| A-DD-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-DD-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-DD-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-DD-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: distillation-degrees-of-freedom runs from its own folder" |
| A-DD-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `popup-select` | F-DD-01 |
| `setter-view-*` | F-DD-02 |
| `button-new-problem` | F-DD-03 |
| `slider-u1` | F-DD-04 |
| `value-u1` | F-DD-04 |
| `plus-u1` | F-DD-04 |
| `play-u1` | F-DD-04 |
| `stepback-u1` | F-DD-04 |
| `stepfwd-u1` | F-DD-04 |
| `slider-u2` | F-DD-04 |
| `value-u2` | F-DD-04 |
| `plus-u2` | F-DD-04 |
| `play-u2` | F-DD-04 |
| `stepback-u2` | F-DD-04 |
| `stepfwd-u2` | F-DD-04 |
| `setter-cond-*` | F-DD-05 |
| `reset` | A-DD-01 |
| `crumbs` | A-DD-04 |
| `details` | F-DD-09 |
| `credits` | A-DD-05 |

## 6. Design

- `model.js` (pure): `STREAMS`, `UNITS`, `selectable(view, cond)` (Flatten@varSelect), `randomSample` (seeded),
  `analyse(state)` (the draw, then `analyseKnown`), `analyseKnown(state, known)` (the count of the original's Module for a
  list of known variables), `canonical` (Complement's order of the labels), `evaluate(state)` → `{ view, graphics:
  [title, flowsheet, explanation] }`. Test ids: `title`, `equipment`, `unit-outline`, `unit-names`, `streams`,
  `unit-streams`, `var-*`, `unit-name`, `count-*`, `unknowns-row-*`, `sums-row-*`, `relation`, `status-box`, `status`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, the original's Grid of controls as two Rows; the PaneSelectors
  as `Visible` functions; the button's cyan background in the page's CSS.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- distillation-degrees-of-freedom` → `dist/distillation-degrees-of-freedom/`.
- Contents (generated with `node tools/bundle-app.mjs distillation-degrees-of-freedom --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/distillation-degrees-of-freedom/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 15 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/distillation-degrees-of-freedom/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: distillation-degrees-of-freedom runs from its own folder" (A-DD-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-DD-01 | deviation | `SeedRandom[reset]; RandomSample[…]`: Mathematica's random stream cannot be reproduced; the port draws with a generator seeded by the problem number (Fisher–Yates), so problem 1 has other known variables than in Mathematica — the same number of them, the same counting. The snapshots' known variables are test data (read from the pictures). |
| D-DD-02 | deviation | The explanation's Column is drawn line by line in a 195 × 375 picture; the unknowns of a row are a Row of labels (Mathematica: a Grid of small Graphics). |
| D-DD-03 | deviation | `PlotRange -> {-7.51, 7.51}` is Mathematica's y range; the x range is the primitives' automatic −4.2 … 11 with 2 % padding, stretched to 405 × 375 by AspectRatio -> Full (as the original). |
| D-DD-04 | deviation | The chosen unit's dashed outline is drawn as a dashed line around the rectangle (the layer draws EdgeForm dashes solid). |
| D-DD-05 | deviation | The arrowheads are 0.03 of the flowsheet's width, measured on the snapshots. |
| Q-DD-01 | quirk kept | More than ten unknowns in a balance are not all listed (ArrayReshape to at most two rows of five); the count is right. |
| Q-DD-02 | quirk kept | "new problem" at problem 1000 goes back to 999 and then up to 1000 again. |
| N-DD-01 | note | Checked (unit tests): for the four snapshots, the unknowns read from the pictures give the printed counts and statuses (condenser 3 − 2 − 1 = 0 solvable; column with z<sub>B</sub> 6 − 2 − 2 = 2 underspecified; overall 1 − 2 − 0 = −1; reboiler 1 − 2 − 1 = −2). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the flowsheet with known and unknown variables, the degree-of-freedom count of the chosen balance with its explanation, the popup, setters, button and slider |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-DD-01 | Show the problem number | a problem can be named and repeated | not in the original | F-DD-03 |
| I-DD-02 | List all unknowns of a balance when there are more than ten | the list matches the count | differs from the original | Q-DD-01 |
| I-DD-03 | Let the user click variables to make them known or unknown | a problem from a textbook can be set up | not in the original | F-DD-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the counts of N-DD-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| — | none found | — | — | — | — | — |
