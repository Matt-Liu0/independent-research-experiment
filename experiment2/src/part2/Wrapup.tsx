import { useState } from 'react'
import { logEvent } from '../log/logEvent'
import { DEBRIEF } from './sessionText'
import type { Part2StageProps } from './stageProps'

/** Full debrief (pipeline step 7), at the end of Part 3, disclosing Part 1's cover story, with the option to withdraw. */
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
