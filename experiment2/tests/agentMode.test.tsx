import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { mirrorUnits } from '../src/core/units'
import { createAgentStore, exposeAgentApi, type AgentApi } from '../src/study/agentMode'
import { setName } from '../src/study/name'
import { parseEntry, validTaskOrder } from '../src/study/prolific'
import { StudyApp } from '../src/study/StudyApp'

const LINK = '?agent=1&EPISODE_ID=ep_0007&nudged=U1-U5-U6&taskOrder=4-1-2-3-5-6-7-9-8-10&NAME=Riley&MODEL=model-x&CONDITION=transcript_only&RUN=2&PARTICIPANT=P012'

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
      nudgedUnits: ['U1', 'U5', 'U6'],
      taskOrder: [4, 1, 2, 3, 5, 6, 7, 9, 8, 10],
      name: 'Riley',
      model: 'model-x',
      condition: 'transcript_only',
      run: 2,
      participant: 'P012',
    })
  })

  it('accepts none, all, and mirror-image patterns', () => {
    expect(parseEntry('?agent=1&EPISODE_ID=e1&nudged=none&taskOrder=1-2-3-4-5-6-7-8-9-10').agent?.nudgedUnits).toEqual([])
    expect(parseEntry('?agent=1&EPISODE_ID=e1&nudged=all&taskOrder=1-2-3-4-5-6-7-8-9-10').agent?.nudgedUnits).toEqual(['U1', 'U2', 'U3', 'U4', 'U5', 'U6'])
    expect(parseEntry('?agent=1&EPISODE_ID=e1&nudged=U2-U3-U4&taskOrder=1-2-3-4-5-6-7-8-9-10').agent?.nudgedUnits).toEqual(mirrorUnits(['U1', 'U5', 'U6']))
  })

  it.each([
    ['?agent=1&nudged=none&taskOrder=1-2-3-4-5-6-7-8-9-10', /EPISODE_ID/],
    ['?agent=1&EPISODE_ID=e1&nudged=U7&taskOrder=1-2-3-4-5-6-7-8-9-10', /nudged/],
    ['?agent=1&EPISODE_ID=e1&nudged=U1-U1&taskOrder=1-2-3-4-5-6-7-8-9-10', /nudged/],
    ['?agent=1&EPISODE_ID=e1&taskOrder=1-2-3-4-5-6-7-8-9-10', /nudged/],
    ['?agent=1&EPISODE_ID=e1&nudged=none&taskOrder=2-1-3-4-5-6-7-8-9-10', /taskOrder/],
    ['?agent=1&EPISODE_ID=e1&nudged=all&taskOrder=1-2-3-4-6-5-7-8-9-10', /taskOrder/],
    ['?agent=1&EPISODE_ID=e1&nudged=all&taskOrder=4-2-3-1-5-6-7-8-9-10', /taskOrder/],
    // Stride must start with Task 7, the apps must be separate blocks, and all 10 tasks are needed.
    ['?agent=1&EPISODE_ID=e1&nudged=all&taskOrder=1-2-3-4-5-6-8-7-9-10', /taskOrder/],
    ['?agent=1&EPISODE_ID=e1&nudged=all&taskOrder=1-2-3-7-8-9-10-4-5-6', /taskOrder/],
  ])('rejects %s', (link, reason) => {
    const entry = parseEntry(link)
    expect(entry.params).toBeNull()
    expect(entry.invalid).toMatch(reason)
  })

  it('shows why an invalid link was rejected', () => {
    render(<StudyApp entry={parseEntry('?agent=1&EPISODE_ID=e1&nudged=U9')} store={createAgentStore(parseEntry(LINK).agent!)} />)
    expect(screen.getByRole('heading', { name: 'Invalid agent link' })).toBeInTheDocument()
    expect(screen.getByText(/nudged must be none, all, or units/)).toBeInTheDocument()
  })

  it('validates task orders by the protocol rules', () => {
    expect(validTaskOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(true)
    expect(validTaskOrder([7, 10, 9, 8, 5, 1, 4, 2, 3, 6])).toBe(true)
    expect(validTaskOrder([5, 2, 3, 1, 4, 6, 7, 8, 9, 10])).toBe(false)
    expect(validTaskOrder([1, 3, 2, 4, 5, 6, 7, 8, 9, 10])).toBe(false)
    expect(validTaskOrder([1, 2, 3, 4, 5, 6])).toBe(false)
  })
})

describe('agent episode', () => {
  beforeEach(() => localStorage.clear())

  it('starts straight in the app: no consent, phone check, name or task card', async () => {
    const { store } = startEpisode()
    expect(await screen.findByRole('navigation', { name: 'Bramble' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /i agree/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start task' })).not.toBeInTheDocument()
    expect(screen.getByText('Task 1 of 10')).toBeInTheDocument()
    expect(screen.getByText("Save two deals you'd buy")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hi, Riley' })).toBeInTheDocument()
    expect(store.participant).toMatchObject({ stage: 'tasks', pattern: 'U1U5U6', appOrder: 'bramble_first', taskOrder: [4, 1, 2, 3, 5, 6, 7, 9, 8, 10] })
  })

  it('never shows the level or episode details on screen', async () => {
    startEpisode()
    await screen.findByRole('navigation', { name: 'Bramble' })
    const text = document.body.textContent ?? ''
    for (const hidden of ['nudged', 'U1U5U6', 'ep_0007', 'model-x', 'transcript_only', 'P012', 'Demo', 'Agent']) {
      expect(text).not.toContain(hidden)
    }
  })

  it('uses the given pattern: nudged screens look nudged, the others neutral', async () => {
    const user = userEvent.setup()
    const { store } = startEpisode()
    await user.click(await screen.findByRole('button', { name: 'Deals' }))
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true'])
    expect(store.events.find((e) => e.type === 'prompt_shown')).toMatchObject({ flowId: 'deals_personalized', defaultShown: 'on', taskId: 4 })
    // U6 (Rewards) is nudged too; U2 (Checkout) is not, so its settings start off.
    await user.click(screen.getByRole('button', { name: 'Rewards' }))
    expect((await screen.findAllByRole('button', { name: 'Accept' }))[0]).toHaveAttribute('data-emphasis', 'primary')
  })

  it('moves to the next task on Done with no ease rating, straight into Stride, and finishes after ten', async () => {
    const user = userEvent.setup()
    const { store, api } = startEpisode()
    await screen.findByRole('navigation', { name: 'Bramble' })
    const titles = ["Save two deals you'd buy", 'Set a store with oat milk', 'Order oat milk and sourdough']
    for (const [i, title] of titles.entries()) {
      expect(screen.getByText(`Task ${i + 1} of 10`)).toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Done' }))
      expect(screen.queryByRole('heading', { name: 'How easy was that task?' })).not.toBeInTheDocument()
    }
    for (let i = 3; i < 6; i++) await user.click(await screen.findByRole('button', { name: 'Done' }))
    // No introduction screen for agents: Stride opens straight away.
    expect(await screen.findByRole('navigation', { name: 'Stride' })).toBeInTheDocument()
    expect(screen.getByText('Task 7 of 10')).toBeInTheDocument()
    for (let i = 6; i < 10; i++) await user.click(await screen.findByRole('button', { name: 'Done' }))

    expect(await screen.findByRole('heading', { name: 'All tasks finished' })).toBeInTheDocument()
    expect(api.isDone()).toBe(true)
    expect(Object.keys(store.participant!.taskOutcome).sort()).toEqual(['t1', 't10', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'])
    expect(store.participant!.strideState?.points).toBe(420)
    expect(store.participant!.ease).toEqual({})
  })

  it('exposes the record and events to the harness, with agent details', async () => {
    const user = userEvent.setup()
    startEpisode()
    await user.click(await screen.findByRole('button', { name: 'Rewards' }))
    const keel = within(screen.getByText('Keel Auto Insurance').closest('.offer-card') as HTMLElement)
    await user.click(keel.getByRole('button', { name: 'Decline' }))

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
