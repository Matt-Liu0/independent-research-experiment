# Changelog

Every build participants see has a version (`appVersion` on each record). Bump `version` in `package.json` and add an entry here for any change made once data collection starts.

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
