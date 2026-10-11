import { Spinner } from '../../core/Loading'
import { OfferList } from '../../core/Offers'
import { useBusy } from '../../core/useBusy'
import { logEvent } from '../../log/logEvent'
import { bonusDollars } from '../../core/bonus'
import { REPORT_COST } from '../data'
import { STRIDE_FLOW_LIST } from '../flows'
import { useStride } from '../StrideContext'

const OFFERS = STRIDE_FLOW_LIST.filter((f) => f.screen === 'rewards')

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

      <h2 className="section-title">Offers</h2>
      <OfferList offers={OFFERS} unit="coins" />
    </section>
  )
}
