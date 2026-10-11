import { useState } from 'react'
import { logEvent } from '../../log/logEvent'
import { bonusDollars } from '../appState'
import { useBramble } from '../BrambleContext'
import { REDEEM_COST } from '../data'
import { FlowChoice } from '../../core/FlowChoice'
import { FLOWS } from '../flows'
import { Spinner } from '../../core/Loading'
import { useBusy } from '../../core/useBusy'

const OFFERS = FLOWS.filter((f) => f.screen === 'rewards')

export function Rewards() {
  const { state, dispatch, act } = useBramble()
  const [busy, run] = useBusy()
  // Offers being changed after their first answer.
  const [editing, setEditing] = useState<string | null>(null)
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
            {busy === offer.id ? (
              <p className="small muted offer-result">
                <Spinner label="Saving…" />
              </p>
            ) : settled && value !== null && editing !== offer.id ? (
              <div className="row offer-result">
                <span className="small strong" style={{ flex: 1 }}>
                  {value === offer.options[0] ? `${offer.account.labels[value]} · +${offer.points} pts` : 'You said no thanks'}
                </span>
                {/* Same in both levels: answers can always be changed, and points follow the answer. */}
                <button type="button" className="btn btn-link btn-small" onClick={() => setEditing(offer.id)}>
                  Change
                </button>
              </div>
            ) : (
              <FlowChoice
                flowId={offer.id}
                layout="row"
                tone="berry"
                source={settled ? 'rewards_page' : 'prompt'}
                // The choice is logged at the tap; the spinner only follows it.
                onChosen={() => {
                  setEditing(null)
                  run('offerSave', () => {}, offer.id)
                }}
              />
            )}
          </div>
        )
      })}
    </section>
  )
}
