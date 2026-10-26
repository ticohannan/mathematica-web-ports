# Manual checks — Sensor Fusion with Normally Distributed Noise (`demos/sensor-fusion/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md` (create it with `npm run test-run -- sensor-fusion`).

Original notebook (all items): `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb`.
Port (all items): `http://127.0.0.1:8080/demos/sensor-fusion/` (after `npm run serve`).

### M-SF-01 Texts
**Open** — `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md`, under the heading M-SF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-SF-11; the Details typo E-SF-01 is kept on purpose).

### M-SF-02 Opening picture
**Open** — `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md`, under the heading M-SF-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: two filled curves, the dashed purple estimate peaking near 0.22 at about 2.7, the legend outside right (F-SF-06, F-SF-08, F-SF-10).

### M-SF-03 Each control
**Open** — `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md`, under the heading M-SF-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original; σ²₂…σ²₄ are greyed out while u is too small (F-SF-01, F-SF-02, F-SF-05).

### M-SF-04 Initial settings
**Open** — `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md`, under the heading M-SF-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-SF-01).

### M-SF-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-SF-01).

### M-SF-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-SF-07 Measurement locators
**Open** — `_internal\originals\SensorFusionWithNormallyDistributedNoise.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — set **number of measurements** to 2 in both.
**Do** —
1. Compare the ⊙ markers (colour, size) on the axis; drag the orange ⊙ from 4 to about −5, also trying to drag it up.
2. Press near x = 6 on the axis (where the invisible third locator is) and drag; then set **number of measurements** to 3.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_sensor-fusion.md`, under the heading M-SF-07: marker sizes and colours, whether the marker stays on the axis, what step 2 does.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — coloured ⊙ markers of similar size (K-SF-01), moving only along the axis in [−10, 10]; the estimate follows the dragged measurement; in step 2 the invisible locator moves too and the third curve appears where it was dropped (F-SF-03, F-SF-04, Q-SF-01).

### M-SF-08 Snapshot pictures
**Steps** — run the browser test "review screenshots at the four snapshot settings"; open the four pictures `docs/original-snapshots/sensor-fusion-1…4.png` next to `test-output/review-screenshots/chromium/sensor-fusion-snapshot-1…4.png`; compare each pair: curves, fillings, stems, the estimate's height and place, the legend rows, the frame labels.
**Record** — per snapshot: "same" or the difference.
**Expected** — the same pictures up to fonts and layout (estimate peaks about 0.22, 0.52, 0.27, 0.72; F-SF-06, F-SF-07, F-SF-08; D-SF-01…D-SF-05).
