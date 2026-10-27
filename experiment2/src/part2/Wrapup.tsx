import { useEffect, useRef, useState } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent } from '../log/logEvent'
import { DEBRIEF } from './sessionText'
import type { Part2StageProps } from './stageProps'

/** Filler length (pipeline: "a short unrelated filler task"; shortened from 3 to 2 minutes, Oct 27). */
export const FILLER_MS = 2 * 60_000

/** Unrelated to privacy or apps on purpose. Letters are scrambled the same way for everyone. */
export const ANAGRAMS: { answer: string; letters: string }[] = [
  { answer: 'GARDEN', letters: 'DRANGE' },
  { answer: 'PLANET', letters: 'TPLEAN' },
  { answer: 'WINTER', letters: 'TWINER' },
  { answer: 'CASTLE', letters: 'TECSAL' },
  { answer: 'PENCIL', letters: 'CLIPEN' },
  { answer: 'BOTTLE', letters: 'TBLETO' },
  { answer: 'ORANGE', letters: 'GONEAR' },
  { answer: 'FOREST', letters: 'SOFTER' },
  { answer: 'BRIDGE', letters: 'GIRDBE' },
  { answer: 'SILVER', letters: 'LIVERS' },
]

/** Accepts the intended word, or any word using the same letters (e.g. DANGER for GARDEN), ignoring case and spaces. */
export function solves(guess: string, answer: string): boolean {
  const g = guess.replace(/\s/g, '').toUpperCase()
  return g.length === answer.length && [...g].sort().join('') === [...answer].sort().join('') && /^[A-Z]+$/.test(g)
}

/**
 * Word puzzles for about two minutes, between the chat and the questionnaire. Continue shows
 * when the time is up, or earlier if every word is solved. Only counts are saved.
 */
export function Filler({ advance }: Part2StageProps) {
  const [guesses, setGuesses] = useState<string[]>(() => ANAGRAMS.map(() => ''))
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(performance.now())
  const startedVisible = useRef(visibleMs())

  useEffect(() => {
    logEvent('survey', { event: 'filler_start' })
    const timer = setInterval(() => setElapsed(performance.now() - startedAt.current), 1000)
    return () => clearInterval(timer)
  }, [])

  const solved = guesses.filter((g, i) => solves(g, ANAGRAMS[i].answer)).length
  const canContinue = elapsed >= FILLER_MS || solved === ANAGRAMS.length
  const left = Math.max(0, Math.ceil((FILLER_MS - elapsed) / 1000))

  const finish = () => {
    const result = { solved, attempted: guesses.filter((g) => g.trim()).length, ms: visibleMs() - startedVisible.current }
    logEvent('survey', { event: 'filler_done', ...result })
    advance({ filler: result })
  }

  return (
    <main className="page page-wide">
      <h1>A short puzzle</h1>
      <p>Unscramble as many words as you can. You can continue after two minutes.</p>
      <ol className="anagram-list">
        {ANAGRAMS.map((a, i) => {
          const ok = solves(guesses[i], a.answer)
          return (
            <li key={a.answer} className="anagram">
              <span className="anagram-letters" aria-hidden="true">
                {a.letters}
              </span>
              <input
                className="input"
                aria-label={`Word ${i + 1}: unscramble ${a.letters.split('').join(' ')}`}
                value={guesses[i]}
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                readOnly={ok}
                onChange={(e) => setGuesses((g) => g.map((v, j) => (j === i ? e.target.value : v)))}
              />
              {ok && <span className="anagram-solved visually-hidden">Solved</span>}
            </li>
          )
        })}
      </ol>
      <p className="muted" role="status">
        {solved} of {ANAGRAMS.length} solved{canContinue ? '' : ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`}
      </p>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" disabled={!canContinue} onClick={finish}>
        Continue
      </button>
    </main>
  )
}

/** Full debrief (pipeline step 7), disclosing Part 1's cover story, with the option to withdraw. */
export function Debrief({ advance }: Part2StageProps) {
  const [withdraw, setWithdraw] = useState(false)
  return (
    <main className="page page-wide">
      {DEBRIEF.isDraft && <p className="notice notice-warn small">DRAFT debrief text. Review before launch.</p>}
      <h1>{DEBRIEF.title}</h1>
      {DEBRIEF.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p>{DEBRIEF.withdraw}</p>
      <label className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" className="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} />
        <span>{DEBRIEF.withdrawLabel}</span>
      </label>
      <p className="muted small">{DEBRIEF.contact}</p>
      <div className="page-spacer" />
      <button
        type="button"
        className="btn btn-study"
        onClick={() => {
          logEvent('survey', { event: 'debrief', withdrawRequested: withdraw, version: DEBRIEF.version })
          advance({ withdrawRequested: withdraw }, ['debriefAt', 'completedAt'])
        }}
      >
        {DEBRIEF.continue}
      </button>
    </main>
  )
}
