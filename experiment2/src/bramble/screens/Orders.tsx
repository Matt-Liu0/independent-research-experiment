import { useEffect } from 'react'
import { displayAddress, type AppState } from '../appState'
import { useBramble } from '../BrambleContext'
import { FlowChoice } from '../../core/FlowChoice'
import { getFlow, isApplicable } from '../flows'
import { CheckIcon, ClockIcon, PeopleIcon, PinIcon } from '../../core/icons'
import { arrivalTime, courierProgress, minutesAway } from '../orderTimeline'
import { Sheet } from '../../core/Sheet'

const STEPS: { status: AppState['order']; label: string }[] = [
  { status: 'placed', label: 'Placed' },
  { status: 'packed', label: 'Packed' },
  { status: 'on_the_way', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
]

const STATUS_TEXT: Partial<Record<AppState['order'], string>> = {
  placed: "We've got your order.",
  packed: 'Your groceries are packed and waiting for a courier.',
  on_the_way: 'Dana picked up your order.',
}

export function Orders() {
  const { state, dispatch, navigate } = useBramble()

  // Opening Orders starts tracking, so the timeline runs in the task about tracking (Task 3).
  useEffect(() => {
    if (state.order !== 'none' && !state.orderTrackingStarted) dispatch({ type: 'startTracking' })
  }, [state.order, state.orderTrackingStarted, dispatch])

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

  if (state.order === 'delivered') return <Delivered />

  const eta = arrivalTime(state)
  const step = STEPS.findIndex((s) => s.status === state.order)
  const onTheWay = state.order === 'on_the_way'
  const bgSettled = state.settled.includes('bg_during_order')
  const samSettled = state.settled.includes('sam_share')
  const live = state.flows.bg_during_order === 'allow'

  return (
    <section className="screen">
      <div className="order-number muted">Order #4821</div>
      <div className="card">
        <div className="muted">
          {onTheWay ? `On the way · about ${minutesAway(state)} min away` : 'Arriving around'}
        </div>
        <div className="eta">{eta}</div>
        <div className="progress" aria-label={`Order progress: ${STEPS[step].label}`}>
          {STEPS.map((s, i) => (
            <div key={s.status} className={`progress-step ${i <= step ? 'done' : ''} ${i === step ? 'current' : ''}`}>
              <span className="progress-bar" />
              <span className={`small ${i === step ? 'strong' : 'muted'}`}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="order-status" role="status">
          {STATUS_TEXT[state.order]}
        </p>
        {/* Same in both levels, and says nothing about the questions that appear on the way. */}
        <p className="muted small order-guide">Keep this page open to follow your order as it's packed and delivered.</p>
        {onTheWay && <CourierMap progress={courierProgress(state)} live={live} />}
        {onTheWay && (
          <div className="courier row">
            <span className="avatar">D</span>
            <span style={{ flex: 1 }} className="strong">
              Dana is delivering your order
            </span>
            <span className="small muted">{live ? 'Live ETA' : 'Estimated arrival'}</span>
          </div>
        )}
      </div>

      {/* The two order prompts appear once the order is on its way, where they make sense. */}
      {onTheWay && !bgSettled && <BackgroundPrompt />}
      {onTheWay && !samSettled && <SamPrompt />}
      {onTheWay && bgSettled && (
        <p className="notice small">
          {live
            ? 'Bramble is using your location in the background for this order.'
            : 'Bramble will only use your location while you have the app open.'}
        </p>
      )}
      {samSettled && <SamStatus />}
      {onTheWay && bgSettled && samSettled && <p className="muted small">Arriving soon…</p>}
    </section>
  )
}

function BackgroundPrompt() {
  const bg = getFlow('bg_during_order')
  return (
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
  )
}

function SamPrompt() {
  const sam = getFlow('sam_share')
  return (
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
  )
}

function SamStatus() {
  const { state } = useBramble()
  const value = state.flows.sam_share
  if (value === null) return null
  if (value === 'live_location') {
    const sharing = state.order !== 'delivered'
    return (
      <p className="notice small row">
        {sharing && <span className="live-dot" aria-hidden="true" />}
        {sharing ? 'Sam can see your location until your order arrives.' : 'Sam could see your location until your order arrived.'}
      </p>
    )
  }
  return (
    <div className="message-preview small">
      <div className="muted">Sent to Sam</div>
      <div>Groceries arrive around {arrivalTime(state)}.</div>
    </div>
  )
}

/** Store → home route as straight segments, so the courier's position is easy to compute. */
const ROUTE: [number, number][] = [
  [30, 120],
  [95, 120],
  [110, 60],
  [175, 40],
  [235, 40],
  [262, 72],
  [300, 50],
]

/** Point at a fraction (0–1) of the route's length. */
export function pointOnRoute(fraction: number): [number, number] {
  const lengths = ROUTE.slice(1).map(([x, y], i) => Math.hypot(x - ROUTE[i][0], y - ROUTE[i][1]))
  let remaining = Math.min(1, Math.max(0, fraction)) * lengths.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] === 0 ? 0 : remaining / lengths[i]
      const [[x1, y1], [x2, y2]] = [ROUTE[i], ROUTE[i + 1]]
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]
    }
    remaining -= lengths[i]
  }
  return ROUTE[ROUTE.length - 1]
}

/** Route from the store to home, with the courier moving along it. */
function CourierMap({ progress, live }: { progress: number; live: boolean }) {
  // Without background location, the position only updates in jumps, as real apps do.
  const shown = live ? progress : Math.floor(progress * 4) / 4
  const [x, y] = pointOnRoute(shown)
  const points = ROUTE.map(([px, py]) => `${px},${py}`).join(' ')
  return (
    <svg className="courier-map" viewBox="0 0 330 150" role="img" aria-label="Map of the courier's route">
      <rect width="330" height="150" rx="14" fill="#dfe7df" />
      <path d="M0 95 H330 M110 0 V150 M230 0 V150" stroke="#fff" strokeWidth="9" />
      <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx="30" cy="120" r="7" fill="var(--ink)" />
      <g transform="translate(300 50)">
        <circle r="11" fill="var(--berry)" />
        <path d="M-5 1 L0 -4 L5 1 V5 H-5 Z" fill="#fff" />
      </g>
      <g className={`courier-dot ${live ? 'smooth' : ''}`} style={{ transform: `translate(${x}px, ${y}px)` }} data-testid="courier">
        <circle r="9" fill="var(--green)" stroke="#fff" strokeWidth="3" />
      </g>
    </svg>
  )
}

function Delivered() {
  const { state } = useBramble()
  const askBetween = isApplicable('bg_between_orders', state.flows) && !state.settled.includes('bg_between_orders')
  const between = getFlow('bg_between_orders')
  return (
    <section className="screen">
      <div className="order-number muted">Order #4821</div>
      <div className="delivered">
        <span className="delivered-check">
          <CheckIcon />
        </span>
        <h1 className="screen-title">Delivered at {arrivalTime(state)}</h1>
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
