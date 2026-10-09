import { describe, expect, it } from 'vitest'
import { FLOWS, dependentsOf, emptyFlowValues, getFlow, isApplicable } from './flows'
import { FLOW_IDS } from './types'

describe('flow config', () => {
  it('has exactly the 12 flows, in spec order, with unique IDs', () => {
    expect(FLOWS.map((f) => f.id)).toEqual([...FLOW_IDS])
    expect(new Set(FLOWS.map((f) => f.id)).size).toBe(12)
  })

  it.each(FLOWS.map((f) => [f.id, f] as const))('%s is internally consistent', (_id, flow) => {
    expect(flow.options.length).toBeGreaterThanOrEqual(2)
    expect(flow.options).toContain(flow.privacyOption)
    for (const option of flow.options) {
      expect(flow.labels[option], `label for ${option}`).toBeTruthy()
      expect(flow.account.labels[option], `account label for ${option}`).toBeTruthy()
    }
    for (const level of [flow.nudged, flow.neutral]) {
      if (level.default !== null) expect(flow.options).toContain(level.default)
      if (level.emphasis !== null) expect(flow.options).toContain(level.emphasis)
    }
    if (flow.dependsOn) {
      expect(FLOW_IDS).toContain(flow.dependsOn.flowId)
      expect(flow.dependsOn.flowId).not.toBe(flow.id)
    }
  })

  it('uses the same control shape for one-tap prompts in both levels', () => {
    for (const flow of FLOWS.filter((f) => f.kind === 'prompt')) {
      expect(flow.nudged.control).toBe('buttons')
      expect(flow.neutral.control).toBe('buttons')
      expect(flow.nudged.default).toBeNull()
      expect(flow.neutral.default).toBeNull()
    }
  })

  it('never emphasizes an option in neutral', () => {
    for (const flow of FLOWS) expect(flow.neutral.emphasis, flow.id).toBeNull()
  })

  it('emphasizes or presets the sharing option in nudged, never the privacy option', () => {
    for (const flow of FLOWS) {
      const pushed = flow.nudged.emphasis ?? flow.nudged.default
      expect(pushed, flow.id).not.toBeNull()
      expect(pushed, flow.id).not.toBe(flow.privacyOption)
    }
  })

  it('follows Utz et al. in neutral: prompts have no preset, settings start unchecked (least sharing)', () => {
    for (const flow of FLOWS) {
      if (flow.kind === 'prompt') expect(flow.neutral.default, flow.id).toBeNull()
      else expect(flow.neutral.default, flow.id).toBe(flow.privacyOption)
    }
  })

  it('uses the same control in both levels for settings, so only the preset differs', () => {
    for (const flow of FLOWS.filter((f) => f.kind === 'setting')) {
      expect(flow.neutral.control, flow.id).toBe(flow.nudged.control)
      expect(['switch', 'checkbox'], flow.id).toContain(flow.nudged.control)
    }
  })

  it('pays the same points in both levels (points live on the flow, not the level)', () => {
    expect(getFlow('reward_keel').points).toBe(200)
    expect(getFlow('reward_university').points).toBe(100)
    expect(getFlow('reward_data_partners').points).toBe(150)
  })

  it('never uses the word "privacy" or "usability" in participant-facing text', () => {
    for (const flow of FLOWS) {
      const text = [flow.title, flow.description, ...Object.values(flow.labels), flow.account.label]
        .join(' ')
        .toLowerCase()
      expect(text, flow.id).not.toMatch(/privacy|usability/)
    }
  })
})

describe('isApplicable', () => {
  it('treats flows without dependencies as always applicable', () => {
    expect(isApplicable('courier_live', emptyFlowValues())).toBe(true)
  })

  it('makes precise location depend on location being allowed', () => {
    const values = emptyFlowValues()
    expect(isApplicable('store_precise', values)).toBe(false)
    values.store_location = 'dont_allow'
    expect(isApplicable('store_precise', values)).toBe(false)
    values.store_location = 'once'
    expect(isApplicable('store_precise', values)).toBe(true)
  })

  it('makes background-between-orders depend on background-during-order being allowed', () => {
    const values = emptyFlowValues()
    values.bg_during_order = 'not_now'
    expect(isApplicable('bg_between_orders', values)).toBe(false)
    values.bg_during_order = 'allow'
    expect(isApplicable('bg_between_orders', values)).toBe(true)
  })

  it('lists dependents', () => {
    expect(dependentsOf('store_location')).toEqual(['store_precise'])
    expect(dependentsOf('bg_during_order')).toEqual(['bg_between_orders'])
    expect(dependentsOf('reward_keel')).toEqual([])
  })
})
