# Manual checks — Art gallery (`demos/art-gallery/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester.

### M-AG-01 Texts
Title, caption and Details (with the five references) match the original's text.

### M-AG-02 Opening picture
Open both. Expected: cubicle, one guard at the centre, its light-blue region as in snapshot 1 (thin slivers at the
bottom near x = 0 and at the left near y = 0 come from the original's 1e-5 shifts, Q-AG-07). Gray thick walls, controls
"number of guards" and "environment" on top.

### M-AG-03 Default guards on a vertex and on an edge (Q-AG-01, F-AG-06)
Cubicle, choose 8 guards without moving anything. Guard 4 (green) stands on the wall corner (−1.5, 0.5): expected in
the port a green strip along the wall arm (between y = 0 and 0.5) that leaves the gallery to the left; guard 6 (blue,
on the edge y = 0.5) sees the upper-left room. Compare both regions with the original (K-AG-01).

### M-AG-04 First sweep step of guard 2 (Q-AG-02, K-AG-02)
Cubicle, 2 guards, default positions. Expected in both: the yellow region of guard 2 at (0, −1.5) includes the triangle
with corners (1.5, −0.5), (1.5, −1.5), (3.5, −3.5) (right of the corridor, below the notch), with a hairline step at
y ≈ −1.5 near the right wall. If that triangle is missing in the original, the first sweep step is not resolved with the
current angle and the port is wrong there.

### M-AG-05 Movable obstacles
Choose "movable obstacles" and 2 guards. Drag the square by its centre (1, 0) and the triangle by its centre (2, 2);
both regions follow in both programs. Put a guard inside the square: it sees only the square (snapshot 4).

### M-AG-06 Invisible locators and nearest-locator picking (Q-AG-04, D-AG-04, K-AG-09)
Cubicle, 1 guard. Drag from (0, −1.5) (where the hidden guard 2 sits) and from (2, 2) (the hidden triangle centre).
Expected in both: something is dragged although nothing is visible; after dragging the triangle centre, switching to
"movable obstacles" shows the triangle at its new place. Then click on empty space, e.g. at (0.3, 0.9): expected in
both the nearest locator (here guard 1) jumps to the click. In "movable obstacles", press on the body of
the square and drag: the square follows in both.
Presses where a HIDDEN locator is nearest (K-AG-09): with 3 guards shown in the cubicle, press at (−1.5, 0.2) (hidden
guard 4 at (−1.5, 0.5) is nearest); in the cubicle, press near (2, 2) (hidden triangle centre). Record whether anything
visible moves in the original; in the port nothing visible moves (the hidden locator jumps).
Grab zone (D-AG-09): press about 5, 10, 15 and 25 px beside a guard disk and drag: does the guard jump to the pointer
first, or does it keep its offset? The port keeps the offset within 12 px.

### M-AG-07 Colours (D-AG-02, K-AG-04 resolved)
8 guards in the cubicle: the eight guard colours and region tints should now match exactly (the port uses the
`ColorData[100, "ColorList"]` values read in Mathematica 15.0.1).

### M-AG-08 Dragging with eight guards
"movable obstacles", 8 guards: drag the square around. Expected: all regions follow smoothly in both programs (the port
recomputes all eight guards per frame, about 30 ms).
