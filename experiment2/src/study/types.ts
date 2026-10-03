import type { AppState } from '../bramble/appState'
import type { Friction, TaskNumber } from '../bramble/types'

export const STAGES = ['device', 'consent', 'welcome', 'tasks', 'sus', 'suspicion', 'settings', 'done'] as const
export type Stage = (typeof STAGES)[number]

export function nextStage(stage: Stage): Stage {
  const i = STAGES.indexOf(stage)
  return STAGES[Math.min(i + 1, STAGES.length - 1)]
}

/** study: real data. pilot: separate pilot_ collections. demo: nothing saved, level chosen in the URL. */
export type Mode = 'study' | 'pilot' | 'demo'

export interface ProlificParams {
  prolificPid: string
  studyId: string
  sessionId: string
}

export type DeviceOs = 'ios' | 'android' | 'other'

export interface DeviceInfo {
  os: DeviceOs
  screenW: number
  screenH: number
  userAgent: string
  touch: boolean
  passedCheck: boolean
}

export interface TaskOutcome {
  done: boolean
  [detail: string]: boolean | number | string | null
}

export type TimestampField = 'consentAt' | 'completedAt'

export interface ParticipantDoc extends ProlificParams {
  appVersion: string
  consentVersion: string | null
  consentDeclined: boolean
  friction: Friction | null
  taskOrder: TaskNumber[] | null
  withdrawn: boolean
  device: DeviceInfo | null
  tzOffset: number
  localStartHour: number
  resumeCount: number
  stage: Stage
  /** Position in taskOrder (0–5) and whether the ease rating is showing. */
  taskIndex: number
  taskPhase: 'doing' | 'rating'
  ease: Partial<Record<`t${TaskNumber}`, number>>
  sus: number[] | null
  suspicion: string | null
  settingsCheck: Record<string, string | string[]> | null
  taskOutcome: Partial<Record<`t${TaskNumber}`, TaskOutcome>>
  appState: AppState | null
  /** Server timestamps in Firestore; epoch ms in the memory store. */
  createdAt?: unknown
  consentAt?: unknown
  completedAt?: unknown
}

export function newParticipant(params: ProlificParams, now = new Date()): ParticipantDoc {
  return {
    ...params,
    appVersion: __APP_VERSION__,
    consentVersion: null,
    consentDeclined: false,
    friction: null,
    taskOrder: null,
    withdrawn: false,
    device: null,
    tzOffset: now.getTimezoneOffset(),
    localStartHour: now.getHours(),
    resumeCount: 0,
    stage: 'device',
    taskIndex: 0,
    taskPhase: 'doing',
    ease: {},
    sus: null,
    suspicion: null,
    settingsCheck: null,
    taskOutcome: {},
    appState: null,
  }
}

export type StartResult =
  | { kind: 'new' | 'resumed'; participant: ParticipantDoc }
  | { kind: 'taken' }
  | { kind: 'pid_mismatch' }
