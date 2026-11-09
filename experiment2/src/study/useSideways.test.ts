import { describe, expect, it } from 'vitest'
import { isSideways } from './useSideways'

const phone = (type: string | null, width: number, height: number) =>
  ({ orientation: type ? { type } : undefined, width, height }) as unknown as Screen
const win = (orientation?: number) => ({ orientation }) as unknown as Window

describe('isSideways', () => {
  it('is false for an upright phone, even when the keyboard makes the page wider than tall', () => {
    expect(isSideways(phone('portrait-primary', 390, 844), win())).toBe(false)
  })

  it('is true for a phone turned sideways', () => {
    expect(isSideways(phone('landscape-primary', 844, 390), win())).toBe(true)
  })

  it('is false for a sideways tablet or computer', () => {
    expect(isSideways(phone('landscape-primary', 1366, 1024), win())).toBe(false)
  })

  it('falls back to window.orientation without screen.orientation', () => {
    expect(isSideways(phone(null, 390, 844), win(90))).toBe(true)
    expect(isSideways(phone(null, 390, 844), win(0))).toBe(false)
  })
})
