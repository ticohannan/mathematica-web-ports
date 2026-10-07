# Manual checks — Unit balls (`demos/unit-balls/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester. Leads to settle are listed in `demos/unit-balls/DESIGN.md` §7 (K-UB-…).

### M-UB-01 Texts
Title, caption, the formula line under "dimension" (2D and 3D versions) and the Details text match the original's.

### M-UB-02 Box, axes and labels at the default view
In 3D (p = 1/2) and in 2D (p = 2) compare without rotating: box size and position in the picture, tick labels
−1.0 … 1.0 (3D only; 2D has none), the axes labels *x*, *y*, *z* / *x*, *y*, "distance", and the plot label
("0.5‐norm", "2‐norm") including its slight shift to the right of centre (Q-UB-01).

### M-UB-03 Colours and shading
For p = 1/2, 1, 2 and ∞ in both modes: the orange/yellow surface, the blue half-transparent plane at height 1 (2D)
and the dark mesh lines (3D). Note where the shading differs (D-UB-04), e.g. the octahedron's lower faces and the
edges of the cube (the original's are slightly rounded, D-UB-01).

### M-UB-04 One p, two controls
Click 1/2: the slider moves to 0.5 and shows "1/2". Drag the slider to exactly 2: the label reads "2.‐norm" and the
"2" button is shown selected (Q-UB-02, K-UB-04). Click ∞: the thumb jumps to the left end and the value shows "∞"
(K-UB-05); press the ⊕ panel's step buttons and note what happens.

### M-UB-05 Small p (K-UB-09; K-UB-01 resolved)
In 2D choose 1/4, then type 0.1 into the slider's value field. Expected in both: the corners of the orange surface are
NOT cut off (Mathematica's PlotRange reaches the corner values, 24 and 1536) and the blue plane sits just above the
bottom of the box. In 3D choose 1/4: compare the length of the spikes (K-UB-09, still open).

### M-UB-06 Rotation
In 3D drag the picture to rotate it, then click another p button: does the original return to the default view
(Q-UB-03, K-UB-07)? While rotated, compare where the axes and ticks are drawn (D-UB-05).

### M-UB-07 Mesh lines
On the p = 1 octahedron count the lines on one face (port: 7 interior lines parallel to each edge); on the cube count
the cells of one face (port: 16 × 16); on the p = 1/4 star note how many lines are visible (K-UB-03).

### M-UB-08 Typed values
Type into the slider's value field: 1/4, 2.5, 50, 0, -1, Infinity, Sqrt[2]. Compare what the original accepts and
shows (K-UB-06, D-UB-07).
