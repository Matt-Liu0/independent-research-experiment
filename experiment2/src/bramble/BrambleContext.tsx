import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent, setLogContext } from '../log/logEvent'
import { isSheetOpen } from './Sheet'
import { delayFor, screenLoadingKey } from './timing'
import { appReducer, type AppAction, type AppState } from './appState'
import { FLOWS, getFlow, isApplicable, levelOf } from './flows'
import type { FlowId, Friction, ScreenId } from './types'
import { frictionOf as frictionOfFlow, type UnitId } from './units'

/**
 * prompt: on the app screen where the flow appears. rewards_page: changing an answered offer
 * with its Change button. account_page: on the Account page.
 */
export type DecisionSource = 'prompt' | 'rewards_page' | 'account_page'

export interface Bramble {
  state: AppState
  /** This participant's friction level for a flow (it varies by decision screen). */
  frictionOf: (id: FlowId) => Friction
  dispatch: (action: AppAction) => void
  navigate: (screen: ScreenId) => void
  /** Back to the previous screen (the ‹ button or the phone's Back). False if there's nowhere to go. */
  goBack: () => boolean
  /** Log a named participant action (store set, order placed, …). */
  act: (name: string, fields?: Record<string, unknown>) => void
  /** A flow's prompt or control is on screen. Logs prompt_shown once per page load and applies its preset. */
  showFlow: (id: FlowId) => void
  /** The participant picked a value. Prompts settle immediately; Rewards offers pay their points. */
  chooseFlow: (id: FlowId, value: string, source?: DecisionSource) => void
  /** Fix a flow's first choice (commit and leave flows). No-op if already settled or not applicable. */
  settleFlow: (id: FlowId) => void
  /** Called when a task ends: settles flows that settle on leaving, and closes Account-page timing. */
  leaveScreen: () => void
  /** The latest state, including changes made earlier in the same event handler. */
  getState: () => AppState
}

/** Where Back goes from a sub-screen when there's no history (e.g. right after a reload). */
const SUB_SCREEN_PARENT: Partial<Record<ScreenId, ScreenId>> = { find_store: 'shop', checkout: 'shop' }

const BrambleContext = createContext<Bramble | null>(null)

export function useBramble(): Bramble {
  const ctx = useContext(BrambleContext)
  if (!ctx) throw new Error('useBramble outside BrambleProvider')
  return ctx
}

interface Props {
  /** Decision screens shown nudged for this participant; the rest are neutral. */
  nudgedUnits: readonly UnitId[]
  initialState: AppState
  onChange?: (state: AppState) => void
  children: ReactNode
}

export function BrambleProvider({ nudgedUnits, initialState, onChange, children }: Props) {
  const [state, setState] = useState(initialState)
  // Synchronous mirror, so a choice and the settle that follows it see the same state.
  const stateRef = useRef(initialState)
  const shownAt = useRef(new Map<FlowId, number>())
  const decisions = useRef(new Map<FlowId, number>())
  const accountEnteredAt = useRef<number | null>(null)
  // Screens visited in this page load, for Back. Not saved: after a reload, Back uses SUB_SCREEN_PARENT.
  const history = useRef<ScreenId[]>([])

  const dispatch = useCallback((action: AppAction) => {
    stateRef.current = appReducer(stateRef.current, action)
    setState(stateRef.current)
  }, [])

  useEffect(() => {
    setLogContext({ screen: stateRef.current.screen })
  }, [])

  useEffect(() => {
    onChange?.(state)
  }, [state, onChange])

  const frictionOf = useCallback((id: FlowId) => frictionOfFlow(getFlow(id), nudgedUnits), [nudgedUnits])
  const presetOf = useCallback((id: FlowId) => levelOf(getFlow(id), frictionOf(id)).default, [frictionOf])

  const msSincePrompt = (id: FlowId): number | null => {
    const at = shownAt.current.get(id)
    return at === undefined ? null : visibleMs() - at
  }

  const settleWith = useCallback(
    (id: FlowId, value: string) => {
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
    (id: FlowId) => {
      const s = stateRef.current
      const value = s.flows[id]
      if (value === null || !s.shown.includes(id) || !isApplicable(id, s.flows)) return
      settleWith(id, value)
    },
    [settleWith],
  )

  const showFlow = useCallback(
    (id: FlowId) => {
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
    (id: FlowId, value: string, source: DecisionSource = 'prompt') => {
      const flow = getFlow(id)
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
        const amount =
          (value === accept ? flow.points : 0) - (wasSettled && before.flows[id] === accept ? flow.points : 0)
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
    [dispatch, presetOf, settleWith],
  )

  const settleLeaveFlows = useCallback(
    (screen: ScreenId) => {
      for (const flow of FLOWS) {
        if (flow.screen === screen && flow.settleOn === 'leave') settleFlow(flow.id)
      }
    },
    [settleFlow],
  )

  const closeAccountTiming = useCallback(() => {
    if (accountEnteredAt.current === null) return
    dispatch({ type: 'accountLeave', ms: visibleMs() - accountEnteredAt.current })
    accountEnteredAt.current = null
  }, [dispatch])

  const navigate = useCallback(
    (screen: ScreenId, via: 'tap' | 'back' = 'tap') => {
      const from = stateRef.current.screen
      if (from === screen) return
      if (via === 'tap') history.current.push(from)
      settleLeaveFlows(from)
      if (from === 'account') closeAccountTiming()
      if (screen === 'account') {
        accountEnteredAt.current = visibleMs()
        dispatch({ type: 'accountVisit' })
      }
      setLogContext({ screen })
      logEvent('screen', { from, to: screen, via, loadingMs: delayFor(screenLoadingKey(screen)) })
      dispatch({ type: 'navigate', screen })
    },
    [dispatch, settleLeaveFlows, closeAccountTiming],
  )

  const goBack = useCallback(() => {
    // Prompts can't be dismissed, so Back does nothing while one is open.
    if (isSheetOpen()) return false
    const current = stateRef.current.screen
    const previous = history.current.pop() ?? SUB_SCREEN_PARENT[current]
    if (!previous || previous === current) return false
    navigate(previous, 'back')
    return true
  }, [navigate])

  const leaveScreen = useCallback(() => {
    settleLeaveFlows(stateRef.current.screen)
    closeAccountTiming()
  }, [settleLeaveFlows, closeAccountTiming])

  // Opening the app on the Account page (e.g. after a reload) counts as a visit.
  useEffect(() => {
    if (stateRef.current.screen === 'account' && accountEnteredAt.current === null) {
      accountEnteredAt.current = visibleMs()
    }
  }, [])

  const act = useCallback((name: string, fields: Record<string, unknown> = {}) => {
    logEvent('action', { name, ...fields })
  }, [])

  const getState = useCallback(() => stateRef.current, [])

  const value = useMemo<Bramble>(
    () => ({ state, frictionOf, dispatch, navigate, goBack, act, showFlow, chooseFlow, settleFlow, leaveScreen, getState }),
    [state, frictionOf, dispatch, navigate, goBack, act, showFlow, chooseFlow, settleFlow, leaveScreen, getState],
  )

  return <BrambleContext.Provider value={value}>{children}</BrambleContext.Provider>
}
