import { useCallback, useEffect, useRef, useState } from 'react'
import { initialAppState, storableAppState, type AppState } from '../bramble/appState'
import { BrambleApp } from '../bramble/BrambleApp'
import { BrambleProvider, useBramble } from '../bramble/BrambleContext'
import type { TaskNumber } from '../bramble/types'
import { logEvent, setLogContext } from '../log/logEvent'
import { EaseRating } from '../surveys/EaseRating'
import type { StageProps } from './stageProps'
import { TaskBar } from './TaskBar'
import { taskOutcome } from './tasks'
import type { TaskOutcome } from './types'

const SAVE_DELAY_MS = 300

/** Runs the six tasks: task bar + practice app, then an ease rating after each. */
export function TaskStage({ participant, update, advance }: StageProps) {
  const order = participant.taskOrder ?? [1, 2, 3, 4, 5, 6]
  const { taskIndex, taskPhase } = participant
  const task = order[taskIndex]
  const total = order.length
  // The app keeps its own state across tasks; the record only saves copies of it.
  const [initialState] = useState<AppState>(() => participant.appState ?? initialAppState())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef<AppState>(initialState)

  const saveAppState = useCallback(
    (state: AppState) => {
      latest.current = state
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null
        update({ appState: storableAppState(state) })
      }, SAVE_DELAY_MS)
    },
    [update],
  )

  useEffect(() => {
    setLogContext({ taskId: taskPhase === 'doing' ? task : null })
  }, [task, taskPhase])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    [],
  )

  const finishTask = (outcome: TaskOutcome, state: AppState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    logEvent('task', { event: 'finish', task, position: taskIndex + 1, outcome })
    setLogContext({ taskId: null })
    update({
      appState: storableAppState(state),
      taskOutcome: { ...participant.taskOutcome, [`t${task}`]: outcome },
      taskPhase: 'rating',
    })
  }

  const rate = (value: number) => {
    const ease = { ...participant.ease, [`t${task}`]: value }
    logEvent('task', { event: 'ease', task, value })
    if (taskIndex + 1 < total) update({ ease, taskIndex: taskIndex + 1, taskPhase: 'doing' })
    else advance({ ease, appState: storableAppState(latest.current) })
  }

  return (
    <BrambleProvider friction={participant.friction ?? 'neutral'} initialState={initialState} onChange={saveAppState}>
      {taskPhase === 'rating' ? (
        <EaseRating key={task} taskNumber={taskIndex + 1} total={total} onSubmit={rate} />
      ) : (
        <TaskRunner key={task} task={task} position={taskIndex + 1} total={total} onFinish={finishTask} />
      )}
    </BrambleProvider>
  )
}

function TaskRunner({
  task,
  position,
  total,
  onFinish,
}: {
  task: TaskNumber
  position: number
  total: number
  onFinish: (outcome: TaskOutcome, state: AppState) => void
}) {
  const { leaveScreen, getState } = useBramble()
  const logged = useRef(false)

  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logEvent('task', { event: 'start', task, position })
  }, [task, position])

  const finish = () => {
    // Settle flows that settle on leaving (Deals) and close Account timing before scoring the task.
    leaveScreen()
    const state = getState()
    onFinish(taskOutcome(task, state), state)
  }

  return (
    <div className="task-frame">
      <TaskBar task={task} position={position} total={total} startOpen onFinish={finish} />
      <BrambleApp />
    </div>
  )
}
