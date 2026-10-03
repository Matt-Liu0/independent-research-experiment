// Placeholder, replaced in a later phase.
import type { StageProps } from './stageProps'

export function TaskStage({ advance }: StageProps) {
  return (
    <main className="page">
      <h1>Tasks</h1>
      <button className="btn btn-study" onClick={() => advance()}>
        Continue
      </button>
    </main>
  )
}
