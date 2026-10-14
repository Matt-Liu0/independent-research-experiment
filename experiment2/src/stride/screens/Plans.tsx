import { FlowChoice } from '../../core/FlowChoice'
import { HeartIcon } from '../../core/icons'
import { PLANS } from '../data'
import { STRIDE_FLOW_LIST } from '../flows'
import { useStride } from '../StrideContext'

const PLAN_FLOWS = STRIDE_FLOW_LIST.filter((f) => f.screen === 'plans')

export function Plans() {
  const { state, dispatch, act } = useStride()

  const toggle = (planId: string) => {
    const saved = !state.savedPlans.includes(planId)
    dispatch({ type: 'togglePlan', planId })
    act('plan_toggled', { planId, saved })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">This week's plans</h1>
      <div className="card settings-card">
        {PLAN_FLOWS.map((f) => (
          <FlowChoice key={f.id} flowId={f.id} />
        ))}
      </div>

      <ul className="plan-list">
        {PLANS.map((plan) => {
          const saved = state.savedPlans.includes(plan.id)
          return (
            <li key={plan.id} className="card plan-card row">
              <img className="plan-photo" src={plan.image} alt="" style={{ background: plan.swatch }} width={64} height={64} />
              <div style={{ flex: 1 }}>
                <div className="product-name">{plan.name}</div>
                <div className="muted small">{plan.detail}</div>
              </div>
              <button
                type="button"
                className={`icon-button heart ${saved ? 'saved' : ''}`}
                aria-pressed={saved}
                aria-label={`Save ${plan.name}`}
                onClick={() => toggle(plan.id)}
              >
                <HeartIcon filled={saved} />
              </button>
            </li>
          )
        })}
      </ul>
      {state.savedPlans.length > 0 && (
        <p className="muted small">
          {state.savedPlans.length} saved {state.savedPlans.length === 1 ? 'plan' : 'plans'}
        </p>
      )}
    </section>
  )
}
