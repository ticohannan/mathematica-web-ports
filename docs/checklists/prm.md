# Manual checks — Probabilistic roadmap (`demos/prm/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester. The obstacles and samples are random in both (D-PR-03), so compare behaviour,
not the exact pictures; `?seed=1` makes the port's runs repeatable.

### M-PR-01 Texts
Title, caption and Details match the original's text.

### M-PR-02 Sampling, colours and the roadmap
Click "add 50 vertices" four times with "show obstacles" on. Expected in both: red points only inside the pink
polygons, dark green points elsewhere; blue roadmap edges, light-blue edge pieces that leave the square where an edge
wraps round the torus; parts of polygons that stick out of the square are drawn but block nothing (Q-PR-02).

### M-PR-03 Radius change rebuilds the roadmap (K-PR-03)
With about 300 samples, set the radius to 0.87 and wait; then set it to 0.14 by typing into the ⊕ value field.
Expected from the code: the roadmap is rebuilt and all edges become short (≤ 0.14). Note whether the original really
rebuilds, whether it shows "$Aborted" or keeps the long edges (as its saved state does). Repeat by dragging the slider.
The code can only keep the long edges with rold = 0.14 if rold changed while edgesNN did not (interruption between the
two assignments, front end and kernel out of sync, or an edited notebook) — note anything that points to one of these.

### M-PR-04 Locators across the edges (Q-PR-06)
Drag the start locator slowly past the left edge. Expected in both: it jumps to the right edge (x = 2π) and stays there
while the mouse is outside; it does not continue from the right as a shifted copy.

### M-PR-05 Path and progress
If the original shows "toroidLine is not a graphics primitive or directive" (O-PR-01), first re-open the pristine
download or run Evaluation ▸ Evaluate Initialization Cells, then move a control. Use about 200 samples and a radius of
0.6–0.8 so that a path exists (K-PR-06).
With a roadmap that connects start and goal: magenta connectors, green path, label "path length = x"; the progress
slider becomes enabled and moves the purple point from start to goal. Move the radius so that no path exists: the
slider is disabled again, the label reads "no path possible".

### M-PR-06 Start inside an obstacle
Drag the start locator into a polygon (show obstacles on), with the goal far away. Expected in both: its icon turns
red, no magenta connector from the start, "no path possible". Then bring the goal within 0.1 of the start: a direct
magenta path and "path length = …" appear although the start is inside the polygon (Q-PR-10).

### M-PR-07 Pressing near and away from the locators (F-PR-06, K-PR-05, D-PR-07)
Record what happens in the original: (a) press somewhere away from both locators (the port: the nearer locator jumps
there and follows the mouse); (b) press exactly on a locator icon and drag (the port: that locator moves, no jump);
(c) press about 10–20 px beside an icon (the port grabs without a jump within 12 px, jumps beyond). The icons are inner
`Locator[...]` primitives; note whether a drag on them moves only the icon or the start/goal configuration.
