# Manual checks — Unit balls (`demos/unit-balls/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is
in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_unit-balls.md` (create it with `npm run test-run -- unit-balls`). Differences are
findings, not failures of the tester. Leads to settle are listed in `demos/unit-balls/DESIGN.md` §7 (K-UB-…).

Original notebook (all items):
`_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/unit-balls/` (after `npm run serve`).

The original's controls, left of the picture: the setter bar **dimension** (`2D`, `3D`), under it the formula line
‖(x, y, z)‖<sub>p</sub> = … (‖(x, y)‖<sub>p</sub> in 2D), the setter bar **discrete p** (`1/4`, `1/2`, `1`, `2`,
`3`, `4`, `9`, `16`, `∞`) and the slider **continuous p** (0.1 … 16, with + button and value field). Both p controls
set the same p. The picture is a 3D box with the plot label "…‐norm" on top; it can be rotated with the mouse. There
are no locators.

### M-UB-01 Texts
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing.
**Do** —
1. Read the title and the caption (first text paragraph).
2. Read the formula line under **dimension** in `3D`; click `2D` and read it again; click `3D`.
3. Scroll to **Source & Additional Information** > **Details & Citations** and read all paragraphs and formulas.
4. In the port, read the same texts (Details: click **Details** below the picture).
**Record** — for the title, caption, both formula lines and each Details paragraph or formula: "same" or the exact
difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 4. Expected: the same texts (the notebook's template placeholders are not shown, N-UB-04).
**Expected / what it decides** — identical texts (F-UB-18; see errors E-UB-01 to E-UB-03 for what the text claims).

### M-UB-02 Box, axes and labels at the default view
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ (top right of the panel) > Initial Settings (3D, p = 0.5). Do not rotate the picture.
**Do** —
1. Compare with the port and with `docs/original-snapshots/unit-balls-1.png`: box size and position in the picture,
   the tick labels −1.0 … 1.0, the axes labels *x*, *y*, *z*, the plot label "0.5‐norm" and its slight shift to the
   right of the centre.
2. Click `2D` and `2` under **discrete p**: compare the box, the axes labels *x*, *y*, "distance", no tick labels, and
   the plot label "2‐norm".
**Record** — for each of box, ticks, axes labels, plot label (text and position): "same" or the difference; screenshots
of both.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: as in the original; the plot label shifted slightly right (Q-UB-01).
**Expected / what it decides** — the same in both (F-UB-14, F-UB-15, F-UB-16, Q-UB-01).

### M-UB-03 Colours and shading
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. In `3D`, click in turn `1/2`, `1`, `2` and `∞` under **discrete p**; for each look at the orange/yellow surface and
   the dark mesh lines.
2. In `2D`, the same four values; look at the orange surface and the blue half-transparent plane at height 1.
3. Look especially at the octahedron's lower faces (p = 1, 3D) and the edges of the cube (p = ∞, 3D).
**Record** — for each of the eight pictures: "same" or where the shading or colour differs; Do 3: are the cube's edges
slightly rounded in the original (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the same colours; known differences in shading (D-UB-04, e.g. darker lower
octahedron faces) and the original's slightly rounded cube edges (D-UB-01).
**Expected / what it decides** — records the size of the shading differences (D-UB-04, D-UB-01).

### M-UB-04 One p, two controls
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Click `1/2` under **discrete p**: where is the **continuous p** slider's thumb, and what does its value show?
2. Click the + right of the slider, type `2` into its value field, Enter (or drag the slider exactly to 2): read the
   plot label; which **discrete p** button looks selected?
3. Click `∞`: where is the thumb, what does the value show?
4. In the slider's panel press the step-forward and step-back buttons once each: what happens?
**Record** — Do 1: thumb position and value text; Do 2: the plot label exactly ("2‐norm" or "2.‐norm") and the
selected button; Do 3: thumb position and value text; Do 4: the values after each press.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: Do 1 the slider moves to 0.5 and shows "1/2"; Do 2 the label "2.‐norm" for a
dragged 2 (a typed integer 2 may show "2‐norm") and the `2` button selected (Q-UB-02, K-UB-04); Do 3 the thumb at the
left end and "∞" (K-UB-05); Do 4 the port continues from 0.1.
**Expected / what it decides** — Do 1–3 the same in both; Do 4 settles K-UB-05.

### M-UB-05 Small p (K-UB-09; K-UB-01 resolved)
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `2D`.
**Do** —
1. Click `1/4` under **discrete p**: are the corners of the orange surface cut off by the box? Where is the blue
   plane (just above the bottom of the box)?
2. Type `0.1` into the **continuous p** value field (Enter); the same two questions.
3. Click `3D` and `1/4`: how long are the spikes compared with the box (reaching the box faces at ±1, or shorter)?
**Record** — Do 1 and 2: corners cut (yes/no), blue plane position; Do 3: spike length (e.g. "to about 0.7 of the
half-box") and a screenshot.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: corners NOT cut off (Mathematica's plot range reaches the corner values 24 and
1536) and the blue plane just above the bottom; in 3D the port's spikes reach the box faces (needle-thin).
**Expected / what it decides** — Do 1–2 the same in both (K-UB-01, resolved); Do 3 settles K-UB-09.

### M-UB-06 Rotation
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings (3D).
**Do** —
1. Press in the picture and drag about 3 cm to the left: the box rotates. Note where the axes, ticks and tick labels
   are drawn now.
2. Click `2` under **discrete p**: does the picture return to the default view?
**Record** — Do 1: on which box edges the axes and ticks are (screenshot); Do 2: returns (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the port returns to the default view (Q-UB-03); its axes stay on the default
edges (D-UB-05).
**Expected / what it decides** — Do 2 settles K-UB-07; Do 1 records D-UB-05.

### M-UB-07 Mesh lines
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings (3D).
**Do** —
1. Click `1`: on one face of the octahedron count the interior mesh lines parallel to each edge.
2. Click `∞`: on one face of the cube count the cells in each direction.
3. Click `1/4`: count the mesh lines visible on one spike.
**Record** — the three counts (and screenshots).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: 7 interior lines parallel to each edge; 16 × 16 cells; for 1/4 the
port's count.
**Expected / what it decides** — settles K-UB-03 (the mesh rule for other p).

### M-UB-08 Typed values
**Open** — `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click the + right of **continuous p** to show its value field.
**Do** — type each of the following into the value field and press Enter, then read the field, the plot label and
the picture: `1/4`, `2.5`, `50`, `0`, `-1`, `Infinity`, `Sqrt[2]`.
**Record** — for each input: accepted (yes/no), the value shown afterwards, the plot label, anything unusual (error
box, empty picture, message).
**Save** — File > Close, Don't Save.
**Port** — the same inputs. Expected in the port: 1/4, 2.5, 50 and Infinity (as ∞) accepted; 0, -1 and Sqrt[2]
refused (D-UB-07).
**Expected / what it decides** — settles K-UB-06 (what the original's field accepts).
