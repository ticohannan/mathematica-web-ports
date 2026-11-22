# Design document: Guitar String Harmonics: Standing Waves

| | |
|---|---|
| Code version: | 0.1.41 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Guitar String Harmonics: Standing Waves", contributed by Connor Davenport (suggested by Edmon Perkins), published 2019-04-19 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/GuitarStringHarmonicsStandingWaves/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js` and the text column), `index.html` |

## 1. Purpose and background

A guitar string vibrating in a standing wave. Holding the string at a fret forces a node there and selects the
harmonic whose wavelength fits (caption). The Demonstration draws a fretboard with six strings; the sixth string
vibrates in the chosen harmonic (1st to 5th) with the forced node marked, and a text column beside the picture gives
the standing-wave, wavelength and frequency equations, the fret of the forced node for each harmonic and the
harmonic frequencies (82.4 Hz to 412.0 Hz, the low E string). A Trigger animates the time.

## 2. Scope

In scope: the Demonstration's controls, picture, text column and behaviour, reproduced from its Manipulate code
(`docs/original-source/guitar-string-harmonics.txt`) and checked against its snapshots
(`docs/original-snapshots/guitar-string-harmonics-*.png`) and saved settings
(`tests/golden/guitar-string-harmonics.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-GA-01: a student explores the harmonics of a guitar string in a browser, without Mathematica.
- UC-GA-02: Tico compares the port with the original (checklist `docs/checklists/guitar-string-harmonics.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-GA-01 | Popup menu "harmonic" `{{n, 1, "harmonic"}, {1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 5 -> "5th"}, ControlType -> PopupMenu, Appearance -> Large}` | the original's control: the harmonic shown | v0.1.41 | e2e "has its controls with their defaults"; e2e "the harmonic popup changes the wave and the forced node"; M-GA-03 |
| F-GA-02 | Trigger "time" `{{t, 0, "time"}, 0, 1, .01, ControlType -> Trigger, AnimationRate -> .05}`: play/pause and reset; t runs from its value to 1 at 0.05 per second (20 s for a whole run) in steps of 0.01 and stops at 1; reset sets 0 | the original's animation | v0.1.41 | e2e "the time Trigger plays at 0.05 per second in steps of 0.01, stops at 1 and resets to 0"; M-GA-04 |
| F-GA-03 | The fretboard: `RGBColor[0.85, 0.85, 0]` Rectangle {5.5, 0.05}–{−0.5, 25.55}; orange nut and bridge `Thickness[0.05]`; 12 brown frets `Thickness[0.02]` at the original's heights (the equal-tempered positions L 2^(−k/12) from the bridge); the black sound hole `Disk[{2.5, 7}, 3]`; six black string ends; strings 3–5 `GrayLevel[0.5]`, `Thickness[0.013]`, strings 1–2 `Thickness[0.018]`; `PlotRange -> {{−1.5, 6.5}, {0, L}}`, `ImageSize -> {263, 500}` | the original's picture | v0.1.41 | unit "the picture: fretboard, nut and bridge, 12 frets"; unit "the frets are the equal-tempered positions"; e2e "loads without errors and draws the picture beside the text column"; e2e "the snapshot settings: forced node, wave and colours" |
| F-GA-04 | The standing wave on the sixth string (x = 0, `Thickness[0.018]`): `Line[Table[{2 A Sin[2π x/(2 L/n) /. n -> 1] Cos[2π t (n/2 L) Sqrt[41.77] /. n -> 1], x}, {x, 0, n λ}]]` — n half waves on the string, oscillating with the time factor cos(2π t f[n]) | the original's wave | v0.1.41 | unit "the replacements /. n -> 1 change nothing"; unit "the Table runs over x = 0, 1, …, n λ"; unit "the time factor cos(2π t f[n])"; e2e "the harmonic popup changes the wave and the forced node" |
| F-GA-05 | The forced node `Disk[{0, L − L/n}, 0.25]` (black; for n = 1 on the bridge) | the original's node marker | v0.1.41 | unit "the forced node L − L/n is a node of the wave"; e2e "the harmonic popup changes the wave and the forced node" |
| F-GA-06 | The text column beside the picture (`Row[{picture, Text@Grid[…, Alignment -> Center]}]`): "standing wave equation" y = 2 A sin(2πx/λ) cos(ω t), "wavelength equation" λ = 2L/n, "frequency equation" ω = (nπ/L)√(T/ρ) (built-up fractions, a radical), "forced nodes" grid (`Frame -> All`) | the original's explanation | v0.1.41 | e2e "the text column: equations, forced nodes and harmonic frequencies"; M-GA-01 |
| F-GA-07 | "harmonic frequencies" grid: "1st harmonic" … "5th harmonic", `NumberForm[f[n], {4, 1}]`, "Hz" — 82.4, 164.8, 247.2, 329.6, 412.0 | the original's table | v0.1.41 | unit "the harmonic frequencies table shows 82.4, 164.8, 247.2, 329.6, 412.0 Hz"; e2e "the text column: equations, forced nodes and harmonic frequencies" |
| F-GA-08 | Initialization: L = 25.5, λ = 2 L, f[n_] := (n/2 L)·Sqrt[41.77], A = 0.25 | the original's constants | v0.1.41 | unit "the initialization: L = 25.5" |
| F-GA-09 | Opening state = the notebook's live state: n = 1, t = 0.27 (the string almost straight) | the saved state (golden data) | v0.1.41 | unit "the opening state is the live state of the notebook"; e2e "has its controls with their defaults (the live state n = 1, t = 0.27)"; M-GA-02 |
| F-GA-10 | Caption and Details text (snapshot captions, the variables) | the original's explanation | v0.1.41 | M-GA-01 |
| F-GA-11 | The four snapshot settings give the snapshot pictures (live state; 3rd, 4th, 5th harmonic at t = 0) | faithfulness | v0.1.41 | e2e "the snapshot settings: forced node, wave and colours"; M-GA-06 |
| A-GA-01 | "Initial settings" button restores the Manipulate's initial values n = 1, t = 0 (⊕ > Initial Settings) and stops a running Trigger | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores n = 1, t = 0"; M-GA-07 |
| A-GA-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, worldToClient, setClock) from the Manipulate layer | automated tests | v0.1.41 | e2e "has its controls with their defaults" |
| A-GA-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-GA-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-GA-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-GA-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: guitar-string-harmonics runs from its own folder" |
| A-GA-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `popup-n` | F-GA-01 |
| `trigger-*-t` | F-GA-02 |
| `reset` | A-GA-01 |
| `crumbs` | A-GA-04 |
| `details` | F-GA-10 |
| `credits` | A-GA-05 |

## 6. Design

- `model.js` (pure): the initialization (`L`, `λ`, `f`, `A`), the fret heights `FRETS`, `displacement(n, t, x)` (the
  Table's expression; the `/. n -> 1` rules are no-ops, Q-GA-01), `wavePoints(n, t)` (x = 0, 1, …, n λ),
  `forcedNode(n)`, `evaluate(state)` → `{ view, graphics }` (the Graphics list in the original's order and nesting, with
  `Annotation` test ids), and the text column's data `FORCED_NODES`, `harmonicFrequencies()` (`NumberForm` of
  `shared/number-form.js`).
- `main.js`: one `Manipulate({…})` — the popup (`PopupMenu`, `Rule` labels), the Trigger, `initial` = the live state,
  `initialSettings` = the Manipulate's initial values, `resetStops`. The text column does not depend on the controls; it
  is written once as HTML into `#text-panel` beside the picture (fractions and the radical as inline boxes).
- The picture: the plot range (8 × 25.5) fills the 500 px height of `ImageSize -> {263, 500}`, so it is 157 px wide;
  Mathematica centres it in the 263 px box, the page does the same (CSS in `index.html`, `maxWidth: '157px'`).
  `PlotRangePadding` 0 (measured: the range fills the snapshot's 500 px); the wave's points above the nut are cut off at
  the picture's edge, as in the original. `Thickness[r]` is r × the plot width (157 px), as measured in the snapshots.
- `CapForm["Square"]` for every line (N-GA-03).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- guitar-string-harmonics` → `dist/guitar-string-harmonics/`.
- Contents (generated with `node tools/bundle-app.mjs guitar-string-harmonics --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/guitar-string-harmonics/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 16 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/guitar-string-harmonics/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: guitar-string-harmonics runs from its own folder" (A-GA-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-GA-01 | deviation | The Trigger is drawn as two buttons (play/pause, reset); Mathematica's has three (play, pause, reset). |
| D-GA-02 | deviation | `Appearance -> Large` of the popup is not reproduced: the popup has the page's normal size (the shared popup control has no size option; the snapshots show a popup of ordinary height). |
| D-GA-03 | deviation | The text column is HTML beside the picture, in the browser's sans-serif font; the fractions and the radical are laid out by CSS, close to but not identical with Mathematica's boxes. In snapshot pictures 2–4 the frequency equation reads "T/Global`ρ": the symbol ρ (not a string in the code) was printed with its context when those snapshot cells were made. The port writes "ρ", as the live output (picture 1) does. |
| Q-GA-01 | quirk | The replacements `/. n -> 1` in the wave do nothing. In the Manipulate the rule's n is the Manipulate variable (`n$$ -> 1` in the stored body), which evaluates to (value of n) -> 1, and the expression it is applied to has already evaluated to a number. The wave therefore has the chosen harmonic's wavelength and frequency, as the snapshot pictures show (three half waves for the 3rd harmonic). The port computes the same, without the rules. |
| Q-GA-02 | quirk | The Table samples the wave at x = 0, 1, …, n λ = 2 n L: only 26 points lie on the visible string (x ≤ 25.5), the others are above the picture and cut off; the 5th harmonic (10.2 units per wavelength) is visibly a polyline. Kept. |
| Q-GA-03 | quirk | The time factor cos(2π t f[n]) uses the real frequency f[n] = 82.4 n Hz with t in seconds and the Trigger's steps of 0.01: each step turns the phase by 5.18 n rad, so the animation shows aliased motion (phase steps of −1.11, −2.21, 2.97, 1.86, 0.75 rad for n = 1 … 5; the 3rd harmonic flickers, the 5th moves slowest), not the frequencies of the table. At the opening t = 0.27 the factor is 0.0077 and the string looks straight. Kept (E-GA-02). |
| Q-GA-04 | quirk | The text column does not depend on the controls: the chosen harmonic is not marked in the tables. Kept. |
| K-GA-01 | known issue | Whether Mathematica's Trigger moves t in steps of 0.01 (the port does, as `shared/ui-extra.js` quantizes to the step) or continuously: the saved t = 0.27, a multiple of 0.01, suggests steps. M-GA-04 checks it. |
| N-GA-01 | note | `TrackedSymbols :> {n}`: Mathematica evaluates the Row again only when n changes, the Dynamic picture inside it follows t; the port evaluates the body after every change, which shows the same. `SaveDefinitions`, `SynchronousUpdating` need nothing. |
| N-GA-02 | note | The init line `Omega = 2π f` multiplies the symbol f (a function, not applied) by 2π and is never used (it is not among the saved definitions); not ported. The equations write ω (`\[Omega]` in the notebook). |
| N-GA-03 | note | Mathematica draws the line ends square: in every snapshot the nut and bridge reach half their width (3.9 px) past x = −0.5 and 5.5. The port sets `CapForm["Square"]` (the SVG default would round them). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the fretboard picture with the standing wave and the forced node, the popup "harmonic" and the Trigger "time", the text column (equations, forced nodes, harmonic frequencies); opening state = the live state; §11 E-GA-01, E-GA-02 (kept, no switch) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-GA-01 | Mark the chosen harmonic's rows in the two tables | the text follows the popup | not in the original | Q-GA-04 |
| I-GA-02 | A slow-motion time scale (e.g. one period of the fundamental per second) so that harmonic n visibly vibrates n times as fast | the animation shows the frequency ratios | changes every animated frame and the opening picture | Q-GA-03, E-GA-02 |
| I-GA-03 | Sample the wave finely (e.g. 200 points on the visible string) | a smooth curve for the higher harmonics | the pictures differ slightly from the snapshots | Q-GA-02 |
| I-GA-04 | Mathematica reference values (M-GA-04, M-GA-05 results) | the Trigger's stepping and the animation checked against Mathematica | Tico's Mathematica | K-GA-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers computed independently in the unit test
"E-GA-01". Units: L = 25.5 is taken as inches (a common steel-string scale length; the frets are its equal-tempered
positions). Neither finding is a local, well-defined code correction (each needs a new constant or a chosen time
scale), so there is no errors switch.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-GA-01 | mathematical | `f[n_] := (n/2 L)*Sqrt[41.77]` and the wave's `Cos[2π t (n/2 L)*Sqrt[41.77] …]` | Mathematica reads `n/2 L` as (n/2)·L, not n/(2L); the page's own frequency equation ω = (nπ/L)√(T/ρ) means f = n/(2L)·√(T/ρ). The constant 41.77 = (82.4/12.75)² was evidently fitted to the misread formula so that f[1] shows 82.4 Hz (the low E string): it is not T/ρ in any consistent unit | kept: the table shows 82.4, 164.8, 247.2, 329.6, 412.0 Hz and the wave uses f[n] = 82.40 n Hz, as the original | with f = n/(2L)·√41.77 alone every frequency becomes 0.127 n Hz (the table shows 0.1, 0.3, …); a consistent correction also replaces the constant by T/ρ = (2 L · 82.4)² ≈ 1.766 × 10⁷ in²/s² (wave speed ≈ 4202 in/s ≈ 106.7 m/s), and then nothing displayed changes — only the code and the constant | kept |
| E-GA-02 | conceptual | `Cos[2π t (n/2 L)*Sqrt[41.77] /. n -> 1]` with the Trigger `{t, 0, 1, .01}` | the time factor oscillates at 82–412 Hz but is sampled every 0.01 s of t, so the animation aliases: the apparent motion does not grow with n (per step −1.11, −2.21, 2.97, 1.86, 0.75 rad for n = 1 … 5: the 3rd harmonic flickers near the Nyquist limit, the 5th moves slowest), against the table's "harmonic frequencies" | kept (Q-GA-03) | with a slow-motion time scale (I-GA-02) harmonic n would vibrate n times as fast as the fundamental; every animated frame and the opening picture (t = 0.27) change, snapshot pictures 2–4 (t = 0) do not; the time scale is a choice, so it is not offered as a switch | kept |
