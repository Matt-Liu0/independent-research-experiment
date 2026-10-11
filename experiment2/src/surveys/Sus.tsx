import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { AppId } from '../core/flowTypes'
import { APP_NAMES, appsInOrder } from '../study/apps'
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

/** One SUS per app, in the order the participant used them. Each set is saved as soon as it's answered. */
export function Sus({ participant, update, advance }: StageProps) {
  const apps = appsInOrder(participant.appOrder ?? 'bramble_first')
  const app = apps.find((a) => !participant.sus?.[a]) ?? apps[apps.length - 1]
  return <SusForm key={app} app={app} participant={participant} update={update} advance={advance} last={app === apps[apps.length - 1]} />
}

function SusForm({
  app,
  participant,
  update,
  advance,
  last,
}: {
  app: AppId
  participant: StageProps['participant']
  update: StageProps['update']
  advance: StageProps['advance']
  last: boolean
}) {
  const name = APP_NAMES[app]
  const [answers, setAnswers] = useState<(number | null)[]>(() => SUS_ITEMS.map(() => null))
  const complete = answers.every((a) => a !== null)

  const set = (i: number, value: number) => setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))

  const submit = () => {
    if (!complete) return
    const sus = { ...participant.sus, [app]: answers as number[] }
    logEvent('stage', { name: 'sus_submitted', app })
    if (last) advance({ sus })
    else {
      update({ sus })
      window.scrollTo?.(0, 0)
    }
  }

  return (
    <main className="page">
      <h1>What did you think of {name}?</h1>
      <p className="muted">
        For each statement, choose how much you agree, from 1 (strongly disagree) to 5 (strongly agree). "The system"
        means the {name} app.
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
