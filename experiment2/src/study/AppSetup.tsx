// Each app's first-run setup, shown the first time the participant opens it (after the home
// screen and splash, before any screen or prompt). No privacy content; the same in both levels.
import { useState } from 'react'
import type { AppId } from '../core/flowTypes'
import { logEvent } from '../log/logEvent'
import { APP_NAMES } from './apps'
import { getName } from './name'
import { ACTIVE_DAYS, FITNESS_GOALS, GROCERY_CATEGORIES, saveSetup } from './setup'

const MAX_USUALS = 3

export function AppSetup({ app, onDone }: { app: AppId; onDone: () => void }) {
  const name = getName()
  const [usuals, setUsuals] = useState<string[]>([])
  const [goal, setGoal] = useState<string | null>(null)
  const [days, setDays] = useState<string | null>(null)

  const finish = () => {
    if (app === 'bramble') saveSetup('bramble', { usuals })
    else saveSetup('stride', { goal: goal ?? '', activeDays: days ?? '' })
    // Only that setup happened and how many were picked; never the picks.
    logEvent('task', { event: 'app_setup', app, picked: app === 'bramble' ? usuals.length : goal ? 1 : 0 })
    onDone()
  }

  const toggleUsual = (id: string) =>
    setUsuals((u) => (u.includes(id) ? u.filter((x) => x !== id) : u.length < MAX_USUALS ? [...u, id] : u))

  const ready = app === 'bramble' ? usuals.length > 0 : goal !== null && days !== null

  return (
    <div className={app}>
      <header className="app-header">
        <span className="logo">{APP_NAMES[app].toLowerCase()}</span>
      </header>
      <main className="app-content">
        <section className="screen setup">
          <h1 className="screen-title">Welcome to {APP_NAMES[app]}{name ? `, ${name}` : ''}</h1>
          {app === 'bramble' ? (
            <>
              <p className="muted">What do you usually buy? Pick up to {MAX_USUALS}, and we'll put them first.</p>
              <div className="setup-chips" role="group" aria-label="What you usually buy">
                {GROCERY_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`setup-chip ${usuals.includes(c.id) ? 'setup-chip-on' : ''}`}
                    aria-pressed={usuals.includes(c.id)}
                    onClick={() => toggleUsual(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="muted">Let's set up your plan.</p>
              <h2 className="section-title">What's your main goal?</h2>
              <div className="setup-chips" role="radiogroup" aria-label="Main goal">
                {FITNESS_GOALS.map((g) => (
                  <button key={g.id} type="button" role="radio" aria-checked={goal === g.id} className={`setup-chip ${goal === g.id ? 'setup-chip-on' : ''}`} onClick={() => setGoal(g.id)}>
                    {g.label}
                  </button>
                ))}
              </div>
              <h2 className="section-title">How many days a week are you active?</h2>
              <div className="setup-chips" role="radiogroup" aria-label="Active days a week">
                {ACTIVE_DAYS.map((d) => (
                  <button key={d} type="button" role="radio" aria-checked={days === d} className={`setup-chip ${days === d ? 'setup-chip-on' : ''}`} onClick={() => setDays(d)}>
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="page-spacer" />
          <button type="button" className="btn btn-green" disabled={!ready} onClick={finish}>
            Continue
          </button>
        </section>
      </main>
    </div>
  )
}
