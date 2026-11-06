# Manual checks — Defects in an Optical Fiber (`demos/optical-fiber-defects/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md` (create it with `npm run test-run -- optical-fiber-defects`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb`.
Port (all items): `http://127.0.0.1:8080/demos/optical-fiber-defects/` (after `npm run serve`).

### M-OF-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md`, under the heading M-OF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-OF-11).

### M-OF-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md`, under the heading M-OF-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-OF-09).

### M-OF-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md`, under the heading M-OF-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-OF-01…F-OF-03).

### M-OF-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md`, under the heading M-OF-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-OF-01).

### M-OF-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-OF-01).

### M-OF-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-OF-07 Ray paths
**Open** — `_internal\originals\wolfram-2026-11-06\DefectsInAnOpticalFiber.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag each light source inside and outside the fiber (also into the white defect).
2. Set each light angle to a few values, including angles that give total internal reflection.
3. Change the defect height and width.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_optical-fiber-defects.md`, under the heading M-OF-07: per setting: "same" or the difference (ray paths, faint rays, blue normals).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same ray paths and normals (F-OF-06, F-OF-07; D-OF-02 for the faintness of weak rays).
