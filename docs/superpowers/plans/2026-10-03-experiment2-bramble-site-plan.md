# Experiment 2: Bramble site implementation plan

Oct 3, 2026 · Implements `docs/superpowers/specs/2026-10-01-experiment2-bramble-site-design.md`

This plan has 13 phases, done in order. Each phase ends with passing tests and one commit. Code lives in `experiment2/`.

Environment: Node 22, npm 10, Java 25 (needed by the Firestore emulator), git 2.15. The Firebase CLI is installed as a dev dependency (`npx firebase`), not globally.

## Inputs needed from the research team

| Input | Needed by | Placeholder until then |
| --- | --- | --- |
| Firebase project (Anonymous Auth on, Firestore in a US region) | Phase 12 | Emulator only |
| IRB consent text and version | Phase 12 | `consent/v0-draft.md` marked DRAFT |
| Prolific completion code and return code | Phase 12 | `TEST-COMPLETE`, `TEST-RETURN` |
| Researcher name and email for the consent page | Phase 12 | `[researcher]` |

All four go in `src/study/config.ts` or `.env`, so filling them in later needs no code changes.

## Phase 0: Project setup

- Scaffold Vite + React + TypeScript in `experiment2/`.
- Install:
  - `firebase` (runtime)
  - dev: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `firebase-tools`, `@firebase/rules-unit-testing`, `tsx`, `firebase-admin`
- Add `firebase.json` with Hosting serving `dist/` and the Auth and Firestore emulators, plus `.firebaserc` with a `demo-bramble` project ID so the emulator needs no real project.
- Set `appVersion` at build time from `package.json` through Vite `define`.
- Add `npm test` (Vitest), `npm run test:rules` (emulator + rules tests) and `npm run emulators`.
- Add a `.gitignore` covering `node_modules`, `dist`, `.env`, `exports/` and the emulator debug logs.
- Add base styles: CSS tokens for the mockup colors (green `#2f6b4f`, berry `#93304c`, cream background), a serif display font (Fraunces) and a sans body font (Figtree) from Google Fonts. Max width 480px.
- **Done when:** `npm run dev` serves a blank page and `npm test` runs one smoke test.

## Phase 1: Types and flow config

- Files: `src/bramble/types.ts`, `src/bramble/flows.ts`.
- Define `FlowDef`, `LevelDef`, `Friction`, `FlowStatus` (`chosen` / `not_shown` / `not_applicable`) and the 12 flows exactly as in the spec table.
- Add `isApplicable(flowId, flows)` for the dependent flows.
- Tests (`flows.test.ts`):
  - There are exactly 12 unique IDs.
  - Every `default` and `emphasis` is one of that flow's options or null.
  - Every `required: true` has `default: null`.
  - `dependsOn` refers to an existing flow.
  - In `neutral`, no flow has an emphasis.
  - In `neutral`, the only default allowed is `checkout_partner_offers: unchecked`.
- **Done when:** the tests pass.

## Phase 2: Logging layer

- Files: `src/log/logEvent.ts`, `src/log/writer.ts`, `src/log/memoryWriter.ts`.
- `logEvent(type, fields)` adds `clientT` (from `performance.now()` since session start) and `taskId` and `screen` from the current context, then hands the event to the writer.
- The Firestore writer adds the event to `participants/{uid}/events` with `t: serverTimestamp()`. A memory writer is used in tests.
- Expose `flushWrites()` (wraps `waitForPendingWrites()`), which the closing screen uses.
- Log `visibilitychange` events, and track how long the page was hidden since each prompt so that `msSincePrompt` can leave it out.
- Turn on Firestore persistent local cache.
- Tests: logged fields are complete; time hidden is subtracted from `msSincePrompt`.

## Phase 3: Study shell and stages

- Files: `src/study/StudyApp.tsx`, `stages.ts`, `prolific.ts`, `participant.ts`, `ErrorBoundary.tsx`.
- Stage machine: `device → consent → welcome → tasks → sus → suspicion → settings → done`. Save `stage` on each transition and log a `stage` event.
- `prolific.ts`: parse the URL parameters and handle `?pilot=1`, which switches all collection names to their `pilot_` versions.
- Missing parameters show the "Please open this study from Prolific" screen.
- `participant.ts`:
  - Sign in anonymously.
  - Create `pids/{pid}`, and show the "another browser" screen if it already exists for a different user.
  - Create or load `participants/{uid}`.
  - On load, resume: increment `resumeCount` and log `resume`.
- Error boundary: log an `error` event and show "Something went wrong. Tap to continue". If recovery isn't possible, show the return code.
- Tests: each stage leads to the next; the missing-parameters screen; reload resumes at the saved stage (with a mocked store).

## Phase 4: Device check, consent, randomization, welcome

- `DeviceCheck`: touch support, portrait orientation and width ≤ 500px pass. A computer gets a QR code (`qrcode` package) for the current URL; landscape gets a rotate overlay. Record `device.*`, `tzOffset` and `localStartHour`.
- `Consent`: render the markdown file and record `consentVersion` and `consentAt`.
- `assign.ts`: a transaction on `meta/assignment` that picks the smaller group (random on a tie), increments it, and writes `friction` and `taskOrder` to the participant. The shuffle uses `crypto.getRandomValues`, with 2→3 kept together and 6 last.
- `Welcome`: the protocol's welcome text and the name field (`localStorage` only).
- Tests:
  - The shuffle keeps its rules over 10,000 runs.
  - Assignment against the emulator stays balanced over 200 simulated participants.
  - The name is never written to Firestore.

## Phase 5: Bramble app state

- Files: `src/bramble/state.ts` (reducer plus context), `src/bramble/persist.ts`.
- State: `flows`, `points` (starting at 420), `storeId`, cart, order status (`none → placed → on_the_way → delivered`), address, `savedDeals`, `deliveryRedeemed`, Account page visits and time spent there.
- Actions: `decide(flowId, value, source)`, `setStore`, `placeOrder`, `advanceOrder`, `saveDeal`, `redeem`, `saveAddress`.
- `decide` also marks dependent flows as `not_applicable`, and as applicable again if an Account page change re-enables them.
- `persist.ts`: write `appState` with a debounce of about 300ms after changes, and immediately after any decision.
- Tests:
  - Applying `dont_allow` to #1 marks #2 as not applicable.
  - Points arithmetic.
  - Redeeming twice is blocked.
  - The address match ignores case and spacing.

## Phase 6: FlowChoice component

- Files: `src/bramble/FlowChoice.tsx`, `controls/Switch.tsx`, `Checkbox.tsx`, `ChoiceButtons.tsx`, `Sheet.tsx`.
- Reads the participant's level and the flow definition, and draws the matching control:
  - The `emphasis` option is drawn as the filled button, with the others as text links.
  - `required` reports "not ready" to the parent screen until a choice is made.
  - `Sheet` has no handle, no backdrop dismissal and no Escape to close.
- An IntersectionObserver logs `prompt_shown` the first time the choice is visible and starts its timer.
- Each choice logs `decision` (with `value`, `defaultShown`, `source`, `msSincePrompt` and `pointsBefore`) and calls `decide`.
- Switch toggles are logged as `decision` events, so `toggleCount` can be computed at export.
- Tests:
  - Each control type in both levels.
  - Required buttons block until chosen.
  - `prompt_shown` is logged only once.
  - Default values are logged as `defaultShown`.

## Phase 7: Screens

Each screen follows its mockup page and the spec's screen rules, and has its own tests.

1. **Shell:** Bramble header, five-tab bar (Shop, Deals, Rewards, Orders, Account), screen routing in app state (no URL routing), and a `screen` event on each change.
2. **Find a store** (p. 1, 2, 9, 12): the #1/#2 sheet on first visit, a store list with a "Set as my store" action, and the ZIP fallback after `dont_allow` (24 stores, "Show 18 more"). Records `usedZipSearch`, `storesViewed` and `msToFind`.
3. **Shop and Checkout** (p. 3, 10): a product list including oat milk and sourdough, a cart, and Checkout with #3 and #4. "Place order" is disabled until #3 is answered (in `neutral`). Sends people to Find a store if no store is set. Delivery is $0 when free delivery has been redeemed.
4. **Orders** (p. 4, 5): tracking with the #5 card and the #6 card. After #6 is answered, the order is delivered and the #7 sheet appears if applicable.
5. **Deals** (p. 6): #8 and #9; in `neutral`, the list is hidden until both are answered. Heart buttons for saving deals.
6. **Rewards** (p. 7, 11): balance, the Redeem button, and #10–12 with points shown in both levels and identical labels.
7. **Account** (p. 8): the address field and Save, and the "Location settings" list generated from `flows.ts`, showing "Not set" for flows not shown or not applicable. Changes are logged with `source: "account_page"`, along with visit count and time.

## Phase 8: Tasks

- Files: `src/study/TaskBar.tsx`, `src/study/tasks.ts`, `src/surveys/EaseRating.tsx`.
- `TaskBar`: "Task n of 6", a short label that expands when tapped to the full task text (a reopen is logged), and "I've finished this task".
- Task text is the protocol's wording, using "your" phrasing and no "usability" wording.
- After "finished": the ease rating (1–7), then the next task. `task` events are logged at start and finish.
- `taskOutcome` is computed from app state when each task finishes. For example, t4 is done when at least two deals are saved, and t6 when the saved address matches.
- Tests: tasks run in the stored order, and `taskOutcome` is right for both completed and skipped tasks.

## Phase 9: Surveys after the tasks

- `SUS.tsx`: the standard 10 items on a 1–5 scale; all answers required.
- `Suspicion.tsx`: one text field, required, at least 1 character.
- `SettingsCheck.tsx`: the protocol's 7 questions, with iPhone or Android paths based on `device.os`, the multi-select q1, and the "I couldn't find it" options.
- `Closing.tsx`:
  - Call `flushWrites()` while showing "Saving…".
  - Set `completedAt` and `stage: done`.
  - Redirect to `https://app.prolific.com/submissions/complete?cc=<code>`.
  - Skip the redirect in pilot mode.
- Tests: required-answer checks, and the OS-specific text.

## Phase 10: Security rules

- `firestore.rules` as in the spec:
  - The owner can create and update only their own participant document.
  - `prolificPid`, `friction`, `taskOrder`, `createdAt` and `withdrawn` can't be changed after creation.
  - Events are create-only.
  - `pids` are create-only, with a matching `uid`.
  - `meta/assignment` can only be incremented by 1.
  - Participants can read only their own document.
  - The same rules apply to the `pilot_` collections.
- Tests in `tests/rules.test.ts` using `@firebase/rules-unit-testing` and the emulator: every allowed and denied case listed in the spec.

## Phase 11: Cross-cutting tests

These live in `tests/` and run in jsdom with the memory writer:

- **Parity:** draw every screen in both levels, collect visible text with input values removed, and assert that the two levels match. Assert that the points shown match.
- **Decline everything:** a scripted run through all six tasks in both levels, choosing the privacy option every time. Every `taskOutcome.done` is true.
- **Logging completeness:** in a scripted run, every shown flow has one `prompt_shown` before its first `decision`, and dependent flows are `not_applicable` when skipped.
- **Points range:** all 2³ combinations of accepting offers, with redemption, give a bonus between $0.12 and $0.57.

## Phase 12: Export, deploy, launch prep

- `scripts/export.ts` (run with `tsx`, Admin SDK with a service-account key kept out of git):
  - Writes `exports/<date>/participants.csv`, `events.csv` and `flows.csv`.
  - Leaves out withdrawn participants. Includes pilot data only when given `--pilot`.
  - Swaps Prolific IDs for study codes and writes the mapping to `exports/<date>/id-map.csv`.
  - `flows.csv` follows the spec's computed-column rules.
  - Test: seed the emulator with three scripted participants and compare the output with the expected CSVs.
- Fill in the inputs from the research team, then `npx firebase deploy --only hosting,firestore:rules`.
- Add `CHANGELOG.md` and tag the release with `v<appVersion>`.
- Write a `README.md` covering how to run, test, deploy and export.
- Manual: the device walk-through from the spec, then the think-aloud pilot and the Prolific pilot.

## Order and size

| Phase | Depends on | Size |
| --- | --- | --- |
| 0 Setup | — | S |
| 1 Flow config | 0 | S |
| 2 Logging | 0 | S |
| 3 Study shell | 2 | M |
| 4 Device, consent, randomization | 3 | M |
| 5 App state | 1 | M |
| 6 FlowChoice | 1, 2, 5 | M |
| 7 Screens | 6 | L |
| 8 Tasks | 3, 7 | M |
| 9 Surveys | 3 | S |
| 10 Rules | 0 | M |
| 11 Cross-cutting tests | 7, 8 | M |
| 12 Export, deploy | all | M |

Phases 1, 2 and 10 can be done in any order after Phase 0.
