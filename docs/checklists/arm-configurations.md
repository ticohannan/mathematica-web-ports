# Manual checks — Common Robot Arm Configurations (`demos/arm-configurations/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md` (create it with `npm run test-run -- arm-configurations`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/arm-configurations/` (after `npm run serve`).

Where things are in the original (picture 2 = Details' snapshot 1, `docs/original-snapshots/arm-configurations-2.png`):
the controls are in a column on the left, the 3D picture on the right with the line "H = TransformationFunction[( … )]"
below it. Left column from top to bottom: one slider per joint, labelled **θ\*ᵢ** (revolute joint) or **d\*ᵢ** (prismatic
joint), with its value printed right of it (no **+** button, no value field; click a slider's thumb and use the arrow
keys for single steps); the slider **grip** (with a **+** that opens its animation panel and value field); the check box
**show robot**; the heading "DH parameters for robot arm" with a popup menu (planar elbow, elbow robot, anthropomorphic,
Stanford robot, cylindrical robot, spherical robot, SCARA robot, Cartesian robot, CNC robot); the DH table. The picture
can be rotated by dragging. The **⊕** button is at the top-right corner of the panel. In the port the same controls
carry the test ids `slider-params-1` … `slider-params-6` (values `value-params-*`), `slider-g`, `value-g`, `plus-g`,
`check-showRobot`, `popup-DHParameters`, `dh-table`, `h-matrix`, `scene-canvas-workspace` and `reset` ("Initial
settings").

### M-AC-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
  1. Compare title and caption with the port's.
  2. Scroll to "Details & Citations"; compare the DOF paragraph, the DH parameter names, the five snapshot captions and
   both references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-AC-17).

### M-AC-02 Opening picture (F-AC-06, F-AC-12, F-AC-15, D-AC-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch any control (live state).
**Do** —
  1. Compare with `docs/original-snapshots/arm-configurations-2.png`: anthropomorphic arm, six θ\* sliders at 0, grip 1,
   **show robot** ticked, DH table with the "0" header, "H = TransformationFunction[(…)]" with "1. 0. 0. | 2." in its
   first row.
  2. Measure on a screenshot the ground disc's width and the picture's width (px).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-02: yes/no per point of step 1; differences in framing, colours and the look of H; the two widths.
**Save** — File > Close, Don't Save.
**Port** — open the page; compare (`scene-canvas-workspace`, `dh-table`, `h-matrix`).
**Expected / what it decides** — picture 2 (F-AC-06, F-AC-12, F-AC-15); the widths check D-AC-01 (716 px at 2 px per
pt); the "0" header and the TransformationFunction wrapper as E-AC-04, E-AC-05.

### M-AC-03 Changing the robot (Q-AC-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ (top-right) > **Initial Settings**.
**Do** —
  1. Drag the **θ\*₂** slider's thumb to the right; then choose **planar elbow** in the popup.
  2. Choose **planar elbow** again.
  3. Choose **CNC robot**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-03: step 1: number of sliders and their values; step 2: does anything change; step 3: the three **d\*** values
and H (compare with picture 6).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`popup-DHParameters`, `slider-params-*`).
**Expected / what it decides** — two sliders at 0; nothing; three d\* at 0.5 and H of picture 6 (Q-AC-04).

### M-AC-04 Slider values (K-AC-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Drag the **θ\*₁** slider's thumb to about a quarter of its track; read the value text right of it.
  2. Choose **CNC robot**; click the **d\*₁** thumb and press the Right arrow key once; read the value text.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-04: both value texts exactly (e.g. "−13π/16" or a decimal; "11/20" or "0.55").
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-params-*`, `value-params-*`).
**Expected / what it decides** — exact values ("…π/…", "11/20") settle K-AC-05.

### M-AC-05 Slider persistence and grid rebuild (K-AC-06, K-AC-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; open Window > Messages and clear it.
**Do** —
  1. Drag the **θ\*₃** thumb to the right and release; wait 2 s.
  2. Switch the popup from **anthropomorphic** to **planar elbow** and back five times.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-05: step 1: does θ\*₃ keep its value; step 2: message texts, flashing or wrong rows in the slider grid.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; the port keeps values and rebuilds the grid at once (D-AC-07).
**Expected / what it decides** — settles K-AC-06 and K-AC-07.

### M-AC-06 Show robot off (Q-AC-01, Q-AC-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. For each of the nine robots in the popup: untick **show robot**, look at the picture, tick it again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-06: per robot: what remains (joint 1 and the gripper only? a shaft of the last joint?); does the gripper point
along its z axis.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`check-showRobot`, `popup-DHParameters`).
**Expected / what it decides** — only joint 1 and the gripper (Q-AC-01, E-AC-03); gripper along z (Q-AC-02).

### M-AC-07 H formats (Q-AC-06, K-AC-02, K-AC-03, K-AC-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Choose **CNC robot**; press the Right arrow key once on each of the three **d\*** thumbs; read H.
  2. Choose **elbow robot**; set **θ\*₂** to 3π/8 and **θ\*₃** to π/4 (arrow keys: 12 and 8 steps of π/32 from 0); read
   the top-right entry of H.
  3. Choose **cylindrical robot**; set **d\*₂** to 27/20 (17 steps from 0.5) and **d\*₃** to 3/2 (20 steps); read the z
   entry of H (third row, last column).
  4. Choose **anthropomorphic** and move a few θ\* sliders; look for entries like "1.11022×10⁻¹⁶".
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-07: H exactly after each step (copy the numbers as shown).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`h-matrix`).
**Expected / what it decides** — step 1: "0. 1. 0. 0.5" becomes "0 1.0 0 0.55" (Q-AC-06); step 2 settles K-AC-03; step 3
K-AC-04 (2.3 or 2.4); step 4 K-AC-02 (E-AC-05).

### M-AC-08 Rotation, clipping and Initial settings (K-AC-08, F-AC-14)
**Open** — `_internal\originals\batch-ab\Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Drag in the picture to rotate it by about 90°; then move a slider.
  2. Choose **Stanford robot**; drag **d\*₃** to its right end (3/2).
  3. ⊕ > **Initial Settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_arm-configurations.md`, under the heading M-AC-08: step 1: rotation kept yes/no; step 2: does the gripper disappear above z = 3; step 3: back to picture 2
yes/no.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas-workspace`, then "Initial settings" `reset`); the port keeps the rotation.
**Expected / what it decides** — settles K-AC-08; clipping at ±3 (F-AC-14); Initial Settings = picture 2.
