# Manual checks — Vibrations of a Rectangular Membrane (`demos/rectangular-membrane/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_rectangular-membrane.md` (create it with `npm run test-run -- rectangular-membrane`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb`.
Port (all items): `http://127.0.0.1:8080/demos/rectangular-membrane/` (after `npm run serve`).

The original's controls, top to bottom in the panel on the left: **length**, **width**, a line, the heading **mode**,
**m=1, n=1**, **m=2, n=1**, **m=1, n=2**, **m=2, n=2**, a line, **time**, **wave speed**, a line, **reduce box
height**. Each is a slider with a ⊕ button and a number on its right; to type a value, click ⊕, click into the number
field that opens, type the value and press Enter.

### M-RA-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title and the caption (the text under "Caption") with the port's title and the paragraph under the
   picture.
2. Look at the sections "Details & Citations", "References" and "Related Demonstrations" of the notebook.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rectangular-membrane.md`, under the heading M-RA-01: per text: "same"
or the differing words; the texts of the three sections.
**Save** — File > Close, Don't Save.
**Port** — the page's title, caption, **Details** (click to open) and credits.
**Expected / what it decides** — the same title and caption; the three sections hold only template texts (E-RA-01),
and the port's Details say that the original has none (F-RA-14).

### M-RA-02 Opening picture and controls
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare every control's label and value with the port's: length 4, width 4, m=1, n=1 0.5, the other modes 0,
   time 0, wave speed 1, reduce box height 0.
2. Compare the picture: the dome's colours from the edge to the top (red, yellow, green, cyan, blue, magenta, red),
   the box, the tick labels (x and y 0 … 4, z −0.5, 0.0, 0.5), the number of mesh lines across the membrane.
**Record** — under M-RA-02: per difference: what, where; the number of mesh lines in each direction.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's opening page.
**Expected / what it decides** — the same values and picture (F-RA-07, F-RA-11, F-RA-13); 15 mesh lines each way; the
y tick labels are on a different box edge in the port (D-RA-02).

### M-RA-03 The four snapshot settings: colours, box and view
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — in the original, ⊕ (top right of the panel) > **Initial Settings**.
**Do** —
1. Set length 6.97, width 4.28, m=1, n=1 0.83, m=2, n=1 0.74, m=1, n=2 −0.64 (snapshot 2). Compare the two pictures:
   colour of the high hump (blue-violet), of the trough (magenta), shading of the slopes, the box and its ticks.
2. Set length 7.48, width 5.65, m=1, n=1 0.83, m=2, n=1 1.13, m=1, n=2 −1.09, m=2, n=2 1.26, reduce box height 2
   (snapshot 4). Look at the bottom of the deep trough in front: is there a small hole where it leaves the box?
3. In the port, set the same values in the value fields (type, Enter).
**Record** — under M-RA-03: per step: "same" or the differences in colour (lighter, darker, other hue), box shape,
ticks; for step 2: hole yes/no.
**Save** — File > Close, Don't Save.
**Port** — the same settings; the port cuts a small hole at the bottom of the trough (ClippingStyle -> None).
**Expected / what it decides** — the same colours by eye (K-RA-03: neutral lighting), the same box and ticks
(D-RA-04); a hole in both (F-RA-10).

### M-RA-04 Each control and the time animation
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; set m=2, n=1 to 0.5 in both.
**Do** —
1. Move each slider slowly from one end to the other and back; watch the picture.
2. Click the ⊕ next to **time**, then the play button of the panel that opens; watch for 10 seconds; stop it.
3. Set **wave speed** to 0 and play **time** again.
**Record** — under M-RA-04: per control: "same" or the difference; for step 2: does the profile change its shape over
time (the two modes have different frequencies)? step 3: does anything move?
**Save** — File > Close, Don't Save.
**Port** — the same steps (the ⊕ panel's play button).
**Expected / what it decides** — every control changes the picture as in the original (F-RA-01 … F-RA-06); with wave
speed 0 nothing moves.

### M-RA-05 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value; rotate the picture by dragging it.
**Do** —
1. ⊕ (top right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — under M-RA-05: "same" or the difference; does the original keep the rotation?
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — both return to the opening values and picture (A-RA-01); the port keeps the
rotation (F-RA-12).

### M-RA-06 All four amplitudes 0 (lead K-RA-01)
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the ⊕ next to **m=1, n=1**, type 0 in its number field, press Enter.
2. Look at the picture; open Window > Messages and note any messages.
3. Then set **reduce box height** to 0.5.
**Record** — under M-RA-06: what the picture shows (a coloured, white or grey plane? nothing? a pink error box?), the
tick labels on the vertical edge, the messages word for word; the same after step 3.
**Save** — File > Close, Don't Save.
**Port** — the same steps: the port draws the flat membrane in white with its mesh lines in a flat box; after step 3
the range is {0.5, −0.5}, used sorted.
**Expected / what it decides** — settles K-RA-01 and the "what the port does" of E-RA-02: if Mathematica draws the
default surface colour or nothing, the port's white surface is kept or changed by a proposal.

### M-RA-07 Reduce box height up to and beyond S (lead K-RA-02)
**Open** — `_internal\originals\wolfram-2026-11-17\VibrationsOfARectangularMembrane.nb` with Mathematica 15.0.1 via File > Open…; if a
yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings** (S = 0.5: only m=1, n=1 is 0.5).
**Do** —
1. Set **reduce box height** to 0.3: the box is lower and the top of the dome is cut off.
2. Set it to 0.5 (the z range {0, 0}).
3. Set it to 1 and then to 2 (the z range {0.5, −0.5}, then {1.5, −1.5}).
**Record** — under M-RA-07: per step: the box's height and the z tick labels, whether the surface is drawn, any
messages (Window > Messages).
**Save** — File > Close, Don't Save.
**Port** — the same steps: a flat empty box at 0.5; at 1 and 2 a box from −0.5 to 0.5 and from −1.5 to 1.5 with the
whole dome.
**Expected / what it decides** — settles K-RA-02 (does Mathematica sort a reversed PlotRange, ignore it, or show an
error?) and E-RA-03.

### M-RA-08 The page works on its own
**Steps** — open the port's page; move every control once with the mouse and once with the arrow keys; drag the
picture to rotate it; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening values (A-RA-01).

### M-RA-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control; rotate the picture.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
