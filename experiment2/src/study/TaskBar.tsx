import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { TaskNumber } from './apps'
import { TASKS } from './tasks'

interface Props {
  task: TaskNumber
  /** The app this task is in, for the card's instructions. */
  appName: string
  position: number
  total: number
  /** The full task card is open at the start of each task. */
  startOpen: boolean
  /** The participant closed the task card for the first time. */
  onStart?: () => void
  onFinish: () => void
}

/** The current task, pinned above the app. Tap to see the full wording again. */
export function TaskBar({ task, appName, position, total, startOpen, onStart, onFinish }: Props) {
  const [open, setOpen] = useState(startOpen)
  const [started, setStarted] = useState(!startOpen)
  const { short, text } = TASKS[task]

  const reopen = () => {
    logEvent('task', { event: 'reopen', task })
    setOpen(true)
  }

  return (
    <>
      <div className="task-bar">
        <button type="button" className="task-bar-label" onClick={reopen} aria-label={`Task ${position} of ${total}: ${text} Tap to see it again.`}>
          <span className="task-bar-count">
            Task {position} of {total}
          </span>
          <span className="task-bar-short">{short}</span>
        </button>
        <button type="button" className="btn btn-study task-bar-done" onClick={onFinish}>
          Done
        </button>
      </div>
      {open && (
        <div className="task-card-backdrop">
          <div className="task-card" role="dialog" aria-modal="true" aria-labelledby="task-card-text">
            <div className="task-progress" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={i < position ? 'filled' : ''} />
              ))}
            </div>
            <p className="eyebrow">
              Task {position} of {total}
            </p>
            <p id="task-card-text" className="task-card-text">
              {text}
            </p>
            <p className="muted">Use {appName} as if it were your own account. When you're done, tap Done at the top of the screen.</p>
            <button
              type="button"
              className="btn btn-study"
              onClick={() => {
                setOpen(false)
                if (!started) onStart?.()
                setStarted(true)
              }}
            >
              {started ? 'Back to the app' : 'Start task'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
