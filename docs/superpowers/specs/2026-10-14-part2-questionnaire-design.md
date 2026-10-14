# Part 2 questionnaire (stated verdicts): design

Oct 14, 2026 · First piece of Part 2 · Decisions by Matt (Oct 14): questionnaire first, all 29 site flows plus 12 repeats, built on our own site.

## What it's for

The questionnaire gives each person's **stated verdict S(f)** (allow / ask me / block, with confidence) on a fixed battery of flows. Every later comparison depends on it:

- **Say–do (Experiment 2):** S(f) against what the same person did on the site, flow by flow.
- **Agent fidelity (Experiments 3–4):** the agent's verdicts and actions are scored against S(f).
- **Stability (RQ1.3):** 12 flows are asked twice, reworded.
- **Elicitation effect (RQ1.2):** the norming sample answers the same items with no chat and no site.

## What changed from the Sep 30 protocol

The protocol's 48 items were written when Part 1 was Bramble only: 12 site flows, each twice, plus 24 others, all about location. The site now has two apps and 29 flows. The new battery:

| Part | Items | Notes |
|---|---|---|
| Site flows | 29 | Every flow on the site, once: Bramble's 14, Stride's 15 (12 matched + 3 gamified) |
| Repeats | 12 | One flow per decision screen (U1–U6) in each app, reworded. The 6 Bramble repeats and the 6 Stride repeats are matched pairs, so stability can be compared across information types |
| Held-out flows | 12 | Combinations of values seen on the site, never together. 6 location, 6 health, built as 6 matched pairs |
| **Scored total** | **53** | About 12 minutes at ~13 s per item |
| Attention items | 2 | Near items 18 and 36 |
| Practice item | 1 | Not scored |

**The briefing and introduction now say "your information"** rather than "your location", because the items cover location, health, a payment card and a birthday.

## Wording rules

- **Generic apps, not Bramble and Stride.** Items say "your grocery delivery app" and "your fitness app". The norming sample has never seen Bramble, and naming the app would remind Part 2 participants of what they chose a week earlier, which is the pull toward consistency the week's gap exists to weaken (Bem, 1972; protocol "Order bias"). The recall check, which comes after, does name the apps.
- **One template**, following the pipeline: *[Recipient] wants your [information] to [aim], [condition]*. The condition slot carries how long the flow lasts and any reward ("while you're using the app", "until your order arrives", "and the app gives you a $0.20 reward").
- **No nudge in the items.** Items describe the flow only: no defaults, no highlighting, no streak, friend count or tier. For the gamified flows, the say–do gap is then the effect of the nudge, measured against the person's judgment of the bare flow.
- **Rewards in dollars.** Points and coins become their real bonus value (100 points = $0.10), the same for both apps.
- **Repeats** keep every CI parameter and change only sentence structure and word choice (wording B).
- **Mapping to the site:** Allow / Allow While Using → allow; Allow Once → ask me; the least-sharing option → block (unchanged; `verdictOf` in `src/core/ci.ts`).

## The items

★ = also asked as a reworded repeat (wording B). Wording is in `experiment2/src/part2/items.ts`, which is the source of truth; this table is generated from it and should be regenerated after edits.

### Grocery delivery app (Bramble's flows)

| # | Flow | Wording A | Wording B (repeat) |
|---|---|---|---|
| 1 | `store_location` ★ | Your grocery delivery app wants your current location to show nearby stores and what they have in stock, while you're using the app. | While you have it open, your grocery delivery app wants to use your current location to find stores near you and check their stock. |
| 2 | `store_precise` | Your grocery delivery app wants your exact location, not just your general area, to find nearby stores. | |
| 3 | `courier_live` ★ | Your delivery courier wants your live location to find you, until your order arrives. | Until your groceries are delivered, the courier wants to follow your location live so they can find you. |
| 4 | `checkout_partner_offers` | Partner brands of your grocery delivery app want your delivery address to send you marketing offers. | |
| 5 | `bg_during_order` | Your grocery delivery app wants your location in the background, even with the app closed, to keep the arrival time accurate, while an order is on its way. | |
| 6 | `sam_share` ★ | Your housemate wants your live location, not just the arrival time, until your grocery order arrives. | Until your groceries arrive, your housemate wants to see where you are live, rather than only when the order will get there. |
| 7 | `bg_between_orders` ★ | Your grocery delivery app wants your location in the background at all times, even when you have no order, to speed up future orders. | Even when you aren't ordering anything, your grocery delivery app wants to keep tracking your location in the background so later orders go faster. |
| 8 | `deals_personalized` | Your grocery delivery app wants your location history (the stores you've visited) to pick deals for you. | |
| 9 | `deals_partner_offers` ★ | Partner brands of your grocery delivery app want your location history to send you marketing offers. | Your grocery delivery app wants to pass the record of places you've been to its partner brands, so they can advertise to you. |
| 10 | `reward_keel` | A car insurance company wants your location history from your grocery delivery app to offer you a safe-driving discount, and the app gives you a $0.20 reward. | |
| 11 | `reward_university` | A university traffic research lab wants your location history from your grocery delivery app, with your name removed, for research, and the app gives you a $0.10 reward. | |
| 12 | `reward_data_partners` ★ | Data companies want your location history from your grocery delivery app for market research, and the app gives you a $0.15 reward. | For a $0.15 reward, your grocery delivery app wants to give your location history to data companies that do market research. |
| 13 | `save_card` | Your grocery delivery app wants to keep your payment card on file to make checkout faster next time. | |
| 14 | `birthday_deals` | Your grocery delivery app wants your birthday to send you a birthday deal. | |

### Fitness app (Stride's flows)

| # | Flow | Wording A | Wording B (repeat) |
|---|---|---|---|
| 15 | `stride_health_access` ★ | Your fitness app wants your heart rate, sleep and activity data to track your workouts and show your daily stats, while you're using the app. | While you have it open, your fitness app wants to read your heart rate, sleep and activity so it can show your stats and track workouts. |
| 16 | `stride_health_detail` | Your fitness app wants every heart-rate and sleep reading, not just daily summaries, to track your workouts. | |
| 17 | `stride_coach_live` ★ | Your workout coach wants your live heart rate to adjust your pace, during workouts. | During workouts, your coach wants to watch your heart rate live so they can change your pace. |
| 18 | `stride_partner_offers` | Partner brands of your fitness app want your workout history to send you marketing offers. | |
| 19 | `stride_bg_workout` | Your fitness app wants your heart rate in the background, even with the screen off, to keep your stats accurate, while a workout is running. | |
| 20 | `stride_sam_share` ★ | Your housemate wants to follow your live workout (heart rate and progress), not just a summary, while you're working out. | While you're working out, your housemate wants to see your heart rate and progress live, rather than only a summary afterwards. |
| 21 | `stride_hr_all_day` ★ | Your fitness app wants your heart rate in the background at all times, even when you're not working out, to track your fitness. | Even when you aren't exercising, your fitness app wants to keep reading your heart rate in the background to follow your fitness. |
| 22 | `stride_plans_personalized` | Your fitness app wants your heart-rate and sleep history to pick training plans for you. | |
| 23 | `stride_plans_partner_offers` ★ | Partner brands of your fitness app want your health history to send you marketing offers. | Your fitness app wants to pass your health history to its partner brands, so they can advertise to you. |
| 24 | `stride_reward_insurer` | A health insurance company wants your heart-rate and activity history from your fitness app to offer you a wellness discount, and the app gives you a $0.20 reward. | |
| 25 | `stride_reward_university` | A university sleep research lab wants your sleep history from your fitness app, with your name removed, for research, and the app gives you a $0.10 reward. | |
| 26 | `stride_reward_data_partners` ★ | Data companies want your activity history from your fitness app for market research, and the app gives you a $0.15 reward. | For a $0.15 reward, your fitness app wants to give your activity history to data companies that do market research. |
| 27 | `stride_streak_autosync` | Your fitness app wants to count your steps in the background at all times, even when the app is closed, to keep your streak going. | |
| 28 | `stride_community_map` | Your fitness app wants to post your workout route and heart rate on a public map that anyone using the app can see. | |
| 29 | `stride_gold_tier` | Your fitness app wants your full sleep history from your sleep tracker so you can reach a higher member status in the app. | |

### Held-out flows

Each combines values that appear on the site but never together. **Distance** is the number of CI parameters (recipient, information, temporality, identifiability, aim, temporal constraint, reward) that differ from the nearest site flow, computed in code (`heldOutDistance`), not asserted. The pairs mirror each other across the two information types, like the site.

| # | ID | Wording | Nearest site flow (distance) |
|---|---|---|---|
| 30 | `ho_loc_named_research` | A university traffic research lab wants your location history from your grocery delivery app, with your name attached, for research, and the app gives you a $0.10 reward. | `reward_university` (1: identifiability) |
| 31 | `ho_loc_unpaid_research` | Data companies want your location history from your grocery delivery app for market research. You get nothing in return. | `reward_data_partners` (1: reward) |
| 32 | `ho_loc_partners_live` | Partner brands of your grocery delivery app want your live location while an order is on its way, to send you offers from shops nearby. | `bg_during_order` (2: recipient, aim) |
| 33 | `ho_loc_housemate_history` | Your housemate wants your location history from your grocery delivery app, from now on. | `deals_personalized` (2: recipient, aim) |
| 34 | `ho_loc_health_insurer` | A health insurance company wants your location history from your grocery delivery app (the stores you've visited) to set your insurance price, and the app gives you a $0.20 reward. | `reward_keel` (1: recipient) |
| 35 | `ho_loc_courier_history` | Your delivery courier wants your location history to plan future deliveries, from now on. | `deals_personalized` (2: recipient, aim) |
| 36 | `ho_hl_named_research` | A university sleep research lab wants your sleep history from your fitness app, with your name attached, for research, and the app gives you a $0.10 reward. | `stride_reward_university` (1: identifiability) |
| 37 | `ho_hl_unpaid_research` | Data companies want your activity history from your fitness app for market research. You get nothing in return. | `stride_reward_data_partners` (1: reward) |
| 38 | `ho_hl_partners_live` | Partner brands of your fitness app want your live heart rate during workouts, to send you offers. | `stride_coach_live` (2: recipient, aim) |
| 39 | `ho_hl_housemate_history` | Your housemate wants your heart-rate and sleep history from your fitness app, from now on. | `stride_plans_personalized` (2: recipient, aim) |
| 40 | `ho_hl_car_insurer` | A car insurance company wants your activity history from your fitness app to set your insurance price, and the app gives you a $0.20 reward. | `reward_keel` (1: attribute) |
| 41 | `ho_hl_coach_history` | Your workout coach wants your sleep history to plan your training, from now on. | `stride_plans_personalized` (2: recipient, attribute) |

The export's `battery-codebook.csv` lists these for every held-out item.

**Gap: no level-3 items.** The pipeline splits held-out flows into three levels by distance; these 12 come out at distance 1 (6 items) and 2 (6 items). One item's nearest flow is in the other app: `ho_hl_car_insurer` is one parameter from Bramble's car-insurer offer, since only the information differs.

**Open for Matt and Noah:** whether to add level-3 items now, or wait for T. The pipeline defines held-out flows relative to the training set T shown in the case-based chat arm, which isn't designed yet. These 12 are defined relative to the site flows. When T is chosen (most likely a subset of the site flows), distances should be recomputed against T; the function takes the reference set as an argument.

## Session flow (questionnaire part)

1. **Introduction** (protocol wording, "your location" → "your information"; "48" → "55", the number of pages including the two attention items, so it matches the progress label):
   > Now you'll read 55 short situations. In each one, an app, a company or a person wants to use some of your information. For each situation, choose **Allow** (that's fine, no need to ask me), **Block** (that shouldn't happen) or **Ask me** (don't decide in advance; check with me each time). Then say how sure you are, from 1 (not at all sure) to 5 (completely sure). Some situations look alike, so please read each one carefully.
2. **Practice item** (not scored): "A weather app wants your general area to show today's forecast, while you're using the app."
3. **Comprehension question:** "Which option means the app should check with you every time?" Allow · Block · Ask me. After a wrong answer, the definitions reappear and there's one more try. The result is recorded either way.
4. **The 55 items**, one per page: the situation, three verdict buttons (Allow · Ask me · Block, always in that order), then confidence 1–5. **Next** is enabled once both are chosen. No going back.
5. **Recall check** (Part 2 only; names the apps): six matched questions, three per app (the location / health prompt; Sam; data partners), each with "I don't remember".
6. **Background survey:** IUIPC (10 items, 7-point; Malhotra, Kim & Agarwal 2004), age range, gender (optional), and how often they use AI assistants.

### Order

- Random per person: the 41 first-occurrence items (29 site + 12 held-out) are shuffled.
- For each of the 12 repeated flows, a random choice of which wording comes first; the other is placed at least 20 positions later.
- The two attention items go at positions 18 and 36 (counting from 1), as in the protocol's "near 15 and 30", scaled to the longer list.
- The order is generated once, saved before the first item, and reused on reload.

## What it records

Per item: item ID, flow ID, wording (A/B), position, verdict, confidence, ms from showing to Next, and whether the verdict was changed before Next. Plus the comprehension attempts, both attention results, recall answers, the background survey, and timestamps. The days since Part 1 come from joining the two records by Prolific ID at export.

## Where it runs

On our own site, as a second page (`part2.html`) in the same project and Firebase, opened on a computer. Part 2 signs in anonymously like Part 1, but on a different device, so the two records are joined by Prolific ID at export. The **norming survey** is the same page in norming mode (`norming.html`): consent, then the same introduction, practice, comprehension, 53 items, attention items and background survey, with no recall check.

## Small choices made while building (for review)

- **Verdict order on the page: Allow · Ask me · Block**, the order of the ordinal scale used in the analysis (allow > ask > block). The protocol lists them as Allow · Block · Ask me; the comprehension question keeps that order.
- **The second attention item asks for Allow and a confidence of 2**, not the same Block-and-3 as the first, so a person who learned the first answer can't pass the second by habit.
- **Recall check:** six questions in three matched pairs (location / health prompt, Sam, data partners), replacing the protocol's four Bramble-only ones. The protocol's partner-offers checkbox question was dropped to keep the pairs.
- **A wrong comprehension answer twice** still continues; the result is recorded (`comprehensionPassed`) and exclusion is left to the pre-registered rules.

## As built (v0.16.0)

- **Pages:** `part2.html` (Part 2) and `norming.html` (norming survey), with the same link parameters as Part 1 (`PROLIFIC_PID`…, `&code=`, `&pilot=1`, `?demo=1`). Part 2 turns phones and tablets away; the norming survey takes any device.
- **Data:** collections `part2` and `norming` (plus `pilot_` copies and `_pids` claims), one record per Prolific ID, owner-only, identity fields locked (`firestore.rules`).
- **Export:** `verdicts.csv` (one row per person × battery item: first-asked verdict, repeat, `unstable`, `uncertain`, and the same person's site verdict with `sayDoAgree`), `part2-participants.csv`, `norming-verdicts.csv`, `norming-participants.csv`, `battery-codebook.csv` and a private `part2-id-map.csv`.
- **Until the chat is built,** Part 2's last page says the rest of Part 2 is still being built.

## Not in this piece

The scenario briefing, the chat with the interviewer (three arms), the filler task and the debrief come next. The arm assignment (balanced across arms) belongs with the chat.

## Sources

- Item template, repeats and distance levels: `Research Methodology Pipeline.md`, Experiment 1.
- Introduction, practice, comprehension, attention, recall and background: `Human study protocol and participant instructions.md`, Part 2.
- Malhotra, Kim & Agarwal. *Internet Users' Information Privacy Concerns (IUIPC): The Construct, the Scale, and a Causal Model.* Information Systems Research 15(4), 2004. **Check the item wording against the paper's appendix before launch.**
