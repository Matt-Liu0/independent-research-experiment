import { describe, expect, it } from 'vitest'
import { CLOSING, OPENERS } from '../../functions/src/prompts'
import { DEMO_FIXED, ScriptedInterviewer } from './interviewer'

describe('demo interviewer', () => {
  it("uses the real interviewer's fixed openers and closing", () => {
    expect(DEMO_FIXED.openers).toEqual(OPENERS)
    expect(DEMO_FIXED.closing).toBe(CLOSING)
  })

  it.each([
    ['open', 4, 'Is there anything else I should keep in mind?'],
    ['structured', 12, 'Who would you be comfortable receiving it'],
    ['case', 8, 'Situation 2 of 3'],
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
