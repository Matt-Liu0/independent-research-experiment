import { describe, expect, it } from 'vitest'
import { detectDevice, detectOs } from './device'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15'

const nav = (userAgent: string, maxTouchPoints: number) => ({ userAgent, maxTouchPoints }) as Navigator
const scr = (width: number, height: number) => ({ width, height }) as Screen

describe('device check', () => {
  it('detects the OS', () => {
    expect(detectOs(IPHONE)).toBe('ios')
    expect(detectOs(ANDROID)).toBe('android')
    expect(detectOs(MAC)).toBe('other')
  })

  it('passes phones', () => {
    expect(detectDevice(nav(IPHONE, 5), scr(390, 844)).passedCheck).toBe(true)
    expect(detectDevice(nav(ANDROID, 5), scr(412, 915)).passedCheck).toBe(true)
  })

  it('passes a phone held sideways (the short side is what counts)', () => {
    expect(detectDevice(nav(IPHONE, 5), scr(844, 390)).passedCheck).toBe(true)
  })

  it('fails computers and tablets', () => {
    expect(detectDevice(nav(MAC, 0), scr(1512, 982)).passedCheck).toBe(false)
    // iPadOS reports a Mac user agent with touch.
    expect(detectDevice(nav(MAC, 5), scr(820, 1180)).passedCheck).toBe(false)
    expect(detectDevice(nav(ANDROID, 5), scr(800, 1280)).passedCheck).toBe(false)
  })
})
