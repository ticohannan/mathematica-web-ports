# Manual checks — The Vibrating String (`demos/vibrating-string/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_vibrating-string.md` (create it with `npm run test-run -- vibrating-string`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb`.
Port (all items): `http://127.0.0.1:8080/demos/vibrating-string/` (after `npm run serve`), "errors of the original: kept".

### M-VS-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title and the two caption paragraphs under the Manipulate with the port's caption.
2. Open the notebook's "Details & Citations" and "References" sections and compare them with the port's **Details**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_vibrating-string.md`, under the heading M-VS-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, including "the interval 0 to π" (E-VS-01) and the two placeholders
(E-VS-02) (F-VS-15).

### M-VS-02 Opening picture and layout
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture (one orange bump from (0, 0) through the point (1/2, 1) to (1, 0)) and every control's value with
   the port's opening page: "piecewise polynomial" pressed, velocity 0.5, x interval 0, initial string and evolving
   string checked, left wave and right wave unchecked, display modes unchecked.
2. Note where the controls are: the setter bar and the two sliders above the picture, the rest at its left.
3. Open Window > Messages (Mathematica's Messages window) and note any message, especially `$RecursionLimit::reclim`
   or `$IterationLimit::itlim` (E-VS-04).
**Record** — under M-VS-02: per difference: what, where; the messages, word for word.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (it shows no messages).
**Expected / what it decides** — the same picture, values and layout (F-VS-08, F-VS-13, F-VS-14); a message settles
whether Plot evaluated F at x = 1 (E-VS-04).

### M-VS-03 Setter bar, sliders and checkboxes
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > **Initial Settings**.
**Do** —
1. Click **piecewise linear** (setter bar "initial data", top left): note the shape (a tent with its top at the point).
2. Look closely at the top of the tent at x = 1/2: is there a vertical line down to the axis?
3. Drag the **x interval** slider (third row, top) to 1, then to 2: note the x range of the plot and its tick labels.
4. Set **velocity** (second row) to 2 by dragging; nothing moves while t = 0.
5. Click **left wave** and **right wave** (left column): note the colours of the four curves (blue, orange, green, red).
6. Uncheck **initial string**: does the evolving string keep its orange colour?
**Record** — under M-VS-03: per step: what is drawn; for step 2 "line" or "no line"; for step 3 the tick labels.
**Save** — File > Close, Don't Save.
**Port** — the same steps (the port draws the line of step 2 with x interval 1: Q-VS-02).
**Expected / what it decides** — the same pictures (F-VS-01 … F-VS-03, F-VS-08, F-VS-09); step 2 settles whether
Mathematica's sampling reaches the data point (E-VS-03, D-VS-04); step 3 the ticks (D-VS-02).

### M-VS-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value and add two points by clicking in the picture.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — under M-VS-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture with one point at (1/2, 1) (A-VS-01).

### M-VS-05 Adding, deleting and dragging points (LocatorAutoCreate -> {All, {1, 10}})
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click once in the picture at about (0.25, −1), away from the point: a second point appears there; the first point does
   not move.
2. Press the mouse button at about (0.8, 0.5), hold it and move up to (0.8, 1.2), release: does the new point follow the
   mouse?
3. Alt-click (⌘-click on a Mac) on the point at (0.25, −1): it disappears.
4. Alt-click on the remaining points one by one: the last one stays.
5. Click in empty places until there are 10 points; click once more in an empty place: what happens (a new point,
   nothing, or the nearest point jumps there)?
6. Drag one point to the far left of the picture (past x = 0) and release: the point disappears.
**Record** — under M-VS-05: the number of points after each step; for steps 2 and 5 what happened.
**Save** — File > Close, Don't Save.
**Port** — the same steps (the port: step 2 the point follows; step 5 nothing happens).
**Expected / what it decides** — steps 1, 3, 4, 6 as described (F-VS-04, F-VS-05, Q-VS-01); steps 2 and 5 settle K-VS-01.

### M-VS-06 The Trigger
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click ▶ of **run** (left column) and count with a stopwatch: after how many seconds is the orange string first upside
   down (its top at −1)? After how many seconds is it back?
2. Click ❚❚ (pause): the string stops. Click the reset button (⏮): the picture returns to the opening picture.
**Record** — under M-VS-06: the two times in seconds.
**Save** — File > Close, Don't Save.
**Port** — the same steps (the port: upside down after 2 s, back after 4 s at velocity 0.5).
**Expected / what it decides** — 2 s and 4 s (1 unit of t per second: F-VS-10, N-VS-02).

### M-VS-07 Display modes
**Open** — `_internal\originals\wolfram-2026-11-17\TheVibratingString.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers
**Enable Dynamics**, click it; do not evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Check **display modes** (left column): three framed plots "First mode", "Second mode", "Third mode" appear under it.
2. Measure the width of one mode plot and note its tick labels.
3. Click ▶ of **run**: the three modes oscillate at different speeds (the third three times as fast as the first).
**Record** — under M-VS-07: the width in pixels, the tick labels, "same" or the difference for step 3.
**Save** — File > Close, Don't Save.
**Port** — the same steps.
**Expected / what it decides** — the same plots (F-VS-12); the size and ticks settle K-VS-02.

### M-VS-08 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-VS-01).

### M-VS-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
