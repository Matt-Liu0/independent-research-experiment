import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { StageProps } from '../study/stageProps'

/** The standard ten-item System Usability Scale, unchanged (Brooke, 1996). */
export const SUS_ITEMS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
]

export function Sus({ advance }: StageProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => SUS_ITEMS.map(() => null))
  const complete = answers.every((a) => a !== null)

  const set = (i: number, value: number) => setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))

  const submit = () => {
    if (!complete) return
    const sus = answers as number[]
    logEvent('stage', { name: 'sus_submitted' })
    advance({ sus })
  }

  return (
    <main className="page">
      <h1>What did you think of Bramble?</h1>
      <p className="muted">
        For each statement, choose how much you agree, from 1 (strongly disagree) to 5 (strongly agree). "The system"
        means the Bramble app.
      </p>
      <ol className="survey-list">
        {SUS_ITEMS.map((item, i) => (
          <li key={item} className="card">
            <p id={`sus-${i}`} className="survey-item">
              {item}
            </p>
            <div className="scale scale-5" role="radiogroup" aria-labelledby={`sus-${i}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={answers[i] === n}
                  aria-label={`${n}`}
                  className="scale-point"
                  onClick={() => set(i, n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="scale-anchors muted small">
              <span>Strongly disagree</span>
              <span>Strongly agree</span>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-study" disabled={!complete} onClick={submit}>
        Continue
      </button>
    </main>
  )
}
