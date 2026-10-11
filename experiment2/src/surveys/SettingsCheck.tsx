import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { StageProps } from '../study/stageProps'
import { SETTINGS_QUESTIONS, helpFor, type SettingsQuestion } from './settingsQuestions'

type Answers = Record<string, string | string[]>

export function SettingsCheck({ participant, advance }: StageProps) {
  const os = participant.device?.os ?? 'other'
  const [answers, setAnswers] = useState<Answers>({})
  const complete = SETTINGS_QUESTIONS.every((q) => {
    const a = answers[q.id]
    return Array.isArray(a) ? a.length > 0 : Boolean(a)
  })

  const choose = (q: SettingsQuestion, value: string) => {
    setAnswers((prev) => {
      if (!q.multiple) return { ...prev, [q.id]: value }
      const current = (prev[q.id] as string[] | undefined) ?? []
      let next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      if (q.exclusive) next = value === q.exclusive ? next.filter((v) => v === q.exclusive) : next.filter((v) => v !== q.exclusive)
      return { ...prev, [q.id]: next }
    })
  }

  const submit = () => {
    if (!complete) return
    logEvent('stage', { name: 'settings_check_submitted' })
    advance({ settingsCheck: answers }, ['completedAt'])
  }

  return (
    <main className="page">
      <h1>Last step</h1>
      <p>
        A few questions about apps you already use, so we can compare them with Bramble and Stride. You'll look up a few settings
        on this phone, which takes about 5 minutes. We only record your answers on this page. We never see your apps,
        your data or your location.
      </p>
      <ol className="survey-list">
        {SETTINGS_QUESTIONS.map((q) => {
          const answer = answers[q.id]
          const selected = (value: string) => (Array.isArray(answer) ? answer.includes(value) : answer === value)
          return (
            <li key={q.id} className="card">
              <p id={`settings-${q.id}`} className="survey-item">
                {q.text}
              </p>
              {helpFor(q, os).map((help) => (
                <p key={help} className="muted small survey-help">
                  {help}
                </p>
              ))}
              {q.multiple && <p className="muted small survey-help">Choose all that apply.</p>}
              <div
                className="option-list"
                role={q.multiple ? 'group' : 'radiogroup'}
                aria-labelledby={`settings-${q.id}`}
              >
                {q.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role={q.multiple ? 'checkbox' : 'radio'}
                    aria-checked={selected(o.value)}
                    className="option"
                    onClick={() => choose(q, o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      <button type="button" className="btn btn-study" disabled={!complete} onClick={submit}>
        Finish
      </button>
    </main>
  )
}
