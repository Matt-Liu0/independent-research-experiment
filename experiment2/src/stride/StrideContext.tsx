import type { ReactNode } from 'react'
import { EngineProvider, useEngine, type AppDefinition, type Engine } from '../core/engine'
import type { TimingKey } from '../core/timing'
import type { UnitId } from '../core/units'
import { STRIDE_FLOWS } from './flows'
import { strideReducer, type StrideAction, type StrideState } from './state'
import type { StrideFlowId, StrideScreen } from './types'

/** Screens that "fetch" data show the longer skeleton. */
const DATA_SCREENS: StrideScreen[] = ['workout', 'plans', 'rewards']

export function strideLoadingKey(screen: StrideScreen): TimingKey {
  return DATA_SCREENS.includes(screen) ? 'dataSkeleton' : 'tabSkeleton'
}

export const STRIDE: AppDefinition<StrideFlowId, StrideScreen, StrideState, StrideAction> = {
  id: 'stride',
  registry: STRIDE_FLOWS,
  reducer: strideReducer,
  accountScreen: 'profile',
  subScreenParent: { workout: 'workout_setup' },
  loadingKey: strideLoadingKey,
}

export type Stride = Engine<StrideFlowId, StrideScreen, StrideState, StrideAction>

export function useStride(): Stride {
  const engine = useEngine()
  if (engine.app.id !== 'stride') throw new Error('useStride outside StrideProvider')
  return engine as unknown as Stride
}

interface Props {
  /** Decision screens shown nudged for this participant; the rest are neutral. */
  nudgedUnits: readonly UnitId[]
  initialState: StrideState
  onChange?: (state: StrideState) => void
  children: ReactNode
}

export function StrideProvider(props: Props) {
  return <EngineProvider app={STRIDE} {...props} />
}
