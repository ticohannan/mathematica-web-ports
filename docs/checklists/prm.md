# Manual checks — Probabilistic roadmap (`demos/prm/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_prm.md` (create it with `npm run test-run -- prm`). Differences are
findings, not failures of the tester. The obstacles and samples are random in both (D-PR-03), so compare behaviour,
not the exact pictures; `?seed=1` at the end of the port's address makes the port's runs repeatable.

Original notebook (all items): `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/prm/` (after `npm run serve`).

The original's controls, left of the picture: the button **add 50 vertices**, the slider **radius** (0 … 1, with +
button and value field), the slider **progress** (with + button and value field; greyed out without a path), the
checkbox **show obstacles**, the button **restart**. The picture is the square 0 … 2π (about 6.28) in both
directions with axes and tick labels 0 … 6; the label above it reads "no path possible" or "path length = x". Two
locators drawn as target icons (green, red inside an obstacle): the start at (1, 1) and the goal at (5, 5). Pink
polygons (only with **show obstacles**) are the obstacles, green points free samples, red points samples in
collision, blue lines the roadmap.

If the original shows "toroidLine is not a graphics primitive or directive" (O-PR-01), close it without saving, open
the pristine download again; if the message stays, run Evaluation > Evaluate Initialization Cells (the one evaluation
these items allow) and then move any control.

### M-PR-01 Texts
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` with Mathematica
15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title and the caption (first text paragraph: "This Demonstration uses the probabilistic roadmap method
   …").
2. Scroll to **Source & Additional Information** > **Details & Citations**: the paragraphs including the three parts
   (1)–(3), then **References** [1].
3. In the port, read the title, caption and Details (click **Details** below the picture).
**Record** — for the title, caption, each Details paragraph and the reference: "same" or the exact difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts.
**Expected / what it decides** — identical texts (F-PR-17; see errors E-PR-01, E-PR-03 for what the text claims).

### M-PR-02 Sampling, colours and the roadmap
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation).
**Prepare** — click **restart**; tick **show obstacles**; leave **radius** at its value.
**Do** —
1. Click **add 50 vertices** four times, waiting after each click until the points appear (up to 30 s).
2. Look at: where the red points are (only inside the pink polygons?), where the dark-green points are, the blue
   roadmap edges, light-blue edge pieces at the borders where an edge wraps round to the opposite side.
3. Look for a pink polygon that sticks out over a border of the square: is the part outside drawn, and are there
   red points on the OPPOSITE side where it would wrap?
**Record** — Do 2: red only inside polygons (yes/no), wrapping edges drawn light blue (yes/no); Do 3: the outside part
drawn (yes/no), red points on the opposite side (yes/no).
**Save** — File > Close, Don't Save.
**Port** — **restart** (or `?seed=1`), tick **show obstacles**, the same steps. Expected: red points only inside the
pink polygons, dark green elsewhere; blue roadmap edges, light-blue edge pieces where an edge wraps; parts of polygons
outside the square are drawn but block nothing (Q-PR-02).
**Expected / what it decides** — the same in both (Q-PR-02, error E-PR-03).

### M-PR-03 Radius change rebuilds the roadmap (K-PR-03)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation).
**Prepare** — click **restart**; click **add 50 vertices** six times (about 300 samples), waiting after each.
**Do** —
1. Type `0.87` into the **radius** value field (click the + right of the slider to open it if it is not shown), press
   Enter and wait until the roadmap is redrawn (up to 30 s).
2. Type `0.14` into the same field, Enter, wait.
3. Drag the **radius** slider to about 0.87 with the mouse, wait; then to about 0.14, wait.
**Record** — after Do 2 and after Do 3: are all edges short (none longer than 0.14, i.e. about one sixth of a tick
interval) or are the long edges kept; does "$Aborted" appear (yes/no); anything else unusual (the front end and the
kernel out of step, a long wait).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected from the code: the roadmap is rebuilt and all edges become short (≤ 0.14).
**Expected / what it decides** — K-PR-03: the code can only keep the long edges with rold = 0.14 if rold changed while
edgesNN did not (an interruption between the two assignments, front end and kernel out of sync, or an edited
notebook); note anything that points to one of these.

### M-PR-04 Locators across the edges (Q-PR-06)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation).
**Prepare** — ⊕ (top right of the panel) > Initial Settings.
**Do** —
1. Press on the start icon at (1, 1) and drag it slowly to the left, past the left edge (x = 0), and keep the mouse
   outside the square, moving it up and down a little, for 3 s; then release.
**Record** — where the icon is while the mouse is outside (at the right edge x = 2π? continuing from the right as a
shifted copy?), and where it is after release.
**Save** — File > Close, Don't Save.
**Port** — the same step. Expected in both: it jumps to the right edge (x = 2π) and stays there while the mouse is
outside; it does not continue from the right as a shifted copy.
**Expected / what it decides** — the same in both (Q-PR-06).

### M-PR-05 Path and progress
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation; see the note on "toroidLine" above).
**Prepare** — click **restart**; click **add 50 vertices** four times (about 200 samples); type `0.7` into the
**radius** value field (Enter) and wait. If the label still reads "no path possible", try `0.8`, then click **add 50
vertices** once more (K-PR-06).
**Do** —
1. With a path: look at the magenta connectors (start and goal to the roadmap), the green path and the label.
2. Drag **progress** from left to right: watch the purple point travel from the start to the goal.
3. Type `0.2` into the **radius** field (Enter) so that no path exists: look at the label and whether **progress** is
   greyed out.
**Record** — Do 1: the label exactly; Do 2: the purple point moves from start to goal (yes/no); Do 3: the label
exactly, **progress** disabled (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps (`?seed=1` for a repeatable run). Expected: magenta connectors, green path, "path length =
x"; progress enabled and moving the purple point; without a path the slider is disabled and the label reads "no path
possible".
**Expected / what it decides** — the path display of the original compared for the first time (K-PR-06, O-PR-01).

### M-PR-06 Start inside an obstacle
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation).
**Prepare** — click **restart**; tick **show obstacles**; click **add 50 vertices** four times; type `0.7` into the
**radius** field.
**Do** —
1. Drag the goal icon far away from all polygons. Drag the start icon into the middle of a pink polygon.
2. Look at the start icon's colour, the magenta connector from the start, the label.
3. Drag the goal icon to within 0.1 of the start icon (about the icon's own radius; zoom with the Windows Magnifier
   if needed).
**Record** — Do 2: icon colour, connector from the start (yes/no), the label; Do 3: a direct magenta path (yes/no) and
the label.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: red start icon, no connector, "no path possible"; within 0.1 a direct magenta path
and "path length = …" although the start is inside the polygon (Q-PR-10).
**Expected / what it decides** — the same in both (Q-PR-10, error E-PR-05).

### M-PR-07 Pressing near and away from the locators (F-PR-06, K-PR-05, D-PR-07)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` (File > Open…,
Enable Dynamics, no evaluation).
**Prepare** — ⊕ > Initial Settings before each step.
**Do** —
1. (a) Press at (3, 1) — away from both icons, nearer the start — and drag 1 unit up: does the start icon jump there
   and follow?
2. (b) Press exactly on the goal icon at (5, 5) and drag 1 unit to the left: does the goal configuration move (the
   magenta connector and label update), or only the icon?
3. (c) Press about 10 px, then 20 px, beside the start icon and drag 1 unit up: does it jump under the pointer first,
   or keep its distance?
**Record** — (a) yes/no; (b) configuration moves / only the icon moves; (c) for 10 and 20 px: "jumps" or "keeps
offset".
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected in the port: (a) the nearer locator jumps there and follows; (b) the locator
moves, no jump; (c) no jump within 12 px, a jump beyond.
**Expected / what it decides** — settles the open part of K-PR-05 (inner `Locator[...]` primitives) and the grab
distance of D-PR-07.
