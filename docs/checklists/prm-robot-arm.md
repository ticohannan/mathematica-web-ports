# Manual checks — PRM for robot arm (`demos/prm-robot-arm/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_prm-robot-arm.md` (create it with `npm run test-run -- prm-robot-arm`).
Differences are findings, not failures of the tester. Samples are random in both (D-PA-06): compare behaviour, not
exact pictures.

Original notebook (all items):
`_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/prm-robot-arm/` (after `npm run serve`).

The original's controls, top of the Manipulate panel, left to right: the 2D slider pad **blue_xy** (blue sphere's
x, y), the vertical slider **blue_z**, the pad **orange_xy**, the vertical slider **orange_z**, the slider **view
angle**, the checkbox **show obstacles**; below them the buttons **add 100 vertices** and **restart**, the slider
**progress** (no + button), and the slider **radius** (with + button and value field, default 1.). The picture has
two insets: **robot workspace** (3D, left) and **robot phase space** (right; θ1 horizontal, θ2 vertical, both
0 … 2π, with a label above it: "No path possible" or "Path length = …"). Two locators in the phase space, drawn as
target icons (green, red when in collision): the start (initially at θ ≈ (3.47, 3.31), near the middle of the phase
plot, with the blue dot of the current robot on it) and the goal (θ ≈ (1.82, 1.65), lower left).

### M-PA-01 Texts
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb` with
Mathematica 15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title and the caption (first text paragraph).
2. Scroll to **Source & Additional Information** > **Details & Citations**: three paragraphs and reference [1]
   (Kavraki et al. 1996).
3. In the port, read the title, caption and Details (click **Details** below the picture).
**Record** — for the title, caption, each Details paragraph and the reference: "same" or the exact difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts.
**Expected / what it decides** — identical texts (F-PA-18).

### M-PA-02 Opening picture
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — look at the panel as opened (compare with `docs/original-snapshots/prm-robot-arm-1.png`); then ⊕ (top
right of the panel) > Initial Settings and look again.
**Do** —
1. In **robot workspace**: the brown robot with link 2 hanging down next to the orange sphere, the translucent goal
   robot at the back, the blue sphere on the right, the box, the brown base.
2. In **robot phase space**: both locator icons green, the label "No path possible".
3. Compare colours, sizes and the perspective of the 3D inset with the port.
**Record** — Do 1 and 2: as described yes/no (what differs); Do 3: differences in colours, sizes, perspective (with
screenshots of both).
**Save** — File > Close, Don't Save.
**Port** — the page as opened, then **Initial settings**. Expected: as in snapshot 1 (D-PA-02, D-PA-03 list the known
rendering differences).
**Expected / what it decides** — the same scene in both.

### M-PA-03 Start in collision (Q-PA-04)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; tick **show obstacles**; wait until the light-orange and light-blue obstacle
regions appear in the phase space (up to 10 s).
**Do** —
1. Press on the start icon (the one with the blue dot) and drag it slowly into the nearest light-orange region; stop
   inside it and wait.
2. Look at: the start icon's colour, the base's colour in the workspace, the moving robot's colour.
3. Drag the start icon out of the region again and look at the same three things.
**Record** — Do 2: icon, base, moving robot colour (red/brown/green); Do 3: the same.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: inside, the start icon turns red, the base AND the moving robot turn red; outside,
brown again.
**Expected / what it decides** — the same in both (Q-PA-04, error E-PA-05).

### M-PA-04 Mouse rotation of the 3D view (Q-PA-05, K-PA-04)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Press inside the **robot workspace** inset and drag about 3 cm to the left: the 3D view rotates.
2. Move the **view angle** slider a little; look at the 3D view.
3. Rotate the view again as in 1, then drag the goal icon in the phase space a little; look at the 3D view.
**Record** — Do 2 and Do 3: does the view snap back to the view-angle setting (yes/no)?
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: the view snaps back on every update.
**Expected / what it decides** — settles K-PA-04 (Q-PA-05 assumes the snap-back).

### M-PA-05 C-obstacles while dragging an obstacle (Q-PA-07, D-PA-01, K-PA-03)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; tick **show obstacles**; wait for the regions.
**Do** —
1. Compare the shapes of the light-blue and light-orange regions with `docs/original-snapshots/prm-robot-arm-3.png`.
2. Drag the **blue_z** slider slowly from its position to the top (about 5 s), watching the regions while you drag;
   release and wait 10 s.
**Record** — Do 1: the shapes match (yes/no, what differs); Do 2: the regions follow during the drag (yes/no), coarser
during the drag than after release (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: the regions follow during the drag, coarser, and are redrawn finely after release.
**Expected / what it decides** — the same in both (Q-PA-07, D-PA-01; K-PA-03 for the resolution).

### M-PA-06 Roadmap, path and progress
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Click **add 100 vertices** three times, waiting after each click until the points appear (up to 30 s).
2. Type `1.2` into the **radius** value field (Enter) and wait until the roadmap is drawn.
3. If a path exists (green path with magenta connectors), read the label above the phase space; drag **progress**
   from left to right and watch the blue point in the phase space and the robot in the workspace.
4. Click the + right of the **radius** slider and ▶: which slider is animated? Pause it.
5. Owner state 1: open `_internal\originals\saved\prm-robot-arm_owner-state-1_2026-10-06.nb` (the working copy saved on
   2026-10-06; copy it there under this name first if it is elsewhere), Enable Dynamics, and read the label.
**Record** — Do 1: brown roadmap edges drawn (yes/no); Do 3: the label exactly, and whether progress moves the blue
point and the robot along the path; Do 4: which slider moved; Do 5: the label exactly.
**Save** — File > Close, Don't Save (also for the owner state).
**Port** — Do 1–4 in the port. Expected: brown roadmap; with a path, magenta connectors, green path and "Path length =
x"; progress moves the blue point and the 3D robot; the ⊕ of radius animates the RADIUS (progress has no animator in
the original either, O-PA-02). For owner state 1 the port shows "Path length = 3.58".
**Expected / what it decides** — Do 1–4 the same in both; Do 5 settles the regression pin of O-PA-03 (expected
"Path length = 3.58").

### M-PA-07 Stale roadmap after an obstacle move (Q-PA-06)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click **add 100 vertices** twice and wait; type `1.2` into the **radius** value
field and wait.
**Do** —
1. Drag the thumb of the **blue_xy** pad to the centre of the pad ({0, 0}).
2. Drag **blue_z** down until the blue sphere sits on the base in the workspace (about 1.5); wait 30 s.
3. Look at the samples and the roadmap edges in the phase space.
**Record** — the colour of the samples (all red?), whether the old roadmap edges are still drawn (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: all samples red, the old edges still drawn.
**Expected / what it decides** — the same in both (Q-PA-06, error E-PA-06).

### M-PA-08 Pressing near and away from the locators (F-PA-09, K-PA-05, D-PA-09)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings before each of the following steps.
**Do** —
1. (a) Click in the phase space far from both icons (e.g. near its top-right corner): does the nearer icon jump there?
2. (b) Click in the white strip left of the phase plot, just right of the 3D inset, at the height of the θ2 label:
   what moves, and where to?
3. (c) Press on the 3D workspace inset and drag: does the view rotate, or does a locator move?
4. (d) Press exactly on the goal icon and drag 2 cm: does the goal configuration move (the translucent goal robot in
   the workspace changes), or only the icon?
5. (e) Press about 10 px, then 20 px, beside the goal icon and drag 2 cm: does the icon jump under the pointer first,
   or keep its distance?
**Record** — (a)–(e): what moved and how, in one line each.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: (a) the nearer locator jumps there; (b) the goal locator is clamped and
jumps to the far right edge; (c) the view rotates; (d) the configuration moves; (e) no jump within 12 px, a jump
beyond.
**Expected / what it decides** — settles K-PA-05 (a)–(c) and D-PA-09 (grab distance).
