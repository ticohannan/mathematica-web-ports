# Manual checks — Orbital Resonance in the Asteroid Belt (`demos/asteroid-belt-resonance/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md` (create it with `npm run test-run -- asteroid-belt-resonance`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb`.
Port (all items): `http://127.0.0.1:8080/demos/asteroid-belt-resonance/` (after `npm run serve`).

The controls of the original, in two rows above the picture: the sliders "planetary orbits" (Theta) and "time
(Gyr)" (t), each with a ⊕ and its value at the right; then the setter "show Kirkwood gaps" (none, 3:1, 5:2, 7:3, 2:1)
and the checkboxes "show Trojan asteroids" (T) and "show Hilda asteroids" (H). The asteroids are random: each opening
of the notebook draws new ones, so compare the shapes of the clusters, not single dots.

### M-OR-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-OR-07).

### M-OR-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-OR-05); the dots of the belt lie elsewhere (D-OR-01).

### M-OR-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-OR-01…F-OR-04).

### M-OR-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-OR-01).

### M-OR-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-OR-01).

### M-OR-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-OR-07 The gaps' distances
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — time 0, planetary orbits 0.
**Do** —
1. Click 3:1, then 2:1; note where the yellow circle lies against the orbit of Mars (1.524 AU) and the belt.
2. On the port, switch "errors of the original" to corrected and repeat.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-07: for each gap,
whether the circle lies inside, at the inner edge or in the middle of the belt, in the original and in the port's two
modes.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the original and the port's kept mode: 3:1 just outside Mars, inside the belt's inner
edge; corrected: 3:1 and 2:1 in the belt (E-OR-01).

### M-OR-08 Time and the Trojans
**Open** — `_internal\originals\wolfram-2026-11-27\OrbitalResonanceInTheAsteroidBelt.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move the time slider slowly from 0 to 200; watch the blue rings and the belt.
2. Check "show Trojan asteroids", then "show Hilda asteroids".
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_asteroid-belt-resonance.md`, under the heading M-OR-08: whether the
belt moves while the time changes, how wide the rings get, the colours and sizes of the Trojans and Hildas.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the rings grow to about 3 px; the belt's dots move while the time changes (Q-OR-02);
green Trojans at L4 and L5, red Hildas (F-OR-04, Q-OR-03).
