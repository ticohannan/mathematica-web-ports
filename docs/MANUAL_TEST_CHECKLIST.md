# Manual test checklist

Plain-text friendly: fill it in with any text editor and email it back.
Copy this file per session and name the copy `YYYY-MM-DD_<tester>_checklist.md`.
For each item tick one box by replacing `[ ]` with `[x]` and write what you saw.
"Original" means the Wolfram version (Wolfram Player / Wolfram Cloud / live site); see docs/TESTING.md.
If you cannot run the original, write "no original" in the Original line and judge against the
expected behaviour described here and in the demo's DESIGN.md.

Be specific: numbers, positions, screenshots (name them `<ID>_<what>.png` and attach).
A difference from the original is worth recording even if you are not sure it is a fault.

```
Tester:
Date:
Port URL or commit tested (shown by `git log -1 --oneline`):
Operating system:
Browser + version (Firefox: Menu > Help > About Firefox):
Screen size / zoom level:
Original used for comparison (Player / Cloud / site / none):
```

---------------------------------------------------------------------------------------------------
## GEN — general (do once per browser)

### M-GEN-01  Landing page and links
Steps: open the site root. Click each of the three demo links, use "All demos" to come back.
Expected: three cards; each link opens its demo; no broken page.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-GEN-02  Error console
Steps: open each demo with the browser console open (F12 > Console). Use every control once.
Expected: no red errors.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes (copy any error text):

### M-GEN-03  Narrow window / phone width
Steps: make the window ~400 px wide (or Firefox responsive mode, Ctrl+Shift+M). Use each demo.
Expected: everything reachable, no horizontal scrolling of the page, picture still usable.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-GEN-04  Keyboard only
Steps: without the mouse, Tab through each demo; change sliders with arrow keys, press setter buttons with Enter/Space.
Expected: every control reachable; focus outline visible.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-GEN-05  Responsiveness / load
Steps: drag sliders and locators quickly for ~10 s. Watch for stutter, freezing, or delayed updates.
Expected: picture follows the mouse without noticeable lag (note your computer's speed).
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

---------------------------------------------------------------------------------------------------
## MP — Motion Planning for Robot Path around Obstacles (main target)

### M-MP-01  Default picture vs original
Steps: open the demo (or press "Initial settings"). Compare with the original's default view.
Expected: square yellow boundary; blue triangle robot top-left; green triangle robot bottom; red
triangle/square/pentagon/hexagon obstacles; gray C-obstacle outlines with red vertex dots; faint
orange/purple/blue lines; a green path start → one corner → end; six locator circles.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-02  Drag the start robot (r1)
Steps: drag the locator in the blue robot to several places, slowly and fast.
Expected: robot follows; path and orange lines update continuously; progress returns to start.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-03  Drag the end robot (r2)
Steps: as M-MP-02 for the green robot.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-04  Drag each obstacle (o1…o4)
Steps: drag each obstacle across the path; also drag two obstacles so they overlap.
Expected: C-obstacle outlines move with the obstacle; path re-routes around them; overlapping obstacles
are still avoided (record what the path does in the overlap!).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-05  Locator limits and clicking empty space
Steps: drag each locator as far as possible in every direction. Then click on an empty part of the picture.
Expected: obstacles stop at ±3.75, robots at −4.25 / +4.15. Record whether clicking empty space moves
a locator in the ORIGINAL (the port does not do this — D-MP-04).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-06  Boundary sides 3 / 4 / 5
Steps: press 3, 4, 5 under "boundary". In each, move a robot near the edge until it turns red.
Expected: triangle / square / pentagon boundary; robot turns red as soon as any part of it would leave
the boundary; "No path exists." appears.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-07  Robot sides 3 / 4 / 5
Steps: press 3, 4, 5 under "robot".
Expected: both robots change shape; C-obstacles grow/change; progress resets to the start.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-08  Progress slider
Steps: move "progress" from left to right. Open ⊕ and use ▶ (play) and the step buttons.
Expected: orange robot travels along the path from start to end without touching any obstacle;
the travelled part turns solid green; at the far right the orange robot covers the green end robot.
Check the robot never overlaps an obstacle on the way (look closely at corners).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-09  Invalid start / end
Steps: drag the start robot onto an obstacle; then drag the end robot onto one; then partly outside the boundary.
Expected: offending robot drawn red; "No path exists." above the start robot; no path drawn.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-10  Configuration space view
Steps: press "configuration space". Repeat M-MP-02 and M-MP-08 in this view.
Expected: gray C-boundary, white C-obstacles, light green path, robots/obstacles not drawn (only locators);
a dark green dot shows progress (not at the very start).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-11  Configuration space with invalid start
Steps: in configuration space, drag the start into an obstacle.
Expected: whole background turns red; the C-obstacle containing the start turns red.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-12  Is the path really the shortest? (robotics check)
Steps: tick "show numbers". For 3 different scenes, judge whether a visibly shorter collision-free
route exists. Record the "link to this scene" of any suspicious case.
Expected: path hugs C-obstacle corners/edges and is the shortest possible.
Port path length(s): 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-MP-13  Leads from tools/explore-motion.mjs
Steps: open 3–5 links from `test-output/explore-motion.md`. For each, describe what looks wrong.
If possible, reproduce the same scene in the original (edit the initial locator values) and compare.
Lead / what the port does / what the original does:
1.
2.
3.
Result: [ ] DONE
Notes:

### M-MP-14  Text and credits
Steps: read caption, open Details, check authors and links.
Expected: same text as the original; authors credited; links work.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

---------------------------------------------------------------------------------------------------
## TP — Three Parametrizations of Rotations

### M-TP-01  Default picture vs original
Steps: open the demo. Compare layout (progress on top, other controls left) and picture.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-02  Teapots
Steps: with method Euler ZYZ set φ, θ, ψ to non-zero values; move progress between 0 and 1.
Expected: green translucent teapot stays at the start; red translucent teapot at the final orientation;
solid teapot moves from green (progress 0) to red (progress 1).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-03  Frames
Steps: rotate the view; look at red x₀y₀z₀ (fixed) and blue x₁y₁z₁ (rotated) frames.
Expected: blue frame is the red frame rotated by the final rotation; labels next to the line ends.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-04  Each method enables only its own controls; others show converted values
Steps: switch method 1 → 2 → 3. In each, change the enabled controls and read the disabled ones.
Expected: only the chosen group is active; the others update to equivalent values; the red teapot
does NOT move when you switch method (same final orientation).
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-05  Purple axis of rotation
Steps: in axis/angle mode drag the 2D "axis lat/long" pad; set angle.
Expected: purple line points along the chosen axis; teapot rotates about it as progress moves.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-06  Progress animation in each method
Steps: for each method, play progress (⊕ ▶).
Expected: Euler: turns about z, then y, then z; axis/angle: one smooth turn; roll-pitch-yaw: about x, then y, then z.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-07  Edge values (math check)
Steps: try θ = 0, θ = ±3.14/3.15; β = ±1.57; angle = ±3.15; type 3.14159 into angle.
Expected: no blank picture, no NaN in fields; converted values describe the same orientation.
Port values seen: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-08  Rotate / zoom the view; Reset view; Initial settings
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-TP-09  Caption, Details text and credits
Steps: read the caption and open Details; compare with the original's text.
Expected: same text as the original, except the corrections described in the port note (DESIGN.md D-TP-04); credits footer present.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

---------------------------------------------------------------------------------------------------
## EA — Euler Angles: Precession, Nutation, and Spin

### M-EA-01  Default picture vs original
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-02  Each slider moves the right body
Steps: move precession only, then nutation only, then spin only.
Expected: precession turns middle ring + everything inside about Z; nutation tilts inner ring + rotor
about the blue axle; spin turns only the rotor (disk + cube) about the red axle. Outer ring never moves.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-03  Axles connect the rings
Steps: at several angle combinations look whether the yellow/blue/red axles still join the rings.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-04  Frames and labels
Expected: black X Y Z fixed; blue, red and olive x y z frames follow their bodies; labels readable.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-05  Bookmarks and bookmark animation
Steps: choose pos0…pos6; then "Animate bookmarks".
Expected: pos1 = (45,0,0), pos2 = (45,30,0), pos3 = (45,30,15), pos4 = (0,30,15), pos5 = (0,0,15); animation passes through them in order.
Original: 
Port: 
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-06  0° vs 360°
Steps: set each angle to 0 and to 360.
Expected: identical pictures.
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

### M-EA-07  Caption and credits
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:

---------------------------------------------------------------------------------------------------
## Anything else you noticed
(free text — unexpected behaviour, ideas, questions)
