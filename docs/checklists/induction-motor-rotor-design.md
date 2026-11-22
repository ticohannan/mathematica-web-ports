# Manual checks — AC Induction Motor Rotor Design (`demos/induction-motor-rotor-design/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md` (create it with `npm run test-run -- induction-motor-rotor-design`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb`.
Port (all items): `http://127.0.0.1:8080/demos/induction-motor-rotor-design/` (after `npm run serve`).

The controls of the original, from the top: the slider "blocked rotor voltage (E<sub>BR</sub>)" (variable e), the slider
"rotor resistance (R<sub>R</sub>)" (r), the slider "rotor reactance (X<sub>R</sub>)" (x), each with a ⊕ and its value at the
right, then the row "NEMA design" with the buttons A, B and D. To set a slider to a value: click its ⊕, click into the
value field of the panel that opens, select the number, type the new value and press Enter. The picture has three
labels across the top: purple "locked rotor torque" (left), black "max torque" (middle), red "full load torque" (right).

### M-IM-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title, the caption and the Details text with the port's.
2. Compare the three slider labels and the "NEMA design" row with the port's controls.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-01: per text:
"same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details`, `credits` and the control labels.
**Expected / what it decides** — identical texts (F-IM-11); the subscripts BR, R, R as in the original.

### M-IM-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control (e = 150, r = 0.107, x = 0.422).
**Do** —
1. Read the three labels and the three slider values.
2. Note where each arrow is: purple ↙ just above the curve's left end, black ↓ above the peak, red ← right of the curve
   at the height 100.
3. Note whether a "0" is printed under the origin of the speed axis.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-02: the three
labels as printed, the arrows' places, "0 under the origin: yes/no".
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both: "149 % full load", "313 % full load / 1344 rpm", "1725  rpm" (F-IM-06 … F-IM-10);
the original prints the "0", the port does not (D-IM-02).

### M-IM-03 Each slider
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > Initial Settings; on the port, **Initial settings**.
**Do** —
1. Set "rotor reactance (X<sub>R</sub>)" to 0.3 (⊕ of that slider, value field, 0.3, Enter); read the black label.
2. Drag "blocked rotor voltage (E<sub>BR</sub>)" slowly from its left end to its right end; watch the curve and the labels.
3. Drag "rotor resistance (R<sub>R</sub>)" slowly from its left end to its right end; watch where the black arrow goes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-03: the black
label after step 1; per drag: "same as the port" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (the value field is beside each slider).
**Expected / what it decides** — step 1: "max torque 440 % full load 1158 rpm" in both (F-IM-03, F-IM-07); the drags change
the picture alike (F-IM-01, F-IM-02); past r = x the black arrow sits at 0 rpm.

### M-IM-04 NEMA design buttons
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > Initial Settings; on the port, **Initial settings**.
**Do** —
1. Click the button **A** (row "NEMA design"); read the three slider values and the three labels.
2. The same with **B**, then with **D**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-04: per button:
e, r, x and the three labels.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — A: e = 150, r = 0.065, x = 0.3263; "155 % full load", "405 % full load / 1441 rpm",
"1755  rpm". B: e = 158, r = 0.0792, x = 0.405; 136, 362 / 1448, 1750. D: e = 150, r = x = 0.384; 344, 344 / 0 rpm, 1532
(F-IM-04).

### M-IM-05 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — click **D**, then move "blocked rotor voltage (E<sub>BR</sub>)" to about 200.
**Do** —
1. ⊕ (top right of the Manipulate panel) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-05: the three
slider values afterwards.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to e = 150, r = 0.107, x = 0.422 and the opening picture (A-IM-01).

### M-IM-06 A maximum above the plot
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — set e = 240, r = 0.1, x = 0.2 (⊕ of each slider, value field, Enter).
**Do** —
1. Read the three labels.
2. Look for the black ↓ and the purple ↙: are they drawn anywhere (above the plot, at its top edge) or not at all?
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-06: the labels;
"black arrow visible: yes/no, where"; "purple arrow visible: yes/no, where".
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — labels "1352 % full load", "1690 % full load / 900 rpm", "1773  rpm"; the port draws
neither arrow (they are at 1715 and 1382 %, above the plot range). Settles K-IM-01 (Q-IM-02).

### M-IM-07 Values typed outside the ranges
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > Initial Settings.
**Do** —
1. Click into the value shown right of "rotor reactance (X<sub>R</sub>)" (or the value field of its ⊕ panel), type 0.85,
   Enter.
2. In the same way type 110 for "blocked rotor voltage (E<sub>BR</sub>)", Enter. Note the value the field keeps.
3. Read the red label; look for the red ← and for any error colouring (pink) of the picture or messages.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-07: the value e
keeps (110 or 130); the red label exactly as printed; "red arrow: yes/no"; any message or pink picture.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the port keeps e = 130 (D-IM-03). If the original keeps 110, its red label is expected as
"(1611 + 125 ⅈ)  rpm" (the max label "84 % full load / 1573 rpm"); the record settles D-IM-03 and K-IM-02 (E-IM-03).

### M-IM-08 Rotor resistance above the reactance
**Open** — `_internal\originals\wolfram-2026-11-17\ACInductionMotorRotorDesign.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar
offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > Initial Settings; then drag "rotor resistance (R<sub>R</sub>)" to its
right end (r = 1).
**Do** —
1. Read the purple and the black label.
2. Note where the black ↓ is.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_induction-motor-rotor-design.md`, under the heading M-IM-08: both labels;
the black arrow's place.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page, with "errors of the original: kept"; then click **corrected** and read the
black label again.
**Expected / what it decides** — original and kept: "224 % full load" and "313 % full load / 0 rpm", the black arrow at
the curve's left end above the purple one (E-IM-02); corrected: "224 % full load / 0 rpm" (A-IM-08).

### M-IM-09 The page works on its own
**Steps** — open the port's page; move every slider once; press A, B and D; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-IM-01).

### M-IM-10 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
