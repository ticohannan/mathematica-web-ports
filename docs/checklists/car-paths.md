# Manual checks — Car paths (`demos/car-paths/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester.

### M-CP-01 Texts
Title, caption and Details (including the five references) match the original's text.

### M-CP-02 Opening picture (snapshot 1)
After opening (and after "Initial settings"): label "path length: 24.08   distance: 20.62"; orange path R− L+ S+ R+ with
three grey construction circles and their centres; green start car at (−10, −5) facing down with the blue car on top of
it (front tyres turned), red goal car at (8, 5); black locator glyphs on the rear axles, a green orientation glyph below
the start car and a red one beside the goal car. Compare car size, headlight cones, tyres and glyphs with the original.

### M-CP-03 Driving along the path
Move "progress" slowly from 0 to 1 and press ⊕ → play. Expected in both: the blue car follows the orange path, reverses
on the first arc, steers left/right on arcs (front tyres turned) and straight on the straight piece, and ends on the goal
car. Note any difference in where the car is at a given progress value.

### M-CP-04 Locators
Drag the start car's black locator: the car moves with its heading unchanged and the green glyph follows 2 units away.
Drag the green glyph around the car: the car turns, the glyph stays 2 units away. Drag a car towards the edge: it stops
at x = ±13 / y = ±8 while the pointer goes on (Q-CP-02). Do the same for the goal car.

### M-CP-05 Dubins and swap
Select "Dubins": the path uses only forward motion and is never shorter. Press "swap start and goal" with Reeds-Shepp and
with Dubins: the Reeds-Shepp length stays the same, the Dubins length usually changes. Set the poses of snapshot 2
(start heading up, goal heading up-left) with Dubins: "path length: 26.47   distance: 20.62".

### M-CP-06 Arc direction and ties (K-CP-01, K-CP-02)
Put the goal ahead and to the right of the start so that the path is a single forward right arc: the original and the
port must draw the same (short) arc. Then set start (10.567, 3.978) heading 2.3655 rad, goal (2.433, 6.701) heading
−0.2117 rad, *r*<sub>min</sub> 10 (hard to place by hand; use the notebook): note which path the original draws.

### M-CP-07 Degenerate cases (Q-CP-04)
Drive the goal straight ahead of the start (same heading): the original and the port both show a straight path with two
extra grey circles (zero-length arcs). Put the goal exactly on the start: "path length: 0.".

### M-CP-08 Picking a locator (D-CP-06, K-CP-10)
In the original and the port: (a) press on the start car's body (not on its black locator) and drag — the car follows
in both (O-CP-01); repeat while "progress" is animating; (b) press on empty space far from all locators — the nearest
locator jumps to the press point in both (LocatorPane); (c) press about 5, 10 and 15 screen pixels away from a black
locator — note from which distance the original grabs it WITHOUT a jump (port: 12 px); (d) drag the goal car's black
locator onto the start car's green orientation glyph, then press on the pair — note which one moves (port: the nearer
one, on an exact tie the start car's).
