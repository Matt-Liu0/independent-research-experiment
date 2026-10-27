import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialAppState } from '../bramble/appState'
import { parseEntry } from './entry'
import { skipSetup } from './setup'
import { MemoryStore } from './store'
import { StudyApp } from './StudyApp'
import { taskOutcome } from './tasks'
import { newParticipant, type ParticipantDoc } from './types'

const PARAMS = '?code=pid1'

/** Task 4: saves two deals, which finishes it, and taps Next task. */
async function saveTwoDeals(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Deals' }))
  await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
  await user.click(screen.getByRole('button', { name: 'Save Greek yogurt, 32 oz' }))
  await user.click(screen.getByRole('button', { name: 'Next task' }))
}

/** Task 6: saves the new address (after `first`, if given), which finishes it, and taps Next task. */
async function moveAddress(user: ReturnType<typeof userEvent.setup>, first?: string) {
  await user.click(screen.getByRole('button', { name: 'Account' }))
  const input = screen.getByLabelText('Delivery address')
  for (const address of first ? [first, '40 Oak Street'] : ['40 Oak Street']) {
    await user.clear(input)
    await user.type(input, address)
    await user.click(screen.getByRole('button', { name: 'Save' }))
  }
  await user.click(screen.getByRole('button', { name: 'Next task' }))
}

function atTasks(overrides: Partial<ParticipantDoc> = {}): MemoryStore {
  const existing: ParticipantDoc = {
    ...newParticipant({ participantCode: 'pid1' }),
    stage: 'tasks',
    pattern: '',
    taskOrder: [4, 1, 2, 5, 6],
    ...overrides,
  }
  return new MemoryStore({ existing })
}

describe('task stage', () => {
  beforeEach(() => {
    localStorage.clear()
    skipSetup()
  })

  it('shows the task card first, then the app with the task bar', async () => {
    const user = userEvent.setup()
    render(<StudyApp entry={parseEntry(PARAMS)} store={atTasks()} />)
    expect(await screen.findByText("Browse this week's deals and save two you'd buy.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.getByText('Task 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
  })

  it('logs reopening the task card', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await user.click(screen.getByRole('button', { name: /tap to see it again/i }))
    expect(screen.getByRole('button', { name: 'Back to the app' })).toBeInTheDocument()
    expect(store.events.some((e) => e.type === 'task' && e.event === 'reopen')).toBe(true)
  })

  it('records the outcome and ease rating, then moves to the next task in the stored order', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await saveTwoDeals(user)

    expect(screen.getByRole('heading', { name: 'How easy was that task?' })).toBeInTheDocument()
    expect(store.participant?.taskOutcome.t4).toEqual({ done: true, dealsSaved: 2 })
    expect(store.participant?.taskPhase).toBe('rating')

    await user.click(screen.getByRole('radio', { name: '6' }))
    expect(store.participant?.ease).toEqual({ t4: 6 })
    expect(store.participant?.taskIndex).toBe(1)
    expect(await screen.findByText('Find a store near you that has oat milk in stock, and set it as your store.')).toBeInTheDocument()
  })

  it('tags app events with the current task', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await user.click(screen.getByRole('button', { name: 'Deals' }))
    expect(store.events.find((e) => e.type === 'screen' && e.to === 'deals')?.taskId).toBe(4)
  })

  it('moves to the survey after the sixth rating', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskIndex: 5, taskPhase: 'rating', appState: initialAppState() })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('radio', { name: '3' }))
    expect(store.participant?.stage).toBe('sus')
    expect(await screen.findByRole('heading', { name: 'What did you think of Bramble?' })).toBeInTheDocument()
  })

  it('never saves a typed address to the participant record', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskOrder: [6, 1, 2, 4, 5] })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await moveAddress(user, '221B Baker Street')
    expect(store.participant?.appState?.address).toBe('40 Oak Street')
    expect(store.participant?.taskOutcome.t6).toEqual({ done: true, addressMatches: true })
    expect(JSON.stringify(store.participant)).not.toContain('Baker')
    expect(JSON.stringify(store.events)).not.toContain('Baker')
  })

  it('restores the app state after a reload', async () => {
    const user = userEvent.setup()
    const appState = { ...initialAppState(), points: 270, deliveryRedeemed: true, screen: 'rewards' as const }
    render(<StudyApp entry={parseEntry(PARAMS)} store={atTasks({ appState })} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.getByText('270 pts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redeemed' })).toBeDisabled()
  })
})

describe('app setup', () => {
  beforeEach(() => localStorage.clear())

  it('asks what the participant usually buys the first time Bramble opens, then never again; the picks stay on the phone', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.getByRole('heading', { name: /Welcome to Bramble/ })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Bramble' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Bread & bakery' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
    // Sourdough (bakery) comes first in Shop.
    await user.click(screen.getByRole('button', { name: 'Shop' }))
    expect(screen.getAllByRole('button', { name: /^Add / })[0]).toHaveAccessibleName('Add Sourdough loaf')
    expect(store.events.find((e) => e.type === 'task' && e.event === 'app_setup')).toMatchObject({ app: 'bramble', picked: 1 })
    expect(JSON.stringify(store.participant)).not.toContain('bakery')
    expect(JSON.stringify(store.events)).not.toContain('bakery')
  })
})

describe('unfinished-task check', () => {
  beforeEach(() => {
    localStorage.clear()
    skipSetup()
  })

  it('asks before finishing an unfinished task; Keep going returns to the app, and both are logged', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    const dialog = screen.getByRole('dialog', { name: "This task doesn't look finished yet." })
    expect(dialog).toHaveTextContent("Browse this week's deals and save two you'd buy.")
    await user.click(screen.getByRole('button', { name: 'Keep going' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.participant?.taskPhase).toBe('doing')
    // Participants can't skip a task: the only way on is to finish it.
    expect(screen.queryByRole('button', { name: "I'm done with this task" })).not.toBeInTheDocument()
    // Leaving was only asked about, so the Deals settings haven't settled.
    expect(store.events.some((e) => e.type === 'settled')).toBe(false)
    expect(store.events.filter((e) => e.type === 'task').map((e) => [e.event, e.finished])).toEqual(
      expect.arrayContaining([['unfinished_check', undefined], ['unfinished_answer', false]]),
    )
  })

  it('finishes straight away when the task is done, whatever was chosen for privacy', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await user.click(screen.getByRole('button', { name: 'Deals' }))
    // Turn every deal setting off, then save two deals: declining doesn't make the task unfinished.
    for (const s of screen.getAllByRole('switch')) if (s.getAttribute('aria-checked') === 'true') await user.click(s)
    await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
    await user.click(screen.getByRole('button', { name: 'Save Greek yogurt, 32 oz' }))
    await user.click(screen.getByRole('button', { name: 'Next task' }))
    expect(screen.queryByRole('dialog', { name: /doesn't look finished/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How easy was that task?' })).toBeInTheDocument()
  })

  it('says when the goal is reached, without ending the task, and logs it once', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deals' }))
    await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Greek yogurt, 32 oz' }))
    expect(screen.getByRole('status')).toHaveTextContent('Task complete')
    // The task is still running: the deal settings on this screen can still be changed.
    expect(store.participant?.taskPhase).toBe('doing')
    expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
    expect(store.events.filter((e) => e.type === 'task' && e.event === 'goal_met')).toHaveLength(1)
  })

  it('keeps the skip option on demo links, for testing', async () => {
    const user = userEvent.setup()
    const existing = { ...atTasks().participant!, participantCode: 'DEMO' }
    render(<StudyApp entry={parseEntry('?demo=neutral')} store={new MemoryStore({ existing })} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: "I'm done with this task" })).toBeInTheDocument()
  })
})

describe('two apps', () => {
  beforeEach(() => {
    localStorage.clear()
    skipSetup()
  })

  const TEN = [1, 2, 3, 4, 5, 6, 7, 9, 8, 10] as ParticipantDoc['taskOrder']

  it('introduces the second app after the first app\'s last task, then runs its tasks with their own state', async () => {
    const user = userEvent.setup()
    const appState = { ...initialAppState(), points: 270 }
    const store = atTasks({ taskOrder: TEN, appOrder: 'bramble_first', taskIndex: 5, appState })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.getByText('Task 6 of 10')).toBeInTheDocument()
    await moveAddress(user)
    await user.click(screen.getByRole('radio', { name: '5' }))

    expect(await screen.findByRole('heading', { name: 'Now try Stride' })).toBeInTheDocument()
    expect(store.participant).toMatchObject({ taskIndex: 6, taskPhase: 'intro' })
    await user.click(screen.getByRole('button', { name: 'Open Stride' }))

    expect(await screen.findByText('Connect your health data to Stride, and check your stats for today.')).toBeInTheDocument()
    expect(screen.getByText(/Use Stride as if it were your own account/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    // The home screen now has both apps, Stride marked new; only Stride opens.
    expect(screen.getByText('• Stride')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bramble' }))
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(store.events.find((e) => e.type === 'task' && e.event === 'home_tap')).toMatchObject({ target: 'Bramble' })
    await user.click(screen.getByRole('button', { name: 'Stride' }))
    expect(screen.getByText('Task 7 of 10')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Stride' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.click(screen.getByRole('button', { name: "Don't Allow" }))
    // Declining counts as done, so there's no unfinished-task check.
    await user.click(screen.getByRole('button', { name: 'Next task' }))

    // Each app's state is saved separately; Bramble's is untouched by Stride.
    expect(store.participant?.strideState?.flows.stride_health_access).toBe('dont_allow')
    expect(store.participant?.appState?.points).toBe(270)
    expect(store.participant?.taskOutcome.t7).toEqual({ done: true, healthAnswered: true })
    // Events carry the app they happened in.
    expect(store.events.find((e) => e.type === 'settled' && e.flowId === 'stride_health_access')).toMatchObject({ app: 'stride', taskId: 7 })
  })

  it('starts with Stride for Stride-first participants, with no introduction screen', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskOrder: [7, 8, 9, 10, 1, 2, 4, 5, 6], appOrder: 'stride_first' })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Stride' }))
    expect(screen.getByRole('navigation', { name: 'Stride' })).toBeInTheDocument()
    expect(screen.getByText('Task 1 of 9')).toBeInTheDocument()
  })
})

describe('taskOutcome', () => {
  it('checks each task against the app state', () => {
    const s = initialAppState()
    expect(taskOutcome(1, { ...s, storeId: 'riverside' }).done).toBe(false)
    expect(taskOutcome(1, { ...s, storeId: 'elm' }).done).toBe(true)
    expect(taskOutcome(2, { ...s, order: 'on_the_way', orderItems: ['oat_milk'], settled: ['sam_share'] }).done).toBe(false)
    expect(taskOutcome(2, { ...s, order: 'on_the_way', orderItems: ['sourdough', 'oat_milk', 'eggs'] })).toEqual({ done: false, ordered: true, samNotified: false })
    expect(taskOutcome(2, { ...s, order: 'on_the_way', orderItems: ['sourdough', 'oat_milk'], settled: ['sam_share'] })).toEqual({ done: true, ordered: true, samNotified: true })
    expect(taskOutcome(4, { ...s, savedDeals: ['apples', 'yogurt'] })).toEqual({ done: true, dealsSaved: 2 })
    expect(taskOutcome(5, { ...s, deliveryRedeemed: true }).done).toBe(true)
    expect(taskOutcome(6, { ...s, address: '40 oak st' })).toEqual({ done: true, addressMatches: true })
  })
})
