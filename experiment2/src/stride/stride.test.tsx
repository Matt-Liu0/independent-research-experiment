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

  it('codes every Stride flow as health information; all but the gamified flows are paired with a Bramble flow', () => {
    for (const f of STRIDE_FLOW_LIST) {
      expect(f.ci.informationCategory, f.id).toBe('health')
      expect(f.counterpart === null, f.id).toBe(f.nudgeType !== undefined)
    }
  })

  it('adds three gamified flows, one per nudge type, that pay nothing', () => {
    const gamified = STRIDE_FLOW_LIST.filter((f) => f.nudgeType !== undefined)
    expect(gamified.map((f) => [f.id, f.nudgeType, f.unit])).toEqual([
      ['stride_streak_autosync', 'streak', 'U1'],
      ['stride_community_map', 'social_proof', 'U4'],
      ['stride_gold_tier', 'status', 'U6'],
    ])
    for (const f of gamified) {
      expect(f.points, f.id).toBeUndefined()
      expect(f.ci.transmissionPrinciple.consideration, f.id).toBeNull()
      // Privacy option last, as in every prompt.
      expect(f.options.at(-1), f.id).toBe(f.privacyOption)
      for (const level of LEVELS) expect(consentForm(f, level), f.id).toBe(level === 'nudged' ? 'nudged_choice' : 'active_choice')
    }
  })

  it('uses the same option words as each Bramble counterpart', () => {
    for (const stride of STRIDE_FLOW_LIST) {
      if (stride.kind !== 'prompt' || stride.counterpart === null || stride.id === 'stride_sam_share') continue
      const bramble = getBrambleFlow(stride.counterpart as Parameters<typeof getBrambleFlow>[0])
      expect(stride.options.map((o) => stride.labels[o]), stride.id).toEqual(bramble.options.map((o) => bramble.labels[o]))
    }
  })
})

describe('Today (Task 7)', () => {
  it('nudged: the health sheet presets detailed data and highlights Allow; choosing settles both, then the streak asks', async () => {
    const user = userEvent.setup()
    const app = renderStride('nudged')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByRole('switch', { name: 'Detailed' })).toHaveAttribute('aria-checked', 'true')
    expect(within(sheet).getByRole('button', { name: 'Allow While Using App' })).toHaveAttribute('data-emphasis', 'primary')
    await user.click(within(sheet).getByRole('button', { name: 'Allow Once' }))
    const streak = await screen.findByRole('dialog', { name: '3-day streak. Don’t lose it' })
    expect(within(streak).getByRole('button', { name: 'Keep My Streak' })).toHaveAttribute('data-emphasis', 'primary')
    await user.click(within(streak).getByRole('button', { name: 'Keep My Streak' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('steps')).toBeInTheDocument()
    expect(screen.getByText(/counting steps in the background/)).toBeInTheDocument()
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([
      ['stride_health_access', 'once'],
      ['stride_health_detail', 'detailed'],
      ['stride_streak_autosync', 'keep_streak'],
    ])
    expect(strideTaskOutcome(7, app.state()).done).toBe(true)
  })

  it('neutral: the streak buttons are equal, and Not Now still finishes the task', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral')
    await user.click(screen.getByRole('button', { name: 'Connect' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Allow While Using App' }))
    const streak = await screen.findByRole('dialog', { name: '3-day streak. Don’t lose it' })
    for (const b of within(streak).getAllByRole('button')) expect(b).toHaveAttribute('data-emphasis', 'plain')
    await user.click(within(streak).getByRole('button', { name: 'Not Now' }))
    expect(app.state().flows.stride_streak_autosync).toBe('not_now')
    expect(strideTaskOutcome(7, app.state()).done).toBe(true)
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
    // Then the community map, with the friend count.
    const map = await screen.findByRole('dialog', { name: 'Share this workout’s route and heart rate?' })
    expect(within(map).getByText(/8 of your 12 friends/)).toBeInTheDocument()
    expect(within(map).getByRole('button', { name: 'Share to Community' })).toHaveAttribute('data-emphasis', 'primary')
    await user.click(within(map).getByRole('button', { name: 'Share to Community' }))
    expect(screen.getByText('Shared to the community map.')).toBeInTheDocument()
    expect(strideTaskOutcome(8, app.state())).toEqual({ done: true, workoutDone: true, samNotified: true })
  })

  it('skips the all-day question when background heart rate was declined, and goes straight to the community map', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'workout', workout: 'warm_up' })
    await user.click(await screen.findByRole('button', { name: "Don't Allow" }))
    await user.click(screen.getByRole('button', { name: 'Share my live workout with Sam' }))
    expect(await screen.findByRole('heading', { name: 'Workout complete' })).toBeInTheDocument()
    const map = screen.getByRole('dialog', { name: 'Share this workout’s route and heart rate?' })
    for (const b of within(map).getAllByRole('button')) expect(b).toHaveAttribute('data-emphasis', 'plain')
    await user.click(within(map).getByRole('button', { name: 'Keep Private' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(app.state().flows.stride_hr_all_day).toBeNull()
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
  it('starts below the cost: an accepted offer pays for the report', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'rewards' })
    expect(START_COINS).toBeLessThan(REPORT_COST)
    expect(screen.getByText(`${START_COINS} coins`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled()
    const insurer = within(screen.getByText('Keel Health Insurance').closest('.offer-card') as HTMLElement)
    await user.click(insurer.getByRole('button', { name: 'Accept' }))
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(app.state().points).toBe(START_COINS + 200 - REPORT_COST)
    expect(strideTaskOutcome(10, app.state())).toMatchObject({ done: true, reportUnlocked: true })
  })

  it('counts the task as done when every offer is declined, without unlocking', async () => {
    const user = userEvent.setup()
    const app = renderStride('nudged', { screen: 'rewards' })
    for (const card of document.querySelectorAll('.offer-card')) {
      expect(strideTaskOutcome(10, app.state()).done).toBe(false)
      await user.click(within(card as HTMLElement).getByRole('button', { name: 'Decline' }))
    }
    expect(strideTaskOutcome(10, app.state())).toEqual({ done: true, reportUnlocked: false, offersAnswered: true })
    expect(app.state().points).toBe(START_COINS)
  })

  it('never goes below zero coins when an offer is taken back after the report was bought', async () => {
    const user = userEvent.setup()
    const app = renderStride('neutral', { screen: 'rewards' })
    const university = within(screen.getByText('University sleep study').closest('.offer-card') as HTMLElement)
    await user.click(university.getByRole('button', { name: 'Accept' }))
    await user.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(app.state().points).toBe(START_COINS + 100 - REPORT_COST)
    await user.click(university.getByRole('button', { name: 'Change' }))
    await user.click(university.getByRole('button', { name: 'Decline' }))
    expect(app.state().points).toBe(0)
    expect(app.state().reportUnlocked).toBe(true)
  })

  it.each(LEVELS)('%s: reaching Gold pays no coins and is not one of the paid offers', async (level) => {
    const user = userEvent.setup()
    const app = renderStride(level, { screen: 'rewards' })
    const tier = within(screen.getByText('You’re 40 points from Gold').closest('.tier-card') as HTMLElement)
    expect(tier.getByRole('button', { name: 'Reach Gold' })).toHaveAttribute('data-emphasis', level === 'nudged' ? 'primary' : 'plain')
    expect(document.querySelectorAll('.offer-card')).toHaveLength(3)
    await user.click(tier.getByRole('button', { name: 'Reach Gold' }))
    expect(screen.getByText('You reached Gold')).toBeInTheDocument()
    expect(app.state().points).toBe(START_COINS)
    expect(app.eventsOf('settled').map((e) => [e.flowId, e.value])).toEqual([['stride_gold_tier', 'reach_gold']])
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

/** Flows that depend on a sharing answer, so declining everything leaves them unasked. */
const NOT_APPLICABLE_WHEN_DECLINED: string[] = ['stride_health_detail', 'stride_hr_all_day', 'stride_streak_autosync']

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
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Keep Private' }))
  outcomes[8] = strideTaskOutcome(8, app.state()).done

  await user.click(tab('Plans'))
  for (const s of screen.getAllByRole('switch')) if (s.getAttribute('aria-checked') === 'true') await user.click(s)
  await user.click(screen.getByRole('button', { name: 'Save Wind-down yoga' }))
  await user.click(screen.getByRole('button', { name: 'Save Heart-health walking' }))
  outcomes[9] = strideTaskOutcome(9, app.state()).done

  await user.click(tab('Rewards'))
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
  await user.click(screen.getByRole('button', { name: 'Not Now' }))
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
      if (NOT_APPLICABLE_WHEN_DECLINED.includes(flow.id)) expect(s.flows[flow.id], flow.id).toBeNull()
      else expect(s.flows[flow.id], flow.id).toBe(flow.privacyOption)
    }
    expect(bonusDollars(s.points)).toBe(0.5)
  }, 20_000)

  it.each(LEVELS)('%s: logs each shown flow once before its decisions, and settles each once', async (friction) => {
    const { app } = await declineEverything(friction)
    const shown = app.eventsOf('prompt_shown').map((e) => e.flowId)
    const settled = app.eventsOf('settled').map((e) => String(e.flowId))
    expect(new Set(shown).size).toBe(shown.length)
    expect(settled.sort()).toEqual(
      STRIDE_FLOW_IDS.filter((id) => !NOT_APPLICABLE_WHEN_DECLINED.includes(id)).sort(),
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

  it('pays $0.50–$5.00 in coins, like Bramble', () => {
    const offers = STRIDE_FLOW_LIST.filter((f) => f.points)
    const all = offers.reduce((sum, f) => sum + (f.points ?? 0), 0)
    // Without the report: the 50 starting coins to every offer accepted.
    expect(bonusDollars(START_COINS)).toBe(0.5)
    expect(bonusDollars(START_COINS + all)).toBe(5)
    expect(STRIDE_FLOWS.getFlow('stride_reward_university').points).toBe(100)
  })
})
