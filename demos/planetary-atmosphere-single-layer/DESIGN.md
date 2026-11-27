# Design document: Single-Layer Model for Planetary Atmospheres

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Single-Layer Model for Planetary Atmospheres", contributed by Sergio Hannibal Mejía and Simon Lorimer, published 2022-07-11 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SingleLayerModelForPlanetaryAtmospheres/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

The single-layer model of a planet's atmosphere. Sunlight of mean intensity S̄ = 342/d² W/m² (d the distance from
the Sun in AU) falls on a layer that reflects the fraction α (albedo) and lets the rest reach the ground; the ground
emits σ T<sub>p</sub>⁴; the layer, a grey body of emissivity ε, absorbs ε σ T<sub>p</sub>⁴ and emits ε σ T<sub>a</sub>⁴ up
and down. The balances give T<sub>a</sub> = (T<sub>p</sub>⁴/2)<sup>1/4</sup> and T<sub>p</sub> = (2 S̄ (1 − α)/((2 − ε) σ))<sup>1/4</sup>.
The picture shows the flows as arrows whose widths follow their intensities, with their values, and the two
temperatures; below it T<sub>p</sub> is plotted against ε with the current point. A setter chooses Earth, Mars, Venus
or "my own"; the reset box gives the chosen planet's emissivity and albedo (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/planetary-atmosphere-single-layer.txt`) and checked against its snapshots
(`docs/original-snapshots/planetary-atmosphere-single-layer-*.png`) and saved settings
(`tests/golden/planetary-atmosphere-single-layer.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-AT-01: a student explores the Demonstration in a browser, without Mathematica: how albedo, emissivity and distance
  set a planet's temperature in the single-layer model.
- UC-AT-02: Tico compares the port with the original (checklist `docs/checklists/planetary-atmosphere-single-layer.md`),
  with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-AT-01 | Sliders under the headings "albedo α" `{{α, .3, ""}, 0, 1, 0.01}`, "emissivity ϵ" `{{ϵ, .742, ""}, 0, 1, 0.01}` and "solar distance d (AU)" `{{d, 1, ""}, 0.3, 10, .1}`, ImageSize Tiny, Appearance "Labeled" | the original's controls | v0.1.44 | e2e "the emissivity slider moves the temperature along the curve"; e2e "has its controls with their defaults" |
| F-AT-02 | Setter "planet" `{1 -> "Earth", 2 -> "Mars", 3 -> "Venus", 4 -> "my own"}`: the colour of the layer (LightGreen, Lighter[Orange], Gray, Cyan); the body's `Which` sets d = 1 for Earth only (E-AT-01) | the original's control | v0.1.44 | unit "only Earth sets the distance: the three tests of the Which all ask for planet 1"; e2e "Mars with reset takes the Mars presets; Earth sets the distance back to 1" |
| F-AT-03 | Checkbox "reset" `{{reset, False, "reset"}, {True, False}}`: sets ε and α of the chosen planet (Earth 0.742, 0.3; Mars 0.3, 0.25; Venus 0.8, 0.75; "my own" nothing) and clears itself | the original's control | v0.1.44 | unit "reset sets the planet presets of emissivity and albedo, then clears itself"; e2e "Mars with reset takes the Mars presets; Earth sets the distance back to 1" |
| F-AT-04 | Setter "scale" `{"DegreesCelsius" -> "°C", "DegreesFahrenheit" -> "°F"}`: the second unit of the two temperatures | the original's control | v0.1.44 | unit "the scale converts to degrees Fahrenheit"; e2e "the scale shows degrees Fahrenheit" |
| F-AT-05 | The model: S̄ = 342/d², T<sub>p</sub> = (2 (1 − α) S̄/(σ (2 − ε)))<sup>1/4</sup>, T<sub>a</sub> = (T<sub>p</sub>⁴/2)<sup>1/4</sup>, σ = 5.67×10⁻⁸ | the original's model | v0.1.44 | unit "the temperatures satisfy the two energy balances of the caption"; unit "the intensities: S = 342/d squared, the planet emits sigma Tp^4"; unit "without an atmosphere (emissivity 0) Earth is at 255 K = -18 C, as the caption says" |
| F-AT-06 | The picture `Graphics[…, PlotRange -> {{-5, 5}, {0, 8.5}}, ImageSize -> 360]`: black space, the layer in the planet's colour, the ground (Darker colour), the cloud layer (blue, Opacity 0.1 + 0.8 ε), the yellow arrows of the sunlight, the reflected and the transmitted part (Thickness 0.1, 0.1 α, 0.1 (1 − α), heads 0.3 × the same), the red arrows of σ T<sub>p</sub>⁴, (1 − ε) σ T<sub>p</sub>⁴ and ε σ T<sub>a</sub>⁴ up and down (widths 0.1 × intensity/S̄); their rounded values turned along them (FontSize 17, with tooltips); "mean solar distance: d = … AU", "radiation measurements are in kW/m²" and "T<sub>p</sub> = … K = … °C", "T<sub>a</sub> = …" | the original's picture | v0.1.44 | e2e "loads without errors and draws the planet, the arrows, the numbers and the plot"; unit "the five snapshot settings give the temperatures and numbers of the snapshot pictures" |
| F-AT-07 | The plot `Plot[T_p(e), {e, 0, 1}, PlotRange -> {{0, 1}, {0, 400}}, AspectRatio -> .4, ImageSize -> {360, 160}]` with the label "planetary temperature versus emissivity", axes labels ϵ and T<sub>p</sub> (K), grid lines and ticks every 0.1 and 50, and the point {ε, T<sub>p</sub>} (PointSize 0.02, tooltip) | the original's picture | v0.1.44 | e2e "loads without errors and draws the planet, the arrows, the numbers and the plot" |
| F-AT-08 | Opening state α = 0.3, ε = 0.742, d = 1, Earth, reset off, °C (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-AT-09 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-AT-01 |
| F-AT-10 | Controls at the left of the pictures (ControlPlacement -> Left), with the original's headings | the original's layout | v0.1.44 | inventory |
| A-AT-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-AT-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the snapshot settings show the snapshots temperatures" |
| A-AT-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-AT-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-AT-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-AT-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: planetary-atmosphere-single-layer runs from its own folder" |
| A-AT-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |
| A-AT-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-AT-01, E-AT-02 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.44 | unit "corrected mode (E-AT)"; e2e "errata switch on planetary-atmosphere-single-layer: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-alpha` | F-AT-01 |
| `value-alpha` | F-AT-01 |
| `plus-alpha` | F-AT-01 |
| `play-alpha` | F-AT-01 |
| `stepback-alpha` | F-AT-01 |
| `stepfwd-alpha` | F-AT-01 |
| `slider-eps` | F-AT-01 |
| `value-eps` | F-AT-01 |
| `plus-eps` | F-AT-01 |
| `play-eps` | F-AT-01 |
| `stepback-eps` | F-AT-01 |
| `stepfwd-eps` | F-AT-01 |
| `slider-d` | F-AT-01 |
| `value-d` | F-AT-01 |
| `plus-d` | F-AT-01 |
| `play-d` | F-AT-01 |
| `stepback-d` | F-AT-01 |
| `stepfwd-d` | F-AT-01 |
| `setter-planet-*` | F-AT-02 |
| `check-reset` | F-AT-03 |
| `setter-scale-*` | F-AT-04 |
| `reset` | A-AT-01 |
| `crumbs` | A-AT-04 |
| `details` | F-AT-09 |
| `credits` | A-AT-05 |
| `setter-errata-*` | A-AT-08 |
| `errata-details` | A-AT-08 |

## 6. Design

- `model.js` (pure): `assigned(state)` (the body's assignments in order: the Which on the planet, the reset),
  `quantities(s)`, `Tplanet`, `Tatmosphere`, `temperatureText` (UnitConvert of the Quantity, rounded),
  `evaluate(state)` → `{ view, state, graphics: [scene, plot] }`: the returned state carries the assignments (the
  layer shows them in the controls). The numbers on the arrows are `Text[RotatedText[…]]` along the original's
  directions, each in a Tooltip. Test ids: `space`, `layer-air`, `ground`, `cloud-layer`, `arrow-*`, `num-*`,
  `label-*`, `point-Tp`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Left, two pictures in one column (`scene`, `plot`), the switch
  `ErrataControl(CORRECTIONS)`.
- `errata-mode.js`: the corrections of E-AT-01 and E-AT-02 (§11).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- planetary-atmosphere-single-layer` → `dist/planetary-atmosphere-single-layer/`.
- Contents (generated with `node tools/bundle-app.mjs planetary-atmosphere-single-layer --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/planetary-atmosphere-single-layer/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/planetary-atmosphere-single-layer/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: planetary-atmosphere-single-layer runs from its own folder" (A-AT-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-AT-01 | deviation | The plot draws no "0." and "0" at its origin (the layer leaves out tick labels where the axes cross); the snapshots show them. |
| D-AT-02 | deviation | The controls and the texts use the layer's look and the browser's fonts: the text "radiation measurements are in kW/m²" runs a little wider and touches the picture's left edge. |
| D-AT-03 | deviation | A value typed into a slider's field goes to the slider's step (d = 1.52 becomes 1.5); Mathematica's labelled field keeps the typed 1.52 (snapshot 3 has d = 1.52). |
| D-AT-04 | deviation | The tooltips of the numbers show plain text (e.g. "S̄Alpha") where Mathematica shows typeset labels. |
| Q-AT-01 | quirk kept | The arrows' widths are fractions of the picture's width proportional to the intensities divided by S̄: for large intensities (small d) the arrows grow wider than the picture. |
| Q-AT-02 | quirk kept | "T<sub>a</sub>" and the superscript 2 of "kW/m²" overlap, as in the snapshots. |
| Q-AT-03 | quirk kept | The Details number the snapshots 1 to 4, while the Demonstration has five (the text's "Snapshot 2" is the fourth picture's Mars, …). |
| N-AT-01 | note | Checked numerically (unit tests): the temperatures satisfy both balances of the caption; ε = 0 gives Earth 255 K = −18 °C as the caption says; the five snapshots' printed temperatures and flow values are reproduced exactly. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the planet's energy flows with their values and temperatures, the temperature–emissivity plot, the sliders, setters and the reset box; the switch for E-AT-01 and E-AT-02 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-AT-01 | Show the measured mean temperature of the chosen planet beside the model's | the reader sees how far the model is off (Venus) | a table of values | F-AT-02 |
| I-AT-02 | Limit the arrow widths to the picture | no arrows wider than the picture at small d | differs from the original | Q-AT-01 |
| I-AT-03 | Let a typed distance keep its digits | the field takes 1.52 as the original | a shared slider change | D-AT-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-AT-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-AT-01 | numerical | `Which[planet==1,d=1,planet==1,d=1.52,planet==1,d=.72]` | choosing a planet sets the solar distance only for Earth (d = 1): the three tests of Which[planet == 1, d = 1, planet == 1, d = 1.52, planet == 1, d = .72] all ask for planet 1, so Mars and Venus keep the slider's distance (Venus with ε = 0.8, α = 0.75 at d = 1 AU: Tp = 224 K). | kept **Switch:** with "errors of the original: corrected" (A-AT-08, v0.1.44) — Mars sets d = 1.52 AU and Venus d = 0.72 AU, as the Which was written to do (Venus: S̄ = 660, Tp = 264 K); Earth and "my own" are unchanged. | Mars and Venus get their distances (the d slider then works only for "my own", as it already does not for Earth); snapshot 4 (Venus, d = 5) would show d = 0.72 | switchable since v0.1.44 |
| E-AT-02 | text | `Text[Row[{"radiation measurements are in kW/m"^2}]]`; the caption's "342 kW/m^2" | the picture says "radiation measurements are in kW/m²", but the numbers (S̄ = 342 for Earth, σ Tp⁴ = 381) are in W/m². | kept **Switch:** with "errors of the original: corrected" (A-AT-08, v0.1.44) — the label says W/m². | the unit of the picture is right; the caption's text is the original's | switchable since v0.1.44 |
| E-AT-03 | text | the caption's formula "S̄α = (S π R<sub>p</sub>²)/(4 π R<sub>p</sub>²) = S/4" | the mean intensity is S̄ = S/4; the "α" on the left belongs to the reflected part | kept (the caption is the original's text) | the formula reads S̄ = S/4 | kept |
| E-AT-04 | text | the Details: "−65 °C (85 °F)" for Mars and "464 °C (−867 °F)" for Venus | the signs of the Fahrenheit values are swapped: −65 °C = −85 °F and 464 °C = 867 °F | kept (the Details are the original's text) | the two values read −85 °F and 867 °F | kept |
