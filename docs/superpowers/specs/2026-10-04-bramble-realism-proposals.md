# Bramble realism: proposals and draft plan

Oct 4, 2026 · Response to review feedback on the Experiment 2 site

> Feedback:
> 1. The Find a store functionality should be more interactive and realistic.
> 2. There should be a loading page between each [screen].
> 3. The order part is static.

All three point the same way: Bramble still feels like a mockup. That matters for the study. The protocol's biggest threat is participants "exploring the app like a tester" instead of using it "as if it were your own", and a static app invites testing. More realism should make the choices more like real-world behavior.

## Rules every change must follow

These come from the design spec and the protocol, and apply to all three proposals.

1. **Identical in both levels.** Maps, loading times, animations and order timelines are the same for `nudged` and `neutral`. Only the 12 flows' defaults and emphasis differ. The parity test is extended to cover the new screens.
2. **Deterministic.** Loading times and order timings are fixed numbers, not random, so they add no noise between participants.
3. **Decision timing stays clean.** No prompt appears while something is loading, and `prompt_shown` fires only once the prompt is actually on screen. Loading happens after a choice, never between seeing a prompt and answering it.
4. **No real location, no third-party services.** The map is drawn by the app itself; no map tiles are fetched from outside. The consent says no real location is collected, and the app must not even look as if it uses one.
5. **No privacy wording** before the suspicion question.
6. **Declining stays as costly as now.** "Don't allow" still leads to the ZIP search with 24 stores listed A to Z. More realism mustn't make declining easier or harder by accident.
7. **Time budget.** Part 1 is planned at about 30 minutes. Together, these changes should add at most about 1–2 minutes.

---

## 1. Find a store: interactive and realistic

**Now:** a gray map placeholder with one pin, two stores in a list, and a "Set as my store" button on each. The search box shown in the mockups isn't there. Nothing on the screen responds to whether the participant shared exact or general location.

**Problem:** the task ("find a store that has oat milk in stock") is solved by reading two rows. There's nothing to explore, so it feels like a test.

### Options

| | A. Drawn interactive map (recommended) | B. Real map library (e.g. Leaflet + OpenStreetMap) | C. Better list only |
|---|---|---|---|
| What it is | An SVG neighborhood map drawn by the app: streets, a park, store pins, a "you are here" marker. Tap a pin or a row to open a store card | Real map tiles around a made-up location | Search box, more stores, store detail cards, no map |
| Realism | High enough; looks like a real app's store finder | Highest | Medium |
| Costs and risks | More design work | Tiles come from a third party (the participant's IP goes to the tile server); a fake spot on a real map may confuse or alarm; slow on weak signal | Least work, but the screen still feels thin |
| Fits the rules | Yes | Breaks rule 4 | Yes |

### Recommended design (option A)

1. **Map with store pins.** About 5 nearby stores, with oat milk in stock at only some of them, so finding one takes a little checking. The map pans with a drag. A "Search this area" button is optional (see open question 1).
2. **Location you shared, shown on the map.**
   - `exact`: a precise blue dot, with distances like "0.4 mi".
   - `general`: a wide shaded circle, with distances like "about 1 mi".
   - Same rule in both levels. It makes the choice the participant just made visible, as real apps do.
3. **Store card.** Tapping a pin or row slides up a card: name, hours, distance, an aisle-by-aisle stock check ("Oat milk, 64 oz: in stock · Aisle 4"), and "Set as my store". The current store shows "Your store ✓".
4. **Working search box** at the top: typing "oat" filters to stores with oat milk in stock, and typing a street name finds that store. Searches are logged without the typed text. Only whether something was typed is logged, in case a participant types something personal.
5. **"Don't allow" path, cost unchanged.** No dot, no distances. The ZIP box comes first, then a map of the ZIP area with 24 pins, plus the A-to-Z list. A "Use my location" button would be a second location prompt, so it is left out (see open question 2).
6. **Short loading step** after the location choice ("Finding stores near you…", about 0.8 s), shared with proposal 2.

**Data changes:** new `action` events `store_card_opened` (`storeId`), `map_panned` (counted rather than logged on every move), `store_search` (`hadText: true`, plus the number of results). `t1.msToFind` is unchanged.

---

## 2. Loading between screens

**Now:** every tab and button switches screens instantly, which no real app does.

### Options

| | A. Brief skeleton screens plus action spinners (recommended) | B. Full-screen loading page between every screen | C. Splash only |
|---|---|---|---|
| What it is | On each screen change, gray placeholder shapes for 300–600 ms. Actions that "talk to the server" show a spinner on the button ("Placing order…") | A logo or spinner page every time | A Bramble splash when each task starts |
| Realism | Matches modern apps | Feels slow and dated; repeated every tap | Small gain |
| Cost to the study | About 30–60 s in total | Several minutes; adds friction to everything, including declining | A few seconds |

### Recommended design (option A)

1. **Splash at the start of each task:** the Bramble logo for about 1 s, when the task card closes, as if the app were opening.
2. **Skeleton on every screen change:** 400 ms for tab changes, 600 ms for screens that "fetch data" (Find a store, Deals, Rewards, Orders). The tab bar stays live. Prompts and flow controls appear only when the skeleton ends, so `prompt_shown` and decision timing start then.
3. **Action spinners**, with the button disabled while spinning:

   | Action | Text | Time |
   |---|---|---|
   | Location choice | "Finding stores near you…" | 0.8 s |
   | ZIP search | "Searching…" | 0.8 s |
   | Set as my store | "Saving…" | 0.5 s |
   | Place order | "Placing order…" | 1.5 s |
   | Redeem | "Redeeming…" | 0.8 s |
   | Accepting or declining an offer | "Saving…" | 0.5 s |
   | Save address | "Saving…" | 0.6 s |

   The same spinner times apply whether the participant shares or declines, so neither choice "feels" faster.
4. **Accessibility:** loading regions are marked busy for screen readers, and motion is reduced when the phone's "reduce motion" setting is on.

**Data changes:** none needed. Loading times are fixed and identical, so they can be subtracted if needed. Adding a `loading` flag to `screen` events keeps the data self-explanatory.

**Note:** "between each" could also mean between tasks. The task card plus the new splash covers that. If a separate loading page between tasks was meant, see open question 3.

---

## 3. Order tracking that moves

**Now:** the tracking screen is frozen at "On the way, arriving around 5:42 PM". The courier icon is decorative. Once both order prompts are answered, the order jumps to "Delivered" after 1.5 s. The times are fixed, so they can contradict the participant's own clock.

### Options

| | A. Compressed live timeline (recommended) | B. Real-time delivery (about 15 minutes) | C. Polish only |
|---|---|---|---|
| What it is | The order moves through Placed → Packed → On the way → Delivered over about 30–45 s, with a mini map, a moving courier and a counting-down ETA | Matches a real delivery | Live clock times and animated progress, no timeline |
| Realism | High | Highest, but participants would wait idle | Low |
| Cost | About 30–45 s of Task 3 | About 15 minutes; not feasible | None |

### Recommended design (option A)

1. **Times from the participant's clock.** Checkout shows a delivery window starting about 15 minutes from now (e.g. "Today, 3:10–3:25 PM"), and tracking shows a matching ETA. The fixed "5:42 PM" goes.
2. **Timeline**, counted from when the order is placed, in visible time:
   - **Placed** (0 s): "We've got your order."
   - **Packed** (about 8 s): "Your groceries are packed."
   - **On the way** (about 15 s): "Dana picked up your order." The mini map shows the courier moving toward home, and the ETA counts down in compressed minutes.
   - The two prompts (background location #5 and "Let Sam know" #6) appear when the order reaches **On the way**, where they make sense, not before.
   - **Arriving** and **Delivered**: only after #5 and #6 are both answered, and at least about 15 s after On the way. Delivery can't happen before the prompts are answered (keeps #7 meaningful), and isn't so fast it looks fake. Then "Delivered at {time}", and #7 if applicable.
3. **If the participant leaves Orders,** the timeline keeps going: the Orders tab shows a small badge, and coming back shows the current step. If they reload, the step is restored from saved state, not restarted.
4. **The choices change what the screen shows,** the same way in both levels:
   - #5 `allow`: "Live ETA" label, and the courier moves smoothly.
   - #5 `not_now`: "Estimated" label, and the courier jumps between updates.
   - #6 `live_location`: "Sam can see your location" with a small live indicator until delivery.
   - #6 `arrival_only`: a message preview, "Sent to Sam: Groceries arrive around 3:18 PM."
5. **Courier chat** (optional): tapping the chat icon shows two canned messages ("I'm on my way!", "5 minutes out"). It's purely cosmetic.
6. **Task timing:** Task 2 ends at Place order, and the ease rating comes next. The timeline should count only Task 3 time, so it starts from "Placed" the first time Orders opens after the order is placed. Otherwise participants would find it already half done after the rating.

**Data changes:** `appState.orderTimeline` (current step plus visible-ms elapsed, for resuming), and new `action` events `order_status` (`step`) and `courier_chat_opened`. A new field `promptsShownAtStep` confirms #5 and #6 appeared at On the way.

---

## Effects on the research measures

| Measure | Effect | Handling |
|---|---|---|
| Decision time (`msSincePrompt`) | Unchanged: prompts start timing only once fully shown | Test that `prompt_shown` never fires during loading |
| Time to find a store (`t1.msToFind`) | Longer, but equally in both levels | Report as is |
| Task 3 length | +30–45 s | Within budget |
| Cost of declining location | Unchanged (ZIP search, 24 stores) | Parity and decline-everything tests extended |
| Realism-driven attention to location (dot, circle) | May make location a bit more salient | Same in both levels; shown only after the choice; check in think-aloud pilots |
| Total Part 1 time | About +1–2 minutes | Re-time in the pilot (protocol already requires it) |

---

## Draft implementation plan

Each phase ends with tests passing and a commit, as before.

**Phase R1: Loading framework**
- A `useLoading(ms)` helper and a `<Skeleton>` component; screen-change skeletons in `BrambleApp`; a button-spinner component.
- Rule: flow controls render only after loading ends.
- Tests:
  - Fake-timer tests that `prompt_shown` fires only after the skeleton ends.
  - The parity test runs with loading finished.
  - The spinner times are the same for sharing and declining options.

**Phase R2: Order timeline**
- An `orderTimeline` reducer state, a visible-time ticker, and the step schedule as fixed constants.
- Prompts #5 and #6 tied to the On the way step, and delivery gated on both prompts plus the minimum time.
- Clock-based times on Checkout and Orders; the mini map with a moving courier; how the screen reflects #5 and #6.
- Resume from saved state.
- Tests:
  - The step sequence with fake timers.
  - No delivery before both prompts are answered.
  - Reload mid-timeline resumes at the same step.
  - Decline-everything still completes.

**Phase R3: Find a store**
- An SVG map component (streets, pins, user dot or circle), pan by drag, a store card sheet, and the search box with filtering.
- About 5 nearby stores with mixed stock; the ZIP-area map with 24 pins.
- New `action` events.
- Tests:
  - Pins and rows open the same card.
  - Exact shows a dot and general shows a circle.
  - Search filters, and its text is never logged.
  - The ZIP path still needs the ZIP and shows 24 stores.
  - Parity in both levels.

**Phase R4: Docs and checks**
- Update `DATA.md` and the spec's implementation notes, and bump `appVersion` to 0.2.0 with a `CHANGELOG.md` entry.
- Check the full run time in the decline-everything and accept-everything tests.

*(Plan intentionally stopped here for review. Sizes, the final timings and the two carried-over fixes below get added once the open questions are answered.)*

---

## Open questions

1. **Map panning and "Search this area":** worth it, or is tapping pins enough? Panning adds realism, but also a way to "explore like a tester".
2. **"Use my location" on the ZIP screen:** real apps have it, but it would be a second location prompt after "Don't allow". Recommendation: leave it out.
3. **"Loading page between each":** did you mean between screens in the app (proposal 2), between tasks, or both?
4. **Order timeline length:** about 30–45 s in total. Shorter, or longer?
5. **Carried over from earlier:** two data fixes are still waiting for a yes:
   - store only whether the typed Task 6 address matches, not the text
   - add `pageLoad`/`seq` counters so events sort exactly even after offline reloads

   They can be folded into Phase R1.

## Decisions (Oct 4, 2026)

Approved with the recommendations:

1. Map: tap pins and rows to open a store card. No panning and no "Search this area".
2. No "Use my location" on the ZIP screen. The ZIP path stays as on mockup p. 12 (ZIP box, then 24 stores A to Z, no map), so declining costs exactly what it did.
3. Loading: a splash when each task starts, skeletons on screen changes, and spinners on actions.
4. Order timeline: Packed at about 8 s, On the way at about 15 s, then delivery once #5 and #6 are answered and at least 15 s have passed on the way.
5. Both data fixes are included, as Phase R0:
   - The stored address is only the practice address, "40 Oak Street", or `other`; the typed text stays in memory.
   - Every event gets `pageLoadAt` (phone clock at page load), `seq` (event number within the page load) and `clientTime`. The export sorts by these.
6. After Place order, Checkout shows a confirmation with "Track your order" instead of jumping to Orders, so the tracking timeline starts in Task 3 when the participant opens Orders.
7. Courier chat is left out (cosmetic).
