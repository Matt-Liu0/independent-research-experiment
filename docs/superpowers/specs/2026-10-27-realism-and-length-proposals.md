# Part 1 realism and shorter sessions: proposals

Oct 27, 2026 · For Matt and Noah. Nothing here is built yet. The introduction and consent wording are left alone, since they are still undecided.

> Request: make Part 1 believable enough that people use the apps as their own instead of clicking through, and cut the length of every section where possible, since the current plan (Part 1 about 45–50 min, Part 2 about 40 min) is too long.

All times below are **estimates**. There is no pilot data yet; `minutesToComplete` from the pilot replaces them.

## Rules every change keeps

These carry over from the Oct 4 realism proposals and the design register.

1. **Same in both friction levels.** Only defaults and emphasis on the six decision screens differ.
2. **No privacy wording before the suspicion question.**
3. **No real personal data.** Choices are stored as option IDs, never typed text.
4. **Decision timing stays clean.** Nothing new appears while a prompt is on screen.
5. **The 29 flows stay** unless a row below says otherwise and you both agree.

---

## A. Realism: why people click through, and what helps

People click through when the session feels like a website test: a task card, then a screen, then a rating, with nothing that responds to them personally. The ideas below make it feel like *their phone* and *their account*, and give random clicking a visible cost that has nothing to do with privacy.

Ranked by value for the cost.

| # | Proposal | What the participant sees | Time added | Risk to the study |
|---|---|---|---|---|
| **R1** | **A short onboarding in each app** (the pipeline already lists "a short onboarding in the app"; it isn't built) | Bramble: "What do you usually buy?" Pick 3 of 12 items, and choose a weekly budget. Shop then shows a "Buy again" row and Deals sorts those items first. Stride: "What's your goal?" (move more / sleep better / less stress / train for an event) and "How active is a typical week?" Today and Plans then reflect the goal. | ~20–30 s per app | Low. People invest a little, so the account feels like theirs. One point to decide: whether Deals still sorts by their picks if they decline **personalized deals**. Real apps do, since the picks were given explicitly. We'd note it in the codebook. |
| **R2** | **In-app notifications** | Banners slide down inside the app: "Your order is packed", "Dana is on the way", "Sam: thanks! 👍" after sharing, "Workout saved, nice work!" in Stride. They are never shown while a prompt is open. | ~0 | Very low. Makes the order and workout feel live. |
| **R3** | **A phone home screen** | Each task opens from a home screen with the Bramble and Stride icons (and a few dummy icons), with the status bar showing the participant's own clock. The second app shows up as "just installed". This replaces the logo splash. | ~1 s per task | Very low. It is the strongest single cue that this is "a phone", not "a website". |
| **R4** | **One small, in-character check per task** that random clicking fails | Task 2: "…for delivery **before 6 PM**" (pick the right slot). Task 4: Deals shows prices, and the task says "under $5". Task 9: "plans that take **under 30 min a week**". The task bar only says ✓ when the condition holds. | ~5–10 s per task | Low. Gives a privacy-free **engagement score** (share of conditions met) to use as a quality flag in the exclusions. Conditions never involve a privacy prompt. |
| **R5** | **Visible after-effects of choices**, the same rule in both levels | Allowing background location shows the iOS-style "Bramble used your location in the background" pill later. An accepted partner offer adds a "From our partners: Keel Insurance" card to Deals or Today. | ~0 | **Medium.** It makes choices feel real, but people may *learn* from it and change later answers in the session (carryover). Suggest piloting with and without it, or leaving it out. |
| **R6** | **Less study chrome** | The task bar becomes a small pill at the top ("Task 3 of 10 · tap to read") and only expands when tapped or when the task is complete. | 0 | None. |

**Recommendation:** build R1–R4 and R6 now. Decide R5 with Noah.

Also, add a **click-through flag** to the pre-registered exclusions in ANALYSIS.md. It applies to participants who meet both of these:
- the median decision time across prompts is under 1 s
- they met fewer than half of the R4 conditions

Report results with and without those participants, as we do for suspicion.

---

## B. Making it shorter, section by section

### Part 1 (estimated now: about 40–47 min)

| Section | Now (est.) | Proposal | Saves | What it costs | Decide |
|---|---|---|---|---|---|
| Phone check, consent, welcome | 4–5 min | Not touched (introduction undecided) | — | — | Later |
| Bramble tasks (6) | 15–18 min | **Merge Tasks 2 and 3** into one errand: "Order oat milk and sourdough, then let Sam know when it'll arrive." The flows and their screens stay the same. | ~30–45 s | Task numbers in the data shift (one fewer task card and rating) | Matt |
| | | **Rewards: 3 offers → 2** (drop the university research offer in both apps). This also fixes the "too many asks on one page" problem noted in the design register. | ~1 min | 29 → 27 flows. Battery, codebook and pairs updated. | **Noah** |
| Stride tasks (4) | 9–11 min | No change beyond R4 | — | — | — |
| Ease rating after each task | ~1.5 min | **One tap, no Continue button** (saves 10 taps) | ~20 s | None | Matt |
| SUS, once per app (20 items) | ~3 min | **UMUX-Lite** (2 items per app; Lewis, Utesch & Maher 2013). It is a validated short substitute that correlates highly with SUS, so the "usability" cover story is kept. | ~2 min | Pipeline step 4 names SUS. Update it. | **Noah** |
| Suspicion | ~1 min | Keep | — | — | — |
| Settings check (7 questions, going through phone settings) | 4–6 min | **Remove it from Part 1.** It isn't in the pipeline's Experiment 2 procedure or in ANALYSIS.md. If we want it, ask the two key items (location setting of their delivery app, personalized ads) in Part 2's background survey. | 4–6 min | Lose the "real phone" comparison, unless it moves to Part 2 | **Noah** |
| **Total** | **~40–47** | | **~7–10 min** | | → **~32–38 min** |

R1–R4 add back about 1.5 min, so the Part 1 net is **about 34–40 min**.

### Part 2 (estimated now: about 40 min)

| Section | Now | Proposal | Saves | What it costs | Decide |
|---|---|---|---|---|---|
| Briefing | ~2 min | Shorter text, three bullets (draft anyway) | ~1 min | — | Matt |
| Interview | 15 min (7.5 per domain) | **10 min (5 per domain)**. Turn caps: open 4 → 3, structured 10 → 7. The case arm keeps all its cases, with 2 rule rounds instead of 3. | 5 min | Shorter transcripts, so less input for the agents in Experiments 3–4 | **Noah** (interview meeting) |
| Filler puzzle | 3 min | **2 min** | 1 min | Shorter gap between the interview and the questionnaire | Matt |
| Questionnaire (41 items + 12 repeats + practice, comprehension, 2 attention) | ~12 min | Keep. The 12 repeats are needed for RQ1.3, and the held-out items are the main outcome of Experiments 3–4. | — | — | — |
| Recall (6), background (IUIPC 10 + 3) | ~3 min | Keep | — | — | — |
| Debrief | ~2 min | Wording later | — | — | — |
| **Total** | **~40** | | **~7 min** | | → **~33 min** |

### Not recommended

- **Shorter order or workout timelines.** They are only about 25 s each already, and the design register flags them as compressed.
- **Fewer repeated items.** RQ1.3 relies on them.
- **Fewer held-out items.** They are the main outcome of Experiments 3–4.

---

## Questions for Noah

1. Remove the Part 1 settings check, or move the two key items to Part 2?
2. SUS → UMUX-Lite?
3. Rewards: 3 offers → 2 (29 → 27 flows)? Which offer goes?
4. Interview 15 → 10 min?
5. R5 (visible after-effects of choices): in, out, or pilot both?
