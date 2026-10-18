# Manual checks — Four-bar linkage (`demos/four-bar-linkage/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md` (create it with `npm run test-run -- four-bar-linkage`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/four-bar-linkage/` (after `npm run serve`).

Where things are in the original (snapshot 1): two controls at the top. The slider labelled **separation (L₄)** (a small
**+** right of it opens its animation panel with a value field; the value "0.75" is printed right of the **+**), and below
it the interval slider labelled **link lengths (L₁,L₂,L₃)** with two thumbs (left thumb = L₁, right thumb = L₁ + L₂; the
pair is printed right of it, "{1.35, 2}"; values move in steps of 0.05). Below them two pictures: "configuration space"
on the left (the blue and orange curve with a cross-hair glyph on it; a press anywhere in this plot moves the invisible
locator) and "four‑bar linkage" on the right. The **⊕** button is at the top-right corner of the panel. In the port the
same controls sit above the pictures; its **Initial settings** button (`reset`, top right) stands in for ⊕ > Initial
Settings.

### M-FB-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare every paragraph: Grübler's formula, the loop equations, the colour
   sentence, the bifurcation paragraph, "Vertical lines … are spurious", reference [1] (Lynch and Park).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-FB-20), including E-FB-03 and E-FB-04.

### M-FB-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check the left picture: the closed blue/orange loop with the glyph at about (−0.89, −1.0) on the orange branch.
2. Check the right picture: crank pointing down-right, rocker down-right, coupler between their tips, brown pivots and
   ground bar, blue and red circles and angle arcs, orange circle around the crank tip, labels L₁…L₄, θ, φ.
3. Compare line widths, arrowheads of the angle arcs, label positions, fonts and the plot labels with the port.
4. ⊕ > Initial Settings; repeat steps 1–2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-02: yes/no per point of steps 1–2; differences of step 3; same after Initial Settings yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-FB-13…F-FB-19).

### M-FB-03 Snapshot settings 2–4
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Setting 2: click the **+** right of **separation (L₄)**, type `0.5`, Enter; drag the left thumb of **link lengths**
   to 1 and the right thumb to 2 (the label reads {1., 2.}). Look at the curve.
2. Setting 3: separation `1.35`; thumbs at 1.55 and 2.1.
3. Setting 4: separation `0.9`; thumbs at 1.2 and 1.7.
4. In each setting zoom 200 % (Window > Magnification) and look for thin dashed segments in the plot.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-03: setting 2: horizontal φ = π lines and vertical lines yes/no, whether the curve passes through the points
(0, π) and (±π, ±π) or has a gap there; setting 3: the curve's θ range; setting 4: crossing at (0, 0) yes/no; any
dashed segments.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-spacing`, `islider-links-lo`, `islider-links-hi`).
**Expected / what it decides** — snapshots 2–4 (F-FB-14); dashed segments settle K-FB-09; a gap at (0, π) in setting
2 is E-FB-02.

### M-FB-04 Locator (K-FB-07, K-FB-12, D-FB-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press anywhere in the configuration-space plot (e.g. at (2, 2)); watch the glyph and the linkage.
2. Drag slowly along the orange branch from bottom to top (about 5 s); count the visible jumps of the linkage.
3. Press below the θ axis label (outside the axes area) and in the linkage picture.
4. Do setting 2 of M-FB-03; press near (3.1, −3.1).
5. ⊕ > Initial Settings; press exactly on the glyph and drag it 1 cm off the curve; release.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-04: step 1: glyph jumps to the nearest curve point, linkage follows yes/no; step 2: number of jumps; step 3:
anything happens yes/no; step 4: on which side of the seam the glyph lands; step 5: does the glyph move, does the
linkage follow, where is the glyph after release.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p`).
**Expected / what it decides** — K-FB-07 (locator range and picture), K-FB-12 (dragging the glyph primitive), Q-FB-04,
Q-FB-05, D-FB-07.

### M-FB-05 Interval slider (K-FB-06, K-FB-10)
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the right thumb of **link lengths** to the left into the left thumb and further.
2. Drag the right thumb to the right end of the track.
3. Click on the track outside the thumbs; then on the bar between them, and drag it.
4. Click on the "{1.35, 2}" label right of the slider and try to type.
5. Click a thumb and press the arrow keys.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-05: step 1: is the left thumb pushed, does a gap of 0.1 remain; step 2: the label (2.49 or 2.45); step 3: what
moves; step 4: editable yes/no; step 5: what the keys do.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`islider-links-lo`, `islider-links-hi`, `value-links`).
**Expected / what it decides** — settles K-FB-06 and K-FB-10 (D-FB-05).

### M-FB-06 Too-long L<sub>3</sub> (Q-FB-01, K-FB-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (separation 0.75); open Window > Messages and clear it.
**Do** —
1. Drag the left thumb of **link lengths** to 0.05 and the right thumb to 0.15 (label {0.05, 0.15}: L₃ = 2.35).
2. Look at both pictures and the Messages window.
3. Drag the thumbs back to 1.35 and 2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-06: step 2: what the plot shows (old curve, empty axes, red text, pink error frames), where the glyph and the
linkage are, message texts; step 3: does the picture recover.
**Save** — if an error state is visible: File > Save As…
`_internal\originals\saved\four-bar-linkage_M-FB-06_<YYYY-MM-DD>.nb`, then close; otherwise File > Close, Don't Save.
**Port** — the same on the page (`islider-links-lo`, `islider-links-hi`); the port keeps the old curve (K-FB-03).
**Expected / what it decides** — no red "invalid" text because of the typo (Q-FB-01, E-FB-01); the rest settles K-FB-03
with H-FB-09/10.

### M-FB-07 Single and impossible configurations
**Open** — `_internal\originals\batch-ab\Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Type `0` in the **separation (L₄)** field (via its **+**); drag the **link lengths** thumbs to 1.25 and 2.
2. Type `0.1` for the separation; drag the thumbs to 2.3 and 2.45.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_four-bar-linkage.md`, under the heading M-FB-07: per step: the red text, its position and colour, and the linkage drawing (straight linkage in step 1;
crank and rocker vertical in step 2).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-spacing`, `islider-links-lo`, `islider-links-hi`).
**Expected / what it decides** — "only one configuration possible" and "invalid link lengths, no configuration
possible" as F-FB-16.
