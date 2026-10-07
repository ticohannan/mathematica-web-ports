# Manual checks — Robot singularities (`demos/robot-singularities/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester. Open the published notebook as it is (do not re-evaluate the input cell) unless a
check says otherwise.

### M-RS-01 Texts
Title, caption and Details (both Jacobian matrices, the determinant formula, the reference) match the original's text.

### M-RS-02 Opening picture (Q-RS-05, D-RS-01, D-RS-02)
Without touching anything, compare both pictures with the original and with `docs/original-snapshots/robot-singularities-1.png`:
elbow arm, sphere of radius 2 with three red balls and the vertical line, peach ground; five red planes and six red lines
in phase space. Expected in both: the phase-space label reads "phase space" in lower case. Then choose another robot and
come back to "elbow robot arm": the label should read "Phase Space" in both. Note differences in size, framing and colours
(the port draws dark 1 px edges on the ground rim, cuboids and planes, and blends front and back faces of translucent
solids). Do not compare the singular dots of snapshots 2 and 3 with the port: they come from an older version (N-RS-06).

### M-RS-03 Joint sliders and the 6.28 jump (Q-RS-03, K-RS-06, A-RS-02)
Drag θ1 to the far right end. Expected in both: the value jumps to −3.10699 and the robot turns accordingly. The slider
values themselves are known to agree (K-RS-06); note what the original shows at the slider centre ("0", "0." or
4.44089×10^-16) and whether its value label can be edited.

### M-RS-04 Changing the robot resets the sliders (Q-RS-02, K-RS-08)
Move θ1 and θ2 away from 0, then pick "SCARA robot arm". Expected in both: θ1 = 0, θ2 = 0, d3 = 0.5 (snapshot 4). Pick
"SCARA robot arm" again: nothing changes. Moving a slider must never reset the other sliders.

### M-RS-05 Manipulability ellipsoid (F-RS-12, Q-RS-08, K-RS-04)
Tick "show robot" and "show manipulability ellipsoid". Compare: elbow arm at zero (snapshot 2: blue ring and arrows,
red arrows, no filled ellipsoid), offset spherical wrist at zero (snapshot 3: filled light-blue ellipsoid, no green
arrows), SCARA (snapshot 4). Then choose "CNC robot arm": expected in both, three circles of radius 1/2 with blue arrows
and ring along x, red along y, green along z (K-RS-04, resolved).

### M-RS-06 Angular singularities (F-RS-06, K-RS-01)
Select "Angular". Elbow arm: the whole phase cube is red and the workspace shows the red sphere. Spherical wrist with the
ellipsoid shown at θ = (0.5, 0.8, 0): compare the orientation of the ellipse in both (the port keeps the original's
−Cos[q2] entry).

### M-RS-07 Rotation and Initial settings (D-RS-07, K-RS-07, K-RS-03)
Rotate the workspace picture with the mouse, then move a slider: does the original keep the rotation (the port does)?
Then use the original's ⊕ menu → Initial Settings and the port's "Initial settings": both should return to the opening
picture with the label "phase space" (K-RS-03, verified from the notebook's stored specifications).

### M-RS-08 Twisted spherical mesh (Q-RS-07, D-RS-04)
Choose "twisted spherical", Linear: the two curved phase-space surfaces show mesh lines in the original. Compare their
density with the port's 15 lines per direction.
