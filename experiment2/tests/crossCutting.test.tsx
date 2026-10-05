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
  await user.click(screen.getByRole('button', { name: "Don't allow" }))
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
  if (friction === 'nudged') {
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('checkbox'))
  } else {
    await user.click(screen.getByRole('button', { name: "Don't share" }))
  }
  await user.click(screen.getByRole('button', { name: /place order/i }))
  finish(2)

  // Task 3: no background location; arrival time only.
  await user.click(tab('Orders'))
  await user.click(screen.getByRole('button', { name: 'Not now' }))
  await user.click(screen.getByRole('button', { name: 'Send arrival time only' }))
  await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  finish(3)

  // Task 4: both deal settings off, save two deals.
  await user.click(tab('Deals'))
  if (friction === 'nudged') {
    for (const sw of screen.getAllByRole('switch')) await user.click(sw)
  } else {
    for (const name of ['Deals picked for you', 'Offers from partner brands']) {
      await user.click(within(screen.getByRole('group', { name })).getByRole('button', { name: 'Off' }))
    }
  }
  await user.click(screen.getByRole('button', { name: 'Save Honeycrisp apples' }))
  await user.click(screen.getByRole('button', { name: 'Save Sourdough loaf' }))
  finish(4)

  // Task 5: free delivery, and no to every offer.
  await user.click(tab('Rewards'))
  await user.click(screen.getByRole('button', { name: 'Redeem' }))
  for (const button of screen.getAllByRole('button', { name: 'No thanks' })) await user.click(button)
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
    expect(s.points).toBe(120)
    expect(bonusDollars(s.points)).toBe(0.12)
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

    // Presets show up as defaultShown in nudged; neutral presets only the checkbox.
    const preset = app.eventsOf('settled').find((e) => e.flowId === 'courier_live')!
    expect(preset.defaultShown).toBe(friction === 'nudged' ? 'share' : null)
    expect(preset.changedFromDefault).toBe(friction === 'nudged')
  }, 20_000)
})

describe('accepting everything (nudged)', () => {
  it('shows and settles the dependent flows too', async () => {
    const user = userEvent.setup()
    const app = renderApp('nudged', { storeId: 'elm', order: 'on_the_way', orderItems: ['oat_milk', 'sourdough'], screen: 'find_store' })
    await user.click(screen.getByRole('button', { name: 'Allow while using Bramble' }))
    await user.click(tab('Orders'))
    await user.click(screen.getByRole('button', { name: 'Allow in background' }))
    await user.click(screen.getByRole('button', { name: 'Share my live location with Sam' }))
    await screen.findByRole('heading', { name: /^Delivered at / }, { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: 'Keep it on' }))

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
  it('pays $0.12–$0.57 for every combination of offers once free delivery is redeemed', () => {
    const offers = FLOWS.filter((f) => f.points)
    const bonuses: number[] = []
    for (let mask = 0; mask < 2 ** offers.length; mask++) {
      let s = appReducer(initialAppState(), { type: 'redeem' })
      offers.forEach((offer, i) => {
        if (mask & (1 << i)) s = appReducer(s, { type: 'addPoints', amount: offer.points! })
      })
      bonuses.push(bonusDollars(s.points))
    }
    expect(Math.min(...bonuses)).toBe(0.12)
    expect(Math.max(...bonuses)).toBe(0.57)
    expect(bonuses.every((b) => b >= 0.12 && b <= 0.57)).toBe(true)
  })
})
