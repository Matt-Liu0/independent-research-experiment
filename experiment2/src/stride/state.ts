import { coreReducer, isCoreAction, type CoreAction, type CoreState } from '../core/engine'
import { delayFor } from '../core/timing'
import { REPORT_COST, START_COINS } from './data'
import { STRIDE_FLOWS } from './flows'
import type { StrideFlowId, StrideScreen } from './types'

export type WorkoutPhase = 'none' | 'warm_up' | 'main_set' | 'cool_down' | 'done'

export const WORKOUT_PHASES: WorkoutPhase[] = ['none', 'warm_up', 'main_set', 'cool_down', 'done']

/** Everything Stride remembers. Saved to the participant record (`strideState`) after each change. */
export interface StrideState extends CoreState<StrideFlowId, StrideScreen> {
  workout: WorkoutPhase
  /** Visible ms since Start workout. Drives Warm-up → Main set → Cool-down → Done. */
  workoutElapsedMs: number
  /** workoutElapsedMs when the main set and the cool-down began. */
  workoutMainSetAtMs: number | null
  workoutCoolDownAtMs: number | null
  savedPlans: string[]
  reportUnlocked: boolean
}

export function initialStrideState(): StrideState {
  return {
    screen: 'today',
    flows: STRIDE_FLOWS.emptyFlowValues(),
    shown: [],
    settled: [],
    points: START_COINS,
    accountPageVisits: 0,
    accountPageMs: 0,
    workout: 'none',
    workoutElapsedMs: 0,
    workoutMainSetAtMs: null,
    workoutCoolDownAtMs: null,
    savedPlans: [],
    reportUnlocked: false,
  }
}

/** Stride's own actions; the engine's (navigate, show, set, …) are in CoreAction. */
export type StrideAction =
  | { type: 'startWorkout' }
  | { type: 'workoutTick'; ms: number }
  | { type: 'workoutStep'; step: 'main_set' | 'cool_down' | 'done' }
  | { type: 'togglePlan'; planId: string }
  | { type: 'unlockReport' }

export type StrideAnyAction = StrideAction | CoreAction<StrideFlowId, StrideScreen>

export function strideReducer(state: StrideState, action: StrideAnyAction): StrideState {
  if (isCoreAction<StrideFlowId, StrideScreen>(action)) return coreReducer(STRIDE_FLOWS, state, action)
  switch (action.type) {
    case 'startWorkout':
      return state.workout === 'none' ? { ...state, workout: 'warm_up' } : state

    case 'workoutTick':
      if (state.workout === 'none' || state.workout === 'done') return state
      return { ...state, workoutElapsedMs: state.workoutElapsedMs + Math.max(0, Math.round(action.ms)) }

    case 'workoutStep': {
      if (WORKOUT_PHASES.indexOf(action.step) <= WORKOUT_PHASES.indexOf(state.workout)) return state
      const at =
        action.step === 'main_set'
          ? { workoutMainSetAtMs: state.workoutElapsedMs }
          : action.step === 'cool_down'
            ? { workoutCoolDownAtMs: state.workoutElapsedMs }
            : {}
      return { ...state, workout: action.step, ...at }
    }

    case 'togglePlan':
      return {
        ...state,
        savedPlans: state.savedPlans.includes(action.planId)
          ? state.savedPlans.filter((id) => id !== action.planId)
          : [...state.savedPlans, action.planId],
      }

    case 'unlockReport':
      if (state.reportUnlocked || state.points < REPORT_COST) return state
      return { ...state, points: state.points - REPORT_COST, reportUnlocked: true }
  }
}

/**
 * The workout's next phase, if it's due. Warm-up → Main set runs on visible time. Cool-down
 * also waits for both workout prompts (background heart rate, Sam), so the "keep heart-rate
 * monitoring on all day?" question can follow from the first, as in Bramble's order.
 */
export function nextWorkoutStep(s: StrideState): 'main_set' | 'cool_down' | 'done' | null {
  if (s.workout === 'warm_up' && s.workoutElapsedMs >= delayFor('workoutMainSet')) return 'main_set'
  if (s.workout === 'main_set') {
    const promptsAnswered = s.settled.includes('stride_bg_workout') && s.settled.includes('stride_sam_share')
    const inMainSet = s.workoutElapsedMs - (s.workoutMainSetAtMs ?? 0)
    if (promptsAnswered && inMainSet >= delayFor('workoutMinMainSet')) return 'cool_down'
  }
  if (s.workout === 'cool_down' && s.workoutElapsedMs - (s.workoutCoolDownAtMs ?? 0) >= delayFor('workoutCoolDown')) return 'done'
  return null
}

/** Minutes shown on the workout clock: the compressed timeline maps onto a 10-minute workout. */
export function workoutMinutesShown(s: StrideState): number {
  const total = delayFor('workoutMainSet') + delayFor('workoutMinMainSet') + delayFor('workoutCoolDown')
  if (s.workout === 'done') return 10
  if (total <= 0) return 0
  return Math.min(9, Math.floor((s.workoutElapsedMs / total) * 10))
}
