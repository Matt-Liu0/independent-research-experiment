import { describe, expect, it } from 'vitest'
import { buildExport, flowStatus, susScore, toCsv, type RawParticipant } from '../scripts/transform'
import { ALL_FLOWS } from '../src/allFlows'
import { getFlow } from '../src/bramble/flows'

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 12, minute))

const ev = (minute: number, clientT: number, fields: Record<string, unknown>) => ({ t: at(minute), clientT, ...fields })

/** A nudged participant who refused location, toggled the courier switch off, and later changed an offer on the Account page. */
const alice: RawParticipant = {
  uid: 'uidA',
  data: {
    prolificPid: 'PID_ALICE',
    createdAt: at(0),
    consentAt: at(1),
    completedAt: at(31),
    pattern: 'U1U2U6',
    appOrder: 'bramble_first',
    taskOrder: [1, 2, 3, 4, 5, 6, 7, 9, 8, 10],
    withdrawn: false,
    stage: 'done',
    device: { os: 'ios', screenW: 390, screenH: 844, passedCheck: true, userAgent: 'iPhone' },
    ease: { t1: 6, t2: 7 },
    sus: { bramble: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], stride: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
    suspicion: '=HYPERLINK("x")',
    settingsCheck: { q1: ['maps', 'weather'], q2: 'while_using' },
    taskOutcome: { t1: { done: true, usedZipSearch: true, storesViewed: 6, msToFind: 4000, storeId: 'elm' } },
    appState: { points: 120, flows: { store_location: 'dont_allow', courier_live: 'dont_share', reward_keel: 'decline' } },
    strideState: { points: 320, reportUnlocked: true, flows: { stride_face_unlock: 'set_up' } },
  },
  events: [
    ev(2, 100, { type: 'prompt_shown', flowId: 'store_location', defaultShown: null }),
    ev(2, 110, { type: 'prompt_shown', flowId: 'store_precise', defaultShown: 'exact' }),
    ev(2, 900, { type: 'decision', flowId: 'store_location', value: 'dont_allow', source: 'prompt' }),
    ev(2, 901, { type: 'settled', flowId: 'store_location', value: 'dont_allow', defaultShown: null, changedFromDefault: false, msSincePrompt: 800, taskId: 1 }),
    ev(5, 2000, { type: 'prompt_shown', flowId: 'courier_live', defaultShown: 'share' }),
    ev(5, 2500, { type: 'decision', flowId: 'courier_live', value: 'dont_share', source: 'prompt' }),
    ev(5, 2600, { type: 'decision', flowId: 'courier_live', value: 'share', source: 'prompt' }),
    ev(5, 2700, { type: 'decision', flowId: 'courier_live', value: 'dont_share', source: 'prompt' }),
    ev(6, 3000, { type: 'settled', flowId: 'courier_live', value: 'dont_share', defaultShown: 'share', changedFromDefault: true, msSincePrompt: 1000, taskId: 2 }),
    // After a reload, clientT restarts at 0; server time keeps the order.
    ev(20, 5, { type: 'resume', stage: 'tasks' }),
    ev(20, 50, { type: 'prompt_shown', flowId: 'reward_keel', defaultShown: null }),
    ev(20, 90, { type: 'decision', flowId: 'reward_keel', value: 'accept', source: 'prompt' }),
    ev(20, 91, { type: 'settled', flowId: 'reward_keel', value: 'accept', defaultShown: null, msSincePrompt: 40, taskId: 5 }),
    ev(22, 500, { type: 'decision', flowId: 'reward_keel', value: 'decline', source: 'account_page' }),
    ev(22, 600, { type: 'visibility', state: 'hidden' }),
    ev(23, 700, { type: 'task', event: 'reopen', task: 5 }),
    ev(24, 800, { type: 'action', name: 'map_shown', kind: 'real' }),
    ev(24, 900, { type: 'action', name: 'map_moved', gesture: 'drag' }),
    ev(24, 950, { type: 'action', name: 'map_moved', gesture: 'zoom' }),
    ev(24, 990, { type: 'action', name: 'map_recentered' }),
  ],
}

const bob: RawParticipant = {
  uid: 'uidB',
  data: { prolificPid: 'PID_BOB', createdAt: at(10), pattern: 'U3U4U5', withdrawn: true, stage: 'done' },
  events: [ev(11, 1, { type: 'stage' })],
}

const carol: RawParticipant = {
  uid: 'uidC',
  data: { prolificPid: 'PID_CAROL', createdAt: at(5), pattern: null, consentDeclined: true, withdrawn: false, stage: 'consent' },
  events: [],
}

describe('buildExport', () => {
  const result = buildExport('participants', [bob, alice, carol])

  it('leaves out withdrawn participants and codes the rest in start order', () => {
    expect(result.idMap).toEqual([
      { studyCode: 'P001', prolificPid: 'PID_ALICE', uid: 'uidA' },
      { studyCode: 'P002', prolificPid: 'PID_CAROL', uid: 'uidC' },
    ])
    expect(JSON.stringify(result.participants)).not.toContain('PID_')
    expect(JSON.stringify(result.events)).not.toContain('PID_')
  })

  it('flattens the participant record', () => {
    const a = result.participants[0]
    expect(a).toMatchObject({
      studyCode: 'P001',
      pattern: 'U1U2U6',
      nudgedUnits: 'U1;U2;U6',
      appOrder: 'bramble_first',
      taskOrder: '1-2-3-4-5-6-7-9-8-10',
      completed: true,
      os: 'ios',
      minutesToComplete: 30,
      ease_t1: 6,
      ease_t3: null,
      susScore_bramble: 100,
      susScore_stride: 50,
      settings_q1: 'maps;weather',
      t1_done: true,
      t1_usedZipSearch: true,
      t2_done: null,
      bramblePoints: 120,
      strideCoins: 320,
      bonusUSD: 0.44,
      reportUnlocked: true,
      taskCardReopens: 1,
      timesHidden: 1,
      mapShown: 'real',
      mapMoves: 2,
      mapRecenters: 1,
    })
  })

  it('keeps people who declined consent in participants.csv but gives them no flow rows', () => {
    expect(result.participants[1]).toMatchObject({ studyCode: 'P002', consentDeclined: true, completed: false })
    expect(result.flows.every((r) => r.studyCode === 'P001')).toBe(true)
    expect(result.flows).toHaveLength(ALL_FLOWS.length)
  })

  it('computes one row per flow with status, first choice and final value', () => {
    const row = (flowId: string) => result.flows.find((r) => r.flowId === flowId)!
    expect(row('store_location')).toMatchObject({ status: 'chosen', firstChoice: 'dont_allow', firstChoiceIsPrivacy: true, taskId: 1, firstVerdict: 'block', finalVerdict: 'block' })
    expect(row('reward_keel')).toMatchObject({ firstVerdict: 'allow', finalVerdict: 'block' })
    expect(row('deals_personalized')).toMatchObject({ firstVerdict: null })
    expect(row('courier_live')).toMatchObject({
      consentForm: 'opt_out',
      ci_sender: 'participant',
      ci_recipient: 'courier',
      ci_recipientType: 'service_provider',
      ci_informationCategory: 'digital_activity',
      ci_attribute: 'location',
      ci_temporality: 'continuous',
      ci_aim: 'courier_handoff',
      ci_temporal: 'until_delivery',
      ci_points: 0,
    })
    expect(row('reward_keel')).toMatchObject({ consentForm: 'nudged_choice', ci_condition: 'with_consent_for_payment', ci_points: 200 })
    expect(row('store_precise')).toMatchObject({ status: 'not_applicable', firstChoice: null, defaultShown: 'exact' })
    expect(row('courier_live')).toMatchObject({
      status: 'chosen',
      firstChoice: 'dont_share',
      defaultShown: 'share',
      changedFromDefault: true,
      toggleCount: 3,
      msSincePrompt: 1000,
      changedOnAccountPage: false,
      changedLater: false,
    })
    expect(row('reward_keel')).toMatchObject({
      firstChoice: 'accept',
      finalValue: 'decline',
      firstChoiceIsPrivacy: false,
      changedOnAccountPage: true,
      changedLater: true,
      toggleCount: 1,
    })
    expect(row('deals_personalized')).toMatchObject({ status: 'not_shown', firstChoice: null })
  })

  it('orders events by server time, so a reload does not scramble them', () => {
    const shuffled = buildExport('participants', [{ ...alice, events: [...alice.events].reverse() }])
    const key = (e: Record<string, unknown>) => `${e.type}:${e.flowId ?? ''}:${e.clientT}`
    expect(shuffled.events.map(key)).toEqual(alice.events.map(key))
    expect(shuffled.events.find((e) => e.type === 'resume')?.t).toBe('2026-11-01T12:20:00.000Z')
  })
})

describe('flowCodebook', () => {
  it('has one row per flow with its GKC-CI parameters and both consent forms', async () => {
    const { flowCodebook } = await import('../scripts/transform')
    const book = flowCodebook()
    expect(book).toHaveLength(ALL_FLOWS.length)
    expect(book.find((r) => r.flowId === 'checkout_partner_offers')).toMatchObject({
      consentForm_nudged: 'opt_out',
      consentForm_neutral: 'opt_in',
      ci_recipient: 'partner_brands',
      ci_informationCategory: 'demographic',
      ci_attribute: 'home_address',
    })
  })
})

describe('flowStatus', () => {
  it('marks a dependent flow not applicable only when its parent was declined', () => {
    const between = getFlow('bg_between_orders')
    expect(flowStatus(between, [{ type: 'settled', flowId: 'bg_during_order', value: 'not_now' }])).toBe('not_applicable')
    expect(flowStatus(between, [{ type: 'settled', flowId: 'bg_during_order', value: 'allow' }])).toBe('not_shown')
    expect(
      flowStatus(between, [
        { type: 'settled', flowId: 'bg_during_order', value: 'allow' },
        { type: 'prompt_shown', flowId: 'bg_between_orders' },
      ]),
    ).toBe('shown_not_settled')
  })
})

describe('susScore', () => {
  it('scores the standard way', () => {
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100)
    expect(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0)
    expect(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50)
    expect(susScore([3])).toBeNull()
  })
})

describe('toCsv', () => {
  it('quotes commas, quotes and newlines, and defuses spreadsheet formulas', () => {
    const csv = toCsv([{ a: 'x,y', b: 'say "hi"' }, { a: '=SUM(A1)', c: 'line\nbreak' }])
    expect(csv).toBe('a,b,c\n"x,y","say ""hi""",\n\'=SUM(A1),,"line\nbreak"\n')
  })
})

describe('compareEvents', () => {
  it('keeps phone order across an offline reload, even when server times tie', async () => {
    const { compareEvents } = await import('../scripts/transform')
    const sameServerTime = at(30)
    // Page load A queued three events offline; the participant reloaded (B) before the signal came back.
    const a = [1, 2, 3].map((seq) => ({ type: 'decision', pageLoadAt: 1000, seq, clientT: seq * 100, t: sameServerTime }))
    const b = [1, 2].map((seq) => ({ type: 'decision', pageLoadAt: 9000, seq, clientT: seq * 10, t: sameServerTime }))
    const sorted = [b[1], a[2], b[0], a[0], a[1]].sort(compareEvents)
    expect(sorted.map((e) => `${e.pageLoadAt}:${e.seq}`)).toEqual(['1000:1', '1000:2', '1000:3', '9000:1', '9000:2'])
  })
})
