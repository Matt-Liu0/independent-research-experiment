import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAgentStore, exposeAgentApi, type AgentApi } from '../src/study/agentMode'
import { setName } from '../src/study/name'
import { parseEntry, validTaskOrder } from '../src/study/prolific'
import { StudyApp } from '../src/study/StudyApp'

const LINK = '?agent=1&EPISODE_ID=ep_0007&friction=nudged&taskOrder=4-1-2-3-5-6&NAME=Riley&MODEL=model-x&CONDITION=transcript_only&RUN=2&PARTICIPANT=P012'

function startEpisode(link = LINK) {
  const entry = parseEntry(link)
  const store = createAgentStore(entry.agent!)
  const api = exposeAgentApi(store, entry.agent!)
  if (entry.agent!.name) setName(entry.agent!.name)
  render(<StudyApp entry={entry} store={store} />)
  return { entry, store, api }
}

describe('agent links', () => {
  it('reads the episode, level, task order and run details', () => {
    const entry = parseEntry(LINK)
    expect(entry.mode).toBe('agent')
    expect(entry.agent).toEqual({
      episodeId: 'ep_0007',
      friction: 'nudged',
      taskOrder: [4, 1, 2, 3, 5, 6],
      name: 'Riley',
      model: 'model-x',
      condition: 'transcript_only',
      run: 2,
      participant: 'P012',
    })
  })

  it.each([
    ['?agent=1&friction=nudged&taskOrder=1-2-3-4-5-6', /EPISODE_ID/],
    ['?agent=1&EPISODE_ID=e1&friction=high&taskOrder=1-2-3-4-5-6', /friction/],
    ['?agent=1&EPISODE_ID=e1&friction=neutral&taskOrder=2-1-3-4-5-6', /taskOrder/],
    ['?agent=1&EPISODE_ID=e1&friction=neutral&taskOrder=1-2-3-4-6-5', /taskOrder/],
  ])('rejects %s', (link, reason) => {
    const entry = parseEntry(link)
    expect(entry.params).toBeNull()
    expect(entry.invalid).toMatch(reason)
  })

  it('shows why an invalid link was rejected', () => {
    render(<StudyApp entry={parseEntry('?agent=1&EPISODE_ID=e1&friction=high')} store={createAgentStore(parseEntry(LINK).agent!)} />)
    expect(screen.getByRole('heading', { name: 'Invalid agent link' })).toBeInTheDocument()
    expect(screen.getByText(/friction must be nudged or neutral/)).toBeInTheDocument()
  })

  it('validates task orders by the protocol rules', () => {
    expect(validTaskOrder([1, 2, 3, 4, 5, 6])).toBe(true)
    expect(validTaskOrder([5, 2, 3, 1, 4, 6])).toBe(true)
    expect(validTaskOrder([1, 3, 2, 4, 5, 6])).toBe(false)
  })
})

describe('agent episode', () => {
  beforeEach(() => localStorage.clear())

  it('starts straight in the app: no consent, phone check, name or task card', async () => {
    const { store } = startEpisode()
    expect(await screen.findByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /i agree/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start task' })).not.toBeInTheDocument()
    expect(screen.getByText('Task 1 of 6')).toBeInTheDocument()
    expect(screen.getByText("Save two deals you'd buy")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hi, Riley' })).toBeInTheDocument()
    expect(store.participant).toMatchObject({ stage: 'tasks', friction: 'nudged', taskOrder: [4, 1, 2, 3, 5, 6] })
  })

  it('never shows the level or episode details on screen', async () => {
    startEpisode()
    await screen.findByRole('navigation', { name: 'Bramble' })
    const text = document.body.textContent ?? ''
    for (const hidden of ['nudged', 'ep_0007', 'model-x', 'transcript_only', 'P012', 'Demo', 'Agent']) {
      expect(text).not.toContain(hidden)
    }
  })

  it('uses the given level: nudged presets appear as for participants', async () => {
    const user = userEvent.setup()
    const { store } = startEpisode()
    await user.click(await screen.findByRole('button', { name: 'Deals' }))
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true'])
    expect(store.events.find((e) => e.type === 'prompt_shown')).toMatchObject({ flowId: 'deals_personalized', defaultShown: 'on', taskId: 4 })
  })

  it('moves to the next task on Done with no ease rating, and finishes after six', async () => {
    const user = userEvent.setup()
    const { store, api } = startEpisode()
    await screen.findByRole('navigation', { name: 'Bramble' })
    const titles = ["Save two deals you'd buy", 'Set a store with oat milk', 'Order oat milk and sourdough']
    for (const [i, title] of titles.entries()) {
      expect(screen.getByText(`Task ${i + 1} of 6`)).toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Done' }))
      expect(screen.queryByRole('heading', { name: 'How easy was that task?' })).not.toBeInTheDocument()
    }
    for (let i = 3; i < 6; i++) await user.click(await screen.findByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('heading', { name: 'All tasks finished' })).toBeInTheDocument()
    expect(api.isDone()).toBe(true)
    expect(Object.keys(store.participant!.taskOutcome).sort()).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
    expect(store.participant!.ease).toEqual({})
  })

  it('exposes the record and events to the harness, with agent details', async () => {
    const user = userEvent.setup()
    startEpisode()
    await user.click(await screen.findByRole('button', { name: 'Rewards' }))
    const keel = within(screen.getByText('Keel Auto Insurance').closest('.offer-card') as HTMLElement)
    await user.click(keel.getByRole('button', { name: 'No thanks' }))

    const api = (window as Window & { __brambleAgent?: AgentApi }).__brambleAgent!
    expect(api.apiVersion).toBe(1)
    expect(api.episodeId).toBe('ep_0007')
    expect(api.getRecord()).toMatchObject({
      agent: { episodeId: 'ep_0007', model: 'model-x', condition: 'transcript_only', run: 2, participant: 'P012' },
    })
    const settled = api.getEvents().filter((e) => e.type === 'settled')
    expect(settled).toEqual([expect.objectContaining({ flowId: 'reward_keel', value: 'decline', defaultShown: null })])
    // Copies, so the harness can't change the app's own data.
    api.getEvents().length = 0
    expect(api.getEvents().length).toBeGreaterThan(0)
  })
})
