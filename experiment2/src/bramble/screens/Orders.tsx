import { useEffect } from 'react'
import { displayAddress } from '../appState'
import { useBramble } from '../BrambleContext'
import { FlowChoice } from '../FlowChoice'
import { getFlow, isApplicable } from '../flows'
import { CheckIcon, ChatIcon, ClockIcon, PeopleIcon, PinIcon } from '../icons'
import { Sheet } from '../Sheet'

const STEPS = ['Placed', 'Packed', 'On the way', 'Delivered']

/** Seconds between both order prompts being answered and the order arriving. */
const DELIVERY_DELAY_MS = 1500

export function Orders() {
  const { state, dispatch, navigate, act } = useBramble()
  const bgSettled = state.settled.includes('bg_during_order')
  const samSettled = state.settled.includes('sam_share')

  useEffect(() => {
    if (state.order !== 'on_the_way' || !bgSettled || !samSettled) return
    const timer = setTimeout(() => {
      dispatch({ type: 'deliver' })
      act('order_delivered')
    }, DELIVERY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.order, bgSettled, samSettled, dispatch, act])

  if (state.order === 'none') {
    return (
      <section className="screen">
        <h1 className="screen-title">Orders</h1>
        <p className="notice">You don't have any orders yet.</p>
        <button type="button" className="btn btn-outline" onClick={() => navigate('shop')}>
          Start shopping
        </button>
      </section>
    )
  }

  if (state.order === 'delivered') {
    const askBetween = isApplicable('bg_between_orders', state.flows) && !state.settled.includes('bg_between_orders')
    const between = getFlow('bg_between_orders')
    return (
      <section className="screen">
        <div className="order-number muted">Order #4821</div>
        <div className="delivered">
          <span className="delivered-check">
            <CheckIcon />
          </span>
          <h1 className="screen-title">Delivered at 5:44 PM</h1>
          <p className="muted">Left at the front door of {displayAddress(state.address)}.</p>
        </div>
        <SamStatus />
        {askBetween && (
          <Sheet icon={<ClockIcon />} title={between.title} description={between.description}>
            <FlowChoice flowId="bg_between_orders" />
          </Sheet>
        )}
      </section>
    )
  }

  const bg = getFlow('bg_during_order')
  const sam = getFlow('sam_share')
  const step = 2

  return (
    <section className="screen">
      <div className="order-number muted">Order #4821</div>
      <div className="card">
        <div className="muted">On the way · arriving around</div>
        <div className="eta">5:42 PM</div>
        <div className="progress" aria-label="Order progress: on the way">
          {STEPS.map((label, i) => (
            <div key={label} className={`progress-step ${i <= step ? 'done' : ''}`}>
              <span className="progress-bar" />
              <span className={`small ${i === step ? 'strong' : 'muted'}`}>{label}</span>
            </div>
          ))}
        </div>
        <div className="courier row">
          <span className="avatar">D</span>
          <span style={{ flex: 1 }} className="strong">
            Dana is delivering your order
          </span>
          <span className="icon-circle" aria-hidden="true">
            <ChatIcon />
          </span>
        </div>
      </div>

      {bgSettled ? (
        <p className="notice small">
          {state.flows.bg_during_order === 'allow'
            ? 'Bramble is using your location in the background for this order.'
            : 'Bramble will only use your location while you have the app open.'}
        </p>
      ) : (
        <div className="card card-tint">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="icon-circle icon-circle-white">
              <PinIcon />
            </span>
            <div>
              <div className="strong">{bg.title}</div>
              <div className="muted">{bg.description}</div>
            </div>
          </div>
          <FlowChoice flowId="bg_during_order" layout="row" />
        </div>
      )}

      {samSettled ? (
        <SamStatus />
      ) : (
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span className="icon-circle">
              <PeopleIcon />
            </span>
            <div>
              <div className="strong">{sam.title}</div>
              <div className="muted">{sam.description}</div>
            </div>
          </div>
          <FlowChoice flowId="sam_share" />
        </div>
      )}
    </section>
  )
}

function SamStatus() {
  const { state } = useBramble()
  const value = state.flows.sam_share
  if (value === null) return null
  return (
    <p className="notice small">
      {value === 'live_location'
        ? 'Sam can see your live location until your order arrives.'
        : 'Sam will get a message with your arrival time.'}
    </p>
  )
}
