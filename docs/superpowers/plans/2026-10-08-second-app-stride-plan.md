# Plan: second app (Stride) and Bramble data expansion

Implements `docs/superpowers/specs/2026-10-08-second-app-stride-design.md`. Each phase ends with every test passing and its own commit.

1. **CI split.** Replace `informationType` with `informationCategory`, `attribute`, `granularity`, `temporality` and `identifiability` on the 12 existing flows. Update the export columns, codebook, tests and `DATA.md`.
2. **Bramble expansion.** Add the `birthday_deals` (Deals, U5) and `save_card` (Checkout, U2) flows, the practice profile data, tests, and parity and decline-everything coverage.
3. **Platform core.**
   - Move the app-independent engine out of `bramble/` into `core/`: flow registry, units, CI, the show / choose / settle engine (`AppProvider`), `FlowChoice`, `Sheet`, loading, timing and Back.
   - Add `app` to `FlowDef`.
   - Bramble becomes a module built on the core.
   - No behavior change, so all existing tests must still pass.
4. **Session for two apps.**
   - Add `appOrder` and the 10-task order with its validation, balanced app order, `strideState` persistence, and the transition screen.
   - Run the SUS once per app, and sum the bonus.
   - Agent mode gets `appOrder`. Update the export.
5. **Stride app.** Flows, data, state reducer, screens (Today, setup sheet, workout setup, live workout timeline, Plans, Rewards, Profile), styling and tasks 7–10 with their outcomes. Tests mirror Bramble's: screens, decline-everything, parity across levels, logging order and the points range.
6. **Docs and checks.**
   - Update `DATA.md`, the README, the changelog and the pipeline document (Experiment 2 now covers two apps).
   - Bump the version.
   - Check the production build in a headless browser for both app orders.
