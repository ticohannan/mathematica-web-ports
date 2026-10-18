# Manual checks — Robot singularities (`demos/robot-singularities/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_robot-singularities.md` (create it with
`npm run test-run -- robot-singularities`). Differences are findings, not failures of the tester. Open the published
notebook as it is (do not re-evaluate the input cell) unless an item says otherwise.

Original notebook (all items):
`_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/robot-singularities/` (after `npm run serve`).

The original's controls, top of the Manipulate panel: the popup menu with the robot type (shows "elbow robot arm";
entries from "planar robot arm" to "offset spherical wrist"), the three joint sliders **θ1**, **θ2**, **θ3** (for a
prismatic joint **d1**, **d2** or **d3**) with their value at the right end, and on the right the checkboxes **show
robot** and **show manipulability ellipsoid** and the setter bar **velocity singularities** (`Linear`, `Angular`).
Below: two 3D pictures, **Workspace** (left) and the phase space (right, label "phase space" or "Phase Space"), each
rotatable with the mouse. There are no locators.

### M-RS-01 Texts
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
with Mathematica 15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title and the caption (first text paragraph).
2. Scroll to **Source & Additional Information** > **Details & Citations**: the paragraphs, the linear-velocity
   Jacobian matrix of the elbow arm, the determinant formula, the angular-velocity Jacobian, then **References** [1].
3. In the port, read the title, caption and Details (click **Details** below the pictures).
**Record** — for the title, caption, each paragraph, both matrices (entry by entry), the determinant and the
reference: "same" or the exact difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts and formulas.
**Expected / what it decides** — identical texts (F-RS-16; see error E-RS-06 about "determinate" and the vertical line).

### M-RS-02 Opening picture (Q-RS-05, D-RS-01, D-RS-02)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — touch nothing: the picture as the notebook opens is the state to compare.
**Do** —
1. Compare both pictures with `docs/original-snapshots/robot-singularities-1.png`: in **Workspace** the translucent
   red sphere of radius 2 with three red balls on the vertical line, the peach ground disk; in the phase space five
   red planes and six red lines.
2. Read the phase-space label.
3. Choose "SCARA robot arm" in the popup menu, wait, then choose "elbow robot arm" again; read the phase-space label.
4. Compare size, framing and colours with the port.
**Record** — Do 1: as described (yes/no, what differs); Do 2 and Do 3: the label exactly (capitals matter); Do 4:
differences (screenshots of both).
**Save** — File > Close, Don't Save.
**Port** — the page as opened, then the same popup changes. Expected in both: "phase space" in lower case at first,
"Phase Space" after the robot change. Known port differences: dark 1 px edges on the ground rim, cuboids and planes;
front and back faces of translucent solids blended. Do not compare the singular dots of snapshots 2 and 3 with the
port: they come from an older version of the code (N-RS-06).
**Expected / what it decides** — the same pictures and labels (Q-RS-05).

### M-RS-03 Joint sliders and the 6.28 jump (Q-RS-03, K-RS-06, A-RS-02)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ (top right of the panel) > Initial Settings; tick **show robot**.
**Do** —
1. Drag the **θ1** slider all the way to its right end and release; read its value; watch the robot.
2. ⊕ > Initial Settings. Read the value shown at the right of **θ1** at the slider centre (as the notebook opens).
3. Click on that value: can it be edited (a text cursor appears)? If yes, press Esc without changing it.
**Record** — Do 1: the value exactly (e.g. −3.10699) and whether the robot jumps; Do 2: the text exactly ("0", "0.",
or 4.44089×10^-16); Do 3: editable yes/no.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the value jumps to −3.10699 (by 6.28, not 2π, E-RS-03) and the robot turns
accordingly; the port shows 4.44089×10^-16 at the centre (D-RS-06) and its value field is editable (A-RS-02).
**Expected / what it decides** — Do 1 the same in both; Do 2–3 settle the open part of K-RS-06.

### M-RS-04 Changing the robot resets the sliders (Q-RS-02, K-RS-08)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag **θ1** to about 1 and **θ2** to about −1.
2. Choose "SCARA robot arm" in the popup menu; read the three slider values.
3. Choose "SCARA robot arm" again; read the values.
4. Move **θ1** a little; read **θ2** and **d3**.
**Record** — the three values after Do 2, Do 3 and Do 4.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in both: θ1 = 0, θ2 = 0, d3 = 0.5 after Do 2 (snapshot 4); nothing changes in
Do 3; moving a slider never resets the others.
**Expected / what it decides** — the same in both (Q-RS-02, K-RS-08).

### M-RS-05 Manipulability ellipsoid (F-RS-12, Q-RS-08, K-RS-04)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; tick **show robot** and **show manipulability ellipsoid**; `Linear`.
**Do** —
1. Elbow arm at zero: compare with `docs/original-snapshots/robot-singularities-2.png` (blue ring and arrows, red
   arrows, no filled ellipsoid).
2. Choose "offset spherical wrist": compare with `docs/original-snapshots/robot-singularities-3.png` (filled
   light-blue ellipsoid, no green arrows).
3. Choose "SCARA robot arm": compare with `docs/original-snapshots/robot-singularities-4.png`.
4. Choose "CNC robot arm": look at the circles and arrows.
**Record** — Do 1–3: matches the snapshot (yes/no, what differs); Do 4: radius of the three circles and which colour
lies along x, y and z.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: as the snapshots; CNC: three circles of radius 1/2, blue arrows and ring along x,
red along y, green along z (K-RS-04, resolved).
**Expected / what it decides** — the same in both.

### M-RS-06 Angular singularities (F-RS-06, K-RS-01)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `Angular` under **velocity singularities**.
**Do** —
1. Elbow arm: look at the phase space (whole cube red?) and the workspace (red sphere?).
2. Choose "spherical wrist"; tick **show robot** and **show manipulability ellipsoid**; set θ1 = 0.5, θ2 = 0.8,
   θ3 = 0 (click the + of each slider if a value field is needed, type the value, Enter).
3. Take a screenshot of the workspace from the default view and note the direction of the ellipse's long axis.
**Record** — Do 1: yes/no each; Do 3: the screenshot file name and the long-axis direction (e.g. "tilted toward the
viewer, up-left").
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: Do 1 as described; Do 3: the port keeps the original's −Cos[q2] entry, so the
ellipses should agree.
**Expected / what it decides** — confirms that the port reproduces the original's angular Jacobian (K-RS-01, error
E-RS-01).

### M-RS-07 Rotation and Initial settings (D-RS-07, K-RS-07, K-RS-03)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — touch nothing.
**Do** —
1. Press in the **Workspace** picture and drag about 3 cm to the left: the picture rotates.
2. Move **θ2** a little: does the workspace keep the rotation or jump back?
3. ⊕ > Initial Settings: look at both pictures and the phase-space label.
**Record** — Do 2: keeps / resets; Do 3: back to the opening picture (yes/no) and the label exactly.
**Save** — File > Close, Don't Save.
**Port** — the same steps (**Initial settings** button). Expected: the port keeps the rotation; Initial settings
returns to the opening picture with the label "phase space".
**Expected / what it decides** — Do 2 settles K-RS-07; Do 3 confirms K-RS-03 (verified from the stored specifications).

### M-RS-08 Twisted spherical mesh (Q-RS-07, D-RS-04)
**Open** — `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; choose "twisted spherical" in the popup menu; `Linear`.
**Do** —
1. Look at the two curved surfaces in the phase space: count the mesh lines in each direction on one surface.
**Record** — the counts (both directions) and a screenshot file name.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: mesh lines in the original; the port draws 15 lines per direction.
**Expected / what it decides** — records the original's mesh density (Q-RS-07, D-RS-04).
