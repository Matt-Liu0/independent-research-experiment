import { useState } from 'react'
import { FlowChoice } from '../../core/FlowChoice'
import { FlameIcon, MoonIcon, PulseIcon } from '../../core/icons'
import { LoadingBlock } from '../../core/Loading'
import { Sheet } from '../../core/Sheet'
import { useBusy } from '../../core/useBusy'
import { getName } from '../../study/name'
import { FITNESS_GOALS, getSetup } from '../../study/setup'
import { TODAY_STATS } from '../data'
import { STRIDE_FLOWS } from '../flows'
import { useStride } from '../StrideContext'

/** Greeting by the phone's clock. */
function greeting(hour = new Date().getHours()): string {
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function Today() {
  const { state, settleFlow } = useStride()
  const [busy, run] = useBusy()
  // The health-access sheet opens from the Connect button, as an app's setup step would.
  const [asking, setAsking] = useState(false)
  const name = getName()
  // From the first-run setup; stays on the phone.
  const setup = getSetup().stride
  const goal = FITNESS_GOALS.find((g) => g.id === setup?.goal)
  const access = state.flows.stride_health_access
  const accessAnswered = state.settled.includes('stride_health_access')
  const flow = STRIDE_FLOWS.getFlow('stride_health_access')
  const streak = STRIDE_FLOWS.getFlow('stride_streak_autosync')
  // The streak prompt follows a successful connect, once the sync has finished.
  const askStreak =
    accessAnswered &&
    busy === null &&
    STRIDE_FLOWS.isApplicable('stride_streak_autosync', state.flows) &&
    !state.settled.includes('stride_streak_autosync')

  const onAccessChosen = (value: string) => {
    if (value !== 'dont_allow') settleFlow('stride_health_detail')
    setAsking(false)
    // Same wait whatever the answer, so neither choice feels faster.
    run('syncingHealth', () => {})
  }

  let health
  if (busy === 'syncingHealth') health = <LoadingBlock label="Syncing your health data…" />
  else if (!accessAnswered)
    health = (
      <div className="card card-tint">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="icon-circle icon-circle-white">
            <PulseIcon />
          </span>
          <div style={{ flex: 1 }}>
            <div className="strong">Connect your health data</div>
            <div className="muted">See your heart rate, sleep and activity in one place.</div>
          </div>
        </div>
        <button type="button" className="btn btn-green" onClick={() => setAsking(true)}>
          Connect
        </button>
      </div>
    )
  else if (access === 'dont_allow')
    health = <p className="notice">Health data is off. Your stats will appear here if you turn it on in Profile.</p>
  else
    health = (
      <div className="card">
        <div className="eyebrow-small">Today</div>
        <div className="stat-grid">
          <div>
            <div className="stat-value">{TODAY_STATS.steps}</div>
            <div className="muted small">steps</div>
          </div>
          <div>
            <div className="stat-value">{TODAY_STATS.sleep}</div>
            <div className="muted small">sleep</div>
          </div>
          <div>
            <div className="stat-value">{TODAY_STATS.restingHeartRate}</div>
            <div className="muted small">resting bpm</div>
          </div>
        </div>
        {state.flows.stride_health_detail === 'summary' && <p className="muted small">Showing daily summaries only.</p>}
        <div className="streak-chip small">
          <FlameIcon /> 3-day streak
          {state.flows.stride_streak_autosync === 'keep_streak' && <span className="muted"> · counting steps in the background</span>}
        </div>
      </div>
    )

  return (
    <section className="screen">
      <h1 className="screen-title">{name ? `${greeting()}, ${name}` : 'Today'}</h1>
      {goal && (
        <p className="muted small">
          Your goal: {goal.label}
          {setup?.activeDays ? ` · active ${setup.activeDays} days a week` : ''}
        </p>
      )}
      {health}

      <div className="card row">
        <span className="icon-circle">
          <MoonIcon />
        </span>
        <div style={{ flex: 1 }}>
          <div className="strong">Premium sleep report</div>
          <div className="muted small">Unlock it with coins in Rewards.</div>
        </div>
      </div>

      {asking && !accessAnswered && (
        <Sheet icon={<PulseIcon />} title={flow.title} description={flow.description}>
          <FlowChoice flowId="stride_health_detail" />
          <FlowChoice flowId="stride_health_access" onChosen={onAccessChosen} />
        </Sheet>
      )}

      {askStreak && (
        <Sheet icon={<FlameIcon />} title={streak.title} description={streak.description}>
          <FlowChoice flowId="stride_streak_autosync" />
        </Sheet>
      )}
    </section>
  )
}
