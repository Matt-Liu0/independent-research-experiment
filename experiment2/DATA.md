# Data dictionary: Experiment 2 (Part 1, Bramble site)

What every stored field means and the values it can take. It covers the Firestore records and the CSVs from `npm run export`.

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
| `appVersion` | App build the person saw | e.g. `0.1.0` (see `CHANGELOG.md`) |
| `consentVersion` | Version of the consent text agreed to | e.g. `v0-draft`; `null` before consent |
| `consentDeclined` | Tapped "I do not agree" | `true` / `false` |
| `friction` | Assigned level, set right after consent | `nudged` (high friction: sharing preset and emphasized) · `neutral` (low friction: nothing preset, equal buttons) · `null` before consent |
| `taskOrder` | Order the six tasks were shown in | list of 6 task numbers, e.g. `[4, 1, 2, 3, 5, 6]`; 3 always follows 2, and 6 is always last; `null` before consent |
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
| `stage` | Furthest stage reached | `device` → `consent` → `welcome` → `tasks` → `sus` → `suspicion` → `settings` → `done` |
| `taskIndex` | Position in `taskOrder` currently on | `0`–`5` (0 = first task shown) |
| `taskPhase` | Within that task | `doing` (using the app) · `rating` (ease question showing) |
| `createdAt` | Arrived from Prolific | server time |
| `consentAt` | Agreed to consent | server time; missing if never agreed |
| `completedAt` | Submitted the settings check, the last question | server time; missing if unfinished |

### Answers

| Field | Meaning | Values |
|---|---|---|
| `ease.t1` … `ease.t6` | "How easy was that task?", keyed by **task number** (not position) | `1` (very hard) – `7` (very easy) |
| `sus` | System Usability Scale, items 1–10 in standard order | list of 10 numbers, each `1` (strongly disagree) – `5` (strongly agree); `null` until submitted |
| `suspicion` | "In one sentence, what do you think this study is about?" | free text (up to 1,000 characters) |
| `settingsCheck.q1` … `q7` | The settings check; see section 5 | see section 5 |

### Task outcomes: `taskOutcome.t1` … `t6`

Computed when the participant taps **Done** on a task. They show whether the task was actually completed, not just whether Done was tapped.

| Field | Meaning | Values |
|---|---|---|
| `t1.done` | Set a store that has oat milk | `true` / `false` |
| `t1.storeId` | Store chosen | see store IDs (section 6); `null` if none |
| `t1.usedZipSearch` | Searched by ZIP (happens after refusing location) | `true` / `false` |
| `t1.storesViewed` | Most ZIP results shown | `0`, `6`, or `24` (after "Show 18 more") |
| `t1.msToFind` | Visible ms from first opening Find a store to setting a store | number; `null` if no store set. Unreliable if the page reloaded in between |
| `t2.done` | Ordered both oat milk and sourdough | `true` / `false` |
| `t3.done`, `t3.samNotified` | Answered the "Let Sam know" prompt | `true` / `false` |
| `t4.done` | Saved at least two deals | `true` / `false` |
| `t4.dealsSaved` | Deals saved at that moment | `0`–`4` |
| `t5.done`, `t5.deliveryRedeemed` | Redeemed free delivery with points | `true` / `false` |
| `t6.done`, `t6.addressMatches` | Saved address is "40 Oak Street" (case, spacing, "St" and punctuation ignored) | `true` / `false` |

### `appState`: the practice app as the participant left it

Saved about every 0.3 s while using the app, and at the end of each task.

| Field | Meaning | Values |
|---|---|---|
| `appState.flows.<flowId>` | **Current** value of each of the 12 flows, including Account-page changes | see section 3; `null` = never set, or not applicable |
| `appState.shown` | Flows whose prompt or control has appeared | list of flow IDs |
| `appState.settled` | Flows whose **first choice** is fixed | list of flow IDs |
| `appState.points` | Points balance | starts at `420`; −300 for free delivery; +200 / +100 / +150 for accepted offers |
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
| `taskId` | Task in progress | `1`–`6`, or `null` outside a task (consent, surveys, ease ratings) |
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
| `task` | `event`: `start` (with `task`, `position` 1–6) · `reopen` (tapped the task bar to reread; `task`) · `finish` (tapped Done; `task`, `position`, `outcome`: same object as `taskOutcome.tN`) · `ease` (`task`, `value` 1–7) |
| `action` | `name`, one of: `phone_back` (`handled`: `true` if it moved back a screen, `false` if there was nowhere to go, a prompt was open, or the participant was outside the app, e.g. in a survey) · `map_shown` (`kind`: `real` (street map) or `drawn` (fallback on phones that can't show it); logged when the nearby-stores map appears) · `map_moved` (`gesture`: `drag` or `zoom`; one per gesture, only ones the participant made) · `map_recentered` (tapped the recenter button) · `store_card_opened` (`storeId`; `via`: `pin` on the map or `list`) · `store_search` (`item`: `oat_milk` / `sourdough` / `null` for a store-name search; `results`: number of stores shown; the typed text is not logged) · `store_set` (`storeId`, `hasOatMilk`) · `zip_search` (no ZIP stored) · `zip_show_more` · `cart_add` / `cart_remove` (`productId`) · `order_placed` (`items`: product IDs; `freeDelivery`: `true`/`false`) · `order_status` (`step`: `packed`, `on_the_way` or `delivered`) · `deal_toggled` (`dealId`, `saved`: `true` = hearted, `false` = un-hearted) · `delivery_redeemed` · `address_saved` (`matches`: `true`/`false`; the typed text is not logged) |
| `points` | `amount` (`+200`, `+100`, `+150`, their negatives, or `-300`); `pointsBefore`; and either `flowId` with `reason` `offer_accepted` (first answer) or `offer_changed` (an answered offer changed, on the Rewards card or the Account page), or `reason: redeem_delivery`. Points always match the current answers, so accepting and then unlinking earns nothing |
| `stage` | Moving through the study. Either `from` / `to` (stage names), or `name` with details: `entry` (`mode`: `study` / `pilot` / `demo`) · `device_check` (`passed`) · `consent` (`agreed`, `version`) · `sus_submitted` · `suspicion_submitted` · `settings_check_submitted` |
| `visibility` | `state`: `hidden` (left the browser, locked the phone) · `visible` (came back) |
| `resume` | Page reopened mid-study; `stage`: where they resumed |
| `error` | `where`: `window` · `promise` · `render` · `assign` (level assignment failed, usually a lost connection); `message`; `stack` (render errors only) |

---

## 3. The 12 flows: IDs and values

The first value listed shares more; ★ marks the option that shares least (`privacyOption`).

The two levels follow Utz et al. (2019), *(Un)informed Consent*: **nudged** highlights only the sharing option (every other option looks like a neutral button) and pre-checks settings; **neutral** shows all options alike and leaves settings unchecked (off).

| # | `flowId` | Task | Values | Nudged preset or emphasis | Neutral |
|---|---|---|---|---|---|
| 1 | `store_location` | 1 | `while_using` (Allow while using) · `once` (Allow once) · `dont_allow` ★ | "Allow while using" filled | 3 equal buttons |
| 2 | `store_precise` | 1 | `exact` · `general` ★ | switch starts `exact` (on) | switch starts `general` (off) |
| 3 | `courier_live` | 2 | `share` · `dont_share` ★ | switch starts `share` (on) | switch starts `dont_share` (off) |
| 4 | `checkout_partner_offers` | 2 | `checked` · `unchecked` ★ | box starts `checked` | box starts `unchecked` |
| 5 | `bg_during_order` | 3 | `allow` · `not_now` ★ | "Allow in background" filled | equal buttons |
| 6 | `sam_share` | 3 | `live_location` · `arrival_only` ★ | "Share my live location" filled | equal buttons |
| 7 | `bg_between_orders` | 3 | `keep_on` · `turn_off` ★ | "Keep it on" filled | equal buttons |
| 8 | `deals_personalized` | 4 | `on` · `off` ★ | switch starts `on` | switch starts `off` |
| 9 | `deals_partner_offers` | 4 | `on` · `off` ★ | switch starts `on` | switch starts `off` |
| 10 | `reward_keel` | 5 | `accept` (+200 pts) · `decline` ★ | "Link" filled | equal buttons |
| 11 | `reward_university` | 5 | `accept` (+100 pts) · `decline` ★ | "Donate" filled | equal buttons |
| 12 | `reward_data_partners` | 5 | `accept` (+150 pts) · `decline` ★ | "Share" filled | equal buttons |

**Dependent flows:** #2 applies only if #1 is not `dont_allow`. #7 applies only if #5 is `allow`. Otherwise they're `null` and never settle.

**Where the prompt appears:** a flow appears the first time the participant reaches its screen, whatever task they're on. The `taskId` on its events says which task that was. #5 and #6 appear only once the order is **On the way**, about 15 s of tracking after Orders is first opened. #7 appears on delivery.

---

### GKC-CI coding of the 12 flows

Each flow is also described as a Contextual Integrity information flow, with the transmission principle split into Institutional Grammar parts (GKC-CI). The coding lives in `src/bramble/ci.ts` and the `ci` field of each flow in `src/bramble/flows.ts`. It is the same in both levels: the manipulation changes only the **consent form**.

| # | `flowId` | Sender → Recipient (type) | Information type | Aim | Condition | Temporal | Points | Consent form: nudged / neutral |
|---|---|---|---|---|---|---|---|---|
| 1 | `store_location` | participant → bramble (first party) | current_location | find_stores | with_permission | once_or_while_using | 0 | nudged_choice / active_choice |
| 2 | `store_precise` | participant → bramble (first party) | location_precision | find_stores | with_permission | once_or_while_using | 0 | opt_out / opt_in |
| 3 | `courier_live` | participant → courier (service provider) | live_location | courier_handoff | with_consent | until_delivery | 0 | opt_out / opt_in |
| 4 | `checkout_partner_offers` | bramble → partner_brands (third party, commercial) | home_address | marketing_offers | with_consent | ongoing | 0 | opt_out / opt_in |
| 5 | `bg_during_order` | participant → bramble (first party) | background_location | accurate_arrival_time | with_permission | while_order_active | 0 | nudged_choice / active_choice |
| 6 | `sam_share` | participant → housemate_sam (personal) | live_location | coordinate_with_housemate | with_consent | until_delivery | 0 | nudged_choice / active_choice |
| 7 | `bg_between_orders` | participant → bramble (first party) | background_location | speed_up_future_orders | with_permission | ongoing | 0 | nudged_choice / active_choice |
| 8 | `deals_personalized` | bramble → bramble_deals (first party, secondary use) | location_history | personalized_deals | with_consent | ongoing | 0 | opt_out / opt_in |
| 9 | `deals_partner_offers` | bramble → partner_brands (third party, commercial) | location_history | marketing_offers | with_consent | ongoing | 0 | opt_out / opt_in |
| 10 | `reward_keel` | bramble → keel_auto_insurance (third party, commercial) | location_history | insurance_pricing | with_consent_for_payment | ongoing | 200 | nudged_choice / active_choice |
| 11 | `reward_university` | bramble → university_traffic_lab (third party, research) | deidentified_location_history | research | with_consent_for_payment | ongoing | 100 | nudged_choice / active_choice |
| 12 | `reward_data_partners` | bramble → data_partners (third party, commercial) | location_history | market_research | with_consent_for_payment | ongoing | 150 | nudged_choice / active_choice |

Subject is always the participant. **Consent forms** (worked out from each level's settings, so they always match the app):
- `opt_out`: sharing is preset; the participant must act to stop it
- `opt_in`: not sharing is preset; the participant must act to share
- `nudged_choice`: no preset, but the sharing option is emphasized
- `active_choice`: no preset, equal options

Each flow also has a one-sentence `statement` for codebooks. If the Part 2 questionnaire is coded with different terms, change the vocabularies in `ci.ts` so both sides match.

---

## 4. Other collections

| Document | Fields | Meaning |
|---|---|---|
| `pids/{prolificPid}` | `uid`, `createdAt` | Which browser login claimed this Prolific ID. Stops a second attempt from another browser |
| `meta/assignment` | `nudged`, `neutral` | How many people have been assigned to each level (including people who later dropped out) |

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
| Stores (ZIP list, 24 A–Z) | `alder-road`, `bay-street`, `cedar-plaza`, `dover-avenue`, `elm`, `fenwick-commons`, `garden-row`, `harbor-point`, `ivy-lane`, `juniper-court`, `kestrel-way`, `linden-square`, `maple-crossing`, `north-gate`, `orchard-hill`, `pine-street`, `quarry-road`, `riverside`, `spruce-avenue`, `tanner-mill`, `union-place`, `vale-street`, `willow-park`, `york-commons`. Oat milk is in stock only at `elm`, `harbor-point` and `maple-crossing` |
| Products | `oat_milk` · `sourdough` · `apples` · `yogurt` · `eggs` · `bananas` |
| Deals | `oat_milk` · `apples` · `sourdough` · `yogurt` |

---

## 7. Export CSVs (`npm run export`)

Every row uses a **study code** (`P001`, `P002`, … or `PL001`, … for pilots) instead of the Prolific ID. Codes go in order of arrival. Withdrawn participants are left out.

### `flows.csv`: one row per participant × flow (12 rows each). The main Experiment 2 table

Only participants who were assigned a level have rows.

| Column | Meaning | Values |
|---|---|---|
| `studyCode`, `friction` | Who, and their level | `P001`…; `nudged` / `neutral` |
| `flowId`, `expectedTask` | Which flow, and the task it belongs to | section 3; `1`–`6` |
| `consentForm` | How consent was asked for this person (their level) | `opt_out` · `opt_in` · `nudged_choice` · `active_choice` |
| `ci_sender`, `ci_recipient`, `ci_recipientType`, `ci_subject`, `ci_informationType`, `ci_aim`, `ci_condition`, `ci_temporal`, `ci_points` | The flow's GKC-CI parameters (same for everyone; section 3) | see section 3 |
| `taskId` | Task actually in progress when it settled | `1`–`6`, or empty |
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
| `changedLater` | Changed at all after the first choice was fixed (Rewards **Change** button or Account page) | `true` / `false` |
| `changedOnAccountPage` | Changed later on the Account page specifically | `true` / `false` |

### `participants.csv`: one row per participant

Includes everyone who arrived, also people who declined consent or failed the device check.

| Columns | Meaning |
|---|---|
| `studyCode`, `pilot`, `recruitment`, `appVersion`, `consentVersion`, `consentDeclined`, `friction`, `taskOrder` (e.g. `4-1-2-3-5-6`), `stage`, `completed` (`stage` = `done`) | Identity, assignment and progress |
| `os`, `screenW`, `screenH`, `passedDeviceCheck`, `deviceCheckSkipped`, `automated`, `userAgent`, `tzOffset`, `localStartHour`, `resumeCount` | Device and context |
| `createdAt`, `consentAt`, `completedAt`, `minutesToComplete` (consent → completion) | Timing |
| `ease_t1` … `ease_t6` | Ease ratings by task number |
| `sus_1` … `sus_10`, `susScore` | SUS answers and the standard 0–100 score |
| `suspicion` | Suspicion answer |
| `settings_q1` … `settings_q7` | Settings check (`q1` joined with `;`) |
| `t1_done`, `t1_storeId`, `t1_usedZipSearch`, `t1_storesViewed`, `t1_msToFind`, `t2_done`, `t3_done`, `t3_samNotified`, `t4_done`, `t4_dealsSaved`, `t5_done`, `t5_deliveryRedeemed`, `t6_done`, `t6_addressMatches` | Task outcomes |
| `finalPoints`, `bonusUSD` (points ÷ 1,000), `deliveryRedeemed` | Points and bonus to pay |
| `accountPageVisits`, `accountPageMs`, `taskCardReopens`, `mapShown` (`real` / `drawn`), `mapMoves`, `mapRecenters`, `timesHidden`, `errors`, `eventCount` | Behavior and data-quality flags (many map moves or Account visits suggest exploring like a tester) |

### `events.csv`: one row per event, sorted by time

`studyCode`, then every event field from section 2, in phone order (`pageLoadAt`, then `seq`). Lists are joined with `;`, and nested objects (such as a task `outcome`) are written as JSON.

### `flow-codebook.csv`: one row per flow (12 rows)

`flowId`, `expectedTask`, `screen`, `options`, `privacyOption`, `dependsOn`, `consentForm_nudged`, `consentForm_neutral`, `verdictMap` (e.g. `while_using=allow;once=ask;dont_allow=block`), the `ci_*` columns and `ci_statement`. Use it to match the site flows with the Part 2 questionnaire items.

### `id-map.csv`: study code → Prolific ID

`studyCode`, `prolificPid`, `uid`. Use it to pay bonuses and link Part 1 with Part 2. **Keep it separate from the other files and off shared drives.**

---

## Quick checks when reading a participant

1. **Did they finish?** `stage` = `done` and `completedAt` is set.
2. **Which level?** `friction`.
3. **What did they choose at each flow?** The `settled` events, or `flows.csv` → `firstChoice`.
4. **Did they change anything later?** `decision` events with `source: account_page`, or `flows.csv` → `changedOnAccountPage`; `appState.flows` gives the final values.
5. **Did they really do the tasks?** `taskOutcome.tN.done`.
6. **Data quality:** `resumeCount`, `timesHidden`, high `toggleCount`, `errors`, `device.passedCheck`, `suspicion`.

---

## 8. Agent episodes (Experiment 4)

An agent link starts a fresh episode with the same app, flows, defaults, emphasis and logging as participants:

```
/?agent=1&EPISODE_ID=ep_0007&friction=nudged&taskOrder=4-1-2-3-5-6
   &NAME=Riley&MODEL=…&CONDITION=transcript_only&RUN=2&PARTICIPANT=P012
```

- **Required:** `EPISODE_ID` (letters, digits, `_` or `-`); `friction` (the matched participant's level); `taskOrder` (their order; must follow the protocol rules, 3 straight after 2 and 6 last).
- **Optional:** `NAME` (shown in the app greeting, the pipeline's "[name]"), `MODEL`, `CONDITION`, `RUN` and `PARTICIPANT` (the matched participant's study code).
- **What's skipped:** consent, the phone check, the name screen, task cards, ease ratings and all surveys. The harness gives each task's text; **Done** in the task bar is `finish_task`. After the sixth task the page shows "All tasks finished."
- **Nothing on screen** shows the level, the episode or that this is an agent run.
- **Data stays in the page; nothing goes to Firestore.** The harness reads it from `window.__brambleAgent`:
  - `apiVersion`: `1`
  - `episodeId`
  - `isDone()`
  - `getRecord()`: the same participant record as section 1, plus `agent: { episodeId, model, condition, run, participant }`, and with `device.automated` true
  - `getEvents()`: every event, in the section 2 format
- **Screen descriptions:** every decision button has `data-emphasis`: `primary` (the highlighted sharing option, nudged only) or `plain` (every other option; in neutral, all options). Switches use `aria-checked` and checkboxes `checked`. The harness's `get_screen` should report these (e.g. "primary", "ON") and never call anything a default.
