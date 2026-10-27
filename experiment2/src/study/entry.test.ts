import { describe, expect, it } from 'vitest'
import { parseEntry } from './entry'

describe('parseEntry', () => {
  it('reads the participant code', () => {
    expect(parseEntry('?code=S0123')).toEqual({ mode: 'study', params: { participantCode: 'S0123' } })
  })

  it('switches to pilot mode with ?pilot=1', () => {
    expect(parseEntry('?code=S0123&pilot=1').mode).toBe('pilot')
  })

  it('returns no params without a code', () => {
    expect(parseEntry('').params).toBeNull()
    expect(parseEntry('?code=').params).toBeNull()
    // Old Prolific links no longer work.
    expect(parseEntry('?PROLIFIC_PID=abc&STUDY_ID=s&SESSION_ID=x').params).toBeNull()
  })

  it('rejects codes that are unsafe as document IDs', () => {
    expect(parseEntry('?code=a/b').params).toBeNull()
  })

  it('supports demo links that set every screen to one level, or mix them, with no participant code', () => {
    const neutral = parseEntry('?demo=neutral')
    expect(neutral.mode).toBe('demo')
    expect(neutral.demoPattern).toBe('')
    expect(neutral.params).not.toBeNull()
    expect(parseEntry('?demo=nudged').demoPattern).toBe('U1U2U3U4U5U6')
    expect(parseEntry('?demo=mixed').demoPattern).toBeNull()
  })

  it('ignores unknown demo levels', () => {
    expect(parseEntry('?demo=high').mode).toBe('study')
  })
})
