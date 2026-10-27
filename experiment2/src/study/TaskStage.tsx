import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CoreState } from '../core/engine'
import type { AppId } from '../core/flowTypes'
import { useEngine } from '../core/engine'
import { Splash } from '../core/Loading'
import { delayFor } from '../core/timing'
import { parsePattern } from '../core/units'
import { logEvent, setLogContext } from '../log/logEvent'
import { EaseRating } from '../surveys/EaseRating'
import { ALL_TASKS, APP_NAMES, appOfTask, type TaskNumber } from './apps'
import { HomeScreen } from './HomeScreen'
import { SESSION_APPS, savedStateOf, type SessionApp } from './sessionApps'
import type { StageProps } from './stageProps'
import { TaskBar } from './TaskBar'
import { TASKS } from './tasks'
import type { ParticipantDoc, TaskOutcome } from './types'

const SAVE_DELAY_MS = 300

/** Runs the tasks of both apps: task bar + practice app, then an ease rating after each. */
export function TaskStage({ participant, mode, update, advance }: StageProps) {
  // Agent episodes: the harness gives each task's text, and there are no ease ratings.
  const agent = mode === 'agent'
  // "I'm done with this task" lets a task be skipped; only demo links keep it, for testing.
  const allowSkip = mode === 'demo'
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
      previousTask={order[taskIndex - 1]}
      firstApp={appOfTask(order[0])}
      agent={agent}
      allowSkip={allowSkip}
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
  previousTask: TaskNumber | undefined
  firstApp: ReturnType<typeof appOfTask>
  agent: boolean
  allowSkip: boolean
  update: StageProps['update']
  advance: StageProps['advance']
}

function AppSession({ app, participant, task, taskIndex, taskPhase, total, nextTask, previousTask, firstApp, agent, allowSkip, update, advance }: SessionProps) {
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
      <TaskRunner
        key={task}
        app={app}
        task={task}
        position={taskIndex + 1}
        total={total}
        showCard={!agent}
        allowSkip={allowSkip}
        installed={app.id === firstApp ? [app.id] : [firstApp, app.id]}
        firstInApp={previousTask === undefined || appOfTask(previousTask) !== app.id}
        onFinish={finishTask}
      />
    )

  return (
    <app.Provider nudgedUnits={nudgedUnits} initialState={initialState} onChange={saveState}>
      {body}
    </app.Provider>
  )
}

/**
 * Asked when Done is tapped before the task looks finished. Same in both friction levels.
 * Participants can only keep going; the skip option is for demo links.
 */
function UnfinishedCheck({
  task,
  allowSkip,
  onAnswer,
}: {
  task: TaskNumber
  allowSkip: boolean
  onAnswer: (finished: boolean) => void
}) {
  return (
    <div className="task-card-backdrop">
      <div className="task-card" role="dialog" aria-modal="true" aria-labelledby="unfinished-title">
        <p id="unfinished-title" className="task-card-text">
          This task doesn't look finished yet.
        </p>
        <p className="muted">{TASKS[task].text}</p>
        <button type="button" className="btn btn-study" onClick={() => onAnswer(false)}>
          Keep going
        </button>
        {allowSkip && (
          <button type="button" className="btn btn-link" onClick={() => onAnswer(true)}>
            I'm done with this task
          </button>
        )}
      </div>
    </div>
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
          Bramble is a new grocery delivery app. You'll do five short tasks. It uses a practice address and a simulated
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
  allowSkip,
  installed,
  firstInApp,
  onFinish,
}: {
  app: SessionApp
  task: TaskNumber
  position: number
  total: number
  /** Participants see the task card first; agents get the task text from the harness. */
  showCard: boolean
  allowSkip: boolean
  /** Study apps on the home screen so far, in the order they were installed. */
  installed: AppId[]
  /** The first task in this app: the home screen shows a hint, and the second app is marked new. */
  firstInApp: boolean
  onFinish: (outcome: TaskOutcome, state: CoreState) => void
}) {
  const { leaveScreen, getState, state } = useEngine()
  const logged = useRef(false)
  // The task's goal is reached: the bar says so, but the task doesn't end until Next is tapped,
  // so decisions still on screen (e.g. the workout-complete prompts) aren't cut off.
  const goalMet = showCard && app.outcome(task, state).done
  const goalLogged = useRef(false)
  // Done tapped before the task's goal was reached: ask once whether they're finished.
  const [checking, setChecking] = useState(false)
  // card: task card open, app not mounted yet. home: the phone's home screen, until the app's
  // icon is tapped. splash: the app "opening". app: in use.
  const [phase, setPhase] = useState<'card' | 'home' | 'splash' | 'app'>(() =>
    showCard ? 'card' : delayFor('splash') > 0 ? 'splash' : 'app',
  )

  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logEvent('task', { event: 'start', task, position })
  }, [task, position])

  useEffect(() => {
    if (!goalMet || goalLogged.current) return
    goalLogged.current = true
    logEvent('task', { event: 'goal_met', task })
  }, [goalMet, task])

  useEffect(() => {
    if (phase !== 'splash') return
    const timer = setTimeout(() => setPhase('app'), delayFor('splash'))
    return () => clearTimeout(timer)
  }, [phase])

  const start = () => setPhase('home')
  const open = () => setPhase(delayFor('splash') > 0 ? 'splash' : 'app')

  const finish = () => {
    // Settle flows that settle on leaving (Deals, Plans) and close settings-page timing before scoring the task.
    leaveScreen()
    const state = getState()
    onFinish(app.outcome(task, state), state)
  }

  /**
   * Done in the task bar. If the task's goal isn't met yet (e.g. no store set), participants are
   * asked once whether they're finished, so tasks aren't skipped by accident. The goal never
   * depends on a privacy answer: declining always counts as done. Agents aren't asked.
   */
  const tapDone = () => {
    if (!showCard || app.outcome(task, getState()).done) return finish()
    logEvent('task', { event: 'unfinished_check', task })
    setChecking(true)
  }

  const answerCheck = (finished: boolean) => {
    logEvent('task', { event: 'unfinished_answer', task, finished })
    setChecking(false)
    if (finished) finish()
  }

  const App = app.App
  return (
    <div className="task-frame">
      <TaskBar task={task} appName={APP_NAMES[app.id]} position={position} total={total} startOpen={showCard} complete={goalMet} onStart={start} onFinish={tapDone} />
      {checking && <UnfinishedCheck task={task} allowSkip={allowSkip} onAnswer={answerCheck} />}
      {/* The app mounts only once the task card is closed, so no prompt opens (or starts timing) behind it. */}
      {phase === 'app' ? (
        <App />
      ) : phase === 'home' ? (
        <HomeScreen app={app.id} installed={installed} isNew={firstInApp && installed.length > 1} hint={firstInApp} onOpen={open} />
      ) : (
        <div className={app.id === 'stride' ? 'stride' : 'bramble'}>
          {phase === 'splash' ? <Splash name={APP_NAMES[app.id]} /> : <div className="splash" />}
        </div>
      )}
    </div>
  )
}
