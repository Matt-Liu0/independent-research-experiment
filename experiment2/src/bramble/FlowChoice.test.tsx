import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemorySink, setEventSink } from '../log/logEvent'
import { initialAppState, type AppState } from './appState'
import { BrambleProvider, useBramble } from './BrambleContext'
import { FlowChoice } from '../core/FlowChoice'
import { uniformUnits } from '../core/units'
import type { FlowId, Friction } from './types'

let sink: ReturnType<typeof createMemorySink>
let latest: AppState

function Probe() {
  latest = useBramble().state
  return null
}

function renderFlow(friction: Friction, flowId: FlowId) {
  return render(
    <BrambleProvider nudgedUnits={uniformUnits(friction)} initialState={initialAppState()}>
      <FlowChoice flowId={flowId} />
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

  it('nudged prompt: highlights only the sharing option; the others look like neutral buttons (Utz et al.)', () => {
    renderFlow('nudged', 'store_location')
    expect(screen.getByRole('button', { name: 'Allow While Using App' })).toHaveClass('btn-green')
    expect(screen.getByRole('button', { name: 'Allow Once' })).toHaveClass('btn-equal')
    expect(screen.getByRole('button', { name: "Don't Allow" })).toHaveClass('btn-equal')
  })

  it('marks how prominent each option is, for the agent harness', () => {
    renderFlow('nudged', 'store_location')
    const emphasis = (name: string) => screen.getByRole('button', { name }).getAttribute('data-emphasis')
    expect([emphasis('Allow While Using App'), emphasis('Allow Once'), emphasis("Don't Allow")]).toEqual(['primary', 'plain', 'plain'])
  })

  it('marks neutral options as plain', () => {
    renderFlow('neutral', 'reward_keel')
    expect(screen.getAllByRole('button', { name: 'Accept' })[0]).toHaveAttribute('data-emphasis', 'plain')
    expect(screen.getAllByRole('button', { name: 'Decline' })[0]).toHaveAttribute('data-emphasis', 'plain')
  })

  it('neutral prompt: equal buttons with the same labels', () => {
    renderFlow('neutral', 'store_location')
    for (const name of ['Allow While Using App', 'Allow Once', "Don't Allow"]) {
      expect(screen.getByRole('button', { name })).toHaveClass('btn-equal')
    }
  })

  it('logs prompt_shown once, then decision and settled for a one-tap prompt', async () => {
    const user = userEvent.setup()
    const view = renderFlow('neutral', 'bg_during_order')
    view.rerender(
      <BrambleProvider nudgedUnits={[]} initialState={initialAppState()}>
        <FlowChoice flowId="bg_during_order" />
        <Probe />
      </BrambleProvider>,
    )
    await user.click(screen.getByRole('button', { name: "Don't Allow" }))
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

  it('neutral setting: the same switch, starting off (unchecked), and it can be turned on', async () => {
    const user = userEvent.setup()
    renderFlow('neutral', 'deals_personalized')
    const sw = screen.getByRole('switch', { name: 'Deals picked for you' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(latest.flows.deals_personalized).toBe('off')
    expect(events('prompt_shown')[0]).toMatchObject({ defaultShown: 'off' })
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
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
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    expect(latest.points).toBe(350)
    expect(events('points')[0]).toMatchObject({ flowId: 'reward_keel', amount: 200, pointsBefore: 150 })
    expect(events('decision')[0].pointsBefore).toBe(150)
  })

  it('pays nothing for declining', async () => {
    const user = userEvent.setup()
    renderFlow('nudged', 'reward_data_partners')
    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
    expect(latest.points).toBe(150)
  })
})
