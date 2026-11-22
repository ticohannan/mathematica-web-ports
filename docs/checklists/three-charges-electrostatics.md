# Manual checks — Electrostatics of a Linear System of Three Charged Particles (`demos/three-charges-electrostatics/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md` (create it with `npm run test-run -- three-charges-electrostatics`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb`.
Port (all items): `http://127.0.0.1:8080/demos/three-charges-electrostatics/` (after `npm run serve`).

The controls (Mathematica and port alike): at the top, first row the sliders *q*<sub>1</sub> (μC), *q*<sub>2</sub> (μC),
*q*<sub>t</sub> (μC), second row *x*<sub>1</sub> (m), *x*<sub>2</sub> (m), *x*<sub>t</sub> (m), each with its value
field at the right; below them the checkboxes "plot net force (N)", "plot net field (MN/C)", "show data at
*x*<sub>t</sub>", "show equilibrium data". To type a value: click into the value field right of the slider, select its
text, type the number, press Enter.

### M-TA-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title and the caption (three paragraphs) with the port's title, caption and port note.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's title, caption, port note and `credits`.
**Expected / what it decides** — identical title and caption; the port note is the port's own (F-TA-12, A-TA-08).

### M-TA-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture (the three charges, their colours, signs and labels, the two small arrow figures at the top) and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: q<sub>t</sub> black at −8, q<sub>1</sub> and q<sub>2</sub> red at 0 and 5, the F arrows both to the right (the left one longer), the E arrows both to the left (F-TA-06, F-TA-10, F-TA-11).

### M-TA-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right) > **Initial Settings**.
**Do** —
1. Drag each of the six sliders slowly from one end to the other and back; for *q*<sub>1</sub> watch the value field when it passes from −1 to 1.
2. Click each of the four checkboxes on and off.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-03: per control: "same" or the difference; whether the charge slider ever shows 0 (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original; the charge sliders jump from −1 to 1 (F-TA-01 … F-TA-03, F-TA-05, F-TA-07, F-TA-08).

### M-TA-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value; check all four boxes.
**Do** —
1. ⊕ (top right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture with all boxes unchecked (A-TA-01).

### M-TA-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-TA-01).

### M-TA-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-TA-07 Typed charge 0 and coinciding charges
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; check "show equilibrium data".
**Do** —
1. Type 0 into the value field of *q*<sub>2</sub>; note the value the field and the slider show afterwards.
2. Type 5 into *q*<sub>2</sub> again, then type 0 into the value field of *x*<sub>2</sub> (both charges at 0, q<sub>1</sub> + q<sub>2</sub> = 10).
3. Note the text of the orange table.
4. Type −5 into *q*<sub>2</sub>; note the text of the orange table.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-07: step 1: the value shown; step 3: the table's text; step 4: the table's text; any message in the Messages window.
**Save** — File > Close, Don't Save.
**Port** — the same steps; the port shows −1 after step 1, "±∞" after step 3, "everywhere" after step 4.
**Expected / what it decides** — decides D-TA-01 (a typed value not in the list) and K-TA-01 (NSolve's answer when x<sub>1</sub> = x<sub>2</sub> and q<sub>1</sub> + q<sub>2</sub> ≠ 0).

### M-TA-08 Target on a charge
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; check "show data at *x*<sub>t</sub>".
**Do** —
1. Type 0 into the value field of *x*<sub>t</sub> (the target on *q*<sub>1</sub>).
2. Look at the whole picture: its background, the two small arrow figures at the top, the blue table.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-08: the texts of the blue table; whether the arrows of the two small figures are drawn (yes/no, each); whether the picture has a pink or otherwise marked background (yes/no); any message in the Messages window.
**Save** — File > Close, Don't Save.
**Port** — the same steps; the port shows "Indeterminate" for F<sub>1t</sub>, F<sub>net</sub>, E<sub>1</sub>, E<sub>net</sub>, draws no arrows in the two figures and no marked background.
**Expected / what it decides** — decides K-TA-02 (the look of the original with invalid arrows) and E-TA-02.

### M-TA-09 Snapshot values
**Open** — `_internal\originals\wolfram-2026-11-17\ElectrostaticsOfALinearSystemOfThreeChargedParticles.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Set q<sub>1</sub> = 20, q<sub>2</sub> = −3, q<sub>t</sub> = −19, x<sub>1</sub> = 0, x<sub>2</sub> = −1 and type 5 into *x*<sub>t</sub>; check all four boxes (snapshot 4).
2. Read both tables.
3. Set q<sub>1</sub> = −6, q<sub>2</sub> = −6, q<sub>t</sub> = 12, x<sub>1</sub> = −6, x<sub>2</sub> = −2, x<sub>t</sub> = 6.6; uncheck "show data at *x*<sub>t</sub>" (snapshot 3); read the orange table.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_three-charges-electrostatics.md`, under the heading M-TA-09: every number of the tables, with its sign.
**Save** — File > Close, Don't Save.
**Port** — the same steps; the port's numbers are those of the snapshot pictures, except perhaps the sign of a 0.0000.
**Expected / what it decides** — the same numbers; whether *E*<sub>net</sub> at the equilibrium shows "−0.0000" in Mathematica 15 as in the snapshot (K-TA-03, F-TA-13).
