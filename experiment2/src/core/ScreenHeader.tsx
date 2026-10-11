import { useEngine } from './engine'

const BackIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 5-7 7 7 7" />
  </svg>
)

/** Title with a ‹ back button, for screens reached from inside the app (Find a store, Checkout). */
export function ScreenHeader({ title }: { title: string }) {
  const { goBack } = useEngine()
  return (
    <div className="screen-header">
      <button type="button" className="icon-button" aria-label="Back" onClick={() => goBack()}>
        <BackIcon />
      </button>
      <h1 className="screen-title">{title}</h1>
    </div>
  )
}
