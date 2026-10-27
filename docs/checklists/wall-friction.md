# Manual checks — Moving Two Particles with Shared Control Inputs Using Wall Friction (`demos/wall-friction/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_wall-friction.md` (create it with `npm run test-run -- wall-friction`).

Original notebook (all items): `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb`.
Port (all items): `http://127.0.0.1:8080/demos/wall-friction/` (after `npm run serve`).

### M-WF-01 Texts
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details (four paragraphs and the two references) with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts; ϵ written as in the notebook (N-WF-09); the Details' colour mix-up of the rectangles kept (E-WF-04) (F-WF-13).

### M-WF-02 Opening picture
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page: the walls, the gray ε margin, the blue and magenta starts (squares), goals (circles), dashed start-to-goal arrows and paths, the gray disks around robot 2's start and goal, the Δ configuration space on the right.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: Δ configuration space selected, progress 1, ϵ 1/20, four moves (robot 1 down-left, to the top-left corner, held, to its goal; robot 2 to the left wall, held, right, to its goal); no magenta dot in the top-left corner (D-WF-01); the inset's frame smaller (D-WF-03) (F-WF-08, F-WF-11).

### M-WF-03 Each control
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click **moves**, then **Δ configuration space**.
2. Move **progress** slowly from 1 to 0 and back.
3. Move **ϵ** from end to end.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the setter switches the right-hand view; progress moves both robots back along their paths move by move (each move the same share of the slider, Q-WF-02), the slider label shows exact fractions; ϵ widens the gray margin and the gray disks, pulls points near the walls inward and can change the planned moves (F-WF-01…F-WF-03).

### M-WF-04 Initial settings
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control and the four points away from their opening values.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-WF-01).

### M-WF-05 The page works on its own
**Steps** — open the port's page; click both setter buttons; move both sliders; drag each of the four (invisible) points: robot 1's start at the blue square, robot 2's start at the magenta square, the goals at the circles; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control and point changes the picture, the paths are planned again at once; Initial settings restores the opening picture (F-WF-04, A-WF-01).

### M-WF-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-WF-07 The Δ configuration space
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — Δ configuration space selected.
**Do** —
1. Set progress to 0 (the robots at their starts), then to about 1/2, then to 1.
2. Drag robot 2's start (magenta square) to the left of robot 1's start, then below it.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-07: per step: "same" or the difference (rectangles, red square, green disk, labels).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the red square ("Δr") follows the robots' spacing at the progress, the green disk ("Δg") is the goal spacing, the blue band (horizontal-wall moves) and the green band (vertical-wall moves) change with the spacing and flip with the robots' order; the port's frame is smaller and its plot range unpadded (D-WF-03) (F-WF-09).

### M-WF-08 Snapshots
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\wall-friction-snapshot-1…4.png` (made by `npx playwright test tests/e2e/wall-friction.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the four snapshot pictures with the screenshot of the same number: the paths of both robots, the markers, the dashed arrows, the gray disks and margin, the inset or the moves panel, the controls.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-08: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same paths and moves (4, 5, 4, 5), "move 5 of 5" with total distance 1.89 and 1.93 in snapshots 2 and 4, where neither setter button is selected (Q-WF-01), ϵ shown as 1/20, 13/500, 1/1000, 61/1000; differences only as D-WF-01, D-WF-03 and D-WF-04 say (F-WF-12).

### M-WF-09 Moves panel during a move
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — click **moves**.
**Do** —
1. Set progress to 0, then step it up with the slider through the first move and into the second.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-09: per position: the "move k of n" text and the arrow, "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — "move 1 of 4" at 0 with only the faded arrow and its point; during a move the dark arrow grows to the point; exactly at a move's end the text already names the next move (N-WF-06); the total distance stays 1.33 (F-WF-10).

### M-WF-10 Level points
**Open** — `_internal\originals\MovingTwoParticlesWithSharedControlInputsUsingWallFriction.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag both starts below the bottom edge of the workspace (they stop on the edge of the ε margin, level), robot 1's to the left of robot 2's and close to it.
2. Drag both goals below the bottom edge too, far apart in the same order.
3. Drag one goal back up.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_wall-friction.md`, under the heading M-WF-10: per step: what each shows (picture, `$Aborted`, waiting time).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — after step 2 Mathematica computes until its time limit and shows `$Aborted`, the port shows `$Aborted` at once; after step 3 both draw the paths again (E-WF-02, D-WF-02, A-WF-08).
