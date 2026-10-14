import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { DeviceInfo } from '../study/types'
import { parsePart2Entry, type Part2Entry } from './entry'
import { ATTENTION_ITEMS, BATTERY, REPEATED_ITEMS, getItem } from './items'
import { slotKey, validSequence } from './order'
import { Part2App } from './Part2App'
import { MemoryPart2Store } from './store'
import { RECALL_QUESTIONS } from './surveyContent'
import type { Part2Doc, Variant } from './types'

const PAGES = BATTERY.length + REPEATED_ITEMS.length + ATTENTION_ITEMS.length
const PARAMS = { prolificPid: 'P1', studyId: 'S', sessionId: 'X', recruitment: 'prolific' as const }

const device = (passedCheck: boolean): DeviceInfo => ({
  os: 'other', screenW: 1440, screenH: 900, userAgent: 'test', touch: false, passedCheck, automated: false,
})

async function renderPart2(variant: Variant, options: { existing?: Part2Doc; passes?: boolean } = {}) {
  const store = new MemoryPart2Store(variant, options.existing)
  const entry: Part2Entry = { variant, mode: 'study', params: PARAMS }
  const view = render(<Part2App entry={entry} store={store} detect={() => device(options.passes ?? true)} />)
  await act(async () => {})
  return { store, view, doc: () => store.doc! }
}

const radio = (group: string, name: string) => within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name })

/** Answers the current item; attention items get the answer they ask for. */
async function answerCurrent(user: ReturnType<typeof userEvent.setup>, verdict = 'Allow', confidence = '4') {
  const text = document.querySelector('.item-text')!.textContent!
  const attention = ATTENTION_ITEMS.find((a) => a.text === text)
  const v = attention ? { allow: 'Allow', ask: 'Ask me', block: 'Block' }[attention.verdict] : verdict
  await user.click(within(screen.getByRole('radiogroup', { name: 'Your choice' })).getByRole('radio', { name: new RegExp(`^${v}`) }))
  await user.click(radio('How sure are you?', attention ? String(attention.confidence) : confidence))
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

async function throughComprehension(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Start the practice' }))
  await user.click(within(screen.getByRole('radiogroup', { name: 'Your choice' })).getByRole('radio', { name: /^Ask me/ }))
  await user.click(radio('How sure are you?', '5'))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(screen.getByRole('radio', { name: 'Ask me' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('Part 2', () => {
  it('runs intro → practice → comprehension → 55 items → recall → background, saving every answer', async () => {
    const user = userEvent.setup()
    const { doc, store } = await renderPart2('part2')
    expect(screen.getByRole('heading', { name: 'Your views' })).toBeInTheDocument()
    expect(screen.getByText(/read 55 short situations/)).toBeInTheDocument()
    await throughComprehension(user)
    expect(doc().practice).toEqual({ verdict: 'ask', confidence: 5 })
    expect(doc().comprehension).toEqual({ attempts: ['ask'], passed: true })
    expect(validSequence(doc().sequence!)).toBe(true)

    // The first page is the first slot of the saved order, in its wording.
    const first = doc().sequence![0]
    expect(screen.getByText(`Situation 1 of ${PAGES}`)).toBeInTheDocument()
    if (first.kind === 'item') expect(screen.getByText(getItem(first.itemId).text[first.wording]!)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    for (let i = 0; i < PAGES; i++) await answerCurrent(user, i % 2 ? 'Block' : 'Allow')
    const answers = doc().answers
    expect(Object.keys(answers)).toHaveLength(PAGES)
    expect(Object.keys(answers).sort()).toEqual(doc().sequence!.map(slotKey).sort())
    expect(answers[slotKey(first)]).toMatchObject({ position: 1, verdict: 'allow', confidence: 4, changes: 0 })
    for (const a of ATTENTION_ITEMS) expect(answers[a.id]).toMatchObject({ verdict: a.verdict, confidence: a.confidence, wording: null })
    expect(store.events.filter((e) => e.type === 'item' && e.name === 'answered')).toHaveLength(PAGES + 1)

    expect(screen.getByRole('heading', { name: 'A few questions about Part 1' })).toBeInTheDocument()
    for (const q of RECALL_QUESTIONS) {
      await user.click(within(screen.getByRole('radiogroup', { name: q.text })).getByRole('radio', { name: q.options[0].label }))
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(doc().recall).toEqual(Object.fromEntries(RECALL_QUESTIONS.map((q) => [q.id, q.options[0].value])))

    for (const group of screen.getAllByRole('radiogroup').slice(0, 10)) await user.click(within(group).getByRole('radio', { name: '6' }))
    await user.click(radio('Your age', '25–34'))
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled()
    await user.click(radio('How often do you use AI assistants (such as ChatGPT, Claude, Gemini or Siri)?', 'Never'))
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(doc().background).toEqual({ iuipc: Array(10).fill(6), ageRange: '25–34', gender: null, aiUse: 'Never' })
    expect(doc().stage).toBe('done')
    expect(await screen.findByRole('link', { name: 'Back to Prolific' })).toHaveAttribute('href', expect.stringContaining('cc=TEST-PART2'))
  }, 60_000)

  it('counts changes and gives one more try after a wrong comprehension answer', async () => {
    const user = userEvent.setup()
    const { doc } = await renderPart2('part2')
    await user.click(screen.getByRole('button', { name: 'Start the practice' }))
    await user.click(within(screen.getByRole('radiogroup', { name: 'Your choice' })).getByRole('radio', { name: /^Allow/ }))
    await user.click(radio('How sure are you?', '3'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('radio', { name: 'Allow' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent("Don't decide in advance")
    await user.click(screen.getByRole('radio', { name: 'Block' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    // Recorded either way; exclusion is decided in the analysis.
    expect(doc().comprehension).toEqual({ attempts: ['allow', 'block'], passed: false })
    expect(doc().stage).toBe('items')

    await user.click(within(screen.getByRole('radiogroup', { name: 'Your choice' })).getByRole('radio', { name: /^Allow/ }))
    await user.click(within(screen.getByRole('radiogroup', { name: 'Your choice' })).getByRole('radio', { name: /^Block/ }))
    await user.click(radio('How sure are you?', '2'))
    await user.click(radio('How sure are you?', '5'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(Object.values(doc().answers)[0]).toMatchObject({ verdict: 'block', confidence: 5, changes: 2 })
  })

  it('resumes on the next unanswered item with the saved order', async () => {
    const user = userEvent.setup()
    const first = await renderPart2('part2')
    await throughComprehension(user)
    await answerCurrent(user)
    await answerCurrent(user)
    const saved = first.doc()
    first.view.unmount()

    await renderPart2('part2', { existing: saved })
    expect(screen.getByText(`Situation 3 of ${PAGES}`)).toBeInTheDocument()
    const third = saved.sequence![2]
    const text = third.kind === 'item' ? getItem(third.itemId).text[third.wording]! : ATTENTION_ITEMS.find((a) => a.id === third.itemId)!.text
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('turns phones away, asking for a computer', async () => {
    const { doc } = await renderPart2('part2', { passes: false })
    expect(screen.getByRole('heading', { name: 'Please use a computer' })).toBeInTheDocument()
    expect(doc().stage).toBe('device')
  })
})

describe('norming survey', () => {
  it('asks for consent, has no recall check, and ends with the norming code', async () => {
    const user = userEvent.setup()
    const { doc } = await renderPart2('norming')
    expect(screen.getByRole('heading', { name: 'Before you start' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'I agree to take part' }))
    expect(doc().consentVersion).toBe('norming-v1-draft')
    await throughComprehension(user)
    for (let i = 0; i < PAGES; i++) await answerCurrent(user, 'Ask me', '3')
    expect(screen.getByRole('heading', { name: 'About you' })).toBeInTheDocument()
    expect(doc().recall).toBeNull()
  }, 60_000)

  it('picks the variant and links from the URL', () => {
    expect(parsePart2Entry('?PROLIFIC_PID=a&STUDY_ID=b&SESSION_ID=c', '/norming.html')).toMatchObject({ variant: 'norming', mode: 'study' })
    expect(parsePart2Entry('?code=S12&pilot=1', '/part2')).toMatchObject({ variant: 'part2', mode: 'pilot', params: { prolificPid: 'S12' } })
    expect(parsePart2Entry('?demo=1', '/part2.html')).toMatchObject({ mode: 'demo' })
    expect(parsePart2Entry('', '/part2.html').params).toBeNull()
  })
})

describe('recall questions', () => {
  it('offer only real values of the flow they ask about', async () => {
    const { ALL_FLOWS } = await import('../allFlows')
    for (const q of RECALL_QUESTIONS) {
      const flow = ALL_FLOWS.find((f) => f.id === q.flowId)!
      for (const o of q.options) if (o.value !== null) expect(flow.options, q.id).toContain(o.value)
    }
  })
})
