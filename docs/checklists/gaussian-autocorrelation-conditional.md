# Manual checks — Linking Autocorrelation of Gaussian Random Process to Conditional Probabilities (`demos/gaussian-autocorrelation-conditional/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md` (create it with `npm run test-run -- gaussian-autocorrelation-conditional`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb`.
Port (all items): `http://127.0.0.1:8080/demos/gaussian-autocorrelation-conditional/` (after `npm run serve`).

The controls of the original, above the grid of plots: the sliders "lag τ" (t), y and "threshold L", each with a ⊕
and its value at the right; then the setter "autocorrelation function R<sub>XX</sub>(τ) =" with three choices. To set a
slider to a value: click its ⊕, click into the value field of the panel that opens, select the number, type the new
value and press Enter.

### M-GR-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md`, under the heading M-GR-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-GR-09).

### M-GR-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md`, under the heading M-GR-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same pictures and values (F-GR-03…F-GR-07).

### M-GR-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md`, under the heading M-GR-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-GR-01, F-GR-02).

### M-GR-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md`, under the heading M-GR-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-GR-01).

### M-GR-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-GR-01).

### M-GR-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-GR-07 Numbers at other settings
**Open** — `_internal\originals\wolfram-2026-11-27\LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Choose the second function (tri); set τ = 0.3, y = −1, L = 0.5; read the three numbers below the pdf.
2. Choose the third function; set τ = 1.1, y = 3, L = 1; compare the two curves of "conditional probability" at the
   right end.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_gaussian-autocorrelation-conditional.md`, under the heading M-GR-07:
the numbers, and whether the two curves meet at the right.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same numbers (F-GR-06); the curves meet beyond the correlation time (F-GR-05).
