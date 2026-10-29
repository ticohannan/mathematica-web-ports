# Manual test checklist

Checks done by a person: the general items `M-GEN-…` (browser only) and the items of the first three apps
(`M-MP-…`, `M-TP-…`, `M-EA-…`). The seven newer apps have their own files in [`checklists/`](checklists/).

Items that involve the original notebook are operator procedures (owner rule R-B,
[`DESIGN_PROCESS.md`](DESIGN_PROCESS.md) rule 8) with the fixed headings **Open**, **Prepare**, **Do**, **Record**,
**Save**, **Port**, **Expected / what it decides**. How to start Mathematica, Enable Dynamics, use the ⊕ menu, find
invisible locators, how long to wait, where files go and how to send results back is written once in
[`MATHEMATICA_CHECKS.md`](MATHEMATICA_CHECKS.md). Items that involve only the browser port keep a short form
(**Steps**, **Record**, **Expected**). If you cannot run the original, write "no original" in the Original line and
judge against the expected behaviour described here and in the app's DESIGN.md.

**Where results go.** Results are not written into this file. For each app and day create the test-run file
`_internal\test-runs\<YYYY-MM-DD>_<dir>.md` with `npm run test-run -- <dir>` (`<dir>` = `motion-planning`,
`three-parametrizations`, `euler-angles`, or `general` for the M-GEN items; the seven newer apps by their folder
names). The template lists every item of the app with its **Record** instructions and the fields **Original:**,
**Port:**, **Result:** (tick `[x]` PASS, FAIL or UNSURE) and **Notes:**. Name screenshots
`<YYYY-MM-DD>_<dir>_<ID>_<what>.png`, store them next to the test-run file and attach them. A difference from the
original is worth recording even if you are not sure it is a fault.

Port address for every item: `http://127.0.0.1:8080/` after `npm run serve` in the repository folder (or the
published site `https://ticohannan.github.io/mathematica-web-ports/`); the apps are at `demos/<dir>/`.

---------------------------------------------------------------------------------------------------
## GEN — general (do once per browser)

### M-GEN-01  Landing page and links
**Steps** — open `http://127.0.0.1:8080/`. Click each of the twenty-six demo cards in turn; on each demo page click
"All demos" (top left) to come back.
**Record** — the number of cards in each group; any card that does not open its demo or a page that looks broken.
**Expected** — twenty-six cards in four groups (three, then seven "further robotics demonstrations", then ten in "batch A", then six in "batch B (3D)"); each link opens its
demo; no broken page.

### M-GEN-02  Error console
**Steps** — press F12, open the Console tab; open each of the twenty-six demos (`demos/<dir>/`) and use every control once
(each button, slider, setter, checkbox; drag one locator).
**Record** — for each demo: "no errors", or the exact text of every red message (copy it).
**Expected** — no red errors.

### M-GEN-03  Narrow window / phone width
**Steps** — make the browser window about 400 px wide (Firefox: Ctrl+Shift+M, responsive design mode, width 400).
Open each demo and use its controls.
**Record** — for each demo: everything reachable (yes/no), horizontal scrolling of the page (yes/no), picture usable
(yes/no).
**Expected** — everything reachable, no horizontal scrolling of the page, picture still usable.

### M-GEN-04  Keyboard only
**Steps** — without the mouse: in each demo press Tab repeatedly through all controls; change sliders with the arrow
keys; press setter buttons and buttons with Enter or Space; move a focused locator with the arrow keys. In Safari
first turn on Settings → Advanced → "Press Tab to highlight each item" (or press Option-Tab instead of Tab): by
default Safari's Tab key skips buttons, sliders and checkboxes and reaches only links and elements with their own tab
order, such as the locators.
**Record** — for each demo: every control reachable (yes/no, which not), focus outline visible (yes/no); in Safari,
whether the setting or Option-Tab was used.
**Expected** — every control reachable; focus outline visible.

### M-GEN-05  Responsiveness / load
**Steps** — in each demo drag sliders and locators quickly back and forth for about 10 s.
**Record** — stutter, freezing or delayed updates (where); your computer's processor in one line.
**Expected** — the picture follows the mouse without noticeable lag.

### M-GEN-06  Credits (all pages)
**Steps** — scroll to the end of each of the twenty-six pages.
**Record** — for each page: footer present (yes/no) and any missing element.
**Expected** — a credit footer naming the original authors, the title (linked to the Wolfram Demonstrations page), the
CC BY-NC-SA 3.0 licence, the words "Adapted from" and "Not affiliated with or endorsed".

### M-GEN-07  Start-up notice (the seven newer pages)
**Steps** — switch JavaScript off (Firefox: address `about:config` → `javascript.enabled` = false), open each of the
seven newer pages (prm-seven-link, car-paths, unit-balls, art-gallery, prm, prm-robot-arm, robot-singularities), then
switch JavaScript back on (`javascript.enabled` = true).
**Record** — for each page: the notice shown (yes/no).
**Expected** — "This demonstration needs JavaScript." in the picture area instead of an empty box. (The first three
pages do not have this notice yet.)

---------------------------------------------------------------------------------------------------
## MP — Motion Planning for Robot Path around Obstacles (main target)

Original notebook (all MP items): `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (made
with Mathematica 10.2; the Manipulate is the first output of the notebook). Port: `demos/motion-planning/`.

The original's controls, left of the picture: a setter bar with `workspace` and `configuration space` (no label), the
text "number of sides", the setter bars **boundary** (`3`, `4`, `5`) and **robot** (`3`, `4`, `5`), and the slider
**progress** (with its + button). The picture is the square −4.65 … 4.65 without axes (centre (0, 0)). Six visible
locators (small target circles): r1 in the blue start robot (−2, 2.75), top left; r2 in the green end robot (0.5, −3),
bottom; o1 in the red triangle (2, 2.5), o2 in the square (−1, −0.5), o3 in the pentagon (−2, −2.4), o4 in the hexagon
(2, −1). The port has two additions: the checkbox **show numbers** and the link **link to this scene**.

### M-MP-01  Default picture vs original
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` with Mathematica 15.0.1
(File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — ⊕ (top right of the panel) > Initial Settings.
**Do** —
1. Look at the picture: the boundary, the two robots, the four obstacles, the grey C-obstacle outlines with red vertex
   dots, the faint orange/purple/blue lines, the green path, the six locator circles.
2. Take a screenshot.
**Record** — for each element of Do 1: present and as described (yes/no, what differs); the path: start → which
corner → end; the screenshot file name.
**Save** — File > Close, Don't Save.
**Port** — open `demos/motion-planning/` (or press **Initial settings**). Expected: square yellow boundary; blue
triangle robot top left; green triangle robot bottom; red triangle/square/pentagon/hexagon obstacles; grey
C-obstacle outlines with red vertex dots; faint orange/purple/blue lines; a green path start → one corner → end; six
locator circles.
**Expected / what it decides** — the same picture in both (F-MP-30 … F-MP-35; golden parity covers the numbers).

### M-MP-02  Drag the start robot (r1)
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; move **progress** to the middle.
**Do** —
1. Press on the locator circle in the blue start robot (−2, 2.75) and drag it slowly (about 5 s) to (−3, −1), between
   the square and the pentagon; watch the path and the orange lines.
2. Drag it quickly back to about (−2, 2.75).
3. Look at the **progress** slider.
**Record** — Do 1: the robot follows (yes/no), path and orange lines update continuously (yes/no); Do 2: the same;
Do 3: progress back at the start (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the robot follows; path and orange lines update continuously; progress returns
to the start.
**Expected / what it decides** — the same in both (F-MP-06, F-MP-07, F-MP-16, F-MP-34).

### M-MP-03  Drag the end robot (r2)
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; move **progress** to the middle.
**Do** —
1. Press on the locator circle in the green end robot (0.5, −3) and drag it slowly to (3, 1), right of the hexagon;
   watch the path and the purple lines.
2. Drag it quickly back to about (0.5, −3); look at **progress**.
**Record** — the same as M-MP-02 for the end robot (purple lines instead of orange).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: as M-MP-02.
**Expected / what it decides** — the same in both (F-MP-06, F-MP-07, F-MP-16, F-MP-34).

### M-MP-04  Drag each obstacle (o1…o4)
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag each obstacle by its locator circle across the green path and back: the triangle (2, 2.5), the square
   (−1, −0.5), the pentagon (−2, −2.4), the hexagon (2, −1).
2. Drag the square onto the pentagon so that they overlap by about half their size; look at the path.
3. Take a screenshot of the overlap.
**Record** — Do 1: the grey C-obstacle outlines move with the obstacle and the path re-routes (yes/no per obstacle);
Do 2: what the path does in the overlap (goes around both / passes between / no path); the screenshot file name.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the outlines move with the obstacle; the path re-routes; overlapping obstacles
are still avoided.
**Expected / what it decides** — the same in both (Q-MP-08: C-obstacles are not merged).

### M-MP-05  Locator limits and clicking empty space
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag each of the six locators as far as possible to the left, right, top and bottom; hold the mouse beyond the
   picture's edge and look where the locator stops.
2. ⊕ > Initial Settings. Click (press and release) on an empty part of the picture, e.g. at (0, 4), the top centre.
**Record** — Do 1: where obstacles and robots stop (estimate the coordinates); Do 2: does a locator move to the click
point in the ORIGINAL (yes/no, which one)?
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: obstacles stop at ±3.75, robots at −4.25 / +4.15; in the port clicking empty
space moves no locator (D-MP-04).
**Expected / what it decides** — Do 2 decides whether D-MP-04 must change (LocatorPane picking, as in the seven
newer apps).

### M-MP-06  Boundary sides 3 / 4 / 5
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Click `3` under **boundary**; drag the start robot slowly toward the nearest edge of the yellow boundary until it
   turns red.
2. The same with `4` and `5` (⊕ > Initial Settings in between).
**Record** — for 3, 4, 5: the boundary shape; whether the robot turns red as soon as any part of it would leave the
boundary (yes/no); whether "No path exists." appears.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: triangle / square / pentagon boundary; the robot turns red as soon as any part of
it would leave the boundary; "No path exists." appears.
**Expected / what it decides** — the same in both; boundary 5 has no golden data, so this item is its only check.

### M-MP-07  Robot sides 3 / 4 / 5
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; move **progress** to the middle.
**Do** —
1. Click `3`, `4`, `5` under **robot** in turn; look at both robots, the grey C-obstacles and **progress**.
**Record** — for 3, 4, 5: robot shape, C-obstacles changed (yes/no), progress back at the start (yes/no); screenshot
of 5.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: both robots change shape; C-obstacles grow/change; progress resets to the start.
**Expected / what it decides** — the same in both; robot 5 has no golden data.

### M-MP-08  Progress slider
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag **progress** slowly from left to right (about 10 s); watch the orange robot, especially at the path's corners.
2. Click the + right of **progress**; press ▶ and watch 10 s; press pause; press the step buttons a few times.
3. Press ▶ again; after about 3 s click the + to close the panel and wait 5 s; click the + to open it again.
**Record** — Do 1: the orange robot follows the path (yes/no), the travelled part turns solid green (yes/no), at the
far right it covers the green end robot (yes/no), it ever overlaps an obstacle (yes/no, where); Do 2: play and steps
work (yes/no); Do 3: the robot stands still while the panel is closed (yes/no), it moves on by itself when the panel
opens and the button shows pause (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the orange robot travels along the path without touching any obstacle; the
travelled part turns solid green; at the far right it covers the green end robot; Do 3 (since v0.1.28, F-02): the
robot stands still while the panel is closed and goes on when it opens, the button still showing pause, as in the
original (Ryan Hembree, T-2, 2026-10-28).
**Expected / what it decides** — the same in both.

### M-MP-09  Invalid start / end
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag the start robot onto the triangle obstacle (2, 2.5).
2. ⊕ > Initial Settings; drag the end robot onto the hexagon (2, −1).
3. ⊕ > Initial Settings; drag the start robot so that it sticks partly out of the yellow boundary.
**Record** — for each: which robot is red, "No path exists." shown (where), a path drawn (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the offending robot drawn red; "No path exists." above the start robot; no path.
**Expected / what it decides** — the same in both (F-MP-31, F-MP-36).

### M-MP-10  Configuration space view
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `configuration space` (top left).
**Do** —
1. Look at the picture; then repeat M-MP-02 Do 1 (drag the start locator) and M-MP-08 Do 1 (drag progress) in this
   view.
**Record** — the grey C-boundary, white C-obstacles, light-green path present (yes/no each); robots and obstacles
drawn or only locators; the dark-green progress dot (where; absent at the very start?).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: grey C-boundary, white C-obstacles, light-green path, robots/obstacles not drawn
(only locators); a dark-green dot shows progress (not at the very start).
**Expected / what it decides** — the same in both (F-MP-33).

### M-MP-11  Configuration space with invalid start
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `configuration space`.
**Do** —
1. Drag the start locator into the white C-obstacle around the square (−1, −0.5).
**Record** — background colour; colour of the C-obstacle that contains the start; of the others.
**Save** — File > Close, Don't Save.
**Port** — the same step. Expected: the whole background turns red; the C-obstacle containing the start turns red.
**Expected / what it decides** — the same in both (F-MP-30, F-MP-33).

### M-MP-12  Is the path really the shortest? (robotics check)
**Steps** — port only: open `demos/motion-planning/`, tick **show numbers**. Build three different scenes by dragging
obstacles and robots (e.g. start top left, end bottom right, two obstacles in between). For each, judge whether a
visibly shorter collision-free route exists.
**Record** — for each scene: the path length shown, your judgement, and for any suspicious case the address of
**link to this scene** (right-click > Copy Link).
**Expected** — the path hugs C-obstacle corners/edges and is the shortest possible (E-MP-06 lists where the original
treats touching contacts as free).

### M-MP-13  Leads from tools/explore-motion.mjs
**Open** — for the original part only: `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb`;
this item asks you to EVALUATE an edited copy of the Manipulate (see Do 3).
**Prepare** — in the repository folder run `npm run serve` and, in a second Command Prompt,
`node tools\explore-motion.mjs 400 11`; open `test-output\explore-motion.md`.
**Do** —
1. Open 3–5 links from `test-output\explore-motion.md` in the browser; for each, describe what looks wrong.
2. For each lead, note the six locator positions (the scene link carries them; **show numbers** shows them).
3. Original (optional): File > Save As… `_internal\originals\saved\motion-planning_M-MP-13_<YYYY-MM-DD>.nb`; in the
   Manipulate input cell (show it by double-clicking the bracket of the output cell, if it is hidden) replace the
   initial values `{{r1,{-2.0,2.75}},…}`, `{{r2,{.5,-3.0}},…}`, `{{o1,{2.0,2.5}},…}` … `{{o4,{2.0,-1.0}},…}` by the
   lead's positions, press Shift+Enter, and compare the new output with the port.
**Record** — for each lead: the link, what the port does, what the original does (or "not reproduced").
**Save** — Do 3: File > Save, File > Close (the working copy only); otherwise nothing to save.
**Port** — see Do 1.
**Expected / what it decides** — each lead is a port bug, inherited behaviour of the original or a limitation of the
reference planner (docs/TESTING.md, investigation tool); inherited behaviour goes to DESIGN.md §11 if it is an error.

### M-MP-14  Text and credits
**Open** — `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — nothing.
**Do** —
1. Read the title, the caption (below the Manipulate) and the Details section (four steps and the four references).
2. In the port: read the caption, open **Details**, check the authors in the footer and click each link once.
**Record** — for the caption, each Details paragraph and each reference: "same" or the exact difference; any link
that does not work.
**Save** — File > Close, Don't Save.
**Port** — see Do 2. Expected: the same text as the original; authors credited; links work.
**Expected / what it decides** — identical texts (F-MP-40; see error E-MP-09 about the Details step 3).

---------------------------------------------------------------------------------------------------
## TP — Three Parametrizations of Rotations

Original notebook (all TP items): `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (the Manipulate is
the first output of the notebook). Port: `demos/three-parametrizations/`.

The original's controls: the slider **progress** at the top (0 … 1, default 1, with + button and value); on the left
the setter **method** (`Euler ZYZ`, `axis/angle`, `roll pitch yaw`); the group "Euler ZYZ" with the sliders **φ**,
**θ**, **ψ**; the group "axis angle" with the 2D slider **axis lat/long** (a square pad; horizontal = longitude
−3.15 … 3.15, vertical = latitude −1.58 … 1.58) and the slider **angle**; the group "roll pitch yaw" with the sliders
**R<sub>x0, α</sub>**, **R<sub>y0, β</sub>**, **R<sub>z0, γ</sub>**. Only the group of the selected method is enabled; the
others show converted values. The 3D picture can be rotated with the mouse.

### M-TP-01  Default picture vs original
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` with Mathematica 15.0.1 (File > Open…);
click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — ⊕ (top right of the panel) > Initial Settings.
**Do** —
1. Compare the layout (progress on top, other controls on the left) and the picture (teapots, red and blue frames,
   purple axis, axes box) with the port; take screenshots of both.
**Record** — layout same (yes/no); picture differences (screenshots).
**Save** — File > Close, Don't Save.
**Port** — **Initial settings**. Expected: the same layout and picture (D-TP-03 lists the rendering differences).
**Expected / what it decides** — the same scene in both.

### M-TP-02  Teapots
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — ⊕ > Initial Settings; method `Euler ZYZ`; type φ = `1`, θ = `0.5`, ψ = `-1` into the sliders' value
fields (click the + of a slider to show its field if needed; Enter after each).
**Do** —
1. Move **progress** to 0, then slowly to 1; watch the three teapots.
**Record** — at progress 0: where the solid teapot is (on the green one?); at 1: on the red one?; green stays at the
start and red at the final orientation (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the green translucent teapot stays at the start; the red translucent teapot at
the final orientation; the solid teapot moves from green (progress 0) to red (progress 1).
**Expected / what it decides** — the same in both.

### M-TP-03  Frames
**Steps** — port only: open `demos/three-parametrizations/`, set φ = 1, θ = 0.5, ψ = −1 (method Euler ZYZ); drag in the
picture to rotate the view; look at the red x₀y₀z₀ (fixed) and blue x₁y₁z₁ (rotated) frames.
**Record** — the blue frame is the red frame turned by the final rotation (yes/no); labels next to the line ends
(yes/no).
**Expected** — the blue frame is the red frame rotated by the final rotation; labels next to the line ends.

### M-TP-04  Each method enables only its own controls; others show converted values
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Method `Euler ZYZ`: set φ = 1, θ = 0.5, ψ = −1 (value fields); read all other controls (axis lat/long, angle, α, β,
   γ).
2. Click `axis/angle`: does the red teapot move? Change **angle** to 2; read φ, θ, ψ, α, β, γ.
3. Click `roll pitch yaw`: does the red teapot move? Change **R<sub>y0, β</sub>** to 0.3; read φ, θ, ψ, axis, angle.
**Record** — after each step: which group is enabled; the values of the disabled controls (all digits shown); whether
the red teapot moved when switching method.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: only the chosen group is active; the others update to equivalent values; the red
teapot does NOT move when you switch method (same final orientation).
**Expected / what it decides** — the same values in both (golden parity covers the saved conversions).

### M-TP-05  Purple axis of rotation
**Steps** — port only: open `demos/three-parametrizations/`, click **axis/angle**, drag inside the 2D pad **axis
lat/long**, set **angle** to 2, then move **progress** from 0 to 1.
**Record** — the purple line points along the chosen axis (yes/no); the teapot turns about it (yes/no).
**Expected** — the purple line points along the chosen axis; the teapot rotates about it as progress moves.

### M-TP-06  Progress animation in each method
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — ⊕ > Initial Settings; method `Euler ZYZ`; φ = 1, θ = 0.5, ψ = −1.
**Do** —
1. Click the + right of **progress**, press ▶ and watch one full sweep; pause.
2. Click `axis/angle`; play again; pause.
3. Click `roll pitch yaw`; play again; pause.
**Record** — for each method the order of the turns you see (e.g. "about z, then y, then z").
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: Euler: turns about z, then y, then z; axis/angle: one smooth turn; roll pitch
yaw: about x, then y, then z.
**Expected / what it decides** — the same in both.

### M-TP-07  Edge values (math check)
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (File > Open…, Enable Dynamics, no
evaluation) — for Do 2 only.
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Port: method Euler ZYZ, try θ = 0, θ = ±3.14 and ±3.15; method roll pitch yaw, β = ±1.57; method axis/angle,
   angle = ±3.15, and type `3.14159` into the angle field.
2. Original: method `Euler ZYZ`, type `Pi` into the value field of **θ** (Enter); read the field, the axis/angle and
   roll/pitch/yaw values. Then type `Pi/2` into **θ** with ψ = 0 and read the roll/pitch/yaw values. Then method
   `roll pitch yaw`, type `Pi` into **R<sub>x0, α</sub>** with β = γ = 0 and read φ, θ, ψ.
**Record** — Do 1: blank picture or NaN anywhere (yes/no, where), converted values; Do 2: whether the field accepts
`Pi` and `Pi/2` (shows π or 3.14159…), and every converted value shown (including "Indeterminate" if it appears).
**Save** — File > Close, Don't Save.
**Port** — Do 1. Expected: no blank picture, no NaN in fields; converted values describe the same orientation.
**Expected / what it decides** — Do 1 the same orientation everywhere; Do 2 shows whether the exact half-turn and
gimbal-lock cases of errors E-TP-04, E-TP-05 and E-TP-06 can be reached in the original.

### M-TP-08  Rotate / zoom the view; Reset view; Initial settings
**Steps** — port only: open `demos/three-parametrizations/`; drag in the picture to rotate, use the mouse wheel to
zoom; press **Reset view**; change a slider, then press **Initial settings**.
**Record** — rotate, zoom, Reset view and Initial settings each work (yes/no).
**Expected** — the view rotates and zooms; Reset view restores the default view; Initial settings restores all
controls.

### M-TP-09  Caption, Details text and credits
**Open** — `_internal\originals\ThreeParametrizationsOfRotations-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — nothing.
**Do** —
1. Read the caption (below the Manipulate) and the Details section (parametrizations, formulas, the reference).
2. In the port read the caption, open **Details**, read the port note and the footer.
**Record** — for the caption and each Details paragraph or formula: "same", "corrected as in the port note", or the
exact difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 2. Expected: the same text as the original, except the corrections described in the port note
(DESIGN.md D-TP-04); credits footer present.
**Expected / what it decides** — identical texts apart from D-TP-04 (see errors E-TP-01 to E-TP-03).

---------------------------------------------------------------------------------------------------
## EA — Euler Angles: Precession, Nutation, and Spin

Original notebook (all EA items): `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` (the
Manipulate is the first output of the notebook). Port: `demos/euler-angles/`.

The original's controls: the sliders **precession angle**, **nutation angle** and **spin angle** (0 … 360, step 1,
with + button and value). The bookmarks pos0 … pos6 and **Animate Bookmarks** are in the ⊕ menu at the top right of
the panel. The port shows the bookmarks as a list **bookmarks** and a button **▶ Animate bookmarks**.

### M-EA-01  Default picture vs original
**Open** — `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` with Mathematica 15.0.1
(File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — ⊕ (top right of the panel) > Initial Settings.
**Do** —
1. Compare the picture with the port: three rings, the rotor (disk and cube), the yellow, blue and red axles, the
   black and coloured frames with their labels; take screenshots of both.
**Record** — differences (screenshots).
**Save** — File > Close, Don't Save.
**Port** — **Initial settings**. Expected: the same gyroscope (D-EA-01 lists the rendering differences).
**Expected / what it decides** — the same scene in both.

### M-EA-02  Each slider moves the right body
**Steps** — port only: open `demos/euler-angles/`; move **precession angle** only, then **Initial settings** and
**nutation angle** only, then **Initial settings** and **spin angle** only.
**Record** — which bodies move for each slider.
**Expected** — precession turns the middle ring and everything inside about Z; nutation tilts the inner ring and the
rotor about the blue axle; spin turns only the rotor (disk and cube) about the red axle. The outer ring never moves.

### M-EA-03  Axles connect the rings
**Steps** — port only: set (precession, nutation, spin) to (45, 30, 15), (120, 80, 200) and (300, 170, 90) and look
at the yellow, blue and red axles.
**Record** — for each setting: the axles join the rings (yes/no, where not).
**Expected** — the axles always join their rings.

### M-EA-04  Frames and labels
**Steps** — port only: set (45, 30, 15) and rotate the view with the mouse.
**Record** — the frames follow their bodies (yes/no); labels readable (yes/no).
**Expected** — black X Y Z fixed; blue, red and olive x y z frames follow their bodies; labels readable.

### M-EA-05  Bookmarks and bookmark animation
**Open** — `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Choose ⊕ > pos0, then pos1 … pos6 in turn; read the three slider values each time.
2. Choose ⊕ > Animate Bookmarks; watch for 20 s; stop it by choosing ⊕ > Animate Bookmarks again (or the stop
   control that appears).
**Record** — Do 1: the three values for each bookmark; Do 2: the order in which the animation passes the bookmarks,
and roughly how long one cycle takes.
**Save** — File > Close, Don't Save.
**Port** — the bookmark list and **▶ Animate bookmarks**. Expected: pos1 = (45, 0, 0), pos2 = (45, 30, 0), pos3 =
(45, 30, 15), pos4 = (0, 30, 15), pos5 = (0, 0, 15); the animation passes through them in order.
**Expected / what it decides** — the same in both; the cycle time is recorded (D-EA-02).

### M-EA-06  0° vs 360°
**Steps** — port only: set each angle to 0 and then to 360 (value field), one at a time.
**Record** — identical pictures (yes/no).
**Expected** — identical pictures.

### M-EA-08  Reset during the bookmark animation (K-EA-01)
**Open** — `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Start ⊕ > Animate Bookmarks. While it runs, choose ⊕ > Initial Settings; watch 5 s.
2. Start it again if it stopped; while it runs, drag **precession angle**; watch 5 s.
**Record** — Do 1: does the animation stop; do the angles stay at 0; Do 2: does the animation stop or overwrite your
slider move.
**Save** — File > Close, Don't Save.
**Port** — the same with **▶ Animate bookmarks** and **Initial settings**. Expected: both behave the same.
**Expected / what it decides** — settles K-EA-01 (the port is to behave like the original; I-EA-01 otherwise).

### M-EA-07  Caption and credits
**Open** — `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` (File > Open…, Enable Dynamics, no
evaluation).
**Prepare** — nothing.
**Do** —
1. Read the title and the caption below the Manipulate ("Here a gyroscope is used to illustrate …") and the authors.
2. In the port read the caption and the footer.
**Record** — caption "same" or the exact difference; authors credited (yes/no).
**Save** — File > Close, Don't Save.
**Port** — see Do 2. Expected: the same caption; the credit footer names Kevin Hernandez and Sándor Kabai.
**Expected / what it decides** — identical texts (F-EA-13).

---------------------------------------------------------------------------------------------------
## Further robotics demonstrations (added in v0.1.12)

Each of the seven newer apps has its own checklist in [`checklists/`](checklists/) (items `M-SL-…`, `M-CP-…`,
`M-UB-…`, `M-AG-…`, `M-PR-…`, `M-PA-…`, `M-RS-…`): prm-seven-link, car-paths, unit-balls, art-gallery, prm,
prm-robot-arm, robot-singularities. They follow the same procedure and record into the same kind of test-run file.

---------------------------------------------------------------------------------------------------
## Anything else you noticed
Write it under "Anything else" at the end of the test-run file (unexpected behaviour, ideas, questions).
