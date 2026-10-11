import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialAppState } from '../bramble/appState'
import { parseEntry } from './prolific'
import { MemoryStore } from './store'
import { StudyApp } from './StudyApp'
import { taskOutcome } from './tasks'
import { newParticipant, type ParticipantDoc } from './types'

const PARAMS = '?PROLIFIC_PID=pid1&STUDY_ID=s&SESSION_ID=x'

function atTasks(overrides: Partial<ParticipantDoc> = {}): MemoryStore {
  const existing: ParticipantDoc = {
    ...newParticipant({ prolificPid: 'pid1', studyId: 's', sessionId: 'x' }),
    stage: 'tasks',
    pattern: '',
    taskOrder: [4, 1, 2, 3, 5, 6],
    ...overrides,
  }
  return new MemoryStore({ existing })
}

describe('task stage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the task card first, then the app with the task bar', async () => {
    const user = userEvent.setup()
    render(<StudyApp entry={parseEntry(PARAMS)} store={atTasks()} />)
    expect(await screen.findByText("Browse this week's deals and save two you'd buy.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    expect(screen.getByText('Task 1 of 6')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
  })

  it('logs reopening the task card', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: /tap to see it again/i }))
    expect(screen.getByRole('button', { name: 'Back to the app' })).toBeInTheDocument()
    expect(store.events.some((e) => e.type === 'task' && e.event === 'reopen')).toBe(true)
  })

  it('records the outcome and ease rating, then moves to the next task in the stored order', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByRole('heading', { name: 'How easy was that task?' })).toBeInTheDocument()
    expect(store.participant?.taskOutcome.t4).toEqual({ done: false, dealsSaved: 0 })
    expect(store.participant?.taskPhase).toBe('rating')

    await user.click(screen.getByRole('radio', { name: '6' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(store.participant?.ease).toEqual({ t4: 6 })
    expect(store.participant?.taskIndex).toBe(1)
    expect(await screen.findByText('Find a store near you that has oat milk in stock, and set it as your store.')).toBeInTheDocument()
  })

  it('tags app events with the current task', async () => {
    const user = userEvent.setup()
    const store = atTasks()
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Deals' }))
    expect(store.events.find((e) => e.type === 'screen' && e.to === 'deals')?.taskId).toBe(4)
  })

  it('moves to the survey after the sixth rating', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskIndex: 5, taskPhase: 'rating', appState: initialAppState() })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('radio', { name: '3' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(store.participant?.stage).toBe('sus')
    expect(await screen.findByRole('heading', { name: 'What did you think of Bramble?' })).toBeInTheDocument()
  })

  it('never saves a typed address to the participant record', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskOrder: [6, 1, 2, 3, 4, 5] })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    await user.click(screen.getByRole('button', { name: 'Account' }))
    const input = screen.getByLabelText('Delivery address')
    await user.clear(input)
    await user.type(input, '221B Baker Street')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(store.participant?.appState?.address).toBe('other')
    expect(store.participant?.taskOutcome.t6).toEqual({ done: false, addressMatches: false })
    expect(JSON.stringify(store.participant)).not.toContain('Baker')
    expect(JSON.stringify(store.events)).not.toContain('Baker')
  })

  it('restores the app state after a reload', async () => {
    const user = userEvent.setup()
    const appState = { ...initialAppState(), points: 270, deliveryRedeemed: true, screen: 'rewards' as const }
    render(<StudyApp entry={parseEntry(PARAMS)} store={atTasks({ appState })} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    expect(screen.getByText('270 pts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redeemed' })).toBeDisabled()
  })
})

describe('two apps', () => {
  beforeEach(() => localStorage.clear())

  const TEN = [1, 2, 3, 4, 5, 6, 7, 9, 8, 10] as ParticipantDoc['taskOrder']

  it('introduces the second app after the first app\'s last task, then runs its tasks with their own state', async () => {
    const user = userEvent.setup()
    const appState = { ...initialAppState(), points: 270 }
    const store = atTasks({ taskOrder: TEN, appOrder: 'bramble_first', taskIndex: 5, appState })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    expect(screen.getByText('Task 6 of 10')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('radio', { name: '5' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Now try Stride' })).toBeInTheDocument()
    expect(store.participant).toMatchObject({ taskIndex: 6, taskPhase: 'intro' })
    await user.click(screen.getByRole('button', { name: 'Open Stride' }))

    expect(await screen.findByText('Connect your health data to Stride, and set up how you sign in.')).toBeInTheDocument()
    expect(screen.getByText(/Use Stride as if it were your own account/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start task' }))
    expect(screen.getByText('Task 7 of 10')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Stride' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    // Each app's state is saved separately; Bramble's is untouched by Stride.
    expect(store.participant?.strideState?.flows.stride_face_unlock).toBe('not_now')
    expect(store.participant?.appState?.points).toBe(270)
    expect(store.participant?.taskOutcome.t7).toEqual({ done: false, healthAnswered: false, signInAnswered: true })
    // Events carry the app they happened in.
    expect(store.events.find((e) => e.type === 'settled' && e.flowId === 'stride_face_unlock')).toMatchObject({ app: 'stride', taskId: 7 })
  })

  it('starts with Stride for Stride-first participants, with no introduction screen', async () => {
    const user = userEvent.setup()
    const store = atTasks({ taskOrder: [7, 8, 9, 10, 1, 2, 3, 4, 5, 6], appOrder: 'stride_first' })
    render(<StudyApp entry={parseEntry(PARAMS)} store={store} />)
    await user.click(await screen.findByRole('button', { name: 'Start task' }))
    expect(screen.getByRole('navigation', { name: 'Stride' })).toBeInTheDocument()
    expect(screen.getByText('Task 1 of 10')).toBeInTheDocument()
  })
})

describe('taskOutcome', () => {
  it('checks each task against the app state', () => {
    const s = initialAppState()
    expect(taskOutcome(1, { ...s, storeId: 'riverside' }).done).toBe(false)
    expect(taskOutcome(1, { ...s, storeId: 'elm' }).done).toBe(true)
    expect(taskOutcome(2, { ...s, order: 'on_the_way', orderItems: ['oat_milk'] }).done).toBe(false)
    expect(taskOutcome(2, { ...s, order: 'on_the_way', orderItems: ['sourdough', 'oat_milk', 'eggs'] }).done).toBe(true)
    expect(taskOutcome(3, { ...s, settled: ['sam_share'] })).toEqual({ done: true, samNotified: true })
    expect(taskOutcome(4, { ...s, savedDeals: ['apples', 'yogurt'] })).toEqual({ done: true, dealsSaved: 2 })
    expect(taskOutcome(5, { ...s, deliveryRedeemed: true }).done).toBe(true)
    expect(taskOutcome(6, { ...s, address: '40 oak st' })).toEqual({ done: true, addressMatches: true })
  })
})
