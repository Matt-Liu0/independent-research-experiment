# Design rationale register: Experiment 2 site (Bramble and Stride)

Oct 13, 2026 · Stage 1 of the review pipeline (`2026-10-13-site-review-pipeline.md`)

> **Out of date in part (Oct 27, 2026):** the norming survey and Prolific recruitment were dropped. Participants are Colgate students with participant codes, paid by gift card; RQ1.2 compares the interview arms. Current state: `Research Methodology Pipeline.md` and `experiment2/RECRUITMENT.md`. This record is kept as written.

One row per design decision: what we chose, why, the supporting source, and what else was considered.

- **How sources are marked:** a source in **bold brackets** was checked against the paper or page itself (references at the end). "Our choice" means no published source decides it, and the reason is given instead.
- **Gaps:** rows marked **needs source** are where a citation would strengthen the paper. Matt and Noah should fill or accept them.
- **Version:** current to site version 0.15.0.

## 1. Study frame

| # | Decision | Choice | Reason | Source | Alternatives considered |
|---|---|---|---|---|---|
| F1 | Cover story | "Try two new apps", not a usability test or privacy study | A testing frame invites exploring rather than using; a privacy frame primes privacy | Pipeline document (Experiment 2, Environment). **Needs source** on demand effects / priming | Disclose the privacy focus up front (rejected: primes) |
| F2 | Usability survey | SUS once per app | Fits the cover story; standard 10 items | Brooke (1996), SUS. *To verify the exact citation before use* | No survey (weakens the cover story) |
| F3 | Suspicion probe | "In one sentence, what do you think this study is about?" | Detects people who guessed the purpose, for exclusion or sensitivity analysis | **Needs source** (funnel debriefing literature) | Multi-item funnel debrief (longer) |
| F4 | Practice data only | Practice address, simulated location, made-up health numbers, practice card and birthday | Ethics: participants never give real data; typed addresses are reduced to three values | Our choice (IRB) | Real location (rejected: risk, IRB) |
| F5 | Phone only | Device check turns computers away | Prompts and sheets are phone UI; a desktop changes behavior | Our choice | Allow desktop (realism loss) |

## 2. The friction (nudging) manipulation

| # | Decision | Choice | Reason | Source | Alternatives |
|---|---|---|---|---|---|
| N1 | What "nudged" and "neutral" mean | One-tap choices: only the sharing option highlighted vs. all options formatted alike. Settings: pre-checked vs. unchecked | Replicates a published manipulation instead of inventing one | **[U]** Utz et al. 2019 (nudging = only "Accept" highlighted; categories pre-checked vs. unchecked) | Text-link "decline" (stronger; resembles **[N]**). Rejected Oct 8 for a cleaner replication |
| N2 | Required choice in neutral | Removed; neutral settings start unchecked | [U]'s non-nudging condition is unchecked, not forced | **[U]**; **[M]** (unchecked boxes) | Forced choice (our earlier variant) |
| N3 | Within-subject friction | 3 of 6 decision screens nudged per person; balanced over the 20 patterns | More power than between-subjects at n≈100; each screen is seen at both levels across people | Advisor decision (Noah, Oct 2026). **Needs source** for within-subject consent-UI designs | Between-subjects (half the power) |
| N4 | Same pattern in both apps | A screen nudged in Bramble is nudged in Stride | Each matched pair is then at the same level, so location vs. health isn't confounded with friction | Our choice | Independent patterns per app (confounds pairs) |
| N5 | What stays identical across levels | Wording, labels, purpose text, points, delays, the extra steps after declining | Only defaults and emphasis may differ, so differences are attributable to the nudge | **[T]** (purpose strings change approval rates, so they must match across levels) | — |
| N6 | Cost of declining | Refusing location leads to a ZIP search (same in both levels) | Without some cost, actions would mirror statements and the say–do gap would be artificially small | Pipeline document. **Needs source** | No cost (gap too small); a level-specific cost (confounds) |
| N7 | Declining health access in Stride | No extra cost | Asking people to type health numbers would invite real data | Our choice (F4) | Manual entry (rejected) |

## 3. Wording

| # | Decision | Choice | Source |
|---|---|---|---|
| W1 | Location prompt | "Allow “Bramble” to use your location?" · Allow Once · Allow While Using App · Don't Allow (iOS order) | **[A1]** |
| W2 | Accuracy | "Precise" (Precise / Approximate); "When precise location is off, … approximate location" | **[A1]** (Precise toggle), **[G1]** |
| W3 | Background upgrade | Change to Always Allow · Keep Only While Using | **[A2]** |
| W4 | In-app background request | Allow · Don't Allow | **[A1]** binary wording |
| W5 | Paid offers | Accept · Decline; Accepted / Declined afterwards | **[U]** binary notice |
| W6 | Settings page labels | While Using the App · Ask Next Time Or When I Share · Never; Precise Location | **[A3]** |
| W7 | One wording for everyone | iOS wording on Android too | Keeps the text identical across participants; Apple's strings are documented verbatim. *Our choice* |
| W8 | Stride wording | The same buttons as each matched Bramble flow | Pairs differ only in information. *Our choice* |
| W9 | Courier, Sam, partner offers | Kept as written | No direct precedent (see `2026-10-07-privacy-ui-wording-alignment.md`) |

## 4. Flows and the CI coding

| # | Decision | Choice | Source |
|---|---|---|---|
| C1 | Flow description | Five CI parameters, with the transmission principle split into aim, condition, temporal and consideration | **[CI]** Nissenbaum; **[GKC]** Shvartzshnaider, Sanfilippo & Apthorpe 2022 |
| C2 | Information categories | Matt's list (health, financial, demographic, communication, digital activity, biometric), plus attribute, granularity, temporality and identifiability | Matt's taxonomy. **Needs source** for the category list |
| C3 | Vignette wording for Part 2 | Built from each flow's `ci.statement` | **[AP]** Apthorpe et al. 2018 template |
| C4 | Verdict mapping | Allow / Allow While Using → allow; Allow Once → ask; least-sharing option → block | Pipeline document |
| C5 | Stride mirrors Bramble | Same unit, kind, recipient type, condition, points and buttons; health instead of location | Our choice: isolates information type (the CI question) |
| C6 | Extra Bramble flows | Saved card (financial), birthday deals (demographic) | Matt, Oct 8: diversify information types |
| C7 | Face ID | Dropped | Real Face ID keeps the face data on the phone, so "Stride saves a scan" isn't how phones work; it also had no counterpart (Matt, Oct 13) |
| C8 | Stride-only gamified flows | G1 streak (background steps), G2 social proof (public community map), G3 status tier (sleep tracker); no coins; same two levels | Matt, Oct 13 (option A). Sources in `2026-10-13-stride-gamified-nudges.md`: Silverman & Barasch 2023; Das et al. 2014; Mathur et al. 2019; Hassan et al. 2018 (**[H]**); Vitality (**[V]**) |
| C9 | No countdown (G4), no confirmshaming | Left out | Countdown adds stress and may look fake; confirmshaming would change decline wording across levels (Matt, Oct 13) |
| C10 | Fixed friend count ("8 of your 12 friends") | Fixed and the same for everyone | Follows Das et al.'s numbered social-proof notices (Matt, Oct 13) |
| C11 | Analysis of gamified flows | Each flow against its own stated verdict; no nudge-vs-nudge test | One flow per nudge type, so nudge and flow are confounded at any n (see the nudge spec) |

## 5. Incentives

| # | Decision | Choice | Reason / source |
|---|---|---|---|
| I1 | Paid data offers | Insurer +200, university +100, data partners +150; 100 points = $0.10, paid as a real bonus | Real stakes make the choice consequential. Real-world precedent: insurers paying for fitness data (**[V]**, John Hancock Vitality). Amounts: *our choice*; **needs source** on the price of personal data |
| I2 | Points follow answers | Undoing an accepted offer takes the points back | Closes a loophole (accept, then unlink) |
| I3 | Bonus range | $0.24–$1.14 across both apps | Our choice; check against Prolific's pay guidance |

## 6. Session and tasks

| # | Decision | Choice | Reason |
|---|---|---|---|
| S1 | Task order (Bramble) | Random, with 1 before 2, 3 straight after 2, 6 last (12 orders) | Spreads fatigue across flows; keeps prerequisites (store before ordering) |
| S2 | Task order (Stride) | 7 first, then 8–10 random | Health data must be connected first |
| S3 | App order | Random, balanced, crossed with the pattern (40 cells) | Separates app from position, so fatigue and carryover can be estimated. *Counterbalancing is standard; **needs source** if cited* |
| S4 | Both apps for everyone | Within-person information type | Power for the central CI comparison (Matt, Oct 8) |
| S5 | Unfinished-task check | "This task doesn't look finished yet" when Done is tapped early | Engagement: people should do the tasks (Matt, Oct 13). Never triggered by a privacy answer |
| S6 | Waiting guidance | "Keep this page open …" during the order and the workout | Same reason; says nothing about the questions |
| S7 | Fixed delays | Loading and timeline delays are identical for everyone | Adds no noise between people or levels |
| S8 | When prompts appear | Background and Sam prompts appear on the way or in the main set, not at once | Matches when real apps ask (in context) |

## 7. Realism review (Matt: realistic, but not too polished to be believable)

Screen-by-screen comparison with real apps. These are observations, not sources. Items marked ⚠ are worth a decision.

| Screen | Like real apps | Differs | Note |
|---|---|---|---|
| Location prompt | iOS sheet wording and order | Drawn by the site, not the OS | Fine: an in-app pre-prompt is a common pattern |
| Find a store | Real street map, store pins, stock | Only Bramble's stores; simulated position | OK |
| Checkout | Courier sharing, saved card, partner box | — | OK |
| Order tracking | Placed → Packed → On the way, live courier dot | ⚠ About a minute end to end (real: 30–60 min) | Necessary compression; the guidance text helps |
| Rewards | Points balance, redeem, partner offers | ⚠ Three data-for-points offers on one page is dense | Consider whether the density reads as fake in the pilot (suspicion answers) |
| Stride health prompt | Same as the OS location prompt | Real Apple Health uses per-category switches | Kept identical to the counterpart on purpose (C5) |
| Workout | Phases, live heart rate, coach | ⚠ 10 "minutes" in about 25 s | Necessary compression |
| Stride insurer offer | Real precedent (**[V]**) | — | Strong realism anchor |
| Strava-like public sharing | Defaults public in real apps (**[H]**) | Asked, not preset (G2) | Added in 0.15.0 |
| Streak and status tier (G1, G3) | Common in fitness apps (Apple Fitness, Vitality) | ⚠ Rewards now has four asks (three offers and the Gold card) | Watch the suspicion answers in the pilot |

## References (all checked)

- **[U]** Utz, Degeling, Fahl, Schaub & Holz. *(Un)informed Consent: Studying GDPR Consent Notices in the Field.* CCS 2019.
- **[N]** Nouwens, Liccardi, Veale, Karger & Kagal. *Dark Patterns after the GDPR.* CHI 2020.
- **[M]** Machuletz & Böhme. *Multiple Purposes, Multiple Problems: A User Study of Consent Dialogs after GDPR.* PoPETs 2020.
- **[T]** Tan, Nguyen, Theodorides, Negrón-Arroyo, Thompson, Egelman & Wagner. *The Effect of Developer-Specified Explanations for Permission Requests on Smartphone User Behavior.* CHI 2014.
- **[AP]** Apthorpe, Shvartzshnaider, Mathur, Reisman & Feamster. *Discovering Smart Home Internet of Things Privacy Norms Using Contextual Integrity.* IMWUT 2018.
- **[GKC]** Shvartzshnaider, Sanfilippo & Apthorpe. *GKC-CI: A Unifying Framework for Contextual Norms and Information Governance.* JASIST 73(9), 2022, 1297–1313.
- **[A1–A3]** Apple developer documentation (Core Location authorization prompts) and Apple Support, "Turn Location Services and GPS on or off".
- **[G1]** Android Open Source Project, PermissionController strings.
- **[H]** Hassan, Hussain & Bates. *Analysis of Privacy Protections in Fitness Tracking Social Networks -or- You can run, but can you hide?* USENIX Security 2018.
- **[V]** NPR, "John Hancock Hopes You'll Trade Activity Data For Insurance Discounts" (Apr 8, 2015) and "Weighing Privacy Vs. Rewards Of Letting Insurers Track Your Fitness" (Apr 9, 2015).
- **[CI]** Nissenbaum, contextual integrity (*Privacy in Context*, 2010). *Cite the exact edition when used.*
- Nudge and dark-pattern sources for Stride are listed in `2026-10-13-stride-gamified-nudges.md`.
