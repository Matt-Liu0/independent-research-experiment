import { useEffect, useState, type ReactNode } from 'react'
import '../bramble/bramble.css'
import './stride.css'
import { DumbbellIcon, GiftIcon, ListIcon, SunIcon, UserIcon } from '../core/icons'
import { ScreenSkeleton } from '../core/Loading'
import { delayFor } from '../core/timing'
import { visibleMs } from '../log/clock'
import { setBackHandler } from '../study/backGuard'
import { Plans } from './screens/Plans'
import { Profile } from './screens/Profile'
import { StrideRewards } from './screens/StrideRewards'
import { Today } from './screens/Today'
import { Workout } from './screens/Workout'
import { WorkoutSetup } from './screens/WorkoutSetup'
import { nextWorkoutStep } from './state'
import { strideLoadingKey, useStride } from './StrideContext'
import type { StrideScreen } from './types'

const SCREENS: Record<StrideScreen, () => ReactNode> = {
  today: Today,
  workout_setup: WorkoutSetup,
  workout: Workout,
  plans: Plans,
  rewards: StrideRewards,
  profile: Profile,
}

// Stride's own navigation (unlike Bramble's five equal tabs): four tabs around a raised
// Workouts button in the middle, as fitness apps often do. Only the surroundings differ
// between the apps; the decision controls are the same components in both.
const TABS: { screen: StrideScreen; label: string; icon: ReactNode; covers: StrideScreen[]; center?: boolean }[] = [
  { screen: 'today', label: 'Today', icon: <SunIcon />, covers: ['today'] },
  { screen: 'plans', label: 'Plans', icon: <ListIcon />, covers: ['plans'] },
  { screen: 'workout_setup', label: 'Workouts', icon: <DumbbellIcon />, covers: ['workout_setup', 'workout'], center: true },
  { screen: 'rewards', label: 'Rewards', icon: <GiftIcon />, covers: ['rewards'] },
  { screen: 'profile', label: 'Profile', icon: <UserIcon />, covers: ['profile'] },
]

/** The practice fitness and health app: header, current screen and tab bar. Built like Bramble. */
export function StrideApp() {
  const { state, navigate, goBack } = useStride()
  const Screen = SCREENS[state.screen]
  useWorkoutTimeline()

  // While the app is open, the phone's Back moves between screens.
  useEffect(() => {
    setBackHandler(goBack)
    return () => setBackHandler(null)
  }, [goBack])
  // The screen that has finished "loading". The first screen shows straight away (the task splash covers it).
  const [loaded, setLoaded] = useState<StrideScreen>(state.screen)
  const loadingMs = delayFor(strideLoadingKey(state.screen))
  const loading = loaded !== state.screen && loadingMs > 0

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoaded(state.screen), loadingMs)
    return () => clearTimeout(timer)
  }, [loading, loadingMs, state.screen])

  const workoutRunning = state.workout !== 'none' && state.workout !== 'done'

  return (
    <div className="stride">
      <header className="app-header">
        <span className="logo">stride</span>
        <button type="button" className="coin-pill" aria-label={`${state.points} coins`} onClick={() => navigate('rewards')}>
          <span className="coin-dot" aria-hidden="true" />
          {state.points}
        </button>
      </header>
      <main className="app-content">
        {/* Prompts live inside screens, so none can appear (or start timing) while loading. */}
        {loading ? <ScreenSkeleton /> : <Screen key={state.screen} />}
      </main>
      <nav className="tab-bar stride-tabs" aria-label="Stride">
        {TABS.map((tab) => {
          const active = tab.covers.includes(state.screen)
          return (
            <button
              key={tab.screen}
              type="button"
              className={`tab ${active ? 'active' : ''} ${tab.center ? 'tab-center' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.screen === 'workout_setup' && state.workout !== 'none' ? 'workout' : tab.screen)}
            >
              {tab.center ? <span className="tab-center-circle">{tab.icon}</span> : tab.icon}
              {tab.screen === 'workout_setup' && workoutRunning && !active && <span className="tab-badge" aria-hidden="true" />}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * Moves the workout along while the app is open: adds visible time every tick, and steps
 * Warm-up → Main set → Cool-down → Done when due. Pauses while the app is hidden or closed
 * (e.g. during ease ratings), and resumes from saved state after a reload.
 */
function useWorkoutTimeline() {
  const { state, dispatch, act } = useStride()
  const running = state.workout !== 'none' && state.workout !== 'done'

  useEffect(() => {
    const tick = delayFor('orderTick')
    if (!running || tick <= 0) return
    let last = visibleMs()
    const id = setInterval(() => {
      const now = visibleMs()
      dispatch({ type: 'workoutTick', ms: now - last })
      last = now
    }, tick)
    return () => clearInterval(id)
  }, [running, dispatch])

  const step = nextWorkoutStep(state)
  useEffect(() => {
    if (!step) return
    dispatch({ type: 'workoutStep', step })
    act('workout_phase', { step })
  }, [step, dispatch, act])
}
