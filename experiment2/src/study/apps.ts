// The two practice apps in one session: which tasks belong to which app, and the app order.
import type { BrambleTask } from '../bramble/types'
import type { AppId } from '../core/flowTypes'
import type { StrideTask } from '../stride/types'

/** Task numbers are unique across the session: Bramble 1, 2, 4, 5, 6 (3 was merged into 2), Stride 7–10. */
export type TaskNumber = BrambleTask | StrideTask

export const APP_TASKS: { bramble: BrambleTask[]; stride: StrideTask[] } = {
  bramble: [1, 2, 4, 5, 6],
  stride: [7, 8, 9, 10],
}

export const ALL_TASKS: TaskNumber[] = [...APP_TASKS.bramble, ...APP_TASKS.stride]

/** Which app a participant uses first. Balanced across participants, crossed with the nudge pattern. */
export const APP_ORDERS = ['bramble_first', 'stride_first'] as const
export type AppOrder = (typeof APP_ORDERS)[number]

export const APP_NAMES: Record<AppId, string> = { bramble: 'Bramble', stride: 'Stride' }

export function appOfTask(task: TaskNumber): AppId {
  return task <= 6 ? 'bramble' : 'stride'
}

export function appsInOrder(order: AppOrder): [AppId, AppId] {
  return order === 'bramble_first' ? ['bramble', 'stride'] : ['stride', 'bramble']
}

/** The app order a task order implies (the app of its first task). */
export function appOrderOf(taskOrder: readonly TaskNumber[]): AppOrder {
  return appOfTask(taskOrder[0]) === 'bramble' ? 'bramble_first' : 'stride_first'
}
