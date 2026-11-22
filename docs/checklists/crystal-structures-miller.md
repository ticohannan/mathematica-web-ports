# Manual checks — Simple Crystal Structures and Miller Indices (`demos/crystal-structures-miller/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md` (create it with `npm run test-run -- crystal-structures-miller`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb`.
Port (all items): `http://127.0.0.1:8080/demos/crystal-structures-miller/` (after `npm run serve`).

The original's controls, top to bottom in the panel on the left: **crystal structure** (a popup menu), **repeats**,
**radius (red)**, **radius (blue)**, an empty line, the heading **cell shifts** with **x**, **y**, **z**, an empty line,
the checkboxes **unit cell** and **unit cell face**, an empty line, the checkbox **Miller planes** and the popup menus
**Miller h**, **Miller k**, **Miller l**. Each slider has a ⊕ button and a number on its right; to type a value, click
⊕, click into the number field that opens, type the value and press Enter.

### M-CM-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title and the caption (Objective, Goals/Tasks 1–7, the note on speed) with the port's title and the text under the picture.
2. Look at the sections "Details & Citations", "References", "Submission Notes" and "Keywords" of the notebook.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-01: per text: "same" or the differing words; the texts of the four sections.
**Save** — File > Close, Don't Save.
**Port** — the page's title, caption, **Details** (click to open) and credits.
**Expected / what it decides** — the same title and caption; the four sections hold only template texts (E-CM-06), and the port's Details say that the original has none (F-CM-13).

### M-CM-02 Opening picture and controls
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare every control's label and value with the port's: crystal structure SC, repeats 1, radius (red) 0.1, radius (blue) 0.1, the heading cell shifts with x, y, z at 0, unit cell and unit cell face unchecked (unit cell face greyed), Miller planes unchecked, Miller h, k, l 1 (greyed).
2. Compare the picture: eight small spheres at the corners of the cube 0 … 1, the box −1 … 2 on each axis, the tick labels −1, 0, 1, 2, the axis labels x, y, z and their edges.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's opening page.
**Expected / what it decides** — the same values and picture (F-CM-01 … F-CM-06, F-CM-10, F-CM-12); the layout of the controls differs (D-CM-08).

### M-CM-03 The four snapshots
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the panel) > **Initial Settings**.
**Do** —
1. Set repeats 2, radius (red) 0.331, check unit cell and unit cell face (snapshot 2). Compare: 27 spheres, the cell at the origin with blue faces, ticks −1 … 3, the axis labels.
2. Uncheck unit cell face, set crystal structure BCC (snapshot 3). Compare: 54 spheres, the cell's black edges.
3. Set crystal structure NaCl, radius (red) 0.288, radius (blue) 0.259 (snapshot 4). Compare the red and blue spheres and the box.
4. In the port, set the same values (popup, value fields: type, Enter; checkboxes).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-03: per step: "same" or the differences (sphere colours, sizes, cell, box, ticks); the axis labels as written (x or Global`x).
**Save** — File > Close, Don't Save.
**Port** — the same settings.
**Expected / what it decides** — the same pictures by eye (D-CM-05, D-CM-08); the original's axis labels may read Global`x as in snapshots 2–4 (D-CM-07).

### M-CM-04 The structures and their contact radii
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; check unit cell.
**Do** —
1. For each crystal structure (SC, BCC, FCC, HCP, CsCl, Diamond, NaCl, ZnS) look at the spheres' arrangement and colours.
2. Set radius (red) to 0.5 for SC and HCP, 0.433 for BCC, 0.354 for FCC, 0.217 for Diamond: do neighbouring spheres just touch?
3. ZnS: move radius (blue) from 0.1 to 1: do the blue spheres change?
4. HCP with repeats 1: how much of the crystal is cut off by the box (top, back)?
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-04: per structure: "same" or the difference; step 2: touch yes/no; step 3: blue spheres change yes/no; step 4: what is cut.
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — the same structures (F-CM-07); spheres touch at the contact radii (N-CM-04); the ZnS blue spheres do not change (Q-CM-01, E-CM-01); HCP cut at the box (Q-CM-04).

### M-CM-05 Cell shifts and the face
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; set repeats 3; check unit cell and unit cell face.
**Do** —
1. Move the cell-shift sliders x, y, z to 2 one after the other; watch the cell.
2. Set repeats 1: what happens to the cell and to the cell-shift sliders?
3. Set crystal structure HCP, repeats 2, cell shift y 1: does the cell sit on lattice points?
4. Set repeats 0: what range do the cell-shift sliders show?
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-05: per step: what the cell and the sliders do.
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — the same (F-CM-04, F-CM-08); step 3: the HCP cell is shifted by 1, not by √3 (E-CM-03); step 4: the port's sliders stay at 0 (D-CM-04).

### M-CM-06 Miller planes: colour, box and families
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; check Miller planes.
**Do** —
1. With (1 1 1): compare the planes' colour and shading and the box: is the box flattened to about 0.4 of its height (the spheres flattened too)?
2. Set Miller l to 0 (planes (1 1 0)): is the box a cube again? compare the planes' colour.
3. Set Miller h to −1 (planes (−1 1 0)), then h, k, l to 0 0 0: which planes are drawn?
4. Set h, k, l to 4 0 0: how many planes are there between x = 0 and x = 1?
5. Rotate the picture: do the planes reach the box faces at x = −1 and y = −1?
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-06: per step: "same" or the difference; the box proportions; the plane colours; the planes drawn.
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — the same (F-CM-09, F-CM-10); settles K-CM-01 (plane colour, flattened box of Q-CM-05); (0 0 0) draws the planes x = d (Q-CM-03); 4 0 0 gives x = 0, ¼, ½, ¾ only (E-CM-04); the planes do not reach x, y < 0 (Q-CM-06).

### M-CM-07 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\SimpleCrystalStructuresAndMillerIndices.nb` with Mathematica via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value; rotate the picture by dragging it.
**Do** —
1. ⊕ > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_crystal-structures-miller.md`, under the heading M-CM-07: "same" or the difference (controls, picture, view direction).
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — both return to the opening values and picture (A-CM-01); the rotation stays in both.

### M-CM-08 The page works on its own
**Steps** — open the port's page; use every control once; switch "errors of the original" to corrected and back; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-CM-01, A-CM-08).

### M-CM-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
