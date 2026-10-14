import { FlowChoice } from '../../core/FlowChoice'
import { CheckIcon, ClockIcon, MapIcon, PeopleIcon, PulseIcon } from '../../core/icons'
import { Sheet } from '../../core/Sheet'
import { WORKOUT } from '../data'
import { STRIDE_FLOWS } from '../flows'
import { workoutMinutesShown, type WorkoutPhase } from '../state'
import { useStride } from '../StrideContext'

const STEPS: { phase: WorkoutPhase; label: string }[] = [
  { phase: 'warm_up', label: 'Warm-up' },
  { phase: 'main_set', label: 'Main set' },
  { phase: 'cool_down', label: 'Cool-down' },
  { phase: 'done', label: 'Done' },
]

const PHASE_TEXT: Partial<Record<WorkoutPhase, string>> = {
  warm_up: 'Easy pace to start. Maya will pick it up soon.',
  main_set: 'Intervals: 40 seconds hard, 20 seconds easy.',
  cool_down: 'Slow it down and breathe.',
}

/** The practice heart rate, by phase (the same for everyone). */
const HEART_RATE: Partial<Record<WorkoutPhase, number>> = { warm_up: 104, main_set: 148, cool_down: 118 }

export function Workout() {
  const { state, navigate } = useStride()

  if (state.workout === 'none') {
    return (
      <section className="screen">
        <h1 className="screen-title">Workout</h1>
        <p className="notice">You haven't started a workout yet.</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate('workout_setup')}>
          Set up a workout
        </button>
      </section>
    )
  }

  if (state.workout === 'done') return <WorkoutDone />

  const step = STEPS.findIndex((s) => s.phase === state.workout)
  const mainSet = state.workout === 'main_set'
  const bgSettled = state.settled.includes('stride_bg_workout')
  const samSettled = state.settled.includes('stride_sam_share')
  const live = state.flows.stride_bg_workout === 'allow'

  return (
    <section className="screen">
      <div className="order-number muted">{WORKOUT.name}</div>
      <div className="card">
        <div className="muted">
          {workoutMinutesShown(state)} of {WORKOUT.minutes} min
        </div>
        <div className="eta row">
          <PulseIcon /> {HEART_RATE[state.workout]} bpm
        </div>
        <div className="progress" aria-label={`Workout progress: ${STEPS[step].label}`}>
          {STEPS.map((s, i) => (
            <div key={s.phase} className={`progress-step ${i <= step ? 'done' : ''} ${i === step ? 'current' : ''}`}>
              <span className="progress-bar" />
              <span className={`small ${i === step ? 'strong' : 'muted'}`}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="order-status" role="status">
          {PHASE_TEXT[state.workout]}
        </p>
        {/* Same in both levels, and says nothing about the questions that appear during the workout. */}
        <p className="muted small order-guide">Keep this page open while you work out. Maya will take you through each part.</p>
        <div className="courier row">
          <span className="avatar">M</span>
          <span style={{ flex: 1 }} className="strong">
            Coach {WORKOUT.coach}
          </span>
          <span className="small muted">{state.flows.stride_coach_live === 'share' ? 'Sees your heart rate' : 'Voice coaching'}</span>
        </div>
      </div>

      {/* The two workout prompts appear in the main set, where they make sense. */}
      {mainSet && !bgSettled && <BackgroundPrompt />}
      {mainSet && !samSettled && <SamPrompt />}
      {bgSettled && state.workout !== 'cool_down' && (
        <p className="notice small">
          {live
            ? 'Stride is reading your heart rate in the background for this workout.'
            : 'Stride will only read your heart rate while you have the app open.'}
        </p>
      )}
      {samSettled && <SamStatus />}
      {mainSet && bgSettled && samSettled && <p className="muted small">Keep going…</p>}
    </section>
  )
}

function BackgroundPrompt() {
  const bg = STRIDE_FLOWS.getFlow('stride_bg_workout')
  return (
    <div className="card card-tint">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="icon-circle icon-circle-white">
          <PulseIcon />
        </span>
        <div>
          <div className="strong">{bg.title}</div>
          <div className="muted">{bg.description}</div>
        </div>
      </div>
      <FlowChoice flowId="stride_bg_workout" layout="row" />
    </div>
  )
}

function SamPrompt() {
  const sam = STRIDE_FLOWS.getFlow('stride_sam_share')
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="icon-circle">
          <PeopleIcon />
        </span>
        <div>
          <div className="strong">{sam.title}</div>
          <div className="muted">{sam.description}</div>
        </div>
      </div>
      <FlowChoice flowId="stride_sam_share" />
    </div>
  )
}

function SamStatus() {
  const { state } = useStride()
  const value = state.flows.stride_sam_share
  if (value === null) return null
  if (value === 'live_workout') {
    const sharing = state.workout !== 'done'
    return (
      <p className="notice small row">
        {sharing && <span className="live-dot" aria-hidden="true" />}
        {sharing ? 'Sam can see your live workout until you finish.' : 'Sam could see your live workout until you finished.'}
      </p>
    )
  }
  return (
    <div className="message-preview small">
      <div className="muted">Sent to Sam</div>
      <div>{state.workout === 'done' ? `Finished my ${WORKOUT.minutes}-minute workout!` : 'Working out now, back soon.'}</div>
    </div>
  )
}

function WorkoutDone() {
  const { state } = useStride()
  const askAllDay = STRIDE_FLOWS.isApplicable('stride_hr_all_day', state.flows) && !state.settled.includes('stride_hr_all_day')
  const allDay = STRIDE_FLOWS.getFlow('stride_hr_all_day')
  // The community-map prompt comes after the all-day question (or straight away when that one doesn't apply).
  const community = STRIDE_FLOWS.getFlow('stride_community_map')
  const askCommunity = !askAllDay && !state.settled.includes('stride_community_map')
  const shared = state.flows.stride_community_map
  return (
    <section className="screen">
      <div className="order-number muted">{WORKOUT.name}</div>
      <div className="delivered">
        <span className="delivered-check">
          <CheckIcon />
        </span>
        <h1 className="screen-title">Workout complete</h1>
        <p className="muted">
          {WORKOUT.minutes} min · average 132 bpm · 96 calories
        </p>
      </div>
      <SamStatus />
      {shared !== null && (
        <p className="notice small row">
          <MapIcon /> {shared === 'share' ? 'Shared to the community map.' : 'This workout is private.'}
        </p>
      )}
      {askAllDay && (
        <Sheet icon={<ClockIcon />} title={allDay.title} description={allDay.description}>
          <FlowChoice flowId="stride_hr_all_day" />
        </Sheet>
      )}
      {askCommunity && (
        <Sheet icon={<MapIcon />} title={community.title} description={community.description}>
          <FlowChoice flowId="stride_community_map" />
        </Sheet>
      )}
    </section>
  )
}
