// Placeholder, replaced in a later phase.
import type { StageProps } from '../study/stageProps'

export function Sus({ advance }: StageProps) {
  return (
    <main className="page">
      <h1>Usability survey</h1>
      <button className="btn btn-study" onClick={() => advance()}>
        Continue
      </button>
    </main>
  )
}
