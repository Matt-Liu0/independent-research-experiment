# Changelog

Every build participants see has a version (`appVersion` on each record). Bump `version` in `package.json` and add an entry here for any change made once data collection starts.

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
