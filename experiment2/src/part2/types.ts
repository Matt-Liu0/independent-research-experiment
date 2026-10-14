import type { DeviceInfo, ProlificParams } from '../study/types'
import type { VerdictValue, Wording } from './items'
import type { Slot } from './order'

/** part2: Part 2 of the main study (Day 8, computer). norming: the separate norming survey. */
export type Variant = 'part2' | 'norming'

/** Stages built so far. The scenario briefing, chat, filler and debrief come next (spec, "Not in this piece"). */
const PART2_STAGES = ['device', 'intro', 'practice', 'comprehension', 'items', 'recall', 'background', 'done'] as const
const NORMING_STAGES = ['device', 'consent', 'intro', 'practice', 'comprehension', 'items', 'background', 'done'] as const
export type Part2Stage = (typeof PART2_STAGES)[number] | (typeof NORMING_STAGES)[number]

export function stagesOf(variant: Variant): readonly Part2Stage[] {
  return variant === 'part2' ? PART2_STAGES : NORMING_STAGES
}

export function nextPart2Stage(variant: Variant, stage: Part2Stage): Part2Stage {
  const stages = stagesOf(variant)
  const i = stages.indexOf(stage)
  return stages[Math.min(i + 1, stages.length - 1)]
}

/** One answered page of the questionnaire. */
export interface ItemAnswer {
  itemId: string
  /** null for attention items. */
  wording: Wording | null
  /** 1-based position in the sequence. */
  position: number
  verdict: VerdictValue
  confidence: number
  /** Visible ms from the page showing to Next. */
  ms: number
  /** Times the verdict or confidence was changed after the first choice. */
  changes: number
}

export interface Background {
  iuipc: number[]
  ageRange: string
  gender: string | null
  aiUse: string
}

export interface Part2Doc extends ProlificParams {
  variant: Variant
  appVersion: string
  stage: Part2Stage
  consentVersion: string | null
  consentDeclined: boolean
  withdrawn: boolean
  device: DeviceInfo | null
  tzOffset: number
  localStartHour: number
  resumeCount: number
  /** The page order, generated once before the first item and reused on reload. */
  sequence: Slot[] | null
  /** Answers keyed by slot (e.g. "store_location:A", "attention_1"). */
  answers: Record<string, ItemAnswer>
  practice: { verdict: VerdictValue; confidence: number } | null
  /** Each answer given to the comprehension question, in order. */
  comprehension: { attempts: string[]; passed: boolean } | null
  /** Part 2 only: recall question ID → answer. */
  recall: Record<string, string> | null
  background: Background | null
  createdAt?: unknown
  startedItemsAt?: unknown
  completedAt?: unknown
}

export type Part2TimestampField = 'consentAt' | 'startedItemsAt' | 'completedAt'

export function newPart2Doc(variant: Variant, params: ProlificParams, now = new Date()): Part2Doc {
  return {
    ...params,
    variant,
    appVersion: __APP_VERSION__,
    stage: 'device',
    consentVersion: null,
    consentDeclined: false,
    withdrawn: false,
    device: null,
    tzOffset: now.getTimezoneOffset(),
    localStartHour: now.getHours(),
    resumeCount: 0,
    sequence: null,
    answers: {},
    practice: null,
    comprehension: null,
    recall: null,
    background: null,
  }
}

export type Part2StartResult = { kind: 'new' | 'resumed'; doc: Part2Doc } | { kind: 'taken' } | { kind: 'pid_mismatch' }
