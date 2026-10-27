import type { DeviceInfo, EntryParams } from '../study/types'
import type { VerdictValue, Wording } from './items'
import type { Slot } from './order'

/** Part 2 (pipeline, Experiment 1 "Procedure"): briefing, the interview, a filler, the questionnaire, recall, background, debrief. */
const PART2_STAGES = [
  'device',
  'briefing',
  'chat',
  'filler',
  'intro',
  'practice',
  'comprehension',
  'items',
  'recall',
  'background',
  'debrief',
  'done',
] as const
export type Part2Stage = (typeof PART2_STAGES)[number]

export function nextPart2Stage(stage: Part2Stage): Part2Stage {
  const i = PART2_STAGES.indexOf(stage)
  return PART2_STAGES[Math.min(i + 1, PART2_STAGES.length - 1)]
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

/** Elicitation arm, assigned by the interviewer function (balanced). */
export type Arm = 'open' | 'structured' | 'case'

/** Written by the interviewer function only (participants can't change it): the transcript itself is kept server-side. */
export interface InterviewSummary {
  done: boolean
  turns: number
  participantTurns: number
  participantChars: number
  startedAt: number
  endedAt: number | null
  minutes: number | null
}

export interface FillerResult {
  solved: number
  attempted: number
  ms: number
}

export interface Part2Doc extends EntryParams {
  appVersion: string
  stage: Part2Stage
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
  /** Recall question ID → answer. */
  recall: Record<string, string> | null
  background: Background | null
  /** Set by the server; null until the chat starts. */
  arm: Arm | null
  interview: InterviewSummary | null
  filler: FillerResult | null
  /** Ticked on the debrief page: the participant asks for their data to be removed. */
  withdrawRequested: boolean
  createdAt?: unknown
  startedItemsAt?: unknown
  completedAt?: unknown
}

export type Part2TimestampField = 'startedItemsAt' | 'completedAt' | 'chatStartedAt' | 'debriefAt'

export function newPart2Doc(params: EntryParams, now = new Date()): Part2Doc {
  return {
    ...params,
    appVersion: __APP_VERSION__,
    stage: 'device',
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
    arm: null,
    interview: null,
    filler: null,
    withdrawRequested: false,
  }
}

export type Part2StartResult = { kind: 'new' | 'resumed'; doc: Part2Doc } | { kind: 'taken' } | { kind: 'pid_mismatch' }
