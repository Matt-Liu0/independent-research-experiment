# Stride's gamified nudges (option A): literature and proposal

Oct 13, 2026 · Stage 4 of the review pipeline · **For Matt and Noah to choose; nothing is built yet**

## The brief

- **Matt's choice, option A:** Stride's paid offers stay matched to Bramble's, so location vs. health stays a clean comparison.
- **What's added:** Stride gets extra Stride-only flows that use the non-monetary nudges fitness apps actually use. Each new flow:
  - is a real information flow, with its own CI coding and Part 2 vignette
  - keeps the usual two friction levels (Utz-style defaults and emphasis) on top of the gamified framing
  - is identical in both levels apart from defaults and emphasis
- **What it lets us ask:** whether people (and later, agents) give way more to a non-monetary nudge than to a stated preference. That's a new say–do contrast, separate from the matched pairs.

## What the literature offers

| Nudge type | Mechanism | Evidence (checked) | Fitness-app precedent |
|---|---|---|---|
| **Streak / loss framing** | People treat keeping a logged streak as a goal in itself; showing an intact streak raises continued engagement compared with showing a broken one | Silverman & Barasch, *On or Off Track: How (Broken) Streaks Affect Consumer Decisions*, J. Consumer Research 49(6), 2023 | Apple Fitness, Duolingo, Snapchat streaks |
| **Social proof** | Telling people how many others (friends) use a feature raises adoption | Das, Kramer, Dabbish & Hong, *Increasing Security Sensitivity With Social Proof*, CCS 2014 (50,000 Facebook users; friend counts drove 37% more exploration than a non-social notice). Mathur et al. 2019 list social proof as a dark-pattern category | Strava-style "your friends share their activities" |
| **Status / tiers / badges** | Points that raise a status level; the level unlocks rewards | Real-world: John Hancock Vitality's bronze → platinum tiers for fitness-tracker data (NPR, 2015) | Vitality, Fitbit badges |
| **Urgency / scarcity** | Countdown timers and limited quantity | Mathur et al., *Dark Patterns at Scale*, CSCW 2019 (urgency and scarcity among 7 categories found on 11K shopping sites) | Limited-time challenges |
| **Confirmshaming** | Declining phrased as a self-criticism ("No, I don't care about my health") | Mathur et al. 2019; Luguri & Strahilevitz, *Shining a Light on Dark Patterns*, J. Legal Analysis 13(1), 2021 (experiments with US consumers) | Common in opt-out links |
| **General framework** | Nudges for privacy can steer both ways; ethics of soft paternalism | Acquisti et al., *Nudges for Privacy and Security*, ACM Computing Surveys 50(3), 2017; Gray et al., *The Dark (Patterns) Side of UX Design*, CHI 2018 | — |

**Realism anchor for fitness data:** real fitness apps default activities to public, and 95% of moderately active users' protected locations could be recovered (Hassan, Hussain & Bates, USENIX Security 2018). Public activity sharing is therefore a realistic, consequential flow to attach a nudge to.

## Proposed new flows (pick 2–3)

Each sits on an existing Stride screen, so it follows that screen's unit for friction.

| ID | Where (task, unit) | What the participant sees | Information flow (CI) | Nudge |
|---|---|---|---|---|
| **G1 `stride_streak_autosync`** | Today after connecting (7, U1) | "🔥 3-day streak. Don't lose it: let Stride count your steps in the background, so days you forget to open the app still count." Buttons: Keep My Streak · Not Now | participant → Stride, step count, continuous, background | Streak / loss framing (Silverman & Barasch 2023) |
| **G2 `stride_community_map`** | Workout complete (8, U4) | "8 of your 12 friends share their workouts on the Stride community map. Share this workout's route and heart rate?" Buttons: Share to Community · Keep Private | Stride → public (anyone on Stride), workout route and heart rate, ongoing | Social proof (Das et al. 2014; Mathur et al. 2019); realism from Hassan et al. 2018 |
| **G3 `stride_gold_tier`** | Rewards (10, U6) | "You're 40 points from Gold. Connect your sleep tracker to reach Gold and unlock premium plans." Buttons: Reach Gold · Not Now. No coins, so the money stays matched | participant → Stride, sleep history, ongoing | Status tier (the Vitality model) |
| G4 (optional) | Plans (9, U5) | A challenge with a countdown: "Join today's challenge, 2 h 14 m left: your weekly distance is shown on the city leaderboard" | Stride → other users, weekly distance | Urgency (Mathur et al. 2019) |

**Recommendation: G1, G2, G3.** They cover three distinct mechanisms (loss, social, status), each has a checked source, each is common in real fitness apps, and none pays money. Confirmshaming is left out because it changes the decline wording, which would break the rule that labels are identical in both levels. Urgency (G4) is optional: a ticking timer makes the session more stressful and may read as fake.

## Design rules for these flows

- **Labels and framing are identical in both levels;** only defaults and emphasis differ, as everywhere else. The gamified framing is a property of the flow, not of the friction level.
- **Privacy option last;** declining always completes the task (it never triggers the unfinished-task check).
- **Numbers are fixed and the same for everyone** ("3-day streak", "8 of your 12 friends", "40 points from Gold"), like every other practice detail.
- **Each new flow needs a Part 2 vignette.** That's 3 more battery items.
- **Data:** each new flow gets `counterpart: null` and `nudgeType: streak | social_proof | status`, a new column in `flows.csv` and the codebook.

## Questions for Matt and Noah

1. **Which flows:** G1, G2 and G3, with or without G4?
2. **The social-proof friend count:** fixed at "8 of 12", or worded with no number ("Most of your friends…")? The numbered version follows Das et al. more closely.
3. **Analysis:** compare the gamified flows with each other (loss vs. social vs. status), or each with its own stated verdict only?
