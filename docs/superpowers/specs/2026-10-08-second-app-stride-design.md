# Second app (Stride) and Bramble data expansion

Oct 8, 2026 · Agreed with Matt (Noah consulted on friction)

## Decisions

- **Both apps for everyone:** each participant uses Bramble and a fitness and health app, **Stride**, in random order, balanced. Bramble is not trimmed; Part 1 is about 45–50 minutes.
- **Stride mirrors Bramble:** the same six decision screens (units U1–U6), each Bramble flow with a Stride counterpart that differs in information type (health or biometric instead of location). There's one extra biometric flow.
- **Bramble gains two flows** in new categories, using practice values only:
  - a birthday for birthday deals (demographic)
  - saving a practice card at checkout (financial)
- **Same nudge pattern in both apps:** a participant's three nudged units apply to both, so matched pairs are always at the same level.
- **The CI information type is split** into `informationCategory` (Matt's list of categories), `attribute`, `granularity`, `temporality` and `identifiability`.
- **Points:** each app has its own balance (Bramble points, Stride coins: 420 to start, 300 to redeem, offers +200 / +100 / +150). The bonus is the sum at 100 = $0.10, about $0.24–$1.14.

## Information categories

| Code | Matt's category |
|---|---|
| `health` | Medical and Health Information |
| `financial` | Financial Information |
| `demographic` | Demographic and Biographical Information |
| `communication` | Communal and Communicative Content |
| `digital_activity` | Digital Activity and Behavioral Data (location tracking is here) |
| `biometric` | Biometrical and Physical Data |

## Session

device check → consent → welcome → **first app's tasks** (each with an ease rating) → transition ("Next, try *App*") → **second app's tasks** → usability survey for Bramble → usability survey for Stride → suspicion question → settings check → closing.

The app order is stored per participant (`appOrder`). Stride's welcome text and points work like Bramble's.

## Tasks

Task numbers are unique across apps, so existing per-task data (ease ratings, outcomes, `taskId`) keeps working.

| # | App | Task | Order rule |
|---|---|---|---|
| 1–6 | Bramble | As now | 1 before 2; 3 right after 2; 6 last within Bramble |
| 7 | Stride | Connect your health data to Stride and set up sign-in. | First within Stride |
| 8 | Stride | Do the 10-minute guided workout with coach Maya, and let Sam know how it went. | Random among 8–10 |
| 9 | Stride | Browse this week's training plans and save two you'd try. | Random among 8–10 |
| 10 | Stride | Use your coins to unlock the premium sleep report. | Random among 8–10 |

`taskOrder` lists all 10 tasks, with the two apps as blocks in `appOrder`, for example `7-9-8-10-4-1-2-3-5-6`.

## Stride flows

Labels are identical in both levels. Levels follow Utz et al. (2019), as in Bramble. Each flow's `counterpart` is its Bramble pair.

| Flow | Unit | Task | Kind | Options (privacy option last) | Counterpart |
|---|---|---|---|---|---|
| `stride_health_access`: "Allow Stride to read your heart rate, sleep and activity?" | U1 | 7 | prompt | while_using · once · dont_allow | `store_location` |
| `stride_health_detail`: "Detailed health data" (every reading vs. daily summaries); depends on access | U1 | 7 | setting (switch) | detailed · summary | `store_precise` |
| `stride_face_unlock`: "Set up Face Unlock? Stride saves a scan of your face to sign you in faster." | U1 | 7 | prompt | set_up · not_now | none (biometric extra) |
| `stride_coach_live`: "Share my live heart rate with coach Maya during workouts" | U2 | 8 | setting (switch), settles on Start workout | share · dont_share | `courier_live` |
| `stride_partner_offers`: "Send me offers from Stride's partner brands based on my workouts." | U2 | 8 | setting (checkbox) | checked · unchecked | `checkout_partner_offers` |
| `stride_bg_workout`: "Keep your workout stats accurate?" Background heart rate while this workout runs | U3 | 8 | prompt | allow · not_now | `bg_during_order` |
| `stride_sam_share`: "Let Sam know." Live workout vs. summary only | U3 | 8 | prompt | live_workout · summary_only | `sam_share` |
| `stride_hr_all_day`: "Keep heart-rate monitoring on all day?"; depends on `stride_bg_workout` = allow | U4 | 8 | prompt | keep_on · turn_off | `bg_between_orders` |
| `stride_plans_personalized`: "Plans picked for you" (from heart rate and sleep history) | U5 | 9 | setting (switch), settles on leaving | on · off | `deals_personalized` |
| `stride_plans_partner_offers`: "Offers from partner brands" (from health history) | U5 | 9 | setting (switch), settles on leaving | on · off | `deals_partner_offers` |
| `stride_reward_insurer`: Keel Health Insurance: heart-rate and activity history for a wellness discount | U6 | 10 | prompt, +200 | accept · decline | `reward_keel` |
| `stride_reward_university`: university sleep study, de-identified sleep history | U6 | 10 | prompt, +100 | accept · decline | `reward_university` |
| `stride_reward_data_partners`: Stride data partners, activity history for market research | U6 | 10 | prompt, +150 | accept · decline | `reward_data_partners` |

## New Bramble flows

| Flow | Unit | Task | Kind | Options | Category |
|---|---|---|---|---|---|
| `birthday_deals`: "Birthday deals." Bramble uses the birthday on your practice profile (May 14) to send a birthday deal | U5 | 4 | setting (switch), settles on leaving | on · off | demographic |
| `save_card`: "Save this card (practice Visa ending 4242) for faster checkout next time." | U2 | 2 | setting (checkbox), settles on Place order | checked · unchecked | financial |

## Stride screens

- **Tabs:** Today · Workouts · Plans · Rewards · Profile.
- **Today:** greeting, a "Connect your health data" card, and the "Face Unlock" setup card.
- **Health access sheet:** can't be dismissed; works like Bramble's location sheet.
- **Workout setup:** coach card (#3′), offers checkbox (#4′), **Start workout**.
- **Live workout:** a compressed timeline (warm-up → main set → cool-down, about 30 s). At the main set the #5′ and #6′ cards appear. It completes once both are answered and a minimum time has passed, then the #7′ sheet appears if applicable. This mirrors Bramble's order tracking and uses the same timing rules.
- **Plans:** two settings (#8′, #9′) and four plan cards with hearts.
- **Rewards:** coin balance, "Premium sleep report · 300 coins" Redeem, three offers with Change.
- **Profile:** all Stride flows, the same as Bramble's Account page.

Loading, Back, skeletons, splash and emphasis markers all work as in Bramble. Visuals use Stride's own color scheme (cool blue and coral) with the same layout system. Health metrics are drawn charts and numbers, with no photos needed.

## Data

- **Participant record:**
  - `appOrder` (`bramble_first` / `stride_first`)
  - `strideState` (like `appState`)
  - `taskOrder` over all 10 tasks
  - `ease.t7`–`t10`, `taskOutcome.t7`–`t10`
- **`flows.csv`:** 27 rows per person, with `app`, `counterpart`, and the split CI columns. Per-flow `friction` comes from the shared pattern.
- **`participants.csv`:** `appOrder`, both point balances, `bonusUSD` as the sum, and both SUS scores.
- **Agent links:** they add `appOrder`. `taskOrder` covers all 10 tasks.

## Out of scope here

Part 2 battery changes (adding the new flows, about 74+ items). Noted for the Experiment 1 build.
