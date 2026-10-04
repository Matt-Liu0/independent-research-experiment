# Human study protocol and participant instructions

Sep 30, 2026 · @Matt

Run the human side as two sessions a week apart: not in one sitting, and without a third round. Recruit about 145 people to end with about 100 analyzable, plus about 110 for the norming survey. The site comes first to protect the cover story, built-in checks measure whatever order bias remains, and stability comes from repeated items inside Part 2.

## Session plan

Each participant in the main sample does two parts, a week apart. Everything the analyses need is collected by the end of Part 2.

| Part | When | Device | Length | What happens | Produces | Pay ($16/hour) |
| --- | --- | --- | --- | --- | --- | --- |
| Part 1 | Day 1 | Own smartphone | \~30 min | Consent, six Bramble tasks with an ease rating after each, usability survey, suspicion question, settings check | A (Exp 2), H (everyday settings) | $8 + points bonus ($0.12–$0.57) |
| Part 2 | Day 8 | Computer | \~45–50 min | Scenario briefing, chat with the assistant, filler, 48-item questionnaire, recall check, background survey, debrief | D and S (Exp 1), stability flags | $13 + $3 completion bonus |
| Norming survey | Any time, separate people | Any | \~17 min | The same questionnaire and background survey, nothing else | Social-norm reference, no-site comparison | $4.50 |

- **Why these devices.** Part 1 runs on the participant's own phone, so Bramble feels like a real app and the settings check reads that same phone. Part 2 runs on a computer, because answers typed on a phone are shorter, and that would change the transcripts.
- **One sitting per part.** Each part is done in one sitting. Part 2 closes 90 minutes after it starts, and a gap of more than 10 minutes during the chat is flagged.
- **Eligibility.** Adults with a smartphone and a computer, at least a 95% approval rate and 50 prior studies (experienced participants return more reliably). People from the pilot or the norming survey are excluded.

## Why not one sitting

A single sitting avoids dropout, but it collects statements minutes after the actions, while the choices are still fresh. That shrinks the say–do gap the study exists to measure.

| Option | Structure | Gains | Costs |
| --- | --- | --- | --- |
| One sitting (\~75 min) | Site, filler, chat, questionnaire | No dropout between parts; cheapest to recruit | Strongest pull toward consistency; the chat falls in the tired second half; 75 minutes online invites rushing |
| **Two sessions, a week apart (chosen)** | Site on Day 1; chat and questionnaire on Day 8 | The week weakens carryover; both sessions are short; the cover story holds through Part 1 | About 18% don't come back for Part 2; stability is measured within Part 2 rather than by a retest |
| Three sessions | Adds a five-minute retest on Day 15 | A true week-apart stability measure | Dropped: a third round asks too much commitment and would cost sign-ups and returns |

**Stability without a retest.** Each of the 12 site flows is asked twice in Part 2, reworded and at least 20 items apart. Two flags come out of this:

- **Unstable:** the two answers differ.
- **Uncertain:** both answers are rated 1 or 2 for confidence.

Repeats within one sitting overstate stability, because people remember their first answer. The noise ceiling used to normalize agent fidelity will therefore be somewhat optimistic, which the paper should state.

## Recruitment and dropout

&#91;embedded content: planning estimate from the assumed rates in the table below\]

The biggest loss is people who don't return for Part 2, so the plan over-recruits at Part 1 and randomizes each factor only when it is first used.

| Step | Assumed rate | Basis |
| --- | --- | --- |
| Valid Part 1 | 93% | Failed checks, wrong device, technical errors (planning assumption) |
| Return for Part 2 | 82% | Prolific reports 80% of participants completing all sessions at one-week intervals, against 50% at four-week intervals |
| Analyzable after Part 2 | 92% | Pasted chat text, failed checks, unfinished chats (planning assumption) |

If only 75% return for Part 2, recruit about 160 instead. For the norming survey, recruit about 110 to keep about 100.

- **Randomize late.** Assign friction at the start of Part 1, where it applies. Assign the elicitation arm at the start of Part 2, balanced within each friction level, so dropout after Part 1 can't unbalance the arms.
- **Check for uneven dropout.** Compare return rates between the friction levels. If high friction loses more people, the site itself drove them away, and that must be reported.
- **Retention practices.** Pay the $3 completion bonus after Part 2: Prolific found an 80% higher hourly rate changed retention by under 3 points, while completion bonuses work better. State the full schedule and pay up front, message people before each part opens, remind those who haven't finished, and invite only people who completed the previous part.
- **Budget.** At $16/hour, participant payments come to about $3,700, covering the main sample, the norming survey and a 10-person pilot, before platform fees.

**What about 100 can show.** Most comparisons are within a person: the say–do gap, and every agent measure, since each transcript is scored against the same person's answers on all 36 flows and for every model. Those are well powered. Comparisons between groups are the limit:

- **Elicitation arm** (about 34 per arm): a two-arm comparison detects a standardized difference of about d = 0.7 at 80% power, or about 0.8 after correcting for three pairwise comparisons.
- **Friction** (about 51 per level): about d = 0.56.
- **Arm × friction** (about 17 per cell): exploratory only.

Report arm and friction differences as estimates with confidence intervals rather than pass/fail tests.

## Order bias between Experiment 2 and Experiment 1

Doing the site first keeps the cover story, at the cost of letting actions shape later statements. The design cannot remove that bias, so it reduces it and measures what is left.

| Bias | Where it comes from | How we reduce it | How we measure it |
| --- | --- | --- | --- |
| Statements pulled toward remembered actions | People infer what they want from what they did, and like to look consistent (Bem, 1972) | A week between site and statements; choices sit inside ordinary tasks, so they are less memorable | Recall check at the end of Part 2: compare say–do agreement on flows people remember vs. forget. Plus the comparison with the norming sample below |
| The site primes the interview | The site showed partners, insurers and a housemate, so they come to mind in the chat | The open-ended interviewer never names a recipient | How often transcripts mention recipients seen on the site vs. recipients that appear only in the questionnaire |
| The cover story leaks | Privacy words in the listing, consent or tasks | No privacy words before the suspicion question; "try a new app" framing | Suspicion question; results reported with and without suspicious participants |
| The settings check tips people off | Checking location settings hints at the topic | Framed as comparing Bramble with apps they use; placed after the suspicion question | Accepted cost: Part 2 reveals the topic anyway |
| The chat shapes the questionnaire | Answers given minutes after the chat | Three-minute filler task | Stated as a limitation |
| Repeated items answered from memory | People recall their first answer when a reworded item comes back | Repeats are reworded, at least 20 items apart, in random order | Stated as a limitation: stability is overstated |

**Separating site carryover from the interview's effect.** The norming sample never sees the site. Compare main-sample verdicts with norming verdicts twice: on the 12 flows that appear on the site, and on the 24 that don't. The interview can shift both sets, but only the site can shift the first. If the gap between samples is larger on site flows, the excess is site carryover. This assumes the interview shifts both sets of flows about equally.

A small statement-first group (about 30 people, told the topic up front) would estimate the full order effect directly. It adds cost and loses the cover story for that group, so it is optional.

## What participants might do that breaks the data

Most threats come from participants doing something other than what the measure assumes. Two need design changes before launch: the "usability test" framing and the "Jordan" test account in the current mockups.

| What a participant might do | Why it breaks the data | Fix |
| --- | --- | --- |
| Explore the app like a tester, tapping every option | A usability framing invites testing rather than using, so final states reflect curiosity | Frame it as "try a new app as if it were your own"; word tasks as personal goals; log every toggle and flag heavy switching |
| Act on behalf of someone else | The mockups sign people in as "Jordan", and a stranger's location carries no stakes | Use the participant's first name and "your location" throughout; present the practice address as protecting their privacy |
| Assume a task requires sharing | An Allow then measures compliance, not preference | Every task can be finished after declining everything (checked in the pilot); "there are no right or wrong ways" |
| Ignore the points | Without a real cost, protecting privacy is free and the say–do gap shrinks | Say that points are paid, keep the balance on screen, pay promptly |
| Click through prompts quickly | Fast choices may be habit rather than judgment | Nothing to fix, because it is realistic; log decision time and report it |
| Write chat answers with an AI tool | The transcript stops being their own words. On a summarization task, 33–46% of crowd workers used LLMs (Veselovsky et al., 2023a) | Block pasting and log attempts; ask them not to use AI tools, which with blocked pasting roughly halved use (Veselovsky et al., 2023b); flag long messages typed implausibly fast |
| Give one-line chat answers | Coverage looks low for reasons unrelated to the arm | Generic follow-ups only; no minimum length, which would change the open-ended arm; report answer length |
| Misread "Ask me" | Deferral data turn into noise | On-screen definitions, a practice item, and a comprehension question they must pass |
| Straightline the 48 items | Verdicts reflect fatigue | Random item order, a progress bar, two instructed-response items; straightlining flagged |
| Recall their first answer when a reworded item comes back | Stability looks higher than it is | Reword repeats, keep them at least 20 items apart, randomize the order |
| Fail to find a phone setting | Everyday-settings values go missing or get guessed | Step-by-step paths for iPhone and Android, a "search Settings" tip, an "I couldn't find it" option |
| Change a setting while checking it | The check records a new value, not a habit | Ask "Did you change any of these just now?" |
| Use the wrong device | The site feels different; the settings check is impossible | Platform device filter plus a device check on the first screen |

Pre-register the exclusion rules. Exclude only for failed checks, pasted chat text or the wrong device. Flag, rather than exclude, anything that is realistic behavior, such as fast clicking or short answers.

## Part 1 instructions (phone, Day 1)

Nothing before the suspicion question mentions privacy, so the site measures how people act when they don't know it's being studied. Each block is the exact text a participant sees.

**Study listing**

> **Try a new grocery app (2 parts, one week apart)**
>
> In this study you'll try a new grocery delivery app, chat with a digital assistant, and answer questions about apps you use. There are two parts: Part 1 today (about 30 minutes, on your phone) and Part 2 in one week (about 45 minutes, on a computer). You're paid for each part, plus a $3 bonus when you finish Part 2 and a small bonus based on points you keep in the app. Please sign up only if you can do both parts.

**Consent** (key points; the full form comes from the IRB)

> - You'll use a practice version of an app, chat with a digital assistant, and answer questions, in two parts, one week apart.
> - We don't collect your real location or address. The app uses a practice address and a simulated location.
> - Your typed conversation in Part 2 may be processed by AI services after names and other identifying details are removed.
> - Some details of the study's purpose will be explained at the end of Part 2.
> - Taking part is voluntary, and you can stop at any time.

**Welcome**

> Today you'll try Bramble, a new grocery delivery app, by doing six short tasks. Your current task is shown at the top of the screen; tap it to see it again.
>
> Use Bramble as if it were your own account. There are no right or wrong ways to complete a task.
>
> You start with 420 Bramble points. Any points you still have at the end are paid to you as a bonus (100 points = $0.10).
>
> Bramble uses a practice address and a simulated location, so you never need to give your real ones.
>
> What should Bramble call you? (first name or nickname)

**Tasks**, one at a time, in random order (Task 3 always follows Task 2; Task 6 is always last):

1. Find a store near you that has oat milk in stock, and set it as your store.
2. Order oat milk and a sourdough loaf for delivery.
3. Track your order, and let your housemate Sam know when it will arrive.
4. Browse this week's deals and save two you'd buy.
5. Use your points to get free delivery on your next order.
6. You're moving: change your delivery address to 40 Oak Street and save it.

After each task:

> How easy was that task? 1 (very hard) to 7 (very easy)

**Usability survey**: the standard ten-item System Usability Scale, unchanged.

**Suspicion question**

> In one sentence, what do you think this study is about?

**Settings check**

> Last step: a few questions about apps you already use, so we can compare them with Bramble. You'll look up a few settings on this phone, which takes about 5 minutes. We only record your answers on this page. We never see your apps, your data or your location.
>
> 1. Which of these do you use at least once a month? *Grocery or food delivery app · Maps · Weather · Ride-hailing · None of these*
> 2. Think of the grocery or food delivery app you use most. What is its location setting? iPhone: Settings → Privacy & Security → Location Services → the app. Android: Settings → Location → App location permissions → the app (names vary; you can type "location" in the Settings search bar). *Never · Ask next time · While using the app · Always · I couldn't find it · I don't use one*
> 3. On that same screen, is precise location on? It's called "Precise Location" on iPhone and "Use precise location" on Android. *On · Off · I couldn't find it*
> 4. Is any app on this phone allowed to use your location all the time? On iPhone, the Location Services list shows "Always" next to those apps; on Android, look for "Allowed all the time". *Yes · No · Not sure*
> 5. Is personalized advertising turned on for this phone? iPhone: Settings → Privacy & Security → Apple Advertising → Personalized Ads. Android: search "ads" in Settings. *On · Off · I couldn't find it*
> 6. In the web browser you use most, have you turned on a setting that tells websites not to sell or share your data (for example, Global Privacy Control)? *Yes · No · I don't know what that is*
> 7. Did you change any of these settings while answering? *Yes · No*

**Closing**

> Thanks, that's Part 1. Part 2 opens in 7 days, and we'll send you a message when it does. It takes about 45 minutes on a computer. Your points bonus will be paid within 3 days.

**What Part 1 records**: at every decision point, the choice, the default shown, whether the participant changed it, every toggle, and time to decide; the ease ratings, usability score, suspicion answer and settings answers; and the device.

## Part 2 instructions (computer, Day 8)

The elicitation arm is assigned when Part 2 starts, and participants never see which arm they are in. Everything they read is identical across arms; only the assistant's questions differ.

**Invitation** (sent on Day 8; open for 5 days)

> Part 2 is open. It takes about 45 minutes on a computer. Please do it in one sitting, somewhere you can focus. You'll receive a $3 bonus when you finish.

**Scenario briefing**

> Imagine you've started using a personal AI assistant that looks after your location data across the apps on your phone. Companies, apps and people sometimes ask for your location. The assistant decides on your behalf, based on what you tell it today.

**Before the chat** (pasting is disabled in the chat box)

> Next, you'll chat with the assistant for up to 15 minutes. Type your answers in your own words; there are no right or wrong answers. Please don't paste text or use other AI tools, because we need your own words. The assistant will tell you when the conversation is finished.

**Break**

> Quick break: rate how much you like each of these 10 photos, from 1 (not at all) to 7 (very much).

**Questionnaire introduction**

> Now you'll read 48 short situations. In each one, someone wants to use your location. For each situation, choose:
>
> - **Allow**: that's fine, no need to ask me.
> - **Block**: that shouldn't happen.
> - **Ask me**: don't decide in advance; check with me each time.
>
> Then say how sure you are, from 1 (not at all sure) to 5 (completely sure). Some situations look alike, so please read each one carefully.

**Practice item** (not scored)

> A weather app wants your general area to show today's forecast, while you're using the app.

**Comprehension question** (must be answered correctly; after a wrong answer the definitions reappear and they try once more)

> Which option means the app should check with you every time? *Allow · Block · Ask me*

**Attention items** (two, near items 15 and 30)

> To show you're reading carefully, choose Block and a confidence of 3 for this one.

**Repeated items** (researchers only): each of the 12 site flows appears twice, reworded, at least 20 items apart, in random order. The questionnaire's "Some situations look alike" line is the only notice participants get.

**Recall check** (after the questionnaire)

> A few questions about the Bramble app from Part 1. It's fine if you don't remember.
>
> 1. When Bramble asked to use your location to find stores, what did you choose? *Allowed while using · Allowed once · Didn't allow · I don't remember*
> 2. When you placed your order, was the box for offers from partner brands checked? *Checked · Unchecked · I don't remember*
> 3. How did you let Sam know when your order would arrive? *Shared my live location · Sent the arrival time only · I don't remember*
> 4. On the Rewards page, did you accept the offer to share your location history with data partners? *Accepted · Declined · I don't remember*

**Background survey**: the IUIPC privacy-concern scale, age range, gender (optional), and how often they use AI assistants.

**Debrief**

> Thank you. Here is more about this study.
>
> We are studying whether people's privacy choices match what they say they want, and whether AI assistants carry those wishes through correctly.
>
> In Part 1 we described the study as trying a new app and didn't mention privacy, because knowing a study is about privacy changes how people act. The location prompts, checkboxes and offers in Bramble were the choices we studied. No real location or address was collected.
>
> Your chat will be processed by AI models after names and other identifying details are removed.
>
> If you'd rather we not use your Part 1 choices, you can withdraw them now. You'll still be paid in full. **\[Withdraw my Part 1 data\]**
>
> Please don't share details of this study with anyone who might take part. Questions: \[researcher name and email\].

**What Part 2 records**: the transcript with timestamps, response latency, paste attempts and typing time per message; each verdict with its confidence and position; comprehension and attention results; recall answers; the background survey; and the number of days since Part 1.

## Norming survey instructions

The norming survey is one session of about 17 minutes for separate people. It uses no cover story and asks for the same 48 verdicts as Part 2. Recruit from the same platform, in the same weeks and with the same eligibility, except that any device is allowed.

**Study listing**

> **How should apps use your location? (about 17 minutes)**
>
> In this short survey you'll read situations in which an app, company or person wants to use your location, and say what you'd want to happen. There are no right or wrong answers.

**Consent** (key points)

> - This survey asks about your preferences for how apps and companies use your location.
> - We don't collect your location or any contact details.
> - Taking part is voluntary, and you can stop at any time.

**Questionnaire**: the same introduction, practice item, comprehension question, 48 items and two attention items as Part 2, word for word.

**Background survey**: the same as Part 2.

**Closing**

> Thank you. Your payment will arrive within 3 days.

The norming survey has no chat, site or recall check. That is what makes it both the social-norm reference and the no-site comparison for measuring order bias.

## Before launch

Two mockup changes and a think-aloud pilot come first. The rest check that each instruction works as written.

- [ ] Rebuild the site for phones, with the current task shown at the top of the screen
- [ ] Replace the "Jordan" test account with the participant's own name, and remove all "usability test" wording
- [ ] Confirm every task can be finished after declining every prompt, box, switch and offer
- [ ] Run 5–8 think-aloud pilots of Part 1 on participants' own phones, and check that they treat Bramble as their own account rather than exploring it
- [ ] Check that pilot participants can explain Allow, Block and Ask me in their own words
- [ ] Time each part, and trim the questionnaire if Part 2 runs past 50 minutes
- [ ] Confirm that pasting is blocked in the chat and that paste attempts are logged
- [ ] Walk through the settings check on at least 2 iPhones and 3 Android phones from different makers
- [ ] Confirm the points bonus and the completion bonus pay out correctly
- [ ] Pre-register the exclusion rules, the retention assumptions and the order-bias checks
- [ ] Get IRB approval for the deception, the consent wording and the debrief

## Sources

- Prolific, [How to retain participants in longitudinal studies](https://www.prolific.com/resources/how-to-maximise-retention-in-longitudinal-studies-reducing-attrition-and-dropout-across-multi-wave-studies): completion rates at one- vs. four-week intervals, the effect of pay and completion bonuses, and planning for 20–40% attrition.
- Veselovsky, Ribeiro and West (2023a), [Artificial Artificial Artificial Intelligence: Crowd Workers Widely Use Large Language Models for Text Production Tasks](https://arxiv.org/abs/2306.07899): 33–46% LLM use on a summarization task.
- Veselovsky et al. (2023b), [Prevalence and prevention of large language model use in crowd work](https://arxiv.org/abs/2310.15683): about 30% use without intervention; asking workers not to and blocking copy-paste roughly halved it.
- Bem (1972), self-perception theory, cited from background knowledge and not linked.
