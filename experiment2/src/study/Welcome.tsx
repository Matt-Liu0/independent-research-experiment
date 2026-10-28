import { useState, type FormEvent } from 'react'
import { prepareArea } from '../bramble/area'
import { START_POINTS } from '../bramble/data'
import { Spinner } from '../core/Loading'
import { logEvent } from '../log/logEvent'
import { START_COINS } from '../stride/data'
import { APP_NAMES, appsInOrder } from './apps'
import { getName, setName } from './name'
import type { StageProps } from './stageProps'

export function Welcome({ participant, advance }: StageProps) {
  const [first, second] = appsInOrder(participant.appOrder ?? 'bramble_first').map((a) => APP_NAMES[a])
  const [name, setNameInput] = useState(getName())
  const [zip, setZip] = useState('')
  const [preparing, setPreparing] = useState(false)
  const trimmed = name.trim()
  const zipValid = /^\d{5}$/.test(zip)

  async function start(event: FormEvent) {
    event.preventDefault()
    if (!trimmed || !zipValid || preparing) return
    setName(trimmed)
    // The store finder's map and stores come from this ZIP. The ZIP itself is never saved or
    // sent anywhere: it is looked up in our own table on this phone (bramble/area.ts).
    setPreparing(true)
    const { kind, reason, ms } = await prepareArea(zip)
    logEvent('stage', { name: 'area', kind, reason, ms })
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
        paid to you as a bonus (100 points or coins = $1.00).
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
      <div className="field">
        <label htmlFor="zip">Your ZIP code</label>
        <input
          id="zip"
          className="input"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '')
            setZip(next)
            // Start looking the area up while the name is still being typed; Start waits for it.
            if (/^\d{5}$/.test(next)) void prepareArea(next)
          }}
          placeholder="5 digits"
          aria-describedby="zip-note"
        />
        <p id="zip-note" className="muted small">
          So the apps can show places near you. Your ZIP code stays on this phone: it isn't stored with your answers or
          shared outside the study.
        </p>
      </div>
      <div className="page-spacer" />
      <button className="btn btn-study" type="submit" disabled={!trimmed || !zipValid || preparing}>
        {preparing ? <Spinner label="Setting up…" /> : 'Start'}
      </button>
    </form>
  )
}
