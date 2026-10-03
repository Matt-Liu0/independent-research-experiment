import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { StageProps } from '../study/stageProps'

export function Suspicion({ advance }: StageProps) {
  const [text, setText] = useState('')
  const answer = text.trim()

  return (
    <main className="page">
      <label htmlFor="suspicion">
        <h1>In one sentence, what do you think this study is about?</h1>
      </label>
      <textarea
        id="suspicion"
        className="input"
        rows={4}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="page-spacer" />
      <button
        type="button"
        className="btn btn-study"
        disabled={!answer}
        onClick={() => {
          logEvent('stage', { name: 'suspicion_submitted' })
          advance({ suspicion: answer })
        }}
      >
        Continue
      </button>
    </main>
  )
}
