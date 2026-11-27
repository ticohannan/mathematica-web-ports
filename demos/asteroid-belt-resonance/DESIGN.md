# Design document: Orbital Resonance in the Asteroid Belt

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Orbital Resonance in the Asteroid Belt", contributed by S. M. Blinder, published 2018-04-04 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/OrbitalResonanceInTheAsteroidBelt/> |
| Port files | `model.js` (one evaluation of the Manipulate body and the seeded belt; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the correction of the switch), `index.html` |

## 1. Purpose and background

The inner solar system seen from above, with the asteroid belt between Mars and Jupiter. The planets Mercury to
Jupiter move on circular orbits as the slider "planetary orbits" (Earth's angle in radians) turns; 5000 random
asteroids form the belt (distance normal around 2.71 AU). The slider "time (Gyr)" draws the four principal Kirkwood
gaps (orbital resonances 3:1, 5:2, 7:3 and 2:1 with Jupiter) as blue rings over the belt that widen with time, the
setter marks one of them in yellow, and two checkboxes colour the Trojan asteroids at Jupiter's Lagrange points L4 and
L5 (green) and the Hilda asteroids in the 3:2 resonance (red) (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/asteroid-belt-resonance.txt`) and checked against its snapshots
(`docs/original-snapshots/asteroid-belt-resonance-*.png`) and saved settings
(`tests/golden/asteroid-belt-resonance.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-OR-01: a student explores the Demonstration in a browser, without Mathematica: where the belt, the Trojans and
  the Hildas are and how the Kirkwood gaps appear.
- UC-OR-02: Tico compares the port with the original (checklist `docs/checklists/asteroid-belt-resonance.md`), with
  the error of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-OR-01 | Slider "planetary orbits" `{{Theta, 0, …}, 0, 50, Appearance -> "Labeled"}`: Earth at the angle Theta, Mercury, Venus, Mars and Jupiter at Theta divided by their periods in years (0.241, 0.615, 1.881, 11.86) from their starting angles; the belt turns at Theta/3.6 | the original's control | v0.1.44 | e2e "the time and orbit sliders move the gaps and the planets"; unit "the planets: Earth at the slider angle, the others at their periods in years" |
| F-OR-02 | Slider "time (Gyr)" `{{t, 0, …}, 0, 200, Appearance -> "Labeled"}`: the four gap circles in blue with Thickness 0.005 Erf[0.02 t]; t is also added to the belt's angle (Q-OR-02) | the original's control | v0.1.44 | e2e "the time and orbit sliders move the gaps and the planets"; unit "the gap circles thicken with time as 0.005 Erf(0.02 t)" |
| F-OR-03 | Setter "show Kirkwood gaps" `{0 -> "none", 1 -> "3:1", 2 -> "5:2", 3 -> "7:3", 4 -> "2:1"}`: the chosen gap as a Thick yellow circle at 5.20336 × the period ratio (E-OR-01) | the original's control | v0.1.44 | e2e "the Kirkwood gap setter draws the chosen gap in yellow"; unit "the gap circles: the original radii 5.20336 times the period ratio" |
| F-OR-04 | Checkboxes "show Trojan asteroids" and "show Hilda asteroids" `{0, 1}`: the Trojans RGBColor[1 − T, 1, 1 − T] with PointSize 0.001 (1 + 1.5 T), the Hildas RGBColor[1, 1 − H, 1 − H] with PointSize 0.001 (1 + 2 H) | the original's controls | v0.1.44 | e2e "the checkboxes colour the Trojans green and the Hildas red"; unit "the Trojans and Hildas take their colours from the checkboxes" |
| F-OR-05 | The picture `Graphics[…, PlotRange -> 7.7]`: a blue background, white orbits (0.387, 0.723, 1, 1.524, 5.203 AU), the Sun and Jupiter (orange, PointSize 0.015), Mars, Earth, Venus, Mercury (PointSize 0.01), the belt (white), the Trojans (two clusters of 750 within ±30° of the points 60° ahead of and behind Jupiter), the Hildas (three groups of 100 around 3.97 AU at L3, L4, L5 and three of 100 at 2.75 AU spread all round, Q-OR-03), the gap circles, the legend "Sun ● Mercury ● …" at {0, −6} | the original's picture | v0.1.44 | e2e "loads without errors and draws the planets, the belt and the legend"; unit "the random belt: 5000 asteroids, 2 x 750 Trojans, 6 x 100 Hildas, with the original distributions" |
| F-OR-06 | Opening state Theta = 0, t = 0, k = 0, T = 0, H = 0 (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-OR-07 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-OR-01 |
| F-OR-08 | Controls above the picture in two rows (ControlPlacement -> Top) | the original's layout | v0.1.44 | inventory |
| A-OR-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-OR-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the time and orbit sliders move the gaps and the planets" |
| A-OR-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-OR-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-OR-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-OR-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: asteroid-belt-resonance runs from its own folder" |
| A-OR-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |
| A-OR-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-OR-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.44 | unit "corrected mode (E-OR)"; e2e "errata switch on asteroid-belt-resonance: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-theta` | F-OR-01 |
| `value-theta` | F-OR-01 |
| `plus-theta` | F-OR-01 |
| `play-theta` | F-OR-01 |
| `stepback-theta` | F-OR-01 |
| `stepfwd-theta` | F-OR-01 |
| `slider-t` | F-OR-02 |
| `value-t` | F-OR-02 |
| `plus-t` | F-OR-02 |
| `play-t` | F-OR-02 |
| `stepback-t` | F-OR-02 |
| `stepfwd-t` | F-OR-02 |
| `setter-k-*` | F-OR-03 |
| `check-T` | F-OR-04 |
| `check-H` | F-OR-04 |
| `reset` | A-OR-01 |
| `crumbs` | A-OR-04 |
| `details` | F-OR-07 |
| `credits` | A-OR-05 |
| `setter-errata-*` | A-OR-08 |
| `errata-details` | A-OR-08 |

## 6. Design

- `model.js` (pure): `initialization(seed)` (the Initialization's random lists from `shared/random.js` and
  `RandomVariate` of `shared/wl.js`, drawn once at load), `planets(Theta)`, `gapRadius(ratio, corrected)`,
  `evaluate(state)` → `{ view, graphics }`: the original's Graphics list in order. Test ids: `sky`, `orbits`, `sun`,
  `jupiter`, `mars`, `earth`, `venus`, `mercury`, `belt`, `trojans`, `hildas`, `gaps`, `gap-shown`, `legend`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, two Rows of controls as in the original, the switch
  `ErrataControl(CORRECTIONS)`.
- `errata-mode.js`: the correction of E-OR-01 (§11).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- asteroid-belt-resonance` → `dist/asteroid-belt-resonance/`.
- Contents (generated with `node tools/bundle-app.mjs asteroid-belt-resonance --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/asteroid-belt-resonance/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/asteroid-belt-resonance/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: asteroid-belt-resonance runs from its own folder" (A-OR-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-OR-01 | deviation | The Initialization's random numbers (RandomVariate, RandomReal) come from a seeded generator (`shared/random.js`, seed 2018): the same distributions, other dots than in Mathematica, the same picture on every visit (Mathematica draws new ones each time the notebook is opened). |
| D-OR-02 | deviation | The picture is the square of the PlotRange 7.7, 427.5 px (Mathematica: the same square in the middle of a 546-px-wide image with white margins at the sides); the background Rectangle[{−8, −7}, {8, 7}] is drawn as cut at ±7.7. |
| D-OR-03 | deviation | Points of PointSize 0.001 (0.55 px) are drawn 1 px wide: Mathematica's raster shows them as single pixels; a 0.55-px circle in the browser is too faint to see. |
| D-OR-04 | deviation | The checkboxes keep true/false (the layer's checkbox) instead of 1/0; the model reads them as numbers. Spacer[10] in the legend is one em space. |
| Q-OR-01 | quirk kept | The Details are the template's "Details, references or citation information". |
| Q-OR-02 | quirk kept | The time t (in "Gyr") is added to the belt's angle: moving the time slider turns the belt by t radians (invisible as a pattern, as the belt is uniform in angle). |
| Q-OR-03 | quirk kept | The three groups h1 (100 points each at 2.75 AU with angles spread over ±π) are drawn in the Hilda colour although they spread all round the belt, not at L3, L4, L5. |
| Q-OR-04 | quirk kept | The gaps are drawn as blue circles over the belt (the asteroids are not removed); they are drawn even with "none" once t > 0. |
| N-OR-01 | note | Snapshot 3 shows "Global`" before each dot of the legend (the symbol `\[FilledCircle]` displayed with its context when the snapshot was made); snapshots 1, 2 and 4 show the dots alone, as the port does. |
| N-OR-02 | note | Checked numerically (unit tests): the original's Hilda distance 3.97 AU is 5.203 × (2/3)^(2/3), Kepler's third law for the 3:2 resonance; the gap distances are not (E-OR-01). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the solar system with the random belt, the Trojans and Hildas, the Kirkwood gap circles; the two sliders, the setter and two checkboxes; the switch for E-OR-01 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-OR-01 | Remove the asteroids inside the gaps over time instead of drawing blue rings | the gaps form as the caption says | the picture differs from the original | Q-OR-04 |
| I-OR-02 | Limit the time slider to the age of the solar system, 4.6 Gyr | the time scale is physical | the gaps' Erf scale has to change with it | E-OR-02 |
| I-OR-03 | Keep the belt still when the time changes | the belt does not jitter | differs from the original | Q-OR-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-OR-02. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-OR-01 | mathematical | `Circle[{0, 0}, 5.20336*1/3]`, `…*2/5`, `…*1/2`, `…*3/7` for the gaps | the gaps are drawn at Jupiter's distance times the period ratio, 5.20336 × 1/3, 2/5, 3/7 and 1/2 = 1.73, 2.08, 2.23 and 2.60 AU: by Kepler's third law a period ratio p belongs to the distance ratio p^(2/3), so the 3:1 gap lies at 2.50 AU, not 1.73 AU (between Mars and the belt's inner edge). | kept **Switch:** with "errors of the original: corrected" (A-OR-08, v0.1.44) — the gaps are drawn at 5.20336 × p^(2/3) = 2.50 (3:1), 2.82 (5:2), 2.96 (7:3) and 3.28 AU (2:1), in the belt where the real Kirkwood gaps are; the Hilda distance 3.97 AU of the original already uses this law. | the four rings move outwards into the belt (by 0.68 to 0.77 AU); the 3:1 ring no longer lies inside the belt's inner edge | switchable since v0.1.44 |
| E-OR-02 | conceptual | the slider "time (Gyr)" from 0 to 200 | the solar system is 4.6 Gyr old and the universe 13.8 Gyr; the gaps reach half their width (Erf = 0.5) only at 24 "Gyr" | kept (the slider's range is the original's control) | a range of 0 … 4.6 Gyr with a faster Erf would give the same pictures (I-OR-02) | kept |
