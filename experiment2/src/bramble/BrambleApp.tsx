import type { ReactNode } from 'react'
import './bramble.css'
import { useBramble } from './BrambleContext'
import { BagIcon, CartIcon, GiftIcon, ReceiptIcon, TagIcon, UserIcon } from './icons'
import { Account } from './screens/Account'
import { Checkout } from './screens/Checkout'
import { Deals } from './screens/Deals'
import { FindStore } from './screens/FindStore'
import { Orders } from './screens/Orders'
import { Rewards } from './screens/Rewards'
import { Shop } from './screens/Shop'
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
        <Screen key={state.screen} />
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
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
