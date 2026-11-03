import { describe, expect, it } from 'vitest'
import { CASE_SET, CLOSING, OPENERS } from '../../functions/src/prompts'
import { SITE_ITEMS } from './items'
import { DEMO_CASES, DEMO_FIXED, ScriptedInterviewer } from './interviewer'

describe('demo interviewer', () => {
  it("uses the real interviewer's fixed openers and closing", () => {
    expect(DEMO_FIXED.openers).toEqual(OPENERS)
    expect(DEMO_FIXED.closing).toBe(CLOSING)
  })

  it('shows the real case set T in the case arm', () => {
    expect(DEMO_CASES.location).toEqual(CASE_SET.location.map((c) => c.text))
    expect(DEMO_CASES.health).toEqual(CASE_SET.health.map((c) => c.text))
  })

  it("words each case of T exactly as its site flow's questionnaire item (wording A), in its own domain", () => {
    const app = { location: 'bramble', health: 'stride' } as const
    for (const d of ['location', 'health'] as const)
      for (const c of CASE_SET[d]) expect(SITE_ITEMS.find((i) => i.id === c.id)).toMatchObject({ domain: app[d], text: { A: c.text } })
  })

  it.each([
    ['open', 4, 'Is there anything else I should keep in mind?'],
    ['structured', 12, 'Who would you be comfortable receiving it'],
    ['case', 14, 'Situation 2 of 6'],
  ] as const)('%s arm: its own shape, %i answers to finish', async (arm, answers, second) => {
    const interviewer = new ScriptedInterviewer(arm)
    const first = await interviewer.send(null)
    expect(first.turns[0].text).toBe(OPENERS[arm].location)
    let view = first
    for (let i = 0; i < answers; i++) {
      expect(view.done).toBe(false)
      view = await interviewer.send(`answer ${i}`)
      if (i === 0) expect(view.turns.at(-1)!.text).toContain(second)
    }
    expect(view.done).toBe(true)
    expect(view.turns.at(-1)!.text).toBe(CLOSING)
    expect(view.turns.some((t) => t.text === OPENERS[arm].health)).toBe(true)
  })
})
