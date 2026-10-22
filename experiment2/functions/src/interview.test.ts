import { afterEach, describe, expect, it } from 'vitest'
import {
  CHAT_OPENED,
  DOMAIN_MS,
  NEXT_MARKER,
  addFixed,
  addModelReply,
  addParticipant,
  apiMessages,
  availableArms,
  finish,
  pickArm,
  startInterview,
  startNextDomain,
  step,
  summary,
  type InterviewState,
} from './interview'
import { CASE_SET, CLOSING, OPENERS } from './prompts'

const T0 = 1_000_000

/** Participant says something, then the interviewer answers as step() directs (the model's reply given). */
function exchange(s: InterviewState, said: string, modelReply = 'Can you tell me more?', now = T0 + 1000): InterviewState {
  let next = addParticipant(s, said, now)!
  const action = step(next, now)
  if (action.kind === 'fixed') return addFixed(next, action.turn, now)
  if (action.kind === 'next_domain') return startNextDomain(next, now)
  if (action.kind === 'finish') return finish(next, now)
  const { state, domainDone } = addModelReply(next, modelReply, 'claude-sonnet-5-5', now)
  next = state
  if (domainDone) next = next.domainIndex === 0 ? startNextDomain(next, now) : finish(next, now)
  return next
}

afterEach(() => {
  CASE_SET.location.length = 0
  CASE_SET.health.length = 0
})

describe('arm assignment', () => {
  it('leaves the case arm out until the case set has cases for both domains', () => {
    expect(availableArms()).toEqual(['open', 'structured'])
    CASE_SET.location.push({ id: 'store_location', text: 'A.' })
    expect(availableArms()).toEqual(['open', 'structured'])
    CASE_SET.health.push({ id: 'stride_health_access', text: 'B.' })
    expect(availableArms()).toEqual(['open', 'structured', 'case'])
  })

  it('picks the least-used arm', () => {
    expect(pickArm({ open: 3, structured: 2 })).toBe('structured')
    expect(pickArm({ open: 1, structured: 1 }, () => 0)).toBe('open')
    expect(pickArm({ open: 1, structured: 1 }, () => 0.99)).toBe('structured')
  })
})

describe('open-ended arm', () => {
  it('opens with the fixed prompt, allows three follow-ups per domain, then moves on with the fixed opener', () => {
    let s = startInterview('open', T0)
    expect(s.turns).toEqual([expect.objectContaining({ role: 'interviewer', text: OPENERS.open.location, source: 'fixed' })])
    for (let i = 0; i < 3; i++) s = exchange(s, `answer ${i}`)
    expect(s.turns.filter((t) => t.source === 'model')).toHaveLength(3)
    s = exchange(s, 'answer 3')
    expect(s.domainIndex).toBe(1)
    expect(s.turns.at(-1)).toMatchObject({ text: OPENERS.open.health, domain: 'health' })
    for (let i = 0; i < 4; i++) s = exchange(s, `health ${i}`)
    expect(s.done).toBe(true)
    expect(s.turns.at(-1)?.text).toBe(CLOSING)
  })

  it('ignores the end marker: only the turn limit ends a domain', () => {
    const s = exchange(startInterview('open', T0), 'hi', `Thanks. ${NEXT_MARKER}`)
    expect(s.domainIndex).toBe(0)
    expect(s.turns.at(-1)?.text).toBe('Thanks.')
  })
})

describe('structured arm', () => {
  it('moves on when the model ends the domain, and finishes after the second', () => {
    let s = startInterview('structured', T0)
    s = exchange(s, 'the app only', 'And who might receive it?')
    s = exchange(s, 'nobody else', `Thank you. ${NEXT_MARKER}`)
    expect(s.domainIndex).toBe(1)
    expect(s.turns.at(-2)?.text).toBe('Thank you.')
    expect(s.turns.at(-1)?.text).toBe(OPENERS.structured.health)
    s = exchange(s, 'fine', `Thanks! ${NEXT_MARKER}`)
    expect(s.done).toBe(true)
  })
})

describe('case arm', () => {
  it('shows each case as fixed text, then lets the model state the rule', () => {
    CASE_SET.location.push({ id: 'a', text: 'Case A.' }, { id: 'b', text: 'Case B.' })
    CASE_SET.health.push({ id: 'c', text: 'Case C.' })
    let s = startInterview('case', T0)
    expect(s.turns.map((t) => t.caseId)).toEqual([undefined, 'a'])
    expect(s.turns[1].text).toContain('Situation 1 of 2: Case A.')
    s = exchange(s, 'allow')
    expect(s.turns.at(-1)).toMatchObject({ caseId: 'b', source: 'fixed' })
    s = exchange(s, 'block', 'So you allow A but not B. Is that right?')
    expect(s.turns.at(-1)?.source).toBe('model')
    s = exchange(s, 'yes', `Great. ${NEXT_MARKER}`)
    expect(s.domainIndex).toBe(1)
    expect(s.turns.slice(-2).map((t) => t.caseId)).toEqual([undefined, 'c'])
  })
})

describe('limits', () => {
  it('moves on once the domain has run its time', () => {
    let s = startInterview('structured', T0)
    s = addParticipant(s, 'late', T0 + DOMAIN_MS)!
    expect(step(s, T0 + DOMAIN_MS)).toEqual({ kind: 'next_domain' })
  })

  it('refuses empty messages, trims long ones, and accepts nothing once done', () => {
    const s = startInterview('open', T0)
    expect(addParticipant(s, '   ', T0)).toBeNull()
    expect(addParticipant(s, 'x'.repeat(5000), T0)!.turns.at(-1)?.text).toHaveLength(1000)
    expect(addParticipant(finish(s, T0), 'more', T0)).toBeNull()
  })
})

describe('API messages and summary', () => {
  it('starts with a user turn, maps roles, and adds the domain note before the second domain', () => {
    let s = startInterview('open', T0)
    for (let i = 0; i < 4; i++) s = exchange(s, `a${i}`)
    const msgs = apiMessages(s)
    expect(msgs[0]).toEqual({ role: 'user', content: CHAT_OPENED })
    expect(msgs[1]).toEqual({ role: 'assistant', content: OPENERS.open.location })
    const note = msgs.findIndex((m) => m.role === 'system')
    expect(msgs[note - 1].role).toBe('user')
    expect(msgs[note + 1]).toEqual({ role: 'assistant', content: OPENERS.open.health })
  })

  it('summarizes turns and time', () => {
    let s = startInterview('open', T0)
    s = exchange(s, 'hello')
    s = finish(s, T0 + 120_000)
    expect(summary(s)).toMatchObject({ done: true, participantTurns: 1, participantChars: 5, minutes: 2 })
  })
})
