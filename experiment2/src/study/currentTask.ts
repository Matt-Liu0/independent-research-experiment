import { createContext, useContext } from 'react'
import type { TaskNumber } from './apps'

// The task the participant is doing, for the practice apps. Null outside the task stage (tests,
// the app on its own), where nothing is held back.
const CurrentTask = createContext<TaskNumber | null>(null)

export const CurrentTaskProvider = CurrentTask.Provider

export function useCurrentTask(): TaskNumber | null {
  return useContext(CurrentTask)
}
