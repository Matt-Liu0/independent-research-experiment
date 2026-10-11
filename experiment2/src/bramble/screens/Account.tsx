import { useState, type FormEvent } from 'react'
import { OTHER_ADDRESS, addressMatches } from '../appState'
import { useBramble } from '../BrambleContext'
import { Spinner } from '../../core/Loading'
import { SettingsList } from '../../core/SettingsList'
import { useBusy } from '../../core/useBusy'

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
      <SettingsList />
    </section>
  )
}
