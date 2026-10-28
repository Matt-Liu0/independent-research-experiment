// The engine every practice app runs on: app state plus the show / choose / settle logging
// rules, friction by decision screen, points, Back and settings-page timing. Each app supplies
// its flows, reducer and screens (an AppDefinition); the rules here are the same for all.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent, setLogContext } from '../log/logEvent'
import type { FlowRegistry } from './flowRegistry'
import { levelOf } from './flowRegistry'
import type { AppId, Friction } from './flowTypes'
import { isSheetOpen } from './Sheet'
import { delayFor, type TimingKey } from './timing'
import { frictionOf as frictionOfFlow, type UnitId } from './units'

/**
 * prompt: on the app screen where the flow appears. rewards_page: changing an answered offer
 * with its Change button. account_page: on the app's settings page (Account, Profile).
 */
export type DecisionSource = 'prompt' | 'rewards_page' | 'account_page'

/** State every app keeps, alongside its own fields. */
export interface CoreState<F extends string = string, Scr extends string = string> {
  screen: Scr
  flows: Record<F, string | null>
  /** Flows whose prompt or control has appeared at least once. */
  shown: F[]
  /** Flows whose first choice is fixed (see SettleOn). */
  settled: F[]
  points: number
  accountPageVisits: number
  accountPageMs: number
}

export type CoreAction<F extends string = string, Scr extends string = string> =
  | { type: 'navigate'; screen: Scr }
  | { type: 'show'; flowId: F; preset: string | null }
  | { type: 'set'; flowId: F; value: string }
  | { type: 'settle'; flowId: F }
  | { type: 'addPoints'; amount: number }
  | { type: 'accountVisit' }
  | { type: 'accountLeave'; ms: number }

const CORE_ACTIONS = new Set(['navigate', 'show', 'set', 'settle', 'addPoints', 'accountVisit', 'accountLeave'])

export function isCoreAction<F extends string, Scr extends string>(action: { type: string }): action is CoreAction<F, Scr> {
  return CORE_ACTIONS.has(action.type)
}

const addOnce = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list : [...list, item])

/** Applies a core action; apps call this from their own reducer. */
export function coreReducer<F extends string, Scr extends string, S extends CoreState<F, Scr>>(
  registry: FlowRegistry<F, Scr, number>,
  state: S,
  action: CoreAction<F, Scr>,
): S {
  switch (action.type) {
    case 'navigate':
      return state.screen === action.screen ? state : { ...state, screen: action.screen }

    case 'show': {
      const flows =
        state.flows[action.flowId] === null && action.preset !== null && !state.shown.includes(action.flowId)
          ? { ...state.flows, [action.flowId]: action.preset }
          : state.flows
      return { ...state, flows, shown: addOnce(state.shown, action.flowId) }
    }

    case 'set': {
      const flows: Record<F, string | null> = { ...state.flows, [action.flowId]: action.value }
      // A dependent flow that no longer applies has no value (e.g. precise location once location is off).
      for (const dep of registry.dependentsOf(action.flowId)) {
        if (!registry.isApplicable(dep, flows)) flows[dep] = null
      }
      return { ...state, flows }
    }

    case 'settle':
      return { ...state, settled: addOnce(state.settled, action.flowId) }

    case 'addPoints':
      // Never below zero: taking back an offer whose points were already spent leaves 0.
      return { ...state, points: Math.max(0, state.points + action.amount) }

    case 'accountVisit':
      return { ...state, accountPageVisits: state.accountPageVisits + 1 }

    case 'accountLeave':
      return { ...state, accountPageMs: state.accountPageMs + Math.max(0, Math.round(action.ms)) }
  }
}

/** What an app gives the engine. */
export interface AppDefinition<F extends string, Scr extends string, S extends CoreState<F, Scr>, A extends { type: string }> {
  id: AppId
  registry: FlowRegistry<F, Scr, number>
  reducer: (state: S, action: A | CoreAction<F, Scr>) => S
  /** The settings page listing every flow (its visits and time are recorded). */
  accountScreen: Scr
  /** Where Back goes from a sub-screen when there's no history (e.g. right after a reload). */
  subScreenParent: Partial<Record<Scr, Scr>>
  /** Which skeleton delay a screen shows when switched to. */
  loadingKey: (screen: Scr) => TimingKey
}

export interface Engine<F extends string, Scr extends string, S extends CoreState<F, Scr>, A extends { type: string }> {
  app: AppDefinition<F, Scr, S, A>
  state: S
  /** This participant's friction level for a flow (it varies by decision screen). */
  frictionOf: (id: F) => Friction
  dispatch: (action: A | CoreAction<F, Scr>) => void
  navigate: (screen: Scr) => void
  /** Back to the previous screen (the ‹ button or the phone's Back). False if there's nowhere to go. */
  goBack: () => boolean
  /** Log a named participant action (store set, order placed, …). */
  act: (name: string, fields?: Record<string, unknown>) => void
  /** A flow's prompt or control is on screen. Logs prompt_shown once per page load and applies its preset. */
  showFlow: (id: F) => void
  /** The participant picked a value. Prompts settle immediately; Rewards offers pay their points. */
  chooseFlow: (id: F, value: string, source?: DecisionSource) => void
  /** Fix a flow's first choice (commit and leave flows). No-op if already settled or not applicable. */
  settleFlow: (id: F) => void
  /** Called when a task ends: settles flows that settle on leaving, and closes settings-page timing. */
  leaveScreen: () => void
  /** The latest state, including changes made earlier in the same event handler. */
  getState: () => S
}

/** An engine with its types erased, for app-independent parts (FlowChoice, ScreenHeader, tasks). */
export type AnyEngine = Engine<string, string, CoreState, { type: string }>

const EngineContext = createContext<AnyEngine | null>(null)

/** The running app's engine. Apps wrap this with their own typed hook (useBramble, useStride). */
export function useEngine(): AnyEngine {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useEngine outside an app provider')
  return ctx
}

interface Props<F extends string, Scr extends string, S extends CoreState<F, Scr>, A extends { type: string }> {
  app: AppDefinition<F, Scr, S, A>
  /** Decision screens shown nudged for this participant; the rest are neutral. */
  nudgedUnits: readonly UnitId[]
  initialState: S
  onChange?: (state: S) => void
  children: ReactNode
}

export function EngineProvider<F extends string, Scr extends string, S extends CoreState<F, Scr>, A extends { type: string }>({
  app,
  nudgedUnits,
  initialState,
  onChange,
  children,
}: Props<F, Scr, S, A>) {
  const { registry, reducer, accountScreen, subScreenParent, loadingKey } = app
  const [state, setState] = useState(initialState)
  // Synchronous mirror, so a choice and the settle that follows it see the same state.
  const stateRef = useRef(initialState)
  const shownAt = useRef(new Map<F, number>())
  const decisions = useRef(new Map<F, number>())
  const accountEnteredAt = useRef<number | null>(null)
  // Screens visited in this page load, for Back. Not saved: after a reload, Back uses subScreenParent.
  const history = useRef<Scr[]>([])

  const dispatch = useCallback(
    (action: A | CoreAction<F, Scr>) => {
      stateRef.current = reducer(stateRef.current, action)
      setState(stateRef.current)
    },
    [reducer],
  )

  useEffect(() => {
    setLogContext({ screen: stateRef.current.screen })
  }, [])

  useEffect(() => {
    onChange?.(state)
  }, [state, onChange])

  const frictionOf = useCallback((id: F) => frictionOfFlow(registry.getFlow(id), nudgedUnits), [registry, nudgedUnits])
  const presetOf = useCallback(
    (id: F) => levelOf(registry.getFlow(id), frictionOf(id)).default,
    [registry, frictionOf],
  )

  const msSincePrompt = (id: F): number | null => {
    const at = shownAt.current.get(id)
    return at === undefined ? null : visibleMs() - at
  }

  const settleWith = useCallback(
    (id: F, value: string) => {
      const s = stateRef.current
      if (s.settled.includes(id)) return
      const preset = presetOf(id)
      logEvent('settled', {
        flowId: id,
        value,
        defaultShown: preset,
        changedFromDefault: preset !== null && value !== preset,
        msSincePrompt: msSincePrompt(id),
        toggleCount: decisions.current.get(id) ?? 0,
      })
      dispatch({ type: 'settle', flowId: id })
    },
    [dispatch, presetOf],
  )

  const settleFlow = useCallback(
    (id: F) => {
      const s = stateRef.current
      const value = s.flows[id]
      if (value === null || !s.shown.includes(id) || !registry.isApplicable(id, s.flows)) return
      settleWith(id, value)
    },
    [registry, settleWith],
  )

  const showFlow = useCallback(
    (id: F) => {
      const s = stateRef.current
      if (shownAt.current.has(id) || s.settled.includes(id)) return
      shownAt.current.set(id, visibleMs())
      const preset = presetOf(id)
      logEvent('prompt_shown', { flowId: id, defaultShown: preset })
      dispatch({ type: 'show', flowId: id, preset })
    },
    [dispatch, presetOf],
  )

  const chooseFlow = useCallback(
    (id: F, value: string, source: DecisionSource = 'prompt') => {
      const flow = registry.getFlow(id)
      const before = stateRef.current
      const wasSettled = before.settled.includes(id)
      decisions.current.set(id, (decisions.current.get(id) ?? 0) + 1)
      logEvent('decision', {
        flowId: id,
        value,
        previous: before.flows[id],
        defaultShown: presetOf(id),
        source,
        msSincePrompt: source === 'prompt' && !wasSettled ? msSincePrompt(id) : null,
        pointsBefore: before.points,
      })
      dispatch({ type: 'set', flowId: id, value })

      // Points always match the current answer: accepting pays, and changing an accepted offer
      // back takes the points back, wherever it happens. Otherwise accepting and then unlinking
      // would earn the bonus without sharing anything.
      const firstAnswer = source === 'prompt' && !wasSettled
      if (flow.points && (firstAnswer || wasSettled)) {
        const accept = flow.options[0]
        const change =
          (value === accept ? flow.points : 0) - (wasSettled && before.flows[id] === accept ? flow.points : 0)
        // Taking back points already spent (e.g. on the report) stops at 0.
        const amount = Math.max(change, -before.points)
        if (amount !== 0) {
          logEvent('points', {
            flowId: id,
            amount,
            pointsBefore: before.points,
            reason: firstAnswer ? 'offer_accepted' : 'offer_changed',
          })
          dispatch({ type: 'addPoints', amount })
        }
      }
      if (firstAnswer && flow.settleOn === 'choice') settleWith(id, value)
    },
    [registry, dispatch, presetOf, settleWith],
  )

  const settleLeaveFlows = useCallback(
    (screen: Scr) => {
      for (const flow of registry.flows) {
        if (flow.screen === screen && flow.settleOn === 'leave') settleFlow(flow.id)
      }
    },
    [registry, settleFlow],
  )

  const closeAccountTiming = useCallback(() => {
    if (accountEnteredAt.current === null) return
    dispatch({ type: 'accountLeave', ms: visibleMs() - accountEnteredAt.current })
    accountEnteredAt.current = null
  }, [dispatch])

  const navigate = useCallback(
    (screen: Scr, via: 'tap' | 'back' = 'tap') => {
      const from = stateRef.current.screen
      if (from === screen) return
      if (via === 'tap') history.current.push(from)
      settleLeaveFlows(from)
      if (from === accountScreen) closeAccountTiming()
      if (screen === accountScreen) {
        accountEnteredAt.current = visibleMs()
        dispatch({ type: 'accountVisit' })
      }
      setLogContext({ screen })
      logEvent('screen', { from, to: screen, via, loadingMs: delayFor(loadingKey(screen)) })
      dispatch({ type: 'navigate', screen })
    },
    [dispatch, settleLeaveFlows, closeAccountTiming, accountScreen, loadingKey],
  )

  const goBack = useCallback(() => {
    // Prompts can't be dismissed, so Back does nothing while one is open.
    if (isSheetOpen()) return false
    const current = stateRef.current.screen
    const previous = history.current.pop() ?? subScreenParent[current]
    if (!previous || previous === current) return false
    navigate(previous, 'back')
    return true
  }, [navigate, subScreenParent])

  const leaveScreen = useCallback(() => {
    settleLeaveFlows(stateRef.current.screen)
    closeAccountTiming()
  }, [settleLeaveFlows, closeAccountTiming])

  // Opening the app on the settings page (e.g. after a reload) counts as a visit.
  useEffect(() => {
    if (stateRef.current.screen === accountScreen && accountEnteredAt.current === null) {
      accountEnteredAt.current = visibleMs()
    }
  }, [accountScreen])

  const act = useCallback((name: string, fields: Record<string, unknown> = {}) => {
    logEvent('action', { name, ...fields })
  }, [])

  const getState = useCallback(() => stateRef.current, [])

  const value = useMemo<Engine<F, Scr, S, A>>(
    () => ({ app, state, frictionOf, dispatch, navigate, goBack, act, showFlow, chooseFlow, settleFlow, leaveScreen, getState }),
    [app, state, frictionOf, dispatch, navigate, goBack, act, showFlow, chooseFlow, settleFlow, leaveScreen, getState],
  )

  return <EngineContext.Provider value={value as unknown as AnyEngine}>{children}</EngineContext.Provider>
}
