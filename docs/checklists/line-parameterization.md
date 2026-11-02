# Manual checks — Line Parameterization (`demos/line-parameterization/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md` (create it with `npm run test-run -- line-parameterization`). The notebook is a
lecture notebook (not a published Demonstration); it opens in its saved state ρ = 1.8, θ = π/4 — use ⊕ > Initial
Settings where an item says so.

Original notebook (all items): `_internal\originals\lectures\Lecture-18-lineparameterization.nb`.
Port (all items): `http://127.0.0.1:8080/demos/line-parameterization/` (after `npm run serve`).

### M-LP-01 Texts
**Open** — `_internal\originals\lectures\Lecture-18-lineparameterization.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. The notebook has no title, caption or Details; read the port's caption and Details for agreement with the
   picture.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md`, under the heading M-LP-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — the port's texts are marked as its own and describe what the original shows (A-LP-07).

### M-LP-02 Opening picture
**Open** — `_internal\originals\lectures\Lecture-18-lineparameterization.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — in the original ⊕ > Initial Settings (ρ = 1, θ = 0); the port opens there.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
2. In both, set ρ = 1.8 and the dial to π/4 (the notebook's saved state) and compare again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md`, under the heading M-LP-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-LP-12, F-LP-13).

### M-LP-03 Each control
**Open** — `_internal\originals\lectures\Lecture-18-lineparameterization.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md`, under the heading M-LP-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-LP-01…F-LP-03).

### M-LP-04 Initial settings
**Open** — `_internal\originals\lectures\Lecture-18-lineparameterization.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md`, under the heading M-LP-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-LP-01).

### M-LP-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-LP-01).

### M-LP-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-LP-04 ρ = 0 and the dial below the x axis
**Open** — `_internal\originals\lectures\Lecture-18-lineparameterization.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag ρ to 0: look at the origin (arc, arrowheads, right-angle mark).
2. Set ρ = 1 and click the dial at −π/2: compare the dial's arc with the picture's arc and θ label.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_line-parameterization.md`, under the heading M-LP-04: what each draws at ρ = 0; Do 2 "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — Do 1 settles K-LP-01 (the port draws no arc and no arrow at ρ = 0); Do 2: the dial shows −π/2 clockwise, the picture 3π/2 counter-clockwise, in both (E-LP-01).
