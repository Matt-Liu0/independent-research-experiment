# Data dictionary: Experiment 2 (Part 1: the Bramble and Stride site)

What every stored field means and the values it can take. It covers the Firestore records and the CSVs from `npm run export`.

Each participant uses **two practice apps** in one session, in a balanced random order: **Bramble** (grocery delivery, tasks 1–6, location data) and **Stride** (fitness and health, tasks 7–10, health data). Stride's flows mirror Bramble's decision screen by decision screen, so each pair differs in information type (section 3b).

**Conventions**
- `null` means "not happened yet" or "doesn't apply". It never means "declined"; declining is always an explicit value.
- **Server time** fields (`createdAt`, `consentAt`, `completedAt`, event `t`) are Firestore timestamps. The CSVs show them as ISO strings in UTC, e.g. `2026-11-01T12:20:00.000Z`.
- **Visible time** leaves out time the app was in the background (phone locked, switched apps). Decision times use it.
- **Per page load:** `clientT` and visible time start at 0 every time the page loads. After a reload (`resume` event) they start again.
- **Event order:** sort events by `pageLoadAt`, then `seq`. Both come from the phone, so the order is exact even when the network delays or batches writes.

---

## 1. `participants/{uid}`: one document per participant

`{uid}` is the browser's anonymous login ID, not the Prolific ID. Pilot runs (`&pilot=1`) use `pilot_participants` with the same fields.

### Identity and assignment

| Field | Meaning | Values |
|---|---|---|
| `prolificPid` | Prolific participant ID from the link, or the **participant code** for code entries (`?code=…`); one record per value either way | text |
| `recruitment` | How the participant arrived | `prolific` (Prolific link) · `code` (a code handed out, e.g. to students; then `studyId` and `sessionId` are `CODE`) |
| `studyId` | Prolific study ID | text |
| `sessionId` | Prolific session ID | text |
| `appVersion` | App build the person saw | e.g. `0.12.0` (see `CHANGELOG.md`) |
| `consentVersion` | Version of the consent text agreed to | e.g. `v1-draft`; `null` before consent |
| `consentDeclined` | Tapped "I do not agree" | `true` / `false` |
| `pattern` | Which **decision screens are nudged** for this person, set right after consent: three of the six units joined, e.g. `U1U3U5` (see section 3); the other three screens are neutral | e.g. `U2U4U6`; `null` before consent. Balanced: each of the 20 possible patterns is used equally often, so each screen is nudged for half the sample |
| `appOrder` | Which app came first, set with `pattern` | `bramble_first` · `stride_first`; `null` before consent. Balanced and crossed with the pattern (section 4) |
| `taskOrder` | Order the nine tasks were shown in: each app's tasks as one block, in `appOrder` | list of 9 task numbers, e.g. `[4, 1, 2, 5, 6, 7, 9, 8, 10]`. There is no Task 3: since 0.19.0, tracking the order and telling Sam are part of Task 2. **Bramble block:** 1 before 2 (a store is set before ordering), 6 last (12 orders). **Stride block:** 7 first, then 8–10 in any order (6 orders). `null` before consent |
| `withdrawn` | Asked to withdraw their Part 1 data (set by the Part 2 debrief) | `true` / `false`; withdrawn people are left out of every export |

### Device and context

| Field | Meaning | Values |
|---|---|---|
| `device.os` | Phone type, from the browser | `ios` · `android` · `other` (computers, tablets, unknown) |
| `device.screenW`, `device.screenH` | Screen size in CSS pixels | numbers, e.g. `390`, `844` |
| `device.touch` | Has a touch screen | `true` / `false` |
| `device.userAgent` | Browser's full identification string | text |
| `device.passedCheck` | Passed the phone-only check | `true` (continued) · `false` (stopped and shown a QR code) |
| `device.checkSkipped` | The phone check was skipped with `&anydevice=1`, which only works on local or emulator runs. Marks test runs; drop these | `true`, or missing |
| `device.automated` | The browser reported being controlled by automation (`navigator.webdriver`), e.g. a participant running an agent, or an Experiment 4 episode | `true` / `false` |
| `tzOffset` | Time zone, as minutes behind UTC | e.g. `240` = US Eastern daylight time, `300` = Eastern standard time |
| `localStartHour` | Local hour when the record was created | `0`–`23` |
| `resumeCount` | Times the page was reloaded or reopened mid-study | `0`, `1`, `2`, … |

### Progress

| Field | Meaning | Values |
|---|---|---|
| `stage` | Furthest stage reached | `device` → `consent` → `welcome` → `tasks` (both apps) → `sus` (one per app) → `suspicion` → `settings` → `done` |
| `taskIndex` | Position in `taskOrder` currently on | `0`–`9` (0 = first task shown) |
| `taskPhase` | Within that task | `doing` (using the app) · `rating` (ease question showing) · `intro` (the "Now try …" page before the second app's first task) |
| `createdAt` | Arrived from Prolific | server time |
| `consentAt` | Agreed to consent | server time; missing if never agreed |
| `completedAt` | Submitted the settings check, the last question | server time; missing if unfinished |

### Answers

| Field | Meaning | Values |
|---|---|---|
| `ease.t1` … `ease.t10` | "How easy was that task?", keyed by **task number** (not position) | `1` (very hard) – `7` (very easy) |
| `sus.bramble`, `sus.stride` | System Usability Scale for each app, items 1–10 in standard order, asked in the order the apps were used | list of 10 numbers, each `1` (strongly disagree) – `5` (strongly agree); `sus` is `null` until the first is submitted |
| `suspicion` | "In one sentence, what do you think this study is about?" | free text (up to 1,000 characters) |
| `settingsCheck.q1` … `q7` | The settings check; see section 5 | see section 5 |

### Task outcomes: `taskOutcome.t1` … `t10`

Computed when the participant taps **Done** on a task. They show whether the task was actually completed, not just whether Done was tapped.

| Field | Meaning | Values |
|---|---|---|
| `t1.done` | Set a store that has oat milk | `true` / `false` |
| `t1.storeId` | Store chosen | see store IDs (section 6); `null` if none |
| `t1.usedZipSearch` | Searched by ZIP (happens after refusing location) | `true` / `false` |
| `t1.storesViewed` | Most ZIP results shown | `0`, `6`, or `24` (after "Show 18 more") |
| `t1.msToFind` | Visible ms from first opening Find a store to setting a store | number; `null` if no store set. Unreliable if the page reloaded in between |
| `t2.done` | Ordered both items **and** answered the "Let Sam know" prompt | `true` / `false` |
| `t2.ordered`, `t2.samNotified` | Each half of Task 2 (before 0.19.0, `t2.done` was the order alone and `t3.samNotified` the Sam prompt) | `true` / `false` |
| `t4.done` | Saved at least two deals | `true` / `false` |
| `t4.dealsSaved` | Deals saved at that moment | `0`–`4` |
| `t5.done`, `t5.deliveryRedeemed` | Redeemed free delivery with points | `true` / `false` |
| `t6.done`, `t6.addressMatches` | Saved address is "40 Oak Street" (case, spacing, "St" and punctuation ignored) | `true` / `false` |
| `t7.done`, `t7.healthAnswered` | Answered the health-data prompt (any answer) | `true` / `false` |
| `t8.done` | Finished the workout and answered the "Let Sam know" prompt | `true` / `false` |
| `t8.workoutDone`, `t8.samNotified` | Each of the two | `true` / `false` |
| `t9.done`, `t9.plansSaved` | Saved at least two plans; how many | `true` / `false`; `0`–`4` |
| `t10.done`, `t10.reportUnlocked` | Unlocked the premium sleep report with coins | `true` / `false` |

### `appState`: Bramble as the participant left it

(The name predates Stride; Stride's state is `strideState`, below.)

Saved about every 0.3 s while using the app, and at the end of each task.

| Field | Meaning | Values |
|---|---|---|
| `appState.flows.<flowId>` | **Current** value of each of the 14 flows, including Account-page changes | see section 3; `null` = never set, or not applicable |
| `appState.shown` | Flows whose prompt or control has appeared | list of flow IDs |
| `appState.settled` | Flows whose **first choice** is fixed | list of flow IDs |
| `appState.points` | Points balance | starts at `150`; −100 for free delivery; +200 / +100 / +150 for accepted offers |
| `appState.deliveryRedeemed` | Redeemed free delivery | `true` / `false` |
| `appState.storeId` | Current store | store ID or `null` |
| `appState.cart` | Items in the cart now | list of product IDs (section 6) |
| `appState.order` | Order status | `none` → `placed` → `packed` → `on_the_way` → `delivered` |
| `appState.orderItems` | Items in the placed order | list of product IDs |
| `appState.orderPlacedAt` | Phone clock when the order was placed (delivery times shown are worked out from it) | epoch ms, or `null` |
| `appState.orderTrackingStarted` | Orders has been opened since ordering; the timeline only runs after this | `true` / `false` |
| `appState.orderElapsedMs` | Visible ms of order tracking so far (pauses while the app is closed or hidden) | number |
| `appState.orderOnTheWayAtMs` | `orderElapsedMs` when the order went On the way | number, or `null` |
| `appState.savedDeals` | Deals saved (hearted) | list of deal IDs (section 6) |
| `appState.address` | Delivery address, reduced to one of three values so a typed real address is never stored | `12 Birch Lane, Apt 3` (practice address, unchanged) · `40 Oak Street` (Task 6 done) · `other` (they saved something else) |
| `appState.storeSearch.usedZipSearch` | Searched by ZIP. The ZIP itself is never stored | `true` / `false` |
| `appState.storeSearch.storesViewed` | Most ZIP results shown without searching | `0`, `6`, `24` |
| `appState.storeSearch.firstVisitMs` | Visible-clock time of first visit to Find a store | number or `null` |
| `appState.storeSearch.msToFind` | See `t1.msToFind` | number or `null` |
| `appState.accountPageVisits` | Times the Account tab was opened | `0`, `1`, … |
| `appState.accountPageMs` | Total visible ms on the Account page | number |
| `appState.screen` | Screen open when last saved | `shop` · `find_store` · `checkout` · `orders` · `deals` · `rewards` · `account` |

### `strideState`: Stride as the participant left it

The same engine fields as `appState` (`flows`, `shown`, `settled`, `points`, `accountPageVisits`, `accountPageMs`, `screen`), for Stride's flows, plus:

| Field | Meaning | Values |
|---|---|---|
| `strideState.flows.<flowId>` | **Current** value of each of the 15 Stride flows, including Profile-page changes | section 3b; `null` = not answered or not applicable |
| `strideState.points` | Coin balance | starts at `150`; −100 for the sleep report; +200 / +100 / +150 for accepted offers |
| `strideState.accountPageVisits`, `accountPageMs` | Visits to and visible ms on the **Profile** page (Stride's settings page) | numbers |
| `strideState.workout` | Guided workout phase | `none` → `warm_up` → `main_set` → `cool_down` → `done` |
| `strideState.workoutElapsedMs` | Visible ms since Start workout (pauses while hidden) | number |
| `strideState.workoutMainSetAtMs`, `workoutCoolDownAtMs` | `workoutElapsedMs` when those phases began | number or `null` |
| `strideState.savedPlans` | Plans saved (hearted) | list of: `run_5k` · `sleep_yoga` · `strength` · `walking` |
| `strideState.reportUnlocked` | Unlocked the premium sleep report | `true` / `false` |
| `strideState.screen` | Screen open when last saved | `today` · `workout_setup` · `workout` · `plans` · `rewards` · `profile` |

**Workout timeline** (the counterpart of Bramble's order): warm-up for 8 s, then the main set, where the two workout prompts (#5′, #6′) appear. Cool-down starts once both are answered and at least 12 s of the main set have passed; 4 s later the workout is done, and "Keep heart-rate monitoring on all day?" (#7′) appears if background heart rate was allowed, followed by the community-map prompt (G2).

---

## 2. `participants/{uid}/events/{id}`: one document per event

Append-only: once written, an event can't be changed or deleted by the participant. **The emulator UI lists events by random ID, not by time.** Sort by `pageLoadAt`, then `seq`, or use `events.csv`, which is already sorted.

### Fields on every event

| Field | Meaning | Values |
|---|---|---|
| `type` | Kind of event | `prompt_shown` · `decision` · `settled` · `screen` · `task` · `action` · `points` · `stage` · `visibility` · `resume` · `error` |
| `pageLoadAt` | Phone clock when this page load began; goes up with every reload | epoch ms |
| `seq` | Event number within this page load | `1`, `2`, `3`, … |
| `clientTime` | Phone clock when the event happened (even if it reached the server later) | epoch ms |
| `t` | When the server received it | server time |
| `clientT` | ms since this page load, on the phone | number (restarts after a reload) |
| `taskId` | Task in progress | `1`–`10`, or `null` outside a task (consent, surveys, ease ratings, the second app's intro) |
| `app` | Practice app the event happened in | `bramble` · `stride`, or `null` outside the apps |
| `screen` | App screen open at the time | screen ID (section 1, `appState.screen`) or `null` before the app opens |

### Flow events: the core measures

| Type | When | Extra fields |
|---|---|---|
| `prompt_shown` | A flow's prompt or control first comes on screen (once per page load; at least half of it must be visible) | `flowId`; `defaultShown`: the preset value (e.g. `share` in nudged), or `null` if nothing was preset |
| `decision` | Every tap that changes a flow, including each switch toggle | `flowId`; `value` (new value); `previous` (value before the tap, `null` if none); `defaultShown`; `source`: `prompt` (on the app screen, including taps before it settles), `rewards_page` (changing an answered offer with its **Change** button) or `account_page`; `msSincePrompt`: visible ms since `prompt_shown` (`null` for changes after settling); `pointsBefore`: balance at the moment of choosing |
| `settled` | The flow's **first choice** is fixed (see "When flows settle" below). Happens at most once per flow | `flowId`; `value`: the first choice; `defaultShown`; `changedFromDefault`: `true` if a preset existed and they moved off it, `false` otherwise (always `false` when there was no preset); `msSincePrompt`: visible ms from appearing to settling; `toggleCount`: taps on this flow before it settled, in this page load (1 for a one-tap prompt; 0 for a preset switch never touched) |

**When flows settle**

| Flows | Settles when |
|---|---|
| #1 location, #5–#7 background and Sam, #10–#12 offers | The tap itself |
| #2 precise location | #1 is answered with an Allow (if #1 is "Don't allow", #2 never settles: not applicable) |
| #3 courier, #4 partner-offers box | Place order |
| #8, #9 Deals settings | Leaving the Deals screen, or tapping Done on the task |

### Other events

| Type | Extra fields and values |
|---|---|
| `screen` | `from`, `to`: screen IDs; `via`: `tap` (tab, button or link) or `back` (the ‹ button or the phone's Back); `loadingMs`: how long the loading placeholder shows before the screen (`250` or `400`) |
| `task` | `event`: `start` (with `task`, `position` 1–9; 1–10 before 0.19.0) · `unfinished_check` (tapped Done before the task's goal was met; `task`) · `unfinished_answer` (`task`, `finished`: `false` = "Keep going"; `true` = "I'm done with this task", which only demo links offer from 0.17.0) · `goal_met` (the task's goal was first reached, and the "Task complete" strip appeared; `task`; from 0.17.0) · `app_intro` (opened the second app from its introduction page; `app`) · `app_setup` (finished an app's first-run setup; `app`, `picked`: how many grocery categories (Bramble) or whether a goal was chosen (Stride). The picks themselves stay on the phone and are never stored; from 0.19.0) · `app_opened` (tapped the task's app on the home screen; `app`; from 0.19.0) · `home_tap` (tapped any other home-screen icon; `target`: its name) · `reopen` (tapped the task bar to reread; `task`) · `finish` (tapped Done, or Next task once the goal was met; `task`, `position`, `outcome`: same object as `taskOutcome.tN`) · `ease` (`task`, `value` 1–7) |
| `action` | `name`, one of: `phone_back` (`handled`: `true` if it moved back a screen, `false` if there was nowhere to go, a prompt was open, or the participant was outside the app, e.g. in a survey) · `map_shown` (`kind`: `real` (street map) or `drawn` (fallback on phones that can't show it); logged when the nearby-stores map appears) · `map_moved` (`gesture`: `drag` or `zoom`; one per gesture, only ones the participant made) · `map_recentered` (tapped the recenter button) · `store_card_opened` (`storeId`; `via`: `pin` on the map or `list`) · `store_search` (`item`: `oat_milk` / `sourdough` / `null` for a store-name search; `results`: number of stores shown; `unmatched`: `true` if nothing matched, so every store was shown (from 0.17.0); the typed text is not logged) · `store_set` (`storeId`, `hasOatMilk`) · `zip_search` (no ZIP stored) · `zip_show_more` · `cart_add` / `cart_remove` (`productId`) · `order_placed` (`items`: product IDs; `freeDelivery`: `true`/`false`) · `order_status` (`step`: `packed`, `on_the_way` or `delivered`) · `deal_toggled` (`dealId`, `saved`: `true` = hearted, `false` = un-hearted) · `delivery_redeemed` · `address_saved` (`matches`: `true`/`false`; the typed text is not logged) · `notification` (`id`: `order_packed`, `order_on_the_way`, `order_delivered`, `sam_reply` or, in Stride, `workout_saved`; an in-app banner appeared, from 0.19.0. Never while a prompt is open; order banners are skipped while Orders is on screen) |
| `points` | `amount` (`+200`, `+100`, `+150`, their negatives, or `-100`); `pointsBefore`; and either `flowId` with `reason` `offer_accepted` (first answer) or `offer_changed` (an answered offer changed, on the Rewards card or the settings page), or `reason: redeem_delivery` (Bramble) / `unlock_report` (Stride). In Stride the amounts are coins. Points always match the current answers, so accepting and then unlinking earns nothing |
| `stage` | Moving through the study. Either `from` / `to` (stage names), or `name` with details: `entry` (`mode`: `study` / `pilot` / `demo`) · `device_check` (`passed`) · `consent` (`agreed`, `version`) · `sus_submitted` · `suspicion_submitted` · `settings_check_submitted` |
| `visibility` | `state`: `hidden` (left the browser, locked the phone) · `visible` (came back) |
| `resume` | Page reopened mid-study; `stage`: where they resumed |
| `error` | `where`: `window` · `promise` · `render` · `assign` (level assignment failed, usually a lost connection); `message`; `stack` (render errors only) |

---

## 3. Bramble's 14 flows: IDs and values

Flows #13 (`save_card`) and #14 (`birthday_deals`) were added in 0.11.0 to cover the financial and demographic categories. They use practice values only (a practice Visa ending 4242, a practice birthday of May 14), never the participant's own.

The first value listed shares more; ★ marks the option that shares least (`privacyOption`).

**Friction varies within each participant, by decision screen.** Bramble's 14 flows sit on six decision screens ("units"). Each participant gets three units nudged and three neutral (their `pattern`), so no screen mixes the two levels:

| Unit | Screen | Flows |
|---|---|---|
| `U1` | Location prompt (Find a store) | #1, #2 |
| `U2` | Checkout | #3, #4, #13 |
| `U3` | Order tracking | #5, #6 |
| `U4` | "Keep background location on?" (on delivery) | #7 |
| `U5` | Deals settings | #8, #9, #14 |
| `U6` | Rewards offers | #10, #11, #12 |

**The same pattern applies in both apps:** Stride has the same six units (section 3b), so a participant's nudged units are nudged in Bramble and in Stride, and each matched pair of flows is always at the same level for that person.

The two levels follow Utz et al. (2019), *(Un)informed Consent*: **nudged** highlights only the sharing option (every other option looks like a neutral button) and pre-checks settings; **neutral** shows all options alike and leaves settings unchecked (off).

| # | `flowId` | Task | Values | Nudged preset or emphasis | Neutral |
|---|---|---|---|---|---|
| 1 | `store_location` | 1 | `once` (Allow Once) · `while_using` (Allow While Using App) · `dont_allow` (Don't Allow) ★ | "Allow While Using App" filled | 3 equal buttons |
| 2 | `store_precise` | 1 | `exact` · `general` ★ | switch starts `exact` (on) | switch starts `general` (off) |
| 3 | `courier_live` | 2 | `share` · `dont_share` ★ | switch starts `share` (on) | switch starts `dont_share` (off) |
| 4 | `checkout_partner_offers` | 2 | `checked` · `unchecked` ★ | box starts `checked` | box starts `unchecked` |
| 5 | `bg_during_order` | 3 | `allow` (Allow) · `not_now` (Don't Allow) ★ | "Allow" filled | equal buttons |
| 6 | `sam_share` | 3 | `live_location` · `arrival_only` ★ | "Share my live location" filled | equal buttons |
| 7 | `bg_between_orders` | 3 | `keep_on` (Change to Always Allow) · `turn_off` (Keep Only While Using) ★ | "Change to Always Allow" filled | equal buttons |
| 8 | `deals_personalized` | 4 | `on` · `off` ★ | switch starts `on` | switch starts `off` |
| 9 | `deals_partner_offers` | 4 | `on` · `off` ★ | switch starts `on` | switch starts `off` |
| 10 | `reward_keel` | 5 | `accept` (Accept, +200 pts) · `decline` (Decline) ★ | "Accept" filled | equal buttons |
| 11 | `reward_university` | 5 | `accept` (Accept, +100 pts) · `decline` (Decline) ★ | "Accept" filled | equal buttons |
| 12 | `reward_data_partners` | 5 | `accept` (Accept, +150 pts) · `decline` (Decline) ★ | "Accept" filled | equal buttons |
| 13 | `save_card` | 2 | `checked` · `unchecked` ★ | box starts `checked` | box starts `unchecked` |
| 14 | `birthday_deals` | 4 | `on` · `off` ★ | switch starts `on` | switch starts `off` |

**Dependent flows:** #2 applies only if #1 is not `dont_allow`. #7 applies only if #5 is `allow`. Otherwise they're `null` and never settle.

**Where the prompt appears:** a flow appears the first time the participant reaches its screen, whatever task they're on. The `taskId` on its events says which task that was. #5 and #6 appear only once the order is **On the way**, about 15 s of tracking after Orders is first opened. #7 appears on delivery.

---

### GKC-CI coding of the 14 flows

Each flow is also described as a Contextual Integrity information flow, with the transmission principle split into Institutional Grammar parts (GKC-CI). The coding lives in `src/bramble/ci.ts` and the `ci` field of each flow in `src/bramble/flows.ts`. It is the same in both levels: the manipulation changes only the **consent form**.

| # | `flowId` | Sender → Recipient (type) | Information (category: attribute, granularity, temporality, identifiability) | Aim | Condition | Temporal | Points | Consent form: nudged / neutral |
|---|---|---|---|---|---|---|---|---|
| 1 | `store_location` | participant → bramble (first party) | digital_activity: location, unspecified, point_in_time, identified | find_stores | with_permission | once_or_while_using | 0 | nudged_choice / active_choice |
| 2 | `store_precise` | participant → bramble (first party) | digital_activity: location, exact, point_in_time, identified | find_stores | with_permission | once_or_while_using | 0 | opt_out / opt_in |
| 3 | `courier_live` | participant → courier (service provider) | digital_activity: location, exact, continuous, identified | courier_handoff | with_consent | until_delivery | 0 | opt_out / opt_in |
| 4 | `checkout_partner_offers` | bramble → partner_brands (third party, commercial) | demographic: home_address, exact, static, identified | marketing_offers | with_consent | ongoing | 0 | opt_out / opt_in |
| 5 | `bg_during_order` | participant → bramble (first party) | digital_activity: location, exact, continuous, identified | accurate_arrival_time | with_permission | while_order_active | 0 | nudged_choice / active_choice |
| 6 | `sam_share` | participant → housemate_sam (personal) | digital_activity: location, exact, continuous, identified | coordinate_with_housemate | with_consent | until_delivery | 0 | nudged_choice / active_choice |
| 7 | `bg_between_orders` | participant → bramble (first party) | digital_activity: location, exact, continuous, identified | speed_up_future_orders | with_permission | ongoing | 0 | nudged_choice / active_choice |
| 8 | `deals_personalized` | bramble → bramble_deals (first party, secondary use) | digital_activity: location_history, exact, historical, identified | personalized_deals | with_consent | ongoing | 0 | opt_out / opt_in |
| 9 | `deals_partner_offers` | bramble → partner_brands (third party, commercial) | digital_activity: location_history, exact, historical, identified | marketing_offers | with_consent | ongoing | 0 | opt_out / opt_in |
| 10 | `reward_keel` | bramble → keel_auto_insurance (third party, commercial) | digital_activity: location_history, exact, historical, identified | insurance_pricing | with_consent_for_payment | ongoing | 200 | nudged_choice / active_choice |
| 11 | `reward_university` | bramble → university_traffic_lab (third party, research) | digital_activity: location_history, exact, historical, deidentified | research | with_consent_for_payment | ongoing | 100 | nudged_choice / active_choice |
| 12 | `reward_data_partners` | bramble → data_partners (third party, commercial) | digital_activity: location_history, exact, historical, identified | market_research | with_consent_for_payment | ongoing | 150 | nudged_choice / active_choice |
| 13 | `save_card` | participant → bramble (first party) | financial: payment_card, exact, static, identified | faster_checkout | with_consent | ongoing | 0 | opt_out / opt_in |
| 14 | `birthday_deals` | participant → bramble_deals (first party, secondary use) | demographic: birthday, exact, static, identified | birthday_offers | with_consent | ongoing | 0 | opt_out / opt_in |

Subject is always the participant. **Information categories** follow Matt's list: `health` (Medical and Health), `financial`, `demographic` (Demographic and Biographical), `communication` (Communal and Communicative), `digital_activity` (Digital Activity and Behavioral, which includes location tracking), `biometric` (Biometrical and Physical). Within a category, `attribute` says what is shared, and `granularity` (exact / approximate / unspecified), `temporality` (point_in_time / continuous / historical / static) and `identifiability` (identified / deidentified) describe it. **Consent forms** (worked out from each level's settings, so they always match the app):
- `opt_out`: sharing is preset; the participant must act to stop it
- `opt_in`: not sharing is preset; the participant must act to share
- `nudged_choice`: no preset, but the sharing option is emphasized
- `active_choice`: no preset, equal options

Each flow also has a one-sentence `statement` for codebooks. If the Part 2 questionnaire is coded with different terms, change the vocabularies in `ci.ts` so both sides match.

---

## 3b. Stride's 15 flows

The first 12 mirror Bramble; three more (G1–G3) are Stride-only gamified flows.

Each matched Stride flow mirrors a Bramble flow (its `counterpart`): same unit, kind, settling rule, recipient type, consent condition, points, option positions and (for prompts) option wording, with health or biometric information instead of location. Labels are identical in both levels; the levels work exactly as in Bramble. ★ = privacy option.

| Unit | `flowId` | Task | Values | Counterpart | Nudged | Neutral |
|---|---|---|---|---|---|---|
| U1 | `stride_health_access`: "Allow “Stride” to read your heart rate, sleep and activity?" | 7 | `once` · `while_using` · `dont_allow` ★ (same buttons as #1) | `store_location` | "Allow While Using App" filled | 3 equal buttons |
| U1 | `stride_health_detail`: "Detailed" ("When detailed data is off, Stride can access only your daily summaries"); applies only if access is not `dont_allow` | 7 | `detailed` · `summary` ★ | `store_precise` | switch on | switch off |
| U2 | `stride_coach_live`: live heart rate with coach Maya during workouts | 8 | `share` · `dont_share` ★ | `courier_live` | switch on | switch off |
| U2 | `stride_partner_offers`: partner offers based on workouts | 8 | `checked` · `unchecked` ★ | `checkout_partner_offers` | box checked | box unchecked |
| U3 | `stride_bg_workout`: "Keep your workout stats accurate?" (background heart rate) | 8 | `allow` (Allow) · `not_now` (Don't Allow) ★ | `bg_during_order` | "Allow" filled | equal buttons |
| U3 | `stride_sam_share`: "Let Sam know" (live workout vs summary) | 8 | `live_workout` · `summary_only` ★ | `sam_share` | "Share my live workout" filled | equal buttons |
| U4 | `stride_hr_all_day`: "Keep heart-rate monitoring on all day?"; applies only if #5′ is `allow` | 8 | `keep_on` (Change to Always Allow) · `turn_off` (Keep Only While Using) ★ | `bg_between_orders` | "Change to Always Allow" filled | equal buttons |
| U5 | `stride_plans_personalized`: "Plans picked for you" (heart-rate and sleep history) | 9 | `on` · `off` ★ | `deals_personalized` | switch on | switch off |
| U5 | `stride_plans_partner_offers`: partner offers from health history | 9 | `on` · `off` ★ | `deals_partner_offers` | switch on | switch off |
| U6 | `stride_reward_insurer`: Keel Health Insurance, wellness discount | 10 | `accept` (Accept, +200 coins) · `decline` ★ | `reward_keel` | "Accept" filled | equal buttons |
| U6 | `stride_reward_university`: university sleep study, de-identified | 10 | `accept` (Accept, +100 coins) · `decline` ★ | `reward_university` | "Accept" filled | equal buttons |
| U6 | `stride_reward_data_partners`: Stride data partners, market research | 10 | `accept` (Accept, +150 coins) · `decline` ★ | `reward_data_partners` | "Accept" filled | equal buttons |

**Gamified flows (G1–G3, added in 0.15.0).** Stride-only, so `counterpart` is empty; each has a `nudgeType`. They pay no coins, so the bonus stays matched to Bramble. The framing (streak, friend count, tier) is part of the flow and the same in both levels; only emphasis differs, as for every prompt. All numbers are fixed and the same for everyone. Rationale and sources: `docs/superpowers/specs/2026-10-13-stride-gamified-nudges.md`.

| Unit | `flowId` | `nudgeType` | Task | Where and what | Values | Nudged | Neutral |
|---|---|---|---|---|---|---|---|
| U1 | `stride_streak_autosync` (G1): "3-day streak. Don’t lose it" / "Let Stride count your steps in the background, so days you forget to open the app still count." Applies only if health access is not `dont_allow` | `streak` | 7 | Sheet on Today, right after health data syncs | `keep_streak` (Keep My Streak) · `not_now` (Not Now) ★ | "Keep My Streak" filled | equal buttons |
| U4 | `stride_community_map` (G2): "Share this workout’s route and heart rate?" / "8 of your 12 friends share their workouts on the Stride community map, where anyone on Stride can see them." | `social_proof` | 8 | Sheet on Workout complete, after #7′ (or straight away if #7′ doesn't apply) | `share` (Share to Community) · `keep_private` (Keep Private) ★ | "Share to Community" filled | equal buttons |
| U6 | `stride_gold_tier` (G3): "You’re 40 points from Gold" / "Connect your sleep tracker to reach Gold and unlock premium plans." Status points are not coins | `status` | 10 | Silver → Gold card on Rewards, above the offers | `reach_gold` (Reach Gold) · `not_now` (Not Now) ★ | "Reach Gold" filled | equal buttons |

None of them is needed to finish its task: declining or not answering never triggers the unfinished-task check, and `t7`, `t8`, `t10` are unchanged.

**CI coding:** every Stride flow is `informationCategory: health`. (A Face Unlock flow, `biometric`, was dropped in 0.14.0 as unrealistic and unmatched.) Attributes: `health_metrics` (#1′, #2′), `heart_rate` (#3′, #5′, #7′), `activity_history` (#4′, #12′), `workout` (#6′), `health_history` (#8′, #9′, #10′), `sleep_history` (#11′ de-identified; G3), `step_count` (G1), `workout_route` (G2, recipient type `public`). The full coding is in `flow-codebook.csv` and `src/stride/flows.ts`.

**One difference from Bramble:** declining health access costs nothing extra (Bramble's location refusal leads to a ZIP search). Asking people to type health numbers by hand would invite real data, so Stride shows "Health data is off" instead.

---

## 4. Other collections

| Document | Fields | Meaning |
|---|---|---|
| `pids/{prolificPid}` | `uid`, `createdAt` | Which browser login claimed this Prolific ID. Stops a second attempt from another browser |
| `meta/assignment` | one count per **cell** (pattern × app order), e.g. `U1U3U5B: 4` (Bramble first) or `U1U3U5S: 3` (Stride first) | How many people have each cell (including people who later dropped out). New participants get the least-used of the 40 cells, which balances the screens nudged, the app order, and their crossing |

Pilot runs use `pilot_pids` and `pilot_meta`.

---

## 5. Settings check answers (`settingsCheck`)

| Q | Question (short) | Values |
|---|---|---|
| `q1` | Apps used at least monthly (choose all) | list of: `grocery_delivery` · `maps` · `weather` · `ride_hailing` · `none` (`none` can't be combined) |
| `q2` | Location setting of their most-used grocery/food app | `never` · `ask_next_time` · `while_using` · `always` · `couldnt_find` · `dont_use_one` |
| `q3` | Precise location on for that app | `on` · `off` · `couldnt_find` |
| `q4` | Any app allowed location all the time | `yes` · `no` · `not_sure` |
| `q5` | Personalized ads on | `on` · `off` · `couldnt_find` |
| `q6` | Browser "don't sell or share" setting (e.g. Global Privacy Control) | `yes` · `no` · `dont_know` |
| `q7` | Changed any setting while answering | `yes` · `no` |

---

## 6. Fixed IDs used in the app

| Kind | IDs |
|---|---|
| Simulated location | A residential street in Clintonville, Columbus, Ohio, the same for everyone (`src/bramble/mapConfig.ts`). Nothing comes from the participant's phone |
| Stores (nearby, with location on, nearest first) | `cedar-plaza` (0.3 mi, no oat milk) · `riverside` (0.6 mi, no) · `elm` (0.9 mi, in stock) · `north-gate` (1.4 mi, no) · `harbor-point` (2.1 mi, in stock). With general area only, distances show as "about 1 mi" / "about 2 mi" |
| Stores in the participant's own area (from 0.19.0, when the US map is set up) | `r1` … `r24`: the 1st … 24th nearest real supermarket to their ZIP. Nearby list: `r1`–`r5`; ZIP list: all of them, A to Z. Oat milk is in stock at `r3`, `r5` and `r12` only. **The store names and the ZIP are never stored**, so `r3` says nothing about where the person lives. The `area` stage event says which applied (`kind`: `participant` or `default`) |
| Stores (ZIP list, 24 A–Z) | `alder-road`, `bay-street`, `cedar-plaza`, `dover-avenue`, `elm`, `fenwick-commons`, `garden-row`, `harbor-point`, `ivy-lane`, `juniper-court`, `kestrel-way`, `linden-square`, `maple-crossing`, `north-gate`, `orchard-hill`, `pine-street`, `quarry-road`, `riverside`, `spruce-avenue`, `tanner-mill`, `union-place`, `vale-street`, `willow-park`, `york-commons`. Oat milk is in stock only at `elm`, `harbor-point` and `maple-crossing` |
| Products | `oat_milk` · `sourdough` · `apples` · `yogurt` · `eggs` · `bananas` |
| Deals | `oat_milk` · `apples` · `sourdough` · `yogurt` |

---

## 7. Export CSVs (`npm run export`)

Every row uses a **study code** (`P001`, `P002`, … or `PL001`, … for pilots) instead of the Prolific ID. Codes go in order of arrival. Withdrawn participants are left out.

### `flows.csv`: one row per participant × flow (29 rows each: 14 Bramble, 15 Stride). The main Experiment 2 table

Only participants who were assigned a level have rows.

| Column | Meaning | Values |
|---|---|---|
| `studyCode`, `flowId`, `app`, `counterpart`, `unit` | Who, which flow, its app, its matched flow in the other app, and its decision screen | `P001`…; flow ID; `bramble` / `stride`; flow ID or empty; `U1`–`U6` |
| `nudgeType` | The gamified framing of a Stride-only flow | `streak` · `social_proof` · `status`; empty for every matched flow |
| `friction` | This flow's level **for this person** (from their pattern and the flow's unit) | `nudged` / `neutral` |
| `expectedTask` | The task the flow belongs to | `1`–`10` |
| `consentForm` | How consent was asked for this person (their level) | `opt_out` · `opt_in` · `nudged_choice` · `active_choice` |
| `ci_sender`, `ci_recipient`, `ci_recipientType`, `ci_subject`, `ci_informationCategory`, `ci_attribute`, `ci_granularity`, `ci_temporality`, `ci_identifiability`, `ci_aim`, `ci_condition`, `ci_temporal`, `ci_points` | The flow's GKC-CI parameters (same for everyone; section 3) | see section 3 |
| `taskId` | Task actually in progress when it settled | `1`–`10`, or empty |
| `status` | What happened | `chosen` (first choice recorded) · `not_applicable` (#2 after refusing location; #7 after refusing background location) · `shown_not_settled` (saw it but never committed, e.g. opened checkout and never ordered) · `not_shown` (never reached that screen) |
| `firstChoice` | Value when it settled: **the behavior measure** | flow value, or empty |
| `finalValue` | Value at the end, after any Account-page changes | flow value, or empty |
| `privacyOption` | That flow's least-sharing option | flow value |
| `firstChoiceIsPrivacy` | `firstChoice` = `privacyOption` | `true` / `false` / empty |
| `firstVerdict`, `finalVerdict` | First and final choice mapped to the battery's responses, as the pipeline specifies: Allow / Allow while using → `allow`; Allow once → `ask`; Don't allow / unchecked / any least-sharing option → `block` | `allow` · `ask` · `block` · empty |
| `defaultShown` | Preset when it appeared | flow value, or empty (no preset) |
| `changedFromDefault` | Moved off a preset | `true` / `false` / empty |
| `msSincePrompt` | Decision time: visible ms from appearing to settling | number |
| `toggleCount` | Taps on the flow (on the app screen) up to settling, across reloads | `0`, `1`, … (high values suggest "testing" rather than "using") |
| `changedLater` | Changed at all after the first choice was fixed (Rewards **Change** button, or the Account / Profile page) | `true` / `false` |
| `changedOnAccountPage` | Changed later on the app's settings page (Bramble's Account, Stride's Profile) | `true` / `false` |

### `participants.csv`: one row per participant

Includes everyone who arrived, also people who declined consent or failed the device check.

| Columns | Meaning |
|---|---|
| `studyCode`, `pilot`, `recruitment`, `appVersion`, `consentVersion`, `consentDeclined`, `pattern` (e.g. `U1U3U5`), `appOrder`, `nudgedUnits` (e.g. `U1;U3;U5`), `taskOrder` (e.g. `4-1-2-3-5-6-7-9-8-10`), `stage`, `completed` (`stage` = `done`) | Identity, assignment and progress |
| `os`, `screenW`, `screenH`, `passedDeviceCheck`, `deviceCheckSkipped`, `automated`, `userAgent`, `tzOffset`, `localStartHour`, `resumeCount` | Device and context |
| `createdAt`, `consentAt`, `completedAt`, `minutesToComplete` (consent → completion) | Timing |
| `ease_t1` … `ease_t10` | Ease ratings by task number |
| `sus_bramble_1` … `sus_bramble_10`, `susScore_bramble`, `sus_stride_1` … `sus_stride_10`, `susScore_stride` | SUS answers and the standard 0–100 score, per app |
| `suspicion` | Suspicion answer |
| `settings_q1` … `settings_q7` | Settings check (`q1` joined with `;`) |
| `t1_done` … `t10_done`, plus each task's details (`t1_storeId`, `t1_usedZipSearch`, …, `t7_healthAnswered`, `t8_workoutDone`, `t9_plansSaved`, `t10_reportUnlocked`) | Task outcomes |
| `bramblePoints`, `strideCoins`, `bonusUSD` (both balances ÷ 100, so 1 point = 1 cent), `deliveryRedeemed`, `reportUnlocked` | Balances and the bonus to pay: $1.00–$12.00 (before 0.17.0: ÷ 1,000) |
| `accountPageVisits`, `accountPageMs` (Bramble), `profilePageVisits`, `profilePageMs` (Stride), `taskCardReopens`, `mapShown` (`real` / `drawn`), `mapMoves`, `mapRecenters`, `timesHidden`, `errors`, `eventCount` | Behavior and data-quality flags (many map moves or settings-page visits suggest exploring like a tester) |

### `events.csv`: one row per event, sorted by time

`studyCode`, then every event field from section 2, in phone order (`pageLoadAt`, then `seq`). Lists are joined with `;`, and nested objects (such as a task `outcome`) are written as JSON.

### `flow-codebook.csv`: one row per flow (29 rows)

`flowId`, `app`, `counterpart`, `nudgeType`, `unit`, `unitScreen`, `expectedTask`, `screen`, `options`, `privacyOption`, `dependsOn`, `consentForm_nudged`, `consentForm_neutral`, `verdictMap` (e.g. `while_using=allow;once=ask;dont_allow=block`), the `ci_*` columns and `ci_statement`. Use it to match the site flows with the Part 2 questionnaire items.

### `prolific-bonuses.txt`: bonuses to paste into Prolific

One `<Prolific ID>,<amount>` line per Prolific participant who finished Part 1 with a bonus above $0 (both balances added). See `PROLIFIC.md`. Contains Prolific IDs: keep it as private as `id-map.csv`.

### `id-map.csv`: study code → Prolific ID

`studyCode`, `prolificPid`, `uid`. Use it to pay bonuses and link Part 1 with Part 2. **Keep it separate from the other files and off shared drives.**

---

## Quick checks when reading a participant

1. **Did they finish?** `stage` = `done` and `completedAt` is set.
2. **Which screens were nudged?** `pattern` (and `friction` on each row of `flows.csv`).
3. **What did they choose at each flow?** The `settled` events, or `flows.csv` → `firstChoice`.
4. **Did they change anything later?** `decision` events with `source: account_page`, or `flows.csv` → `changedOnAccountPage`; `appState.flows` gives the final values.
5. **Did they really do the tasks?** `taskOutcome.tN.done`.
6. **Data quality:** `resumeCount`, `timesHidden`, high `toggleCount`, `errors`, `device.passedCheck`, `suspicion`.

---

## 8. Agent episodes (Experiment 4)

An agent link starts a fresh episode with the same app, flows, defaults, emphasis and logging as participants:

```
/?agent=1&EPISODE_ID=ep_0007&nudged=U1-U5-U6&taskOrder=4-1-2-3-5-6-7-9-8-10
   &NAME=Riley&MODEL=…&CONDITION=transcript_only&RUN=2&PARTICIPANT=P012
```

- **Required:** `EPISODE_ID` (letters, digits, `_` or `-`); `nudged` (the nudged units, joined by `-`, e.g. `U1-U5-U6`, or `none` / `all`: normally the matched participant's pattern, or its mirror image to measure the agent's own nudge effect); `taskOrder` (all 9 tasks in their order, as two app blocks: Bramble 1, 2, 4, 5, 6 with 1 before 2 and 6 last; Stride 7–10 with 7 first; either app first).
- **Optional:** `NAME` (shown in the app greeting, the pipeline's "[name]"), `MODEL`, `CONDITION`, `RUN` and `PARTICIPANT` (the matched participant's study code).
- **What's skipped:** consent, the phone check, the name screen, task cards, ease ratings and all surveys. The harness gives each task's text; **Done** in the task bar is `finish_task`. After the tenth task the page shows "All tasks finished." The agent moves straight from the first app to the second, with no introduction page; the app order is the one `taskOrder` implies.
- **Nothing on screen** shows the pattern, the episode or that this is an agent run.
- **Data stays in the page; nothing goes to Firestore.** The harness reads it from `window.__brambleAgent`:
  - `apiVersion`: `1`
  - `episodeId`
  - `isDone()`
  - `getRecord()`: the same participant record as section 1, plus `agent: { episodeId, model, condition, run, participant }`, and with `device.automated` true
  - `getEvents()`: every event, in the section 2 format
- **Screen descriptions:** every decision button has `data-emphasis`: `primary` (the highlighted sharing option, nudged only) or `plain` (every other option; in neutral, all options). Switches use `aria-checked` and checkboxes `checked`. The harness's `get_screen` should report these (e.g. "primary", "ON") and never call anything a default.

---

## 9. Part 2 questionnaire and norming survey (`part2/{uid}`, `norming/{uid}`)

Design and item wording: `docs/superpowers/specs/2026-10-14-part2-questionnaire-design.md`; the wording itself is in `src/part2/items.ts`. Part 2 runs on a computer under a different anonymous uid from Part 1, so the export joins the two by Prolific ID. Pilot data goes to `pilot_part2` and `pilot_norming`; one record per Prolific ID is claimed in `part2_pids` / `norming_pids`.

### Record fields

| Field | Meaning | Values |
|---|---|---|
| `prolificPid`, `studyId`, `sessionId`, `recruitment` | As in Part 1 | |
| `variant` | Which survey | `part2` · `norming` |
| `stage` | Where they are | Part 2: `device` → `briefing` → `chat` → `filler` → `intro` → `practice` → `comprehension` → `items` → `recall` → `background` → `debrief` → `done` (from 0.18.0; before, `device` went straight to `intro` and `background` to `done`). Norming: `device` → `consent` → `intro` → … → `items` → `background` → `done` |
| `device` | As in Part 1; `passedCheck` means a computer (Part 2) or any device (norming) | |
| `sequence` | The page order, saved before the first item | list of `{kind: 'item', itemId, wording: 'A'/'B'}` or `{kind: 'attention', itemId}` (55 pages) |
| `answers.<slot>` | One answer per page, keyed `itemId:A`, `itemId:B` or `attention_1` / `attention_2` | `{itemId, wording, position, verdict: allow/ask/block, confidence: 1–5, ms, changes}` |
| `practice` | The unscored practice item | `{verdict, confidence}` |
| `comprehension` | "Which option means the app should check with you every time?" (correct: `ask`) | `{attempts: [...], passed}`; at most two attempts |
| `recall.<question>` | Part 2 only: what they remember choosing | the flow's own value (e.g. `once`, `arrival_only`, `accept`) or `dont_remember` |
| `background` | IUIPC (10 items, 1–7), age range, gender (optional), AI assistant use | `{iuipc: [..10], ageRange, gender, aiUse}` |
| `consentVersion` | Norming only | `norming-v1-draft` |
| `arm` | Part 2 only: the interview arm. **Written by the interviewer function only** (the rules refuse it from the browser), balanced across arms | `open` · `structured` · `case` (the case arm is assigned only once the case set T is filled in), or `null` before the chat |
| `interview` | Part 2 only: summary of the interview, also written only by the function. The transcript itself is in `part2_interviews` (below) | `{done, turns, participantTurns, participantChars, startedAt, endedAt, minutes}` (times in ms) |
| `filler` | Part 2 only: the word puzzle between the chat and the questionnaire | `{solved, attempted, ms}` (0–10 words) |
| `withdrawRequested` | Part 2 only: ticked "Please remove my data from the study" on the debrief. The export leaves the person out of every file, Part 1 included | `true` / `false` |
| `createdAt`, `chatStartedAt`, `startedItemsAt`, `debriefAt`, `completedAt` | Server timestamps (`chatStartedAt`, `debriefAt`: Part 2 only) | |

Events (`part2/{uid}/events`) use the same fields as Part 1, with types `stage`, `item` (`shown`, `answered`), `survey` (`comprehension`, `recall_submitted`, `background_submitted`, `filler_start`, `filler_done`, `debrief`), `chat` (`sent` with `chars` and `turn`; `reply` with `ms` and `done`; `error`; `continue`), `visibility`, `resume` and `error`. Chat events never contain what was typed: the text is only in the transcript.

### The interview (server-side)

The chat runs through the `interviewTurn` Cloud Function (`functions/src/`): the browser sends each message, and the function adds the interviewer's reply. Two collections are written by the function only; no security rule opens them, so no browser can read or change them:

- **`part2_interviews/{uid}`** (`pilot_part2_interviews`): the transcript **D**. `model` (`claude-sonnet-5-5`), `promptsVersion`, `createdAt`, `updatedAt`, and `state`: `{arm, domainIndex, domainStartedAt, startedAt, endedAt, done, turns}`. Each turn is `{role: interviewer/participant, text, domain: location/health, at (ms), source: fixed/model, model, caseId}`. `source: fixed` marks the scripted openers, cases and closing; `model` records which model wrote each reply (normally `claude-sonnet-5-5`; another model if a refusal fell back, `declined` if the fixed fallback line was used).
- **`part2_meta/arms`** (`pilot_part2_meta`): how many people have each arm, `{open, structured, case}`. The next person gets the least-used arm.

How the interview runs (all in `functions/src/interview.ts`, wording in `functions/src/prompts.ts`): location first, then health, each with a fixed opener and at most 7.5 minutes. The open arm gets up to three follow-ups per domain; the structured arm goes through the six coordinates (up to 10 answers); the case arm shows each case in T as fixed text, then up to three rounds on the inferred rule.

### Export CSVs

- **`verdicts.csv`** (main Part 2 table): one row per person × battery item (41 per person).
  - **Stated verdict:** `verdict`, `confidence`, `wording`, `position`, `ms` and `changes` are the first time the item was asked.
  - **Repeat:** `verdict2`, `confidence2` and `position2` are the repeat. `unstable` means the two verdicts differ; `uncertain` means both confidences were 1 or 2 (repeated items only).
  - **Site:** `siteFriction`, `siteStatus`, `siteFirstVerdict`, `siteFinalVerdict` and `sayDoAgree` come from the same person's row in `flows.csv` (site flows only).
- **`verdicts.csv`** also has `group`: the person's `arm`, or `norming` in `norming-verdicts.csv`. Stack the two files and use `group` for the elicitation-effect model.
- **`part2-participants.csv`:** one row per person. `studyCode` is their Part 1 code, or `X…` if no Part 1 record matches. It also has `arm`, `interviewDone`, `interviewMinutes`, `interviewParticipantTurns`, `interviewParticipantChars`, `fillerSolved`, `chatStartedAt`, `debriefAt`, `matchedToPart1`, `daysSincePart1`, `comprehensionPassed`, `attention_1_passed`, `attention_2_passed`, `attentionPassed`, `itemsAnswered`, `medianItemMs` and `minutesOnItems`. Each recall answer comes with `<question>_correct`, compared with the first choice on the site (empty for "I don't remember"). The background survey gives `iuipc_1`…`iuipc_10`, `iuipc_control`, `iuipc_awareness`, `iuipc_collection`, `ageRange`, `gender` and `aiUse`.
- **`norming-verdicts.csv`, `norming-participants.csv`:** the same tables for the norming sample. Study codes are `N001`…, and the site and recall columns are empty.
- **`battery-codebook.csv`:** one row per battery item, with `kind` (`site` / `held_out`), `domain`, `repeated`, both wordings, the `ci_*` columns, and for held-out items `nearestSiteFlow`, `distance` and `differsOn`.
- **`transcripts.jsonl`:** one interview per line, `{studyCode, arm, done, model, promptsVersion, turns: [{role, text, domain, at, source, model, caseId}]}`. The agents' input in Experiments 3 and 4. It's free text: participants are asked not to type identifying details, but read it before sharing.
- **`part2-id-map.csv`:** study code → Prolific ID for both samples. Private, like `id-map.csv`.

People who ticked `withdrawRequested` are left out of every file, Part 1's included (matched by Prolific ID).
