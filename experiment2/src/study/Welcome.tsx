import { useState, type FormEvent } from 'react'
import { START_POINTS } from '../bramble/data'
import { START_COINS } from '../stride/data'
import { APP_NAMES, appsInOrder } from './apps'
import { getName, setName } from './name'
import type { StageProps } from './stageProps'

export function Welcome({ participant, advance }: StageProps) {
  const [first, second] = appsInOrder(participant.appOrder ?? 'bramble_first').map((a) => APP_NAMES[a])
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
      <h1>Welcome</h1>
      <p>
        Today you'll try two new apps by doing short tasks in each: Bramble, a grocery delivery app, and Stride, a
        fitness and health app. You'll start with {first}, then move on to {second}. Your current task is shown at the
        top of the screen; tap it to see it again.
      </p>
      <p>Use each app as if it were your own account. There are no right or wrong ways to complete a task.</p>
      <p>
        You start with {START_POINTS} Bramble points and {START_COINS} Stride coins. Any you still have at the end are
        paid to you as a bonus (100 points or coins = $0.10).
      </p>
      <p>
        Both apps use practice details (an address, a simulated location and practice health data), so you never need to
        give your real ones.
      </p>
      <div className="field">
        <label htmlFor="name">What should the apps call you?</label>
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
