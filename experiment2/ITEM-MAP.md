# Questionnaire ↔ Part 1: item map

Which Part 2 questionnaire item asks about which Part 1 decision. Generated from `src/part2/items.ts` (item wording) and `src/bramble/flows.ts` / `src/stride/flows.ts` (what the app shows); those files are the source of truth, so regenerate this if either changes.

## Do they have to match?

- **The 29 site items: yes, one to one.** Each one is a Part 1 decision rewritten in generic words ("your grocery delivery app", never "Bramble"), so the say–do comparison is the same flow, said vs. done. `verdicts.csv` joins them on `itemId` = `flowId`. Cutting a flow from the app means cutting its item here, and the other way round.
- **The 12 repeats: same flow, different words.** They measure whether the statement is stable (RQ1.3). They add no new flow.
- **The 12 held-out items: deliberately *not* in Part 1.** They combine values seen on the site in new ways, to test whether an agent that learned a person's preferences from the interview generalizes (the main outcome of Experiments 3 and 4). They have no "do" side by design. If Experiments 3–4 are dropped or shrunk, these are the first thing to cut.

How a Part 1 choice becomes a verdict: Allow / Allow While Using / Share / On / checked → **allow**; Allow Once → **ask me**; the least-sharing option (Don't Allow, Approximate, Daily Summaries, Keep Only While Using, Off, unchecked, Decline, Not Now, Keep Private, Send arrival time / a summary only) → **block**.

Counts: 29 site + 12 repeats + 12 held-out = **53 scored pages**, plus a practice item, a comprehension check and 2 attention checks.

## Site items: Grocery delivery app (Bramble)

| # | Questionnaire item (wording A) | Repeat? | Part 1: task · screen | What the app shows | Buttons / options | Paired with |
|---|---|---|---|---|---|---|
| 1 | Your grocery delivery app wants your current location to show nearby stores and what they have in stock, while you're using the app. `store_location` | Yes | T1 Set a store with oat milk · Find a store | Allow “Bramble” to use your location? | Allow Once · Allow While Using App · Don't Allow | `stride_health_access` |
| 2 | Your grocery delivery app wants your exact location, not just your general area, to find nearby stores. `store_precise` |  | T1 Set a store with oat milk · Find a store (only if store_location wasn't refused) | Precise | Precise · Approximate | `stride_health_detail` |
| 3 | Your delivery courier wants your live location to find you, until your order arrives. `courier_live` | Yes | T2 Order oat milk and sourdough · Checkout | Share my live location with my courier until my order arrives | Share · Don't share | `stride_coach_live` |
| 4 | Partner brands of your grocery delivery app want your delivery address to send you marketing offers. `checkout_partner_offers` |  | T2 Order oat milk and sourdough · Checkout | Send me offers from Bramble's partner brands based on my delivery address. | Checked · Unchecked | `stride_partner_offers` |
| 5 | Your grocery delivery app wants your location in the background, even with the app closed, to keep the arrival time accurate, while an order is on its way. `bg_during_order` |  | T3 Track your order, tell Sam · Order tracking | Keep your arrival time accurate? | Allow · Don't Allow | `stride_bg_workout` |
| 6 | Your housemate wants your live location, not just the arrival time, until your grocery order arrives. `sam_share` | Yes | T3 Track your order, tell Sam · Order tracking | Let Sam know | Share my live location with Sam · Send arrival time only | `stride_sam_share` |
| 7 | Your grocery delivery app wants your location in the background at all times, even when you have no order, to speed up future orders. `bg_between_orders` | Yes | T3 Track your order, tell Sam · Order tracking (only if bg_during_order was allowed) | Keep background location on? | Change to Always Allow · Keep Only While Using | `stride_hr_all_day` |
| 8 | Your grocery delivery app wants your location history (the stores you've visited) to pick deals for you. `deals_personalized` |  | T4 Save two deals · Deals settings | Deals picked for you | On · Off | `stride_plans_personalized` |
| 9 | Partner brands of your grocery delivery app want your location history to send you marketing offers. `deals_partner_offers` | Yes | T4 Save two deals · Deals settings | Offers from partner brands | On · Off | `stride_plans_partner_offers` |
| 10 | A car insurance company wants your location history from your grocery delivery app to offer you a safe-driving discount, and the app gives you a $2.00 reward. `reward_keel` |  | T5 Free delivery with points · Rewards | Keel Auto Insurance | Accept · Decline | `stride_reward_insurer` |
| 11 | A university traffic research lab wants your location history from your grocery delivery app, with your name removed, for research, and the app gives you a $1.00 reward. `reward_university` |  | T5 Free delivery with points · Rewards | University traffic study | Accept · Decline | `stride_reward_university` |
| 12 | Data companies want your location history from your grocery delivery app for market research, and the app gives you a $1.50 reward. `reward_data_partners` | Yes | T5 Free delivery with points · Rewards | Bramble data partners | Accept · Decline | `stride_reward_data_partners` |
| 13 | Your grocery delivery app wants to keep your payment card on file to make checkout faster next time. `save_card` |  | T2 Order oat milk and sourdough · Checkout | Save this card (practice Visa ending 4242) for faster checkout next time. | Checked · Unchecked | — (extra info type) |
| 14 | Your grocery delivery app wants your birthday to send you a birthday deal. `birthday_deals` |  | T4 Save two deals · Deals settings | Birthday deals | On · Off | — (extra info type) |

## Site items: Fitness app (Stride)

| # | Questionnaire item (wording A) | Repeat? | Part 1: task · screen | What the app shows | Buttons / options | Paired with |
|---|---|---|---|---|---|---|
| 1 | Your fitness app wants your heart rate, sleep and activity data to track your workouts and show your daily stats, while you're using the app. `stride_health_access` | Yes | T7 Connect health data · Today | Allow “Stride” to read your heart rate, sleep and activity? | Allow Once · Allow While Using App · Don't Allow | `store_location` |
| 2 | Your fitness app wants every heart-rate and sleep reading, not just daily summaries, to track your workouts. `stride_health_detail` |  | T7 Connect health data · Today (only if stride_health_access wasn't refused) | Detailed | Detailed · Daily Summaries | `store_precise` |
| 3 | Your workout coach wants your live heart rate to adjust your pace, during workouts. `stride_coach_live` | Yes | T8 Workout, tell Sam · Workout setup | Share my live heart rate with coach Maya during workouts | Share · Don't share | `courier_live` |
| 4 | Partner brands of your fitness app want your workout history to send you marketing offers. `stride_partner_offers` |  | T8 Workout, tell Sam · Workout setup | Send me offers from Stride's partner brands based on my workouts. | Checked · Unchecked | `checkout_partner_offers` |
| 5 | Your fitness app wants your heart rate in the background, even with the screen off, to keep your stats accurate, while a workout is running. `stride_bg_workout` |  | T8 Workout, tell Sam · Live workout / workout complete | Keep your workout stats accurate? | Allow · Don't Allow | `bg_during_order` |
| 6 | Your housemate wants to follow your live workout (heart rate and progress), not just a summary, while you're working out. `stride_sam_share` | Yes | T8 Workout, tell Sam · Live workout / workout complete | Let Sam know | Share my live workout with Sam · Send a summary only | `sam_share` |
| 7 | Your fitness app wants your heart rate in the background at all times, even when you're not working out, to track your fitness. `stride_hr_all_day` | Yes | T8 Workout, tell Sam · Live workout / workout complete (only if stride_bg_workout was allowed) | Keep heart-rate monitoring on all day? | Change to Always Allow · Keep Only While Using | `bg_between_orders` |
| 8 | Your fitness app wants your heart-rate and sleep history to pick training plans for you. `stride_plans_personalized` |  | T9 Save two plans · Plans settings | Plans picked for you | On · Off | `deals_personalized` |
| 9 | Partner brands of your fitness app want your health history to send you marketing offers. `stride_plans_partner_offers` | Yes | T9 Save two plans · Plans settings | Offers from partner brands | On · Off | `deals_partner_offers` |
| 10 | A health insurance company wants your heart-rate and activity history from your fitness app to offer you a wellness discount, and the app gives you a $2.00 reward. `stride_reward_insurer` |  | T10 Unlock sleep report · Rewards | Keel Health Insurance | Accept · Decline | `reward_keel` |
| 11 | A university sleep research lab wants your sleep history from your fitness app, with your name removed, for research, and the app gives you a $1.00 reward. `stride_reward_university` |  | T10 Unlock sleep report · Rewards | University sleep study | Accept · Decline | `reward_university` |
| 12 | Data companies want your activity history from your fitness app for market research, and the app gives you a $1.50 reward. `stride_reward_data_partners` | Yes | T10 Unlock sleep report · Rewards | Stride data partners | Accept · Decline | `reward_data_partners` |
| 13 | Your fitness app wants to count your steps in the background at all times, even when the app is closed, to keep your streak going. `stride_streak_autosync` |  | T7 Connect health data · Today (only if stride_health_access wasn't refused) | 3-day streak. Don’t lose it | Keep My Streak · Not Now | — (streak nudge) |
| 14 | Your fitness app wants to post your workout route and heart rate on a public map that anyone using the app can see. `stride_community_map` |  | T8 Workout, tell Sam · Live workout / workout complete | Share this workout’s route and heart rate? | Share to Community · Keep Private | — (social_proof nudge) |
| 15 | Your fitness app wants your full sleep history from your sleep tracker so you can reach a higher member status in the app. `stride_gold_tier` |  | T10 Unlock sleep report · Rewards | You’re 40 points from Gold | Reach Gold · Not Now | — (status nudge) |

## Repeats (wording B)

| Flow | Wording B |
|---|---|
| `store_location` | While you have it open, your grocery delivery app wants to use your current location to find stores near you and check their stock. |
| `courier_live` | Until your groceries are delivered, the courier wants to follow your location live so they can find you. |
| `sam_share` | Until your groceries arrive, your housemate wants to see where you are live, rather than only when the order will get there. |
| `bg_between_orders` | Even when you aren't ordering anything, your grocery delivery app wants to keep tracking your location in the background so later orders go faster. |
| `deals_partner_offers` | Your grocery delivery app wants to pass the record of places you've been to its partner brands, so they can advertise to you. |
| `reward_data_partners` | For a $1.50 reward, your grocery delivery app wants to give your location history to data companies that do market research. |
| `stride_health_access` | While you have it open, your fitness app wants to read your heart rate, sleep and activity so it can show your stats and track workouts. |
| `stride_coach_live` | During workouts, your coach wants to watch your heart rate live so they can change your pace. |
| `stride_sam_share` | While you're working out, your housemate wants to see your heart rate and progress live, rather than only a summary afterwards. |
| `stride_hr_all_day` | Even when you aren't exercising, your fitness app wants to keep reading your heart rate in the background to follow your fitness. |
| `stride_plans_partner_offers` | Your fitness app wants to pass your health history to its partner brands, so they can advertise to you. |
| `stride_reward_data_partners` | For a $1.50 reward, your fitness app wants to give your activity history to data companies that do market research. |

## Held-out items (no Part 1 counterpart, by design)

| # | Item | Domain |
|---|---|---|
| 1 | A university traffic research lab wants your location history from your grocery delivery app, with your name attached, for research, and the app gives you a $1.00 reward. `ho_loc_named_research` | grocery |
| 2 | Data companies want your location history from your grocery delivery app for market research. You get nothing in return. `ho_loc_unpaid_research` | grocery |
| 3 | Partner brands of your grocery delivery app want your live location while an order is on its way, to send you offers from shops nearby. `ho_loc_partners_live` | grocery |
| 4 | Your housemate wants your location history from your grocery delivery app, from now on. `ho_loc_housemate_history` | grocery |
| 5 | A health insurance company wants your location history from your grocery delivery app (the stores you've visited) to set your insurance price, and the app gives you a $2.00 reward. `ho_loc_health_insurer` | grocery |
| 6 | Your delivery courier wants your location history to plan future deliveries, from now on. `ho_loc_courier_history` | grocery |
| 7 | A university sleep research lab wants your sleep history from your fitness app, with your name attached, for research, and the app gives you a $1.00 reward. `ho_hl_named_research` | fitness |
| 8 | Data companies want your activity history from your fitness app for market research. You get nothing in return. `ho_hl_unpaid_research` | fitness |
| 9 | Partner brands of your fitness app want your live heart rate during workouts, to send you offers. `ho_hl_partners_live` | fitness |
| 10 | Your housemate wants your heart-rate and sleep history from your fitness app, from now on. `ho_hl_housemate_history` | fitness |
| 11 | A car insurance company wants your activity history from your fitness app to set your insurance price, and the app gives you a $2.00 reward. `ho_hl_car_insurer` | fitness |
| 12 | Your workout coach wants your sleep history to plan your training, from now on. `ho_hl_coach_history` | fitness |

