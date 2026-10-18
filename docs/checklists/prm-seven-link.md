# Manual checks — Seven-link robot (`demos/prm-seven-link/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_prm-seven-link.md` (create it with
`npm run test-run -- prm-seven-link`). Differences are findings, not failures of the tester.

Original notebook (all items except M-SL-07):
`_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/prm-seven-link/` (after `npm run serve`).

The original's controls, left of the picture: the button **restart**, the setter bar **movement** (`relative`,
`absolute`), the setter bar **goal** (`1` … `7`). Above the workspace a text line reads "n collisions, worst error =
e" (and "Congratulations! …" when a goal is solved). The workspace is the black rectangle; the robot's base is at
the top centre, (445, 846) in the original's coordinates (x 18 … 884 to the right, y 7 … 884 upwards); the brown robot
hangs down the left side; the green goal configuration is drawn with dots. The seven joints are drawn as target
glyphs: joint 1 nearest the base, joint 7 the free end at the bottom (initially (133, 167)). The joints' own locators
are invisible and sit under these glyphs (except right after a collision, Q-SL-05). The port has an extra checkbox
**mute beep**.

### M-SL-01 Texts
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 (File > Open…); click Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — nothing; scroll to the top of the notebook.
**Do** —
1. Read the title and the caption (first text paragraph: "This Demonstration challenges you to move the seven-link
   robot …").
2. Scroll to **Source & Additional Information** > **Details & Citations**: two paragraphs, then **References** [1].
3. In the port, read the title, caption and Details (click **Details** below the picture).
**Record** — for the title, caption, each Details paragraph and the reference: "same" or the exact difference.
**Save** — File > Close, Don't Save.
**Port** — see Do 3. Expected: the same texts.
**Expected / what it decides** — identical texts (F-SL-13; see also error E-SL-05 about the two dates).

### M-SL-02 Feel of a drag (Q-SL-01, D-SL-01)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — click **restart**; `relative` under **movement**.
**Do** —
1. Press on joint 7 (the lowest glyph, at the free end) and drag it slowly (about 5 s) through a quarter turn around
   joint 6, to the right; watch how far link 7 follows the pointer.
2. Click **restart**. Drag joint 7 quickly (under half a second) through the same quarter turn and hold the mouse
   still for 2 s at the end; watch whether the link catches up.
**Record** — Do 1: the link follows closely / lags behind; Do 2: how far the link got when you stopped (e.g. "a third
of the way"), and whether it kept moving toward the pointer while you held still.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: in both the link turns in small steps (0.05 rad per update); the number of steps
per second may differ.
**Expected / what it decides** — the same character in both (Q-SL-01); the speed difference is recorded (D-SL-01).

### M-SL-03 Collisions and the beep (K-SL-02, F-SL-14, A-SL-07)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation). Turn the computer's sound on.
**Prepare** — click **restart**; the text reads "0 collisions, …".
**Do** —
1. Drag joint 7 to the right into the nearest blue obstacle and KEEP pushing against it (keep the mouse button down
   and the pointer inside the obstacle) for 3 seconds; then release.
2. While pushing, watch: the robot's colour; the collision count in the text line; whether the **movement** setter is
   greyed out; listen for beeps.
**Record** — (a) does the robot turn red, and does it stay red while you push (yes/no each); (b) does the count rise by
one only, or keep climbing (the number after 3 s); (c) is **movement** disabled while red (yes/no); (d) how many beeps.
**Save** — File > Close, Don't Save.
**Port** — the same steps; then tick **mute beep** and repeat. Expected in the port: red robot, the count rises by
one, **movement** disabled, further moves into the obstacle are undone, one beep (a plain tone; Mathematica plays the
system alert sound, D-SL-02); with **mute beep**: no sound, the count still rises by one.
**Expected / what it decides** — owner, 2026-10-12: (b) the count rises once per push in the original — K-SL-02
resolved (one evaluation per update, as the port, O-SL-03); (a), (c) and (d) are still to be recorded.

### M-SL-04 Relative vs absolute (O-SL-01)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — click **restart**; click `absolute` under **movement**.
**Do** —
1. Press on joint 3 (the third glyph from the base, at about (104, 668), the leftmost bend in the upper half) and drag
   it slowly through about 30° around joint 2; watch joints 4–7.
2. Click **restart**; click `relative`; drag joint 3 the same way; watch joints 4–7.
3. (Joint 7 shows no difference in the two modes because no link follows it.)
**Record** — Do 1: links 3–7 rotate together rigidly (yes/no); Do 2: only link 3 turns and joints 4–7 shift parallel,
keeping their directions (yes/no).
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected: "absolute": the rest of the chain rotates rigidly with link 3; "relative": only
link 3's direction changes, joints 4–7 move parallel.
**Expected / what it decides** — the same difference in both (F-SL-06, O-SL-01).

### M-SL-05 Solve a goal
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — click **restart**; click `1` under **goal**.
**Do** —
1. Drag the joints one by one, from joint 1 to joint 7, onto the green goal dots (avoid the blue obstacles), until
   every joint is within about 20 units of its green dot (20 units is about the size of a glyph).
2. Move any joint once more by a tiny amount (the success text is computed from the state before the update,
   Q-SL-04).
**Record** — the text lines exactly (both lines, e.g. "3 collisions, worst error = 12.4" and "Congratulations! You
solved goal 1 in only 3 collisions!").
**Save** — if solved, keep it as golden data: File > Save As…
`_internal\originals\saved\prm-seven-link_M-SL-05_<YYYY-MM-DD>.nb`, then File > Close; otherwise File > Close, Don't
Save.
**Port** — the same steps. Expected: the "Congratulations!" line appears once all joints are within 20 units.
**Expected / what it decides** — the same in both (F-SL-09, F-SL-11).

### M-SL-06 Grabbing locators (K-SL-03, D-SL-05)
**Open** — `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb`
(File > Open…, Enable Dynamics, no evaluation).
**Prepare** — click **restart**.
**Do** —
1. (a) Press about 5 px to the right of joint 7's glyph and drag 2 cm down slowly: does joint 7 first turn toward the
   press point (a jump of up to 0.05 rad), or does it move with the pointer at its distance? Repeat with 10, 15 and
   25 px.
2. (b) Click **restart**. Press exactly midway between joint 5 and joint 6 and drag 2 cm to the right: which joint
   moves?
3. (c) Push joint 7 into an obstacle so that the robot turns red (as in M-SL-03), release, then press on the drawn
   glyph of joint 7 and drag a little: which joint moves?
**Record** — (a) for 5, 10, 15, 25 px: "turns toward the press" or "keeps offset"; (b) joint number; (c) joint number.
**Save** — File > Close, Don't Save.
**Port** — the same steps. Expected (LocatorPane rule): a press anywhere moves the nearest joint, which then turns a
little toward the press point; in the port a press within 12 px grabs without turning; ties go to the lower joint
number.
**Expected / what it decides** — records the original's grab distance (a), tie rule (b) and the after-collision case
(c) (K-SL-03, D-SL-05).

### M-SL-07 Owner state 1 status text (O-SL-02)
**Open** — `_internal\originals\saved\prm-seven-link_owner-state-1_2026-10-06.nb` (the working copy saved on
2026-10-06 after playing goal 7, 132 collisions; copy it there under this name first if it is elsewhere) with
Mathematica 15.0.1 (File > Open…); Enable Dynamics if offered; do not evaluate any cell.
**Prepare** — touch nothing.
**Do** —
1. Read the text line above the workspace.
**Record** — the text exactly.
**Save** — File > Close, Don't Save.
**Port** — the port cannot open the notebook; its value for this state comes from the golden test ("132 collisions,
worst error = 489.2").
**Expected / what it decides** — "132 collisions, worst error = 489.2", as the port computes for that state (O-SL-02).
