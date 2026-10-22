# Running Part 1 on Prolific

How the site and Prolific fit together, and the steps to set up, pilot, launch and pay. Prolific's screens change from time to time: where this guide names a Prolific setting, check its current help pages for the exact wording.

## How the two connect

```
Prolific study page ──(participant clicks "Open study in a new tab")──▶ our site
   ?PROLIFIC_PID=…&STUDY_ID=…&SESSION_ID=…    (Prolific fills these in)
                                                     │
                     our site: phone check → consent → both apps → surveys
                                                     │
our site ──(link "Back to Prolific")──▶ app.prolific.com/submissions/complete?cc=<completion code>
                                                     │
Prolific: submission "Awaiting review" ─▶ you approve ─▶ base pay; then bonuses (below)
```

- **Prolific → us.** The three IDs in the link are all we receive. The Prolific ID is the key of the participant's record. One record per ID is enforced: a second browser with the same ID is refused, and the same browser resumes where it left off.
- **Us → Prolific.** The completion code (`VITE_PROLIFIC_COMPLETION_CODE`) is on the "Back to Prolific" link at the end. The return code (`VITE_PROLIFIC_RETURN_CODE`) is for people who can't continue for technical reasons.
- **We never send data to Prolific automatically.** Approvals, bonuses and the Part 2 invitations are done by hand in Prolific, using files from `npm run export`.

## 1. Before creating the study

1. **Firebase:**
   - Switch the project to the **Blaze (pay-as-you-go) plan** and set a budget alert (for example $5).
   - On the free plan, Firestore allows 20,000 writes a day. One participant makes roughly 250–400, so a 100-person day would hit the limit, and writes after it would be lost.
   - At this size Blaze costs a few cents. Cloud Functions (the Part 2 interviewer) also need Blaze; their own cost is cents.
   - **Anthropic API:** the interviewer calls Claude Sonnet 5.5, billed to your Anthropic account (an estimated $0.20–$0.50 per Part 2 participant: about 20 short replies; set a spending limit in the Anthropic console). Store the key with `npx firebase functions:secrets:set ANTHROPIC_API_KEY`.
2. **Deploy:** `npm test && npm run test:rules && npm run test:functions && npm run build`, then deploy hosting, rules and functions (see `README.md`, "Before launch").
3. **Consent:** the IRB consent text is in `src/study/consentText.ts`, with `isDraft: false`.
4. **Codes:** create the study in Prolific (next section) to get its completion code, put it in `.env.local`, then **rebuild and redeploy**.

## 2. Study settings in Prolific

| Setting | Value |
|---|---|
| Study link | `https://<your-site>/` with **"I'll use URL parameters"**, which adds `?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}` |
| Device | **Mobile only**. The site also checks for itself and turns computers away with a QR code |
| Completion | "I'll redirect them using a URL", with the completion code from `.env.local` |
| Time estimate | About **45–50 minutes**; update it from the pilot's median (`minutesToComplete` in `participants.csv`) |
| Pay | At or above Prolific's recommended hourly rate for that time, plus the in-app bonus ($1.00–$12.00, usually under $10), paid separately |
| Description | Use the cover story: "try two new apps". Don't mention privacy or nudging (the debrief comes at the end of Part 2) |
| Places | Start with the pilot (below), then the full sample in batches |

## 3. Pilot

1. Use links with `&pilot=1`. Their data goes to `pilot_participants`, separate from the study's.
2. Run a small Prolific study (5–10 people) with that link, or send the link to colleagues.
3. Export with `npm run export -- --pilot`, then check:
   - **Completion:** `completed`.
   - **Time:** `minutesToComplete`.
   - **Tasks:** `tN_done`, plus `unfinished_check` events: are people getting stuck?
   - **The nudge:** sharing rates on nudged vs. neutral screens in `flows.csv`.
   - **Suspicion:** the `suspicion` answers. Do people guess the purpose?
4. Fix what's needed, bump the version, redeploy.

## 4. Launch

- **Release in batches:** for example, 25 places, then add more. The site handles 100 people arriving at once (`npm run test:load`), but batches let you catch problems early.
- **Watch progress:** the Firebase console's Firestore page (`participants`, `stage = done`), or a quick `npm run export`.
- **Returns and time-outs:** Prolific reopens the place automatically. Their partial record stays in our data with `completed = false`.

## 5. Approving and paying bonuses

1. Run `npm run export`. This writes `exports/<date>/` with:
   - `participants.csv`
   - `prolific-bonuses.txt`: one `<Prolific ID>,<amount>` line per Prolific participant who finished, with both apps' balances added up
2. **Approve** completed submissions in Prolific. To check a submission, look its study code up in `id-map.csv`, then find that code in `participants.csv`.
3. **Pay bonuses:** in the study's submissions, use **Bulk bonus payment** and paste the lines from `prolific-bonuses.txt`. Prolific shows the total before you confirm.
4. **Privacy:** `id-map.csv` and `prolific-bonuses.txt` contain Prolific IDs. Keep them off shared drives, and don't commit them (`exports/` is git-ignored).

## 6. Part 2 (seven days later)

1. Make an allowlist from the Prolific IDs of everyone who completed Part 1 (the `id-map.csv` rows whose `studyCode` has `completed = true`).
2. Create the Part 2 study with Prolific's **custom allowlist** screener set to those IDs, so only Part 1 participants can take it.
3. Message them through Prolific when it opens. Part 1's closing page already tells them Part 2 opens in 7 days.
4. **Study URL:** `https://<site>/part2.html?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`. Set **device** to desktop only (the page turns phones and tablets away).
5. **Completion code:** set `VITE_PROLIFIC_PART2_CODE` in `.env` before building.
6. **Linking:** the export joins Part 2 to Part 1 by Prolific ID and reuses the Part 1 study code (`part2-participants.csv` → `matchedToPart1`).

## 7. Norming survey (separate people)

1. **Study URL:** `https://<site>/norming.html?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`. Any device.
2. **Completion code:** `VITE_PROLIFIC_NORMING_CODE`.
3. **Exclude** everyone who took Part 1 or the pilot (Prolific's custom blocklist, from `id-map.csv`).

## Code-recruited participants (students)

Links of the form `/?code=S0123` work the same way but end with "You're all done" instead of a Prolific link. They're left out of `prolific-bonuses.txt`; pay them as their invitation says (`bonusUSD` in `participants.csv`).
