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
      store_precise: ['opt_out', 'active_choice'],
      courier_live: ['opt_out', 'active_choice'],
      checkout_partner_offers: ['opt_out', 'opt_in'],
      bg_during_order: ['nudged_choice', 'active_choice'],
      sam_share: ['nudged_choice', 'active_choice'],
      bg_between_orders: ['nudged_choice', 'active_choice'],
      deals_personalized: ['opt_out', 'active_choice'],
      deals_partner_offers: ['opt_out', 'active_choice'],
      reward_keel: ['nudged_choice', 'active_choice'],
      reward_university: ['nudged_choice', 'active_choice'],
      reward_data_partners: ['nudged_choice', 'active_choice'],
    })
  })

  it('never makes neutral push toward sharing', () => {
    for (const flow of FLOWS) expect(['opt_out', 'nudged_choice']).not.toContain(consentForm(flow, 'neutral'))
  })
})
