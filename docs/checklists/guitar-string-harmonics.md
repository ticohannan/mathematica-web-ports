# Manual checks — Guitar String Harmonics: Standing Waves (`demos/guitar-string-harmonics/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md` (create it with `npm run test-run -- guitar-string-harmonics`).
Differences are findings, not failures of the tester.

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb`.
Port (all items): `http://127.0.0.1:8080/demos/guitar-string-harmonics/` (after `npm run serve`).

The original's controls, at the left of the Manipulate panel: the popup menu **harmonic** (1st … 5th) and, below it,
**time** with three small buttons (play ▶, pause ‖, reset |◀). The time has no value field. The picture is a yellow
fretboard with six grey strings, brown frets and a black sound hole; the string at the far left is the vibrating one,
and a black dot on it marks the forced node. The text column to the right of the picture holds three equations and two
framed tables. In the port the time has two buttons: ▶ (play, shows ❚❚ while running: pause) and ⏮ (reset).

### M-GA-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title, the two caption paragraphs and the Details (three snapshot lines, the "Variables" line) with the port's.
2. Compare the text column to the right of the picture, line by line: the three headings and equations, the "forced
   nodes" table (4 rows) and the "harmonic frequencies" table (5 rows with the numbers and "Hz").
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-01: per text: "same" or the differing words; whether the frequency equation shows "ρ" or "Global`ρ" under the root.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details`, and the text column beside the picture.
**Expected / what it decides** — identical texts and numbers 82.4, 164.8, 247.2, 329.6, 412.0 (F-GA-06, F-GA-07, F-GA-10); "ρ" in the live output (D-GA-03).

### M-GA-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Read the popup **harmonic**.
2. Look at the far-left string from the bottom (bridge) to the top (nut): straight or curved; where the black dot is.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-02: the popup's value; "straight" or "curved"; where the dot is; any other difference from the port.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — popup "1st", the string straight (t = 0.27: the time factor is 0.0077), the dot on the bottom end of the string (F-GA-09).

### M-GA-03 The harmonic popup
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the Manipulate panel) > **Initial Settings** (time 0: the string at full amplitude).
**Do** —
1. Choose **2nd**, **3rd**, **4th**, **5th** and **1st** in the popup **harmonic**, one after the other.
2. For each: count the loops of the far-left string between the bottom and the top; note which fret line the black dot is on or next to.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-03: per harmonic: number of loops, the dot's fret (counted from the top), whether the first loop at the bottom bulges right or left.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (**Initial settings** at the top right of the panel).
**Expected / what it decides** — n loops for the nth harmonic, the first one bulging right; the dot on the 12th fret (2nd), just below the 7th (3rd), just above the 5th (4th), just above the 4th (5th), on the bridge (1st) (F-GA-01, F-GA-04, F-GA-05; the `/. n -> 1` rules change nothing, Q-GA-01).

### M-GA-04 The time Trigger
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**; popup **harmonic** on **1st**.
**Do** —
1. Press ▶ next to **time** and start a stopwatch; stop it when the string stops moving.
2. ⊕ > **Initial Settings**; press ▶, after about 5 seconds press ‖ (pause); then ⊕ > **Paste Snapshot** and read the
   value of `t` in the pasted code (the line `{{t, …}`); delete the pasted cell.
3. Press |◀ (reset).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-04: the run's duration in seconds; the value of t read in step 2 (all digits); what the string shows after the reset.
**Save** — File > Close, Don't Save.
**Port** — the same steps (pause = ▶ again while it shows ❚❚; reset = ⏮); read t with the browser console: `__demo.getState().t`.
**Expected / what it decides** — about 20 s for the whole run (AnimationRate 0.05); t a multiple of 0.01 settles K-GA-01 (a value with more digits means Mathematica's Trigger moves continuously); after reset the full-amplitude picture of M-GA-03 (F-GA-02).

### M-GA-05 The animation of each harmonic
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. For each harmonic 1st … 5th (popup **harmonic**): press |◀ (reset), press ▶, and watch the far-left string for 10 seconds.
2. Count how often the string swings back and forth in those 10 seconds, or describe the motion (smooth, jumpy, flickering).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-05: per harmonic: the count or the description.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same motion in both; aliased: about 9, 18, 24 (flickering), 15 and 6 swings for n = 1 … 5, not growing with n (Q-GA-03, E-GA-02).

### M-GA-06 Snapshot settings
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ > **Initial Settings** (time 0).
**Do** —
1. Choose **3rd**, then **4th**, then **5th** in the popup **harmonic**; each time compare the picture with the
   notebook's snapshot pictures 2, 3 and 4 (Details: snapshots 1–3) and with the port at the same harmonic.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-06: per harmonic: "same" or the difference (wave shape, dot, colours, line widths).
**Save** — File > Close, Don't Save.
**Port** — **Initial settings**, then the same popup choices.
**Expected / what it decides** — the same pictures (F-GA-11).

### M-GA-07 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\GuitarStringHarmonicsStandingWaves.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — choose **4th** in the popup **harmonic**; press ▶ next to **time** and wait 3 seconds.
**Do** —
1. ⊕ (top right) > **Initial Settings** while the animation runs; on the port, **Initial settings**.
2. Watch the string for 3 seconds.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_guitar-string-harmonics.md`, under the heading M-GA-07: the popup's value afterwards; whether the animation keeps running.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — popup "1st", the string at full amplitude (t = 0); the port stops the animation (A-GA-01); a running animation in Mathematica is a difference to record.

### M-GA-08 The page works on its own
**Steps** — open the port's page; choose every harmonic once; press ▶ and ⏮; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores n = 1, t = 0 (A-GA-01).

### M-GA-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the text column moves below the picture.
