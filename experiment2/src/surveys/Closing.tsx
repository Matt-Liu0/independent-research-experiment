// Placeholder, replaced in a later phase.
import type { StageProps } from '../study/stageProps'

export function Closing({ advance }: StageProps) {
  return (
    <main className="page">
      <h1>Closing</h1>
      <button className="btn btn-study" onClick={() => advance()}>
        Continue
      </button>
    </main>
  )
}
