import type { Friction, TaskNumber } from '../bramble/types'
import type { AgentMeta, Mode, ProlificParams } from './types'

export interface AgentEntry extends AgentMeta {
  friction: Friction
  taskOrder: TaskNumber[]
  /** The person the agent acts for, used in the app's greeting (the pipeline's "[name]"). */
  name: string | null
}

export interface Entry {
  mode: Mode
  /** null when the link is missing Prolific's parameters (or an agent link is invalid). */
  params: ProlificParams | null
  /** Demo links choose the level; everyone else is randomized. */
  demoFriction: Friction | null
  /** Set for agent links (?agent=1). */
  agent?: AgentEntry | null
  /** Why an agent link was rejected, for the harness to report. */
  invalid?: string
}

const DEMO_PARAMS: ProlificParams = { prolificPid: 'DEMO', studyId: 'DEMO', sessionId: 'DEMO' }

// Used as Firestore document IDs, so no slashes; Prolific IDs are 24 hex characters.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

/** Task order rules from the protocol: all six tasks, Task 3 straight after Task 2, Task 6 last. */
export function validTaskOrder(order: number[]): order is TaskNumber[] {
  return (
    order.length === 6 &&
    [...order].sort().join('') === '123456' &&
    order[5] === 6 &&
    order[order.indexOf(2) + 1] === 3
  )
}

/**
 * Agent episode link, built by the Experiment 4 harness:
 * ?agent=1&EPISODE_ID=…&friction=nudged|neutral&taskOrder=4-1-2-3-5-6
 *   [&NAME=…&MODEL=…&CONDITION=…&RUN=…&PARTICIPANT=…]
 * The level and task order are the matched participant's, so the agent meets the same screens.
 */
function parseAgent(q: URLSearchParams): Entry {
  const reject = (invalid: string): Entry => ({ mode: 'agent', params: null, demoFriction: null, agent: null, invalid })
  const episodeId = q.get('EPISODE_ID') ?? ''
  if (!SAFE_ID.test(episodeId)) return reject('EPISODE_ID is missing or not a safe ID')
  const friction = q.get('friction')
  if (friction !== 'nudged' && friction !== 'neutral') return reject('friction must be nudged or neutral')
  const taskOrder = (q.get('taskOrder') ?? '').split('-').map(Number)
  if (!validTaskOrder(taskOrder)) return reject('taskOrder must list tasks 1-6, with 3 right after 2 and 6 last')
  const text = (key: string) => {
    const v = q.get(key)?.trim()
    return v ? v.slice(0, 100) : null
  }
  const run = Number(q.get('RUN'))
  return {
    mode: 'agent',
    params: { prolificPid: `AGENT-${episodeId}`, studyId: 'AGENT', sessionId: episodeId },
    demoFriction: null,
    agent: {
      episodeId,
      friction,
      taskOrder,
      name: text('NAME'),
      model: text('MODEL'),
      condition: text('CONDITION'),
      run: Number.isInteger(run) && run > 0 ? run : null,
      participant: text('PARTICIPANT'),
    },
  }
}

export function parseEntry(search: string): Entry {
  const q = new URLSearchParams(search)
  if (q.get('agent') === '1') return parseAgent(q)
  const demo = q.get('demo')
  if (demo === 'nudged' || demo === 'neutral') {
    return { mode: 'demo', params: DEMO_PARAMS, demoFriction: demo }
  }
  const mode: Mode = q.get('pilot') === '1' ? 'pilot' : 'study'
  // Participant codes handed out directly (e.g. to students), instead of a Prolific link.
  const code = q.get('code')
  if (code !== null) {
    const valid = SAFE_ID.test(code)
    return {
      mode,
      params: valid ? { prolificPid: code, studyId: 'CODE', sessionId: 'CODE', recruitment: 'code' } : null,
      demoFriction: null,
    }
  }
  const prolificPid = q.get('PROLIFIC_PID') ?? ''
  const studyId = q.get('STUDY_ID') ?? ''
  const sessionId = q.get('SESSION_ID') ?? ''
  const valid = [prolificPid, studyId, sessionId].every((v) => SAFE_ID.test(v))
  return {
    mode,
    params: valid ? { prolificPid, studyId, sessionId, recruitment: 'prolific' } : null,
    demoFriction: null,
  }
}

const env = import.meta.env
export const COMPLETION_CODE: string = env.VITE_PROLIFIC_COMPLETION_CODE || 'TEST-COMPLETE'
/** For participants who can't continue because of a technical problem. */
export const RETURN_CODE: string = env.VITE_PROLIFIC_RETURN_CODE || 'TEST-RETURN'

/** True when the participant came from Prolific (so endings send them back there). */
export function fromProlific(recruitment: string | undefined): boolean {
  return recruitment !== 'code'
}

export function completionUrl(code: string): string {
  return `https://app.prolific.com/submissions/complete?cc=${encodeURIComponent(code)}`
}
