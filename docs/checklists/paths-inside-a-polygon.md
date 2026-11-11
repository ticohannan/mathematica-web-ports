# Manual checks — Paths inside a Polygon (`demos/paths-inside-a-polygon/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md` (create it with `npm run test-run -- paths-inside-a-polygon`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb`.
Port (all items): `http://127.0.0.1:8080/demos/paths-inside-a-polygon/` (after `npm run serve`).

### M-PI-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-PI-11).

### M-PI-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-PI-09).

### M-PI-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-PI-01…F-PI-03).

### M-PI-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-PI-01).

### M-PI-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-PI-01).

### M-PI-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-PI-07 A point on a corner (K-PI-01)
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag the start point far outside the polygon (it jumps to a corner).
2. Note whether a red path and blue edges are drawn, and any message.
3. Do the same with the finish point, then with both.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-07: per step: "path drawn", "no path" or the message.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same as the port (a path from the corner); if Mathematica draws no path or shows a message, K-PI-01 becomes a recorded difference.

### M-PI-08 A point on an edge (E-PI-01)
**Open** — `_internal\originals\wolfram-2026-11-11\PathsInsideAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — choose "orthogonal".
**Do** —
1. Drag the start point onto the left edge at about (169, 970) and the finish point onto the same edge at about (169, 1020) (the positions round to whole numbers; check the shown coordinates by hovering).
2. Note whether a path is drawn.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_paths-inside-a-polygon.md`, under the heading M-PI-08: "path drawn", "no path", or an error picture / message (copy it).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — no path in the port; in Mathematica no path or an error picture (E-PI-01, D-PI-02).
