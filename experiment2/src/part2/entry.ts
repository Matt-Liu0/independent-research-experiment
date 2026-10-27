import { DEVICE_SKIP_ALLOWED } from '../study/prolific'
import type { DeviceInfo, ProlificParams } from '../study/types'
import { detectOs } from '../study/device'
import type { Arm } from './types'

export type Part2Mode = 'study' | 'pilot' | 'demo'

export interface Part2Entry {
  mode: Part2Mode
  params: ProlificParams | null
  skipDeviceCheck?: boolean
  /** Demo and pilot links only: &arm=open|structured|case picks the interview arm, to try each one. */
  arm?: Arm
}

function armParam(q: URLSearchParams): Arm | undefined {
  const arm = q.get('arm')
  return arm === 'open' || arm === 'structured' || arm === 'case' ? arm : undefined
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

/** Same links as Part 1: Prolific parameters, or &code= for handed-out codes; ?demo=1 saves nothing; &pilot=1 uses pilot_ collections. */
export function parsePart2Entry(search: string, allowDeviceSkip = DEVICE_SKIP_ALLOWED): Part2Entry {
  const q = new URLSearchParams(search)
  if (q.get('demo') === '1') {
    return { mode: 'demo', params: { prolificPid: 'DEMO', studyId: 'DEMO', sessionId: 'DEMO' }, skipDeviceCheck: true, arm: armParam(q) }
  }
  const mode: Part2Mode = q.get('pilot') === '1' ? 'pilot' : 'study'
  const arm = mode === 'pilot' ? armParam(q) : undefined
  const skipDeviceCheck = allowDeviceSkip && q.get('anydevice') === '1'
  const code = q.get('code')
  if (code !== null) {
    return {
      mode,
      skipDeviceCheck,
      arm,
      params: SAFE_ID.test(code) ? { prolificPid: code, studyId: 'CODE', sessionId: 'CODE', recruitment: 'code' } : null,
    }
  }
  const [prolificPid, studyId, sessionId] = ['PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'].map((k) => q.get(k) ?? '')
  const valid = [prolificPid, studyId, sessionId].every((v) => SAFE_ID.test(v))
  return { mode, skipDeviceCheck, arm, params: valid ? { prolificPid, studyId, sessionId, recruitment: 'prolific' } : null }
}

/**
 * Part 2 needs a computer (typed answers on a phone are shorter, protocol "Why these devices").
 * iPads report a Mac user agent, so a touch "Mac" counts as a tablet.
 */
export function detectPart2Device(nav: Navigator = navigator, scr: Screen = screen): DeviceInfo {
  const os = detectOs(nav.userAgent)
  const touch = nav.maxTouchPoints > 0
  const tablet = /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1
  const computer = os === 'other' && !tablet && Math.min(scr.width, scr.height) >= 600
  return {
    os,
    screenW: scr.width,
    screenH: scr.height,
    userAgent: nav.userAgent,
    touch,
    passedCheck: computer,
    automated: nav.webdriver === true,
  }
}

const env = import.meta.env
/** Prolific completion code for Part 2 (set in .env before launch). */
export const PART2_COMPLETION_CODE: string = env.VITE_PROLIFIC_PART2_CODE || 'TEST-PART2'
