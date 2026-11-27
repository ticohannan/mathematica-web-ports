# Design document: Solar Energy Yield for Three Mounting Systems

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Solar Energy Yield for Three Mounting Systems", contributed by Michel de Spot, published 2013-12-04 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SolarEnergyYieldForThreeMountingSystems/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

The irradiance on solar panels over a clear day for five mountings — a two-axis tracker ("Full"), a tilted panel
turning about a vertical axis ("Vert."), a panel on a polar axis ("Polar"), a panel turning about a horizontal
east–west axis ("Horiz.") and a fixed panel facing south ("Fixed") — at a chosen latitude, panel angle and day of the
year, from the Sun's position (a standard declination formula) and a clear-sky model of the direct and diffuse
irradiance. The plot shows the five curves from sunrise to sunset; a bar chart below the controls gives their daily
totals. The latitude defaults to the SunMine project in Kimberley, BC, Canada (caption; Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/solar-yield-mounting-systems.txt`) and checked against its snapshots
(`docs/original-snapshots/solar-yield-mounting-systems-*.png`) and saved settings
(`tests/golden/solar-yield-mounting-systems.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-SY-01: a student explores the Demonstration in a browser, without Mathematica: how much a tracker gains over a
  fixed panel at a latitude and season.
- UC-SY-02: Tico compares the port with the original (checklist `docs/checklists/solar-yield-mounting-systems.md`), with
  the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SY-01 | Panel "latitude": the heading "latitude 49.7 °" (Bold 12, Hue[0]) and the slider `{{lat, 49.7, ""}, 24, 65., .1}` | the original's control | v0.1.44 | e2e "the headings show the latitude, the panel angle and the date"; e2e "the latitude slider moves sunrise and sunset" |
| F-SY-02 | Panel "panel angle": the heading (Darker[Orange]), the slider `{{sl, 58, ""}, 0, 90, .1}`, "optimized @" and the setter bars {lat + 23.4 -> "winter solstice", lat − 23.4 -> "summer solstice"} and {lat -> "equinox"} (values that follow the latitude; pressed while sl equals one) | the original's controls | v0.1.44 | e2e "the optimized setters set the panel angle from the latitude" |
| F-SY-03 | Panel "date": the heading `DateString[DatePlus[{2013, 1, 1}, dp], {"MonthName", " ", "Day"}]` (Blue), the slider `{{dp, 171, ""}, 1, 365, 1}` and the setter bar {354 -> "winter", 79 -> "spring", 171 -> "summer", 263 -> "autumn"} | the original's controls | v0.1.44 | e2e "the season setters and the day slider change the date and the yields"; unit "the date labels of the season setters" |
| F-SY-04 | The model: `sunvect` (the Sun's direction from the day, hour and latitude), `efull` (direct normal 1380 εx 0.87 e<sup>−0.17/sin h</sup> and diffuse irradiance), `pnlrot`, `polrot`, `trkall` (the five mountings: direct × cos of incidence when positive + diffuse; the full tracker direct + diffuse) | the original's model | v0.1.44 | unit "the Sun: a unit vector, at noon in the south at the height 90 - lat + declination"; unit "the irradiance: the full tracker gets direct + diffuse, the fixed panel the direct part times the cosine of incidence"; unit "the vertical-axis tracker faces the Sun azimuth; the horizontal one is tilted to the zenith angle" |
| F-SY-05 | The plot `Plot[trkall[…], {hr, sunrise, sunset}, PlotRange -> {{2, 22}, {0, 1100}}, GridLines -> Automatic]`, sunrise and sunset from `NSolve` of the Sun's height = 0; the five styles (Hue[.4, 1, .5]; Red Dashed Thick; Hue[.6] Dashed; Orange Thick Dotted; Thin Hue[.15, 1, .5]); the fillings Fixed → Bottom (Yellow, Opacity 0.1) and Full → Fixed (Hue[.4, 1, 1], Opacity 0.1); PlotLabel "daily solar energy yield"; AxesLabel "hour", "wh/m2"; the legend below | the original's picture | v0.1.44 | e2e "loads without errors and draws the plot, the legend and the bar chart" |
| F-SY-06 | The bar chart of the daily totals `Sum[trkall[…], {hr, Ceiling[sunrise, .1], Floor[sunset, .1], .1}]/10000` with the names in the bars, ChartStyle Hue[.4, 1, 1, .5], Hue[0, 1, 1, .3], LightBlue, LightOrange, LightYellow, PlotRange {1, 13}, horizontal grid lines; below it "Energy Yield kW/h/da" (Gray) | the original's picture | v0.1.44 | unit "the snapshot settings give the daily totals of the bar charts (snapshots 1 and 2)"; e2e "loads without errors and draws the plot, the legend and the bar chart" |
| F-SY-07 | Opening state lat = 49.7, sl = 58, dp = 171 (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "Initial settings restores the opening state" |
| F-SY-08 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-SY-01 |
| F-SY-09 | Controls and bar chart at the left of the plot (ControlPlacement -> Left) | the original's layout | v0.1.44 | inventory |
| A-SY-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-SY-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the optimized setters set the panel angle from the latitude" |
| A-SY-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-SY-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-SY-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-SY-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: solar-yield-mounting-systems runs from its own folder" |
| A-SY-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |
| A-SY-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-SY-01, E-SY-02 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.44 | unit "corrected mode (E-SY)"; e2e "errata switch on solar-yield-mounting-systems: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-lat` | F-SY-01 |
| `plus-lat` | F-SY-01 |
| `play-lat` | F-SY-01 |
| `stepback-lat` | F-SY-01 |
| `stepfwd-lat` | F-SY-01 |
| `slider-sl` | F-SY-02 |
| `plus-sl` | F-SY-02 |
| `play-sl` | F-SY-02 |
| `stepback-sl` | F-SY-02 |
| `stepfwd-sl` | F-SY-02 |
| `setter-optimize-*` | F-SY-02 |
| `setter-equinox-*` | F-SY-02 |
| `slider-dp` | F-SY-03 |
| `plus-dp` | F-SY-03 |
| `play-dp` | F-SY-03 |
| `stepback-dp` | F-SY-03 |
| `stepfwd-dp` | F-SY-03 |
| `setter-season-*` | F-SY-03 |
| `reset` | A-SY-01 |
| `crumbs` | A-SY-04 |
| `details` | F-SY-08 |
| `credits` | A-SY-05 |
| `setter-errata-*` | A-SY-08 |
| `errata-details` | A-SY-08 |

## 6. Design

- `model.js` (pure): `sunvect`, `efull`, `pnlrot`, `rotate` (RotationMatrix by Rodrigues' formula), `polrot`, `trkall`,
  `sunriseSunset` (the two roots of the Sun's height, sunrise first), `dailyYields`, `dayLabel`, `evaluate(state)` →
  `{ view, state, graphics: [plot, legend, bars] }`; the returned state keeps the setters' own variables in step with
  sl and dp. Test ids: `plot-svg`, `legend-svg`, `bars-svg`, `fill-fixed`, `fill-full`, `legend-*`, `bar-1` … `bar-5`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Left; the dynamic headings are an app-local control (`liveHeading`,
  test ids `heading-h-lat`, `heading-h-sl`, `heading-h-dp`; text, not controls) updated after each evaluation, as is the
  bar chart's label (`bars-label`); the "optimized @" and season setters are setter bars of their own variables that assign
  sl or dp; the switch `ErrataControl(CORRECTIONS)`.
- `errata-mode.js`: the corrections of E-SY-01 and E-SY-02 (§11).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- solar-yield-mounting-systems` → `dist/solar-yield-mounting-systems/`.
- Contents (generated with `node tools/bundle-app.mjs solar-yield-mounting-systems --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/solar-yield-mounting-systems/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/solar-yield-mounting-systems/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: solar-yield-mounting-systems runs from its own folder" (A-SY-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-SY-01 | deviation | The three Panels are not framed; the headings, sliders and setters use the layer's look and the browser's fonts. |
| D-SY-02 | deviation | The two fillings with their own styles are drawn as the plot's Prolog from the same curves (the layer has one FillingStyle per plot); the points at sunrise and sunset, where the curves are Infinity or NaN, are left out of them, as Plot leaves them out of the curves. Unit "the fillings leave out sunrise and sunset, where the curves are not finite". |
| D-SY-03 | deviation | The legend placed Below the plot is drawn as its own small picture under it; the Dotted style of "Horiz." shows its dots closer together. |
| D-SY-04 | deviation | The bar chart is drawn as Graphics (bars, names, grid lines, ticks) in the original's colours, 210 × 120 px. |
| D-SY-05 | deviation | Sunrise and sunset are the two roots of the Sun's height in the order sunrise, sunset (NSolve's own order is not known: K-SY-01). |
| Q-SY-01 | quirk kept | The title says three mounting systems; the Demonstration compares five (the caption says five). |
| Q-SY-02 | quirk kept | The date heading is one day after the day number used by the Sun's formula (DatePlus[{2013, 1, 1}, dp]: dp = 171 is June 21, day 172 of the year). |
| Q-SY-03 | quirk kept | The constant 0.158236 is a little below 0.39779², so the Sun's vector is 4×10⁻⁷ longer than 1 and the "Horiz." panel facing the Sun at noon gets slightly more than the two-axis tracker (1032.1706 against 1032.1701 W/m²). |
| K-SY-01 | known issue | Snapshots 3 (autumn) and 4 (winter) show the bar chart unevaluated, `BarChart[MapThread[…, {0, {Full, …}}]]`: the day's sum was 0, which happens when sunset comes before sunrise in NSolve's result (the sum then runs over no hours); the port always draws the bars. Whether current Mathematica shows the bars there: M-SY-08. |
| N-SY-01 | note | Checked numerically (unit tests): the Sun's height at noon is 90° − latitude + declination at both solstices, the day lengths at 49.7° N are 16.1 h and 7.9 h, the two-axis tracker gets the most at every hour, and the bars of snapshots 1 and 2 are reproduced to the 0.2 kWh the pictures allow. |
| N-SY-02 | note | "Horiz." is a panel turning about a horizontal east–west axis, tilted to the Sun's zenith angle (the Details say so); the usual horizontal single-axis tracker turns about a north–south axis. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the five mountings' irradiance curves with their fillings and legend, the bar chart of the daily totals, the three panels of controls with their live headings and setters; the switch for E-SY-01 and E-SY-02 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-SY-01 | Frame the three control panels as Mathematica's Panels | the left column looks like the original | CSS only | D-SY-01 |
| I-SY-02 | Show the date of the day number used by the formula (dp − 1) | the heading and the curves agree | differs from the original by a day | Q-SY-02 |
| I-SY-03 | Add a north–south horizontal tracker | the usual single-axis tracker is compared too | not in the original | N-SY-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-SY-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SY-01 | conceptual | `AxesLabel -> {"hour", "wh/m2"}` | the plot's vertical axis is labelled "wh/m2", an energy per area, but the curves are irradiances, powers per area in W/m² (the full tracker's 1032 at noon on June 21 is 1032 W/m²). | kept **Switch:** with "errors of the original: corrected" (A-SY-08, v0.1.44) — the axis is labelled "W/m2". | the axis label matches the curves; the area under a curve is then the day's energy in Wh/m² | switchable since v0.1.44 |
| E-SY-02 | text | `Item[Style["Energy Yield kW/h/da ", 12, Gray]]` | the bar chart's unit "Energy Yield kW/h/da" reads as kilowatts per hour per day; the bars are energies per area and day, kWh/m² per day (the sum of the irradiances over the day in steps of 0.1 h, divided by 10000). | kept **Switch:** with "errors of the original: corrected" (A-SY-08, v0.1.44) — the unit reads "Energy Yield kWh/m2/day". | the unit of the bars is right; the bars are unchanged | switchable since v0.1.44 |
