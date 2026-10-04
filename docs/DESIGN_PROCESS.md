# Design process: features are specified before they are built

This repository holds browser ports of three Wolfram Demonstrations. Each app has a **design
document** that lists every feature the app implements, why it exists, since which version, and how
it is verified:

| App | Design document | Code |
|-----|-----------------|------|
| Motion Planning for Robot Path around Obstacles | [`demos/motion-planning/DESIGN.md`](../demos/motion-planning/DESIGN.md) | `demos/motion-planning/` |
| Three Parametrizations of Rotations | [`demos/three-parametrizations/DESIGN.md`](../demos/three-parametrizations/DESIGN.md) | `demos/three-parametrizations/` |
| Euler Angles: Precession, Nutation, and Spin | [`demos/euler-angles/DESIGN.md`](../demos/euler-angles/DESIGN.md) | `demos/euler-angles/` |

The originals came without design documents. Version 0.1.6 added best-effort design documents
reconstructed from the original notebooks (their code, captions and details text) and from the
port as built. From 0.1.6 on, the design document is the specification: **the code implements the
design document, not the other way round.**

## Rules

1. **No feature without a design entry.** A new or changed user-visible behaviour (a control, a
   view, an output, a computation, a keyboard or mouse interaction, a URL parameter, text on the page)
   is first written into the app's design document under *Proposed changes*, with a requested-by,
   a reason and acceptance criteria. Code is written only after the owner has marked it *approved*.
2. **Every feature has an ID and a reason.** `F-xx-nn` = feature of the original Demonstration;
   `A-xx-nn` = addition made by the port. The *Why* column says what the feature is for. IDs are
   never reused; a removed feature keeps its row with status *removed in vX*.
3. **Every feature is verified.** The *Verified by* column names automated tests (`unit "…"`,
   `golden "…"`, `e2e "…"` — the quoted text is part of a test title), manual checklist items
   (`M-xx-nn` in [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md)), `inventory` (the UI
   inventory test) or `compare` (the automated comparison with the original, `npm run compare:original`).
4. **Deviations and quirks are recorded.** Where the port behaves differently from the original it
   gets a `D-xx-nn` entry; where it deliberately keeps an oddity of the original it gets a `Q-xx-nn`
   entry; known open problems get `K-xx-nn` entries. Fixing a deviation or a known issue is a change
   like any other: proposed, approved, then built.
5. **Improvements are collected, not built.** Section 10 of each design document, *Improvements to
   consider*, lists ideas that would make an app better than the original (`I-xx-nn`: improvement,
   benefit, cost/risk, related entries). The delivered code reproduces the original's behaviour, so
   nothing in section 10 is implemented; an idea is built only after it has become an approved
   proposal (rule 1), which then names its I- ID.
6. **Design documents are tied to code versions.** Each design document states the code version it
   describes (`Code version:`), which must equal `version` in `package.json`; every feature row says
   since which version it exists; the revision history lists what changed in each version.

## Lifecycle of a feature request

| Status | Meaning | Who |
|--------|---------|-----|
| proposed | entry written in *Proposed changes* (P-xx-nn): request, reason, acceptance criteria | anyone |
| approved | owner agrees; may get a target version | owner |
| implemented | code + tests done; the entry moves to the feature table with its new F-/A- ID and *Since* version | developer |
| rejected / withdrawn | stays in the table with the reason; a worthwhile idea moves to section 10 | owner |

## What the tests enforce

- `tests/unit/design-docs.test.js` (runs with `npm test`):
  each design document names the current code version; IDs are unique; every feature row has a
  reason, a *Since* version and at least one verification reference, and every referenced test title
  and checklist item exists; every UI-inventory row points to a feature of the document; every
  improvement in section 10 has a unique I- ID, a benefit and a cost/risk.
- `tests/e2e/site.spec.js`, test "every control on … is specified in its design document":
  every interactive element on each app page (buttons, inputs, links, locators, …) must match a row
  of the UI inventory in that app's design document, and every inventory row must match something on
  the page. A control added without a design entry, or removed without updating the document, fails
  the browser tests, so `npm run publish:tested` refuses to publish it.

Behaviour that is not a visible control (a change in a computation, for example) cannot be detected
mechanically; for that, rule 1 relies on review, the golden tests and the comparison with the original.

## Releasing a version

1. Raise `version` in `package.json`.
2. In every design document: set `Code version:` to the new version and add a revision-history row
   (even if only "no feature changes").
3. `npm run publish:tested` (unit + Firefox + Chromium browser tests, then tag and push).
