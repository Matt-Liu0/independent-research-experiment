import { logEvent } from '../../log/logEvent'
import { bonusDollars } from '../appState'
import { useBramble } from '../BrambleContext'
import { REDEEM_COST } from '../data'
import { OfferList } from '../../core/Offers'
import { FLOWS } from '../flows'
import { Spinner } from '../../core/Loading'
import { useBusy } from '../../core/useBusy'

const OFFERS = FLOWS.filter((f) => f.screen === 'rewards')

export function Rewards() {
  const { state, dispatch, act } = useBramble()
  const [busy, run] = useBusy()
  const canRedeem = !state.deliveryRedeemed && state.points >= REDEEM_COST && busy === null

  const redeem = () => {
    run('redeem', () => {
      logEvent('points', { reason: 'redeem_delivery', amount: -REDEEM_COST, pointsBefore: state.points })
      act('delivery_redeemed')
      dispatch({ type: 'redeem' })
    })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Rewards</h1>

      <div className="balance-card">
        <div>
          <div className="small strong">Your balance</div>
          <div className="balance">{state.points} pts</div>
        </div>
        <div className="small balance-worth">
          Worth ${bonusDollars(state.points).toFixed(2)}
          <br />
          bonus
        </div>
      </div>

      <div className="card row">
        <div style={{ flex: 1 }}>
          <div className="strong">Free delivery on your next order</div>
          <div className="muted small">{REDEEM_COST} pts</div>
        </div>
        <button type="button" className="btn btn-green btn-auto" disabled={!canRedeem} onClick={redeem}>
          {busy === 'redeem' ? <Spinner /> : state.deliveryRedeemed ? 'Redeemed' : 'Redeem'}
        </button>
      </div>

      <h2 className="section-title">Offers</h2>
      <OfferList offers={OFFERS} unit="pts" />
    </section>
  )
}
