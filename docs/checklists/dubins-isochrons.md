# Manual checks — Dubins isochrons (`demos/dubins-isochrons/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md` (create it with `npm run test-run -- dubins-isochrons`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/dubins-isochrons/` (after `npm run serve`).

Where things are in the original (snapshot 1): the controls are in a column on the left, the plot on the right. Under the
heading "plot parameters": the slider labelled **r (m)**, the slider labelled **t (s)** (each with a small **+** button
right of the slider that opens its animation panel with a value field; the value is printed right of the **+**), and the
button row **set** with the buttons **=** and **≤** followed by an italic *t*. A line, then under "move car": the button row
**path** (buttons **RS**, **LS**, **LR**, **RL**), the slider **τ (s)** and the slider **p (%)** (each with **+** and value).
The **⊕** button is at the top-right corner of the panel. The test-run file for a day is
`_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md` (one per app and day; write the item ID as a heading).

### M-DI-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare every paragraph, in particular the four formulas (RS, LS, RL, LR) sign by
   sign, the sentence "For a car starting at (0, 0, 0)" and the sentence about the dashed circles; compare both
   references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-01: per text: "same" or the differing words or signs.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-DI-20), including the errors E-DI-01…03 (Q-DI-01).

### M-DI-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check the controls: **r (m)** 2, **t (s)** 10, **set** "=" selected, **path** RS selected, **τ (s)** 0.5, **p (%)** 100.
2. Check the plot: axes through the origin with labels at ±5, ±10, ±15 and minor ticks every 1; outer isochrons blue
   (right) and orange (left) meeting at (0, 10), inner ones red and green crossing near (0, 5.5); dark grey band
   between outer and inner curves, light grey lobes, white centre; dashed grey circles of radius 2 at (±2, 0); red start
   car at the origin pointing up (no beams); blue path (short right arc, then straight) to the green car near
   (2.4, 9.7) with long yellow beams clipped at the image edge.
3. Zoom 200 % (Window > Magnification) at the origin: are the axis lines drawn over the red car or under it?
4. Measure the thickness (px) of an isochron curve and the plot width (px) on a screenshot.
5. ⊕ > Initial Settings; repeat step 2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-02: yes/no per point of steps 1–2; step 3: over/under; step 4: the two numbers; step 5: same picture yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-DI-07…F-DI-16); step 3 settles K-DI-06.

### M-DI-03 Reachable regions (snapshots 2–4)
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **≤** in the **set** row.
**Do** —
1. Click **LR** in the **path** row; click the **+** right of **τ (s)**, type `5.57`, Enter (snapshot 2).
2. Click **RL**; type `4.27` in the **τ (s)** field, Enter (snapshot 3); then `1.2`, Enter (snapshot 4).
3. Each time compare with the snapshot picture: four translucent regions (blue, orange, green, red) with thin outlines
   in the same colours, a vertical outline on the y-axis from about (0, 5.5) to (0, 10), white holes beside the origin.
4. Look for any area where one colour is darker than elsewhere (a fold drawn twice) or for seams/stripes inside one
   colour.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-03: per setting: like the snapshot yes/no; step 4: where darker areas or seams appear.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`setter-set-*`, `setter-path-*`, `value-tau`).
**Expected / what it decides** — snapshots 2–4 (F-DI-13, D-DI-02); darker folds settle K-DI-02.

### M-DI-04 The car along the four paths
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click the **+** right of **τ (s)**, type `3`, Enter.
**Do** —
1. For each button of the **path** row (**RS**, **LS**, **LR**, **RL**): drag the **p (%)** slider's thumb slowly from
   0 to 100 and watch the green car and the thick path.
2. With each path type, type `30` in the **p (%)** field (via its **+**) and look at the car's front wheels.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-04: per path type: starts at the origin heading up yes/no; turns then drives straight (RS, LS) or turns the
other way (RL, LR) yes/no; ends on the matching isochron yes/no; front wheels turned during turns yes/no; does the
thick path change with p; step 2: which way the front wheels point.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`setter-path-*`, `slider-p`, `value-p`).
**Expected / what it decides** — F-DI-08, F-DI-09; at p = 30 (p t/100 = τ) the wheels already show the second
segment (Q-DI-04); the thick path does not change with p (Q-DI-09).

### M-DI-05 Extreme settings
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag **r (m)** to its left end (0.5) and **t (s)** to its right end (14).
2. Drag **r (m)** to its right end (10) and **t (s)** to its left end (0.1).
3. ⊕ > Initial Settings; type `14` in the **τ (s)** field (via its **+**).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-05: per step: a screenshot name and a one-line description (spirals around the turning circles; tiny
picture at the origin; pure turn).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-r`, `slider-t`, `value-tau`); compare shapes.
**Expected / what it decides** — same shapes (F-DI-08, F-DI-12, F-DI-13); step 3 a pure turn for the whole time (Q-DI-08).

### M-DI-06 Responsiveness of the "≤" plot
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **≤** in the **set** row.
**Do** —
1. Drag the **t (s)** slider's thumb quickly back and forth for 3 s; then the **r (m)** slider's.
2. Set **r (m)** 0.5 and **t (s)** 14 (type in their fields), then repeat step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-06: the delay (s) between releasing the mouse and the final picture, per step; whether the picture updates
during the drag.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; record the port's delay too.
**Expected / what it decides** — both recompute on every update while dragging (Q-DI-07, D-DI-08); a much slower
port is a reason for I-DI-05.

### M-DI-07 Grey band corners for r < 1 (Q-DI-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (set "="); type `0.7` in the **r (m)** field and `5` in the **t (s)** field (via
their **+** buttons).
**Do** —
1. Zoom 400 % (Window > Magnification) and look at the grey band near (0, 5) and near the lower ends of the curves.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-isochrons.md`, under the heading M-DI-07: whether the band's edge stops short of the curve ends and is closed by a short straight chord (where).
**Save** — File > Close, Don't Save.
**Port** — the same on the page; the port shows the same chords.
**Expected / what it decides** — chords in both (Q-DI-03, E-DI-04).
