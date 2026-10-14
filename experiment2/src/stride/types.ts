import type { FlowDef } from '../core/flowTypes'

export const STRIDE_FLOW_IDS = [
  'stride_health_access',
  'stride_health_detail',
  'stride_coach_live',
  'stride_partner_offers',
  'stride_bg_workout',
  'stride_sam_share',
  'stride_hr_all_day',
  'stride_plans_personalized',
  'stride_plans_partner_offers',
  'stride_reward_insurer',
  'stride_reward_university',
  'stride_reward_data_partners',
  // Stride-only gamified flows (no Bramble counterpart).
  'stride_streak_autosync',
  'stride_community_map',
  'stride_gold_tier',
] as const

export type StrideFlowId = (typeof STRIDE_FLOW_IDS)[number]

/** Stride's tasks are numbered after Bramble's, so task numbers are unique across the session. */
export type StrideTask = 7 | 8 | 9 | 10

export type StrideScreen = 'today' | 'workout_setup' | 'workout' | 'plans' | 'rewards' | 'profile'

export type StrideFlowDef = FlowDef<StrideFlowId, StrideScreen, StrideTask>
