import type { ReactNode } from 'react'
import { EngineProvider, useEngine, type AppDefinition, type Engine } from '../core/engine'
import type { TimingKey } from '../core/timing'
import type { UnitId } from '../core/units'
import { appReducer, type AppState, type BrambleAction } from './appState'
import { BRAMBLE_FLOWS } from './flows'
import type { FlowId, ScreenId } from './types'

export type { DecisionSource } from '../core/engine'

/** Screens that "fetch" data show the longer skeleton. */
const DATA_SCREENS: ScreenId[] = ['find_store', 'deals', 'rewards', 'orders']

export function screenLoadingKey(screen: ScreenId): TimingKey {
  return DATA_SCREENS.includes(screen) ? 'dataSkeleton' : 'tabSkeleton'
}

export const BRAMBLE: AppDefinition<FlowId, ScreenId, AppState, BrambleAction> = {
  id: 'bramble',
  registry: BRAMBLE_FLOWS,
  reducer: appReducer,
  accountScreen: 'account',
  subScreenParent: { find_store: 'shop', checkout: 'shop' },
  loadingKey: screenLoadingKey,
}

export type Bramble = Engine<FlowId, ScreenId, AppState, BrambleAction>

export function useBramble(): Bramble {
  const engine = useEngine()
  if (engine.app.id !== 'bramble') throw new Error('useBramble outside BrambleProvider')
  return engine as unknown as Bramble
}

interface Props {
  /** Decision screens shown nudged for this participant; the rest are neutral. */
  nudgedUnits: readonly UnitId[]
  initialState: AppState
  onChange?: (state: AppState) => void
  children: ReactNode
}

export function BrambleProvider(props: Props) {
  return <EngineProvider app={BRAMBLE} {...props} />
}
