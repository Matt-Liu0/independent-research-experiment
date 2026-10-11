import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CoreState } from '../core/engine'
import { useEngine } from '../core/engine'
import { Splash } from '../core/Loading'
import { delayFor } from '../core/timing'
import { parsePattern } from '../core/units'
import { logEvent, setLogContext } from '../log/logEvent'
import { EaseRating } from '../surveys/EaseRating'
import { ALL_TASKS, APP_NAMES, appOfTask, type TaskNumber } from './apps'
import { SESSION_APPS, savedStateOf, type SessionApp } from './sessionApps'
import type { StageProps } from './stageProps'
import { TaskBar } from './TaskBar'
import type { ParticipantDoc, TaskOutcome } from './types'

const SAVE_DELAY_MS = 300

/** Runs the tasks of both apps: task bar + practice app, then an ease rating after each. */
export function TaskStage({ participant, mode, update, advance }: StageProps) {
  // Agent episodes: the harness gives each task's text, and there are no ease ratings.
  const agent = mode === 'agent'
  const order = participant.taskOrder ?? ALL_TASKS
  const { taskIndex, taskPhase } = participant
  const task = order[taskIndex]
  const app = SESSION_APPS[appOfTask(task)]

  // Each app's provider stays mounted while its tasks run, and remounts (from the saved
  // state) when the session moves to the other app.
  return (
    <AppSession
      key={app.id}
      app={app}
      participant={participant}
      task={task}
      taskIndex={taskIndex}
      taskPhase={taskPhase}
      total={order.length}
      nextTask={order[taskIndex + 1]}
      agent={agent}
      update={update}
      advance={advance}
    />
  )
}

interface SessionProps {
  app: SessionApp
  participant: ParticipantDoc
  task: TaskNumber
  taskIndex: number
  taskPhase: ParticipantDoc['taskPhase']
  total: number
  nextTask: TaskNumber | undefined
  agent: boolean
  update: StageProps['update']
  advance: StageProps['advance']
}

function AppSession({ app, participant, task, taskIndex, taskPhase, total, nextTask, agent, update, advance }: SessionProps) {
  // The app keeps its own state across its tasks; the record only saves copies of it.
  const [initialState] = useState<CoreState>(() => app.initial(savedStateOf(participant, app)))
  const nudgedUnits = useMemo(() => parsePattern(participant.pattern), [participant.pattern])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef<CoreState>(initialState)

  const saveState = useCallback(
    (state: CoreState) => {
      latest.current = state
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null
        update({ [app.field]: app.storable(state) })
      }, SAVE_DELAY_MS)
    },
    [update, app],
  )

  useEffect(() => {
    setLogContext({ taskId: taskPhase === 'doing' ? task : null, app: app.id })
  }, [task, taskPhase, app.id])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      // Outside the apps (surveys, or between apps), events have no app or screen.
      setLogContext({ app: null, screen: null })
    },
    [],
  )

  /** Where to go after a task (and its rating): the next task, the next app's introduction, or the surveys. */
  const nextFields = () => {
    if (nextTask === undefined) return null
    const switching = appOfTask(nextTask) !== app.id
    return { taskIndex: taskIndex + 1, taskPhase: switching && !agent ? ('intro' as const) : ('doing' as const) }
  }

  const finishTask = (outcome: TaskOutcome, state: CoreState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    logEvent('task', { event: 'finish', task, position: taskIndex + 1, outcome })
    setLogContext({ taskId: null })
    const fields = {
      [app.field]: app.storable(state),
      taskOutcome: { ...participant.taskOutcome, [`t${task}`]: outcome },
    }
    const next = nextFields()
    if (!agent) update({ ...fields, taskPhase: 'rating' })
    else if (next) update({ ...fields, ...next })
    else advance(fields)
  }

  const rate = (value: number) => {
    const ease = { ...participant.ease, [`t${task}`]: value }
    logEvent('task', { event: 'ease', task, value })
    const next = nextFields()
    if (next) update({ ease, ...next })
    else advance({ ease, [app.field]: app.storable(latest.current) })
  }

  const startApp = () => {
    logEvent('task', { event: 'app_intro', app: app.id })
    update({ taskPhase: 'doing' })
  }

  let body
  if (taskPhase === 'intro') body = <AppIntro app={app} onStart={startApp} />
  else if (taskPhase === 'rating') body = <EaseRating key={task} taskNumber={taskIndex + 1} total={total} onSubmit={rate} />
  else
    body = (
      <TaskRunner key={task} app={app} task={task} position={taskIndex + 1} total={total} showCard={!agent} onFinish={finishTask} />
    )

  return (
    <app.Provider nudgedUnits={nudgedUnits} initialState={initialState} onChange={saveState}>
      {body}
    </app.Provider>
  )
}

/** Before the second app's first task: what comes next. */
function AppIntro({ app, onStart }: { app: SessionApp; onStart: () => void }) {
  const name = APP_NAMES[app.id]
  return (
    <main className="page">
      <p className="eyebrow">Next app</p>
      <h1>Now try {name}</h1>
      {app.id === 'stride' ? (
        <p>
          Stride is a new fitness and health app. You'll do four short tasks. It uses practice health data, so you never
          need to give your real data.
        </p>
      ) : (
        <p>
          Bramble is a new grocery delivery app. You'll do six short tasks. It uses a practice address and a simulated
          location, so you never need to give your real ones.
        </p>
      )}
      <p>Use {name} as if it were your own account.</p>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" onClick={onStart}>
        Open {name}
      </button>
    </main>
  )
}

function TaskRunner({
  app,
  task,
  position,
  total,
  showCard,
  onFinish,
}: {
  app: SessionApp
  task: TaskNumber
  position: number
  total: number
  /** Participants see the task card first; agents get the task text from the harness. */
  showCard: boolean
  onFinish: (outcome: TaskOutcome, state: CoreState) => void
}) {
  const { leaveScreen, getState } = useEngine()
  const logged = useRef(false)
  // card: task card open, app not mounted yet. splash: the app "opening". app: in use.
  const [phase, setPhase] = useState<'card' | 'splash' | 'app'>(() =>
    showCard ? 'card' : delayFor('splash') > 0 ? 'splash' : 'app',
  )

  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logEvent('task', { event: 'start', task, position })
  }, [task, position])

  useEffect(() => {
    if (phase !== 'splash') return
    const timer = setTimeout(() => setPhase('app'), delayFor('splash'))
    return () => clearTimeout(timer)
  }, [phase])

  const start = () => setPhase(delayFor('splash') > 0 ? 'splash' : 'app')

  const finish = () => {
    // Settle flows that settle on leaving (Deals, Plans) and close settings-page timing before scoring the task.
    leaveScreen()
    const state = getState()
    onFinish(app.outcome(task, state), state)
  }

  const App = app.App
  return (
    <div className="task-frame">
      <TaskBar task={task} appName={APP_NAMES[app.id]} position={position} total={total} startOpen={showCard} onStart={start} onFinish={finish} />
      {/* The app mounts only once the task card is closed, so no prompt opens (or starts timing) behind it. */}
      {phase === 'app' ? (
        <App />
      ) : (
        <div className={app.id === 'stride' ? 'stride' : 'bramble'}>
          {phase === 'splash' ? <Splash name={APP_NAMES[app.id]} /> : <div className="splash" />}
        </div>
      )}
    </div>
  )
}
