# Manual checks — Camera and lasers (`demos/camera-lasers/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md` (create it with `npm run test-run -- camera-lasers`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/camera-lasers/` (after `npm run serve`).

Where things are in the original (snapshot 1): the controls are in a column on the left, two pictures on the right
(the "top view" above, the "camera image" below). Left column from top to bottom: the heading "object orientation" with
the dial labelled **θ** (red hand, cross-hair locator on the rim; a click anywhere on the dial moves the hand to the
nearest of 64 directions); the heading "laser spacing" with the vertical slider labelled **s** (its value, "1", printed
below it; no **+** button); the heading "camera focal length" with the slider labelled **λ** (a small **+** right of it
opens its animation panel with a value field; the value "0.5" is printed right of the **+**). In the top view the black
cross-hair icon on the brown object is the **object locator** (at (3, −0.2)). The **⊕** button is at the top-right corner
of the panel. The test-run file for a day is `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md` (one per app and day;
write the item ID as a heading).

### M-CL-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare every paragraph sign by sign: the pinhole formula, the vanishing point,
     the laser image coordinates, the camera-frame coordinates, the angle formula, the reticule paragraph.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-01: per text: "same" or the differing words or signs.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-CL-19), including E-CL-01 and E-CL-02.

### M-CL-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Top view: dashed grey grid; light blue field of view from the pinhole; dark grey camera; orange lasers at y = ±1;
     red beams to the brown object's front face at x = 2.5 and dashed red lines back to the blue pinhole; thick blue
     image planes at x = ±0.5; "λ" with two arrows, "s" with two arrows; "top view"; the black locator icon at (3, −0.2)
     and a small arrowhead at (3, 0.8).
2. Camera image: perspective ground grid; light-grey band below the horizon; brown face from u −0.36 to 0.44; two red
     dots on the reticule between the labels 2 and 3; labels −0.8 … −10 on the left and 10 … 0.8 on the right; "camera
     image".
3. Controls: dial labels −3π/4 … π and the red hand at 0; **s** shows "1" below the vertical slider; **λ** shows "0.5".
4. ⊕ > Initial Settings; repeat steps 1–3.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-02: yes/no per point; same after Initial Settings yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-CL-06, F-CL-16, F-CL-17); negative left labels as E-CL-03.

### M-CL-03 Object positions and readings
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the object locator to about (6.94, −0.04) (snapshot 2); read where the two red dots sit on the reticule.
2. Click on the **θ** dial's rim one tick (π/32) above "0", then one more, up to about π/4; watch the two readings
     separate.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-03: step 1: the reading on each side; step 2: the readings at π/8 and π/4; any difference in dot sizes or in
which faces of the object are drawn.
**Save** — File > Close, Don't Save (owner states are made in M-CL-09).
**Port** — the same on the page (`locator-p`, `locator-p1`).
**Expected / what it decides** — about 6.4 on both sides in step 1 (F-CL-16, F-CL-17).

### M-CL-04 Object locator range (K-CL-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** before each step.
**Do** —
1. Press on empty space in the top view at about (10, 2).
2. Drag the object past the right edge, past the top edge, past the left edge, and down into the camera image.
3. Press in the camera image.
4. (K-CL-10) Start a drag exactly on the black locator icon and move 1 cm; then reset and start one 5–10 screen pixels
     beside the icon.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-04: step 1: does the object jump there; step 2: where it stops at each edge; step 3: does anything move;
step 4: whether both drags move the object and its laser dots the same way, or only the icon moves.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p`); port: the bottom edge freezes the object slightly above y = −4, presses
in the camera image do nothing.
**Expected / what it decides** — K-CL-01 (range and picture of the locator), K-CL-10 (draggable icon primitive), Q-CL-02.

### M-CL-05 Orientation dial (K-CL-07, K-CL-08)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click at several places around the **θ** dial; watch the hand.
2. Click as exactly as possible at the dial's centre (zoom 400 %: Window > Magnification).
3. ⊕ > Initial Settings; zoom on the hand at angle 0: is there a small red arrowhead at radius 0.3 pointing right?
4. Try to set the angle of snapshot 3 (about −60.3°, i.e. 5.2315 rad): click the rim there.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-05: step 1: does the hand jump in steps of π/32 (64 positions); step 2: the angle it takes; step 3: yes/no;
step 4: the nearest angle the dial allows (the hand's direction, or read the top view's θ arc).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p1`).
**Expected / what it decides** — π/32 snapping (F-CL-02) settles K-CL-08; step 2 settles K-CL-09 with H-CL-16; step 3
as Q-CL-10.

### M-CL-06 Sliders and reticule labels (K-CL-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **s** slider's thumb and use the Down arrow key until "0.65" is shown below it (35 presses).
2. Use the arrow keys on **s** to reach 0.2 (λ stays 0.5).
3. Set **λ** to 0.1 (its **+**, type `0.1`, Enter) and **s** to 0.1.
4. Set **λ** to 1.2, then to 0.24; count the converging ground lines in the camera image each time.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-06: the reticule labels in steps 1–3 (exact texts; stacked fractions yes/no; minus signs); step 4: the two
line counts.
**Save** — File > Close, Don't Save (owner states are made in M-CL-09).
**Port** — the same on the page (`vslider-s`, `value-s`, `slider-lambda`, `value-lambda`).
**Expected / what it decides** — s 0.65: 1/2, 0.6, 0.75, 1, 3/2, 5/2, 5 (stacked); s 0.2: tenths (1/10, 0.12, …);
λ 0.1, s 0.1: fiftieths (1/50, 1/25, …); 5 and 25 lines (F-CL-04, F-CL-05, F-CL-18, K-CL-04).

### M-CL-07 Misses and very close objects (Q-CL-04, Q-CL-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **θ** dial's rim at "π/2"; drag the object locator to about (8, 0).
2. ⊕ > Initial Settings; set **s** to 0.1 (arrow keys); drag the object so that its front face is at about x = 0.05
     (zoom on the top view).
3. Drag the object further left until it reaches behind the camera (x < 0).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-07: step 1: dots visible yes/no, beams to the right edge yes/no, dashed lines along the axis yes/no; step 2:
how much of the camera image is red (fraction); step 3: what the camera image shows.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p1`, `locator-p`, `vslider-s`).
**Expected / what it decides** — misses as Q-CL-04, huge dots as Q-CL-05, an enlarged object behind the camera as
E-CL-04 (Q-CL-07).

### M-CL-08 Face exactly at the camera (K-CL-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (θ = 0); open Window > Messages and clear it.
**Do** —
1. Zoom 400 % on the top view; drag the object locator slowly left until the object's front face lies on the pinhole
     line x = 0 (locator at x = 0.5), as exactly as possible; move it a few pixels back and forth across that line.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-08: messages (copy the text), pink error boxes, missing parts of the camera image, and whether the picture
recovers after moving away.
**Save** — if an error state is visible: File > Save As…
`_internal\originals\saved\camera-lasers_M-CL-08_<YYYY-MM-DD>.nb`, then close; otherwise File > Close, Don't Save.
**Port** — the same on the page (`locator-p`); the port leaves out primitives with non-finite values (D-CL-07).
**Expected / what it decides** — settles K-CL-03 by hand; the exact case is H-CL-11.

### M-CL-09 Owner states for golden data
**Open** — `_internal\originals\batch-ab\Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. State A: as M-CL-03 step 1 and two dial clicks (object at about (6.94, −0.04), θ = π/16).
2. Save (see Save); reopen the downloaded original; ⊕ > Initial Settings.
3. State B: as M-CL-06 step 1 (s = 0.65).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-lasers.md`, under the heading M-CL-09: the state's settings as shown (object position, θ, s, λ) and the file names.
**Save** — File > Save As… `_internal\originals\saved\camera-lasers_M-CL-09_<YYYY-MM-DD>.nb` (state A) and
`_internal\originals\saved\camera-lasers_M-CL-09b_<YYYY-MM-DD>.nb` (state B), then close; never overwrite the
downloaded original.
**Port** — none in the browser: the files are extracted (snapshot settings included) into
`tests/golden/camera-lasers.owner-state-k.json`.
**Expected / what it decides** — golden data checked like T-CL-25 … T-CL-29 (F-CL-07).
