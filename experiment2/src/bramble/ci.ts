// GKC-CI encoding of the 12 site flows: the Contextual Integrity parameters (Nissenbaum)
// with the transmission principle broken into Institutional Grammar components, as in the
// GKC-CI framework (Shvartzshnaider, Sanfilippo & Apthorpe). Used to join site behavior with
// Part 2 questionnaire items that describe the same flows.
//
// Vocabularies are deliberately small. If the Part 2 coding uses different terms, change
// them here so both sides match.

import type { FlowDef, Friction, LevelDef } from './types'

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

export type RecipientType =
  | 'first_party' // the app itself
  | 'first_party_secondary_use' // the app, for a purpose beyond the service asked for
  | 'service_provider' // needed to deliver the service
  | 'personal' // someone the participant knows
  | 'third_party_commercial'
  | 'third_party_research'

export type InformationType =
  | 'current_location'
  | 'location_precision'
  | 'live_location'
  | 'background_location'
  | 'home_address'
  | 'location_history'
  | 'deidentified_location_history'

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

/** Institutional Grammar "condition": what the flow is conditioned on. */
export type Condition = 'with_permission' | 'with_consent' | 'with_consent_for_payment'

/** Institutional Grammar execution constraint: how long the flow lasts. */
export type Temporal = 'once_or_while_using' | 'until_delivery' | 'while_order_active' | 'ongoing'

export interface CIFlow {
  sender: Actor
  recipient: Actor
  recipientType: RecipientType
  subject: 'participant'
  informationType: InformationType
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
 *  - active_choice: no preset, equal options (and, for settings, a choice is required)
 */
export type ConsentForm = 'opt_out' | 'opt_in' | 'nudged_choice' | 'active_choice'

export function consentForm(flow: FlowDef, friction: Friction): ConsentForm {
  const level: LevelDef = flow[friction]
  if (level.default !== null) return level.default === flow.privacyOption ? 'opt_in' : 'opt_out'
  return level.emphasis !== null ? 'nudged_choice' : 'active_choice'
}
