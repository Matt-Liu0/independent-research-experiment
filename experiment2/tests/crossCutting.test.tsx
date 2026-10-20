// Checks that apply to the whole app rather than one screen (plan, Phase 11).
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { appReducer, bonusDollars, initialAppState, type AppState } from '../src/bramble/appState'
import { FLOWS, emptyFlowValues } from '../src/bramble/flows'
import type { Friction } from '../src/bramble/types'
import { taskOutcome } from '../src/study/tasks'
import { renderApp } from '../src/test/renderApp'

const LEVELS: Friction[] = ['nudged', 'neutral']
const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Bramble' })).getByRole('button', { name })

/** Visible text with every flow control removed (switches, checkboxes, choice buttons). */
function textWithoutControls(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-flow-control]').forEach((el) => el.remove())
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Labels on the prompt buttons, sorted (nudged puts the emphasized one first). */
function promptLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.prompt-buttons [data-flow-control], .prompt-buttons button')]
    .map((el) => el.textContent ?? '')
    .sort()
}

const allOn = { ...emptyFlowValues(), deals_personalized: 'on', deals_partner_offers: 'on' }

const PARITY_STATES: [string, Partial<AppState>][] = [
  ['shop', { screen: 'shop' }],
  ['find_store (location sheet)', { screen: 'find_store' }],
  [
    'find_store (map, location allowed)',
    {
      screen: 'find_store',
      flows: { ...emptyFlowValues(), store_location: 'once', store_precise: 'general' },
      settled: ['store_location', 'store_precise'],
    },
  ],
  [
    'find_store (ZIP, location refused)',
    { screen: 'find_store', flows: { ...emptyFlowValues(), store_location: 'dont_allow' }, settled: ['store_location'] },
  ],
  ['checkout', { screen: 'checkout', storeId: 'elm', cart: ['oat_milk', 'sourdough'] }],
  ['orders (on the way)', { screen: 'orders', storeId: 'elm', order: 'on_the_way', orderItems: ['oat_milk'] }],
  [
    'orders (delivered, keep-on sheet)',
    {
      screen: 'orders',
      order: 'delivered',
      flows: { ...emptyFlowValues(), bg_during_order: 'allow', sam_share: 'arrival_only' },
      settled: ['bg_during_order', 'sam_share'],
    },
  ],
  ['deals', { screen: 'deals', flows: allOn as AppState['flows'] }],
  ['rewards', { screen: 'rewards' }],
  ['account', { screen: 'account' }],
]

describe('parity between friction levels', () => {
  it.each(PARITY_STATES)('%s: same text and points in both levels', (_name, state) => {
    const texts: string[] = []
    const labels: string[][] = []
    for (const friction of LEVELS) {
      const app = renderApp(friction, state)
      texts.push(textWithoutControls(document.body))
      labels.push(promptLabels(document.body))
      app.unmount()
    }
    expect(texts[1]).toBe(texts[0])
    expect(labels[1]).toEqual(labels[0])
  })
})

/** Completes all six tasks choosing the option that shares least at every flow. */
async function declineEverything(friction: Friction) {
  const user = userEvent.setup()
  const app = renderApp(friction)
  const outcomes: Record<number, boolean> = {}
  const finish = (task: 1 | 2 | 3 | 4 | 5 | 6) => {
    app.bramble().leaveScreen()
    outcomes[task] = taskOutcome(task, app.state()).done
  }

  // Task 1: refuse location, find a store by ZIP.
  await user.click(screen.getByRole('button', { name: 'Find a store' }))
  await user.click(screen.getByRole('button', { name: "Don't Allow" }))
  await user.type(screen.getByLabelText('ZIP code'), '10001')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await user.click(screen.getByRole('button', { name: /^Bramble Market · Elm Street/ }))
  await user.click(screen.getByRole('button', { name: 'Set as my store' }))
  finish(1)

  // Task 2: order without sharing anything.
  await user.click(tab('Shop'))
  await user.click(screen.getByRole('button', { name: 'Add Oat milk, 64 oz' }))
  await user.click(screen.getByRole('button', { name: 'Add Sourdough loaf' }))
  await user.click(screen.getByRole('button', { name: /go to checkout/i }))
  // Nudged presets sharing, so it must be undone; neutral already starts unchecked.
  if (friction === 'nudged') {
    await user.click(screen.getByRole('switch'))
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
  }
  await user.click(screen.getByRole('button', { name: /place order/i }))
  finish(2)

  // Task 3: no background location; arrival time only.
  await user.click(tab('Orders'))
  await user.click(screen.getByRole('button', { name: "Don't Allow" }))
  await user.click(screen.getByRole('button', { name: 'Send arrival time only' }))
  await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  finish(3)

  // Task 4: both deal settings off, save two deals.
  await user.click(tab('Deals'))
  if (friction === 'nudged') {
    for (const sw of screen.getAllByRole('switch')) await user.click(sw)
  }
  await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
  await user.click(screen.getByRole('button', { name: 'Save Sourdough loaf' }))
  finish(4)

  // Task 5: free delivery, and no to every offer.
  await user.click(tab('Rewards'))
  await user.click(screen.getByRole('button', { name: 'Redeem' }))
  for (const button of screen.getAllByRole('button', { name: 'Decline' })) await user.click(button)
  finish(5)

  // Task 6: change the address.
  await user.click(tab('Account'))
  const address = screen.getByLabelText('Delivery address')
  await user.clear(address)
  await user.type(address, '40 Oak Street')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  finish(6)

  return { app, outcomes }
}

describe('decline everything', () => {
  it.each(LEVELS)('%s: every task can be finished while declining every flow', async (friction) => {
    const { app, outcomes } = await declineEverything(friction)
    expect(outcomes).toEqual({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true })

    const s = app.state()
    for (const flow of FLOWS) {
      if (flow.id === 'store_precise' || flow.id === 'bg_between_orders') {
        expect(s.flows[flow.id], flow.id).toBeNull()
      } else {
        expect(s.flows[flow.id], flow.id).toBe(flow.privacyOption)
      }
    }
    expect(s.points).toBe(50)
    expect(bonusDollars(s.points)).toBe(0.5)
  }, 20_000)

  it.each(LEVELS)('%s: logs each shown flow once before its decisions, and settles each once', async (friction) => {
    const { app } = await declineEverything(friction)
    const shown = app.eventsOf('prompt_shown').map((e) => e.flowId)
    const settled = app.eventsOf('settled').map((e) => String(e.flowId))

    // #2 appears in the location sheet but is never settled once location is refused; #7 never appears.
    expect(new Set(shown).size).toBe(shown.length)
    expect(shown).not.toContain('bg_between_orders')
    expect(settled.sort()).toEqual(
      FLOWS.map((f) => f.id)
        .filter((id) => id !== 'store_precise' && id !== 'bg_between_orders')
        .sort(),
    )

    for (const id of settled) {
      const firstShown = app.events.findIndex((e) => e.type === 'prompt_shown' && e.flowId === id)
      const firstDecision = app.events.findIndex((e) => e.type === 'decision' && e.flowId === id)
      expect(firstShown, id).toBeGreaterThanOrEqual(0)
      if (firstDecision >= 0) expect(firstShown, id).toBeLessThan(firstDecision)
    }

    // The preset is recorded: sharing in nudged (so declining changes it), unchecked in neutral.
    const preset = app.eventsOf('settled').find((e) => e.flowId === 'courier_live')!
    expect(preset.defaultShown).toBe(friction === 'nudged' ? 'share' : 'dont_share')
    expect(preset.changedFromDefault).toBe(friction === 'nudged')
  }, 20_000)
})

describe('accepting everything (nudged)', () => {
  it('shows and settles the dependent flows too', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { storeId: 'elm', order: 'on_the_way', orderItems: ['oat_milk', 'sourdough'], screen: 'find_store' })
    await user.click(screen.getByRole('button', { name: 'Allow While Using App' }))
    await user.click(tab('Orders'))
    await user.click(screen.getByRole('button', { name: 'Allow' }))
    await user.click(screen.getByRole('button', { name: 'Share my live location with Sam' }))
    await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: 'Change to Always Allow' }))

    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['store_location', 'while_using'],
      ['store_precise', 'exact'],
      ['bg_during_order', 'allow'],
      ['sam_share', 'live_location'],
      ['bg_between_orders', 'keep_on'],
    ])
  })
})

describe('points range', () => {
  it('pays $0.50–$5.00 for every combination of offers once free delivery is redeemed', () => {
    const offers = FLOWS.filter((f) => f.points)
    const bonuses: number[] = []
    for (let mask = 0; mask < 2 ** offers.length; mask++) {
      let s = appReducer(initialAppState(), { type: 'redeem' })
      offers.forEach((offer, i) => {
        if (mask & (1 << i)) s = appReducer(s, { type: 'addPoints', amount: offer.points! })
      })
      bonuses.push(bonusDollars(s.points))
    }
    expect(Math.min(...bonuses)).toBe(0.5)
    expect(Math.max(...bonuses)).toBe(5)
    expect(bonuses.every((b) => b >= 0.5 && b <= 5)).toBe(true)
  })
})

describe('friction by decision screen (within each participant)', () => {
  it('shows each screen at its own level in a mixed pattern, and logs the matching presets', async () => {
    const user = userEvent.setup()
    // Checkout (U2) and Deals (U5) nudged; the location prompt (U1) and Rewards (U6) neutral.
    const app = renderApp(['U2', 'U5'], { screen: 'find_store', storeId: 'elm', cart: ['oat_milk'] })

    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('switch', { name: 'Precise' })).toHaveAttribute('aria-checked', 'false')
    expect(within(sheet).getByRole('button', { name: 'Allow While Using App' })).toHaveAttribute('data-emphasis', 'plain')
    await user.click(within(sheet).getByRole('button', { name: 'Allow Once' }))

    await user.click(screen.getByRole('button', { name: /^Cart/ }))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()

    await user.click(tab('Deals'))
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true'])

    await user.click(tab('Rewards'))
    expect(screen.getAllByRole('button', { name: 'Accept' })[0]).toHaveAttribute('data-emphasis', 'plain')

    const shown = Object.fromEntries(app.eventsOf('prompt_shown').map((e) => [e.flowId, e.defaultShown]))
    expect(shown).toMatchObject({
      store_precise: 'general',
      courier_live: 'share',
      checkout_partner_offers: 'checked',
      deals_personalized: 'on',
      reward_keel: null,
    })
  })

  it('records each flow at its own level in the export', async () => {
    const { buildExport } = await import('../scripts/transform')
    const result = buildExport('participants', [
      { uid: 'u1', data: { prolificPid: 'p1', pattern: 'U2U5U6', withdrawn: false, appState: { flows: {} } }, events: [] },
    ])
    const level = Object.fromEntries(result.flows.map((r) => [r.flowId, [r.unit, r.friction, r.consentForm]]))
    expect(level.store_location).toEqual(['U1', 'neutral', 'active_choice'])
    expect(level.courier_live).toEqual(['U2', 'nudged', 'opt_out'])
    expect(level.deals_partner_offers).toEqual(['U5', 'nudged', 'opt_out'])
    expect(level.reward_university).toEqual(['U6', 'nudged', 'nudged_choice'])
    expect(level.bg_between_orders).toEqual(['U4', 'neutral', 'active_choice'])
    expect(result.participants[0]).toMatchObject({ pattern: 'U2U5U6', nudgedUnits: 'U2;U5;U6' })
  })
})
