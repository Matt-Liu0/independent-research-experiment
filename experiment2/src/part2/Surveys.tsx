import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { Part2StageProps } from './stageProps'
import { AGE_RANGES, AI_USE, GENDERS, IUIPC_ITEMS, RECALL_QUESTIONS } from './surveyContent'

function Choice({
  id,
  question,
  options,
  value,
  onChange,
}: {
  id: string
  question: string
  options: string[]
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <li className="card">
      <p id={id} className="survey-item">
        {question}
      </p>
      <div className="option-list" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className="option" onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </li>
  )
}

/** Part 2 only: what the person remembers choosing a week earlier. */
export function Recall({ advance }: Part2StageProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const complete = RECALL_QUESTIONS.every((q) => answers[q.id])
  return (
    <main className="page page-wide">
      <h1>A few questions about Part 1</h1>
      <p>A few questions about the Bramble and Stride apps from Part 1. It's fine if you don't remember.</p>
      <ol className="survey-list">
        {RECALL_QUESTIONS.map((q) => (
          <Choice
            key={q.id}
            id={q.id}
            question={q.text}
            options={q.options.map((o) => o.label)}
            value={answers[q.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
          />
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-study"
        disabled={!complete}
        onClick={() => {
          logEvent('survey', { name: 'recall_submitted' })
          // Saved as the flow's own values ("I don't remember" → dont_remember), so the export compares them directly.
          const recall = Object.fromEntries(
            RECALL_QUESTIONS.map((q) => [q.id, q.options.find((o) => o.label === answers[q.id])?.value ?? 'dont_remember']),
          )
          advance({ recall })
        }}
      >
        Continue
      </button>
    </main>
  )
}

export function BackgroundSurvey({ advance }: Part2StageProps) {
  const [iuipc, setIuipc] = useState<(number | null)[]>(() => IUIPC_ITEMS.map(() => null))
  const [ageRange, setAgeRange] = useState<string>()
  const [gender, setGender] = useState<string>()
  const [aiUse, setAiUse] = useState<string>()
  const complete = iuipc.every((a) => a !== null) && ageRange !== undefined && aiUse !== undefined

  return (
    <main className="page page-wide">
      <h1>About you</h1>
      <p className="muted">
        For each statement, choose how much you agree, from 1 (strongly disagree) to 7 (strongly agree).
      </p>
      <ol className="survey-list">
        {IUIPC_ITEMS.map((item, i) => (
          <li key={item.text} className="card">
            <p id={`iuipc-${i}`} className="survey-item">
              {item.text}
            </p>
            <div className="scale scale-7" role="radiogroup" aria-labelledby={`iuipc-${i}`}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={iuipc[i] === n}
                  aria-label={`${n}`}
                  className="scale-point"
                  onClick={() => setIuipc((prev) => prev.map((a, j) => (j === i ? n : a)))}
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
        <Choice id="age" question="Your age" options={AGE_RANGES} value={ageRange} onChange={setAgeRange} />
        <Choice id="gender" question="Your gender (optional)" options={GENDERS} value={gender} onChange={setGender} />
        <Choice
          id="ai-use"
          question="How often do you use AI assistants (such as ChatGPT, Claude, Gemini or Siri)?"
          options={AI_USE}
          value={aiUse}
          onChange={setAiUse}
        />
      </ol>
      <button
        type="button"
        className="btn btn-study"
        disabled={!complete}
        onClick={() => {
          logEvent('survey', { name: 'background_submitted' })
          advance({ background: { iuipc: iuipc as number[], ageRange: ageRange!, gender: gender ?? null, aiUse: aiUse! } }, ['completedAt'])
        }}
      >
        Finish
      </button>
    </main>
  )
}
