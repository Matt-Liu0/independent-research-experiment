# Experiment 2: Bramble and Stride site (Part 1)

Phone web app for Part 1 of the study: two practice apps in one session, **Bramble** (grocery delivery, location data) and **Stride** (fitness and health, health and biometric data), in a balanced random order. What every stored field means: `DATA.md`. How to analyze it: `ANALYSIS.md`. Design: `../docs/superpowers/specs/2026-10-01-experiment2-bramble-site-design.md` and, for Stride, `../docs/superpowers/specs/2026-10-08-second-app-stride-design.md`. Plans: `../docs/superpowers/plans/`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (needs Node 22+, and Java for the emulators) |
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm run emulators` | Start the local Auth and Firestore emulators (UI at http://localhost:4000) |
| `npm test` | Unit, component and whole-app tests |
| `npm run test:load` | Load test: 100 participants starting at once against the emulators (`LOAD_PEOPLE`, `LOAD_WRITES` to change) |
| `npm run test:rules` | Security-rules, store and export tests against their own emulators (ports in `firebase.test.json`, so they never touch `npm run emulators` data) |
| `npm run typecheck` | TypeScript check of app, tests and scripts |
| `npm run lint` | Lint |
| `npm run build` | Production build into `dist/` |
| `npm run export` | Export data to CSV (see below) |
| `npm run build:map` | Re-download the store-finder map into `public/map/` (only needed to change the area) |

## Links

| Link | Use |
| --- | --- |
| `/?PROLIFIC_PID=…&STUDY_ID=…&SESSION_ID=…` | Real participants (Prolific fills these in) |
| `/?code=S0123` | Participants recruited directly (e.g. students), with a code you hand out; ends without Prolific |
| add `&pilot=1` | Pilot runs; data goes to `pilot_` collections |
| add `&anydevice=1` | **Local or emulator testing only:** skip the phone check on a computer. Ignored on the deployed study (real Firebase project with `VITE_USE_EMULATORS=false`). Recorded as `device.checkSkipped` |
| `/?demo=nudged`, `/?demo=neutral` or `/?demo=mixed` | Researcher preview: any device, nothing saved. `nudged`/`neutral` set every screen to that level; `mixed` gives a random 3-of-6 pattern, as participants get. Add `&first=stride` or `&first=bramble` to choose the app order (otherwise random) |
| `/?agent=1&EPISODE_ID=…&nudged=U1-U3-U5&taskOrder=4-1-2-3-5-6-7-9-8-10` | Experiment 4 agent episode, driven by the MCP harness; data read from `window.__brambleAgent` (see `DATA.md` section 8) |

To try the app locally: `npm run dev`, then open http://localhost:5173/?demo=nudged. Part 2 with a stand-in interviewer (no model, nothing saved): http://localhost:5173/part2.html?demo=1 (add `&arm=structured` or `&arm=case` to label the arm). To talk to the real interviewer locally, put `ANTHROPIC_API_KEY=<key>` in `functions/.secret.local` (git-ignored), run `npm run emulators:chat`, and open `http://localhost:5173/part2.html?code=test1&pilot=1&anydevice=1` (add `&arm=…` to choose the arm on pilot links); move the record to the chat by going through the briefing. For a run that saves to the emulator, start `npm run emulators` too and use `http://localhost:5173/?PROLIFIC_PID=test1&STUDY_ID=s&SESSION_ID=x` (the device check needs a phone, or Chrome DevTools' phone emulation).

## Testing on a real phone

`localhost` on a phone means the phone itself, so the normal commands only work on the computer (use Chrome DevTools' phone view, ⌘⇧M, and reload). To use a real phone on the same Wi-Fi:

```sh
npm run emulators:phone   # emulators reachable from the network
npm run dev:phone         # prints a "Network:" address, e.g. http://192.168.1.20:5173/
```

Open `http://<that address>/?PROLIFIC_PID=phone1&STUDY_ID=s&SESSION_ID=x` on the phone. While these run, anyone who can reach your computer's address can open the dev site and emulators, so use a home network or your phone's hotspot rather than campus Wi-Fi, and stop them when you're done. Campus Wi-Fi often blocks phone-to-laptop connections anyway.

## Store-finder map

The map is a real OpenStreetMap street map of one neighborhood (Clintonville, Columbus, Ohio), the same for every participant. Its tiles and fonts are files in `public/map/`, served from our own site, so **participants' phones never contact a map company**, and it costs nothing. Business labels, house numbers and place names are hidden, so the only stores shown are Bramble's. Participants can drag it with one finger and pinch-zoom within that neighborhood, and recenter with the button. Phones that can't run WebGL get the simpler drawn map instead (`map_shown` records which).

To change the area, edit `src/bramble/mapConfig.ts` (location, store pins, `MAP_BOUNDS`) and run `npm run build:map`. The attribution (© OpenStreetMap, required by its license) appears in the map's corner, and the details are in `public/map/ATTRIBUTION.txt`.

## Where things are

| Path | Contents |
| --- | --- |
| `src/core/` | Shared by both apps: the show / choose / settle engine (`engine.tsx`), flow types, units and patterns (`units.ts`), GKC-CI coding (`ci.ts`), `FlowChoice`, prompt sheet, loading, timing, offers and settings list |
| `src/bramble/flows.ts` | Bramble's 14 flows and the only place its friction levels differ |
| `src/bramble/screens/` | Shop, Find a store, Checkout, Orders, Deals, Rewards, Account |
| `src/stride/flows.ts` | Stride's 15 flows: 12 mirroring a Bramble flow (`counterpart`), plus 3 Stride-only gamified flows (`nudgeType`) |
| `src/stride/screens/` | Today, Workout setup, Workout, Plans, Rewards, Profile |
| `src/study/apps.ts`, `sessionApps.tsx` | Which tasks belong to which app, the app order, and how the task stage runs each app |
| `src/study/` | Prolific entry, device check, consent, assignment (pattern × app order), tasks, Firestore store |
| `src/study/consentText.ts` | **DRAFT** consent text: replace with the IRB version and bump `version` |
| `src/surveys/` | Ease rating, SUS, suspicion question, settings check, closing |
| `src/part2/` | Part 2 and the norming survey (`part2.html`, `norming.html`): briefing and chat (`Interview.tsx`), filler and debrief (`Wrapup.tsx`, wording in `sessionText.ts`, **DRAFT**), battery wording (`items.ts`), order, screens, store |
| `functions/` | The Part 2 interviewer, a Cloud Function (`interviewTurn`): arm assignment, the interview script (`interview.ts`), the interviewer's prompts and the case set T (`prompts.ts`, **DRAFT**, T empty) |
| `firestore.rules` | Security rules |
| `scripts/export.ts` | CSV export |

## Before launch

Step by step with Prolific (settings, pilot, bonuses, Part 2): `PROLIFIC.md`.

1. Create the Firebase project (Anonymous Auth on, Firestore in a US region) on the **Blaze plan** with a budget alert (the free plan's 20,000 writes a day is less than 100 participants need), then copy `.env.example` to `.env.local` and fill it in with `VITE_USE_EMULATORS=false`.
2. Put the IRB consent text in `src/study/consentText.ts`, set `isDraft: false`, and fill in the contact line.
3. Set the Prolific completion and return codes in `.env.local`.
4. Store the Anthropic API key for the interviewer as a secret (it prompts for the key; it never goes in a file): `npx firebase functions:secrets:set ANTHROPIC_API_KEY --project <project-id>`.
5. Approve the interviewer wording (`functions/src/prompts.ts`, `PROMPTS_ARE_DRAFT`), the briefing and debrief (`src/part2/sessionText.ts`), and fill in the case set T if the case arm runs.
6. `npm test && npm run test:rules && npm run test:functions && npm run build`, then `npx firebase deploy --only hosting,firestore:rules,functions --project <project-id>`.
7. Bump `version` in `package.json` for every change made during data collection and note it in `CHANGELOG.md`.

## Export

```sh
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/bramble-service-account.json   # never inside this folder
GCLOUD_PROJECT=<project-id> npm run export            # → exports/<date>/
GCLOUD_PROJECT=<project-id> npm run export -- --pilot # pilot data
```

Writes `participants.csv` (one row per person), `events.csv` (one row per event), `flows.csv` (one row per person × flow in both apps, with status, first choice, final value, default shown, decision time and toggle count) `id-map.csv` (study code → Prolific ID; keep it off shared drives) and `prolific-bonuses.txt` (lines to paste into Prolific's bulk bonus form). Withdrawn participants are left out. `exports/` is git-ignored.
