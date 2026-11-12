import type { DeviceInfo, EntryParams } from '../study/types'
import type { VerdictValue, Wording } from './items'
import type { Slot } from './order'

/**
 * Parts 2 and 3 (pipeline, Experiment 1 "Procedure", split Nov 12, 2026). Part 2 (computer):
 * briefing, written instructions (D0), the interview. Part 3 (2-3 days later, phone or
 * computer): the questionnaire, recall, background, debrief. The 2-3 day gap replaces the
 * filler task, so what people told the interviewer isn't fresh when they answer. Both parts use
 * the same record shape, in their own collections; the export joins them by participant code.
 */
export type Part = 2 | 3

const STAGES_BY_PART = {
  2: ['device', 'briefing', 'instructions', 'chat', 'done'],
  3: ['device', 'intro', 'practice', 'comprehension', 'items', 'recall', 'background', 'debrief', 'done'],
} as const
export type Part2Stage = (typeof STAGES_BY_PART)[Part][number]

export function partStages(part: Part): readonly Part2Stage[] {
  return STAGES_BY_PART[part]
}

export function nextPart2Stage(stage: Part2Stage, part: Part): Part2Stage {
  const stages = partStages(part)
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
  /** null if skipped (optional, like gender). */
  ageRange: string | null
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

/**
 * What the participant wrote in the instructions box before the chat: the short, standing
 * instructions people give assistants today (D0). The interviewer never sees it.
 */
export interface WrittenInstructions {
  text: string
  chars: number
  /** Visible ms on the page. */
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
  writtenInstructions: WrittenInstructions | null
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
    writtenInstructions: null,
    withdrawRequested: false,
  }
}

export type Part2StartResult =
  | { kind: 'new' | 'resumed'; doc: Part2Doc }
  | { kind: 'taken' }
  | { kind: 'pid_mismatch' }
  /** Part 3 only: the interviewer function hasn't marked this code's Part 2 chat as finished. */
  | { kind: 'part2_not_done' }
