# Manual checks — Seven-link robot (`demos/prm-seven-link/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester.

### M-SL-01 Texts
Title, caption and Details match the original's text.

### M-SL-02 Feel of a drag (Q-SL-01, D-SL-01)
Drag joint 7 slowly through about a quarter turn, then quickly. In both the original and the port, note how far the link
follows the pointer and whether it lags behind. Expected: the link turns in small steps (0.05 rad per update) in both;
the number of steps per second may differ.

### M-SL-03 Collisions (K-SL-02 — the most important check of this app)
Drag a link into a blue obstacle and KEEP pushing against it for a few seconds. Record in the original: (a) does the
robot turn red and stay red while you push? (b) does the collision count rise by one only, or keep climbing while you
push? (c) is "movement" disabled while red? The port: red robot, the count rises by one, "movement" disabled, further
moves into the obstacle are undone. If the original's count keeps climbing and the robot does not stay red, the original
evaluates its body again after assigning its own variables (K-SL-02). The original beeps; the port is silent (D-SL-02).

### M-SL-04 Relative vs absolute (O-SL-01)
Dragging joint 7 shows no difference (it has no following link). Use joint 3: press "restart", select "absolute" and
drag joint 3 slowly through about 30°: the rest of the chain rotates rigidly with link 3 (the angles between links 3–7
stay the same). Press "restart", select "relative" and do the same: only link 3's angle changes; joints 4–7 move
parallel (their links keep their directions). Expected: the same difference in the original and in the port.

### M-SL-05 Solve a goal
Choose goal 1 and bring the robot close to the green configuration (all joints within 20 units). Expected: the
"Congratulations!" line appears in both.

### M-SL-06 Grabbing locators (K-SL-03, D-SL-05)
Expected (LocatorPane rule): a press anywhere moves the nearest joint, which then turns a little toward the
press point. Record in the original: (a) from how far a press grabs a joint without it first turning toward the press
point; (b) which joint moves when you press exactly between two joints; (c) after a collision (red robot), which joint a
press on a drawn joint glyph moves.

### M-SL-07 Owner state 1 status text (O-SL-02)
Open your saved working copy (goal 7, 132 collisions) without touching anything. Expected: the text reads
"132 collisions, worst error = 489.2", as the port computes for that state.
