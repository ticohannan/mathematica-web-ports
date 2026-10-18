# Manual checks — Robot Manipulator Workspaces (`demos/manipulator-workspaces/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md` (create it with `npm run test-run -- manipulator-workspaces`;
one file per app and day, the item ID as a heading). Differences are findings, not failures of the tester. Open the
published notebook as it is (do not re-evaluate the input cell).

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/manipulator-workspaces/` (after `npm run serve`).

Where things are in the original (snapshots 1 and 2, `docs/original-snapshots/manipulator-workspaces-1.png`, `-2.png`):
the controls are in a column on the left, the 3D picture on the right. From top to bottom: three joint sliders labelled
**θ₁**, **θ₂**, **θ₃** for revolute joints or **d₁**, **d₂**, **d₃** for prismatic ones (no value shown, no **+**; they
hold the fraction 0 … 1 of the joint's range); a line; three interval sliders labelled **r₁**, **r₂**, **r₃** (two thumbs
each: the lower and upper end of that joint's range, −3.1 … 3.1; no value shown); a line; a popup menu with the 14 robots
(planar robot arm, elbow robot arm, PUMA robot arm, offset PUMA arm, Stanford robot arm, cylindrical robot arm,
spherical robot arm, offset spherical arm, twisted spherical, SCARA robot arm, planar RPR arm, CNC robot arm, Cartesian
robot arm, linear robot arm). The picture can be rotated by dragging. The **⊕** button is at the top-right corner of the
panel. In the port the same controls carry the test ids `slider-params-1` … `slider-params-3`, `islider-r1-lo`,
`islider-r1-hi` … `islider-r3-hi`, `popup-Type`, `scene-canvas-workspace` and `reset` ("Initial settings").

### M-MW-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare the four paragraphs (including "Snapshot 1 shows the spherical
   manipulator…", "The range is between −π and π" and "For the Cartesian manipulator, this results in a cube…") and the
   reference (Spong, Hutchinson, Vidyasagar 2006).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts kept as written (F-MW-13, Q-MW-07), including E-MW-01…03.

### M-MW-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch anything (live state).
**Do** —
1. Check: planar robot arm; three joint sliders in the middle; the **r₁ r₂ r₃** thumbs at 0.5 and 1.5; a translucent
   surface patch with blue outlines and dark middle lines above the peach ground disc.
2. Compare size, framing and colours with `docs/original-snapshots/manipulator-workspaces-1.png`; measure the ground
   disc's width and the picture's width (px) on a screenshot.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-02: yes/no per point of step 1; differences of step 2; the two widths.
**Save** — File > Close, Don't Save.
**Port** — open the page; compare (`scene-canvas-workspace`).
**Expected / what it decides** — snapshot 1 (F-MW-09…F-MW-11); colours and framing check D-MW-02 and D-MW-04.

### M-MW-03 Changing the robot resets the joints (Q-MW-01, K-MW-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — none (live state, planar robot arm).
**Do** —
1. Drag **θ₁** and **θ₂** away from the middle; choose **elbow robot arm** in the popup (same joint types).
2. Choose **elbow robot arm** again.
3. Choose **SCARA robot arm**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-03: step 1: are the sliders reset to the middle; step 2: does anything change; step 3: the slider labels and
positions.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-params-*`, `popup-Type`); the port resets in step 1.
**Expected / what it decides** — settles K-MW-06; step 3: θ₁ θ₂ d₃, all in the middle (snapshot 3, Q-MW-01).

### M-MW-04 Range sliders (F-MW-02, K-MW-01, A-MW-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ (top-right) > **Initial Settings**.
**Do** —
1. (a) On **r₁**, drag the lower thumb up into the upper one and further.
2. (b) Push both to the right end of the track.
3. (c) Press on the bar between the thumbs and drag.
4. (d) Press on the track outside the thumbs.
5. (e) Click a thumb and press the arrow keys.
6. ⊕ > Initial Settings; drag the upper **r₁** thumb away and back to its start (1.5).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-04: (a) is the upper thumb pushed, do they stay 0.1 apart; (b) where they stop; (c) does the interval move as a
whole; (d) what happens; (e) what the keys do; step 6: the file name of the saved state (see Save).
**Save** — after step 6: File > Save As… `_internal\originals\saved\manipulator-workspaces_M-MW-04_<YYYY-MM-DD>.nb`
(its DynamicModule holds the dragged r1: expected 1.5000000000000004 if the original uses min + k·step), then close.
**Port** — the same on the page (`islider-r1-*`); port: (c) yes, (d) nothing, (e) one step per key.
**Expected / what it decides** — settles K-MW-01 (D-MW-06).

### M-MW-05 Negative prismatic ranges (Q-MW-05, K-MW-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; choose **CNC robot arm**.
**Do** —
1. Drag the **r₁** thumbs to about −3.1 (lower) and −1 (upper).
2. Drag **d₁** to its left end, then to its right end.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-05: how the prismatic joint is drawn at both ends (grey cuboid between reversed corners, nothing, an error).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`islider-r1-*`, `slider-params-*`).
**Expected / what it decides** — settles K-MW-03 with H-MW-17.

### M-MW-06 Rotation (F-MW-12, K-MW-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag in the picture to rotate it by about 90°; then move a joint slider.
2. Rotate again; then move a range thumb.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-06: rotation kept yes/no after each step.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas-workspace`); the port keeps the rotation.
**Expected / what it decides** — settles K-MW-05 (D-MW-07).

### M-MW-07 Initial Settings (K-MW-04, A-MW-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — none.
**Do** —
1. Change the robot (popup), the ranges and the joints.
2. ⊕ > **Initial Settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-07: the robot, ranges and joints after step 2; how long the workspace takes to appear (s).
**Save** — File > Close, Don't Save.
**Port** — the same, then "Initial settings" (`reset`).
**Expected / what it decides** — elbow robot arm, ranges 0.5 … 1.5, joints in the middle, the elbow workspace in both
(K-MW-04).

### M-MW-08 All robots against the snapshots (F-MW-11, D-MW-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. For snapshots 2–8 (spherical, SCARA, CNC, planar RPR, cylindrical, Stanford, Cartesian): choose the robot in the
   popup and set the range thumbs by eye to those of the snapshot picture.
2. Compare the workspace shapes and the shading where translucent surfaces overlap.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulator-workspaces.md`, under the heading M-MW-08: per robot: shape like the snapshot yes/no (spherical shells, SCARA ring sector, CNC cube of 8 cells, planar
RPR sheet, cylindrical sector, Stanford shell, flat Cartesian rectangle); shading differences.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`popup-Type`, `islider-r*-*`).
**Expected / what it decides** — shapes as F-MW-11 (the flat Cartesian rectangle is E-MW-01); shading as D-MW-03.
