# Manual checks — Degree-of-Freedom Analysis on a Distillation Process (`demos/distillation-degrees-of-freedom/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md` (create it with `npm run test-run -- distillation-degrees-of-freedom`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb`.
Port (all items): `http://127.0.0.1:8080/demos/distillation-degrees-of-freedom/` (after `npm run serve`).

The controls of the original, in two rows above the pictures: the popup "balance on", the setter "species B
representation" (1−z<sub>A</sub>, z<sub>B</sub>) and the cyan button "new problem"; then the slider "total number of unknowns"
and, while the condenser is chosen, the setter "partial condenser | total condenser". The known variables are random:
problem numbers give other choices in the port (D-DD-01), so compare counts, not which labels are blue.

### M-DD-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md`, under the heading M-DD-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-DD-09).

### M-DD-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md`, under the heading M-DD-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same counts and statuses (F-DD-06, F-DD-07); the known variables differ (D-DD-01).

### M-DD-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md`, under the heading M-DD-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-DD-01…F-DD-05).

### M-DD-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md`, under the heading M-DD-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-DD-01).

### M-DD-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-DD-01).

### M-DD-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-DD-07 Counting by hand
**Open** — `_internal\originals\wolfram-2026-11-27\DegreeOfFreedomAnalysisOnADistillationProcess.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. For each of the four balances and both representations, count the blue labels on the green streams and compare with
   "unknowns =", then check "degrees of freedom = unknowns − 2 − extra information".
2. With the condenser chosen, switch partial / total condenser; note the relation shown and the extra information.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distillation-degrees-of-freedom.md`, under the heading M-DD-07: any
balance where the printed count differs from your count, in the original or in the port.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the counts follow F-DD-06 in both; K<sub>c</sub> = y<sub>4</sub>/x<sub>6</sub> (1) for partial,
y<sub>2</sub> = x<sub>4</sub> = x<sub>6</sub> (2) for total (F-DD-05).
