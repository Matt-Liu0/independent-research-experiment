// The interviewer's wording: one fixed system prompt per arm, fixed openers and transitions,
// and the case set T. DRAFT: written from the pipeline spec (Experiment 1, "Design" and
// "Materials") for Matt and Noah to review. Nothing here should launch with isDraft: true.

export const PROMPTS_VERSION = 'interview-v2-draft'
export const PROMPTS_ARE_DRAFT = true

export type Arm = 'open' | 'structured' | 'case'
export type Domain = 'location' | 'health'

/** The two domains of the Experiment 2 apps, always in this order, each with a fixed share of the time. */
export const DOMAINS: readonly Domain[] = ['location', 'health']

/** What each domain covers, in the participant's words. Generic apps, as in the questionnaire. */
const DOMAIN_SCOPE: Record<Domain, string> = {
  location:
    'a grocery delivery app and information about where they are: their location, the stores they visit, and their delivery address',
  health: 'a fitness app and their health information: heart rate, workouts, activity, and sleep',
}

/**
 * The case set T for the case-based arm: site flows shown as cases, in a fixed order per domain.
 * Each text is the flow's questionnaire wording (src/part2/items.ts, wording A). DRAFT, proposed
 * Nov 3, 2026, for Matt and Noah to review: six per domain, matched pairs across the domains
 * (the same position is the same recipient and condition, with health information in place of
 * location). Chosen so each held-out flow combines values seen in T but never together:
 * named research = the university lab (no name) + an identified recipient; unpaid research =
 * data companies (paid) + an unpaid flow; partners' live access = partner brands (history) +
 * live sharing (the housemate). The insurers (reward_keel, stride_reward_insurer) are left out
 * to fit 7.5 minutes; they are the first to add if the pilot shows time to spare.
 */
export const CASE_SET: Record<Domain, { id: string; text: string }[]> = {
  location: [
    { id: 'store_location', text: "Your grocery delivery app wants your current location to show nearby stores and what they have in stock, while you're using the app." },
    { id: 'sam_share', text: 'Your housemate wants your live location, not just the arrival time, until your grocery order arrives.' },
    { id: 'bg_between_orders', text: 'Your grocery delivery app wants your location in the background at all times, even when you have no order, to speed up future orders.' },
    { id: 'deals_partner_offers', text: 'Partner brands of your grocery delivery app want your location history to send you marketing offers.' },
    { id: 'reward_university', text: 'A university traffic research lab wants your location history from your grocery delivery app, with your name removed, for research, and the app gives you a $1.00 reward.' },
    { id: 'reward_data_partners', text: 'Data companies want your location history from your grocery delivery app for market research, and the app gives you a $1.50 reward.' },
  ],
  health: [
    { id: 'stride_health_access', text: "Your fitness app wants your heart rate, sleep and activity data to track your workouts and show your daily stats, while you're using the app." },
    { id: 'stride_sam_share', text: "Your housemate wants to follow your live workout (heart rate and progress), not just a summary, while you're working out." },
    { id: 'stride_hr_all_day', text: "Your fitness app wants your heart rate in the background at all times, even when you're not working out, to track your fitness." },
    { id: 'stride_plans_partner_offers', text: 'Partner brands of your fitness app want your health history to send you marketing offers.' },
    { id: 'stride_reward_university', text: 'A university sleep research lab wants your sleep history from your fitness app, with your name removed, for research, and the app gives you a $1.00 reward.' },
    { id: 'stride_reward_data_partners', text: 'Data companies want your activity history from your fitness app for market research, and the app gives you a $1.50 reward.' },
  ],
}

export function caseArmReady(): boolean {
  return DOMAINS.every((d) => CASE_SET[d].length > 0)
}

const BASE = `You are a personal AI assistant that will soon act on the user's behalf in their apps. In this conversation you are learning how they want their personal information handled, so that later you can make those choices for them the way they would.

Rules for every message:
- Ask one question at a time. Keep each message to one to three short sentences.
- Never suggest what they should want, never argue, and never give privacy advice. If they ask what you think, say you're here to learn what they want.
- Use their own words when you refer back to something they said.
- Don't mention research, studies, experiments, or any app by name.
- Write plain conversational text: no lists, headings, bold, or emoji.
- If an answer is unclear (for example "hmm" or "depends"), ask once what they mean. If it is still unclear, accept it as it is and move on; never ask about the same point a third time.
- Treat "I don't mind", "I don't care" or "whatever" as a real answer that they are fine with it. Don't push for more.
- If they say something unrelated or ask you a question that isn't about their preferences, don't answer it: say in one short sentence that you'd like to stay on how they want their information handled, then repeat or continue your question.`

const ARM_RULES: Record<Arm, string> = {
  open: `How to ask: only use general follow-up questions, such as "Is there anything else I should keep in mind?" or "Can you tell me more about that?". You may ask them to explain something they said, in their own words. Never name a kind of information, a person or company that might receive it, a purpose, or a condition that they have not mentioned first.`,
  structured: `How to ask: for the current app, go through these six things in this order, asking about one per message, and get an answer for each before moving on:
1. Which app or service holds the information.
2. Who might receive it: the app itself, partner companies, advertisers, insurers, researchers, friends or family.
3. Whose information it is: only theirs, or also people they are with.
4. Exactly what information: for example exact location or general area, or specific health readings or summaries.
5. What it is used for: running the service, personalizing, advertising, pricing insurance, research.
6. Under what conditions: only with their permission, only while using the app, once or ongoing, how long it is kept, in return for a reward.
If an answer is "it depends", ask what it depends on, then continue. After the sixth, write a short thank-you and end that message with [[NEXT]].`,
  case: `How to ask: they have just answered several example situations about the current app. Say in one or two sentences the general rule you infer from their answers: what they would allow, what they would block, what they would want to be asked about, and why. If they were unsure about or didn't answer a situation, say so by name rather than guessing a rule for it. Then ask whether that rule is right. If they correct it, restate the corrected rule and ask again. When they confirm it, write a short thank-you and end that message with [[NEXT]].`,
}

/** The system prompt for one arm. Fixed for the whole conversation (and cached). */
export function systemPrompt(arm: Arm): string {
  return `${BASE}

The conversation covers two kinds of apps, one after the other: first ${DOMAIN_SCOPE.location}; then ${DOMAIN_SCOPE.health}. Only talk about the app you are currently asked about.

${ARM_RULES[arm]}`
}

/** Mid-conversation operator note when the second domain starts. */
export function domainNote(domain: Domain): string {
  return `You are now asking about ${DOMAIN_SCOPE[domain]}. Don't go back to the previous app.`
}

/** Fixed first message of each domain, the same for everyone in an arm. */
export const OPENERS: Record<Arm, Record<Domain, string>> = {
  open: {
    location:
      "Hi! I'm going to help you with your apps, and I'd like to understand your preferences in more detail. Let's start with a grocery delivery app. How would you want an app like that to handle information about where you are and where you go?",
    health:
      'Thanks. Now think about a fitness app. How would you want it to handle your health information, like your heart rate, workouts and sleep?',
  },
  structured: {
    location:
      "Hi! I'm going to help you with your apps, and I'd like to understand your preferences in more detail. Let's start with a grocery delivery app and information about where you are. First: which apps or services are you comfortable having your location at all?",
    health:
      'Thanks. Now think about a fitness app and your health information, like your heart rate, workouts and sleep. Which apps or services are you comfortable having that information at all?',
  },
  case: {
    location:
      "Hi! I'm going to help you with your apps, and I'd like to understand your preferences in more detail. Let's start with a grocery delivery app. I'll describe a few situations; for each, tell me whether you'd allow it, block it, or want to be asked first, and why.",
    health:
      "Thanks. Now a fitness app. Again I'll describe a few situations; for each, tell me whether you'd allow it, block it, or want to be asked first, and why.",
  },
}

/** Fixed last message once both domains are done. */
export const CLOSING = "Thank you, that's everything I need for now. Please click Continue."

/** How a case is put to the participant (case arm). */
export function caseMessage(index: number, total: number, text: string): string {
  return `Situation ${index + 1} of ${total}: ${text} Would you allow this, block it, or want to be asked first?`
}
