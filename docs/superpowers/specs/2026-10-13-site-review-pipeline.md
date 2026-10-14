# Site review pipeline: Bramble and Stride fixes

Oct 13, 2026 · From Matt's review of both apps

## Matt's concerns

**Bramble**
1. Finalize the wording, and make sure people actually do the tasks.
2. Document every design decision and support it with related work.
3. Give instructions during the order.
4. Make sure the site can handle about 100 people.
5. Work out exactly how the site connects to Prolific.

**Stride**

6. An icon for the workout page.
7. Diversify the controls and menu.
8. A different reward and nudging system, based on the literature, applied to Stride and not Bramble.
9. Do the two apps need a random order?
10. Is Face ID worthwhile?

## Decisions so far

- **(1) What "nudged" means:** people should actually *do* the tasks, in scenarios that are realistic but not too polished to be believable. This covers task engagement plus a realism review. It is not about the strength of the friction manipulation.
- **(8) Option A (Matt, Oct 13):** Stride's paid offers stay matched to Bramble's (same recipients, aims and points), so location vs. health stays a clean comparison. Stride gains *extra* gamified nudges as Stride-only flows, drawn from the nudge and dark-pattern literature.
- **(9) App order stays randomized and balanced (Matt, Oct 13).**
- **(10) Face ID dropped (Matt, Oct 13).** Removed in v0.14.0; Stride has 12 flows, all paired.
- **Wording proposal approved (Matt, Oct 13)** and applied in v0.14.0, Stride included.
- **(8) Stride nudges chosen (Matt, Oct 13):** G1 streak, G2 social proof with a fixed friend count, G3 status tier; no countdown. Analysis: each flow against its own stated verdict. Built in v0.15.0.

## Measurements behind (4)

- **Writes per person:** a minimal Stride run logs about 34 events. A full two-app session is roughly 250–400 writes (events plus state saves).
- **Free-tier limit:** 100 people means about 25k–40k writes, above the Spark plan's 20,000 writes per day. Writes beyond the limit fail until the quota resets. The study needs the Blaze plan with a budget alert.
- **Contention:** every assignment updates `meta/assignment`, so a burst of starts queues transactions. This needs a load test.

## Stages

| Stage | Work | Depends on |
|---|---|---|
| 0. Decide | Face ID; app order; approve the Oct 7 wording proposal; choose which Stride nudges to add | Matt and Noah |
| 1. Rationale register | One row per design decision: choice, reason, source (checked, never guessed), alternatives. Gaps marked "needs source". Plus a realism review of every screen against real apps (Instacart, DoorDash, Strava, Apple Health, Fitbit) | — |
| 2. Wording | Apply the approved wording to Bramble; align Stride with the Apple Health and Android Health Connect permission text | 0, 1 |
| 3. Engagement and UI | Guidance text while the order and the workout run; a check when Done is tapped on an unfinished task ("Keep going" / "I'm done", the same in both levels, logged); a workout icon; Stride's own navigation and look, with the decision controls unchanged | — |
| 4. Stride nudges (option A) | Literature review, then 2–3 Stride-only gamified flows (e.g. streaks, social proof, badges), each with its CI coding and both levels | 0, 1 |
| 5. Capacity | Blaze plan and budget alert (Matt, in the Firebase console); a load test with 100 simultaneous starts; real writes per session; a live progress count | — |
| 6. Prolific | Setup guide (study URL, device filter, codes, pay); bonus CSV script; Part 2 invitation plan | — |
| 7. Pilot | 5–10 people on pilot links: task completion, timing, confusion, suspicion, nudge effect | 1–6 |

## Constraints

- **Decision controls stay identical across apps:** the prompt sheets, button order, emphasis and switches. Only the surroundings may differ, so app differences come from the information, not the interface.
- **Guidance and checks never hint at the privacy questions,** and are the same in both friction levels.
- **The unfinished-task check accepts any answer:** declining is never "unfinished". It only asks about the task's goal (e.g. a store set, an order placed).
