# Manual checks — Solar Energy Yield for Three Mounting Systems (`demos/solar-yield-mounting-systems/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md` (create it with `npm run test-run -- solar-yield-mounting-systems`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb`.
Port (all items): `http://127.0.0.1:8080/demos/solar-yield-mounting-systems/` (after `npm run serve`).

The controls of the original, at the left in three framed panels: "latitude …" with its slider; "panel angle …"
with its slider, "optimized @" and the setters "winter solstice | summer solstice" and "equinox"; the date with its
slider and the setter "winter | spring | summer | autumn". Below them the bar chart of the daily yields. To set a
slider to a value: click its ⊕, click into the value field of the panel that opens, select the number, type the new
value and press Enter.

### M-SY-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-SY-08).

### M-SY-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same plot, bars and values (F-SY-05, F-SY-06).

### M-SY-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-SY-01…F-SY-03).

### M-SY-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-SY-01).

### M-SY-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-SY-01).

### M-SY-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-SY-07 The optimized angles
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — latitude 40.
**Do** —
1. Click "summer solstice", "winter solstice", then "equinox"; read the panel angle heading each time and note which
   setter shows pressed.
2. Move the latitude slider a little; note whether the pressed setter stays pressed.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-07: the three
angles, the pressed setters.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — 16.6 °, 63.4 °, 40 °; the setter pressed while the angle equals its value (F-SY-02).

### M-SY-08 Autumn and winter bars
**Open** — `_internal\originals\wolfram-2026-11-27\SolarEnergyYieldForThreeMountingSystems.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click "autumn", then "winter"; look at the bar chart under the controls each time.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_solar-yield-mounting-systems.md`, under the heading M-SY-08: bars or
the unevaluated text, and the bars' heights.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — K-SY-01: whether the original draws the bars there (port: about 9.2 and 4.0 for Full).
