import type { Friction } from '../bramble/types'
import type { Mode, ProlificParams } from './types'

export interface Entry {
  mode: Mode
  /** null when the link is missing Prolific's parameters. */
  params: ProlificParams | null
  /** Demo links choose the level; everyone else is randomized. */
  demoFriction: Friction | null
}

const DEMO_PARAMS: ProlificParams = { prolificPid: 'DEMO', studyId: 'DEMO', sessionId: 'DEMO' }

// Used as Firestore document IDs, so no slashes; Prolific IDs are 24 hex characters.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

export function parseEntry(search: string): Entry {
  const q = new URLSearchParams(search)
  const demo = q.get('demo')
  if (demo === 'nudged' || demo === 'neutral') {
    return { mode: 'demo', params: DEMO_PARAMS, demoFriction: demo }
  }
  const mode: Mode = q.get('pilot') === '1' ? 'pilot' : 'study'
  const prolificPid = q.get('PROLIFIC_PID') ?? ''
  const studyId = q.get('STUDY_ID') ?? ''
  const sessionId = q.get('SESSION_ID') ?? ''
  const valid = [prolificPid, studyId, sessionId].every((v) => SAFE_ID.test(v))
  return { mode, params: valid ? { prolificPid, studyId, sessionId } : null, demoFriction: null }
}

const env = import.meta.env
export const COMPLETION_CODE: string = env.VITE_PROLIFIC_COMPLETION_CODE || 'TEST-COMPLETE'
/** For participants who can't continue because of a technical problem. */
export const RETURN_CODE: string = env.VITE_PROLIFIC_RETURN_CODE || 'TEST-RETURN'

export function completionUrl(code: string): string {
  return `https://app.prolific.com/submissions/complete?cc=${encodeURIComponent(code)}`
}
