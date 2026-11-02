// The Part 2 questionnaire battery (stated verdicts S(f)): every site flow, 6 reworded repeats,
// and 6 held-out flows (cut from 12 and 12 on Nov 2, 2026). Design and rationale: docs/superpowers/specs/2026-10-14-part2-questionnaire-design.md.
//
// Wording rules: generic apps ("your grocery delivery app", "your fitness app"), never Bramble
// or Stride; one template, [recipient] wants your [information] to [aim], [condition]; no
// nudge in any item; rewards in dollars. Wording B keeps every CI parameter of wording A.
import { ALL_FLOWS } from '../allFlows'
import type { CIFlow } from '../core/ci'
import type { AppId } from '../core/flowTypes'

export type Wording = 'A' | 'B'

/** One flow in the battery: a site flow (flowId) or a held-out flow (its own ID and CI coding). */
export interface BatteryItem {
  id: string
  /** Which app's domain: grocery (location and other Bramble data) or fitness (health). */
  domain: AppId
  kind: 'site' | 'held_out'
  /** Wording B exists only for the 12 repeated flows. */
  text: { A: string; B?: string }
  /** Held-out flows carry their own coding; site flows use the flow's (in each app's flows.ts). */
  ci: CIFlow
}

const SITE_TEXT: Record<string, { A: string; B?: string }> = {
  // Grocery delivery app (Bramble)
  store_location: {
    A: "Your grocery delivery app wants your current location to show nearby stores and what they have in stock, while you're using the app.",
    B: 'While you have it open, your grocery delivery app wants to use your current location to find stores near you and check their stock.',
  },
  store_precise: { A: 'Your grocery delivery app wants your exact location, not just your general area, to find nearby stores.' },
  courier_live: {
    A: 'Your delivery courier wants your live location to find you, until your order arrives.',
  },
  checkout_partner_offers: { A: 'Partner brands of your grocery delivery app want your delivery address to send you marketing offers.' },
  bg_during_order: {
    A: 'Your grocery delivery app wants your location in the background, even with the app closed, to keep the arrival time accurate, while an order is on its way.',
  },
  sam_share: {
    A: 'Your housemate wants your live location, not just the arrival time, until your grocery order arrives.',
    B: 'Until your groceries arrive, your housemate wants to see where you are live, rather than only when the order will get there.',
  },
  bg_between_orders: {
    A: 'Your grocery delivery app wants your location in the background at all times, even when you have no order, to speed up future orders.',
  },
  deals_personalized: { A: "Your grocery delivery app wants your location history (the stores you've visited) to pick deals for you." },
  deals_partner_offers: {
    A: 'Partner brands of your grocery delivery app want your location history to send you marketing offers.',
    B: "Your grocery delivery app wants to pass the record of places you've been to its partner brands, so they can advertise to you.",
  },
  reward_keel: {
    A: 'A car insurance company wants your location history from your grocery delivery app to offer you a safe-driving discount, and the app gives you a $2.00 reward.',
  },
  reward_university: {
    A: 'A university traffic research lab wants your location history from your grocery delivery app, with your name removed, for research, and the app gives you a $1.00 reward.',
  },
  reward_data_partners: {
    A: 'Data companies want your location history from your grocery delivery app for market research, and the app gives you a $1.50 reward.',
  },

  // Fitness app (Stride)
  stride_health_access: {
    A: "Your fitness app wants your heart rate, sleep and activity data to track your workouts and show your daily stats, while you're using the app.",
  },
  stride_health_detail: { A: 'Your fitness app wants every heart-rate and sleep reading, not just daily summaries, to track your workouts.' },
  stride_coach_live: {
    A: 'Your workout coach wants your live heart rate to adjust your pace, during workouts.',
    B: 'During workouts, your coach wants to watch your heart rate live so they can change your pace.',
  },
  stride_partner_offers: { A: 'Partner brands of your fitness app want your workout history to send you marketing offers.' },
  stride_bg_workout: {
    A: 'Your fitness app wants your heart rate in the background, even with the screen off, to keep your stats accurate, while a workout is running.',
  },
  stride_sam_share: {
    A: "Your housemate wants to follow your live workout (heart rate and progress), not just a summary, while you're working out.",
  },
  stride_hr_all_day: {
    A: "Your fitness app wants your heart rate in the background at all times, even when you're not working out, to track your fitness.",
    B: "Even when you aren't exercising, your fitness app wants to keep reading your heart rate in the background to follow your fitness.",
  },
  stride_plans_personalized: { A: 'Your fitness app wants your heart-rate and sleep history to pick training plans for you.' },
  stride_plans_partner_offers: {
    A: 'Partner brands of your fitness app want your health history to send you marketing offers.',
  },
  stride_reward_insurer: {
    A: 'A health insurance company wants your heart-rate and activity history from your fitness app to offer you a wellness discount, and the app gives you a $2.00 reward.',
  },
  stride_reward_university: {
    A: 'A university sleep research lab wants your sleep history from your fitness app, with your name removed, for research, and the app gives you a $1.00 reward.',
  },
  stride_reward_data_partners: {
    A: 'Data companies want your activity history from your fitness app for market research, and the app gives you a $1.50 reward.',
    B: 'For a $1.50 reward, your fitness app wants to give your activity history to data companies that do market research.',
  },
  stride_streak_autosync: {
    A: 'Your fitness app wants to count your steps in the background at all times, even when the app is closed, to keep your streak going.',
  },
  stride_community_map: {
    A: 'Your fitness app wants to post your workout route and heart rate on a public map that anyone using the app can see.',
  },
  stride_gold_tier: {
    A: 'Your fitness app wants your full sleep history from your sleep tracker so you can reach a higher member status in the app.',
  },
}

/** Every site flow, in site order, with its wording. */
export const SITE_ITEMS: BatteryItem[] = ALL_FLOWS.map((flow) => {
  const text = SITE_TEXT[flow.id]
  if (!text) throw new Error(`No questionnaire wording for ${flow.id}`)
  return { id: flow.id, domain: flow.app, kind: 'site', text, ci: flow.ci }
})

const paid = (points: number) => ({ points, usd: points / 100 })

/**
 * Held-out flows: values that appear on the site, never together. Three matched pairs, one
 * location and one health flow each (cut from six on Nov 2, 2026: named research, unpaid research
 * and partners' live access kept, so both distances and three different parameters stay covered). Distance to the nearest site flow is computed (distance.ts).
 */
export const HELD_OUT_ITEMS: BatteryItem[] = [
  {
    id: 'ho_loc_named_research',
    domain: 'bramble',
    kind: 'held_out',
    text: {
      A: 'A university traffic research lab wants your location history from your grocery delivery app, with your name attached, for research, and the app gives you a $1.00 reward.',
    },
    ci: {
      sender: 'bramble', recipient: 'university_traffic_lab', recipientType: 'third_party_research', subject: 'participant',
      informationCategory: 'digital_activity', attribute: 'location_history', granularity: 'exact', temporality: 'historical', identifiability: 'identified',
      transmissionPrinciple: { aim: 'research', condition: 'with_consent_for_payment', temporal: 'ongoing', consideration: paid(100) },
      statement: "The grocery app shares the participant's identified location history with a university traffic lab, with consent and for $1.00, for research.",
    },
  },
  {
    id: 'ho_loc_unpaid_research',
    domain: 'bramble',
    kind: 'held_out',
    text: { A: 'Data companies want your location history from your grocery delivery app for market research. You get nothing in return.' },
    ci: {
      sender: 'bramble', recipient: 'data_partners', recipientType: 'third_party_commercial', subject: 'participant',
      informationCategory: 'digital_activity', attribute: 'location_history', granularity: 'exact', temporality: 'historical', identifiability: 'identified',
      transmissionPrinciple: { aim: 'market_research', condition: 'with_consent', temporal: 'ongoing', consideration: null },
      statement: "The grocery app shares the participant's location history with data partners, with consent and unpaid, for market research.",
    },
  },
  {
    id: 'ho_loc_partners_live',
    domain: 'bramble',
    kind: 'held_out',
    text: {
      A: 'Partner brands of your grocery delivery app want your live location while an order is on its way, to send you offers from shops nearby.',
    },
    ci: {
      sender: 'bramble', recipient: 'partner_brands', recipientType: 'third_party_commercial', subject: 'participant',
      informationCategory: 'digital_activity', attribute: 'location', granularity: 'exact', temporality: 'continuous', identifiability: 'identified',
      transmissionPrinciple: { aim: 'marketing_offers', condition: 'with_consent', temporal: 'while_order_active', consideration: null },
      statement: "The grocery app shares the participant's live location with partner brands, with consent, while an order is active, for marketing offers.",
    },
  },
  {
    id: 'ho_hl_named_research',
    domain: 'stride',
    kind: 'held_out',
    text: {
      A: 'A university sleep research lab wants your sleep history from your fitness app, with your name attached, for research, and the app gives you a $1.00 reward.',
    },
    ci: {
      sender: 'stride', recipient: 'university_sleep_lab', recipientType: 'third_party_research', subject: 'participant',
      informationCategory: 'health', attribute: 'sleep_history', granularity: 'exact', temporality: 'historical', identifiability: 'identified',
      transmissionPrinciple: { aim: 'research', condition: 'with_consent_for_payment', temporal: 'ongoing', consideration: paid(100) },
      statement: "The fitness app shares the participant's identified sleep history with a university sleep lab, with consent and for $1.00, for research.",
    },
  },
  {
    id: 'ho_hl_unpaid_research',
    domain: 'stride',
    kind: 'held_out',
    text: { A: 'Data companies want your activity history from your fitness app for market research. You get nothing in return.' },
    ci: {
      sender: 'stride', recipient: 'data_partners', recipientType: 'third_party_commercial', subject: 'participant',
      informationCategory: 'health', attribute: 'activity_history', granularity: 'exact', temporality: 'historical', identifiability: 'identified',
      transmissionPrinciple: { aim: 'market_research', condition: 'with_consent', temporal: 'ongoing', consideration: null },
      statement: "The fitness app shares the participant's activity history with data partners, with consent and unpaid, for market research.",
    },
  },
  {
    id: 'ho_hl_partners_live',
    domain: 'stride',
    kind: 'held_out',
    text: { A: 'Partner brands of your fitness app want your live heart rate during workouts, to send you offers.' },
    ci: {
      sender: 'stride', recipient: 'partner_brands', recipientType: 'third_party_commercial', subject: 'participant',
      informationCategory: 'health', attribute: 'heart_rate', granularity: 'exact', temporality: 'continuous', identifiability: 'identified',
      transmissionPrinciple: { aim: 'marketing_offers', condition: 'with_consent', temporal: 'during_workouts', consideration: null },
      statement: "The fitness app shares the participant's live heart rate with partner brands, with consent, during workouts, for marketing offers.",
    },
  },
]

export const BATTERY: BatteryItem[] = [...SITE_ITEMS, ...HELD_OUT_ITEMS]

const byId = new Map(BATTERY.map((item) => [item.id, item]))
export function getItem(id: string): BatteryItem {
  const item = byId.get(id)
  if (!item) throw new Error(`Unknown battery item: ${id}`)
  return item
}

/**
 * The 6 flows asked twice: one per decision screen, alternating apps (Bramble on U1, U3, U5;
 * Stride on U2, U4, U6). Cut from 12 (one per screen in each app) on Nov 2, 2026.
 */
export const REPEATED_ITEMS: string[] = BATTERY.filter((item) => item.text.B !== undefined).map((item) => item.id)

/** Not scored. */
export const PRACTICE_TEXT = "A weather app wants your general area to show today's forecast, while you're using the app."

/** Attention items, with the answer they ask for. */
export const ATTENTION_ITEMS = [
  { id: 'attention_1', text: "To show you're reading carefully, choose Block and a confidence of 3 for this one.", verdict: 'block', confidence: 3 },
  { id: 'attention_2', text: "To show you're reading carefully, choose Allow and a confidence of 2 for this one.", verdict: 'allow', confidence: 2 },
] as const

/** Positions (1-based) of the attention items: about a third and two thirds of the 41 pages. */
export const ATTENTION_POSITIONS = [14, 28] as const

/** The three verdicts, always shown in this order. */
export const VERDICTS = [
  { value: 'allow', label: 'Allow', help: "That's fine, no need to ask me." },
  { value: 'ask', label: 'Ask me', help: "Don't decide in advance; check with me each time." },
  { value: 'block', label: 'Block', help: "That shouldn't happen." },
] as const

export type VerdictValue = (typeof VERDICTS)[number]['value']
