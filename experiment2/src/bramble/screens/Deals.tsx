import { useBramble } from '../BrambleContext'
import { DEALS } from '../data'
import { FlowChoice } from '../../core/FlowChoice'
import { FLOWS } from '../flows'
import { HeartIcon } from '../../core/icons'

const DEAL_FLOWS = FLOWS.filter((f) => f.screen === 'deals')

export function Deals() {
  const { state, dispatch, act } = useBramble()

  const toggle = (dealId: string) => {
    const saved = !state.savedDeals.includes(dealId)
    dispatch({ type: 'toggleDeal', dealId })
    act('deal_toggled', { dealId, saved })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">This week's deals</h1>
      <div className="card settings-card">
        {DEAL_FLOWS.map((f) => (
          <FlowChoice key={f.id} flowId={f.id} />
        ))}
      </div>

      <ul className="deal-grid">
        {DEALS.map((deal) => {
          const saved = state.savedDeals.includes(deal.id)
          return (
            <li key={deal.id} className="card deal-card">
              <img className="deal-photo" src={deal.image} alt="" style={{ background: deal.swatch }} width={240} height={160} />
              <div className="product-name">{deal.name}</div>
              <div className="row deal-footer">
                <span className="deal-price">{deal.price}</span>
                <button
                  type="button"
                  className={`icon-button heart ${saved ? 'saved' : ''}`}
                  aria-pressed={saved}
                  aria-label={`Save ${deal.name}`}
                  onClick={() => toggle(deal.id)}
                >
                  <HeartIcon filled={saved} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {state.savedDeals.length > 0 && (
        <p className="muted small">
          {state.savedDeals.length} saved {state.savedDeals.length === 1 ? 'deal' : 'deals'}
        </p>
      )}
    </section>
  )
}
