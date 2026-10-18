# Manual checks — Art gallery (`demos/art-gallery/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_art-gallery.md` (create it with `npm run test-run -- art-gallery`).
Differences are findings, not failures of the tester.

Original notebook (all items): `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/art-gallery/` (after `npm run serve`).

The original's controls, top of the Manipulate panel: the setter bar **number of guards** (buttons `1` … `8`) and
the setter bar **environment** (`movable obstacles`, `irregular`, `cubicle`). The picture shows the square −4 … 4 in
both directions without axes: its centre is (0, 0) and one unit is one eighth of the picture's width. The cubicle's
outer walls are at ±3.5. All ten locators are invisible (`Appearance -> None`): guards 1–8 (drawn as coloured disks
of radius 0.1 only while they are in use) start at (0, 0), (0, −1.5), (−2, −1), (−1.5, 0.5), (−0.6, −1), (−2.5, 0.5),
(−2, 1), (−1.25, 3); the centre of the movable square starts at (1, 0), that of the triangle at (2, 2).

### M-AG-01 Texts
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` with Mathematica 15.0.1
(File > Open…); click Enable Dynamics if the yellow bar offers it; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title at the top ("Art Gallery Problem") and the caption, the first text paragraph ("How many
   omnidirectional cameras …").
2. Scroll down to the section **Source & Additional Information**, sub-section **Details & Citations**: two
   paragraphs, then **References** with the five references [1]–[5].
3. In the port, read the title, the caption under it and the Details (click **Details** below the picture to open
   it).
**Record** — for the title, the caption, each Details paragraph and each reference: "same", or the exact difference
(copy both versions).
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts, the five references with their links.
**Expected / what it decides** — identical texts; verifies F-AG-15.

### M-AG-02 Opening picture
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — do not touch anything: the picture as the notebook opens is the state to compare.
**Do** —
1. Look at the Manipulate panel without touching it; compare it with `docs/original-snapshots/art-gallery-1.png`.
2. Look closely (zoom the screen with the Windows Magnifier, Win + Plus, if needed) at two places: the bottom of the
   light-blue region straight below the guard, near x = 0, and the left of the region near y = 0.
3. Choose ⊕ (top right of the panel) > Initial Settings and look again.
**Record** — the selected buttons of **number of guards** and **environment**; where the guard disk is; whether the
light-blue region matches the snapshot (yes/no, and where not); whether thin light-blue slivers are visible at the
two places of Do 2 (yes/no each); whether Initial Settings changed anything (yes/no).
**Save** — File > Close, Don't Save.
**Port** — open the page and do the same (step 3: the **Initial settings** button). Expected: cubicle, one guard at
the centre, the light-blue region of snapshot 1 including the two thin slivers, grey thick walls, the two setter bars
on top.
**Expected / what it decides** — the same picture in both, slivers included (they come from the original's 10<sup>−5</sup>
shifts, Q-AG-07, E-AG-04).

### M-AG-03 Default guards on a vertex and on an edge (Q-AG-01, F-AG-06)
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; environment `cubicle`; click `8` under **number of guards**. Do not move anything.
**Do** —
1. Find guard 4, the green disk on the wall corner (−1.5, 0.5): the inner end of the short wall arm that runs from the
   left outer wall to x = −1.5 between y = 0 and y = 0.5 (left of the centre, slightly above it).
2. Look at the green region: is there a narrow green strip along that wall arm (between y = 0 and y = 0.5), and does
   it continue out of the gallery to the left, beyond the outer wall at x = −3.5?
3. Find guard 6, the blue disk on the edge y = 0.5 at (−2.5, 0.5), on the upper side of the same wall arm. Does its
   region cover the upper-left room (x from −3.5 to −1.5, y from 0.5 to 3.5)?
4. Take a screenshot of the whole picture.
**Record** — Do 2: strip yes/no, leaves the gallery yes/no; Do 3: covers the upper-left room yes/no; the screenshot
file name.
**Save** — this state is wanted as golden data: File > Save As… `_internal\originals\saved\art-gallery_M-AG-03_<YYYY-MM-DD>.nb`,
then File > Close.
**Port** — Initial settings, click `8`, the same observations. Expected in the port: a green strip along the wall arm
between y = 0 and 0.5 that leaves the gallery to the left; guard 6 sees the upper-left room.
**Expected / what it decides** — the same regions in both; settles K-AG-01 for the vertex case (the original's
vertex nudge, Q-AG-01, error E-AG-01); the saved notebook gives the eight regions as golden data.

### M-AG-04 First sweep step of guard 2 (Q-AG-02, K-AG-02)
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; environment `cubicle`; click `2` under **number of guards**.
**Do** —
1. Find guard 2, the yellow disk at (0, −1.5), 1.5 units straight below the centre guard.
2. Look at the triangle with corners (1.5, −0.5), (1.5, −1.5), (3.5, −3.5): right of the corridor in which guard 2
   stands, below the notch of the right wall; its long side runs diagonally down to the bottom-right corner of the
   gallery. Is it yellow?
3. Look along y ≈ −1.5 near the right outer wall (x = 3.5): is there a hairline step in the edge of the yellow region?
4. Take a screenshot of the whole picture.
**Record** — triangle yellow yes/no; hairline step yes/no; the screenshot file name.
**Save** — this state is wanted as golden data (it settles K-AG-02 bit for bit): File > Save As…
`_internal\originals\saved\art-gallery_M-AG-04_<YYYY-MM-DD>.nb`, then File > Close.
**Port** — Initial settings, click `2`, the same observations. Expected in the port: the triangle is yellow, with a
hairline step at y ≈ −1.5 near the right wall.
**Expected / what it decides** — if the triangle is missing in the original, the original's first sweep step is NOT
resolved with the current angle and the port is wrong there (K-AG-02, Q-AG-02, error E-AG-02).

### M-AG-05 Movable obstacles
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `movable obstacles` under **environment** and `2` under **number of
guards**. The square (centre (1, 0)) and the triangle (centre (2, 2)) are drawn as thin outlines; their centres are
invisible locators.
**Do** —
1. Press on the centre of the square, (1, 0), and drag it slowly to about (1, −2.5); watch both guards' regions while
   you drag.
2. Press on the centre of the triangle, (2, 2), and drag it slowly to about (−2, 2.5); watch the regions.
3. Press on guard 1 (the disk at (0, 0)) and drag it into the middle of the square; release.
**Record** — Do 1 and 2: the regions follow the obstacles while dragging (yes/no, smooth or jerky); Do 3: what guard 1
lights (only the square's inside? compare with `docs/original-snapshots/art-gallery-4.png`).
**Save** — File > Close, Don't Save.
**Port** — Initial settings, `movable obstacles`, `2`, the same three drags. Expected: the regions follow; a guard
inside the square lights only the square.
**Expected / what it decides** — the same in both (Q-AG-06, snapshot 4).

### M-AG-06 Invisible locators and nearest-locator picking (Q-AG-04, D-AG-04, K-AG-09)
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings (cubicle, 1 guard).
**Do** —
1. Press at (0, −1.5) — 1.5 units below the visible guard, where the hidden guard 2 sits — and drag 1 unit to the
   right; release. Then click `2` under **number of guards**: is the yellow guard 2 at (1, −1.5), where you
   released? Click `1` again.
2. Press at (2, 2) (the hidden triangle centre: halfway between the centre and the top-right corner of the gallery)
   and drag to (3, 0); release. Click `movable obstacles`: is the triangle at (3, 0)? Click `cubicle` again.
3. Click (press and release without moving) on empty space at (0.3, 0.9): does guard 1 jump to that point?
4. Click `movable obstacles`. Press on the body of the square, about 0.4 units right of its centre, and drag 1 unit
   down: does the square follow?
5. ⊕ > Initial Settings, click `3` under **number of guards**. Press at (−1.5, 0.2) — the hidden guard 4 at
   (−1.5, 0.5) is the nearest locator — and drag a little: does anything visible move?
6. ⊕ > Initial Settings (cubicle, 1 guard). Press near (2, 2) and drag a little: does anything visible move?
7. ⊕ > Initial Settings. Press about 5 px to the right of the edge of guard 1's disk and drag 50 px down slowly:
   does the guard first jump under the pointer, or move with the pointer keeping its distance? Repeat with 10, 15 and
   25 px.
**Record** — Do 1: yes/no; Do 2: yes/no; Do 3: yes/no; Do 4: yes/no; Do 5 and 6: what moved visibly (nothing / which
object); Do 7: for 5, 10, 15, 25 px: "jumps" or "keeps offset".
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: Do 1–4 yes; Do 5 and 6 nothing visible moves (the hidden locator
jumps); Do 7: keeps the offset within 12 px, jumps beyond.
**Expected / what it decides** — Do 1–4 the same in both (LocatorPane rule, D-AG-04); Do 5–6 settle K-AG-09; Do 7
gives the original's grab zone (D-AG-09).

### M-AG-07 Colours (D-AG-02, K-AG-04 resolved)
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings (cubicle); click `8` under **number of guards**.
**Do** —
1. Put the original and the port side by side at the same size.
2. Compare the eight guard disks and the tints of their regions, guard by guard (guard positions in the header of
   this file).
**Record** — "all the same", or for each guard that differs: its number, the colour in the original and in the port.
**Save** — File > Close, Don't Save.
**Port** — Initial settings, click `8`. Expected: the eight colours of `ColorData[100, "ColorList"]`, region tints at
30 % opacity.
**Expected / what it decides** — exact match (the port uses the values read in Mathematica 15.0.1).

### M-AG-08 Dragging with eight guards
**Open** — `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` (File > Open…, Enable
Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings; click `movable obstacles` and `8`.
**Do** —
1. Press on the centre of the square, (1, 0), and move it in a circle of about 1 unit radius, one turn in about
   5 seconds, for 10 seconds.
2. Watch whether all eight regions follow continuously, lag behind, or jump.
**Record** — original: smooth / lags / jumps (and roughly how many updates per second you see); the same for the port;
your computer (processor) in one line.
**Save** — File > Close, Don't Save.
**Port** — the same drag. Expected: all regions follow smoothly (the port recomputes all eight guards per frame,
about 30 ms).
**Expected / what it decides** — smooth in both; a difference in speed is recorded, not a failure.
