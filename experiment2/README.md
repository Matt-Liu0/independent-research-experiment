# Experiment 2: Bramble site (Part 1)

Phone web app for Part 1 of the location-privacy study. Design: `../docs/superpowers/specs/2026-10-01-experiment2-bramble-site-design.md`. Plan: `../docs/superpowers/plans/2026-10-03-experiment2-bramble-site-plan.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (needs Node 22+, and Java for the emulators) |
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm run emulators` | Start the local Auth and Firestore emulators (UI at http://localhost:4000) |
| `npm test` | Unit, component and whole-app tests |
| `npm run test:rules` | Security-rules, store and export tests against the emulators |
| `npm run typecheck` | TypeScript check of app, tests and scripts |
| `npm run lint` | Lint |
| `npm run build` | Production build into `dist/` |
| `npm run export` | Export data to CSV (see below) |

## Links

| Link | Use |
| --- | --- |
| `/?PROLIFIC_PID=…&STUDY_ID=…&SESSION_ID=…` | Real participants (Prolific fills these in) |
| add `&pilot=1` | Pilot runs; data goes to `pilot_` collections |
| `/?demo=nudged` or `/?demo=neutral` | Researcher preview: any device, chosen level, nothing saved |

To try the app locally: `npm run dev`, then open http://localhost:5173/?demo=nudged. For a run that saves to the emulator, start `npm run emulators` too and use `http://localhost:5173/?PROLIFIC_PID=test1&STUDY_ID=s&SESSION_ID=x` (the device check needs a phone, or Chrome DevTools' phone emulation).

## Where things are

| Path | Contents |
| --- | --- |
| `src/bramble/flows.ts` | The 12 flows and the only place the friction levels differ |
| `src/bramble/BrambleContext.tsx` | App state plus the show / choose / settle logging rules |
| `src/bramble/screens/` | Shop, Find a store, Checkout, Orders, Deals, Rewards, Account |
| `src/study/` | Prolific entry, device check, consent, assignment, tasks, Firestore store |
| `src/study/consentText.ts` | **DRAFT** consent text: replace with the IRB version and bump `version` |
| `src/surveys/` | Ease rating, SUS, suspicion question, settings check, closing |
| `firestore.rules` | Security rules |
| `scripts/export.ts` | CSV export |

## Before launch

1. Create the Firebase project (Anonymous Auth on, Firestore in a US region), then copy `.env.example` to `.env.local` and fill it in with `VITE_USE_EMULATORS=false`.
2. Put the IRB consent text in `src/study/consentText.ts`, set `isDraft: false`, and fill in the contact line.
3. Set the Prolific completion and return codes in `.env.local`.
4. `npm test && npm run test:rules && npm run build`, then `npx firebase deploy --only hosting,firestore:rules --project <project-id>`.
5. Bump `version` in `package.json` for every change made during data collection and note it in `CHANGELOG.md`.

## Export

```sh
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/bramble-service-account.json   # never inside this folder
GCLOUD_PROJECT=<project-id> npm run export            # → exports/<date>/
GCLOUD_PROJECT=<project-id> npm run export -- --pilot # pilot data
```

Writes `participants.csv` (one row per person), `events.csv` (one row per event), `flows.csv` (one row per person × flow, with status, first choice, final value, default shown, decision time and toggle count) and `id-map.csv` (study code → Prolific ID; keep it off shared drives). Withdrawn participants are left out. `exports/` is git-ignored.
