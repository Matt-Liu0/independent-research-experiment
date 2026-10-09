import type { CIFlow } from './ci'
import type { UnitId } from './units'

export type Friction = 'nudged' | 'neutral'

export const FLOW_IDS = [
  'store_location',
  'store_precise',
  'courier_live',
  'checkout_partner_offers',
  'bg_during_order',
  'sam_share',
  'bg_between_orders',
  'deals_personalized',
  'deals_partner_offers',
  'reward_keel',
  'reward_university',
  'reward_data_partners',
] as const

export type FlowId = (typeof FLOW_IDS)[number]

export type TaskNumber = 1 | 2 | 3 | 4 | 5 | 6

export type ScreenId = 'shop' | 'find_store' | 'checkout' | 'orders' | 'deals' | 'rewards' | 'account'

/**
 * prompt: a one-time question answered with a single tap (e.g. "Allow once").
 * setting: a control that stays on screen and can be changed until it settles.
 */
export type FlowKind = 'prompt' | 'setting'

/**
 * When a flow's first choice is fixed ("settled"):
 * choice: the tap itself. commit: an action on the same screen (e.g. Place order).
 * leave: when the participant leaves the screen or finishes the task.
 */
export type SettleOn = 'choice' | 'commit' | 'leave'

export type Control = 'switch' | 'checkbox' | 'buttons'

export interface LevelDef {
  control: Control
  /** Preset value; null means nothing is selected. */
  default: string | null
  /** Option drawn as the highlighted button; the others look like the non-nudging buttons. null = all equal. */
  emphasis: string | null
}

export interface FlowDef {
  id: FlowId
  /** Task this flow is expected to fall in (events log the actual task). */
  task: TaskNumber
  screen: ScreenId
  /** Decision screen whose friction level this flow follows (see units.ts). */
  unit: UnitId
  kind: FlowKind
  settleOn: SettleOn
  options: readonly string[]
  /** Button / control labels, identical in both levels. */
  labels: Record<string, string>
  title: string
  description: string
  /** The option that shares least. Used by the decline-everything test and exports. */
  privacyOption: string
  dependsOn: { flowId: FlowId; equals?: string; notEquals?: string } | null
  /** Points paid for choosing the first option (Rewards offers only). */
  points?: number
  account: { label: string; labels: Record<string, string> }
  /** GKC-CI description of the information flow (see ci.ts). Identical in both levels. */
  ci: CIFlow
  nudged: LevelDef
  neutral: LevelDef
}

export type FlowValues = Record<FlowId, string | null>

/** Export status of a flow for one participant. */
export type FlowStatus = 'chosen' | 'shown_not_settled' | 'not_shown' | 'not_applicable'
