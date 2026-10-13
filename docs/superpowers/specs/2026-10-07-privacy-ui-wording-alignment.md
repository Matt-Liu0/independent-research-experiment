# Aligning Bramble's privacy wording with prior work

Oct 7, 2026 · **Approved by Matt on Oct 13, 2026 and applied in v0.14.0.** D1 and D2 were applied earlier (v0.10.0). Stride uses the same wording for each matched flow (its health-access prompt uses Apple's location-prompt buttons, so the pair differs only in information).

After the advisor meeting, we agreed to align the option buttons and the privacy wording in the Bramble UI with wording used in prior studies and in the real systems they study. This document lists every privacy string on the site, the proposed wording, and its source. Every quoted string below was checked against the source itself; where no source fits, the string is marked and left unchanged.

## Sources checked

| Ref | Source | What it gives us |
|---|---|---|
| **[A1]** | Apple, Core Location documentation, `requestWhenInUseAuthorization()` | Location prompt options, verbatim: **"Allow While Using App"**, **"Allow Once"**, **"Don't Allow"** |
| **[A2]** | Apple, Core Location documentation, `requestAlwaysAuthorization()` | Background ("Always") upgrade prompt options, verbatim: **"Keep Only While Using"**, **"Change to Always Allow"** |
| **[A3]** | Apple Support, "Turn Location Services and GPS on or off" (support.apple.com/en-us/102647) | Settings labels, verbatim: **"Never"**, **"Ask Next Time Or When I Share"**, **"While Using the App"**, **"Always"**; **"Precise Location"** |
| **[G1]** | Android permission dialog source (AOSP `packages/modules/Permission`, PermissionController `strings.xml`) | Dialog title **"Allow *App* to access this device's location?"**; options **"While using the app"**, **"Only this time"**, **"Don't allow"**; accuracy **"Precise"** / **"Approximate"** (image labels "Precise location"); background **"Allow all the time"**; settings **"Allow all the time"**, **"Allow only while using the app"**, **"Ask every time"**, **"Don't allow"**, **"Use precise location"** |
| **[U]** | Utz, Degeling, Fahl, Schaub & Holz. *(Un)informed Consent: Studying GDPR Consent Notices in the Field.* CCS 2019 | Binary notice: **"Accept"** / **"Decline"**. *Nudging* = "only the 'Accept' button is highlighted in a contrasting color"; *non-nudging* = "the 'Accept' and 'Decline' buttons are formatted the same way". Category notices: *nudging* = **pre-checked** checkboxes; *non-nudging* = **unchecked** checkboxes |
| **[N]** | Nouwens, Liccardi, Veale, Karger & Kagal. *Dark Patterns after the GDPR.* CHI 2020 | **"Accept all"** / **"Reject all"**; removing "Reject all" from the first page raised consent by about 22 percentage points |
| **[M]** | Machuletz & Böhme. *Multiple Purposes, Multiple Problems: A User Study of Consent Dialogs after GDPR.* PoPETs 2020 | A highlighted **"Select all and confirm"** beside a colorless **"Confirm selection"**; checkboxes unchecked |
| **[T]** | Tan, Nguyen, Theodorides, Negrón-Arroyo, Thompson, Egelman & Wagner. *The Effect of Developer-Specified Explanations for Permission Requests on Smartphone User Behavior.* CHI 2014 | Permission requests with a purpose string are approved significantly more often, so the purpose text must be identical in both levels (it already is) |
| **[AP]** | Apthorpe, Shvartzshnaider, Mathur, Reisman & Feamster. *Discovering Smart Home Internet of Things Privacy Norms Using Contextual Integrity.* IMWUT 2018 | CI vignette template: "A [sender] records its owner's [attribute] and sends this information to [recipient] [transmission principle]"; principles such as "if its owner has given consent", "if its owner is notified"; 5-point scale "Completely Unacceptable" … "Completely Acceptable" |

## Two design points the sources raise (decide first)

**D1. What "non-nudging" means for settings.** In [U], the non-nudging version of a settings choice is an **unchecked box**: nothing is selected, so sharing stays off unless the person turns it on. Our neutral level instead uses a **required choice** (buttons with nothing selected, and the person can't continue until they pick) for #2, #3, #8 and #9.

- **Option D1-a, follow [U]:** in neutral, these four settings appear as switches or boxes set to **off/unchecked**, with no forced choice. The partner-offers box (#4) already works this way. This matches the literature's definition, removes the extra tap needed to allow precise location, and keeps the deals visible without a gate. Nudged stays as is (pre-checked), which matches [U]'s nudging condition. In CI terms the neutral consent form for these flows becomes `opt_in` instead of `active_choice`.
- **Option D1-b, keep the required choice:** our current design. It's defensible as "no default at all," but it isn't the manipulation used in [U], so we'd describe it as our own variant.

*Recommendation: D1-a.* It lets us say the friction manipulation follows Utz et al. directly: pre-checked vs. unchecked for settings, and highlighted vs. equal buttons for one-tap choices.

**D2. How strong the nudge is on one-tap choices.** In [U]'s nudging condition, "Decline" is still a **button**; only "Accept" is highlighted. Ours shows the protective option as a **small text link**, which is stronger. It's closer to dialogs that hide the reject option, which [N] found raises consent sharply.

- **Option D2-a, follow [U]:** nudged = the sharing option is a filled, highlighted button, and the protective option is an outlined button of the same size.
- **Option D2-b, keep the text link:** a stronger nudge, closer to common real-world dark patterns. Describe it as such.

*Recommendation: D2-a* if the goal is a clean replication-style manipulation. Choose D2-b if a stronger contrast matters more for detecting the effect.

## String-by-string proposal

The same strings are used in both friction levels. "Keep" means no source gives a better match.

| # | Element | Current | Proposed | Source |
|---|---|---|---|---|
| 1 | Prompt title | Allow Bramble to use your location? | Allow "Bramble" to use your location? | iOS prompt format [A1] |
| 1 | Purpose text | Bramble uses your location to find stores near you and show what's in stock. | **Keep** | Purpose string, same in both levels [T] |
| 1 | Options | Allow while using Bramble · Allow once · Don't allow | **Allow Once · Allow While Using App · Don't Allow** (in iOS order) | [A1] |
| 2 | Accuracy control title | Precise location | **Precise** | [A1] toggle ("Precise: On"); [G1] |
| 2 | Accuracy options (neutral) | Exact location · General area only | **Precise · Approximate** | [G1] |
| 2 | Accuracy description | Your exact spot, or only your general area. | When precise location is off, Bramble can access only your approximate location. | Adapted from [G1] "When precise location is off, apps can access your approximate location" |
| 3 | Courier sharing | Share / Don't share (switch in nudged) | **Keep** (or Accept / Decline, as [U]) | No direct precedent for sharing with a courier; the binary form follows [U] |
| 4 | Partner-offers checkbox | Send me offers from Bramble's partner brands based on my delivery address. | **Keep**; pre-checked (nudged) vs. unchecked (neutral) already matches [U] | [U] |
| 5 | Background during order: options | Allow in background · Not now | **Allow · Don't Allow** | iOS binary wording [A1]; no OS prompt is limited to one order, so this stays an in-app request |
| 5 | Title and purpose | Keep your arrival time accurate? · Let Bramble use your location in the background while this order is on its way. | **Keep** | [T] |
| 6 | Sharing with Sam | Share my live location with Sam · Send arrival time only | **Keep** | No direct precedent; these are two content choices, not allow/deny |
| 7 | Background between orders: options | Keep it on · Turn it off | **Change to Always Allow · Keep Only While Using** | iOS background-upgrade prompt [A2] |
| 7 | Title and purpose | Keep background location on? · Bramble can keep using your location in the background … | **Keep** (Apple doesn't publish the system's title text, so we keep ours) | [A2] gives the buttons only |
| 8–9 | Deals settings | Switch (nudged) / On–Off buttons (neutral) | Per D1: switch on (nudged) / switch off (neutral). Titles and descriptions **keep** | [U] category notices |
| 10–12 | Rewards offer buttons | Link / Donate / Share · No thanks | **Accept · Decline** for all three. The offer text stays specific ("Link your Bramble location history to Keel Auto…") | [U] binary notice |
| Account | Location access | While using · Ask each time · Never | **While Using the App · Ask Next Time Or When I Share · Never** | [A3] |
| Account | Precise | Precise location: On / Off | **Precise Location**: On / Off | [A3] |
| Account | Other rows | Labels such as "Live location with courier: On / Off", "Keel Auto Insurance: Linked / Not linked" | **Keep** labels; offers become "Accepted / Declined" to match the buttons | [U] |

### Platform choice

The proposal uses **iPhone wording** everywhere, so every participant sees identical text. Apple's strings are documented verbatim [A1–A3], and the iOS prompt is the one most location-permission studies describe. Android uses slightly different words for the same options ("While using the app", "Only this time", "Don't allow"; [G1]).

The alternative is showing Android wording to Android users and iOS wording to iPhone users, which is more realistic for each person. But the wording would then differ between participants, and phone OS would become something to control for. *Recommendation: one wording (iOS) for everyone.*

## Matching the Part 2 battery

The site text and the Part 2 vignettes should describe each flow with the same words, so S(f) and A(f) refer to the same thing. Your pipeline's template is "[Recipient] wants your [attribute] to [aim], [condition]." [AP] uses "A [sender] records its owner's [attribute] and sends this information to [recipient] [transmission principle]," rated "Completely Unacceptable" … "Completely Acceptable."

When the battery is written, each site flow's vignette should take its attribute and recipient wording from the site text. The site's `ci.statement` fields are a starting point. That's an Experiment 1 task, noted here so the site wording isn't changed again later.

## What changes in code once approved

- `flows.ts`: labels, titles, account labels; the iOS option order for #1
- If D1-a: the neutral level of #2, #3, #8 and #9 becomes a switch set to off (consent form `opt_in`); remove the deals gate and the disabled Allow buttons
- If D2-a: the nudged protective option becomes an outlined button instead of a text link
- Tests that check button names and consent forms are updated, along with `DATA.md` and the changelog

The flow IDs and option values in the data (`while_using`, `once`, `dont_allow`, …) stay the same, so exports and analysis code are unaffected.
