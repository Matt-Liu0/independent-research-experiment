import { logEvent } from '../../log/logEvent'
import { bonusDollars } from '../appState'
import { useBramble } from '../BrambleContext'
import { REDEEM_COST } from '../data'
import { FlowChoice } from '../FlowChoice'
import { FLOWS } from '../flows'

const OFFERS = FLOWS.filter((f) => f.screen === 'rewards')

export function Rewards() {
  const { state, dispatch, act } = useBramble()
  const canRedeem = !state.deliveryRedeemed && state.points >= REDEEM_COST

  const redeem = () => {
    logEvent('points', { reason: 'redeem_delivery', amount: -REDEEM_COST, pointsBefore: state.points })
    act('delivery_redeemed')
    dispatch({ type: 'redeem' })
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
          {state.deliveryRedeemed ? 'Redeemed' : 'Redeem'}
        </button>
      </div>

      <h2 className="section-title">Offers</h2>
      {OFFERS.map((offer) => {
        const settled = state.settled.includes(offer.id)
        const value = state.flows[offer.id]
        return (
          <div key={offer.id} className="card offer-card">
            <div className="row">
              <div className="strong" style={{ flex: 1 }}>
                {offer.title}
              </div>
              <span className="points-pill">+{offer.points} pts</span>
            </div>
            <p className="muted offer-description">{offer.description}</p>
            {settled && value !== null ? (
              <p className="small strong offer-result">{offer.account.labels[value]}</p>
            ) : (
              <FlowChoice flowId={offer.id} layout="row" tone="berry" />
            )}
          </div>
        )
      })}
    </section>
  )
}
