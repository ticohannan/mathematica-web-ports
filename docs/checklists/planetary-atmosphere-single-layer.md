# Manual checks — Single-Layer Model for Planetary Atmospheres (`demos/planetary-atmosphere-single-layer/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md` (create it with `npm run test-run -- planetary-atmosphere-single-layer`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb`.
Port (all items): `http://127.0.0.1:8080/demos/planetary-atmosphere-single-layer/` (after `npm run serve`).

The controls of the original, at the left of the pictures: the headings "albedo α", "emissivity ϵ" and "solar
distance d (AU)", each above a small slider with its value and ⊕; the setter "planet" (Earth, Mars, Venus, my own),
the checkbox "reset" and the setter "scale" (°C, °F). To set a slider to a value: click its ⊕, click into the value
field of the panel that opens, select the number, type the new value and press Enter.

### M-AT-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-AT-09).

### M-AT-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-AT-06, F-AT-07).

### M-AT-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-AT-01…F-AT-04).

### M-AT-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-AT-01).

### M-AT-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-AT-01).

### M-AT-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-AT-07 Planets, distance and reset
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click Mars; read "mean solar distance". Click reset; read ε, α and T<sub>p</sub>.
2. Click Venus and reset; read the distance and T<sub>p</sub>.
3. Click Earth; read the distance and the d slider. Set d to 3 and read the distance again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-07: the
distances and temperatures read, whether the reset box clears itself.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page; then with "errors of the original" corrected.
**Expected / what it decides** — Mars and Venus keep the slider's distance, Earth forces 1 even when the slider moves
(E-AT-01); reset sets the presets and clears itself (F-AT-03). Corrected: Mars 1.52, Venus 0.72.

### M-AT-08 Snapshot settings and tooltips
**Open** — `_internal\originals\wolfram-2026-11-27\SingleLayerModelForPlanetaryAtmospheres.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Set α = 0.64, ε = 0.94, d = 5 with "my own" (snapshot 5); read every number of the picture.
2. Hold the pointer over the numbers on the arrows and over the point of the plot; read the tooltips.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_planetary-atmosphere-single-layer.md`, under the heading M-AT-08: the
numbers that differ from the port's, the tooltips' texts.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same numbers (F-AT-06); the tooltips' wording may differ (D-AT-04).
