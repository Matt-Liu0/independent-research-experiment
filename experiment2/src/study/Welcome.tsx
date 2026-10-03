import { useState, type FormEvent } from 'react'
import { START_POINTS } from '../bramble/data'
import { getName, setName } from './name'
import type { StageProps } from './stageProps'

export function Welcome({ advance }: StageProps) {
  const [name, setNameInput] = useState(getName())
  const trimmed = name.trim()

  function start(event: FormEvent) {
    event.preventDefault()
    if (!trimmed) return
    setName(trimmed)
    advance()
  }

  return (
    <form className="page" onSubmit={start}>
      <p className="eyebrow">Part 1</p>
      <h1>Welcome to Bramble</h1>
      <p>
        Today you'll try Bramble, a new grocery delivery app, by doing six short tasks. Your current task is shown at
        the top of the screen; tap it to see it again.
      </p>
      <p>Use Bramble as if it were your own account. There are no right or wrong ways to complete a task.</p>
      <p>
        You start with {START_POINTS} Bramble points. Any points you still have at the end are paid to you as a bonus
        (100 points = $0.10).
      </p>
      <p>Bramble uses a practice address and a simulated location, so you never need to give your real ones.</p>
      <div className="field">
        <label htmlFor="name">What should Bramble call you?</label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="First name or nickname"
          autoComplete="given-name"
          maxLength={40}
        />
      </div>
      <div className="page-spacer" />
      <button className="btn btn-study" type="submit" disabled={!trimmed}>
        Start
      </button>
    </form>
  )
}
