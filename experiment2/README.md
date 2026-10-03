# Experiment 2: Bramble site (Part 1)

Phone web app for Part 1 of the location-privacy study. Design: `../docs/superpowers/specs/2026-10-01-experiment2-bramble-site-design.md`. Plan: `../docs/superpowers/plans/2026-10-03-experiment2-bramble-site-plan.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (needs Node 22+, and Java for the emulators) |
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm run emulators` | Start the local Auth and Firestore emulators (UI at http://localhost:4000) |
| `npm test` | Unit and component tests |
| `npm run test:rules` | Firestore security-rules tests against the emulator |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npm run build` | Production build into `dist/` |

Until the real Firebase project exists, everything runs against the `demo-bramble` emulator project. Copy `.env.example` to `.env.local` to change settings.
