# Manual checks — Operating an AC Three-Phase Induction Motor (`demos/three-phase-induction-motor/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md` (create it with `npm run test-run -- three-phase-induction-motor`). Items M-TB-03 and
M-TB-05 settle what only a person can see in Mathematica: the rims of the dark phase bands and the speed of the
animation.

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb`.
Port (all items): `http://127.0.0.1:8080/demos/three-phase-induction-motor/` (after `npm run serve`).

### M-TB-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-TB-12); the port note is the port's own (A-TB-08).

### M-TB-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page: phase position, magnitude, phase shift, skew.
2. In the 3D picture note which phase bands are coloured (lit), where the orange indicator stands, and how the four white holes look (only their tops, or whole white bars).
3. Note how thick the black outline of the orange indicator is (in px, estimated).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-02: per difference: what, where; the lit bands (colour and side); the look of the holes; the outline's width.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — phase position 5.63, magnitude 1, phase shift 0, skew 50; lit: a slate-blue band at the back left, a lime band at the right, an orange band behind the shaft (F-TB-11, F-TB-08); the holes brighter in the port (K-TB-02); the outline thick in the original, 1 px in the port (D-TB-03).

### M-TB-03 Rims of the dark phase bands
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — set **phase position** (second row, slider with a value field) to 0.5 by typing 0.5 into its field (click ⊕ beside the slider to show the field) and Enter.
**Do** —
1. Look at the stator's top face and bottom: count the thin dark circles that belong to bands whose faces are not drawn (three bands at a = 0.5).
2. Compare the darkness of these circles with the rim of the yellow stator and with the rims of the lit bands.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-03: the number of dark circles; per kind of rim: darker, the same or paler than the stator's rim.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — six circles (two per dark band), as snapshots 1–4 show; decides whether D-TB-05 (rims at Opacity 0.6, other rims faded with their faces) is close enough.

### M-TB-04 Each control
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the panel) > **Initial Settings**.
**Do** —
1. Move **phase position** slowly from 0 to 2π: watch the lit bands go round (direction) and the rotor and indicator turn.
2. Set phase position 1; move **magnitude (±40%)** from 0.6 to 1.4: watch the fourth (olive) curve and the rotor angle.
3. Back to 1; move **phase shift (±80°)** from −80 to 80: watch the first (slate-blue) curve and the olive curve.
4. Move **skew (% bar pitch)** from 0 to 100: watch the red bars tilt.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-04: per control: "same" or the difference (direction of turning, shape of the curves, tilt).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the bands and the rotor turn clockwise seen from above (Q-TB-04); the olive curve is flat at 1.5 only for magnitude 1 and phase shift 0; at skew 100 a bar's top is one bar pitch ahead of its bottom (F-TB-03 … F-TB-06, N-TB-02).

### M-TB-05 Speed of the animation
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; have a stopwatch ready.
**Do** —
1. Click ▶ beside **animate** (top row) and time ten turns of the bands (the slate-blue band at the back left lighting up ten times), then click ❚❚.
2. Note whether the red bars seem to turn, stand still or creep backwards while it plays.
3. Click the upper of the two arrow buttons (faster) once, play again and time ten turns; then slower once.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-05: the time for ten turns at the start and after one click on faster; what the bars seem to do.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (▶, ⇈ faster, ⇊ slower).
**Expected / what it decides** — about 2.1 s for ten turns in the port (AnimationRate 30, 2π per turn); after faster 1.25 times as fast; decides K-TB-01, Q-TB-06 and D-TB-01 (Mathematica's factor of the faster button).

### M-TB-06 Slider and animation in step
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag **phase position** to about 3.
2. Click ▶ beside **animate**, wait one second, click ❚❚.
3. Watch where the phase position slider stands while it plays.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-06: whether the animation continued from about 3 or started from 0; whether the slider moves with it.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the animation continues from the slider's value and the slider follows it (F-TB-02, N-TB-04).

### M-TB-07 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\OperatingAnACThreePhaseInductionMotor.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-phase-induction-motor.md`, under the heading M-TB-07: "same" or the difference; the phase position shown afterwards.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both go to phase position 0, magnitude 1, phase shift 0, skew 50 (A-TB-01, N-TB-01).

### M-TB-08 The page works on its own
**Steps** — open the port's page; play and pause the animation; move every slider once; press **Initial settings**;
drag the motor picture sideways.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; the motor turns with the drag; Initial settings restores the initial
values (A-TB-01).

### M-TB-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the plot goes below the motor.
