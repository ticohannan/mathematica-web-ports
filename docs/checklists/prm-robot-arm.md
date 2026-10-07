# Manual checks — PRM for robot arm (`demos/prm-robot-arm/`)

Compare with the original open in Mathematica (or Wolfram Player) side by side. Record what you see; differences are
findings, not failures of the tester. Samples are random in both (D-PA-06): compare behaviour, not exact pictures.

### M-PA-01 Texts
Title, caption and Details match the original's text.

### M-PA-02 Opening picture
Compare with snapshot 1 / the freshly opened original: brown robot with link 2 hanging down next to the orange
sphere, translucent goal robot at the back, blue sphere right, box, both locator icons green, base brown, "No path
possible". Note differences in colours, sizes and perspective (D-PA-02, D-PA-03).

### M-PA-03 Start in collision (Q-PA-04)
Turn on "show obstacles" and drag the start locator into the orange region. Expected in both: the start icon turns
red, the base AND the moving robot turn red; drag it out again: brown again.

### M-PA-04 Mouse rotation of the 3D view (Q-PA-05, K-PA-04)
Rotate the 3D view with the mouse, then move a locator or a slider. Note whether the original's view snaps back to the
view-angle setting (the port does).

### M-PA-05 C-obstacles while dragging an obstacle (Q-PA-07, D-PA-01, K-PA-03)
With "show obstacles" on, drag "blue_z" slowly. Expected in both: the regions follow during the drag (coarser) and are
redrawn finely after release. Compare the region shapes for the default obstacles with snapshot 3.

### M-PA-06 Roadmap, path and progress
Click "add 100 vertices" three times, set the radius to about 1.2. Expected in both: brown roadmap, a green path with
magenta connectors when start and goal connect, "Path length = x"; the progress slider moves the blue point and the 3D
robot along the path. The play button (⊕ next to "radius") animates the RADIUS, not progress: progress has no
animator in the original either (O-PA-02). With owner state 1 the port shows "Path length = 3.58" — check the
original's label for the same state (O-PA-03).

### M-PA-07 Stale roadmap after an obstacle move (Q-PA-06)
After sampling, set blue_xy to {0, 0} and blue_z to about 1.5 (the sphere sits on the base). Expected in both: all
samples turn red and the old roadmap edges stay drawn.

### M-PA-08 Pressing near and away from the locators (F-PA-09, K-PA-05, D-PA-09)
Record what happens in the original: (a) press in the phase-space plot away from both locators (the port: the nearer
locator jumps there); (b) press in the white strip left of the phase plot, e.g. just right of the 3D view at the height
of θ2 (the port: the goal locator is clamped and jumps to the far right edge); (c) press and drag on the 3D workspace
(the port rotates the view); (d) press exactly on a locator icon and drag (inner `Locator[...]` primitive: does the
configuration move, or only the icon?); (e) press about 10–20 px beside an icon (the port grabs without a jump within
12 px).
