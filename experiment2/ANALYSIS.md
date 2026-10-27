# Analyzing the data

How to go from the Firestore database to the Experiment 1 and 2 results in the pipeline (`../docs/superpowers/specs/Research Methodology Pipeline.md`). What every column means is in `DATA.md` section 7 (Part 1) and section 9 (Part 2); this guide says which files and columns to use for each question, and in what order.

The case arm is only assigned once the case set T is filled in (`functions/src/prompts.ts`); until then Part 2 people are in the open-ended or structured arm.

## 1. Export

1. Get a service-account key: Firebase console → Project settings → Service accounts → Generate new private key. Save it **outside the repo** (it gives full access to the database).
2. Export:
   ```sh
   cd experiment2
   export GOOGLE_APPLICATION_CREDENTIALS=~/keys/privacy-say-do-study.json
   env -u NODE_OPTIONS npm run export             # study data → exports/<date>/
   env -u NODE_OPTIONS npm run export -- --pilot  # pilot data instead
   ```
3. You get:

| File | One row per | Use it for |
|---|---|---|
| `flows.csv` | participant × site flow (29 each) | **Experiment 2**: what people did |
| `participants.csv` | Part 1 participant | exclusions, timing, ease, SUS, bonus |
| `events.csv` | event | anything not summarized elsewhere (timing, back-and-forth) |
| `verdicts.csv` | Part 2 participant × battery item (41 each) | **Experiment 1**: what people said, joined to what they did |
| `part2-participants.csv` | Part 2 participant | attention, comprehension, recall, IUIPC |
| `flow-codebook.csv`, `battery-codebook.csv` | flow / item | GKC-CI parameters for tracing gaps to parameters |
| `transcripts.jsonl` | Part 2 interview | the transcripts D: coverage coding (RQ1.1) and the agents' input in Experiments 3 and 4 |
| `id-map.csv`, `part2-id-map.csv`, `bonus-payments.csv` | person | **payment only**. Contain participant codes: never share or analyze these |

Analyze only files keyed by `studyCode`. `exports/` is git-ignored; keep it that way.

## 2. Exclusions (decide before looking at results)

Write the rules down, ideally in the preregistration, before opening the outcome columns. Report how many people each rule removes.

**Part 1** (`participants.csv`):
- Not finished: `completed` = `false`. Keep their rows in a dropout table, out of the main analysis.
- Wrong device: `passedDeviceCheck` = `false`, or `deviceCheckSkipped` = `true` (test runs only).
- Automation: `automated` = `true`.
- Data quality, as flags rather than automatic exclusions: very short `minutesToComplete`, high `timesHidden`, `errors` > 0, many `mapMoves` or `accountPageVisits` (exploring like a tester).
- Suspicion: code the `suspicion` answers (does the person mention privacy?). Results are reported **with and without** them, so add a `suspicious` column rather than dropping them.

**Part 2** (`part2-participants.csv`):
- `attentionPassed` = `false` or `comprehensionPassed` = `false`.
- `interviewDone` = `false` (left the chat early or it failed): report separately; they have no complete transcript.
- `matchedToPart1` = `false` (no Part 1 record, so no say–do comparison).
- Very fast answering: `medianItemMs` far below the rest (decide the cutoff from the pilot).

## 3. Experiment 2: what people did

Main table: `flows.csv`, filtered to included participants.

- **Outcome:** `firstVerdict` (`allow` / `ask` / `block`), the first committed choice. `finalVerdict` (after later Account / Profile changes) is a secondary check.
- **Which rows count:** `status` = `chosen`. Report the others separately:
  - `not_applicable`: a dependent flow after a refusal; not a choice.
  - `shown_not_settled`, `not_shown`: missing. A lot of these on one flow means the task didn't lead people to it.
- **Friction effect:** `friction` (`nudged` / `neutral`) varies within each person by decision screen (`unit`). Model:
  ```r
  library(ordinal)
  flows$firstVerdict <- factor(flows$firstVerdict, levels = c("block", "ask", "allow"), ordered = TRUE)
  m <- clmm(firstVerdict ~ friction + (1 | studyCode) + (1 | flowId), data = subset(flows, status == "chosen"))
  summary(m)
  ```
  Also report the plain share of `block` by `friction` and `flowId`; readers trust tables before models.
- **Defaults:** among flows with a preset (`defaultShown` not empty), the share with `changedFromDefault` = `false`, by friction. This is the "accepting a default is not choosing" measure.
- **Decision time:** `msSincePrompt`. Very fast decisions (e.g. under 1 s) suggest clicking through; compare by friction.
- **Matched pairs:** `counterpart` links each Stride flow to its Bramble twin (same screen, recipient and wording, health data instead of location). Compare verdicts within pairs to see the effect of information type.
- **Gamified flows:** rows with `nudgeType` (`streak`, `social_proof`, `status`) have no twin; report each on its own.
- **Order effects:** `appOrder` and the task's position (from `taskOrder`) as covariates, as a check.
- **Usability, for the cover story:** `susScore_bramble`, `susScore_stride`, `ease_t1`–`ease_t10` (no `ease_t3` from 0.19.0 on: Task 3 was merged into Task 2).

## 4. Experiment 1: what people said

Main table: `verdicts.csv` (Part 2).

- **Stated verdict:** `verdict` with `confidence` (1–5); `kind` says whether the item is a site flow (`site`) or held-out (`held_out`).
- **Consistency (RQ1.3):** the 12 rows with `repeated` = `true` have `verdict2`. Report each person's agreement rate, and Cohen's κ pooled over people:
  ```r
  library(irr)
  rep <- subset(verdicts, repeated)
  kappa2(rep[, c("verdict", "verdict2")])
  ```
  `unstable` (the two answers differ) and `uncertain` (both confidences 1–2) are the flags later experiments use.
- **Elicitation effect (RQ1.2):** compare the arms, with the open-ended arm as the reference (there is no no-interview group):
  ```r
  verdicts$arm <- relevel(factor(verdicts$arm), ref = "open")
  clmm(verdict ~ arm + (1 | studyCode) + (1 | itemId), data = verdicts)
  ```
- **Coverage and cost (RQ1.1):** code `transcripts.jsonl` for which flow coordinates and values each transcript addresses. Cost is in `part2-participants.csv`: `interviewMinutes`, `interviewParticipantTurns`, `interviewParticipantChars`, by `arm`. Turns with `source: fixed` are scripted (openers, cases, closing); only `source: model` turns were written by the interviewer.
- **Confidence shift (proposed):** the same model with `confidence` as the outcome.
- **Sample norm per flow (for Experiment 3):** from `verdicts.csv`, each item's majority verdict and its agreement rate over all Part 2 participants; for a given participant, leave their own answer out.

## 5. The say–do gap (Experiments 1 + 2 together)

`verdicts.csv` already joins each person's statement to their site action: `siteFirstVerdict`, `siteFriction` and `sayDoAgree` on rows with `kind` = `site`.

1. **Overall agreement:** share of `sayDoAgree` = `true`, overall, by friction and by flow.
2. **Direction:** said `block` but did `allow` (over-sharing) vs. said `allow` but did `block`. Cross-tabulate `verdict` × `siteFirstVerdict`.
3. **Flow labels** (the pipeline's classification), per person × site flow:
   - `unstable`, or both confidences 1–2 → **unstable statement**
   - else `sayDoAgree` → **consistent**
   - else → **say–do gap**
4. **Model:** `clmm(siteFirstVerdict ~ verdict + siteFriction + (1 | studyCode) + (1 | itemId))`, or a logistic model of `sayDoAgree` on `siteFriction`. Add `confidence` and its interaction with friction for the gap-by-confidence analysis.
5. **Trace to parameters:** join `battery-codebook.csv` (the `ci_*` columns) by `itemId` and see which recipients, aims or conditions carry the gap.
6. **Recall check:** `part2-participants.csv` has each recall answer with `<question>_correct`. People who don't remember their choice are a caveat on their say–do rows.

## 6. Reporting checklist

- Numbers of people at each step: arrived, consented, finished Part 1, finished Part 2, excluded (by rule), analyzed.
- Every main result with and without suspicious participants.
- Assignment balance: counts per `pattern` and `appOrder` (should be within 1 of each other).
- Missing-data table: `status` counts per flow.
- `appVersion`: if it changed during data collection, check results by version (`CHANGELOG.md` says what changed).

## 7. Pilot first

Run all of the above on the pilot export (`--pilot`) before the real data comes in. It checks the scripts, the time estimate (`minutesToComplete`), whether people get stuck (`unfinished_check` events, `tN_done`), and whether the nudge does anything (block rates by friction in `flows.csv`). Fix the scripts on pilot data, then rerun them unchanged on the study data.
