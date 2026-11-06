# Manual checks — Time Shifting and Time Scaling in Signal Processing (`demos/time-shifting-scaling/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md` (create it with `npm run test-run -- time-shifting-scaling`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb`.
Port (all items): `http://127.0.0.1:8080/demos/time-shifting-scaling/` (after `npm run serve`).

### M-TS-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md`, under the heading M-TS-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-TS-12).

### M-TS-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md`, under the heading M-TS-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-TS-10).

### M-TS-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md`, under the heading M-TS-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-TS-01…F-TS-06).

### M-TS-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md`, under the heading M-TS-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-TS-01).

### M-TS-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-TS-01).

### M-TS-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-TS-07 Coupling of b, a and T
**Open** — `_internal\originals\wolfram-2026-11-06\TimeShiftingAndTimeScalingInSignalProcessing.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move T by a few steps; note b.
2. Move b; note T.
3. Move a; note T.
4. Set a to 0; note the lower plot.
5. Tick and untick each display checkbox.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_time-shifting-scaling.md`, under the heading M-TS-07: per step: the values shown and "same" or the difference in the plots and legends.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same values (T shown as "2." etc.) and plots; legend entries of hidden curves stay (F-TS-05, F-TS-06; Q-TS-01, Q-TS-03).
