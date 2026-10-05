import { useState } from 'react'
import { displayAddress } from '../appState'
import { useBramble } from '../BrambleContext'
import { DELIVERY_FEE, findProduct, findStore } from '../data'
import { FlowChoice } from '../FlowChoice'
import { FLOWS, levelOf } from '../flows'
import { Spinner } from '../Loading'
import { ScreenHeader } from '../ScreenHeader'
import { deliveryWindow } from '../orderTimeline'
import { useBusy } from '../useBusy'

const CHECKOUT_FLOWS = FLOWS.filter((f) => f.screen === 'checkout')

export function Checkout() {
  const { state, friction, dispatch, navigate, showFlow, settleFlow, act } = useBramble()
  const [busy, run] = useBusy()
  // The delivery window is worked out once, when checkout opens.
  const [openedAt] = useState(() => Date.now())
  const store = findStore(state.storeId)
  const items = state.cart.map((id) => findProduct(id)).filter((p) => p !== undefined)
  const subtotal = items.reduce((sum, p) => sum + p.price, 0)
  const delivery = state.deliveryRedeemed ? 0 : DELIVERY_FEE
  const missingChoice = CHECKOUT_FLOWS.some((f) => levelOf(f, friction).required && state.flows[f.id] === null)

  const placeOrder = () => {
    // The choices are fixed at the tap; the spinner comes after, so it doesn't count as decision time.
    for (const flow of CHECKOUT_FLOWS) {
      // Both controls sit above the button, so placing the order means they were seen.
      showFlow(flow.id)
      settleFlow(flow.id)
    }
    const items = state.cart
    const freeDelivery = state.deliveryRedeemed
    run('placeOrder', () => {
      act('order_placed', { items, freeDelivery })
      dispatch({ type: 'placeOrder', at: Date.now() })
    })
  }

  const header = <ScreenHeader title="Checkout" />

  if (state.order !== 'none') {
    return (
      <section className="screen">
        {header}
        <p className="notice">Order placed! You can follow it in Orders.</p>
        <button type="button" className="btn btn-green" onClick={() => navigate('orders')}>
          Track your order
        </button>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className="screen">
        {header}
        <p className="notice">Your cart is empty.</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate('shop')}>
          Back to shopping
        </button>
      </section>
    )
  }

  return (
    <section className="screen">
      {header}

      <div className="card">
        <div className="eyebrow-small">Deliver to</div>
        <div className="strong">{displayAddress(state.address)}</div>
        <div className="muted small">{deliveryWindow(openedAt)}</div>
        {store ? (
          <div className="muted small">From {store.name}</div>
        ) : (
          <div className="stack" style={{ marginTop: 8 }}>
            <p className="notice notice-warn small">Choose a store before you order.</p>
            <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('find_store')}>
              Find a store
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="eyebrow-small">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </div>
        {items.map((p) => (
          <div key={p.id} className="line-item">
            <span>{p.name}</span>
            <span>${p.price.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="eyebrow-small">Courier hand-off</div>
        <FlowChoice flowId="courier_live" />
      </div>

      <div className="card">
        <div className="line-item muted">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="line-item muted">
          <span>Delivery fee</span>
          <span>{delivery === 0 ? 'Free (points)' : `$${delivery.toFixed(2)}`}</span>
        </div>
        <div className="line-item strong">
          <span>Total</span>
          <span>${(subtotal + delivery).toFixed(2)}</span>
        </div>
      </div>

      <FlowChoice flowId="checkout_partner_offers" />

      <button type="button" className="btn btn-green" disabled={!store || missingChoice || busy !== null} onClick={placeOrder}>
        {busy ? <Spinner label="Placing order…" /> : `Place order · $${(subtotal + delivery).toFixed(2)}`}
      </button>
    </section>
  )
}
