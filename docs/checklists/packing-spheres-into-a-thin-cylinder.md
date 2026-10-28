# Manual checks — Packing Spheres into a Thin Cylinder (`demos/packing-spheres-into-a-thin-cylinder/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md` (create it with `npm run test-run -- packing-spheres-into-a-thin-cylinder`). Items M-PS-07 and
M-PS-08 compare what only a person can judge: the 3D look and the contact network.

Original notebook (all items): `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb`.
Port (all items): `http://127.0.0.1:8080/demos/packing-spheres-into-a-thin-cylinder/` (after `npm run serve`).

### M-PS-01 Texts
**Open** — `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md`, under the heading M-PS-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-PS-17).

### M-PS-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md`, under the heading M-PS-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: R 1, angle 0., opacity 0.6, 8 spheres in a line, "compression ratio = 1"; the controls in two rows of two (F-PS-15, F-PS-05; the port shows the angle as "0", D-PS-08).

### M-PS-03 Each control
**Open** — `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md`, under the heading M-PS-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original: R moves the black point along the plot and changes the arrangement at the critical radii; the angle turns the spheres about the axis; opacity fades the spheres; spheres adds whole levels (F-PS-01…F-PS-04, F-PS-12).

### M-PS-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md`, under the heading M-PS-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-PS-01).

### M-PS-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-PS-01).

### M-PS-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-PS-07 The four snapshots
**Open** — `_internal\originals\wolfram-2026-10-28\PackingSpheresIntoAThinCylinder.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — in the notebook, scroll to the section Snapshots.
**Do** —
1. On the port, set R 2.361 and spheres 17 (type into the value fields); compare with snapshot 2.
2. Set R 2.708 (snapshot 3), then R 1.924 with sphere opacity 0.024 (snapshot 4).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_packing-spheres-into-a-thin-cylinder.md`, under the heading M-PS-07: per snapshot: the caption's number, the number of spheres, and any difference in the arrangement or colours.
**Save** — File > Close, Don't Save.
**Port** — the steps above.
**Expected / what it decides** — captions 0.238794, 0.172977, 0.461848; the same arrangements, contact lines and colours; the tube a little larger in snapshots 2–3 and a little smaller in snapshot 4, the caption a little lower (F-PS-16, D-PS-07).

### M-PS-08 Contacts behind transparent spheres
**Steps** — on the port, set sphere opacity 0 and slide R slowly from 1 to 3.
**Record** — any blue line that does not join two spheres, any black line that does not end on the tube wall.
**Expected** — blue lines join touching spheres, black lines run from each centre to the wall (F-PS-08, F-PS-09); between R/r 2.7013 and 2.7099 the layers of five do not quite touch (E-PS-01).
