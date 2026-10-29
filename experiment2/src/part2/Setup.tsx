// The two set-up steps before the chat, the same in every arm: connecting the assistant to the
// apps (the set-up framing) and the instructions box (D0). Proposed Oct 29, 2026; wording DRAFT.
import { useRef, useState } from 'react'
import { visibleMs } from '../log/clock'
import { logEvent } from '../log/logEvent'
import { CONNECT, INSTRUCTIONS } from './sessionText'
import type { Part2StageProps } from './stageProps'

/** Longest instructions text kept (like a custom-instructions field). */
export const MAX_INSTRUCTIONS_CHARS = 1500

export function ConnectApps({ advance }: Part2StageProps) {
  const [connected, setConnected] = useState<string[]>([])
  const all = CONNECT.apps.every((a) => connected.includes(a.id))
  return (
    <main className="page page-wide">
      {CONNECT.isDraft && <p className="notice notice-warn small">DRAFT set-up text. Review before launch.</p>}
      <h1>{CONNECT.title}</h1>
      <p>{CONNECT.intro}</p>
      <ul className="connect-list">
        {CONNECT.apps.map((app) => {
          const done = connected.includes(app.id)
          return (
            <li key={app.id} className="connect-card">
              <div className="connect-info">
                <span className="connect-name">{app.name}</span>
                <span className="muted small">{app.detail}</span>
              </div>
              <button
                type="button"
                className={`btn connect-button ${done ? 'connect-done' : 'btn-study'}`}
                aria-pressed={done}
                aria-label={done ? `${app.name}: ${CONNECT.connected}` : `${CONNECT.connect} ${app.name}`}
                disabled={done}
                onClick={() => {
                  logEvent('survey', { event: 'app_connected', app: app.id })
                  setConnected((c) => [...c, app.id])
                }}
              >
                {done ? `✓ ${CONNECT.connected}` : CONNECT.connect}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="muted small">{CONNECT.canDo}</p>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" disabled={!all} onClick={() => advance()}>
        {CONNECT.continue}
      </button>
    </main>
  )
}

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
