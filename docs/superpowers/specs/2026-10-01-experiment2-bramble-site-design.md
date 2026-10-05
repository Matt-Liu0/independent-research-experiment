# Experiment 2: Bramble site (Part 1) design

Oct 1, 2026 · Design spec

This spec covers the Part 1 phone web app from `Human study protocol and participant instructions.md`: the Bramble grocery app, the surveys around it, and the data it collects. Part 2 (Experiment 1), the norming survey and the analysis scripts are out of scope.

## Decisions

| Topic | Decision |
| --- | --- |
| Hosting | Standalone site on Firebase Hosting; Prolific links in and out |
| Stack | Vite + React + TypeScript |
| Data | Cloud Firestore, Firebase Anonymous Auth |
| Architecture | One config-driven app; the 12 flows are defined once and each screen reads its friction settings from that definition |
| Friction levels | Called `nudged` (high friction) and `neutral` (low friction) in code and data |
| Manipulation | Only defaults and button emphasis differ; wording, labels, points and flows are identical |
| Prompt dismissal | Prompts cannot be dismissed; there is no drag handle |
| Dependent flows | #2 is skipped if #1 is declined; #7 is skipped if #5 is declined; both are recorded as `not_applicable` |
| Stored personal data | Prolific IDs only; the first name stays on the phone; the typed ZIP and address are not stored |

## Participant flow

Stages run in a fixed order. `stage` is saved after each one, so a reload resumes where the participant left off.

1. **Entry.** The app reads `PROLIFIC_PID`, `STUDY_ID` and `SESSION_ID` from the URL. If any is missing, it shows "Please open this study from Prolific" and writes nothing.
2. **Device check.** It requires a touch device in portrait orientation on a phone-sized screen. Computers see a QR code linking to the same URL; landscape shows "Please rotate your phone".
3. **Consent.** The text comes from the IRB, and `consentVersion` is recorded.
4. **Assignment.** This happens only after consent. See Randomization.
5. **Welcome.** The protocol's welcome text, then the name prompt. The name is kept in `localStorage` only.
6. **Tasks.** Six tasks in random order, with Task 3 straight after Task 2 and Task 6 last. A bar at the top of the screen shows the current task; tapping it reopens the full text, and an "I've finished this task" button sits beside it. The Bramble app fills the rest of the screen. After each task comes a 1–7 ease rating.
7. **SUS.** The standard ten items, unchanged.
8. **Suspicion question.**
9. **Settings check.** The protocol's seven questions, showing iPhone or Android paths based on the detected OS.
10. **Closing.** Wait until all writes are saved ("Saving…"), then redirect to Prolific with the completion code.

No text before the suspicion question contains the word "privacy" or describes the study as a "usability test". The Account section heading is "Location settings", not "Location and privacy".

## The 12 flows

Flows belong to screens, not tasks. Each prompt appears the first time the participant reaches its screen, whichever task they are on. The actual `taskId` is logged with every event, and `task` below is only the task each flow is expected to fall in.

| # | `flowId` | Expected task | Screen | Options | `nudged` | `neutral` | `dependsOn` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `store_location` | 1 | Find a store (sheet) | while_using · once · dont_allow | while_using filled; dont_allow a text link | equal buttons | — |
| 2 | `store_precise` | 1 | same sheet | exact · general | switch, default exact | buttons, no default, required | #1 ≠ dont_allow |
| 3 | `courier_live` | 2 | Checkout | share · dont_share | switch, default share | buttons, no default, required | — |
| 4 | `checkout_partner_offers` | 2 | Checkout | checked · unchecked | checkbox, default checked | checkbox, default unchecked | — |
| 5 | `bg_during_order` | 3 | Order tracking | allow · not_now | allow filled; not_now a link | equal buttons | — |
| 6 | `sam_share` | 3 | Order tracking | live_location · arrival_only | live_location filled; arrival_only a link | equal buttons | — |
| 7 | `bg_between_orders` | 3 | Delivered (sheet) | keep_on · turn_off | keep_on filled; turn_off a link | equal buttons | #5 = allow |
| 8 | `deals_personalized` | 4 | Deals | on · off | switch, default on | buttons, no default, required | — |
| 9 | `deals_partner_offers` | 4 | Deals | on · off | switch, default on | buttons, no default, required | — |
| 10 | `reward_keel` | 5 | Rewards | accept · decline | accept filled; decline a link | equal buttons | — |
| 11 | `reward_university` | 5 | Rewards | accept · decline | accept filled; decline a link | equal buttons | — |
| 12 | `reward_data_partners` | 5 | Rewards | accept · decline | accept filled; decline a link | equal buttons | — |

Both levels use the same labels: "Allow while using Bramble", "Allow once", "Don't allow", "Link", "Donate", "Share", "No thanks", and so on. Offers pay the same points in both levels (+200, +100, +150), and the amounts are shown in both.

### Screen rules

- **Find a store.** If #1 is `dont_allow`, the ZIP search screen appears (mockup p. 12). Any 5-digit ZIP shows the same 24 stores, A to Z. The typed ZIP is not stored; only `usedZipSearch`, `storesViewed` and `msToFind` are.
- **Checkout.** If no store is set when the participant opens the Shop tab, they are sent to Find a store first. In `neutral`, "Place order" stays disabled until #3 is answered.
- **Order tracking.** #5 and #6 are cards on the tracking screen. Once #6 is answered, the order moves to Delivered and the #7 sheet appears if #5 was `allow`.
- **Deals.** In `neutral`, the deals list appears once #8 and #9 are both answered. Saving a deal is a heart toggle; `dealsSaved` counts the saved deals.
- **Rewards.** "Redeem" for free delivery costs 300 points. The balance is shown on screen at all times.
- **Account.** The page is generated from the flow list. It shows each flow's current value, or "Not set" for flows that are `not_shown` or `not_applicable`. Changes are logged with `source: "account_page"`. The delivery address field saves whatever is typed; only `addressMatches` (case- and whitespace-insensitive match to "40 Oak Street") is stored.
- **Sheets** (#1/#2, #7) have no drag handle and cannot be dismissed.

### Flow config

```ts
type FlowDef = {
  id: string;
  task: 1 | 2 | 3 | 4 | 5 | 6;
  screen: string;
  options: string[];
  dependsOn: { flowId: string; equals?: string; notEquals?: string } | null;
  nudged:  LevelDef;
  neutral: LevelDef;
};
type LevelDef = {
  control: "switch" | "checkbox" | "buttons" | "sheet";
  default: string | null;   // null = nothing selected
  emphasis: string | null;  // option drawn as the filled button; others as text links
  required?: boolean;       // participant can't continue until they choose
};
```

`<FlowChoice flowId=… />` draws the widget for the participant's level, logs `prompt_shown` when it first becomes visible, logs `decision` on each choice, and updates `appState.flows`. Screens contain no logging code of their own.

## Randomization

- After consent, a Firestore transaction on `meta/assignment` assigns whichever level has fewer participants, choosing at random on a tie, and increments its counter. Participants who later drop out keep their count.
- Task order is shuffled at the same moment, with the 2→3 and 6-last rules applied.
- Each `prolificPid` can start only once. On entry the app creates `pids/{prolificPid}` → `{ uid }`. If that document already exists for a different `uid`, it shows "You've already started this study in another browser. Please go back to it." In the same browser, Anonymous Auth keeps the `uid`, so the participant resumes.

## Data model

```
meta/assignment
  nudged: number, neutral: number

pids/{prolificPid}                      create-only
  uid, createdAt

participants/{uid}
  prolificPid, studyId, sessionId
  appVersion, consentVersion
  friction: "nudged" | "neutral"
  taskOrder: number[]
  withdrawn: boolean                    default false; set by Part 2's debrief
  device: { os, screenW, screenH, userAgent, passedCheck }
  tzOffset, localStartHour
  resumeCount
  stage: "device" | "consent" | "welcome" | "tasks" | "sus" | "suspicion" | "settings" | "done"
  createdAt, consentAt, completedAt
  ease: { t1..t6: 1–7 }
  sus: number[10]
  suspicion: string
  settingsCheck: { q1: string[], q2..q7: string }
  taskOutcome:
    t1: { done, storeId, usedZipSearch, storesViewed, msToFind }
    t2: { done }
    t3: { done, samNotified }
    t4: { done, dealsSaved }
    t5: { done, deliveryRedeemed }
    t6: { done, addressMatches }
  appState:
    flows: { [flowId]: string | null }  null = not yet shown or not applicable
    points, storeId, accountPageVisits, accountPageMs

participants/{uid}/events/{autoId}      append-only
  t: serverTimestamp, clientT: ms since session start
  type: "stage" | "task" | "screen" | "prompt_shown" | "decision" | "setting_change"
        | "points" | "visibility" | "resume" | "error"
  taskId, screen
  flowId, value, defaultShown, source: "prompt" | "account_page"
  msSincePrompt, pointsBefore
  detail                                free-form object for error messages and stage names
```

Pilot runs (`?pilot=1`) write to `pilot_participants` and `pilot_pids` instead, with the same layout.

### Reason for each field

| Field | Reason |
| --- | --- |
| `prolificPid` | Links Part 1 to Part 2 for the say–do gap; needed for paying the bonus |
| `studyId`, `sessionId` | Prolific submission matching; separates runs |
| `uid` | Security rules key; resuming |
| `appVersion` | Identifies which build each participant saw |
| `consentVersion` | Identifies which consent text each participant saw |
| `friction` | The manipulated variable |
| `taskOrder` | Covariate for order effects |
| `withdrawn` | Honors the Part 2 debrief withdrawal; filtered out at export |
| `device.os` | Picks the settings-check instructions; covariate |
| `screenW`, `screenH` | Checks whether decline options were visible without scrolling |
| `userAgent` | Backs up the OS detection; catches desktop browsers posing as phones |
| `passedCheck` | Record of the wrong-device exclusion |
| `tzOffset`, `localStartHour` | Covariate for fatigue and rushing |
| `resumeCount` | Flags timing distorted by reloads |
| `stage` | Resuming; where people dropped out, for the dropout-by-friction check |
| `createdAt`, `consentAt`, `completedAt` | Durations; days between parts |
| `ease` | Required by the protocol; checks that friction didn't make tasks feel harder |
| `sus` | Required by the protocol; supports the cover story |
| `suspicion` | Reporting results with and without suspicious participants |
| `settingsCheck` | Everyday settings (H); q7 catches settings changed while answering |
| `taskOutcome.*.done` | Separates skipped tasks from declined flows |
| `usedZipSearch`, `storesViewed`, `msToFind` | Cost of declining location |
| `samNotified`, `dealsSaved`, `deliveryRedeemed`, `addressMatches` | Task completion checks |
| `appState.flows` | Final value of each flow; restores the app after a reload |
| `points` | Bonus payment |
| `accountPageVisits`, `accountPageMs` | Exploring like a tester |
| `prompt_shown` event | Separates "not shown" from "declined"; starts the decision timer |
| `decision` event | First choice and every later change, with `defaultShown` |
| `source` | In-the-moment choices vs. later changes on the Account page |
| `msSincePrompt` | Decision time, reported per the protocol |
| `pointsBefore` | Context for the Rewards decisions |
| `visibility` event | Corrects decision times for app switching |
| `resume`, `error` events | Data validity |
| `t` and `clientT` | Server time for ordering; client time for precise intervals |

Deliberately not collected: IP address, real location, contacts, device identifiers other than the user agent, first name, typed ZIP, typed address.

## Security rules

- Only signed-in anonymous users can write, and only to `participants/{uid}` where `uid` is their own `request.auth.uid`.
- On update, the owner cannot change `prolificPid`, `friction`, `taskOrder`, `createdAt` or `withdrawn`.
- `events` allow `create` only; there is no `update` or `delete`.
- `pids/{prolificPid}` allows `create` only, by the user whose `uid` is in the document.
- `meta/assignment` can be changed only by incrementing one counter by 1, inside the assignment transaction.
- Participants cannot read anything except their own participant document.
- Researchers read through the Firebase console or the Admin SDK.
- `withdrawn` is written through an admin path that the Part 2 spec defines.

## Reliability

- Firestore offline persistence is on. Writes queue while there's no signal, and the closing screen waits for the queue to empty before redirecting.
- Reload: the app rebuilds from `stage` and `appState`, logs `resume` and increments `resumeCount`. Prompts already answered aren't shown again. A prompt that was open but unanswered is shown again, with a new `prompt_shown` event.
- Errors: a React error boundary logs an `error` event and shows "Something went wrong. Tap to continue", which reloads from the last saved stage. If the app can't recover, it shows the Prolific return code.

## Export

`scripts/export.ts` (Node, Firebase Admin SDK) writes three CSVs, dropping withdrawn participants and pilot data:

- `participants.csv`: one row per participant, with all `participants/{uid}` fields flattened. `prolificPid` is replaced by a study code; the mapping is written to a separate file kept off shared drives.
- `events.csv`: one row per event.
- `flows.csv`: one row per participant × flow, with `status` (`chosen` / `not_shown` / `not_applicable`), `firstChoice`, `finalValue`, `defaultShown`, `changedFromDefault`, `msSincePrompt` (first decision, excluding time the app was hidden), `toggleCount` and `changedOnAccountPage`.

## Testing

Automated tests use Vitest, React Testing Library and the Firebase emulator, and run before each deploy:

- **Parity:** every screen is drawn in both levels; the visible text and the points must be the same.
- **Decline everything:** in both levels, all six tasks are completed while choosing the privacy option at every flow.
- **Logging:** every shown flow has one `prompt_shown` before its first `decision`, with the right `defaultShown`; skipped dependent flows are `not_applicable`.
- **Points:** every combination of accepting and declining offers, with the redemption, gives a bonus between $0.12 and $0.57.
- **Security rules:** no reading another participant's data, no changing or deleting events, no changing `friction`.
- **Export:** a seeded emulator run produces the expected CSVs.

Manual checks:

- Work through the app on at least 2 iPhones and 3 Android phones from different makers, including a small screen such as an iPhone SE.
- Confirm that decline options are visible without scrolling.

Pilot:

- 5–8 think-aloud participants on their own phones, using `?pilot=1`.
- Then a 10-person Prolific pilot covering the whole path from link to bonus payment.

## Launch

- `appVersion` is set at build time. During collection, any change bumps the version and gets an entry in `CHANGELOG.md`.
- Firestore data is exported every day during collection as a backup.

## Project layout

```
website/
  docs/superpowers/specs/…
  experiment2/
    src/
      study/      stages, Prolific handoff, randomization, device check (reused by Experiment 1)
      bramble/    app screens, app state, flows.ts, FlowChoice
      surveys/    ease rating, SUS, suspicion question, settings check
      log/        logEvent(), Firestore writer
    scripts/export.ts
    firestore.rules
    tests/
```

## Out of scope

Part 2 / Experiment 1, the norming survey, coding the suspicion answers, the analysis scripts, and IRB documents.

## Changes made during implementation (Oct 3, 2026)

These refine the design above; where they conflict, this section wins.

**Flow model**
- `control` is `switch`, `checkbox` or `buttons`. A sheet is a container that screens wrap around a flow, not a control type.
- Each flow also has `kind` (`prompt`: a one-tap question; `setting`: a control that stays on screen), `settleOn`, shared `labels`, `title` and `description`, `privacyOption`, `points` and Account-page labels.
- A flow's first choice is fixed when it **settles**. Prompts settle on the tap. #2 settles when #1 is answered with an Allow. #3 and #4 settle on Place order. #8 and #9 settle when the participant leaves Deals or finishes the task.
- Export statuses are `chosen`, `not_applicable`, `shown_not_settled` (seen but never settled, e.g. opened Checkout but never ordered) and `not_shown`.
- In `nudged`, the option that shares least is drawn as a text link, the emphasized option is filled, and any other option is outlined. For #1 this means "Allow once" is outlined.

**Behavior**
- In `neutral`, the two Allow buttons on the location sheet stay disabled until exact or general is chosen; "Don't allow" never waits. Allowing therefore takes two taps in `neutral` and one in `nudged`.
- The order is delivered after both #5 and #6 are answered, not just #6, so #7 can depend on #5.
- The Rewards section heading is "Offers" in both levels (the mockup's "Earn more points" was a nudge).
- The Account page is identical in both levels: a segmented control per flow. A flow becomes editable there once it has settled, or for settings once it has been shown. Changes there never pay points.
- Researcher demo links: `?demo=nudged` or `?demo=neutral` work on any device and save nothing.

**Data**
- Event types: `stage`, `task`, `screen`, `prompt_shown`, `decision`, `settled`, `action`, `points`, `visibility`, `resume`, `error`. Changes on the Account page are `decision` events with `source: "account_page"` (there is no separate `setting_change`), and `dismissed` was dropped because prompts can't be dismissed.
- `settled` events carry `value`, `defaultShown`, `changedFromDefault`, `msSincePrompt` (visible time only) and `toggleCount`.
- `action` events record participant actions without personal text: `store_set`, `zip_search` (no ZIP), `cart_add`, `order_placed`, `order_delivered`, `deal_toggled`, `delivery_redeemed`, `address_saved` (only `matches`).
- The participant record also has `consentDeclined`, `taskIndex`, `taskPhase`, and `appState.shown` / `appState.settled`.
- `completedAt` is stamped when the settings check is submitted.
- Consent text is a TypeScript module (`src/study/consentText.ts`), not markdown.
- The export orders events by server time, then `clientT`, because `clientT` restarts after a reload. It is tested on fixtures and against seeded emulator data.

## Version 0.2.0 changes (Oct 4, 2026)

The store finder, loading and order tracking were reworked as set out in `2026-10-04-bramble-realism-proposals.md`. Points that change this spec:

- **Nearby stores:** five, the two nearest without oat milk. Stock shows in store cards, or in the list after searching for oat milk.
- **ZIP path:** still no map, but the same search box and store cards as the nearby path.
- **Order statuses:** `placed`, `packed`, `on_the_way` and `delivered`. #5 and #6 appear at On the way. Place order no longer jumps to Orders; the timeline starts when Orders is first opened.
- **Events:** every event also has `pageLoadAt`, `seq` and `clientTime`. New actions: `store_card_opened`, `store_search` and `order_status`. `screen` events have `loadingMs`.
- **Stored address:** only the practice address, `40 Oak Street` or `other`.

`experiment2/DATA.md` is the field-level reference.

## Version 0.3.0 change (Oct 4, 2026)

The nearby-stores map is a real OpenStreetMap street map, self-hosted (`experiment2/public/map/`, made by `npm run build:map`). This keeps the no-third-party rule: tiles and fonts come from our own site. The simulated location is a fixed spot in Clintonville, Columbus, Ohio. Business and place labels are hidden, and the view doesn't pan. Phones without WebGL fall back to the drawn map, logged as `map_shown`.

## Version 0.4.0 change (Oct 4, 2026)

This reverses the earlier "no panning" decision: the real map can be dragged and zoomed. It uses cooperative gestures (two fingers on phones) and is limited to the downloaded area, with a recenter button. Each move is logged as `map_moved`, so exploring is measured rather than prevented. Loading delays are about a third shorter (`src/bramble/timing.ts`).
One-finger dragging replaced two-finger in 0.4.1 (Oct 4, 2026).

## Version 0.5.0 changes (Oct 4, 2026)

- **Rewards Change button:** answered offers can be changed on the Rewards card, the same in both levels.
- **Offer points track the current answer:** they're paid on accepting and taken back on unlinking, wherever the change happens. This replaces "changes on the Account page never pay points", which allowed earning the bonus without sharing.
- **Measures:** the first choice (`settled`) is still the behavior measure, and later changes are flagged in `flows.csv` as `changedLater`.

## Version 0.6.0 change (Oct 4, 2026)

Back navigation: a ‹ button on Find a store and Checkout, and the phone's Back moves between app screens. Back is blocked during consent, ratings and surveys, and while a prompt is open.

## Version 0.7.0 change (Oct 5, 2026)

Each flow carries a GKC-CI coding (`src/bramble/ci.ts`): sender, recipient and recipient type, subject, information type, and a transmission principle split into aim, condition, temporal and consideration. The friction level changes only the derived **consent form** (opt_out, opt_in, nudged_choice, active_choice). Exported in `flows.csv` and `flow-codebook.csv`.
