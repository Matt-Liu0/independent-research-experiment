import { useState } from 'react'
import { useEngine } from './engine'
import { FlowChoice } from './FlowChoice'
import type { FlowDef } from './flowTypes'
import { Spinner } from './Loading'
import { useBusy } from './useBusy'

/**
 * Paid offers (Rewards): accepting pays points, and the answer can be changed afterwards,
 * with points following the answer. Same in both levels and both apps.
 */
export function OfferList({ offers, unit }: { offers: readonly FlowDef[]; unit: string }) {
  const { state } = useEngine()
  const [busy, run] = useBusy()
  // Offers being changed after their first answer.
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <>
      {offers.map((offer) => {
        const settled = state.settled.includes(offer.id)
        const value = state.flows[offer.id]
        return (
          <div key={offer.id} className="card offer-card">
            <div className="row">
              <div className="strong" style={{ flex: 1 }}>
                {offer.title}
              </div>
              <span className="points-pill">
                +{offer.points} {unit}
              </span>
            </div>
            <p className="muted offer-description">{offer.description}</p>
            {busy === offer.id ? (
              <p className="small muted offer-result">
                <Spinner label="Saving…" />
              </p>
            ) : settled && value !== null && editing !== offer.id ? (
              <div className="row offer-result">
                <span className="small strong" style={{ flex: 1 }}>
                  {value === offer.options[0] ? `${offer.account.labels[value]} · +${offer.points} ${unit}` : 'You said no thanks'}
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
    </>
  )
}
