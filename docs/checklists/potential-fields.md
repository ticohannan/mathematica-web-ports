# Manual checks — Artificial Potential Fields (`demos/potential-fields/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_potential-fields.md` (create it with `npm run test-run -- potential-fields`). The page has
four tabs, one per Manipulate of the notebook (in its order); "each tab" below means all four.

Original notebook (all items): `_internal\originals\lectures\Lecture-22-PotentialFields.nb`.
Port (all items): `http://127.0.0.1:8080/demos/potential-fields/` (after `npm run serve`).

### M-PF-01 Texts
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook (the potentials are defined in its first cell; the four Manipulates start at their
initial values). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the notebook's heading ("Demonstration of Attractive, Repulsive, and Combination Potential Fields") and the
   four plot labels with the port's credits and the labels above the pictures (the notebook has no caption or
   Details; the port's are its own).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_potential-fields.md`, under the heading M-PF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-PF-05).

### M-PF-02 Opening picture
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook (the potentials are defined in its first cell; the four Manipulates start at their
initial values). Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. For each tab: compare the picture (surface or contours, colours, box, axes, the red lines) and every control's
   value with the port's tab.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_potential-fields.md`, under the heading M-PF-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-PF-04).

### M-PF-03 Each control
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook (the potentials are defined in its first cell; the four Manipulates start at their
initial values). Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. In each tab, move each control from one end of its range to the other, slowly; drag the 2D pads (the port: the
   locators of the obstacle pad) to each corner; note how the picture changes. The port's ρ<sub>0</sub> slider of
   the last two tabs and Add and Remove have no counterpart in the notebook (A-PF-10, A-PF-11).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_potential-fields.md`, under the heading M-PF-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-PF-01…F-PF-03).

### M-PF-04 Initial settings
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook (the potentials are defined in its first cell; the four Manipulates start at their
initial values). Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. In each tab: ⊕ (top-right) > **Initial Settings**; on the port, that tab's **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_potential-fields.md`, under the heading M-PF-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-PF-01).

### M-PF-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-PF-01).

### M-PF-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-PF-07 Default look of the 3D surfaces (K-PF-01)
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Take a screenshot of each of the three 3D outputs (Attractive, Repulsive, Attractive+Repulsive).
**Record** — under the heading M-PF-07: the three screenshots; per tab, the surface colour, mesh lines and lighting
compared with the port.
**Save** — File > Close, Don't Save.
**Port** — the first three tabs at their opening state.
**Expected / what it decides** — K-PF-01 (closed in v0.1.42 with Tico's screenshots of 2026-11-23): the port's
orange surface, the box proportions and the axis sides match the original's default Plot3D look; a new difference
reopens it.

### M-PF-08 The automatic height range (D-PF-04)
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook. Open the port's page next to it.
**Prepare** — Attractive+Repulsive (3D) and the contour plot at their initial values (both obstacles at {−1, 1}).
**Do** —
1. Read the top of the box in the 3D picture (hover over the vertical axis ticks) and the highest contour of the
   contour plot (hover over a contour line: its value shows as a tooltip).
2. Move one obstacle to a corner and read them again.
**Record** — under the heading M-PF-08: the four values.
**Save** — File > Close, Don't Save.
**Port** — the same states; the port's tops are in `window.__demo.view().zRange`.
**Expected / what it decides** — D-PF-04: how close the port's rule for the automatic range is beyond the two
screenshots it was fitted to (initial values: contours 1 … 7 and a top near 7.2).

### M-PF-09 The cut-off tops and the red exclusion lines (D-PF-03, D-PF-05)
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook. Open the port's page next to it.
**Prepare** — Repulsive at its initial values; Attractive+Repulsive (3D) with the obstacles at {−2, 2} and {2, −2}.
**Do** —
1. Look at the top of the repulsive peak (a flat cap or an open tube?) and at the red curves on the 3D sum.
**Record** — under the heading M-PF-09: a screenshot of each.
**Save** — File > Close, Don't Save.
**Port** — the same states.
**Expected / what it decides** — D-PF-03 (the cap: light grey in the screenshots of 2026-11-23) and D-PF-05 (where
and how thick the red exclusion curves and the white gap of the repulsive tab are).

### M-PF-10 The obstacle pad and the circle colours (A-PF-10 … A-PF-13)
**Open** — `_internal\originals\lectures\Lecture-22-PotentialFields.nb` with Mathematica via File > Open…; then
Evaluation > Evaluate Notebook (for the starting pictures only: the changes are Dr. Becker's requests of 2026-11-24 and
have no counterpart in the notebook). Open the port's page next to it.
**Prepare** — the port's contour tab at its initial values.
**Do** —
1. Press Add three times, drag each new locator to a different quarter of the pad, then select one and press Remove.
2. Move the ρ<sub>0</sub> slider from 0 to 5.
3. Tab to a locator and use the arrow keys and Delete.
4. Repeat on the 3D tab "Attractive + repulsive".
**Record** — under the heading M-PF-10: whether each locator keeps its colour, whether the white circles follow the
obstacles and ρ<sub>0</sub>, whether the red circle follows d<sub>i</sub>, and anything that is hard to use.
**Save** — File > Close, Don't Save.
**Port** — the steps above are on the port.
**Expected / what it decides** — A-PF-10 … A-PF-13 as Dr. Becker asked: one pad with a locator per obstacle in its own
colour, Add and Remove, a ρ<sub>0</sub> slider for the sum, white ρ<sub>0</sub> circles, a red d<sub>i</sub> circle,
labels with subscripts.
