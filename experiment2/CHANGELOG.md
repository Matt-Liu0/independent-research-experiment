# Changelog

Every build participants see has a version (`appVersion` on each record). Bump `version` in `package.json` and add an entry here for any change made once data collection starts.




## 0.20.0 (2026-10-27)

Matches the study budget (Matt, Oct 27): only Colgate students, paid directly by gift card, and no norming sample (RQ1.2 now compares the interview arms, with the open-ended arm as the reference). Guide: `RECRUITMENT.md` (replaces `PROLIFIC.md`).

- **Norming survey removed:** no `norming.html` page, consent text or completion code; Part 2 records no longer have `variant`; the rules refuse the `norming` collections; the export no longer writes `norming-*.csv`, and `verdicts.csv` has `arm` instead of `group`.
- **Student links only:** the site reads only `?code=` (plus demo and agent links). Old Prolific links show "Please use the link you were given". The record field `prolificPid` is now `participantCode`; `studyId`, `sessionId` and `recruitment` are gone.
- **Endings:** no "Back to Prolific" links or completion/return codes. Part 1 ends with "You're all done for today", once the answers are saved; Part 2 with "Your answers are saved". Declining consent, the phone and computer checks and the repeated-crash page no longer mention Prolific.
- **Export:** `bonus-payments.csv` (participant code, bonus) replaces `prolific-bonuses.txt`.
- **Part 1 closing page:** says Part 2 takes about 35 minutes (it said 45, from before 0.19.0).

- **Stride starts with 50 coins** (Matt, Oct 28), below the 100 the sleep report costs, so unlocking it means earning coins from an offer. Answering all three offers without unlocking also finishes Task 10 (`t10.offersAnswered`), so nobody is stuck. Balances never go below 0 (an offer taken back after its coins were spent). Stride's bonus is still $0.50–$5.00. **Bramble is unchanged** (150 points, free delivery costs 100), so the two apps' Rewards pages are no longer matched.
- **Participant-area lookup on phones:** tiles are fetched in two batches instead of ring by ring, the lookup starts as soon as the ZIP is typed, the limit is 20 s, and the `area` event records why the default was used (`reason`: `no_map`, `zip_not_found`, `outside_map`, `too_few_stores`, `timeout`, `error`) and how long it took (`ms`). Demo links show it in the top banner ("map: …").
- **Small towns get their real stores:** the store search keeps going out to about 15 km until it finds 5 supermarkets (Hamilton, NY: Price Chopper 1.6 mi, then four stores 4.7–9.9 mi out), and a store found on two map tiles counts once. The ZIP list then has fewer than 24 stores and no "Show more". The US map is uploaded (10 regional files, 8.9 GB).
- **Demo links match what participants see:** "I'm done with this task" (skipping an unfinished task) appears only with `&skip=1` added to a demo link, for testing. It was already off for participants and pilots.

## 0.19.0 (2026-10-27)

Shorter sessions (Matt and Noah: the study was too long). Proposals and estimates: `../docs/superpowers/specs/2026-10-27-realism-and-length-proposals.md`.

- **Tasks 2 and 3 merged** into one errand: "Order oat milk and a sourdough loaf for delivery, then let your housemate Sam know when it will arrive." 9 tasks instead of 10 (5 in Bramble). The flows and screens are unchanged; `bg_during_order`, `sam_share` and `bg_between_orders` now belong to Task 2. Task numbers keep their meaning (there is no Task 3), `t2` gains `ordered` and `samNotified`, and the order rule is now just 1 before 2, 6 last (still 12 orders). The rules require 9 tasks.
- **Ease rating:** one tap answers and moves on (no Continue button).
- **Phone home screen** (realism): after the task card, the participant opens the app from a home screen (their own clock and date, the study apps among ordinary icons). The second app appears there as newly installed. Only the task's app opens; other taps are logged (`home_tap`). Agents still start straight in the app.
- **The participant's own area** (realism; Matt, Oct 27): the welcome page asks for a ZIP code, and the store finder shows the real supermarkets nearest to it, at their real places, on a real map of the area. The 3rd and 5th nearest have oat milk, as in the default. The ZIP, the area and the store names stay on the phone; the record stores `r1`–`r24` and an `area` event (`participant` or `default`). The US map is 10 regional files (`src/bramble/mapRegions.ts`, about 9.6 GB in all), because one 9.6 GB download kept being cut off; the phone reads the one covering the ZIP. Needs the one-time setup in the README ("Store-finder map"); until then, and for agents, everyone gets the default Clintonville neighborhood. **The welcome text still says "a simulated location"**, which no longer fits when the area is real; it is left as is because the introduction wording is undecided.
- **First-run setup** (realism; the pipeline's "short onboarding in the app"): the first time each app opens, Bramble asks what the participant usually buys (up to 3 categories; Shop lists those first) and Stride asks for a goal and active days (shown on Today). The picks stay on the phone, like the name; only `app_setup` with a count is logged. Stride's greeting now follows the phone's clock (morning / afternoon / evening).
- **In-app notifications** (realism): banners for the order (packed, on the way, delivered), a reply from Sam after either app's "Let Sam know" (the same reply whatever was shared), and "Workout saved" in Stride. The same in both friction levels; never while a prompt is open, and hidden as soon as one opens. Logged as `action` `notification`.
- **Part 2:** the filler is 2 minutes instead of 3, and the briefing is two short paragraphs ("about 35 minutes").

## 0.18.0 (2026-10-22)

The rest of Part 2 (pipeline, Experiment 1 "Procedure"). Matt chose Claude Sonnet 5.5 as the interviewer, a Cloud Function, an empty case set for now, and draft wording.

- **Stages:** `briefing` → `chat` → `filler` before the questionnaire, and `debrief` after the background survey.
- **Interviewer** (`functions/`, Cloud Function `interviewTurn`): one fixed model (`claude-sonnet-5-5`, low effort, server-side refusal fallback) for everyone. Assigns the arm on the first call (least-used, so arms stay balanced), keeps the transcript in `part2_interviews` where no browser can read it, and saves a summary on the record. Location first, then health, at most 7.5 minutes each; fixed openers, cases and closing, so only follow-ups come from the model. Open arm: up to three generic follow-ups per domain. Structured: the six coordinates in order. Case: each case in T, then the inferred rule, up to three rounds. **The case arm isn't assigned until T is filled in.**
- **Wording is DRAFT** (banners on the pages): interviewer prompts (`functions/src/prompts.ts`), briefing and debrief (`src/part2/sessionText.ts`). The briefing says replies come from Claude and asks people not to type identifying details.
- **Filler:** 10 anagrams for 3 minutes (or until all are solved). **Debrief:** discloses Part 1's cover story and offers "Please remove my data", which the export honors for Part 1 and Part 2.
- **Rules:** `arm` and `interview` can only be written by the function; transcripts and arm counters are closed to browsers.
- **Export:** `arm` and interview columns in `part2-participants.csv`, `group` in the verdict tables, and `transcripts.jsonl`.
- **Demo and pilot links:** `part2.html?demo=1` uses a scripted stand-in (no model). Pilot links take `&arm=open|structured|case`.
- Tests: the interview script (unit), the function in the emulator (`npm run test:functions`), the rules, the export and the full Part 2 flow.

## 0.17.0 (2026-10-20)

Changes from Noah's walkthrough (Oct 19).

- **Points are worth more (item 2):** 100 points or coins = $1.00 (was $0.10). Each app starts at 150 (was 420), free delivery and the sleep report cost 100 (was 300), and the offers stay +200 / +100 / +150, now worth $2.00 / $1.00 / $1.50. The bonus is $0.50–$5.00 per app once the reward is redeemed. Part 2 items word the rewards in the new dollar amounts.
- **"Task complete" strip (item 3):** when a task's goal is reached, a strip under the task bar says so and Done becomes Next task. The task still ends only on that tap, so decisions left on the screen (e.g. the workout-complete prompts) aren't cut off. Logged as `task` / `goal_met`.
- **Workout wording (item 6):** Task 8 says "a short guided workout" instead of "the 10-minute guided workout" (it takes about 24 seconds).
- **Store search (item 7):** a search that matches no item or store name (e.g. a town) shows every store, with a note, instead of an empty list.
- **No skipping tasks (item 10):** "I'm done with this task" in the unfinished-task check is shown on demo links only; participants can only keep going.


- **Part 2 questionnaire and norming survey** (Matt: questionnaire first, all 29 site flows plus 12 repeats, on our own site). Spec: `docs/superpowers/specs/2026-10-14-part2-questionnaire-design.md`.
  - **Battery:** 29 site flows, 12 reworded repeats (one per decision screen in each app, as matched pairs), 12 held-out flows (6 matched pairs). That makes 53 scored items plus 2 attention items, in a random order per person, with repeats at least 20 apart.
  - **Wording:** generic apps ("your grocery delivery app", "your fitness app"), no nudges, rewards in dollars.
  - **Pages:** `part2.html` (computer only: intro, practice, comprehension, items, recall check, background survey) and `norming.html` (any device: consent, then the same questionnaire without recall).
  - **Data:** `part2` / `norming` collections with security rules. The export adds `verdicts.csv` (stated verdict next to the site verdict, with stability flags), `part2-participants.csv`, the norming tables, `battery-codebook.csv` and `part2-id-map.csv`.
- Not yet built: scenario briefing, chat with the interviewer, filler, debrief.

## 0.15.0 (2026-10-13)

- **Three Stride-only gamified flows** (stage 4 of the review; Matt chose G1–G3, without the countdown challenge, and a fixed friend count):
  - **G1 `stride_streak_autosync` (streak, U1, task 7):** after health data syncs, "3-day streak. Don’t lose it" asks to count steps in the background. Keep My Streak · Not Now. Only if health access was allowed.
  - **G2 `stride_community_map` (social proof, U4, task 8):** after the workout, "8 of your 12 friends share their workouts on the Stride community map". Share to Community · Keep Private.
  - **G3 `stride_gold_tier` (status, U6, task 10):** a Silver → Gold card on Rewards, "You’re 40 points from Gold", connects a sleep tracker. Reach Gold · Not Now. Pays no coins.
  - Each follows its screen's friction level (emphasis only; framing identical in both levels), and none is needed to finish a task.
- **Data:** Stride has 15 flows (29 in all). New `nudgeType` column in `flows.csv` and `flow-codebook.csv`. New CI terms: `step_count`, `workout_route`, recipient type `public`, aims `keep_streak`, `community_sharing`, `status_tier`.

## 0.14.0 (2026-10-13)

- **Wording aligned with prior work** (the Oct 7 proposal, approved by Matt):
  - **Location prompt:** Apple's wording and order, "Allow Once · Allow While Using App · Don't Allow", and the title "Allow “Bramble” to use your location?".
  - **Precise control:** "Precise" (Precise / Approximate).
  - **Background prompts:** "Allow · Don't Allow" during the order; Apple's upgrade buttons "Change to Always Allow · Keep Only While Using" between orders.
  - **Offers:** "Accept · Decline" (Utz et al.), shown as Accepted / Declined afterwards.
  - **Account labels:** iOS Settings wording.
  - **Stride:** uses the same buttons for each matched flow. Flow IDs and stored values are unchanged.
- **Face Unlock removed from Stride** (unrealistic, and it had no Bramble counterpart). Stride has 12 flows, all paired. Task 7 is now "Connect your health data to Stride, and check your stats for today", and `t7` records only `healthAnswered`.
## 0.13.0 (2026-10-13)

From the review pipeline (`docs/superpowers/specs/2026-10-13-site-review-pipeline.md`).

- **Guidance while waiting:** the order and the workout each say to keep the page open (same in both levels, no hint of the questions).
- **Unfinished-task check:** tapping Done before a task's goal is met asks "This task doesn't look finished yet" (Keep going / I'm done with this task). It's the same in both levels, never triggered by a privacy answer, and not shown to agents. Logged as `task` events `unfinished_check` and `unfinished_answer`.
- **Stride's own look:**
  - **Navigation:** four tabs around a raised Workouts button with a dumbbell icon, and a coin balance in the header.
  - **Style:** sans-serif headings and shadowed cards.
  - **Unchanged:** the decision controls are the same as Bramble's.
- **Assignment under load:** retries when simultaneous participants collide on the same cell (previously the second got "permission denied" right after consent). Ties are now broken so that the pattern and app order stay balanced at any sample size, not only multiples of 40. New `npm run test:load`.
- **Prolific:** `prolific-bonuses.txt` in every export; `PROLIFIC.md` guide.
## 0.12.0 (2026-10-11)

A second app, **Stride** (fitness and health), in the same session as Bramble. Spec: `docs/superpowers/specs/2026-10-08-second-app-stride-design.md`.

- **Stride:** four tasks (7–10) and 13 flows on the same six decision screens as Bramble. Twelve mirror a Bramble flow (`counterpart`) with health instead of location information; one is biometric (Face Unlock). Same Utz levels, same points structure (coins).
- **Session:**
  - Everyone uses both apps; each app's tasks run as one block.
  - **Assignment:** app order (`appOrder`) is balanced and crossed with the nudge pattern, as one of 40 cells in `meta/assignment`, e.g. `U1U3U5B`. The same pattern applies in both apps.
  - **Order:** `taskOrder` lists all 10 tasks. A "Now try …" page comes before the second app, and the SUS is asked once per app, in app order.
  - **Bonus:** the bonus is both balances together.
  - **Wording:** the welcome, consent draft (`v1-draft`) and page title mention both apps.
- **Data:**
  - Records gain `appOrder`, `strideState` and `sus.bramble` / `sus.stride`; every event has `app`.
  - **`flows.csv`:** 27 rows per person, with `app` and `counterpart`.
  - **`participants.csv`:** `bramblePoints`, `strideCoins`, per-app SUS, and Stride outcomes and settings-page timing.
- **Links:** agent links take 10-task orders (the app order is implied), and demo links accept `&first=stride|bramble`.
- **Code:**
  - The app-independent engine moved to `src/core/`, and Bramble and Stride both run on it.
  - The offer cards and settings list are shared.
## 0.11.0 (2026-10-08)

- **Information coding split:** `informationType` is replaced by `informationCategory` (Matt's list: health, financial, demographic, communication, digital_activity, biometric), `attribute`, `granularity`, `temporality` and `identifiability`. The `ci_*` export columns follow.
- **Two new Bramble flows, in new categories:**
  - #13 `save_card`: save a practice card at checkout (financial; unit U2).
  - #14 `birthday_deals`: birthday deals from the practice profile's birthday (demographic; unit U5).
  Both use practice values only and follow the same Utz levels.
- **Task 1 always comes before Task 2:** previously, half of all orders put the ordering task before the store task, so the store (and the location prompt, #1–#2) was chosen inside Task 2. There are now 12 equally likely orders. Agent links with Task 2 before Task 1 are rejected.

## 0.10.0 (2026-10-08)

Friction levels now follow Utz et al. (2019), as decided with Noah.

- **Neutral settings start unchecked (off)** instead of requiring a choice: precise location (#2), courier sharing (#3) and both Deals settings (#8, #9). The partner-offers box (#4) already worked this way. The neutral consent form for these flows is now `opt_in`. This removes the extra tap needed to allow precise location in neutral, the disabled Allow buttons, the hidden-until-chosen deals, and the disabled Place order button.
- **Nudged highlights only the sharing option:** the protective option is now an ordinary button of the same size, not a small text link. `data-emphasis` is `primary` or `plain`.
- **Friction varies within each participant, by decision screen.**
  - **How it's assigned:** the 12 flows sit on six screens (U1–U6). Each person gets three nudged and three neutral (`pattern`, e.g. `U1U3U5`), balanced so all 20 patterns, and therefore each screen, are used equally. This replaces the per-person `friction`.
  - **Export:** `flows.csv` gains `unit`, and `friction` is now per row. `participants.csv` has `pattern` and `nudgedUnits`.
  - **Agent links:** they take `nudged=U1-U3-U5` (or `none` / `all`), so Experiment 4 can replay a participant's pattern or its mirror image.
  - **Demo and rules:** `?demo=mixed` previews a random pattern. The security rules check each pattern is set once, is valid, and is counted once.

## 0.9.1 (2026-10-06)

- `&anydevice=1` skips the phone check for testing on a computer, on the local dev server or against the emulators only (ignored on the deployed study). Skipped checks are recorded as `device.checkSkipped`, with a `deviceCheckSkipped` column in `participants.csv`.

## 0.9.0 (2026-10-05)

Decisions on the pipeline conflicts (Oct 5): keep 12 site flows, keep the "try a new app" framing, keep friction as defaults and emphasis only (no points cost for declining), drop the Day 15 retest, and support both recruitment routes.

- **Participant-code entry:** `/?code=…` lets directly recruited participants (e.g. students) take part with a code. Same app and data; the endings don't mention Prolific, and the bonus is "paid as described in your invitation". Records have `recruitment` (`prolific` / `code`), also in `participants.csv`.
- Messages for a broken link or a used browser no longer assume Prolific.

## 0.8.0 (2026-10-05)

Groundwork for Experiment 4 (agents acting on the site), from the research pipeline.

- **Verdicts:** `flows.csv` gains `firstVerdict` and `finalVerdict`, mapping choices to allow / ask / block as the pipeline specifies (Allow once → ask), and the codebook gains `verdictMap`.
- **Machine-readable controls:** decision buttons carry `data-emphasis` (`primary` / `secondary` / `link` / `plain`), so an agent harness can describe the screen as participants see it.
- **Automation flag:** every record logs `device.automated` (`navigator.webdriver`), and `participants.csv` has an `automated` column. This also flags a human participant running an agent.
- **Agent mode:** `?agent=1&EPISODE_ID=…&friction=…&taskOrder=…` starts a fresh episode straight at the tasks, with the given level and order and no consent, ratings or surveys. Data stays in the page and is exposed on `window.__brambleAgent`. See `DATA.md` section 8.

## 0.7.1 (2026-10-05)

- **Fix:** zooming the map all the way out no longer turns it blank gray. The minimum zoom could fall just below the lowest downloaded tile level (11), leaving only the pins; it's now never below that level.

## 0.7.0 (2026-10-05)

- **Deals photos:** real CC0 product photos (oat milk, apples, sourdough, yogurt), self-hosted in `public/images/deals/`, with credits in `CREDITS.md` there.
- **GKC-CI coding:** each flow carries its Contextual Integrity parameters (`src/bramble/ci.ts`). `flows.csv` gains `consentForm` and the `ci_*` columns, and the export writes a 12-row `flow-codebook.csv` for matching with the Part 2 questionnaire. Participants see no difference.

## 0.6.0 (2026-10-04)

- **Back navigation:** Find a store and Checkout have a ‹ back button that returns to the screen you came from (Shop after a reload). The phone's Back button or swipe now moves between app screens instead of leaving the study. Back does nothing during consent, ratings and surveys, or while a prompt is open (prompts still can't be dismissed). New `via` on `screen` events and a new `phone_back` action.

## 0.5.0 (2026-10-04)

- **Map:** downloaded a larger area (about 18 × 13 km, 16 MB on the server), so the map drags freely sideways as well as up and down.
- **Rewards:** answered offers show a **Change** button (same in both levels) to switch the answer. Decisions made this way have `source: rewards_page`.
- **Points follow the current answer everywhere:** unlinking an accepted offer, on the Rewards card or the Account page, takes its points back, and accepting later pays them. Before this, accepting and then unlinking kept the bonus without sharing. `points` events have a `reason` (`offer_accepted` / `offer_changed`).
- **Export:** `flows.csv` has a new `changedLater` column.

## 0.4.1 (2026-10-04)

- The map now drags with one finger and pinch-zooms with two, like a phone app (was two-finger dragging). Swiping outside the map still scrolls the page.

## 0.4.0 (2026-10-04)

- **The map can be dragged and zoomed:** two fingers on phones (one finger scrolls the page, with an on-screen hint), and mouse drag or Ctrl/⌘ + scroll on computers. Movement stays inside the downloaded neighborhood, with no rotation or tilt. A recenter button returns to the starting view. New actions `map_moved` (`gesture`: `drag` / `zoom`) and `map_recentered`; `participants.csv` gains `mapShown`, `mapMoves` and `mapRecenters`.
- **Shorter loading** (about a third less): splash 0.7 s, screen skeletons 0.25 / 0.4 s, Place order 1.0 s, other spinners 0.3–0.5 s.

## 0.3.0 (2026-10-04)

- **Real street map in the store finder:** MapLibre with an OpenStreetMap extract of one neighborhood (Clintonville, Columbus, OH). It's self-hosted in `public/map/` (about 7 MB on the server; a phone loads only the few tiles in view), so there are no third-party requests and no cost. Business and place labels are hidden, and the view is fixed (no panning). Exact location shows as a dot and general area as a circle. Phones without WebGL get the drawn map, and the new `map_shown` action records which.
- Map code loads only when Find a store opens.
- The researcher-only demo label now sits above the tab bar.

## 0.2.0 (2026-10-04)

More realistic app, from review feedback (`docs/superpowers/specs/2026-10-04-bramble-realism-proposals.md`). Still before piloting.

- **Store finder:** a drawn map with 5 nearby stores, the two nearest out of oat milk. Exact location shows as a dot and general area as a circle. Store cards show stock, and search works by item or store name. The ZIP path (after "Don't allow") has the same search and cards but no map.
- **Loading:** a splash when each task starts, skeletons on screen changes (0.4–0.6 s) and spinners on actions. All times are fixed and identical in both levels; the timings are in `src/bramble/timing.ts`.
- **Order tracking:** Placed → Packed → On the way over about 15 s of tracking, with a moving courier, a countdown and real clock times. The background-location and Sam prompts appear once the order is on the way. Delivery waits for both, plus at least 15 s. Placing an order now shows a confirmation instead of jumping to Orders.
- **Data:** every event has `pageLoadAt`, `seq` and `clientTime`, and the export sorts by them. The saved address is only the practice address, `40 Oak Street` or `other`. New actions: `store_card_opened`, `store_search`, `order_status`.
- Rules tests run on their own emulator ports (`firebase.test.json`).

## 0.1.0 (2026-10-03)

First complete build, before piloting. Consent text is still a draft.
