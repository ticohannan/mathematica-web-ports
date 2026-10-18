# Manual checks — Minkowski sum (`demos/minkowski-sum/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md` (create it with `npm run test-run -- minkowski-sum`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/minkowski-sum/` (after `npm run serve`).

Where things are in the original (snapshot 1): two control rows at the top. First row: **view** with the buttons
**static** and **move around Minkowski**. Second row (static view only): the check box **show normals**, the check box
**enable locators**, the button row **number of robot edges** (1–5) and the button row **number of obstacle edges** (1–5).
In the move view the second row is replaced by the slider **move** with its animation panel open (play, step, faster,
slower, direction buttons). The picture: the red "obstacle" pentagon upper left, the blue "robot" triangle upper right
(their black vertex dots are invisible locators you can drag), "sorted normals" lower left, the green "Minkowski sum"
lower right. The **⊕** button is at the top-right corner of the panel. In the port the same controls sit above the
picture; its **Initial settings** button (`reset`, top right) stands in for ⊕ > Initial Settings.

### M-MS-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare every paragraph (the four steps, the note on Hermann Minkowski) and
   reference [1] (LaValle).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-MS-22), including the naming of E-MS-03.

### M-MS-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: **static** selected, **show normals** unticked, **enable locators** ticked, robot edges **3**, obstacle edges
   **5**; white square with a thin edge; red pentagon "obstacle" with β₁…β₅ inside (β₂ at the bottom); blue triangle
   "robot" with α₁…α₃ outside; black centroids; "sorted normals" disk with eight arrows and labels; green "Minkowski
   sum" octagon with blue edges α₁, α₂, α₃.
2. Compare point sizes, arrowheads, label font, label placement and the light colours with the port.
3. ⊕ > Initial Settings; repeat step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-02: yes/no per point of step 1; differences of step 2 (especially label placement); same after Initial
Settings yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-MS-18, F-MS-19).

### M-MS-03 Show normals (snapshot 2)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Tick **show normals**.
2. Look at the arrows on every robot edge, every obstacle edge and every sum edge; measure one arrow's length and
   head size (px) on a screenshot.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-03: robot arrows inward yes/no, obstacle arrows outward yes/no, sum arrows outward yes/no; the two
measurements.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`check-a`).
**Expected / what it decides** — as snapshot 2 (F-MS-02).

### M-MS-04 Enable locators (Q-MS-03, K-MS-09)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (static view).
**Do** —
1. Click **enable locators** once to untick it; watch the box for 2 s without touching anything else.
2. Try to drag a robot vertex (black dot of the blue triangle).
3. Click **show normals** (another control) and look at **enable locators** again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-04: after step 1: (a) re-ticked at once, (b) stays unticked, (c) stays unticked and the vertices cannot be
dragged; step 2: could the vertex be dragged; step 3: state of the box.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`check-c`); the port re-ticks at once.
**Expected / what it decides** — settles K-MS-09; the control cannot really switch the locators off (E-MS-01).

### M-MS-05 Views
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click **move around Minkowski**; look at the second control row and the picture.
2. Click **static**; repeat both clicks three times.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-05: whether the four controls are replaced by the **move** slider; whether the obstacle is centred; whether
the controls come back in **static**.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`setter-stableOrMove-*`).
**Expected / what it decides** — F-MS-01, F-MS-06.

### M-MS-06 Animation (K-MS-05; snapshots 3 and 5)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click **move around Minkowski**; time one lap of the robot (the **move** value from 1 to its maximum) with a
   stopwatch.
2. Watch whether it loops (jumps back to 1) or reverses at the end.
3. Click **static**, then **move around Minkowski** again: does it start at 1?
4. Press the faster, slower and direction buttons of the open panel once each.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-06: the lap time (s); loop or reverse; restart at 1 yes/no; what each panel button does; whether the robot
touches the obstacle all the time and the red point is the robot's centroid.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-s`, `play-s`, `stepback-s`, `stepfwd-s`); the port's lap is 6 s (D-MS-03).
**Expected / what it decides** — settles K-MS-05 (D-MS-03, Q-MS-08).

### M-MS-07 Picking and unused locators (D-MS-04, K-MS-06, Q-MS-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (robot edges 3: locators 4 and 5 are unused).
**Do** —
1. Press and drag 1 cm just below and left of the robot's lowest vertex, near (1.71, 1.489), where unused locator 5
   sits.
2. Click **5** in **number of robot edges**: look whether a vertex appears where you dragged in step 1.
3. ⊕ > Initial Settings; press about 5, 10 and 15 screen pixels from a robot vertex (reset between presses).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-07: step 1: anything visible; step 2: vertex at the dragged place yes/no; step 3: jump yes/no at 5, 10, 15 px.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-*`, `setter-m-*`); port: step 2 yes, no jump within 12 px.
**Expected / what it decides** — settles K-MS-06 (Q-MS-02, D-MS-04).

### M-MS-08 One-vertex robot or obstacle (K-MS-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; open Window > Messages and clear it.
**Do** —
1. Click **1** in **number of robot edges** (obstacle edges 5); look at the picture.
2. Click **3** in robot edges and **1** in **number of obstacle edges**; look.
3. Robot edges **1**, obstacle edges **1**; look.
4. Robot edges **2**, obstacle edges **1**; look. Then click **move around Minkowski**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_minkowski-sum.md`, under the heading M-MS-08: per step: sum drawn yes/no (what shape), error colouring, the Messages text; step 4: does the move view
work.
**Save** — if anything other than a normal picture appears: File > Save As…
`_internal\originals\saved\minkowski-sum_M-MS-08_<YYYY-MM-DD>.nb`, then close; otherwise File > Close, Don't Save.
**Port** — the same on the page (`setter-m-*`, `setter-n-*`); the port draws no sum when its model finds no α–β pair
(D-MS-05).
**Expected / what it decides** — settles K-MS-01 with H-MS-06/07/08/24 and the E-MS-02 question.
