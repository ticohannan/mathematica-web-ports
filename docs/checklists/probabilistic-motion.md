# Manual checks — Probabilistic Models for Robot Motion (`demos/probabilistic-motion/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md` (create it with `npm run test-run -- probabilistic-motion`).

Original notebook (all items): `_internal\originals\ProbabilisticModelsForRobotMotion.nb`.
Port (all items): `http://127.0.0.1:8080/demos/probabilistic-motion/` (after `npm run serve`).

### M-PM-01 Texts
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details (with the three equations and the reference) with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-PM-19).

### M-PM-02 Opening picture
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture (VelocityPDF density, green and red robots, centre of rotation and the two black arcs) and values: mode VelocityPDF, θ "0", v "2", ω "1.57", every α "0.02"; the frame ticks show over the density in both (N-PM-08) (F-PM-17, F-PM-08, F-PM-14).

### M-PM-03 Each control
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. In VelocityPDF, move each slider from one end of its range to the other, slowly; note how the picture changes.
2. Choose each mode in the popup once; in each, move v to a negative value and ω to 0.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original; α₅ and α₆ change nothing in VelocityPDF (Q-PM-02) and are disabled in the odometry modes; with ω = 0 the velocity modes draw no centre or arcs; the clouds are random in both, with the same spread (D-PM-01) (F-PM-01…F-PM-07, F-PM-14, F-PM-15).

### M-PM-04 Initial settings
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-PM-01, F-PM-17).

### M-PM-05 The page works on its own
**Steps** — open the port's page; move every control once; choose every mode; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-PM-01).

### M-PM-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-PM-07 Snapshots
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\probabilistic-motion-snapshot-1…5.png` (made by `npx playwright test tests/e2e/probabilistic-motion.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the five snapshot pictures with the screenshot of the same number: the density's shape and colours, the white gaps (snapshot 5), the cloud of samples (shape and spread), the robots, the arcs and lines, and the control values.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-07: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures and values ("0.150796", "1.99", "2.", "0."); the clouds have other points with the same shape (D-PM-01); in snapshot 5 the port's gaps are bands of constant width and the narrow white sector left of the start shows as two bands (D-PM-03) (F-PM-18).

### M-PM-08 The gaps of the OdometryPDF picture at other settings
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — choose OdometryPDF in both.
**Do** —
1. Compare the white gaps at the opening values of the sliders.
2. Set θ to 2.5, v to 1.5, ω to −1.2, α₁ to 0.05, α₂ to 0.01, α₃ to 0.03, α₄ to 0.02 (type the values) and compare again.
3. Set α₁ and α₂ to 0 and compare again (one support curve fewer).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-08: per setting: the gaps present in only one of the two pictures.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same curves in both: four rays from the start, the circle through the nominal end, the support boundaries (p₁'s gone in step 3); widths and the thin regions between close gaps may differ (Q-PM-01, D-PM-03, I-PM-01) (F-PM-10).

### M-PM-09 Samples and densities of the same model
**Open** — `_internal\originals\ProbabilisticModelsForRobotMotion.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any slider.
**Do** —
1. Switch between VelocityPDF and VelocitySample, then between OdometryPDF and OdometrySample, and compare the extent of the cloud with that of the bright part of the density.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_probabilistic-motion.md`, under the heading M-PM-09: per model: "cloud narrower than the density" or what is seen.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — in both programs the clouds are about √6 times narrower than the densities (E-PM-01, kept) (F-PM-09, F-PM-11).
