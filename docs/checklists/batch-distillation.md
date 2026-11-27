# Manual checks — Batch Distillation (`demos/batch-distillation/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md` (create it with `npm run test-run -- batch-distillation`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb`.
Port (all items): `http://127.0.0.1:8080/demos/batch-distillation/` (after `npm run serve`).

The controls of the original, in two rows above the picture: the slider "initial mole fraction in still", the
button "reset" and the popup menu of the mixture; the slider "amount to evaporate (moles)", the play button "click to
collect:" and the radio buttons "display:".

### M-BA-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md`, under the heading M-BA-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-BA-11).

### M-BA-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md`, under the heading M-BA-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-BA-08…F-BA-10).

### M-BA-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md`, under the heading M-BA-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-BA-01…F-BA-06).

### M-BA-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md`, under the heading M-BA-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-BA-01).

### M-BA-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-BA-01).

### M-BA-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-BA-07 A run of collections
**Open** — `_internal\originals\wolfram-2026-11-27\BatchDistillation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — click "reset" in both; choose "minimum boiling azeotrope" in both.
**Do** —
1. Click "click to collect" and wait until the flask is set aside; repeat until the play button is disabled.
2. Note the mole fraction and amount of every flask and the still's numbers at the end.
3. Choose "T–x–y plot" and note the temperature.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_batch-distillation.md`, under the heading M-BA-07: the numbers of each
flask, the still's at the end, the temperature, and how long a collection takes.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same numbers to the digits shown (F-BA-05, F-BA-07, F-BA-09); a collection takes
about 4 s in both.
