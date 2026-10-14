// Types shared by every practice app: how a flow (one information-sharing decision) is
// described, and its two friction levels.
import type { CIFlow } from './ci'
import type { UnitId } from './units'

/** The practice apps in the study. */
export const APP_IDS = ['bramble', 'stride'] as const
export type AppId = (typeof APP_IDS)[number]

export type Friction = 'nudged' | 'neutral'

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

/**
 * The non-monetary nudge a Stride-only gamified flow is built around (see
 * docs/superpowers/specs/2026-10-13-stride-gamified-nudges.md). Part of the flow, so it is
 * the same in both friction levels.
 *  - streak: loss framing around a running streak (Silverman & Barasch 2023)
 *  - social_proof: how many friends already share (Das et al. 2014)
 *  - status: progress toward a status tier (the Vitality model)
 */
export type NudgeType = 'streak' | 'social_proof' | 'status'

export interface LevelDef {
  control: Control
  /** Preset value; null means nothing is selected. */
  default: string | null
  /** Option drawn as the highlighted button; the others look like the non-nudging buttons. null = all equal. */
  emphasis: string | null
}

/** One flow. F, Scr and T narrow the flow IDs, screens and task numbers to one app's. */
export interface FlowDef<F extends string = string, Scr extends string = string, T extends number = number> {
  id: F
  app: AppId
  /** Task this flow is expected to fall in (events log the actual task). */
  task: T
  screen: Scr
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
  dependsOn: { flowId: F; equals?: string; notEquals?: string } | null
  /** The matching flow in the other app (same recipient and aim, different information), if any. */
  counterpart: string | null
  /** Gamified framing of a Stride-only flow; absent for every matched flow. */
  nudgeType?: NudgeType
  /** Points paid for choosing the first option (Rewards offers only). */
  points?: number
  account: { label: string; labels: Record<string, string> }
  /** GKC-CI description of the information flow (see ci.ts). Identical in both levels. */
  ci: CIFlow
  nudged: LevelDef
  neutral: LevelDef
}

/** Export status of a flow for one participant. */
export type FlowStatus = 'chosen' | 'shown_not_settled' | 'not_shown' | 'not_applicable'
