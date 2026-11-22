# Manual checks — Lotka-Volterra Competition Model (`demos/lotka-volterra-competition/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md` (create it with `npm run test-run -- lotka-volterra-competition`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb`.
Port (all items): `http://127.0.0.1:8080/demos/lotka-volterra-competition/` (after `npm run serve`).

### M-LV-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-LV-13).

### M-LV-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-LV-11; streamlines placed differently, D-LV-01).

### M-LV-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag "competition coefficients" > species 1 (α) slowly from 0.01 to 2; note where the label changes between "stable coexistence …", "two‐species competition outcomes / One species …" and the basin picture.
2. Initial Settings; the same with species 2 (β).
3. Initial Settings; drag each of the four other sliders from one end to the other.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-03: per control: "same" or the difference (values where the picture changes).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original, the cases change at the same values (F-LV-01, F-LV-02, F-LV-05).

### M-LV-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every slider away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-LV-01).

### M-LV-05 The snapshot settings
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Type α = 0.62, β = 1.25 into the sliders' fields (click the field, select all, type, Return); note the picture.
2. Type α = 1.45, β = 1.4; note the picture, the separatrices and the two colours.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-05: per setting: the label, the equilibria, the colours, and how the streamlines differ.
**Save** — File > Close, Don't Save.
**Port** — the same values in the fields of `value-α` and `value-β`.
**Expected / what it decides** — the same case, label, equilibria, nullclines, separatrices and basins; streamlines placed differently (D-LV-01) (F-LV-12).

### M-LV-06 The reset button
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click **reset** under the sliders; note every slider's value and the time plot.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-06: the six values shown.
**Save** — File > Close, Don't Save.
**Port** — the same on the port (`button-reset-button`).
**Expected / what it decides** — k1 = k2 = 120, r1 = r2 = 0.15, α = 0.63, β = 0.53 in both (Q-LV-01, F-LV-03).

### M-LV-07 Small growth rates in the saddle case
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — type α = 1.45, β = 1.4.
**Do** —
1. Type r1 = 0.05 and r2 = 0.05; wait for the picture; note where the black separatrices end and which regions are blue and gray.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-07: the separatrices' end points and the colour of the regions near (0, 1) and near (1, 0).
**Save** — File > Close, Don't Save.
**Port** — the same values; first with "errors of the original: kept", then with "corrected".
**Expected / what it decides** — kept: the same wrong picture as the original (separatrices stop near the saddle); corrected: the separatrices reach (0, 1) and (1, 0) and the colours show the basins (E-LV-01).

### M-LV-08 α β = 1
**Open** — `_internal\originals\wolfram-2026-11-17\LotkaVolterraCompetitionModel.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Type α = 0.5 and β = 2; note what the output shows (messages, unevaluated code).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lotka-volterra-competition.md`, under the heading M-LV-08: what the original shows.
**Save** — File > Close, Don't Save.
**Port** — the same values on the port.
**Expected / what it decides** — the port shows the exclusion case with three equilibria; the original's output is recorded (D-LV-03).

### M-LV-09 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-LV-01).

### M-LV-10 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
