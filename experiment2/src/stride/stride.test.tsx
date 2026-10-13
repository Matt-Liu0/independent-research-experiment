import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getFlow as getBrambleFlow } from '../bramble/flows'
import { bonusDollars } from '../core/bonus'
import { consentForm } from '../core/ci'
import type { Friction } from '../core/flowTypes'
import { renderStride } from '../test/renderStride'
import { REPORT_COST, START_COINS } from './data'
import { STRIDE_FLOW_LIST, STRIDE_FLOWS } from './flows'
import { strideTaskOutcome } from './tasks'
import { STRIDE_FLOW_IDS, type StrideTask } from './types'

const LEVELS: Friction[] = ['nudged', 'neutral']
const tab = (name: string) => within(screen.getByRole('navigation', { name: 'Stride' })).getByRole('button', { name })

describe('Stride flows', () => {
  it('has every flow once, in order, all in Stride', () => {
    expect(STRIDE_FLOW_LIST.map((f) => f.id)).toEqual([...STRIDE_FLOW_IDS])
    for (const f of STRIDE_FLOW_LIST) expect(f.app).toBe('stride')
  })

  it("mirrors each counterpart's decision screen, kind, timing and consent forms", () => {
    const paired = STRIDE_FLOW_LIST.filter((f) => f.counterpart !== null)
    expect(paired).toHaveLength(12)
    for (const stride of paired) {
      const bramble = getBrambleFlow(stride.counterpart as Parameters<typeof getBrambleFlow>[0])
      expect(bramble.counterpart, stride.id).toBe(stride.id)
      expect([stride.unit, stride.kind, stride.settleOn, stride.options.length], stride.id).toEqual([
        bramble.unit,
        bramble.kind,
        bramble.settleOn,
        bramble.options.length,
      ])
      expect(stride.ci.recipientType, stride.id).toBe(bramble.ci.recipientType)
      expect(stride.ci.transmissionPrinciple.condition, stride.id).toBe(bramble.ci.transmissionPrinciple.condition)
      expect(stride.points, stride.id).toBe(bramble.points)
      for (const level of LEVELS) expect(consentForm(stride, level), `${stride.id} ${level}`).toBe(consentForm(bramble, level))
      // The privacy option sits in the same position, so "decline" means the same thing.
      expect(stride.options.indexOf(stride.privacyOption)).toBe(bramble.options.indexOf(bramble.privacyOption))
    }
  })

  it('codes every Stride flow as health information, each paired with a Bramble flow', () => {
    for (const f of STRIDE_FLOW_LIST) {
      expect(f.ci.informationCategory, f.id).toBe('health')
      expect(f.counterpart, f.id).not.toBeNull()
    }
  })

  it('uses the same option words as each Bramble counterpart', () => {
    for (const stride of STRIDE_FLOW_LIST) {
      if (stride.kind !== 'prompt' || stride.screen === 'workout' && stride.id === 'stride_sam_share') continue
      const bramble = getBrambleFlow(stride.counterpart as Parameters<typeof getBrambleFlow>[0])
      expect(stride.options.map((o) => stride.labels[o]), stride.id).toEqual(bramble.options.map((o) => bramble.labels[o]))
    }
  })
})

describe('Today (Task 7)', () => {
  it('nudged: the health sheet presets detailed data and highlights Allow; choosing settles both', async () => {
    const user = userEvent.setup()
    const app = renderStride('nudged')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('switch', { name: 'Detailed' })).toHaveAttribute('aria-checked', 'true')
    expect(within(sheet).getByRole('button', { name: 'Allow While Using App' })).toHaveAttribute('data-emphasis', 'primary')
    await user.click(within(sheet).getByRole('button', { name: 'Allow Once' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('steps')).toBeInTheDocument()
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['stride_health_access', 'once'],
      ['stride_health_detail', 'detailed'],
    ])
  })

  it('neutral: detailed data starts off, buttons are equal, and declining leaves detail not applicable', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('switch', { name: 'Detailed' })).toHaveAttribute('aria-checked', 'false')
    for (const b of within(sheet).getAllByRole('button')) expect(b).toHaveAttribute('data-emphasis', 'plain')
    await user.click(within(sheet).getByRole('button', { name: "Don't Allow" }))
    expect(screen.getByText(/Health data is off/)).toBeInTheDocument()
    expect(app.state().flows.stride_health_detail).toBeNull()
    expect(app.eventsOf('settled').map((e) => e.flowId)).toEqual(['stride_health_access'])
  })

})

describe('Workout (Task 8)', () => {
  it('neutral: coach sharing and the offers box start unchecked; Start workout settles both', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'workout_setup' })
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Start workout' }))
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['stride_coach_live', 'dont_share'],
      ['stride_partner_offers', 'unchecked'],
    ])
    expect(app.state().screen).toBe('workout')
  })

  it('nudged: presets sharing and settles the presets if left alone', async () => {
    const user = userEvent.setup()
    const app = renderStride('nudged', { screen: 'workout_setup' })
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox')).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Start workout' }))
    expect(app.eventsOf('settled')).toEqual([
      expect.objectContaining({ flowId: 'stride_coach_live', value: 'share', changedFromDefault: false }),
      expect.objectContaining({ flowId: 'stride_partner_offers', value: 'checked', changedFromDefault: false }),
    ])
  })

  it('finishes after both workout prompts, then asks about all-day monitoring if background was allowed', async () => {
    const user = userEvent.setup()
    const app = renderStride('nudged', { screen: 'workout', workout: 'warm_up' })
    await user.click(await screen.findByRole('button', { name: 'Allow' }))
    await user.click(screen.getByRole('button', { name: 'Send a summary only' }))
    expect(await screen.findByRole('heading', { name: 'Workout complete' })).toBeInTheDocument()
    const sheet = screen.getByRole('dialog', { name: 'Keep heart-rate monitoring on all day?' })
    await user.click(within(sheet).getByRole('button', { name: 'Keep Only While Using' }))
    expect(app.state().flows.stride_hr_all_day).toBe('turn_off')
    expect(strideTaskOutcome(8, app.state())).toEqual({ done: true, workoutDone: true, samNotified: true })
  })

  it('skips the all-day question when background heart rate was declined', async () => {
    const user = userEvent.setup()
    renderStride('neutral', { screen: 'workout', workout: 'warm_up' })
    await user.click(await screen.findByRole('button', { name: "Don't Allow" }))
    await user.click(screen.getByRole('button', { name: 'Share my live workout with Sam' }))
    expect(await screen.findByRole('heading', { name: 'Workout complete' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('takes the Workouts tab back to a workout in progress', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'plans', workout: 'warm_up' })
    await user.click(tab('Workouts'))
    expect(app.state().screen).toBe('workout')
  })
})

describe('Plans (Task 9)', () => {
  it.each(LEVELS)('%s: settings start at the level, plans can be saved, and settings settle on leaving', async (level) => {
    const user = userEvent.setup()
    const app = renderStride(level, { screen: 'plans' })
    const on = level === 'nudged' ? 'true' : 'false'
    expect(screen.getAllByRole('switch').map((s) => s.getAttribute('aria-checked'))).toEqual([on, on])
    await user.click(screen.getByRole('button', { name: 'Save 5K in 6 weeks' }))
    await user.click(screen.getByRole('button', { name: 'Save Strength basics' }))
    expect(strideTaskOutcome(9, app.state())).toEqual({ done: true, plansSaved: 2 })
    expect(app.eventsOf('settled')).toHaveLength(0)
    await user.click(tab('Rewards'))
    expect(app.eventsOf('settled').map((e) => e.flowId)).toEqual(['stride_plans_personalized', 'stride_plans_partner_offers'])
  })
})

describe('Rewards (Task 10)', () => {
  it('unlocks the report with coins and pays for accepted offers', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'rewards' })
    expect(screen.getByText(`${START_COINS} coins`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    const insurer = within(screen.getByText('Keel Health Insurance').closest('.offer-card') as HTMLElement)
    await user.click(insurer.getByRole('button', { name: 'Accept' }))
    expect(app.state().points).toBe(START_COINS - REPORT_COST + 200)
    expect(strideTaskOutcome(10, app.state())).toEqual({ done: true, reportUnlocked: true })
  })
})

describe('Profile', () => {
  it('lists every Stride flow, and logs changes as account_page decisions', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'today' })
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: "Don't Allow" }))
    await user.click(tab('Profile'))
    for (const f of STRIDE_FLOW_LIST) expect(screen.getByRole('group', { name: f.account.label })).toBeInTheDocument()
    const health = within(screen.getByRole('group', { name: 'Health Data' }))
    await user.click(health.getByRole('button', { name: 'While Using the App' }))
    expect(app.eventsOf('decision').at(-1)).toMatchObject({ flowId: 'stride_health_access', value: 'while_using', source: 'account_page' })
    expect(app.state().accountPageVisits).toBe(1)
  })
})

/** Does tasks 7–10, declining everything. Returns the outcome of each task. */
async function declineEverything(friction: Friction) {
  const user = userEvent.setup()
  const app = renderStride(friction)
  const outcomes: Partial<Record<StrideTask, boolean>> = {}

  await user.click(screen.getByRole('button', { name: 'Connect' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: "Don't Allow" }))
  outcomes[7] = strideTaskOutcome(7, app.state()).done

  await user.click(tab('Workouts'))
  // Settings: turn sharing off wherever it is on.
  const sw = screen.getByRole('switch')
  if (sw.getAttribute('aria-checked') === 'true') await user.click(sw)
  const box = screen.getByRole('checkbox')
  if ((box as HTMLInputElement).checked) await user.click(box)
  await user.click(screen.getByRole('button', { name: 'Start workout' }))
  await user.click(await screen.findByRole('button', { name: "Don't Allow" }))
  await user.click(screen.getByRole('button', { name: 'Send a summary only' }))
  await screen.findByRole('heading', { name: 'Workout complete' })
  outcomes[8] = strideTaskOutcome(8, app.state()).done

  await user.click(tab('Plans'))
  for (const s of screen.getAllByRole('switch')) if (s.getAttribute('aria-checked') === 'true') await user.click(s)
  await user.click(screen.getByRole('button', { name: 'Save Wind-down yoga' }))
  await user.click(screen.getByRole('button', { name: 'Save Heart-health walking' }))
  outcomes[9] = strideTaskOutcome(9, app.state()).done

  await user.click(tab('Rewards'))
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
  for (const card of document.querySelectorAll<HTMLElement>('.offer-card')) {
    await user.click(within(card).getByRole('button', { name: 'Decline' }))
  }
  outcomes[10] = strideTaskOutcome(10, app.state()).done
  return { app, outcomes }
}

describe('decline everything (Stride)', () => {
  it.each(LEVELS)('%s: every task can be finished while declining every flow', async (friction) => {
    const { app, outcomes } = await declineEverything(friction)
    expect(outcomes).toEqual({ 7: true, 8: true, 9: true, 10: true })
    const s = app.state()
    for (const flow of STRIDE_FLOW_LIST) {
      if (flow.id === 'stride_health_detail' || flow.id === 'stride_hr_all_day') expect(s.flows[flow.id], flow.id).toBeNull()
      else expect(s.flows[flow.id], flow.id).toBe(flow.privacyOption)
    }
    expect(bonusDollars(s.points)).toBe(0.12)
  }, 20_000)

  it.each(LEVELS)('%s: logs each shown flow once before its decisions, and settles each once', async (friction) => {
    const { app } = await declineEverything(friction)
    const shown = app.eventsOf('prompt_shown').map((e) => e.flowId)
    const settled = app.eventsOf('settled').map((e) => String(e.flowId))
    expect(new Set(shown).size).toBe(shown.length)
    expect(settled.sort()).toEqual(
      STRIDE_FLOW_IDS.filter((id) => id !== 'stride_health_detail' && id !== 'stride_hr_all_day').sort(),
    )
    for (const id of settled) {
      const firstShown = app.events.findIndex((e) => e.type === 'prompt_shown' && e.flowId === id)
      const firstDecision = app.events.findIndex((e) => e.type === 'decision' && e.flowId === id)
      expect(firstShown, id).toBeGreaterThanOrEqual(0)
      if (firstDecision >= 0) expect(firstShown, id).toBeLessThan(firstDecision)
    }
  }, 20_000)
})

describe('parity between friction levels (Stride)', () => {
  /** Visible text with every flow control removed. */
  function textWithoutControls(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-flow-control]').forEach((el) => el.remove())
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  it.each([
    ['today', {}],
    ['workout_setup', {}],
    ['workout', { workout: 'main_set' as const }],
    ['plans', {}],
    ['rewards', {}],
    ['profile', {}],
  ] as const)('%s: the same text in both levels, apart from the controls', (screenId, extra) => {
    const texts = LEVELS.map((level) => {
      const app = renderStride(level, { screen: screenId, ...extra })
      const text = textWithoutControls(app.container)
      app.unmount()
      return text
    })
    expect(texts[0]).toBe(texts[1])
  })

  it('pays $0.12–$0.57 in coins, like Bramble', () => {
    const offers = STRIDE_FLOW_LIST.filter((f) => f.points)
    const all = offers.reduce((sum, f) => sum + (f.points ?? 0), 0)
    expect(bonusDollars(START_COINS - REPORT_COST)).toBe(0.12)
    expect(bonusDollars(START_COINS - REPORT_COST + all)).toBe(0.57)
    expect(STRIDE_FLOWS.getFlow('stride_reward_university').points).toBe(100)
  })
})
