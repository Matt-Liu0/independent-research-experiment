import type { FlowDef as CoreFlowDef } from '../core/flowTypes'

export type { Control, FlowKind, FlowStatus, Friction, LevelDef, SettleOn } from '../core/flowTypes'

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
  'save_card',
  'birthday_deals',
] as const

export type FlowId = (typeof FLOW_IDS)[number]

export type BrambleTask = 1 | 2 | 3 | 4 | 5 | 6

export type ScreenId = 'shop' | 'find_store' | 'checkout' | 'orders' | 'deals' | 'rewards' | 'account'

export type FlowDef = CoreFlowDef<FlowId, ScreenId, BrambleTask>

export type FlowValues = Record<FlowId, string | null>

