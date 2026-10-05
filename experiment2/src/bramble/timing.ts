import type { ScreenId } from './types'

/**
 * Every delay in the practice app, in ms. Fixed (not random) and identical in both friction
 * levels, so they add no noise between participants. Loading never sits between a prompt
 * appearing and the participant answering it.
 */
export const TIMING = {
  /** Bramble logo when a task starts. */
  splash: 700,
  /** Placeholder shapes when switching to a screen with little data. */
  tabSkeleton: 250,
  /** Placeholder shapes when switching to a screen that "fetches" data. */
  dataSkeleton: 400,
  /** After answering the location prompt (whatever the answer). */
  findingStores: 500,
  zipSearch: 500,
  setStore: 300,
  placeOrder: 1000,
  redeem: 500,
  /** After accepting or declining a Rewards offer. */
  offerSave: 300,
  saveAddress: 400,
  /** Order timeline, in visible ms since tracking started. */
  orderPacked: 8000,
  orderOnTheWay: 15000,
  /** Minimum visible ms on the way before delivery (delivery also waits for both order prompts). */
  orderMinOnTheWay: 15000,
  /** How often the order timeline updates. */
  orderTick: 500,
} as const

export type TimingKey = keyof typeof TIMING

let scale = 1

export function delayFor(key: TimingKey): number {
  return Math.round(TIMING[key] * scale)
}

/** Tests set this to 0, which makes every delay happen immediately and synchronously. */
export function setTimingScale(next: number): void {
  scale = next
}

const DATA_SCREENS: ScreenId[] = ['find_store', 'deals', 'rewards', 'orders']

export function screenLoadingKey(screen: ScreenId): TimingKey {
  return DATA_SCREENS.includes(screen) ? 'dataSkeleton' : 'tabSkeleton'
}
