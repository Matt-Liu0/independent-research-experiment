import { DEVICE_SKIP_ALLOWED } from '../study/prolific'
import type { DeviceInfo, ProlificParams } from '../study/types'
import { detectOs } from '../study/device'
import type { Variant } from './types'

export type Part2Mode = 'study' | 'pilot' | 'demo'

export interface Part2Entry {
  variant: Variant
  mode: Part2Mode
  params: ProlificParams | null
  skipDeviceCheck?: boolean
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/

/** norming.html is the norming survey; every other page of this entry is Part 2. */
export function variantOf(pathname: string): Variant {
  return /norming(\.html)?\/?$/.test(pathname) ? 'norming' : 'part2'
}

/** Same links as Part 1: Prolific parameters, or &code= for handed-out codes; ?demo=1 saves nothing; &pilot=1 uses pilot_ collections. */
export function parsePart2Entry(search: string, pathname: string, allowDeviceSkip = DEVICE_SKIP_ALLOWED): Part2Entry {
  const variant = variantOf(pathname)
  const q = new URLSearchParams(search)
  if (q.get('demo') === '1') {
    return { variant, mode: 'demo', params: { prolificPid: 'DEMO', studyId: 'DEMO', sessionId: 'DEMO' }, skipDeviceCheck: true }
  }
  const mode: Part2Mode = q.get('pilot') === '1' ? 'pilot' : 'study'
  const skipDeviceCheck = allowDeviceSkip && q.get('anydevice') === '1'
  const code = q.get('code')
  if (code !== null) {
    return {
      variant,
      mode,
      skipDeviceCheck,
      params: SAFE_ID.test(code) ? { prolificPid: code, studyId: 'CODE', sessionId: 'CODE', recruitment: 'code' } : null,
    }
  }
  const [prolificPid, studyId, sessionId] = ['PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'].map((k) => q.get(k) ?? '')
  const valid = [prolificPid, studyId, sessionId].every((v) => SAFE_ID.test(v))
  return { variant, mode, skipDeviceCheck, params: valid ? { prolificPid, studyId, sessionId, recruitment: 'prolific' } : null }
}

/**
 * Part 2 needs a computer (typed answers on a phone are shorter, protocol "Why these devices");
 * the norming survey takes any device. iPads report a Mac user agent, so a touch "Mac" counts as a tablet.
 */
export function detectPart2Device(variant: Variant, nav: Navigator = navigator, scr: Screen = screen): DeviceInfo {
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
    passedCheck: variant === 'norming' || computer,
    automated: nav.webdriver === true,
  }
}

const env = import.meta.env
/** Prolific completion codes for Part 2 and the norming survey (set in .env before launch). */
export const PART2_COMPLETION_CODE: string = env.VITE_PROLIFIC_PART2_CODE || 'TEST-PART2'
export const NORMING_COMPLETION_CODE: string = env.VITE_PROLIFIC_NORMING_CODE || 'TEST-NORMING'
