import { describe, expect, it } from 'vitest'
import { completionUrl, parseEntry } from './prolific'

const full = '?PROLIFIC_PID=5f1a2b3c4d5e6f7a8b9c0d1e&STUDY_ID=study1&SESSION_ID=sess1'

describe('parseEntry', () => {
  it('reads Prolific parameters', () => {
    expect(parseEntry(full)).toEqual({
      mode: 'study',
      params: { prolificPid: '5f1a2b3c4d5e6f7a8b9c0d1e', studyId: 'study1', sessionId: 'sess1', recruitment: 'prolific' },
      demoFriction: null,
    })
  })

  it('switches to pilot mode with ?pilot=1', () => {
    expect(parseEntry(`${full}&pilot=1`).mode).toBe('pilot')
  })

  it('returns no params when any is missing', () => {
    expect(parseEntry('?PROLIFIC_PID=abc&STUDY_ID=s').params).toBeNull()
    expect(parseEntry('').params).toBeNull()
  })

  it('rejects IDs that are unsafe as document IDs', () => {
    expect(parseEntry('?PROLIFIC_PID=a/b&STUDY_ID=s&SESSION_ID=x').params).toBeNull()
  })

  it('supports demo links that pick the level and need no Prolific IDs', () => {
    const entry = parseEntry('?demo=neutral')
    expect(entry.mode).toBe('demo')
    expect(entry.demoFriction).toBe('neutral')
    expect(entry.params).not.toBeNull()
  })

  it('ignores unknown demo levels', () => {
    expect(parseEntry('?demo=high').mode).toBe('study')
  })
})

describe('completionUrl', () => {
  it('builds the Prolific completion link', () => {
    expect(completionUrl('C1A2B3')).toBe('https://app.prolific.com/submissions/complete?cc=C1A2B3')
  })
})

describe('participant codes', () => {
  it('accepts a code instead of Prolific IDs', () => {
    expect(parseEntry('?code=S0123')).toEqual({
      mode: 'study',
      params: { prolificPid: 'S0123', studyId: 'CODE', sessionId: 'CODE', recruitment: 'code' },
      demoFriction: null,
    })
    expect(parseEntry('?code=S0123&pilot=1').mode).toBe('pilot')
  })

  it('rejects unsafe codes', () => {
    expect(parseEntry('?code=a/b').params).toBeNull()
    expect(parseEntry('?code=').params).toBeNull()
  })

  it('marks Prolific entries as such', () => {
    expect(parseEntry('?PROLIFIC_PID=p1&STUDY_ID=s&SESSION_ID=x').params?.recruitment).toBe('prolific')
  })
})
