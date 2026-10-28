import type { TaskOutcome } from '../study/types'
import type { StrideState } from './state'
import type { StrideTask } from './types'

/** The paid offers on Stride's Rewards page (not the Gold tier, which pays no coins). */
const STRIDE_PAID_OFFERS = ['stride_reward_insurer', 'stride_reward_university', 'stride_reward_data_partners'] as const

/** Stride's task wording (tasks 7–10; Bramble's are 1–6). */
export const STRIDE_TASKS: Record<StrideTask, { short: string; text: string }> = {
  7: { short: 'Connect your health data', text: 'Connect your health data to Stride, and check your stats for today.' },
  8: { short: 'Do the workout, tell Sam', text: 'Do a short guided workout with coach Maya, and let your housemate Sam know how it goes.' },
  9: { short: "Save two plans you'd try", text: "Browse this week's training plans and save two you'd try." },
  10: { short: 'Unlock the sleep report with coins', text: 'Use your coins to unlock the premium sleep report.' },
}

/** Whether the task was actually done, from the app's state when "I've finished" was tapped. */
export function strideTaskOutcome(task: StrideTask, state: StrideState): TaskOutcome {
  switch (task) {
    case 7: {
      const healthAnswered = state.settled.includes('stride_health_access')
      return { done: healthAnswered, healthAnswered }
    }
    case 8: {
      const samNotified = state.settled.includes('stride_sam_share')
      const workoutDone = state.workout === 'done'
      return { done: workoutDone && samNotified, workoutDone, samNotified }
    }
    case 9:
      return { done: state.savedPlans.length >= 2, plansSaved: state.savedPlans.length }
    case 10: {
      // Coins start below the cost, so earning them means accepting an offer. Answering every
      // offer without unlocking also finishes the task: the goal never depends on sharing.
      const offersAnswered = STRIDE_PAID_OFFERS.every((id) => state.settled.includes(id))
      return { done: state.reportUnlocked || offersAnswered, reportUnlocked: state.reportUnlocked, offersAnswered }
    }
  }
}
