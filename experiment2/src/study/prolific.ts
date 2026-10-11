import type { TaskNumber } from '../bramble/types'
import { UNITS, patternKey, uniformUnits, type UnitId } from '../core/units'
import type { AgentMeta, Mode, ProlificParams } from './types'

export interface AgentEntry extends AgentMeta {
  /** Nudged decision screens: the matched participant's, their mirror image, or all/none. */
  nudgedUnits: UnitId[]
  taskOrder: TaskNumber[]
  /** The person the agent acts for, used in the app's greeting (the pipeline's "[name]"). */
  name: string | null
}

export interface Entry {
  mode: Mode
  /** null when the link is missing Prolific's parameters (or an agent link is invalid). */
  params: ProlificParams | null
  /**
   * Demo links: the nudged-screen pattern to preview ("" = all neutral, "U1…U6" = all nudged),
   * or null for ?demo=mixed (a random 3-of-6 pattern, as participants get). Not used otherwise.
   */
  demoPattern?: string | null
  /** Set for agent links (?agent=1). */
  agent?: AgentEntry | null
  /** Why an agent link was rejected, for the harness to report. */
  invalid?: string
  /** &anydevice=1 on a local or emulator run: skip the phone check for testing on a computer. */
  skipDeviceCheck?: boolean
}

/**
 * Testing on a computer is allowed only on the local dev server or against the emulators,
 * never on the deployed study, so real participants can't skip the phone check.
 */
export const DEVICE_SKIP_ALLOWED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_USE_EMULATORS === 'true' || !import.meta.env.VITE_FIREBASE_PROJECT_ID

const DEMO_PARAMS: ProlificParams = { prolificPid: 'DEMO', studyId: 'DEMO', sessionId: 'DEMO' }

// Used as Firestore document IDs, so no slashes; Prolific IDs are 24 hex characters.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

/** Task order rules from the protocol: all six tasks, Task 1 before Task 2 (a store is set before ordering), Task 3 straight after Task 2, Task 6 last. */
export function validTaskOrder(order: number[]): order is TaskNumber[] {
  return (
    order.length === 6 &&
    [...order].sort().join('') === '123456' &&
    order[5] === 6 &&
    order.indexOf(1) < order.indexOf(2) &&
    order[order.indexOf(2) + 1] === 3
  )
}

/**
 * Agent episode link, built by the Experiment 4 harness:
 * ?agent=1&EPISODE_ID=…&nudged=U1-U3-U5&taskOrder=4-1-2-3-5-6
 *   [&NAME=…&MODEL=…&CONDITION=…&RUN=…&PARTICIPANT=…]
 * `nudged` lists the nudged decision screens (U1–U6), or `none` / `all`. Normally the matched
 * participant's pattern, so the agent meets the same screens; or its mirror image.
 */
function parseNudged(value: string | null): UnitId[] | null {
  if (value === 'none') return []
  if (value === 'all') return [...UNITS]
  if (!value) return null
  const parts = value.split('-')
  if (!parts.every((p): p is UnitId => (UNITS as readonly string[]).includes(p))) return null
  if (new Set(parts).size !== parts.length) return null
  return UNITS.filter((u) => parts.includes(u))
}

function parseAgent(q: URLSearchParams): Entry {
  const reject = (invalid: string): Entry => ({ mode: 'agent', params: null, agent: null, invalid })
  const episodeId = q.get('EPISODE_ID') ?? ''
  if (!SAFE_ID.test(episodeId)) return reject('EPISODE_ID is missing or not a safe ID')
  const nudgedUnits = parseNudged(q.get('nudged'))
  if (!nudgedUnits) return reject('nudged must be none, all, or units U1-U6 joined by "-" (e.g. U1-U3-U5)')
  const taskOrder = (q.get('taskOrder') ?? '').split('-').map(Number)
  if (!validTaskOrder(taskOrder)) return reject('taskOrder must list tasks 1-6, with 1 before 2, 3 right after 2, and 6 last')
  const text = (key: string) => {
    const v = q.get(key)?.trim()
    return v ? v.slice(0, 100) : null
  }
  const run = Number(q.get('RUN'))
  return {
    mode: 'agent',
    params: { prolificPid: `AGENT-${episodeId}`, studyId: 'AGENT', sessionId: episodeId },
    agent: {
      episodeId,
      nudgedUnits,
      taskOrder,
      name: text('NAME'),
      model: text('MODEL'),
      condition: text('CONDITION'),
      run: Number.isInteger(run) && run > 0 ? run : null,
      participant: text('PARTICIPANT'),
    },
  }
}

export function parseEntry(search: string, allowDeviceSkip: boolean = DEVICE_SKIP_ALLOWED): Entry {
  const q = new URLSearchParams(search)
  if (q.get('agent') === '1') return parseAgent(q)
  const skipDeviceCheck = allowDeviceSkip && q.get('anydevice') === '1'
  const withSkip = (entry: Entry): Entry => (skipDeviceCheck ? { ...entry, skipDeviceCheck } : entry)
  const demo = q.get('demo')
  if (demo === 'nudged' || demo === 'neutral') {
    return { mode: 'demo', params: DEMO_PARAMS, demoPattern: patternKey(uniformUnits(demo)) }
  }
  if (demo === 'mixed') return { mode: 'demo', params: DEMO_PARAMS, demoPattern: null }
  const mode: Mode = q.get('pilot') === '1' ? 'pilot' : 'study'
  // Participant codes handed out directly (e.g. to students), instead of a Prolific link.
  const code = q.get('code')
  if (code !== null) {
    const valid = SAFE_ID.test(code)
    return withSkip({
      mode,
      params: valid ? { prolificPid: code, studyId: 'CODE', sessionId: 'CODE', recruitment: 'code' } : null,
    })
  }
  const prolificPid = q.get('PROLIFIC_PID') ?? ''
  const studyId = q.get('STUDY_ID') ?? ''
  const sessionId = q.get('SESSION_ID') ?? ''
  const valid = [prolificPid, studyId, sessionId].every((v) => SAFE_ID.test(v))
  return withSkip({
    mode,
    params: valid ? { prolificPid, studyId, sessionId, recruitment: 'prolific' } : null,
  })
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
