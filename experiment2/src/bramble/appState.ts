import { PRACTICE_ADDRESS, REDEEM_COST, START_POINTS } from './data'
import { dependentsOf, emptyFlowValues, isApplicable } from './flows'
import type { FlowId, FlowValues, ScreenId } from './types'

export type OrderStatus = 'none' | 'on_the_way' | 'delivered'

/** Everything the practice app remembers. Saved to the participant record after each change. */
export interface AppState {
  screen: ScreenId
  flows: FlowValues
  /** Flows whose prompt or control has appeared at least once. */
  shown: FlowId[]
  /** Flows whose first choice is fixed (see SettleOn). */
  settled: FlowId[]
  points: number
  storeId: string | null
  cart: string[]
  order: OrderStatus
  orderItems: string[]
  deliveryRedeemed: boolean
  address: string
  savedDeals: string[]
  storeSearch: {
    usedZipSearch: boolean
    storesViewed: number
    /** Visible-clock ms of the first visit to Find a store. */
    firstVisitMs: number | null
    msToFind: number | null
  }
  accountPageVisits: number
  accountPageMs: number
}

export function initialAppState(): AppState {
  return {
    screen: 'shop',
    flows: emptyFlowValues(),
    shown: [],
    settled: [],
    points: START_POINTS,
    storeId: null,
    cart: [],
    order: 'none',
    orderItems: [],
    deliveryRedeemed: false,
    address: PRACTICE_ADDRESS,
    savedDeals: [],
    storeSearch: { usedZipSearch: false, storesViewed: 0, firstVisitMs: null, msToFind: null },
    accountPageVisits: 0,
    accountPageMs: 0,
  }
}

export type AppAction =
  | { type: 'navigate'; screen: ScreenId }
  | { type: 'show'; flowId: FlowId; preset: string | null }
  | { type: 'set'; flowId: FlowId; value: string }
  | { type: 'settle'; flowId: FlowId }
  | { type: 'visitFindStore'; atMs: number }
  | { type: 'zipSearch'; storesViewed: number }
  | { type: 'viewStores'; storesViewed: number }
  | { type: 'setStore'; storeId: string; atMs: number }
  | { type: 'addToCart'; productId: string }
  | { type: 'removeFromCart'; productId: string }
  | { type: 'placeOrder' }
  | { type: 'deliver' }
  | { type: 'toggleDeal'; dealId: string }
  | { type: 'redeem' }
  | { type: 'addPoints'; amount: number }
  | { type: 'saveAddress'; address: string }
  | { type: 'accountVisit' }
  | { type: 'accountLeave'; ms: number }

const addOnce = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list : [...list, item])

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'navigate':
      return state.screen === action.screen ? state : { ...state, screen: action.screen }

    case 'show': {
      const flows =
        state.flows[action.flowId] === null && action.preset !== null && !state.shown.includes(action.flowId)
          ? { ...state.flows, [action.flowId]: action.preset }
          : state.flows
      return { ...state, flows, shown: addOnce(state.shown, action.flowId) }
    }

    case 'set': {
      const flows = { ...state.flows, [action.flowId]: action.value }
      // A dependent flow that no longer applies has no value (e.g. precise location once location is off).
      for (const dep of dependentsOf(action.flowId)) {
        if (!isApplicable(dep, flows)) flows[dep] = null
      }
      return { ...state, flows }
    }

    case 'settle':
      return { ...state, settled: addOnce(state.settled, action.flowId) }

    case 'visitFindStore':
      if (state.storeSearch.firstVisitMs !== null) return state
      return { ...state, storeSearch: { ...state.storeSearch, firstVisitMs: action.atMs } }

    case 'zipSearch':
      return {
        ...state,
        storeSearch: {
          ...state.storeSearch,
          usedZipSearch: true,
          storesViewed: Math.max(state.storeSearch.storesViewed, action.storesViewed),
        },
      }

    case 'viewStores':
      return {
        ...state,
        storeSearch: { ...state.storeSearch, storesViewed: Math.max(state.storeSearch.storesViewed, action.storesViewed) },
      }

    case 'setStore': {
      const { firstVisitMs, msToFind } = state.storeSearch
      return {
        ...state,
        storeId: action.storeId,
        storeSearch: {
          ...state.storeSearch,
          msToFind: msToFind ?? (firstVisitMs === null ? null : Math.max(0, action.atMs - firstVisitMs)),
        },
      }
    }

    case 'addToCart':
      return { ...state, cart: addOnce(state.cart, action.productId) }

    case 'removeFromCart':
      return { ...state, cart: state.cart.filter((id) => id !== action.productId) }

    case 'placeOrder':
      if (state.order !== 'none' || state.cart.length === 0 || state.storeId === null) return state
      return { ...state, order: 'on_the_way', orderItems: state.cart, cart: [] }

    case 'deliver':
      return state.order === 'on_the_way' ? { ...state, order: 'delivered' } : state

    case 'toggleDeal':
      return {
        ...state,
        savedDeals: state.savedDeals.includes(action.dealId)
          ? state.savedDeals.filter((id) => id !== action.dealId)
          : [...state.savedDeals, action.dealId],
      }

    case 'redeem':
      if (state.deliveryRedeemed || state.points < REDEEM_COST) return state
      return { ...state, points: state.points - REDEEM_COST, deliveryRedeemed: true }

    case 'addPoints':
      return { ...state, points: state.points + action.amount }

    case 'saveAddress': {
      const address = action.address.trim()
      return address ? { ...state, address } : state
    }

    case 'accountVisit':
      return { ...state, accountPageVisits: state.accountPageVisits + 1 }

    case 'accountLeave':
      return { ...state, accountPageMs: state.accountPageMs + Math.max(0, Math.round(action.ms)) }
  }
}

/** "40 Oak Street", ignoring case, spacing and punctuation; "St" also counts. */
export function addressMatches(address: string): boolean {
  const normalized = address
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return /^40 oak (street|st)$/.test(normalized)
}

/** 100 points = $0.10. */
export function bonusDollars(points: number): number {
  return Math.round(points / 10) / 100
}
