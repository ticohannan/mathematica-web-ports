# Manual checks — Voronoi Diagrams (`demos/voronoi-diagrams/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md` (create it with `npm run test-run -- voronoi-diagrams`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb`.
Port (all items): `http://127.0.0.1:8080/demos/voronoi-diagrams/` (after `npm run serve`).

### M-VD-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's. The original's Details are template placeholders; the port shows none (E-VD-01).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-VD-09).

### M-VD-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-VD-07); the original opens with its saved points only from the notebook's saved state — after Initial Settings it draws new random points (D-VD-02).

### M-VD-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-VD-01…F-VD-04).

### M-VD-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-VD-01).

### M-VD-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-VD-01).

### M-VD-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-VD-07 Adding and deleting points
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Alt-click (⌘-click) on empty space three times; note the number of cells.
2. Alt-click (⌘-click) on points until three remain, then once more.
3. Turn on "show borders".
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-07: per step: the number of cells and whether a new random point appeared.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — cells added and removed as in the port; at three points a deletion adds a random point (E-VD-02).

### M-VD-08 Colour schemes
**Open** — `_internal\originals\wolfram-2026-11-11\VoronoiDiagrams.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Open the "color scheme" menu and note the number of entries and the first and last names.
2. Choose BeachColors, DarkRainbow, LakeColors, PlumColors and SunsetColors in turn.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_voronoi-diagrams.md`, under the heading M-VD-08: the menu count and names; per scheme "same colours" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same 51 names in the same order (Mathematica 15) and the same cell colours for the five schemes.
