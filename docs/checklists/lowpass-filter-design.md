# Manual checks — Lowpass Filter Design by Pole Placement (`demos/lowpass-filter-design/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md` (create it with `npm run test-run -- lowpass-filter-design`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb`.
Port (all items): `http://127.0.0.1:8080/demos/lowpass-filter-design/` (after `npm run serve`).

### M-LF-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md`, under the heading M-LF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-LF-12).

### M-LF-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md`, under the heading M-LF-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-LF-10).

### M-LF-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md`, under the heading M-LF-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-LF-01…F-LF-04).

### M-LF-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md`, under the heading M-LF-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-LF-01).

### M-LF-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-LF-01).

### M-LF-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-LF-07 Manual poles
**Open** — `_internal\originals\wolfram-2026-11-06\LowpassFilterDesignByPolePlacement.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — choose "manual".
**Do** —
1. Drag one pole to a new place.
2. Alt-click (⌘-click on a Mac) on empty space in the pole plot: a pole is added.
3. Alt-click (⌘-click) on a pole: it is deleted.
4. Note the n and α values after each step.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_lowpass-filter-design.md`, under the heading M-LF-07: per step: "same" or the difference (poles, magnitude plot, n, α).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same poles, magnitude plots and slider values (F-LF-04, F-LF-05; Q-LF-03).
