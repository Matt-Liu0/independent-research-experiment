import { coreReducer, isCoreAction, type CoreAction, type CoreState } from '../core/engine'
import { MOVE_ADDRESS, PRACTICE_ADDRESS, REDEEM_COST, START_POINTS } from './data'
import { BRAMBLE_FLOWS, emptyFlowValues } from './flows'
import type { FlowId, ScreenId } from './types'

export type OrderStatus = 'none' | 'placed' | 'packed' | 'on_the_way' | 'delivered'

/** Everything the practice app remembers. Saved to the participant record after each change. */
export interface AppState extends CoreState<FlowId, ScreenId> {
  storeId: string | null
  cart: string[]
  order: OrderStatus
  orderItems: string[]
  /** Phone clock (epoch ms) when the order was placed; delivery times are shown from it. */
  orderPlacedAt: number | null
  /** Tracking starts the first time Orders is opened after ordering (normally in Task 3). */
  orderTrackingStarted: boolean
  /** Visible ms of tracking so far. Drives Placed → Packed → On the way. */
  orderElapsedMs: number
  /** orderElapsedMs when the order went On the way. */
  orderOnTheWayAtMs: number | null
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
    orderPlacedAt: null,
    orderTrackingStarted: false,
    orderElapsedMs: 0,
    orderOnTheWayAtMs: null,
    deliveryRedeemed: false,
    address: PRACTICE_ADDRESS,
    savedDeals: [],
    storeSearch: { usedZipSearch: false, storesViewed: 0, firstVisitMs: null, msToFind: null },
    accountPageVisits: 0,
    accountPageMs: 0,
  }
}

/** Bramble's own actions; the engine's (navigate, show, set, …) are in CoreAction. */
export type BrambleAction =
  | { type: 'visitFindStore'; atMs: number }
  | { type: 'zipSearch'; storesViewed: number }
  | { type: 'viewStores'; storesViewed: number }
  | { type: 'setStore'; storeId: string; atMs: number }
  | { type: 'addToCart'; productId: string }
  | { type: 'removeFromCart'; productId: string }
  | { type: 'placeOrder'; at: number }
  | { type: 'startTracking' }
  | { type: 'orderTick'; ms: number }
  | { type: 'orderStep'; step: 'packed' | 'on_the_way' | 'delivered' }
  | { type: 'toggleDeal'; dealId: string }
  | { type: 'redeem' }
  | { type: 'saveAddress'; address: string }

export type AppAction = BrambleAction | CoreAction<FlowId, ScreenId>

export const ORDER_STEPS: OrderStatus[] = ['none', 'placed', 'packed', 'on_the_way', 'delivered']

const addOnce = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list : [...list, item])

export function appReducer(state: AppState, action: AppAction): AppState {
  if (isCoreAction<FlowId, ScreenId>(action)) return coreReducer(BRAMBLE_FLOWS, state, action)
  switch (action.type) {
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
      return { ...state, order: 'placed', orderItems: state.cart, cart: [], orderPlacedAt: action.at }

    case 'startTracking':
      return state.order === 'none' || state.orderTrackingStarted ? state : { ...state, orderTrackingStarted: true }

    case 'orderTick':
      if (!state.orderTrackingStarted || state.order === 'none' || state.order === 'delivered') return state
      return { ...state, orderElapsedMs: state.orderElapsedMs + Math.max(0, Math.round(action.ms)) }

    case 'orderStep': {
      const order = ORDER_STEPS.indexOf(action.step) > ORDER_STEPS.indexOf(state.order) ? action.step : state.order
      if (order === state.order) return state
      const onTheWay = order === 'on_the_way' ? { orderOnTheWayAtMs: state.orderElapsedMs } : {}
      return { ...state, order, ...onTheWay }
    }

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

    case 'saveAddress': {
      const address = action.address.trim()
      return address ? { ...state, address } : state
    }
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

/** Stored in place of an address that is neither the practice address nor "40 Oak Street". */
export const OTHER_ADDRESS = 'other'

/**
 * What gets saved to the participant record. Participants could type a real address in Task 6,
 * so only the practice address, "40 Oak Street", or `other` is ever stored.
 */
export function storableAppState(state: AppState): AppState {
  const { address } = state
  const stored = address === PRACTICE_ADDRESS ? address : addressMatches(address) ? MOVE_ADDRESS : OTHER_ADDRESS
  return stored === address ? state : { ...state, address: stored }
}

/** Address text to show. After a reload, an `other` address can't be shown as typed. */
export function displayAddress(address: string): string {
  return address === OTHER_ADDRESS ? 'Your new address' : address
}

export { bonusDollars } from '../core/bonus'
