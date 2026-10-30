// The set-up step before the chat, the same in every arm: the instructions box (D0), with the
// set-up framing as its first line. Proposed Oct 29, 2026; wording DRAFT.
import { useRef, useState } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent } from '../log/logEvent'
import { INSTRUCTIONS } from './sessionText'
import type { Part2StageProps } from './stageProps'

/** Longest instructions text kept (like a custom-instructions field). */
export const MAX_INSTRUCTIONS_CHARS = 1500

export function Instructions({ advance }: Part2StageProps) {
  const [text, setText] = useState('')
  const startedVisible = useRef(visibleMs())
  return (
    <main className="page page-wide">
      {INSTRUCTIONS.isDraft && <p className="notice notice-warn small">DRAFT instructions text. Review before launch.</p>}
      <h1>{INSTRUCTIONS.title}</h1>
      {INSTRUCTIONS.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <label htmlFor="instructions" className="strong">
        {INSTRUCTIONS.label}
      </label>
      <textarea
        id="instructions"
        className="input chat-input"
        rows={6}
        maxLength={MAX_INSTRUCTIONS_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="instructions-note"
      />
      <p id="instructions-note" className="muted small">
        {INSTRUCTIONS.privacyNote}
      </p>
      <div className="page-spacer" />
      <button
        type="button"
        className="btn btn-study"
        onClick={() => {
          const trimmed = text.trim()
          const result = { text: trimmed, chars: trimmed.length, ms: Math.round(visibleMs() - startedVisible.current) }
          // Only the length is logged; the text is saved on the record for the export.
          logEvent('survey', { event: 'instructions', chars: result.chars, ms: result.ms, version: INSTRUCTIONS.version })
          advance({ writtenInstructions: result }, ['chatStartedAt'])
        }}
      >
        {INSTRUCTIONS.continue}
      </button>
    </main>
  )
}
