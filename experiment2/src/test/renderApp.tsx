import { render } from '@testing-library/react'
import { initialAppState, type AppState } from '../bramble/appState'
import { BrambleApp } from '../bramble/BrambleApp'
import { BrambleProvider, useBramble, type Bramble } from '../bramble/BrambleContext'
import type { Friction } from '../bramble/types'
import { uniformUnits, type UnitId } from '../core/units'
import { createMemorySink, setEventSink, setLogContext } from '../log/logEvent'

/**
 * Renders the practice app on its own, with events captured in memory.
 * `friction` is one level for every screen, or a list of the nudged units.
 */
export function renderApp(friction: Friction | readonly UnitId[], initialState: Partial<AppState> = {}) {
  const nudgedUnits = typeof friction === 'string' ? uniformUnits(friction) : friction
  const sink = createMemorySink()
  setEventSink(sink)
  setLogContext({ taskId: null, screen: null })
  const ref: { current: Bramble | null } = { current: null }

  function Capture() {
    ref.current = useBramble()
    return null
  }

  const view = render(
    <BrambleProvider nudgedUnits={nudgedUnits} initialState={{ ...initialAppState(), ...initialState }}>
      <BrambleApp />
      <Capture />
    </BrambleProvider>,
  )

  return {
    ...view,
    events: sink.events,
    eventsOf: (type: string) => sink.events.filter((e) => e.type === type),
    /** Latest app state, including changes from the last interaction. */
    state: () => ref.current!.getState(),
    bramble: () => ref.current!,
  }
}
