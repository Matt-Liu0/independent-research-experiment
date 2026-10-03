import { render } from '@testing-library/react'
import { initialAppState, type AppState } from '../bramble/appState'
import { BrambleApp } from '../bramble/BrambleApp'
import { BrambleProvider, useBramble, type Bramble } from '../bramble/BrambleContext'
import type { Friction } from '../bramble/types'
import { createMemorySink, setEventSink, setLogContext } from '../log/logEvent'

/** Renders the practice app on its own, with events captured in memory. */
export function renderApp(friction: Friction, initialState: Partial<AppState> = {}) {
  const sink = createMemorySink()
  setEventSink(sink)
  setLogContext({ taskId: null, screen: null })
  const ref: { current: Bramble | null } = { current: null }

  function Capture() {
    ref.current = useBramble()
    return null
  }

  const view = render(
    <BrambleProvider friction={friction} initialState={{ ...initialAppState(), ...initialState }}>
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
