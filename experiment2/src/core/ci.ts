// GKC-CI encoding of the site flows (both apps): the Contextual Integrity parameters (Nissenbaum)
// with the transmission principle broken into Institutional Grammar components, as in the
// GKC-CI framework (Shvartzshnaider, Sanfilippo & Apthorpe). Used to join site behavior with
// Part 2 questionnaire items that describe the same flows.
//
// Vocabularies are deliberately small. If the Part 2 coding uses different terms, change
// them here so both sides match.

import type { FlowDef, Friction, LevelDef } from './flowTypes'

export type Actor =
  | 'participant'
  | 'bramble'
  | 'bramble_deals'
  | 'courier'
  | 'housemate_sam'
  | 'partner_brands'
  | 'keel_auto_insurance'
  | 'university_traffic_lab'
  | 'data_partners'
  | 'stride'
  | 'stride_plans'
  | 'coach_maya'
  | 'keel_health_insurance'
  | 'university_sleep_lab'

export type RecipientType =
  | 'first_party' // the app itself
  | 'first_party_secondary_use' // the app, for a purpose beyond the service asked for
  | 'service_provider' // needed to deliver the service
  | 'personal' // someone the participant knows
  | 'third_party_commercial'
  | 'third_party_research'

/**
 * Broad category of information, by the social domain whose norms govern it (Matt's list):
 * health = Medical and Health; financial = Financial; demographic = Demographic and
 * Biographical; communication = Communal and Communicative Content; digital_activity =
 * Digital Activity and Behavioral Data (location tracking is here); biometric = Biometrical
 * and Physical Data.
 */
export type InformationCategory = 'health' | 'financial' | 'demographic' | 'communication' | 'digital_activity' | 'biometric'

/** What exactly is shared, within its category. */
export type Attribute =
  | 'location'
  | 'location_history'
  | 'home_address'
  | 'birthday'
  | 'payment_card'
  | 'health_metrics'
  | 'heart_rate'
  | 'health_history'
  | 'sleep_history'
  | 'activity_history'
  | 'workout'

/** exact: precise values; approximate: coarsened (e.g. general area, daily summaries); unspecified: set by another flow. */
export type Granularity = 'exact' | 'approximate' | 'unspecified'

/** point_in_time: one reading; continuous: a live or background stream; historical: a record over time; static: a fixed fact. */
export type Temporality = 'point_in_time' | 'continuous' | 'historical' | 'static'

export type Identifiability = 'identified' | 'deidentified'

export type Aim =
  | 'find_stores'
  | 'courier_handoff'
  | 'accurate_arrival_time'
  | 'coordinate_with_housemate'
  | 'speed_up_future_orders'
  | 'personalized_deals'
  | 'marketing_offers'
  | 'insurance_pricing'
  | 'research'
  | 'market_research'
  | 'faster_checkout'
  | 'birthday_offers'
  | 'health_tracking'
  | 'live_coaching'
  | 'accurate_workout_stats'
  | 'all_day_monitoring'
  | 'personalized_plans'

/** Institutional Grammar "condition": what the flow is conditioned on. */
export type Condition = 'with_permission' | 'with_consent' | 'with_consent_for_payment'

/** Institutional Grammar execution constraint: how long the flow lasts. */
export type Temporal =
  | 'once_or_while_using'
  | 'until_delivery'
  | 'while_order_active'
  | 'during_workouts'
  | 'while_workout_active'
  | 'ongoing'

export interface CIFlow {
  sender: Actor
  recipient: Actor
  recipientType: RecipientType
  subject: 'participant'
  informationCategory: InformationCategory
  attribute: Attribute
  granularity: Granularity
  temporality: Temporality
  identifiability: Identifiability
  transmissionPrinciple: {
    aim: Aim
    condition: Condition
    temporal: Temporal
    /** Institutional Grammar "or else" / consequence of accepting: points paid. */
    consideration: { points: number; usd: number } | null
  }
  /** One-line plain-language statement of the flow, for codebooks and questionnaire matching. */
  statement: string
}

/**
 * How consent is asked for, in one level. This is the experimental manipulation: the flow
 * (sender, recipient, information, aim) is identical across levels; only this changes.
 *  - opt_out: sharing is preset; the participant must act to stop it
 *  - opt_in: not sharing is preset; the participant must act to share
 *  - nudged_choice: no preset, but the sharing option is visually emphasized
 *  - active_choice: no preset, equal options
 */
export type ConsentForm = 'opt_out' | 'opt_in' | 'nudged_choice' | 'active_choice'

export function consentForm(flow: FlowDef, friction: Friction): ConsentForm {
  const level: LevelDef = flow[friction]
  if (level.default !== null) return level.default === flow.privacyOption ? 'opt_in' : 'opt_out'
  return level.emphasis !== null ? 'nudged_choice' : 'active_choice'
}

/** The battery's three responses (Experiment 1 questionnaire, Experiment 3 probes). */
export type Verdict = 'allow' | 'ask' | 'block'

/** Options that map to something other than the default rule below. */
const VERDICT_EXCEPTIONS: Record<string, Record<string, Verdict>> = {
  store_location: { once: 'ask' },
  stride_health_access: { once: 'ask' },
}

/**
 * Maps a site choice to a battery verdict, as the pipeline specifies (Experiment 2, "Verdict"):
 * Allow or Allow while using → allow; Allow once → ask; Don't allow or an unchecked box → block.
 * Every flow's least-sharing option is block; its other options are allow unless listed above.
 */
export function verdictOf(flow: FlowDef, value: string | null): Verdict | null {
  if (value === null) return null
  const exception = VERDICT_EXCEPTIONS[flow.id]?.[value]
  if (exception) return exception
  return value === flow.privacyOption ? 'block' : 'allow'
}
