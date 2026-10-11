import type { AppState } from '../bramble/appState'
import type { AppId } from '../core/flowTypes'
import type { StrideState } from '../stride/state'
import type { AppOrder, TaskNumber } from './apps'

export const STAGES = ['device', 'consent', 'welcome', 'tasks', 'sus', 'suspicion', 'settings', 'done'] as const
export type Stage = (typeof STAGES)[number]

/** Agent episodes (Experiment 4) do only the tasks: no consent, phone check, name or surveys. */
const AGENT_STAGES: Stage[] = ['tasks', 'done']

export function nextStage(stage: Stage, mode: Mode = 'study'): Stage {
  const order = mode === 'agent' ? AGENT_STAGES : [...STAGES]
  const i = order.indexOf(stage)
  return order[Math.min(i + 1, order.length - 1)]
}

/**
 * study: real data. pilot: separate pilot_ collections. demo: nothing saved, level chosen in the URL.
 * agent: an Experiment 4 episode driven by the MCP harness; data kept in the page for the harness.
 */
export type Mode = 'study' | 'pilot' | 'demo' | 'agent'

/** Who ran an agent episode, from the harness's link. Never shown on screen. */
export interface AgentMeta {
  episodeId: string
  model: string | null
  /** e.g. transcript_only / transcript_plus_policy (pipeline, Experiment 4). */
  condition: string | null
  run: number | null
  /** Study code of the participant whose transcript the agent acts on. */
  participant: string | null
}

/** How the participant was recruited: Prolific link, or a participant code we handed out (e.g. students). */
export type Recruitment = 'prolific' | 'code'

/**
 * Who the participant is. For code entries, prolificPid holds the participant code (it is the
 * one-record-per-person key either way), and studyId / sessionId are "CODE".
 */
export interface ProlificParams {
  prolificPid: string
  studyId: string
  sessionId: string
  recruitment?: Recruitment
}

export type DeviceOs = 'ios' | 'android' | 'other'

export interface DeviceInfo {
  os: DeviceOs
  screenW: number
  screenH: number
  userAgent: string
  touch: boolean
  passedCheck: boolean
  /** navigator.webdriver: the browser is controlled by automation (e.g. an agent). */
  automated: boolean
  /** The phone check was skipped with &anydevice=1 (local or emulator testing only). */
  checkSkipped?: boolean
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
  /**
   * Which decision screens are nudged for this person, e.g. "U1U3U5" (see bramble/units.ts);
   * the other screens are neutral. Set at consent.
   */
  pattern: string | null
  /** Which app comes first. Set at consent, balanced and crossed with the pattern. */
  appOrder: AppOrder | null
  /** All 10 tasks: each app's tasks as one block, in the app order. */
  taskOrder: TaskNumber[] | null
  withdrawn: boolean
  device: DeviceInfo | null
  tzOffset: number
  localStartHour: number
  resumeCount: number
  stage: Stage
  /**
   * Position in taskOrder (0–9), and what is showing: the task, its ease rating, or the
   * introduction to the second app (before its first task).
   */
  taskIndex: number
  taskPhase: 'doing' | 'rating' | 'intro'
  ease: Partial<Record<`t${TaskNumber}`, number>>
  /** System Usability Scale answers (10 items, 1–5), one set per app. */
  sus: Partial<Record<AppId, number[]>> | null
  suspicion: string | null
  settingsCheck: Record<string, string | string[]> | null
  taskOutcome: Partial<Record<`t${TaskNumber}`, TaskOutcome>>
  /** Bramble's state (the name predates Stride). */
  appState: AppState | null
  strideState: StrideState | null
  /** Set only for agent episodes. */
  agent?: AgentMeta | null
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
    pattern: null,
    appOrder: null,
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
    strideState: null,
  }
}

export type StartResult =
  | { kind: 'new' | 'resumed'; participant: ParticipantDoc }
  | { kind: 'taken' }
  | { kind: 'pid_mismatch' }
