import { useEffect, useRef, useState } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent } from '../log/logEvent'
import { ATTENTION_ITEMS, BATTERY, PRACTICE_TEXT, REPEATED_ITEMS, VERDICTS, getItem, type VerdictValue } from './items'
import { buildSequence, slotKey, validSequence, type Slot } from './order'
import type { Part2StageProps } from './stageProps'
import type { ItemAnswer } from './types'

/** Total pages: the scored items plus the attention items. */
const TOTAL = BATTERY.length + REPEATED_ITEMS.length + ATTENTION_ITEMS.length

/** The three choices and what each means (shown on the introduction and again after a wrong comprehension answer). */
function Definitions() {
  return (
    <ul className="stack definitions">
      {VERDICTS.map((v) => (
        <li key={v.value}>
          <strong>{v.label}</strong>: {v.help}
        </li>
      ))}
    </ul>
  )
}

export function Intro({ advance }: Part2StageProps) {
  return (
    <main className="page page-wide">
      <h1>Your views</h1>
      <p>
        Now you'll read {TOTAL} short situations. In each one, an app, a company or a person wants to use some of your
        information. For each situation, choose:
      </p>
      <Definitions />
      <p>
        Then say how sure you are, from 1 (not at all sure) to 5 (completely sure). Some situations look alike, so please
        read each one carefully.
      </p>
      <p className="muted">First, one practice situation that doesn't count.</p>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" onClick={() => advance()}>
        Start the practice
      </button>
    </main>
  )
}

/** One situation: the text, the three verdicts, then confidence. Reports the answer on Next. */
function ItemCard({
  label,
  text,
  onNext,
  nextLabel = 'Next',
}: {
  label: string
  text: string
  onNext: (answer: { verdict: VerdictValue; confidence: number; ms: number; changes: number }) => void
  nextLabel?: string
}) {
  const [verdict, setVerdict] = useState<VerdictValue | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  const changes = useRef(0)
  const shownAt = useRef(visibleMs())

  const pickVerdict = (v: VerdictValue) => {
    if (verdict !== null && verdict !== v) changes.current++
    setVerdict(v)
  }
  const pickConfidence = (n: number) => {
    if (confidence !== null && confidence !== n) changes.current++
    setConfidence(n)
  }

  return (
    <div className="item-card card">
      <div className="eyebrow">{label}</div>
      <p className="item-text">{text}</p>
      <div className="verdicts" role="radiogroup" aria-label="Your choice">
        {VERDICTS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={verdict === v.value}
            className="option verdict"
            onClick={() => pickVerdict(v.value)}
          >
            <span className="strong">{v.label}</span>
            <span className="muted small">{v.help}</span>
          </button>
        ))}
      </div>
      <p id="confidence-label" className="survey-item">
        How sure are you?
      </p>
      <div className="scale scale-5" role="radiogroup" aria-labelledby="confidence-label">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={confidence === n}
            aria-label={`${n}`}
            className="scale-point"
            onClick={() => pickConfidence(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-anchors muted small">
        <span>Not at all sure</span>
        <span>Completely sure</span>
      </div>
      <button
        type="button"
        className="btn btn-study"
        disabled={verdict === null || confidence === null}
        onClick={() =>
          verdict !== null &&
          confidence !== null &&
          onNext({ verdict, confidence, ms: visibleMs() - shownAt.current, changes: changes.current })
        }
      >
        {nextLabel}
      </button>
    </div>
  )
}

export function Practice({ advance }: Part2StageProps) {
  useEffect(() => {
    logEvent('item', { name: 'shown', itemId: 'practice' })
  }, [])
  return (
    <main className="page page-wide">
      <h1>Practice</h1>
      <ItemCard
        label="Practice situation"
        text={PRACTICE_TEXT}
        nextLabel="Continue"
        onNext={({ verdict, confidence, ms }) => {
          logEvent('item', { name: 'answered', itemId: 'practice', verdict, confidence, ms })
          advance({ practice: { verdict, confidence } })
        }}
      />
    </main>
  )
}

const COMPREHENSION_OPTIONS = [
  { value: 'allow', label: 'Allow' },
  { value: 'block', label: 'Block' },
  { value: 'ask', label: 'Ask me' },
]

/** Must be answered correctly; after a wrong answer the definitions reappear and there's one more try. Recorded either way. */
export function Comprehension({ advance }: Part2StageProps) {
  const [attempts, setAttempts] = useState<string[]>([])
  const [choice, setChoice] = useState<string | null>(null)
  const wrongOnce = attempts.length === 1

  const submit = () => {
    if (choice === null) return
    const next = [...attempts, choice]
    const passed = choice === 'ask'
    logEvent('survey', { name: 'comprehension', attempt: next.length, answer: choice, correct: passed })
    if (passed || next.length >= 2) {
      advance({ comprehension: { attempts: next, passed } }, ['startedItemsAt'])
      return
    }
    setAttempts(next)
    setChoice(null)
  }

  return (
    <main className="page page-wide">
      <h1>One quick check</h1>
      {wrongOnce && (
        <div className="notice" role="alert">
          <p>Not quite. Here is what each option means:</p>
          <Definitions />
        </div>
      )}
      <div className="card">
        <p id="comprehension-q" className="survey-item">
          Which option means the app should check with you every time?
        </p>
        <div className="option-list" role="radiogroup" aria-labelledby="comprehension-q">
          {COMPREHENSION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={choice === o.value}
              className="option"
              onClick={() => setChoice(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" disabled={choice === null} onClick={submit}>
        Continue
      </button>
    </main>
  )
}

/** The questionnaire, one page per situation, in the person's saved order. No going back. */
export function Items({ doc, update, advance }: Part2StageProps) {
  // Generate the order once and save it before the first item, so a reload shows the same order.
  const [sequence] = useState<Slot[]>(() => (doc.sequence && validSequence(doc.sequence) ? doc.sequence : buildSequence()))
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>(doc.answers)
  useEffect(() => {
    if (!doc.sequence) update({ sequence })
    // Saved once; `doc.sequence` only changes through this write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const index = sequence.findIndex((slot) => !(slotKey(slot) in answers))
  const slot = index >= 0 ? sequence[index] : null

  useEffect(() => {
    if (slot) logEvent('item', { name: 'shown', key: slotKey(slot), itemId: slot.itemId, position: index + 1 })
  }, [slot, index])

  if (!slot) return null
  const text =
    slot.kind === 'attention'
      ? ATTENTION_ITEMS.find((a) => a.id === slot.itemId)!.text
      : (getItem(slot.itemId).text[slot.wording] as string)

  const onNext = ({ verdict, confidence, ms, changes }: { verdict: VerdictValue; confidence: number; ms: number; changes: number }) => {
    const key = slotKey(slot)
    const answer: ItemAnswer = {
      itemId: slot.itemId,
      wording: slot.kind === 'item' ? slot.wording : null,
      position: index + 1,
      verdict,
      confidence,
      ms,
      changes,
    }
    const next = { ...answers, [key]: answer }
    logEvent('item', { name: 'answered', key, ...answer })
    setAnswers(next)
    if (index + 1 >= sequence.length) advance({ answers: next })
    else update({ answers: next })
    window.scrollTo?.(0, 0)
  }

  return (
    <main className="page page-wide">
      <div className="item-progress" aria-label={`Situation ${index + 1} of ${TOTAL}`}>
        <span style={{ width: `${(index / TOTAL) * 100}%` }} />
      </div>
      <ItemCard key={slotKey(slot)} label={`Situation ${index + 1} of ${TOTAL}`} text={text} onNext={onNext} />
    </main>
  )
}
