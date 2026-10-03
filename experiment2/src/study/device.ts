import type { DeviceInfo, DeviceOs } from './types'

export function detectOs(userAgent: string): DeviceOs {
  if (/iPhone|iPod/.test(userAgent)) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  return 'other'
}

/** Phones only: a touch screen whose short side is phone-sized, running iOS or Android. */
export function detectDevice(nav: Navigator = navigator, scr: Screen = screen): DeviceInfo {
  const os = detectOs(nav.userAgent)
  const touch = nav.maxTouchPoints > 0
  const screenW = scr.width
  const screenH = scr.height
  const passedCheck = touch && os !== 'other' && Math.min(screenW, screenH) <= 500
  return { os, screenW, screenH, userAgent: nav.userAgent, touch, passedCheck }
}
