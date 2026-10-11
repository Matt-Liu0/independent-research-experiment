import type { StrideState } from './state'
import type { StrideTask } from './types'

/** Stride's task wording (tasks 7–10; Bramble's are 1–6). */
export const STRIDE_TASKS: Record<StrideTask, { short: string; text: string }> = {
  7: { short: 'Connect health data, set up sign-in', text: 'Connect your health data to Stride, and set up how you sign in.' },
  8: { short: 'Do the workout, tell Sam', text: 'Do the 10-minute guided workout with coach Maya, and let your housemate Sam know how it goes.' },
  9: { short: "Save two plans you'd try", text: "Browse this week's training plans and save two you'd try." },
  10: { short: 'Unlock the sleep report with coins', text: 'Use your coins to unlock the premium sleep report.' },
}

/** Whether the task was actually done, from the app's state when "I've finished" was tapped. */
export function strideTaskOutcome(task: StrideTask, state: StrideState) {
  switch (task) {
    case 7: {
      const healthAnswered = state.settled.includes('stride_health_access')
      const signInAnswered = state.settled.includes('stride_face_unlock')
      return { done: healthAnswered && signInAnswered, healthAnswered, signInAnswered }
    }
    case 8: {
      const samNotified = state.settled.includes('stride_sam_share')
      const workoutDone = state.workout === 'done'
      return { done: workoutDone && samNotified, workoutDone, samNotified }
    }
    case 9:
      return { done: state.savedPlans.length >= 2, plansSaved: state.savedPlans.length }
    case 10:
      return { done: state.reportUnlocked, reportUnlocked: state.reportUnlocked }
  }
}
