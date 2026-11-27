# Manual checks — Carnot Cycles with Irreversible Heat Transfer (`demos/carnot-irreversible-heat-transfer/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md` (create it with `npm run test-run -- carnot-irreversible-heat-transfer`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb`.
Port (all items): `http://127.0.0.1:8080/demos/carnot-irreversible-heat-transfer/` (after `npm run serve`).

The controls of the original, in one row above the picture: the setter "heat engine | heat pump" (variable csb),
the slider |T<sub>h</sub> − T<sub>H</sub>| (ΔT1) and the slider |T<sub>c</sub> − T<sub>C</sub>| (ΔT2), each with a ⊕ and its value at the
right. To set a slider to a value: click its ⊕, click into the value field of the panel that opens, select the
number, type the new value and press Enter.

### M-CI-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-CI-07).

### M-CI-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-CI-04, F-CI-05).

### M-CI-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-CI-01…F-CI-03).

### M-CI-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-CI-01).

### M-CI-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-CI-01).

### M-CI-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-CI-07 The snapshots' settings
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Set heat engine, ΔT1 = 26, ΔT2 = 10 (snapshot 2); read every box.
2. Set heat pump, ΔT1 = 8, ΔT2 = 36 (snapshot 3); read every box and look at the heads on the four strokes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-07: per
setting, the numbers that differ from the port's, and where the stroke heads sit.
**Save** — File > Close, Don't Save.
**Port** — the same settings on the port's page.
**Expected / what it decides** — the same numbers (F-CI-05); heads at a third, two thirds and the end of each stroke for
the engine, pointing back at the start, a third and two thirds for the pump (D-CI-02).

### M-CI-08 The heat pump's COP
**Open** — `_internal\originals\wolfram-2026-11-27\CarnotCyclesWithIrreversibleHeatTransfer.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — heat pump, ΔT1 = 8, ΔT2 = 36.
**Do** —
1. Read COP, W<sub>S</sub> and Q<sub>H</sub>; compute |Q<sub>H</sub>|/W<sub>S</sub> and Q<sub>C</sub>/W<sub>S</sub>.
2. On the port, switch "errors of the original" to corrected and read COP again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_carnot-irreversible-heat-transfer.md`, under the heading M-CI-08: the
three numbers, the two quotients and the port's corrected COP.
**Save** — File > Close, Don't Save.
**Port** — the same settings on the port's page, both switch positions.
**Expected / what it decides** — the original's COP equals Q<sub>C</sub>/W (2.5); the port's corrected COP equals
|Q<sub>H</sub>|/W (3.5) (E-CI-01).
