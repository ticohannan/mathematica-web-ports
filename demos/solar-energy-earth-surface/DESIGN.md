# Design document: Solar Energy Incident on Earth's Surface

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Solar Energy Incident on Earth's Surface", contributed by Stephen Wilkerson, Frank A. Wattenberg and Russell Park, published 2013-08-09 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/SolarEnergyIncidentOnEarthsSurface/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (what the errors switch corrects), `index.html` |

## 1. Purpose and background

The Demonstration compares the solar power falling on one square metre of the Earth's surface over a day at a chosen
latitude with that at the equator and at the North Pole, for a chosen season. Its model: the Earth's axis is tilted
by 0.408 rad about the y axis (`tiltEarth`), the Earth turns about its axis once a day plus once a year
(`rotateEarth[hour, season]`, angle 2π (hour − 12 + 24 season)/24), the Sun's direction goes round the z axis once a year
(`sun[season]`, season 0 = the northern summer solstice), and the power at a point is the solar constant
1367.6 W/m² times the cosine of the angle between the surface normal and the Sun's direction, or 0 at night
(`energy`). The picture shows the globe with the point, its normal (black arrow) and the Sun's direction (red arrow),
the tropics and polar circles, and the night half; beside it a plot of the three powers over the day with the point
at the chosen time, and a plot of the hourly values summed over the day.

## 2. Scope

In scope: the three sliders, the globe and both plots, the opening state of the notebook. Out of scope: the original's
world-map picture on the globe (D-SE-01). Port additions are listed in §4 as A- features.

## 3. Users and use cases

- UC-SE-01: a student sees how the daily course of the Sun's power depends on latitude and season (long polar days,
  the midnight sun at the pole in summer, the equinox), without Mathematica.
- UC-SE-02: a teacher sets the snapshots' settings and compares the day's totals of the equator, a chosen latitude and
  the pole.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SE-01 | Slider "season" `{{sea, 0, "season"}, 0, 1, Appearance -> "Labeled"}` (continuous; 0 = the summer solstice) | chooses the day of the year | v0.1.41 | e2e "has its controls with their defaults"; e2e "dragging the season slider with the mouse moves the Sun and changes the energies"; e2e "typed values in the fields set the variables" |
| F-SE-02 | Slider "latitude" `{{lat, 51.47885, "latitude"}, 0, 90, Appearance -> "Labeled"}` (degrees north; the default is Greenwich) | chooses the place | v0.1.41 | e2e "has its controls with their defaults"; e2e "a click on the latitude slider and arrow keys on the time slider move the point of the energy plot" |
| F-SE-03 | Slider "time of day" `{{h, 12, "time of day"}, 0, 24, Appearance -> "Labeled"}` (hours) | chooses the hour | v0.1.41 | e2e "has its controls with their defaults"; e2e "a click on the latitude slider and arrow keys on the time slider move the point of the energy plot"; e2e "typed values in the fields set the variables" |
| F-SE-04 | The model: `tiltEarth` (rotation about y by 0.408), `rotateEarth[hour, season]` (about z by 2π (hour − 12 + 24 season)/24), `sun[season]` = {Cos[2π season], Sin[2π season], 0}, `point[latitude]`, `normal = tiltEarth . rotateEarth . point`, `energy = 1367.6 Max[0, sun . normal]` | the original's computation | v0.1.41 | unit "noon at the summer solstice"; unit "energy agrees with the declination and hour-angle formula at 200 random settings"; unit "equinox (season 0.25)"; unit "the season term keeps solar noon near 12 h all year" |
| F-SE-05 | The energy plot: `Show[Plot[{energy[0, h, sea], energy[lat, h, sea], energy[90, h, sea]}, {h, 0, 24}, PlotRange -> {0, 1400}, Ticks -> {{0, 4, …, 24}, Automatic}, PlotStyle -> {Red, Black, Blue}, ImageSize -> {175, 175}, PlotLabel -> "energy", AxesLabel -> {"time (hr)", "watts/m"^2}], Graphics[{PointSize[Large], Point[{h, energy[lat, h, sea]}]}]]` with the legend equator, latitude, north pole below it | the day's course of the power and the current value | v0.1.41 | unit "the energy plot: three curves red (equator), black (latitude), blue (pole) and the point at the time of day"; e2e "loads without errors and draws the globe, the two plots and the legend"; e2e "snapshot 1 settings" |
| F-SE-06 | The accumulated plot: `ListLinePlot[{Accumulate[eng], Accumulate[eng1], Accumulate[eng2]}, PlotStyle -> {Red, Black, Blue}, …]` of the 25 hourly values t = 0, 1, …, 24 at the latitude, the equator and the pole (x = 1 … 25) | the day's total | v0.1.41 | unit "the tables: 25 hourly values t = 0 … 24 and their running sums"; unit "the accumulated plot draws the latitude in red and the equator in black, x = 1 … 25" |
| F-SE-07 | The globe (`Show[earth, night, cancer, capricorn, northpole, southpole, artic, antartic, pt, norm1, sunnorm1]`, ViewAngle 20°, PlotRange ±1.5, Boxed -> False, ImageSize .95 {350, 350}, default ViewPoint and lighting; drag to rotate): the sphere with Mesh -> {24, 9}, the night half (Opacity 0.7, GrayLevel 0.3), the tropics (dashed) and polar circles at 23.5° and 66.5° (blue north, green south), the pole tubes, the red point with the black normal and the red Sun arrow | shows the geometry | v0.1.41 | unit "the globe: a plain sphere, a 24 × 9 mesh, the night half at x ≤ 0, poles, tropics and polar circles"; unit "the point, the normal and the Sun arrow are drawn with sea + .5"; e2e "loads without errors and draws the globe, the two plots and the legend"; e2e "snapshot 1 settings" |
| F-SE-08 | Opening state = the notebook's live state = the Manipulate's initial settings: sea = 0, lat = 51.47885, h = 12 | the original's opening picture | v0.1.41 | unit "the opening state is the notebook's live state and its initial settings"; e2e "has its controls with their defaults" |
| F-SE-09 | Layout: the controls above the picture (Mathematica's default ControlPlacement); the globe left, the energy plot, its legend and the accumulated plot in a column right of it (`Grid[{{globe, Column[{plt, engtot}]}}]`) | the original's layout | v0.1.41 | M-SE-02 |
| F-SE-10 | Caption (from the Demonstration); the original has no Details text (the page says so and links the related Demonstration "Daylight Calculator") | the original's explanation | v0.1.41 | M-SE-01 |
| F-SE-11 | The snapshots' settings reproduce the snapshots' values (the point of the energy plot, the three powers, the totals) | the original's examples | v0.1.41 | unit "the snapshots' settings give the values their pictures show"; e2e "snapshot 1 settings"; e2e "snapshot 2 settings"; e2e "snapshot 3 settings"; e2e "snapshot 4 settings"; M-SE-03 |
| A-SE-01 | "Initial settings" button restores the opening state (and the errors switch to kept, and the view of the globe) | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-SE-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction, pixelAt, worldToClient3D) from the Manipulate layer | automated tests | v0.1.41 | e2e "dragging the season slider with the mouse moves the Sun and changes the energies" |
| A-SE-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-SE-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-SE-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-SE-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: solar-energy-earth-surface runs from its own folder" |
| A-SE-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-SE-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-SE-01, E-SE-02, E-SE-03, E-SE-04 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-SE)"; e2e "errata switch on solar-energy-earth-surface: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-sea` | F-SE-01 |
| `value-sea` | F-SE-01 |
| `plus-sea` | F-SE-01 |
| `play-sea` | F-SE-01 |
| `stepback-sea` | F-SE-01 |
| `stepfwd-sea` | F-SE-01 |
| `slider-lat` | F-SE-02 |
| `value-lat` | F-SE-02 |
| `plus-lat` | F-SE-02 |
| `play-lat` | F-SE-02 |
| `stepback-lat` | F-SE-02 |
| `stepfwd-lat` | F-SE-02 |
| `slider-h` | F-SE-03 |
| `value-h` | F-SE-03 |
| `plus-h` | F-SE-03 |
| `play-h` | F-SE-03 |
| `stepback-h` | F-SE-03 |
| `stepfwd-h` | F-SE-03 |
| `scene-canvas` | F-SE-07 |
| `reset` | A-SE-01 |
| `crumbs` | A-SE-04 |
| `details` | F-SE-10 |
| `credits` | A-SE-05 |
| `setter-errata-*` | A-SE-08 |
| `errata-details` | A-SE-08 |

## 6. Design

- `model.js`: `initialState()` and `evaluate(state)` → `{ view, graphics: [globe, plt, engtot] }`. The original's
  functions keep their names (`tiltEarth`, `rotateEarth`, `sun`, `point`, `normal`, `energy`); `point` is a list
  instead of the original's 3 × 1 column (the `[[1]]` and `Flatten` of the original then fall away). The globe is
  `shared/graphics3d.js` Graphics3D data: the sphere and the night half as `ParametricPlot3D` surfaces, the mesh, the
  circles and the dashes as `Line`s, the poles as `Tube`s, the arrows as `Arrow`s; the plots are `shared/plot.js`
  `Plot`, `ListLinePlot` and `Show`. `view` holds the three powers at the time of day, the tables and their sums, the
  normal, the Sun, the drawn position of the point and the rotation matrix (for the tests). `isCorrected(state)`
  (`shared/errata.js`) selects the corrected branches of E-SE-01 … E-SE-04.
- `main.js`: one `Manipulate({…})` with three pictures — `#graphic` (View3D with the globe's options),
  `#graphic2` (`plot-energy`) and `#graphic3` (`plot-total`) — the three sliders and the errors switch;
  `ControlPlacement: 'Top'`. Arrowheads are a fraction of the width the picture shows (`size` option of View3D).
- `index.html`: the picture panel `Grid[{{globe, Column[{plt, legend, engtot}]}}]` as flex boxes (the column centred
  vertically beside the globe, as in the snapshots); the legend is page HTML (`legend`, D-SE-03).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- solar-energy-earth-surface` → `dist/solar-energy-earth-surface/`.
- Contents (generated with `node tools/bundle-app.mjs solar-energy-earth-surface --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/solar-energy-earth-surface/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 24 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/solar-energy-earth-surface/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: solar-energy-earth-surface runs from its own folder" (A-SE-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-SE-01 | deviation | The globe has no map picture: the original's `Texture[…]` is a third-party political world map with a copyright notice of its publisher in the image, so it is not reproduced. The globe is a plain light-blue sphere (RGB 0.62, 0.84, 0.97, near the map's ocean colour) with the original's `Mesh -> {24, 9}`: 24 meridians at 2πk/25 and 9 parallels at πk/10 (the equator one of them), drawn 0.2 % outside the surface so that the surface does not hide them. Everything else of the globe is drawn as in the original. |
| D-SE-02 | deviation | The legend reads "equator", "latitude", "north pole" at every setting, as the live notebook and snapshot 1 show it. Snapshots 2–4 read "Global`equator", "Global`latitude", "Global`north Global`pole" (and wrap onto two rows): the legend entries are undefined symbols (Q-SE-06), and those pictures were made with another current context (E-SE-07). |
| D-SE-03 | deviation | The legend is page HTML (`legend`) between the two plots, where Mathematica placed it, rather than part of the energy plot's picture; one row, as in snapshot 1. |
| D-SE-04 | deviation | The 2D plots use the pages' fonts (tick labels 11 px, plot label black 13 px; Mathematica's are smaller and its plot labels grey) and margins fitted to Mathematica's ImageSize {175, 175} (`ImagePadding`, plot area about 100 px wide). The energy plot draws no "0" labels at its origin (Mathematica writes 0 on both axes). |
| D-SE-05 | deviation | `Dashed` on the tropics: the 3D renderer has no screen-space dashes, so each tropic is cut into dashes of a fixed length in space (a period of 0.094, about 5 px on and 4 px off at the picture's scale, as in the snapshots). |
| D-SE-06 | deviation | `Arrowheads[Medium]` is drawn as 0.03 of the width the picture shows (heads of about 10 px, as measured on the snapshots), as a cone. |
| D-SE-07 | deviation | The sliders have the pages' look (label above, value field and ⊕ beside the track) instead of Mathematica's label left of the slider. |
| Q-SE-01 | quirk kept | The red point, the black normal and the start of the red Sun arrow use `rotateEarth[h, sea + .5]`, the globe and the energy `rotateEarth[h, sea]`: the point is drawn half a turn (12 hours) away from where its energy is computed; at noon it sits on the night side (E-SE-01, N-SE-01). |
| Q-SE-02 | quirk kept | The night half is the fixed half-sphere x ≤ 0 (radius 1.01); it does not turn with the Sun's direction (E-SE-02). |
| Q-SE-03 | quirk kept | The accumulated plot lists `{aeng, aeng1, aeng2}` (latitude, equator, pole) with the styles {Red, Black, Blue}: there the latitude is red and the equator black, the opposite of the energy plot and its legend (E-SE-03). Its x values are the list positions 1 … 25, the "time (hr)" ticks 0 … 24. |
| Q-SE-04 | quirk kept | The tilt is 0.408 rad (23.38°) while the tropics and polar circles are drawn at 23.5° and 66.5° (E-SE-08). |
| Q-SE-05 | quirk kept | The day's tables have 25 hourly values, t = 0, 1, …, 24 (E-SE-04). |
| Q-SE-06 | quirk kept | `PlotLegends -> {equator, latitude, north pole}` uses undefined symbols, not strings; `north pole` is the product north·pole, which Mathematica writes "north pole" (E-SE-07). |
| K-SE-01 | known issue | The colours of the globe under Mathematica's default lighting are the shared approximation (`shared/mma-lighting.js`); with the map missing (D-SE-01) the globe cannot match the snapshots' colours anyway. Compare by eye (M-SE-03). |
| N-SE-01 | note | Why `sea + .5`: `ParametricPlot3D[… {s, 0, 2π} …, PlotStyle -> Texture[map]]` puts the map's left edge (longitude 180°) at s = 0, so Greenwich is at s = π. Half a year more in `rotateEarth` is half a turn (π) more, so the original draws the point on Greenwich of its map — but the model's Greenwich (where `energy` is computed and where noon faces the Sun) is at s = 0. The map is thus turned 12 hours against the model; the `+ .5` moves the point to the map instead of moving the map. Without the map (D-SE-01) only the 12-hour offset remains. |
| N-SE-02 | note | The `season·24` hours in `rotateEarth` are checked and correct: they add one turn per year, the difference between the solar and the sidereal day, so that solar noon stays at h = 12 all year (within ±10 minutes, the obliquity part of the equation of time; the orbit is a circle, so the eccentricity part is absent). Unit "the season term keeps solar noon near 12 h all year". |
| N-SE-03 | note | The saved states hold the settings only (the live state = the initial settings = snapshot 1; snapshots 2–4: lat 0 at h 0, lat 23.5 at h 8.3, season 0.798 at lat 23.5 and h 16.55). The values are checked against hand derivations, an independent formula with the solar declination and hour angle, and the snapshot pictures by eye. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the model, the globe without the map picture (D-SE-01), the energy plot with its legend and the accumulated plot, the three sliders, the opening state of the notebook, the errors switch for E-SE-01 … E-SE-04 (A-SE-08) |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.44 | 2026-11-27 | version number (v0.1.44: eight new apps, on predator–prey agents, Gaussian autocorrelation, solar mountings, asteroid-belt resonances, a planetary atmosphere, batch distillation, degrees of freedom of a distillation and Carnot cycles; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SE-01 | A world map on the globe from a freely licensed source (e.g. a public-domain coastline map), placed with Greenwich at the model's s = 0 | the reader sees where the point is | a licensed image in the repository; the map must be turned against the original's (N-SE-01) | D-SE-01, E-SE-01 |
| I-SE-02 | Units on the axes: W/m² for the power, Wh/m² (or kWh/m²) for the day's sum; "power" as the first plot's label | correct physics language | differs from the original's labels | E-SE-06 |
| I-SE-03 | Show the day's totals as numbers beside the accumulated plot | exact comparison of the three places | a port addition | F-SE-06 |
| I-SE-04 | The southern hemisphere (latitude −90 … 90) | the seasons reversed | changes a control's range | F-SE-02 |
| I-SE-05 | Animate the time of day (Mathematica's ⊕ animation is there; a play button by the plot) | the day runs by itself | small | F-SE-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked numerically (unit tests of `tests/unit/solar-energy-earth-surface.test.js`): the power formula against the
declination and hour-angle formula at 200 random settings, noon at the solstice and the equinox by hand, solar noon over
the year, the drawn position of the point, the night half, the colours and lengths of the tables.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SE-01 | mathematical | `pt`, `norm1`, `sunnorm1`: `tiltEarth . rotateEarth[h, sea + .5] . point[lat]` | the point, its normal and the start of the Sun arrow are drawn half a turn (12 hours) away from the point whose energy is plotted (`energy` and the globe use `rotateEarth[h, sea]`): at noon (snapshot 1) the point is on the night side while the plot shows the day's maximum; at midnight it is drawn in full sun (snapshot 2). The `+ .5` puts the point on Greenwich of the original's map, whose Greenwich is half a turn from the model's (N-SE-01) | kept: Q-SE-01 **Switch:** with "errors of the original: corrected" (A-SE-08, v0.1.41) — the point and both arrows are drawn with rotateEarth[h, sea], where the energy is computed: at noon the point faces the Sun. | the point and the two arrows jump to the opposite meridian; the red arrow then starts on the lit side whenever the plotted energy is above 0; plots unchanged; with a map, the map would have to be turned by half a turn instead (I-SE-01) | switchable since v0.1.41 |
| E-SE-02 | conceptual | `night = ParametricPlot3D[1.01 {-Cos[u] Sin[v], Sin[u] Sin[v], Cos[v]}, {v, 0, π}, {u, -π/2, π/2}, …]` | the night half is always the half x ≤ 0, which faces away from the Sun only at season 0; the Sun's direction `sun[sea]` turns with the season, so at season 0.5 the "night" covers the sunlit half and at 0.25 or 0.75 it is a quarter turn off (snapshot 4, season 0.798) | kept: Q-SE-02 **Switch:** with "errors of the original: corrected" (A-SE-08, v0.1.41) — the night half is turned about the z axis by 2π·season, so that it always covers the side turned away from the Sun. | the dark half moves with the season; at season 0 nothing changes (snapshots 1–3 unchanged), snapshot 4's picture changes; plots unchanged | switchable since v0.1.41 |
| E-SE-03 | mathematical | `engtot = ListLinePlot[{aeng, aeng1, aeng2}, PlotStyle -> {{Red}, {Black}, {Blue}}, …]` | `aeng` is the chosen latitude and `aeng1` the equator, so the accumulated plot draws the latitude red and the equator black — the opposite of the energy plot (`{energy[0, …], energy[lat, …], …}` with the same styles) and of the legend placed between the two plots (snapshot 1: the red total 11 969 is Greenwich's, the black 9 535 the equator's) | kept: Q-SE-03 **Switch:** with "errors of the original: corrected" (A-SE-08, v0.1.41) — the equator is red and the latitude black in both plots, as the legend says. | the red and black curves of the accumulated plot swap; values unchanged | switchable since v0.1.41 |
| E-SE-04 | mathematical | `eng = Table[energy[lat, t, sea], {t, 0, 24, 1}]` (also `eng1`, `eng2`) and their `Accumulate` | a day has 24 hourly intervals but the table has 25 values, t = 0 and t = 24 both being midnight: wherever the Sun is up at midnight the day's total is one hour too large — the pole at season 0: 25 × 542.63 = 13 566 instead of 24 × 542.63 = 13 023 (+4.2 %); the last point is drawn at x = 25, past the axis' 24 | kept: Q-SE-05 **Switch:** with "errors of the original: corrected" (A-SE-08, v0.1.41) — the sum runs over the 24 hours t = 0, 1, …, 23. | the accumulated curves end at x = 24; totals change only where the Sun is up at midnight (polar day: the pole and latitudes above about 66.6° near the summer solstice) | switchable since v0.1.41 |
| E-SE-05 | text | Caption: "The model does not consider solar attenuation, weather, shade, altitude, incident angle, or air density." | the model consists of the incident angle: `energy = 1367.6 Max[0, sun . normal]` is the solar constant times the cosine of the angle of incidence on a horizontal surface (Lambert's law); it ignores the atmosphere (and so the longer path of slanting rays), not the angle | kept: the caption as written | one word less in the caption; no value changes | kept |
| E-SE-06 | text | `PlotLabel -> "energy"` on both plots, `AxesLabel -> {…, "watts/m"^2}` on the accumulated plot | the first plot shows power per area (irradiance, W/m²), not energy; the second plot sums hourly W/m² values, which is energy per area in watt-hours per m² (Wh/m²), but its axis says watts/m² | kept: the original's labels | labels "power" / "W/m²" and "energy" / "Wh/m²" (I-SE-02); no value changes | kept |
| E-SE-07 | text | `PlotLegends -> {equator, latitude, north pole}` | the legend entries are undefined symbols, not strings: shown in another context they carry it — the Demonstration's own snapshots 2–4 read "Global`equator", "Global`latitude", "Global`north Global`pole" — and `north pole` is the product north·pole; a value given to `latitude` (also the name of the original's function arguments) would replace the text | shows the names without context at every setting (D-SE-02) | strings "equator", "latitude", "north pole": the published snapshots would read as snapshot 1 | kept |
| E-SE-08 | numerical | `tiltEarth` with 0.408 rad; `cancer`, `capricorn`, `artic`, `antartic` at 66.5°, 113.5°, 23.5°, 156.5° from the pole | the axis tilt 0.408 rad = 23.38° and the circles' 23.5° disagree (the Earth's obliquity is 23.44°): at the drawn Tropic of Cancer the noon Sun at the solstice is 0.12° from the zenith | kept: Q-SE-04 | with one value (23.44°) everywhere: powers change by at most 0.3 % (the pole at the solstice 542.63 → 544.02 W/m², the equator at noon 1255.34 → 1254.74 W/m²) and the circles move by under a pixel; not offered in the switch because nothing visible changes | kept |
| E-SE-09 | text | Details & Citations, References (notebook) | the template placeholders "Details, references or citation information" and "References for demonstration." were left in the notebook; the published page shows no Details | not shown: the page has no Details, as the published page | none | kept |
