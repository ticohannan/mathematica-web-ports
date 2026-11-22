# Design document: How to Catch a Standing Wave

| | |
|---|---|
| Code version: | 0.1.41 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "How to Catch a Standing Wave", contributed by D. Meliga, S. Z. Lavagnino and A. Ratti, published 2017-09-20 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/HowToCatchAStandingWave/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

Two waves of the same frequency travel in opposite directions on a string; their sum is a standing wave with nodes. A
string fixed at both ends allows only standing waves with a node at each end: a whole number of half wavelengths λ/2
between the ends (quantization, as in a guitar string). The Demonstration plots the forward wave (blue) and the backward
wave (amber), and below them their sum between the fixed end at 0 and a movable "cavity end" (the black line), with the
nodes in black and red. The "frequency" slider, the "harmonics" setter and the "first harmonic" button set the waves and
the cavity length; the line can be dragged (caption).

## 2. Scope

In scope: the Demonstration's controls, pictures and behaviour, reproduced from its Manipulate code
(`docs/original-source/catch-a-standing-wave.txt`; the stored Manipulate of the notebook for what the front end added)
and checked against its snapshots (`docs/original-snapshots/catch-a-standing-wave-*.png`) and saved settings
(`tests/golden/catch-a-standing-wave.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-CA-01: a student explores the Demonstration in a browser, without Mathematica: finds the cavity lengths that allow
  a standing wave (drag the line to a node, or "first harmonic") and the overtones ("harmonics").
- UC-CA-02: Tico compares the port with the original (checklist `docs/checklists/catch-a-standing-wave.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-CA-01 | Vertical slider "frequency" `{{f, .18, "frequency"}, 1.4, .18, .01, ControlType -> VerticalSlider, Appearance -> "Labeled"}`: min 1.4 at the bottom, max 0.18 at the top (Q-CA-01), values 1.4 − k·0.01 (k = 0 … 122; the top end is 0.18 itself), the value shown under the slider as Mathematica writes it (0.18, 0.27, 1.4) | the waves' frequency (wave number) | v0.1.41 | unit "the frequency slider: values 1.4 − k·0.01"; e2e "the frequency slider: 0.18 at the top, 1.4 at the bottom"; M-CA-03 |
| F-CA-02 | Trigger "time" `{{t, 1, "time"}, 0, ∞, ControlType -> Trigger, AppearanceElements -> {"PlayPauseButton", "ResetButton", "FasterSlowerButtons"}}`: play/pause from the current t at 1 unit per second, faster and slower, reset to 0 (K-CA-05) | the waves move in time | v0.1.41 | e2e "the Trigger plays, goes faster or slower, and resets the time to 0"; M-CA-10 |
| F-CA-03 | Setter bar "harmonics" `{{a, 1, "harmonics"}, {1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 5 -> "5th"}}`: the waves' wave number is a·f | the overtones of the cavity π/f | v0.1.41 | e2e "the harmonics setter multiplies the frequency of the waves"; unit "nodes at iπ/(a f) up to the cavity end" |
| F-CA-04 | Upper plot `Plot[{Sin[a f x - t], Sin[a f x + t]}, {x, 0, 20}, PlotRange -> {{-1, 20}, {-2.1, 2.1}}, Epilog -> {Thick, Line[{{First[pt], -1}, {First[pt], 1}}]}, AxesLabel -> {"length", "amplitude"}, PlotLabel -> "forward and backward waves", ImageSize -> {300, 200}]`: forward wave blue, backward wave amber (ColorData[97]), the cavity line from −1 to 1 | the two travelling waves | v0.1.41 | unit "the two plots: waves Sin[a f x ∓ t]"; e2e "loads without errors and draws the picture" |
| F-CA-05 | pt starts as the expression {π/f, 0} (the notebook stores `pt$$ = {f$$^(-1) Pi, 0}` in its live state and initial settings): while it is not moved, the cavity end follows π/f when the frequency changes (the first harmonic); a drag, an arrow key or "first harmonic" makes it a number that stays (K-CA-02) | the opening picture stays the first harmonic | v0.1.41 | unit "pt holding {π/f, 0} follows the frequency"; e2e "the frequency slider: 0.18 at the top, 1.4 at the bottom; the cavity end follows π/f until it is moved"; e2e "dragging the line in the waves plot moves the cavity end, which then stays when f changes"; M-CA-07 |
| F-CA-06 | Lower plot `ListLinePlot[sin6[a f, N[First[pt]], t], …, PlotStyle -> Green, PlotLabel -> "standing wave"]` with `sin6[f_, n_, t_] := Table[{x, Sin[f x + t]} + {0, Sin[f x - t]}, {x, 0, n, .001}]` (the standing wave from 0 to the cavity end), Epilog: the cavity line from −2 to 2, nodes `Point[Table[{i π/(a f), 0}, {i, 1, N[First[pt] a f/π]}]]` in black (PointSize[Large]), red points at {0, 0} and {π/f, 0} (Q-CA-02) | the standing wave and its nodes | v0.1.41 | unit "sin6 samples {x, Sin[f x + t] + Sin[f x − t]}"; unit "nodes at iπ/(a f) up to the cavity end, read from the snapshot pictures"; unit "a resonance whose bound comes out just below a whole number still draws the node at the cavity end"; unit "the two plots: waves Sin[a f x ∓ t]"; M-CA-11 |
| F-CA-07 | Setter "first harmonic" `{{pt, {π/f, 0}, ""}, {{π/f, 0} -> "first harmonic"}, ControlType -> SetterBar}`; Manipulate made its value list Dynamic (stored: `Dynamic[{{Pi/f$$, 0} -> "first harmonic"}]`), so a press sets pt to {π/f, 0} at the current f (snapshot 3 holds π/f of its f to the last bit); the button is drawn pressed while pt equals that value (snapshots 1 and 3) (K-CA-03, Q-CA-03) | puts the cavity end on the first harmonic | v0.1.41 | unit "the first harmonic setter gives {π/f, 0} at the current f"; unit "the snapshots: cavity end, nodes, and the"; e2e "sets the cavity end to π/f at the current frequency"; M-CA-09 |
| F-CA-08 | `LocatorPane[Dynamic[pt], Dynamic[Column[{…}]], Appearance -> None]`: an invisible locator over both plots; a press anywhere in either plot moves the cavity end there and a drag moves it on; coordinates of the first plot, limited to its plot range −1 … 20 × −2.1 … 2.1, so a press in the lower plot gives y = −2.1 (K-CA-01, Q-CA-05) | "click and drag the line" | v0.1.41 | e2e "dragging the line in the waves plot moves the cavity end"; e2e "a press in the standing-wave plot moves the cavity end there, with y held at −2.1 (LocatorPane over the Column)"; M-CA-08 |
| F-CA-09 | Control column (ControlPlacement -> Left): the spacers `""`, a Delimiter and the texts `Style["click and drag the line", 13]`, `Style["to change the cavity length", 13]` | the original's layout | v0.1.41 | e2e "has its controls with their defaults"; M-CA-02 |
| F-CA-10 | Opening state = the notebook's live state = its initial settings: f = 0.18, t = 1, a = 1, pt = {π/f, 0} | the saved settings | v0.1.41 | unit "the opening state is the live state of the notebook and its initial settings"; e2e "has its controls with their defaults"; M-CA-02 |
| F-CA-11 | Caption, Details and references from the Demonstration | the original's explanation | v0.1.41 | M-CA-01 |
| F-CA-12 | The four snapshot settings give the snapshots' pictures (cavity end, nodes, red points, the pressed button, the slider value) | faithfulness | v0.1.41 | unit "the snapshots: cavity end, nodes"; e2e "the snapshot settings + screenshots for review" |
| A-CA-01 | "Initial settings" button restores the opening state (pt again the expression {π/f, 0}) | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state"; M-CA-04 |
| A-CA-02 | Test and automation hook `window.__demo` (getState, setState — a snapshot's pt given as the expression {π/f, 0} holds it again —, view, graphics, moveLocator, worldToClient, setClock) from the Manipulate layer | automated tests | v0.1.41 | e2e "the snapshot settings + screenshots for review" |
| A-CA-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-CA-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-CA-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-CA-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: catch-a-standing-wave runs from its own folder" |
| A-CA-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-CA-08 | The invisible cavity locator can be focused (Tab) and moved with the arrow keys (0.05 per press, Shift × 5) | keyboard use | v0.1.41 | e2e "arrow keys move the focused cavity locator" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `vslider-f` | F-CA-01 |
| `trigger-*-t` | F-CA-02 |
| `setter-a-*` | F-CA-03 |
| `setter-pt-first-harmonic` | F-CA-07 |
| `locator-pt` | F-CA-08 |
| `reset` | A-CA-01 |
| `crumbs` | A-CA-04 |
| `details` | F-CA-11 |
| `credits` | A-CA-05 |

## 6. Design

- `model.js` (pure): `initialState()`; `ptValue(state)` (pt's value: {π/f, 0} at the current f while `ptExpr` is
  `'Pi/f'`, the stored point otherwise); `isPiOverF(pt)` (the saved form of the expression); `fAt(k)`, `fIndex(f)` (the
  slider grid); `firstHarmonic(f)`; `sin6(f, n, t)` (the Initialization); `nodeBound`, `nodes` (the node table, with the
  iterator tolerance of `shared/wl.js` `Table`, K-CA-04); `evaluate(state)` → `{ state, view, graphics: [upper plot,
  lower plot] }` with `Plot` and `ListLinePlot` of `shared/plot.js`; the body writes pt's value back, so the locator and
  the hook see the number.
- The state holds pt as a point and, beside it, `ptExpr` (`'Pi/f'` or `null`): Mathematica's variable pt either holds the
  expression {π/f, 0}, which is evaluated again with each f, or a number (F-CA-05).
- `main.js`: one `Manipulate({…})`. The frequency slider is an app-local `Control` around `addVerticalSlider` of
  `shared/ui-extra.js` (the browser's range input cannot run from 1.4 down to 0.18, so it holds the grid index; D-CA-01).
  The "first harmonic" setter is a SetterBar on pt whose `Assign` sets pt = {π/f, 0} at the current f; its pressed state
  is set after each evaluation from `view.firstHarmonicPressed`. The locator lives on the upper plot (`Appearance: None`,
  range = the plot range); `locators.onPlace` and the hook's `moveLocator` turn pt into a number (`ptExpr = null`);
  `merge` reads a pt given in the saved form. A press in the lower plot is handed to the upper plot's locator pane at
  the same screen point (one `pointerdown` listener), so x is the same and y, below the upper plot, is held at −2.1.
- Both plots use `ImageSize -> {300, 200}`; the port adds `ImagePadding` and the y tick step 1 to reproduce
  Mathematica's layout (D-CA-03).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- catch-a-standing-wave` → `dist/catch-a-standing-wave/`.
- Contents (generated with `node tools/bundle-app.mjs catch-a-standing-wave --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/catch-a-standing-wave/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/catch-a-standing-wave/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: catch-a-standing-wave runs from its own folder" (A-CA-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-CA-01 | deviation | The vertical slider is the browser's range input holding the grid index (bottom 0 = 1.4, top 122 = 0.18), with the label "frequency" above it instead of to its left; its blue fill and thumb are the browser's. Keys: arrows one step, Home = 1.4 (bottom), End = 0.18 (top). |
| D-CA-02 | deviation | Locator positions are not rounded: Mathematica rounds a dragged locator to about two decimals at this size (the snapshots store 19.26 and 11.82); the port keeps the pointer's exact coordinates (less than a pixel apart). A press within 12 px of the (invisible) locator grabs it without a jump, as the other ports (D-CL-06); Mathematica's no-jump distance is unknown. |
| D-CA-03 | deviation | Layout: the port gives both plots `ImagePadding -> {{24, 44}, {12, 20}}` (px) and y ticks every 1 (minor every 0.2), which is what Mathematica's automatic padding and ticks give at this size in the snapshots (the port's automatic choices would cut the label "length" and tick every 0.5). Fonts, the bold headings and the pictures' scale (they widen with the page) are the page's. |
| D-CA-04 | deviation | The Trigger is the shared one: ▶ / ❚❚, ⏮ (reset), ⇈ and ⇊ (faster, slower by a factor 1.25); Mathematica's speed steps are not known (K-CA-05). |
| Q-CA-01 | quirk | The frequency slider runs from 1.4 at the bottom to 0.18 at the top (min > max in the control spec): moving it up lowers the frequency. |
| Q-CA-02 | quirk | The second red point is at π/f, where the cavity end of the first harmonic is at the current f, not at the cavity end: with the line elsewhere (snapshot picture 2) it sits inside the string on a node. |
| Q-CA-03 | quirk | "first harmonic" is a SetterBar with one button: pressed while pt equals {π/f, 0} at the current f (always in the opening state, because pt holds the expression), light otherwise; it cannot be released by a press. |
| Q-CA-04 | quirk | The standing wave is sampled from 0 in steps of 0.001 up to the cavity end, so it ends up to 0.001 before the line (up to 20001 points); the upper plot is not cut at the line. A cavity end below 0 draws no standing wave and no nodes. |
| Q-CA-05 | quirk | pt's y coordinate is stored but never used: presses in the lower plot set it to −2.1 (the snapshots' {19.26, −2.1} and {11.82, −2.1}). |
| K-CA-01 | known issue (lead) | The LocatorPane's coordinates: Mathematica's documentation gives a range 0 … 1 for a background that is not a Graphics, but the snapshots store pt = {19.26, −2.1} and {11.82, −2.1}: plot units with y held at the bottom of the plot range. The port assumes the coordinates of the Column's first plot, extended over the whole pane and limited to its plot range (a press in the lower plot: x as in that plot, y = −2.1). M-CA-08 decides. |
| K-CA-02 | known issue (lead) | pt holds the expression {π/f, 0} until it is set to a number, so the line follows the frequency in the opening state (read from the stored `pt$$ = {f$$^(-1) Pi, 0}`; not seen in a snapshot). M-CA-07 decides. |
| K-CA-03 | known issue (lead) | The "first harmonic" button: press → pt = {π/f, 0} at the current f (snapshot 3: π/f to the last bit), pressed state = pt equals the setter's value (button shading of the four pictures: darker in 1 and 3). Whether a later change of f leaves the button light is assumed (SameQ with the re-evaluated Dynamic value). M-CA-09 decides. |
| K-CA-04 | known issue (lead) | The node table's upper bound N[(First[pt] a)(f/π)] can come out a few units in the last place below a whole number (0.9999999999999998 after "first harmonic" at f = 1.4, then f = 0.7 and "2nd"; 416 of 2017 such reachable resonances on the slider grid). The port counts it as the whole number (the tolerance of `shared/wl.js` Table, as Mathematica's Table did for 63.99999999999999 in the harness, K-RM-03), so the node at the cavity end is drawn. At the first harmonic itself the node is under the red point either way. M-CA-11 decides. |
| K-CA-05 | known issue (lead) | The Trigger over 0 … ∞: 1 unit per second (the shared default; snapshot 2's t = 11.26 fits about 10 s of play from 1), reset to 0, the factor of the faster/slower buttons. M-CA-10 decides. |
| N-CA-01 | note | The picture numbering: picture 1 is the opening state (the Demonstration's thumbnail); the Details' snapshots 1–3 are pictures 2–4 (2: forbidden wave, 3: third harmonic, 4: many nodes). |
| N-CA-02 | note | Picture 4 ("a generic resonant condition"): the line at 11.82 is 0.18 beyond the node at 11.64; the standing wave there is 2 sin(0.54 · 11.82) cos 1 ≈ 0.11, nearly but not exactly a node. |
| N-CA-03 | note | π/f is computed as a division; Mathematica evaluates Pi/f as π·(1/f), which differs in the last bit for 30 of the 123 slider values (not for snapshot 3's). No visible effect; the pressed state compares the port's own values. |
| N-CA-04 | note | One evaluation (both plots, up to 20001 samples) takes about 8–20 ms in Chromium, so the animation runs at the display's rate or a little below. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the two plots (Plot and ListLinePlot of shared/plot.js), the reversed vertical frequency slider, the Trigger with faster/slower buttons, the harmonics and "first harmonic" setters, pt holding the expression {π/f, 0} until moved, the LocatorPane over both plots; unit and browser tests, checklist items 07–11 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-CA-01 | Let the time dependence scale with the wave number (a fixed wave speed), as an option | higher harmonics oscillate faster, as on a real string | changes the animation and every picture at t ≠ 0; needs a choice of speed | E-CA-01 |
| I-CA-02 | Show the cavity length, the wavelength and the number of half wavelengths between the ends | the quantization condition can be read off | not in the original | F-CA-06 |
| I-CA-03 | Mathematica harness scenarios for the locator coordinates and the node bound | settles K-CA-01 and K-CA-04 without a person | Tico's Mathematica | K-CA-01, K-CA-04 |
| I-CA-04 | A visible handle or a hover cursor on the cavity line | shows that the line can be dragged | not in the original | F-CA-08 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him. Also checked and found right: the forward wave is
Sin[a f x − t] (moves to +x, blue) and the backward Sin[a f x + t]; their sum is 2 sin(a f x) cos t with nodes at
iπ/(a f); the first harmonic's cavity π/f holds a half wavelengths of the a-th harmonic (snapshot picture 3).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-CA-01 | conceptual | `Plot[{Sin[a f x - t], Sin[a f x + t]}, …]`, `sin6[f_, n_, t_] := Table[{x, Sin[f x + t]} + {0, Sin[f x - t]}, …]`; caption "The "frequency" slider determines the frequency of the three waves" | Time enters with angular frequency 1 whatever f and a: f (and a·f) is the wave number, not the frequency. All waves and every harmonic oscillate at the same rate in time, and the wave speed 1/(a f) changes with the slider; on a string (fixed wave speed v) the frequency is v·a·f/(2π), so the n-th harmonic oscillates n times as fast as the first. | Keeps it (F-CA-04, F-CA-06). | Sin[a f (x ∓ v t)] with a chosen v: the animation's speed scales with a·f; every picture at t ≠ 0 changes (the snapshots have t = 1 and 11.26); the choice of v is a design decision, not a local fix of the code (I-CA-01). | kept |
