// Placeholder, replaced in a later phase.
import type { StageProps } from '../study/stageProps'

export function SettingsCheck({ advance }: StageProps) {
  return (
    <main className="page">
      <h1>Settings check</h1>
      <button className="btn btn-study" onClick={() => advance()}>
        Continue
      </button>
    </main>
  )
}
