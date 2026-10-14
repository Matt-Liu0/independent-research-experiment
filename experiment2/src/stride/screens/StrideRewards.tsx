import { FlowChoice } from '../../core/FlowChoice'
import { MedalIcon } from '../../core/icons'
import { Spinner } from '../../core/Loading'
import { OfferList } from '../../core/Offers'
import { useBusy } from '../../core/useBusy'
import { logEvent } from '../../log/logEvent'
import { bonusDollars } from '../../core/bonus'
import { REPORT_COST } from '../data'
import { STRIDE_FLOW_LIST, STRIDE_FLOWS } from '../flows'
import { useStride } from '../StrideContext'

// The paid offers; the Gold tier (also on this screen) pays nothing and is drawn separately.
const OFFERS = STRIDE_FLOW_LIST.filter((f) => f.screen === 'rewards' && f.points !== undefined)

export function StrideRewards() {
  const { state, dispatch, act } = useStride()
  const [busy, run] = useBusy()
  const canUnlock = !state.reportUnlocked && state.points >= REPORT_COST && busy === null

  const unlock = () => {
    run('unlockReport', () => {
      logEvent('points', { reason: 'unlock_report', amount: -REPORT_COST, pointsBefore: state.points })
      act('report_unlocked')
      dispatch({ type: 'unlockReport' })
    })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Rewards</h1>

      <div className="balance-card">
        <div>
          <div className="small strong">Your balance</div>
          <div className="balance">{state.points} coins</div>
        </div>
        <div className="small balance-worth">
          Worth ${bonusDollars(state.points).toFixed(2)}
          <br />
          bonus
        </div>
      </div>

      <div className="card row">
        <div style={{ flex: 1 }}>
          <div className="strong">Premium sleep report</div>
          <div className="muted small">{REPORT_COST} coins</div>
        </div>
        <button type="button" className="btn btn-green btn-auto" disabled={!canUnlock} onClick={unlock}>
          {busy === 'unlockReport' ? <Spinner /> : state.reportUnlocked ? 'Unlocked' : 'Unlock'}
        </button>
      </div>

      <GoldTier />

      <h2 className="section-title">Offers</h2>
      <OfferList offers={OFFERS} unit="coins" />
    </section>
  )
}

/** Status-tier progress (Silver → Gold). Status points are separate from coins and pay no bonus. */
function GoldTier() {
  const { state } = useStride()
  const gold = STRIDE_FLOWS.getFlow('stride_gold_tier')
  const reached = state.flows.stride_gold_tier === 'reach_gold'
  const answered = state.settled.includes('stride_gold_tier')
  return (
    <div className="card tier-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="icon-circle">
          <MedalIcon />
        </span>
        <div style={{ flex: 1 }}>
          <div className="eyebrow-small">{reached ? 'Gold member' : 'Silver member'}</div>
          <div className="strong">{reached ? 'You reached Gold' : gold.title}</div>
          {!reached && <div className="muted small">{gold.description}</div>}
        </div>
      </div>
      <div className="tier-bar" aria-label={reached ? 'Status: Gold' : 'Status: 160 of 200 points to Gold'}>
        <span style={{ width: reached ? '100%' : '80%' }} />
      </div>
      {!answered && <FlowChoice flowId="stride_gold_tier" layout="row" />}
    </div>
  )
}
