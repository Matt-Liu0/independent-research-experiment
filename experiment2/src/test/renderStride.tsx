import { render } from '@testing-library/react'
import type { Friction } from '../core/flowTypes'
import { uniformUnits, type UnitId } from '../core/units'
import { createMemorySink, setEventSink, setLogContext } from '../log/logEvent'
import { StrideApp } from '../stride/StrideApp'
import { StrideProvider, useStride, type Stride } from '../stride/StrideContext'
import { initialStrideState, type StrideState } from '../stride/state'

/** Renders Stride on its own, with events captured in memory (like renderApp for Bramble). */
export function renderStride(friction: Friction | readonly UnitId[], initialState: Partial<StrideState> = {}) {
  const nudgedUnits = typeof friction === 'string' ? uniformUnits(friction) : friction
  const sink = createMemorySink()
  setEventSink(sink)
  setLogContext({ taskId: null, screen: null })
  const ref: { current: Stride | null } = { current: null }

  function Capture() {
    ref.current = useStride()
    return null
  }

  const view = render(
    <StrideProvider nudgedUnits={nudgedUnits} initialState={{ ...initialStrideState(), ...initialState }}>
      <StrideApp />
      <Capture />
    </StrideProvider>,
  )

  return {
    ...view,
    events: sink.events,
    eventsOf: (type: string) => sink.events.filter((e) => e.type === type),
    state: () => ref.current!.getState(),
  }
}
