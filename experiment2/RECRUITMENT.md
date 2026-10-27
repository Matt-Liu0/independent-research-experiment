# Running the study with Colgate students

How the site, the participant codes and the payments fit together, and the steps to set up, pilot, launch and pay. All participants are Colgate students: each gets a participant code in a personal link and is paid directly by gift card. There is no recruitment platform and no platform fee. The numbers below follow the study budget (Target $5k scenario, Oct 27, 2026).

## How it fits together

```
you ──(invitation email with a personal link)──▶ our site
   https://<site>/?code=S0123          (Part 1, on a phone)
                                                     │
                     our site: phone check → consent → both apps → surveys → "You're all done"
                                                     │
you ──(seven days later: second email)──▶ https://<site>/part2?code=S0123   (Part 2, on a computer)
                                                     │
npm run export ──▶ who finished, and each person's bonus ──▶ you buy and send the gift cards
```

- **The code is the only thing we receive.** It is the key of the participant's record. One record per code is enforced: a second browser with the same code is refused, and the same browser resumes where it left off. Part 2 uses the same code, which is how the two parts are joined.
- **We never contact participants automatically.** Invitations, reminders and payments are done by hand, from the roster and from the files `npm run export` writes.

## 1. Before inviting anyone

1. **Firebase:**
   - Switch the project to the **Blaze (pay-as-you-go) plan** and set a budget alert (for example $5).
   - On the free plan, Firestore allows 20,000 writes a day. One participant makes roughly 250–400, so a busy day could hit the limit, and writes after it would be lost.
   - At this size Blaze costs a few cents. Cloud Functions (the Part 2 interviewer) also need Blaze; their own cost is cents.
   - **Anthropic API:** the interviewer calls Claude Sonnet 5.5, billed to your Anthropic account (an estimated $0.20–$0.50 per Part 2 participant: about 20 short replies; set a spending limit in the Anthropic console). Store the key with `npx firebase functions:secrets:set ANTHROPIC_API_KEY`.
2. **Deploy:** `npm test && npm run test:rules && npm run test:functions && npm run build`, then deploy hosting, rules and functions (see `README.md`, "Before launch").
3. **Consent:** the IRB consent text is in `src/study/consentText.ts`, with `isDraft: false`. The consent and invitation must describe the gift-card payment the IRB approved.
4. **Participant codes:** make a roster (a private spreadsheet) with one row per invited student: code, name, email, and columns for Part 1 done, Part 2 done and amount paid. Codes can be any letters, digits, `-` or `_` (up to 64), for example `S0001`, `S0002`, …; don't build them from names or student IDs. Keep the roster off shared drives: it is the only link between codes and people.

## 2. Sample and pay (from the budget)

| | People | Length | Pay |
|---|---|---|---|
| Part 1 (Experiment 2, phone) | about **129** invited and started | about 50 min | **$12.50** base ($15/hour) plus the points bonus ($1.00–$12.00; budgeted at $2 on average) |
| Part 2 (Experiment 1, computer) | about **98** return | about 35 min (the budget sheet still assumes 45) | $15/hour base plus a **$3** completion bonus |
| Pilot (both parts) | **10** | as above | as above |

The target is **90 analyzable** participants (30 per interview arm). The number to invite comes from the drop-off rates in the budget (93% valid Part 1, 82% return, 92% analyzable); recheck it after the pilot.

## 3. Pilot

1. Use links with `&pilot=1`, e.g. `https://<site>/?code=S9001&pilot=1`. Their data goes to `pilot_participants` and `pilot_part2`, separate from the study's.
2. Invite the 10 pilot students, or send the link to colleagues.
3. Export with `npm run export -- --pilot`, then check:
   - **Completion:** `completed`.
   - **Time:** `minutesToComplete` (set the pay for the real sessions from the median).
   - **Tasks:** `tN_done`, plus `unfinished_check` events: are people getting stuck?
   - **The nudge:** sharing rates on nudged vs. neutral screens in `flows.csv`.
   - **Suspicion:** the `suspicion` answers. Do people guess the purpose?
   - **Bonus:** the average `bonusUSD`, to update the budget's points-bonus estimate.
4. Fix what's needed, bump the version, redeploy.

## 4. Invitations (Part 1)

- **Link:** `https://<site>/?code=<their code>`. The page only works on a phone; on a computer it shows a QR code to open the same link on the phone.
- **Wording:** use the cover story, "try two new apps". Don't mention privacy or nudging (the debrief comes at the end of Part 2). Say it takes about 50 minutes, that there are two parts a week apart, and how and when they will be paid.
- **Send in batches,** for example 25 at a time. The site handles 100 people arriving at once (`npm run test:load`), but batches let you catch problems early.
- **Watch progress:** the Firebase console's Firestore page (`participants`, `stage = done`), or a quick `npm run export`.

## 5. Part 2 (seven days later)

1. From the export, find who completed Part 1 (`participants.csv`, `completed = true`; look the study code up in `id-map.csv` to get the participant code, then the roster for the email).
2. Email each of them `https://<site>/part2?code=<their code>`. It needs a computer (the page turns phones and tablets away). Part 1's closing page already tells them Part 2 opens in 7 days.
3. **Linking:** the export joins Part 2 to Part 1 by participant code and reuses the Part 1 study code (`part2-participants.csv` → `matchedToPart1`).

## 6. Paying

1. Run `npm run export`. This writes `exports/<date>/` with, among others:
   - `participants.csv` and `part2-participants.csv`: who finished each part
   - `bonus-payments.csv`: one row per participant who finished Part 1 with a points bonus, `participantCode,bonusUSD` (both apps' balances added up)
2. **Part 1:** base pay plus the amount in `bonus-payments.csv`. **Part 2:** base pay plus the $3 completion bonus. Combine them into one gift card per part, or one at the end, as the invitation promised.
3. Record what you paid in the roster.
4. **Who still gets paid:** people who stop because of a problem on our side (the site's error page tells them they'll be paid for their time). People who decline consent leave before doing anything.
5. **Privacy:** `id-map.csv`, `part2-id-map.csv`, `bonus-payments.csv` and the roster contain participant codes. Keep them off shared drives, and don't commit them (`exports/` is git-ignored).
