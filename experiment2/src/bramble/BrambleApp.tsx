import { useEffect, useState, type ReactNode } from 'react'
import './bramble.css'
import { useBramble } from './BrambleContext'
import { visibleMs } from '../log/clock'
import { ScreenSkeleton } from './Loading'
import { nextOrderStep } from './orderTimeline'
import { BagIcon, CartIcon, GiftIcon, ReceiptIcon, TagIcon, UserIcon } from './icons'
import { Account } from './screens/Account'
import { Checkout } from './screens/Checkout'
import { Deals } from './screens/Deals'
import { FindStore } from './screens/FindStore'
import { Orders } from './screens/Orders'
import { Rewards } from './screens/Rewards'
import { Shop } from './screens/Shop'
import { delayFor, screenLoadingKey } from './timing'
import type { ScreenId } from './types'

const SCREENS: Record<ScreenId, () => ReactNode> = {
  shop: Shop,
  find_store: FindStore,
  checkout: Checkout,
  orders: Orders,
  deals: Deals,
  rewards: Rewards,
  account: Account,
}

const TABS: { screen: ScreenId; label: string; icon: ReactNode; covers: ScreenId[] }[] = [
  { screen: 'shop', label: 'Shop', icon: <BagIcon />, covers: ['shop', 'find_store', 'checkout'] },
  { screen: 'deals', label: 'Deals', icon: <TagIcon />, covers: ['deals'] },
  { screen: 'rewards', label: 'Rewards', icon: <GiftIcon />, covers: ['rewards'] },
  { screen: 'orders', label: 'Orders', icon: <ReceiptIcon />, covers: ['orders'] },
  { screen: 'account', label: 'Account', icon: <UserIcon />, covers: ['account'] },
]

/** The practice grocery app: header, current screen and tab bar. */
export function BrambleApp() {
  const { state, navigate } = useBramble()
  const Screen = SCREENS[state.screen]
  useOrderTimeline()
  // The screen that has finished "loading". The first screen shows straight away (the task splash covers it).
  const [loaded, setLoaded] = useState<ScreenId>(state.screen)
  const loadingMs = delayFor(screenLoadingKey(state.screen))
  const loading = loaded !== state.screen && loadingMs > 0

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoaded(state.screen), loadingMs)
    return () => clearTimeout(timer)
  }, [loading, loadingMs, state.screen])

  const orderInProgress = state.order !== 'none' && state.order !== 'delivered'

  return (
    <div className="bramble">
      <header className="app-header">
        <span className="logo">bramble</span>
        <button type="button" className="icon-button cart-button" aria-label={`Cart, ${state.cart.length} items`} onClick={() => navigate('checkout')}>
          <CartIcon />
          {state.cart.length > 0 && <span className="cart-count">{state.cart.length}</span>}
        </button>
      </header>
      <main className="app-content">
        {/* Prompts live inside screens, so none can appear (or start timing) while loading. */}
        {loading ? <ScreenSkeleton /> : <Screen key={state.screen} />}
      </main>
      <nav className="tab-bar" aria-label="Bramble">
        {TABS.map((tab) => {
          const active = tab.covers.includes(state.screen)
          return (
            <button
              key={tab.screen}
              type="button"
              className={`tab ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.screen)}
            >
              {tab.icon}
              {tab.screen === 'orders' && orderInProgress && !active && <span className="tab-badge" aria-hidden="true" />}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * Moves the order along while the app is open: adds visible time every tick, and steps
 * Placed → Packed → On the way → Delivered when due. Pauses while the app is hidden or closed
 * (e.g. during ease ratings), and resumes from saved state after a reload.
 */
function useOrderTimeline() {
  const { state, dispatch, act } = useBramble()
  const running = state.orderTrackingStarted && state.order !== 'none' && state.order !== 'delivered'

  useEffect(() => {
    const tick = delayFor('orderTick')
    if (!running || tick <= 0) return
    let last = visibleMs()
    const id = setInterval(() => {
      const now = visibleMs()
      dispatch({ type: 'orderTick', ms: now - last })
      last = now
    }, tick)
    return () => clearInterval(id)
  }, [running, dispatch])

  const step = nextOrderStep(state)
  useEffect(() => {
    if (!step) return
    dispatch({ type: 'orderStep', step })
    act('order_status', { step })
  }, [step, dispatch, act])
}
