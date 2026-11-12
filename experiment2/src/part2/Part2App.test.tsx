import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DeviceInfo } from '../study/types'
import { parsePart2Entry, type Part2Entry } from './entry'
import { CHAT_TIMING } from './Interview'
import { ScriptedInterviewer } from './interviewer'
import { ATTENTION_ITEMS, BATTERY, REPEATED_ITEMS, getItem } from './items'
import { slotKey, validSequence } from './order'
import { Part2App, part3Progress } from './Part2App'
import { MemoryPart2Store } from './store'
import { RECALL_QUESTIONS } from './surveyContent'
import { newPart2Doc, type Part, type Part2Doc } from './types'

// Replies show at once in these tests; the streaming test below sets its own pace.
beforeEach(() => {
  CHAT_TIMING.wordMs = 0
  CHAT_TIMING.loadRetryMs = 0
})
afterEach(() => {
  CHAT_TIMING.wordMs = 33
  CHAT_TIMING.loadRetryMs = 1500
})

const PAGES = BATTERY.length + REPEATED_ITEMS.length + ATTENTION_ITEMS.length
const PARAMS = { participantCode: 'P1' }

const device = (passedCheck: boolean): DeviceInfo => ({
  os: 'other', screenW: 1440, screenH: 900, userAgent: 'test', touch: false, passedCheck, automated: false,
})

/** Part 3 records on the questionnaire's first page. */
const atQuestionnaire = (): Part2Doc => ({ ...newPart2Doc(PARAMS), stage: 'intro' })

/** Part 3 on its first questionnaire page by default; `fromStart` opens a new record (Part 2 unless `part` says otherwise). */
async function renderPart2(options: { existing?: Part2Doc; passes?: boolean; fromStart?: boolean; part?: Part; part2Done?: boolean } = {}) {
  const existing = options.existing ?? (options.fromStart ? undefined : atQuestionnaire())
  const store = new MemoryPart2Store(existing)
  store.part2Done = options.part2Done ?? true
  const entry: Part2Entry = { part: options.part ?? (options.fromStart ? 2 : 3), mode: 'study', params: PARAMS }
  const view = render(
    <Part2App entry={entry} store={store} interviewer={new ScriptedInterviewer()} detect={() => device(options.passes ?? true)} />,
  )
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
  it('runs the briefing, the instructions and the chat, then ends', async () => {
    const user = userEvent.setup()
    const { doc, store } = await renderPart2({ fromStart: true })
    expect(screen.getByRole('heading', { name: 'Part 2: your views' })).toBeInTheDocument()
    expect(screen.getByText(/sent to Anthropic/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Set up the assistant' }))

    // Written instructions (D0), opening with the set-up framing: saved on the record, never logged; may be left empty.
    expect(doc().stage).toBe('instructions')
    expect(screen.getByText(/work in two of your apps for you/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your instructions'), '  Never sell my location.  ')
    await user.click(screen.getByRole('button', { name: 'Continue to the chat' }))
    expect(doc().stage).toBe('chat')
    expect(doc().writtenInstructions).toMatchObject({ text: 'Never sell my location.', chars: 23 })
    expect(store.events.find((e) => e.type === 'survey' && e.event === 'instructions')).toMatchObject({ chars: 23 })
    expect(JSON.stringify(store.events)).not.toContain('Never sell')

    expect(await screen.findByText(/grocery delivery app/)).toBeInTheDocument()
    const box = screen.getByLabelText('Your message')
    for (const answer of ['Only while I use it', 'No sharing', 'Heart rate is private', 'Ask me first']) {
      await user.type(box, answer)
      await user.keyboard('{Enter}')
      expect(await screen.findByText(answer)).toBeInTheDocument()
    }
    // Only lengths are logged, never what was typed.
    expect(store.events.filter((e) => e.type === 'chat' && e.event === 'sent').map((e) => e.chars)).toEqual([19, 10, 21, 12])
    expect(JSON.stringify(store.events)).not.toContain('Heart rate is private')
    await user.click(await screen.findByRole('button', { name: 'Continue' }))

    // Part 2 ends after the chat; the questionnaire is Part 3, 2 to 3 days later.
    expect(doc().stage).toBe('done')
    expect(screen.getByText(/link to Part 3/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('streams each reply a word at a time, with Send off until it finishes', async () => {
    const user = userEvent.setup()
    const store = new MemoryPart2Store({ ...newPart2Doc(PARAMS), stage: 'chat' })
    render(<Part2App entry={{ part: 2, mode: 'study', params: PARAMS }} store={store} interviewer={new ScriptedInterviewer()} />)
    expect(await screen.findByText(/How would you want an app like that to handle/)).toBeInTheDocument()
    CHAT_TIMING.wordMs = 60
    await user.type(screen.getByLabelText('Your message'), 'only while I use it')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.type(screen.getByLabelText('Your message'), 'more')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(await screen.findByText('Is there anything else I should keep in mind?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('tries opening the chat again before showing an error (the stage change may not be saved yet)', async () => {
    const interviewer = new ScriptedInterviewer()
    const real = interviewer.send.bind(interviewer)
    let calls = 0
    interviewer.send = async (message: string | null) => {
      if (++calls === 1) throw new Error('failed-precondition')
      return real(message)
    }
    const store = new MemoryPart2Store({ ...newPart2Doc(PARAMS), stage: 'chat' })
    render(<Part2App entry={{ part: 2, mode: 'study', params: PARAMS }} store={store} interviewer={interviewer} />)
    expect(await screen.findByText(/grocery delivery app/)).toBeInTheDocument()
    expect(calls).toBe(2)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('asks for the message again if the assistant fails to reply', async () => {
    const user = userEvent.setup()
    const interviewer = new ScriptedInterviewer()
    const store = new MemoryPart2Store({ ...newPart2Doc(PARAMS), stage: 'chat' })
    render(<Part2App entry={{ part: 2, mode: 'study', params: PARAMS }} store={store} interviewer={interviewer} />)
    await screen.findByText(/grocery delivery app/)
    const real = interviewer.send.bind(interviewer)
    interviewer.send = async () => {
      throw new Error('unavailable')
    }
    await user.type(screen.getByLabelText('Your message'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't reply")
    expect(screen.getByLabelText('Your message')).toHaveValue('hello')
    interviewer.send = real
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Is there anything else I should keep in mind?')).toBeInTheDocument()
  })

  it('Part 3 runs intro → practice → comprehension → 41 items → recall → background → debrief, saving every answer', async () => {
    const user = userEvent.setup()
    const { doc, store } = await renderPart2()
    expect(screen.getByRole('heading', { name: 'Part 3: your views' })).toBeInTheDocument()
    expect(screen.getByText(/read 41 short situations/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
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

    expect(screen.getByRole('heading', { name: 'About this study' })).toBeInTheDocument()
    expect(screen.getByText(/made by the research team/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Please remove my data from the study' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(doc().withdrawRequested).toBe(true)
    expect(doc().stage).toBe('done')
    expect(screen.getByText(/all three parts/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(await screen.findByText('Your answers are saved. You can close this page.')).toBeInTheDocument()
  }, 60_000)

  it('counts changes and gives one more try after a wrong comprehension answer', async () => {
    const user = userEvent.setup()
    const { doc } = await renderPart2()
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
    const first = await renderPart2()
    await throughComprehension(user)
    await answerCurrent(user)
    await answerCurrent(user)
    const saved = first.doc()
    first.view.unmount()

    await renderPart2({ existing: saved })
    expect(screen.getByText(`Situation 3 of ${PAGES}`)).toBeInTheDocument()
    const third = saved.sequence![2]
    const text = third.kind === 'item' ? getItem(third.itemId).text[third.wording]! : ATTENTION_ITEMS.find((a) => a.id === third.itemId)!.text
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('turns phones away from Part 2, asking for a computer', async () => {
    const { doc } = await renderPart2({ passes: false, fromStart: true })
    expect(screen.getByRole('heading', { name: 'Please use a computer' })).toBeInTheDocument()
    expect(doc().stage).toBe('device')
  })

  it('lets phones into Part 3, recording the device', async () => {
    const { doc } = await renderPart2({ passes: false, fromStart: true, part: 3 })
    expect(screen.getByRole('heading', { name: 'Part 3: your views' })).toBeInTheDocument()
    expect(doc().device).toMatchObject({ passedCheck: false })
  })

  it("keeps Part 3 closed until the code's Part 2 chat is finished", async () => {
    const { store } = await renderPart2({ fromStart: true, part: 3, part2Done: false })
    expect(screen.getByRole('heading', { name: 'Please finish Part 2 first' })).toBeInTheDocument()
    expect(store.doc).toBeNull()
  })

  it('moves the Part 3 progress bar one step per page, situations included', () => {
    const at = (stage: Part2Doc['stage'], answered = 0) =>
      part3Progress({ ...atQuestionnaire(), stage, answers: Object.fromEntries(Array.from({ length: answered }, (_, i) => [`k${i}`, {} as never])) })
    expect(at('intro')).toBe(0)
    expect(at('items', 0)).toBe(Math.round((3 / (PAGES + 6)) * 100))
    expect(at('items', 20)).toBeGreaterThan(at('items', 10)!)
    expect(at('debrief')).toBe(Math.round(((PAGES + 5) / (PAGES + 6)) * 100))
    expect(at('done')).toBeNull()
    expect(at('device')).toBeNull()
  })
})

describe('Part 2 links', () => {
  it('reads the mode, code and arm from the URL', () => {
    expect(parsePart2Entry('?code=S12', false, 3)).toMatchObject({ part: 3, mode: 'study' })
    // No arm on Part 3 links.
    expect(parsePart2Entry('?code=S12&pilot=1&arm=case', false, 3).arm).toBeUndefined()
    expect(parsePart2Entry('?code=S12&pilot=1')).toMatchObject({ mode: 'pilot', params: { participantCode: 'S12' } })
    expect(parsePart2Entry('?demo=1')).toMatchObject({ mode: 'demo' })
    // An arm can be picked on demo and pilot links only.
    expect(parsePart2Entry('?demo=1&arm=structured').arm).toBe('structured')
    expect(parsePart2Entry('?code=S12&pilot=1&arm=case').arm).toBe('case')
    expect(parsePart2Entry('?code=S12&arm=case').arm).toBeUndefined()
    expect(parsePart2Entry('').params).toBeNull()
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
