import { addressMatches, type AppState } from '../bramble/appState'
import { storeById } from '../bramble/area'
import type { BrambleTask } from '../bramble/types'
import { STRIDE_TASKS } from '../stride/tasks'
import type { TaskNumber } from './apps'
import type { TaskOutcome } from './types'

/** Bramble's task wording, from the protocol. */
export const BRAMBLE_TASKS: Record<BrambleTask, { short: string; text: string }> = {
  1: { short: 'Set a store with oat milk', text: 'Find a store near you that has oat milk in stock, and set it as your store.' },
  2: {
    short: 'Order, then tell Sam when it arrives',
    text: 'Order oat milk and a sourdough loaf for delivery, then let your housemate Sam know when it will arrive.',
  },
  4: { short: "Save two deals you'd buy", text: "Browse this week's deals and save two you'd buy." },
  5: { short: 'Get free delivery with points', text: 'Use your points to get free delivery on your next order.' },
  6: { short: 'Change your address', text: "You're moving: change your delivery address to 40 Oak Street and save it." },
}

/** Every task in the session (Bramble 1, 2, 4, 5, 6; Stride 7–10). */
export const TASKS: Record<TaskNumber, { short: string; text: string }> = { ...BRAMBLE_TASKS, ...STRIDE_TASKS }

/** Whether a Bramble task was actually done, from the app's state when "I've finished" was tapped. */
export function taskOutcome(task: BrambleTask, state: AppState): TaskOutcome {
  switch (task) {
    case 1: {
      const store = storeById(state.storeId)
      return {
        done: store?.hasOatMilk === true,
        storeId: state.storeId,
        usedZipSearch: state.storeSearch.usedZipSearch,
        storesViewed: state.storeSearch.storesViewed,
        msToFind: state.storeSearch.msToFind,
      }
    }
    case 2: {
      const ordered = state.order !== 'none' && state.orderItems.includes('oat_milk') && state.orderItems.includes('sourdough')
      const samNotified = state.settled.includes('sam_share')
      return { done: ordered && samNotified, ordered, samNotified }
    }
    case 4:
      return { done: state.savedDeals.length >= 2, dealsSaved: state.savedDeals.length }
    case 5:
      return { done: state.deliveryRedeemed, deliveryRedeemed: state.deliveryRedeemed }
    case 6: {
      const matches = addressMatches(state.address)
      return { done: matches, addressMatches: matches }
    }
  }
}
