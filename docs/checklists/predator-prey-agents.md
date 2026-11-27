# Manual checks — Predator-Prey Ecosystem: A Real-Time Agent-Based Simulation (`demos/predator-prey-agents/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md` (create it with `npm run test-run -- predator-prey-agents`).

Original notebook (all items): `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb`.
Port (all items): `http://127.0.0.1:8080/demos/predator-prey-agents/` (after `npm run serve`).

The controls of the original, at the left of the picture: four small sliders for the growth rates and mobilities,
the slider "number of steps foxes can survive without food" with its value, the checkbox "run simulation" and the
button "Reset". The simulation is random: two runs never look the same, so compare behaviours (extinction,
oscillation, waves), not single agents.

### M-PP-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md`, under the heading M-PP-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-PP-08).

### M-PP-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md`, under the heading M-PP-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values (F-PP-06, F-PP-07).

### M-PP-03 Each control
**Open** — `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md`, under the heading M-PP-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-PP-01…F-PP-04).

### M-PP-04 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md`, under the heading M-PP-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-PP-01).

### M-PP-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the opening picture (A-PP-01).

### M-PP-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-PP-07 Behaviours
**Open** — `_internal\originals\wolfram-2026-11-27\PredatorPreyEcosystemARealTimeAgentBasedSimulation.nb` with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — Reset in both.
**Do** —
1. Check "run simulation" and watch for about a minute; note what happens to the foxes and the rabbits.
2. Set the rates and mobilities of snapshot 2 (rabbits 0.785 and 0.0106, foxes 0.72 and 0.0242), Reset, run again.
3. Note how fast the steps come in each.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_predator-prey-agents.md`, under the heading M-PP-07: the behaviour seen
in each run, the speed.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same kinds of behaviour (F-PP-05); the port's speed may differ (D-PP-03).
