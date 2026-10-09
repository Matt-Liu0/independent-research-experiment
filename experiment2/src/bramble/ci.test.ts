import { describe, expect, it } from 'vitest'
import { consentForm } from './ci'
import { FLOWS } from './flows'

describe('GKC-CI coding', () => {
  it('codes every flow, with the participant as subject and distinct sender and recipient', () => {
    for (const flow of FLOWS) {
      expect(flow.ci.subject, flow.id).toBe('participant')
      expect(flow.ci.sender, flow.id).not.toBe(flow.ci.recipient)
      expect(flow.ci.statement.length, flow.id).toBeGreaterThan(20)
    }
  })

  it('records payment exactly where the app pays points', () => {
    for (const flow of FLOWS) {
      const tp = flow.ci.transmissionPrinciple
      if (flow.points) {
        expect(tp.condition, flow.id).toBe('with_consent_for_payment')
        expect(tp.consideration, flow.id).toEqual({ points: flow.points, usd: flow.points / 1000 })
      } else {
        expect(tp.condition, flow.id).not.toBe('with_consent_for_payment')
        expect(tp.consideration, flow.id).toBeNull()
      }
    }
  })

  it('derives the consent form from each level: the only thing the manipulation changes', () => {
    const forms = Object.fromEntries(FLOWS.map((f) => [f.id, [consentForm(f, 'nudged'), consentForm(f, 'neutral')]]))
    expect(forms).toEqual({
      store_location: ['nudged_choice', 'active_choice'],
      store_precise: ['opt_out', 'opt_in'],
      courier_live: ['opt_out', 'opt_in'],
      checkout_partner_offers: ['opt_out', 'opt_in'],
      bg_during_order: ['nudged_choice', 'active_choice'],
      sam_share: ['nudged_choice', 'active_choice'],
      bg_between_orders: ['nudged_choice', 'active_choice'],
      deals_personalized: ['opt_out', 'opt_in'],
      deals_partner_offers: ['opt_out', 'opt_in'],
      reward_keel: ['nudged_choice', 'active_choice'],
      reward_university: ['nudged_choice', 'active_choice'],
      reward_data_partners: ['nudged_choice', 'active_choice'],
    })
  })

  it('never makes neutral push toward sharing', () => {
    for (const flow of FLOWS) expect(['opt_out', 'nudged_choice']).not.toContain(consentForm(flow, 'neutral'))
  })
})

describe('verdictOf', () => {
  it('maps every option of every flow to the pipeline verdicts', async () => {
    const { verdictOf } = await import('./ci')
    const map = Object.fromEntries(FLOWS.map((f) => [f.id, Object.fromEntries(f.options.map((o) => [o, verdictOf(f, o)]))]))
    expect(map).toEqual({
      store_location: { while_using: 'allow', once: 'ask', dont_allow: 'block' },
      store_precise: { exact: 'allow', general: 'block' },
      courier_live: { share: 'allow', dont_share: 'block' },
      checkout_partner_offers: { checked: 'allow', unchecked: 'block' },
      bg_during_order: { allow: 'allow', not_now: 'block' },
      sam_share: { live_location: 'allow', arrival_only: 'block' },
      bg_between_orders: { keep_on: 'allow', turn_off: 'block' },
      deals_personalized: { on: 'allow', off: 'block' },
      deals_partner_offers: { on: 'allow', off: 'block' },
      reward_keel: { accept: 'allow', decline: 'block' },
      reward_university: { accept: 'allow', decline: 'block' },
      reward_data_partners: { accept: 'allow', decline: 'block' },
    })
    expect(verdictOf(FLOWS[0], null)).toBeNull()
  })
})

describe('information coding', () => {
  it('codes each flow with a category, attribute and modifiers', () => {
    const coded = Object.fromEntries(
      FLOWS.map((f) => [f.id, [f.ci.informationCategory, f.ci.attribute, f.ci.granularity, f.ci.temporality, f.ci.identifiability].join(' ')]),
    )
    expect(coded.store_precise).toBe('digital_activity location exact point_in_time identified')
    expect(coded.checkout_partner_offers).toBe('demographic home_address exact static identified')
    expect(coded.reward_university).toBe('digital_activity location_history exact historical deidentified')
    expect(coded.sam_share).toBe('digital_activity location exact continuous identified')
  })
})
