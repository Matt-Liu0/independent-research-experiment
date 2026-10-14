# Say–do privacy study: practice-app websites

Research software for an independent study at Colgate University, which compares what people **say** about sharing their personal data with what they **do** when an app asks. Later experiments compare both with what AI agents do on a person's behalf.

This repository holds the website for **Experiment 2 (Part 1 of the human study)**: a phone web app where participants try two practice apps, plus the design documents behind it.

## What the site does

Participants use two fictional apps in one session, in a balanced random order:

| App | What it is | Tasks | Decisions about data |
|---|---|---|---|
| **Bramble** | Grocery delivery | 6 (find a store, order, track a delivery, save deals, redeem points, change address) | 14, mostly location, plus a saved card and birthday deals |
| **Stride** | Fitness and health | 4 (connect health data, guided workout, save plans, unlock a report) | 15, health: 12 matched to Bramble, plus 3 gamified (streak, friends, status tier) |

- **Matched flows:** Stride's flows mirror Bramble's screen by screen, with the same kind of recipient, purpose and reward but a different type of information. Each matched pair differs only in the information it shares.
- **Gamified flows:** three Stride-only flows use the non-monetary nudges fitness apps use (a streak, a friend count, a status tier). They pay nothing, so the matched pairs stay clean.
- **Coding:** every flow is coded with the GKC–Contextual Integrity framework, so site behavior can be joined with the questionnaire answers from Part 2.
- **Friction:** the level of nudging varies within each participant. Three of six decision screens are "nudged" (sharing preset or highlighted) and three are neutral, following Utz et al. (2019).
- **Balance:** assignment is balanced across 40 combinations of nudged screens and app order.
- **Logging:** every prompt shown, every choice and every final setting is logged. Researchers can export the data to CSV for analysis.
- **Practice details only:** no real location, address or health data is collected.
- **Agent mode:** the same site runs for AI agents (Experiment 4) through a separate link. The agent gets the same screens and logging, and its data stays in the page.

## Repository layout

| Path | Contents |
|---|---|
| `experiment2/` | The website (React + TypeScript + Vite, Firebase Firestore and Hosting). See `experiment2/README.md` for commands and links, and `experiment2/DATA.md` for every stored field |
| `docs/superpowers/specs/` | Research methodology pipeline, site design specs, wording proposal |
| `docs/superpowers/plans/` | Implementation plans |
| `Human study protocol and participant instructions.md` | The human study protocol |
| `experiment 2 website design.pdf` | Original screen mockups |

## Quick start

```sh
cd experiment2
npm install
npm run dev          # then open http://localhost:5173/?demo=mixed
npm test             # unit and whole-app tests
npm run test:rules   # security rules and export, against local emulators (needs Java)
```

`?demo=nudged`, `?demo=neutral` or `?demo=mixed` previews the study on any device without saving anything. Add `&first=stride` to start with Stride.

## Status

- **Built and tested:** Part 1 is built and tested locally. It hasn't been deployed or piloted yet.
- **Before launch:**
  - the IRB-approved consent text
  - a Firebase project
  - Prolific completion codes

  See "Before launch" in `experiment2/README.md`.
