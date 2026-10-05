import { useBramble } from './BrambleContext'
import { BackIcon } from './icons'

/** Title with a ‹ back button, for screens reached from inside the app (Find a store, Checkout). */
export function ScreenHeader({ title }: { title: string }) {
  const { goBack } = useBramble()
  return (
    <div className="screen-header">
      <button type="button" className="icon-button" aria-label="Back" onClick={() => goBack()}>
        <BackIcon />
      </button>
      <h1 className="screen-title">{title}</h1>
    </div>
  )
}
