import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemorySink, setEventSink } from '../log/logEvent'
import { initialAppState, type AppState } from './appState'
import { BrambleProvider, useBramble } from './BrambleContext'
import { FlowChoice } from './FlowChoice'
import type { FlowId, Friction } from './types'

let sink: ReturnType<typeof createMemorySink>
let latest: AppState

function Probe() {
  latest = useBramble().state
  return null
}

function renderFlow(friction: Friction, flowId: FlowId, extra?: { disabledOptions?: string[] }) {
  return render(
    <BrambleProvider friction={friction} initialState={initialAppState()}>
      <FlowChoice flowId={flowId} {...extra} />
      <Probe />
    </BrambleProvider>,
  )
}

const events = (type: string) => sink.events.filter((e) => e.type === type)

describe('FlowChoice', () => {
  beforeEach(() => {
    sink = createMemorySink()
    setEventSink(sink)
  })

  it('nudged prompt: fills the sharing option and turns "no" into a text link', () => {
    renderFlow('nudged', 'store_location')
    expect(screen.getByRole('button', { name: 'Allow while using Bramble' })).toHaveClass('btn-green')
    expect(screen.getByRole('button', { name: 'Allow once' })).toHaveClass('btn-outline')
    expect(screen.getByRole('button', { name: "Don't allow" })).toHaveClass('btn-link')
  })

  it('neutral prompt: equal buttons with the same labels', () => {
    renderFlow('neutral', 'store_location')
    for (const name of ['Allow while using Bramble', 'Allow once', "Don't allow"]) {
      expect(screen.getByRole('button', { name })).toHaveClass('btn-equal')
    }
  })

  it('logs prompt_shown once, then decision and settled for a one-tap prompt', async () => {
    const user = userEvent.setup()
    const view = renderFlow('neutral', 'bg_during_order')
    view.rerender(
      <BrambleProvider friction="neutral" initialState={initialAppState()}>
        <FlowChoice flowId="bg_during_order" />
        <Probe />
      </BrambleProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    expect(events('prompt_shown')).toHaveLength(1)
    expect(events('decision')[0]).toMatchObject({ flowId: 'bg_during_order', value: 'not_now', source: 'prompt' })
    expect(events('decision')[0].msSincePrompt).toBeTypeOf('number')
    expect(events('settled')[0]).toMatchObject({ flowId: 'bg_during_order', value: 'not_now', defaultShown: null })
    expect(latest.settled).toContain('bg_during_order')
  })

  it('nudged switch starts on and records the preset', () => {
    renderFlow('nudged', 'courier_live')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(events('prompt_shown')[0]).toMatchObject({ flowId: 'courier_live', defaultShown: 'share' })
    expect(latest.flows.courier_live).toBe('share')
  })

  it('logs every switch toggle but does not settle a commit flow on its own', async () => {
    const user = userEvent.setup()
    renderFlow('nudged', 'courier_live')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('switch'))
    expect(events('decision').map((e) => e.value)).toEqual(['dont_share', 'share'])
    expect(events('settled')).toHaveLength(0)
  })

  it('neutral setting: two equal buttons, neither selected', async () => {
    const user = userEvent.setup()
    renderFlow('neutral', 'deals_personalized')
    const on = screen.getByRole('button', { name: 'On' })
    const off = screen.getByRole('button', { name: 'Off' })
    expect(on).toHaveAttribute('aria-pressed', 'false')
    expect(off).toHaveAttribute('aria-pressed', 'false')
    expect(latest.flows.deals_personalized).toBeNull()
    await user.click(off)
    expect(off).toHaveAttribute('aria-pressed', 'true')
  })

  it('checkbox starts checked in nudged and unchecked in neutral', () => {
    renderFlow('nudged', 'checkout_partner_offers')
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('checkbox starts unchecked in neutral', () => {
    renderFlow('neutral', 'checkout_partner_offers')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('pays Rewards points once, on accepting', async () => {
    const user = userEvent.setup()
    renderFlow('neutral', 'reward_keel')
    await user.click(screen.getByRole('button', { name: 'Link' }))
    expect(latest.points).toBe(620)
    expect(events('points')[0]).toMatchObject({ flowId: 'reward_keel', amount: 200, pointsBefore: 420 })
    expect(events('decision')[0].pointsBefore).toBe(420)
  })

  it('pays nothing for declining', async () => {
    const user = userEvent.setup()
    renderFlow('nudged', 'reward_data_partners')
    await user.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(latest.points).toBe(420)
  })

  it('respects disabled options', () => {
    renderFlow('neutral', 'store_location', { disabledOptions: ['while_using', 'once'] })
    expect(screen.getByRole('button', { name: 'Allow once' })).toBeDisabled()
    expect(screen.getByRole('button', { name: "Don't allow" })).toBeEnabled()
  })
})
