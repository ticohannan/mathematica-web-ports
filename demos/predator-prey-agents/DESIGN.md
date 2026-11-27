# Design document: Predator-Prey Ecosystem: A Real-Time Agent-Based Simulation

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Predator-Prey Ecosystem: A Real-Time Agent-Based Simulation", contributed by Hiroki Sayama, published 2011-03-07 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/PredatorPreyEcosystemARealTimeAgentBasedSimulation/> |
| Port files | `model.js` (one evaluation of the Manipulate body, the saved agents; pure apart from the random source it is given), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

An agent-based model of foxes and rabbits in a square habitat. Each agent makes a random step every time step. A
rabbit survives when no fox is within 0.02 and then copies itself with a probability that falls to 0 at 500 rabbits;
a fox that finds a rabbit within 0.02 is fed and copies itself likewise, one that does not goes hungry and dies after
a set number of steps. The simulation runs in real time while "run simulation" is checked; "Reset" places 100 new
agents, 10 % of them foxes. Depending on the rates, foxes or both species die out, the populations oscillate, or waves
of foxes chase clusters of rabbits (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/predator-prey-agents.txt`) and checked against its snapshots
(`docs/original-snapshots/predator-prey-agents-*.png`) and saved settings
(`tests/golden/predator-prey-agents.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-PP-01: a student explores the Demonstration in a browser, without Mathematica: which rates and mobilities give
  extinction, oscillation or travelling waves.
- UC-PP-02: Tico compares the port with the original (checklist `docs/checklists/predator-prey-agents.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PP-01 | Sliders "growth rate of rabbits" `{{rabbitGrowthRate, 0.5}, 0, 1}`, "mobility of rabbits" `{{rabbitMobility, 0.03}, 0, 0.05}`, "growth rate of foxes" `{{foxGrowthRate, 0.5}, 0, 1}`, "mobility of foxes" `{{foxMobility, 0.05}, 0, 0.05}`, ImageSize Tiny | the original's controls | v0.1.44 | e2e "has its controls with their defaults" |
| F-PP-02 | Slider "number of steps / foxes can survive / without food" `{{foxEndurance, 10}, 1, 20, 1, Appearance -> "Labeled"}` | the original's control | v0.1.44 | e2e "a slider changes its rate; the saved snapshot agents are drawn"; unit "a hungry fox gets one step hungrier and dies after foxEndurance steps without food" |
| F-PP-03 | Checkbox "run simulation" `{{moving, False}, {True, False}}`: while checked every evaluation runs `updateAgents` once and asks for the next (Refresh with UpdateInterval 0) | the original's control | v0.1.44 | e2e "run simulation moves the agents step after step until it is unchecked"; unit "while running, each evaluation moves the agents one step and returns them in the state" |
| F-PP-04 | Button "Reset" (ImageSize Medium): moving = False; ag = initialAgents[] (100 agents at random places, a fox with probability 0.1) | the original's control | v0.1.44 | e2e "Reset stops the run and places 100 new agents"; unit "initialAgents: 100 agents in the square, about 10 % foxes" |
| F-PP-05 | `updateAgents`: in the agents' order, a step RandomReal[{−m, m}, 2] clipped to the square; rabbits: eaten when the nearest fox (old places) is within 0.02, else they survive and copy themselves with probability g (1 − rabbits/500); foxes: fed when the nearest rabbit (old places) is within 0.02 (hunger 0, a copy with probability g (1 − foxes/500)), else one step hungrier, dead when the hunger reached foxEndurance | the original's model | v0.1.44 | unit "a rabbit steps, survives without a fox within 0.02 and copies itself with probability g (1 - rabbits/500)"; unit "a rabbit is eaten when a fox (at its old place) is within 0.02 of its new place; the fox then feeds"; unit "steps stay inside the square (Clip)" |
| F-PP-06 | `visualize`: the foxes (RGBColor[.9, .42, .17]) and over them the rabbits (RGBColor[.48, .11, .56]), AbsolutePointSize 10, PlotRange {{0, 1}, {0, 1}}, ImageSize {375, 375}, no frame or axes | the original's picture | v0.1.44 | e2e "loads without errors and draws the saved foxes and rabbits"; unit "the snapshots: their saved agents are drawn as they are, foxes first and rabbits over them" |
| F-PP-07 | Opening state: the notebook's live state with its saved agents (93 rabbits, 7 foxes) and the default rates, not running | the saved state | v0.1.44 | unit "the opening state is the notebook live state, with its saved agents"; e2e "has its controls with their defaults" |
| F-PP-08 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-PP-01 |
| F-PP-09 | Controls at the left of the picture (ControlPlacement -> Left) | the original's layout | v0.1.44 | inventory |
| A-PP-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-PP-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "run simulation moves the agents step after step until it is unchecked" |
| A-PP-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-PP-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-PP-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-PP-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: predator-prey-agents runs from its own folder" |
| A-PP-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-rabbitGrowthRate` | F-PP-01 |
| `plus-rabbitGrowthRate` | F-PP-01 |
| `play-rabbitGrowthRate` | F-PP-01 |
| `stepback-rabbitGrowthRate` | F-PP-01 |
| `stepfwd-rabbitGrowthRate` | F-PP-01 |
| `slider-rabbitMobility` | F-PP-01 |
| `plus-rabbitMobility` | F-PP-01 |
| `play-rabbitMobility` | F-PP-01 |
| `stepback-rabbitMobility` | F-PP-01 |
| `stepfwd-rabbitMobility` | F-PP-01 |
| `slider-foxGrowthRate` | F-PP-01 |
| `plus-foxGrowthRate` | F-PP-01 |
| `play-foxGrowthRate` | F-PP-01 |
| `stepback-foxGrowthRate` | F-PP-01 |
| `stepfwd-foxGrowthRate` | F-PP-01 |
| `slider-foxMobility` | F-PP-01 |
| `plus-foxMobility` | F-PP-01 |
| `play-foxMobility` | F-PP-01 |
| `stepback-foxMobility` | F-PP-01 |
| `stepfwd-foxMobility` | F-PP-01 |
| `slider-foxEndurance` | F-PP-02 |
| `value-foxEndurance` | F-PP-02 |
| `plus-foxEndurance` | F-PP-02 |
| `play-foxEndurance` | F-PP-02 |
| `stepback-foxEndurance` | F-PP-02 |
| `stepfwd-foxEndurance` | F-PP-02 |
| `check-moving` | F-PP-03 |
| `button-reset-agents` | F-PP-04 |
| `reset` | A-PP-01 |
| `crumbs` | A-PP-04 |
| `details` | F-PP-08 |
| `credits` | A-PP-05 |

## 6. Design

- `model.js`: `SAVED_AGENTS` (the notebook's live agents), `initialAgents(rng)`, `updateAgents(…, rng)` (the original's
  rules in order, Nearest by a linear search with the dummy point), `visualize(agents)`, `evaluate(state, ctx)` →
  `{ view, state, graphics }`; while running, the returned state carries the moved agents. Test ids: `foxes`, `rabbits`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Left, `random: true` (the page's random source; `?seed=N` for a
  repeatable run), `settle` while moving (one step per animation frame); the hidden variable `ag`.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- predator-prey-agents` → `dist/predator-prey-agents/`.
- Contents (generated with `node tools/bundle-app.mjs predator-prey-agents --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/predator-prey-agents/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 15 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/predator-prey-agents/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: predator-prey-agents runs from its own folder" (A-PP-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-PP-01 | deviation | The random steps and Reset's agents come from the browser's random generator (Mathematica's stream cannot be reproduced); with `?seed=N` in the address a run is repeatable. |
| D-PP-02 | deviation | The opening agents are the 100 saved in the notebook's live state (Mathematica draws them anew when the notebook is opened: `{{ag, initialAgents[]}}`); "Initial settings" returns to them. |
| D-PP-03 | deviation | One step per animation frame (at most about 60 per second); Mathematica's UpdateInterval -> 0 runs as fast as the front end allows. |
| Q-PP-01 | quirk kept | The populations can pass 500 for a step: the copy probabilities use the counts at the start of the step. |
| Q-PP-02 | quirk kept | Rabbits are eaten by, and foxes feed on, the other species at their places before the step (the new places of the agents earlier in the list are not used). |
| Q-PP-03 | quirk kept | The Details are the template's "Details, references or citation information" and "References for demonstration." |
| N-PP-01 | note | Checked (unit tests): each rule of updateAgents with a scripted random source (steps, clipping, eating, starving, copying); the four snapshots' saved agents are drawn as saved (7, 70, 143 and 340 foxes). |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the foxes and rabbits of the saved state, updateAgents step by step while running, the five sliders, the checkbox and Reset |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-PP-01 | A plot of the two populations over time | the oscillations can be seen | not in the original | F-PP-05 |
| I-PP-02 | A step button for one update at a time | the rules can be followed | not in the original | F-PP-03 |
| I-PP-03 | Show the number of foxes and rabbits | the reader sees extinctions | not in the original | F-PP-06 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the checks of N-PP-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| — | none found | — | — | — | — | — |
