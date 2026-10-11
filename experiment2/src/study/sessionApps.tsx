// How the task stage runs each practice app: its provider and screens, where its state is
// saved on the participant record, and how its tasks are scored.
import type { ComponentType, ReactNode } from 'react'
import { initialAppState, storableAppState, type AppState } from '../bramble/appState'
import { BrambleApp } from '../bramble/BrambleApp'
import { BrambleProvider } from '../bramble/BrambleContext'
import type { BrambleTask } from '../bramble/types'
import type { CoreState } from '../core/engine'
import type { AppId } from '../core/flowTypes'
import type { UnitId } from '../core/units'
import { initialStrideState, type StrideState } from '../stride/state'
import { StrideApp } from '../stride/StrideApp'
import { StrideProvider } from '../stride/StrideContext'
import { strideTaskOutcome } from '../stride/tasks'
import type { StrideTask } from '../stride/types'
import type { TaskNumber } from './apps'
import { taskOutcome } from './tasks'
import type { ParticipantDoc, TaskOutcome } from './types'

export interface SessionApp<S extends CoreState = CoreState> {
  id: AppId
  Provider: ComponentType<{ nudgedUnits: readonly UnitId[]; initialState: S; onChange?: (s: S) => void; children: ReactNode }>
  App: ComponentType
  /** The participant-record field holding this app's state. */
  field: 'appState' | 'strideState'
  /** Saved state laid over the defaults, so records from older app versions gain any new fields. */
  initial: (saved: S | null) => S
  /** What gets saved (Bramble removes typed addresses). */
  storable: (s: S) => S
  outcome: (task: TaskNumber, s: S) => TaskOutcome
}

const bramble: SessionApp<AppState> = {
  id: 'bramble',
  Provider: BrambleProvider,
  App: BrambleApp,
  field: 'appState',
  initial: (saved) => ({ ...initialAppState(), ...saved }),
  storable: storableAppState,
  outcome: (task, s) => taskOutcome(task as BrambleTask, s),
}

const stride: SessionApp<StrideState> = {
  id: 'stride',
  Provider: StrideProvider,
  App: StrideApp,
  field: 'strideState',
  initial: (saved) => ({ ...initialStrideState(), ...saved }),
  storable: (s) => s,
  outcome: (task, s) => strideTaskOutcome(task as StrideTask, s),
}

export const SESSION_APPS: Record<AppId, SessionApp> = {
  bramble: bramble as unknown as SessionApp,
  stride: stride as unknown as SessionApp,
}

export function savedStateOf(participant: ParticipantDoc, app: SessionApp): CoreState | null {
  return (participant[app.field] as CoreState | null) ?? null
}
