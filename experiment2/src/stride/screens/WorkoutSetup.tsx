import { FlowChoice } from '../../core/FlowChoice'
import { Spinner } from '../../core/Loading'
import { useBusy } from '../../core/useBusy'
import { WORKOUT } from '../data'
import { STRIDE_FLOW_LIST } from '../flows'
import { useStride } from '../StrideContext'

const SETUP_FLOWS = STRIDE_FLOW_LIST.filter((f) => f.screen === 'workout_setup')

export function WorkoutSetup() {
  const { state, dispatch, navigate, showFlow, settleFlow, act } = useStride()
  const [busy, run] = useBusy()

  if (state.workout !== 'none') {
    return (
      <section className="screen">
        <h1 className="screen-title">Workouts</h1>
        <p className="notice">{state.workout === 'done' ? 'You finished today\'s workout.' : 'Your workout is in progress.'}</p>
        <button type="button" className="btn btn-green" onClick={() => navigate('workout')}>
          {state.workout === 'done' ? 'See your workout' : 'Back to your workout'}
        </button>
      </section>
    )
  }

  const start = () => {
    // The choices are fixed at the tap; the spinner comes after, so it doesn't count as decision time.
    for (const flow of SETUP_FLOWS) {
      // Both controls sit above the button, so starting means they were seen.
      showFlow(flow.id)
      settleFlow(flow.id)
    }
    run('startWorkout', () => {
      act('workout_started')
      dispatch({ type: 'startWorkout' })
      navigate('workout')
    })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Workouts</h1>
      <div className="card">
        <div className="eyebrow-small">Guided workout</div>
        <div className="strong">{WORKOUT.name}</div>
        <div className="muted small">
          {WORKOUT.minutes} min · with coach {WORKOUT.coach}
        </div>
      </div>

      <div className="card">
        <div className="eyebrow-small">Coaching</div>
        <FlowChoice flowId="stride_coach_live" />
      </div>

      <FlowChoice flowId="stride_partner_offers" />

      <button type="button" className="btn btn-green" disabled={busy !== null} onClick={start}>
        {busy ? <Spinner label="Starting…" /> : 'Start workout'}
      </button>
    </section>
  )
}
