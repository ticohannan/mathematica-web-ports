# Manual checks — Car paths (`demos/car-paths/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_car-paths.md` (create it with `npm run test-run -- car-paths`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/car-paths/` (after `npm run serve`).

The original's controls, top of the Manipulate panel: the slider **progress** (0 … 1, with its own + button and a
value field at the right end), the slider **r<sub>min</sub>** (shown as "rmin", 0.001 … 10, + button, value 3), the
setter bar **type** (`Reeds–Shepp`, `Dubins`) and the button **swap start and goal**. The label above the picture
reads "path length: … distance: …". The picture spans x −15 … 15 and y −10 … 10 (no axes; the centre is (0, 0), one
unit is 1/30 of the width). Four invisible locators: the start position (rear-axle centre of the green start car,
marked by a black target glyph, initially (−10, −5)), the start orientation (the green circular glyph 2 units from
the start car, initially (−10, −7), below it), the goal position (black target glyph on the red goal car, (8, 5)) and
the goal orientation (red circular glyph, (10, 4)). A blue car drives along the orange path.

### M-CP-01 Texts
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
with Mathematica 15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title and the caption (first text paragraph: "This Demonstration shows the shortest paths for a car …").
2. Scroll to **Source & Additional Information** > **Details & Citations**: the paragraphs from "This Demonstration is
   based on a simplified mathematical model …" to "This Reeds–Shepp implementation is based on the Python code[5]."
   (including the three equations dx, dy, dθ), then **References** [1]–[5].
3. In the port, read the title, caption and Details (click **Details** below the picture).
**Record** — for the title, caption, each Details paragraph, the equations and each reference: "same" or the exact
difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts and five references.
**Expected / what it decides** — identical texts (F-CP-18; see also E-CP-04 about the dθ equation).

### M-CP-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — look at the panel as opened; then ⊕ (top right of the panel) > Initial Settings and look again.
**Do** —
1. Read the label above the picture.
2. Compare the picture with `docs/original-snapshots/car-paths-1.png`: the orange path (first a backward right arc
   from the start car, then a left arc, a straight piece and a right arc into the goal car), the three grey
   construction circles with their centre dots, the green start car at (−10, −5) facing down with the blue car on
   top of it (its front tyres turned), the red goal car at (8, 5).
3. Compare the car size, the yellow headlight cones, the tyres, the black target glyphs on the rear axles, the green
   orientation glyph below the start car and the red one beside the goal car.
**Record** — the label text exactly; the path pieces in order (e.g. "R− L+ S+ R+"); number of grey circles; any
difference in cars, cones, tyres or glyphs between original and port (with screenshots).
**Save** — File > Close, Don't Save.
**Port** — the page as opened, then **Initial settings**. Expected: "path length: 24.08   distance: 20.62", path
R− L+ S+ R+ with three construction circles, cars and glyphs as in snapshot 1.
**Expected / what it decides** — the same picture and label in both (F-CP-13 to F-CP-17).

### M-CP-03 Driving along the path
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Drag the **progress** slider slowly from the left end to the right end (about 10 s); watch the blue car.
2. Type `0.25` into the progress value field (Enter), look at where the blue car is; repeat with `0.5` and `0.75`.
3. Click the + right of the progress slider, then ▶ in the panel that opens; watch for 10 s; click pause.
**Record** — Do 1: does the blue car follow the orange path, reverse on the first arc, show turned front tyres on arcs
and straight tyres on the straight piece, and end on the goal car (yes/no each); Do 2: for 0.25, 0.5, 0.75 where the
blue car is (which path piece, and a screenshot); Do 3: does the animation run (yes/no).
**Save** — File > Close, Don't Save.
**Port** — Initial settings, the same three steps (the progress ⊕ opens the same kind of panel). Expected: as in the
original; the same position at 0.25, 0.5, 0.75.
**Expected / what it decides** — the same in both (F-CP-01, F-CP-10); a different position at a given progress is a
finding.

### M-CP-04 Locators
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Press on the black target glyph on the green start car's rear axle, (−10, −5), and drag it slowly to about
   (−5, 0); release. Watch the car's heading and the green glyph.
2. Press on the green orientation glyph and drag it once slowly around the start car (a circle of about 3 units);
   release.
3. Drag the start car's black glyph far to the top-right, beyond the picture's corner, and hold the mouse there.
4. Repeat 1–3 for the red goal car (its black glyph at (8, 5), its red glyph at (10, 4)).
**Record** — Do 1: heading unchanged (yes/no), green glyph follows 2 units away (yes/no); Do 2: car turns with the
glyph (yes/no), glyph stays 2 units from the car (yes/no); Do 3: where the car stops (x, y read off the picture) while
the pointer goes on; Do 4: the same answers for the goal car.
**Save** — File > Close, Don't Save.
**Port** — Initial settings and the same drags. Expected: heading kept, glyph 2 units away; turning by the glyph; the
car stops at x = 13 / y = 8 while the pointer goes on (Q-CP-02).
**Expected / what it decides** — the same in both (F-CP-05, F-CP-06, Q-CP-02).

### M-CP-05 Dubins and swap
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. Click `Dubins` under **type**. Read the label; look whether the path drives forward only (move **progress** to see
   the blue car).
2. Click `Reeds–Shepp`. Click **swap start and goal**; read the label. Click **swap start and goal** again.
3. Click `Dubins`; click **swap start and goal**; read the label; click it again.
4. With `Dubins`: drag the green orientation glyph to straight above the start car (start heading up) and the red
   orientation glyph to the upper left of the goal car (goal heading up-left), as in
   `docs/original-snapshots/car-paths-2.png`; read the label.
**Record** — the label after each of Do 1, 2, 3, 4 (both numbers); Do 1: forward only (yes/no) and Dubins ≥
Reeds–Shepp (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: Dubins forward only and never shorter than Reeds–Shepp; after a swap the
Reeds–Shepp length stays 24.08, the Dubins length usually changes; Do 4 gives "path length: 26.47   distance: 20.62"
when the headings match snapshot 2.
**Expected / what it decides** — the same in both (F-CP-03, F-CP-04, F-CP-08).

### M-CP-06 Arc direction and ties (K-CP-01, K-CP-02)
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation for Do 1–2).
**Prepare** — ⊕ > Initial Settings; `Reeds–Shepp`.
**Do** —
1. Drag the goal car's black glyph ahead and to the right of the start car (the start car faces down, so "ahead and
   right" is below and to the left of it on the screen, e.g. the goal at about (−13, −8)), then turn the goal with its
   red glyph until the path is a single forward right arc (one orange arc, one grey circle).
2. Look whether the arc is drawn short (the arc between the two cars) or long (the rest of the circle).
3. The tie case needs exact poses, which the mouse cannot set; it is done by evaluation in a working copy
   ([MATHEMATICA_CHECKS.md](../MATHEMATICA_CHECKS.md) §9): File > Save As…
   `_internal\originals\saved\car-paths_M-CP-06_<YYYY-MM-DD>.nb`; Evaluation > Evaluate Initialization Cells; below
   the last cell type exactly
   `First[getOptimalPath[{10.567, 3.978, 2.365506}, {2.433, 6.701, -0.211651}, 10]] // InputForm` and press
   Shift+Enter.
**Record** — Do 2: short or long; Do 3: the output (copy as plain text: a list of three elements {parameter, steering,
gear}).
**Save** — Do 1–2 only: File > Close, Don't Save. With Do 3: File > Save (the working copy), File > Close.
**Port** — Do 1–2 in the port. Expected: the short arc. For Do 3 the port's answer is printed by the unit test
fixture of K-CP-02 (five equally short paths; the port and the Python library pick different words).
**Expected / what it decides** — Do 2 the same in both (K-CP-01, resolved by snapshot 4); Do 3 settles which of the
tied paths the original picks (K-CP-02).

### M-CP-07 Degenerate cases (Q-CP-04)
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation for Do 1–2).
**Prepare** — ⊕ > Initial Settings; `Reeds–Shepp`.
**Do** —
1. Turn the start car to face right (drag the green glyph to the right of the start car, level with it). Drag the
   goal car's black glyph to the right of the start car, level with it (e.g. (0, −5)), and turn the goal car to face
   right too (red glyph level with it, on its right). Look at the path and the grey circles.
2. Drag the goal car's black glyph as exactly as you can onto the start car's black glyph and the red glyph onto the
   green glyph; read the label.
3. Exact case (optional, evaluation in a working copy as in M-CP-06 Do 3, file
   `_internal\originals\saved\car-paths_M-CP-07_<YYYY-MM-DD>.nb`): evaluate
   `First[getOptimalPath[{1, 2, 0.5}, {1, 2, 0.5}, 3]] // InputForm`.
**Record** — Do 1: straight path yes/no, number of extra grey circles; Do 2: the label; Do 3: the output.
**Save** — File > Close, Don't Save (with Do 3: File > Save of the working copy, File > Close).
**Port** — Do 1 and 2 in the port. Expected: a straight path with two extra grey circles (zero-length arcs); Do 2:
the length tends to "path length: 0." for an exact overlap.
**Expected / what it decides** — the same in both (Q-CP-04, error E-CP-02); Do 3 gives the original's zero-length
path (expected three elements with parameter 0.).

### M-CP-08 Picking a locator (D-CP-06, K-CP-10)
**Open** — `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings.
**Do** —
1. (a) Press on the body of the green start car, about 1 unit from its black glyph (not on the glyph), and drag 3 units
   to the right: does the car follow? Then start the progress animation (+ right of **progress**, ▶) and repeat the
   drag while it runs; stop the animation.
2. (b) Press on empty space far from all four locators, e.g. at (0, 8) near the top centre, and release: does the
   nearest locator (the goal car, (8, 5)) jump to the press point?
3. (c) ⊕ > Initial Settings. Press about 5 screen pixels to the right of the start car's black glyph and drag 50 px
   down: does the car jump under the pointer first, or keep its distance? Repeat with 10 and 15 px.
4. (d) ⊕ > Initial Settings. Drag the goal car's black glyph exactly onto the start car's green orientation glyph
   (−10, −7), release, then press on that spot and drag 3 units to the right: which one moves?
**Record** — (a) yes/no, also while animating yes/no; (b) yes/no and which locator moved; (c) for 5, 10, 15 px:
"jumps" or "keeps offset"; (d) which one moved (goal car or start orientation).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: (a) yes, also while animating; (b) the nearest locator jumps;
(c) keeps the offset within 12 px; (d) the nearer one, on an exact tie the start car's.
**Expected / what it decides** — (a) and (b) the same in both (O-CP-01, LocatorPane rule); (c) and (d) record the
original's grab distance and tie rule (D-CP-06, K-CP-10).
