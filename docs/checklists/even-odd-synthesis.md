# Manual checks — Synthesis with Even and Odd Functions (`demos/even-odd-synthesis/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md` (create it with `npm run test-run -- even-odd-synthesis`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb`.
Port (all items): `http://127.0.0.1:8080/demos/even-odd-synthesis/` (after `npm run serve`).

### M-EO-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's. The original's Details are template placeholders; the port shows none (E-EO-02).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md`, under the heading M-EO-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-EO-09).

### M-EO-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md`, under the heading M-EO-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-EO-07).

### M-EO-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md`, under the heading M-EO-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-EO-01, F-EO-02).

### M-EO-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md`, under the heading M-EO-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-EO-01).

### M-EO-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-EO-01).

### M-EO-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-EO-07 Shift and the even and odd parts
**Open** — `_internal\originals\wolfram-2026-11-06\SynthesisWithEvenAndOddFunctions.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. For each signal, move T from −10 to 10 slowly.
2. Compare the upper plot and, as far as it can be read in the original, the lower plot.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_even-odd-synthesis.md`, under the heading M-EO-07: per signal: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same input plots; the lower plot the same curves at a larger size (F-EO-04, F-EO-05; D-EO-01).
