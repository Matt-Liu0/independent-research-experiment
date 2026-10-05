import { useState, type FormEvent } from 'react'
import { OTHER_ADDRESS, addressMatches } from '../appState'
import { useBramble } from '../BrambleContext'
import { FLOWS, getFlow, isApplicable } from '../flows'
import { Spinner } from '../Loading'
import type { FlowDef } from '../types'
import { useBusy } from '../useBusy'

export function Account() {
  const { state, dispatch, act } = useBramble()
  const [address, setAddress] = useState(state.address === OTHER_ADDRESS ? '' : state.address)
  const [saved, setSaved] = useState(false)
  const [busy, run] = useBusy()

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!address.trim()) return
    const typed = address
    run('saveAddress', () => {
      dispatch({ type: 'saveAddress', address: typed })
      // Only whether it matches is logged; the typed text is not.
      act('address_saved', { matches: addressMatches(typed) })
      setSaved(true)
    })
  }

  return (
    <section className="screen">
      <h1 className="screen-title">Account</h1>

      <form className="field" onSubmit={save}>
        <label htmlFor="address">Delivery address</label>
        <div className="row">
          <input
            id="address"
            className="input"
            value={address}
            autoComplete="off"
            onChange={(e) => {
              setAddress(e.target.value)
              setSaved(false)
            }}
          />
          <button type="submit" className="btn btn-green btn-auto" disabled={!address.trim() || busy !== null}>
            {busy ? <Spinner /> : 'Save'}
          </button>
        </div>
        {saved && (
          <p className="small muted" role="status">
            Address saved.
          </p>
        )}
      </form>

      <h2 className="section-title">Location settings</h2>
      <div className="card settings-card">
        {FLOWS.map((flow) => (
          <AccountRow key={flow.id} flow={flow} />
        ))}
      </div>
    </section>
  )
}

/** Same in both friction levels. A flow can be changed here once it has been answered (or, for settings, shown). */
function AccountRow({ flow }: { flow: FlowDef }) {
  const { state, chooseFlow } = useBramble()
  const applicable = isApplicable(flow.id, state.flows)
  const value = state.flows[flow.id]
  const editable =
    applicable && (state.settled.includes(flow.id) || (flow.kind === 'setting' && state.shown.includes(flow.id)))

  let note: string | null = null
  if (!applicable && flow.dependsOn) note = `Needs ${getFlow(flow.dependsOn.flowId).account.label.toLowerCase()} on`
  else if (!editable) note = 'Not set yet'

  return (
    <div className="account-row" role="group" aria-label={flow.account.label}>
      <div className="account-label">{flow.account.label}</div>
      {note ? (
        <div className="muted small">{note}</div>
      ) : (
        <div className="segmented">
          {flow.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => value !== option && chooseFlow(flow.id, option, 'account_page')}
            >
              {flow.account.labels[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
