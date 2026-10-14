import { describe, expect, it } from 'vitest'
import { buildExport } from '../scripts/transform'
import { batteryCodebook, buildPart2Export } from '../scripts/transformPart2'
import { BATTERY, REPEATED_ITEMS } from '../src/part2/items'
import type { ItemAnswer } from '../src/part2/types'

const at = (day: number, minute = 0) => new Date(Date.UTC(2026, 10, day, 12, minute))

const part1 = buildExport('participants', [
  {
    uid: 'phone',
    data: { prolificPid: 'PID1', createdAt: at(1), completedAt: at(1, 30), pattern: 'U1U2U3', stage: 'done', withdrawn: false },
    events: [
      { type: 'settled', flowId: 'store_location', value: 'once', pageLoadAt: 1, seq: 1 },
      { type: 'settled', flowId: 'sam_share', value: 'arrival_only', pageLoadAt: 1, seq: 2 },
    ],
  },
])

const answer = (itemId: string, wording: 'A' | 'B' | null, position: number, verdict: ItemAnswer['verdict'], confidence: number): ItemAnswer => ({
  itemId, wording, position, verdict, confidence, ms: 4000, changes: 0,
})

const part2Raw = [
  {
    uid: 'laptop',
    events: [],
    data: {
      prolificPid: 'PID1', variant: 'part2', stage: 'done', withdrawn: false, createdAt: at(8), startedItemsAt: at(9),
      comprehension: { attempts: ['allow', 'ask'], passed: true },
      answers: {
        'store_location:B': answer('store_location', 'B', 3, 'ask', 2),
        'store_location:A': answer('store_location', 'A', 30, 'allow', 1),
        'sam_share:A': answer('sam_share', 'A', 5, 'block', 5),
        attention_1: answer('attention_1', null, 18, 'block', 3),
        attention_2: answer('attention_2', null, 36, 'block', 2),
      },
      recall: { recall_store_location: 'once', recall_sam_share: 'live_location', recall_data_partners: 'dont_remember' },
      background: { iuipc: [7, 6, 5, 4, 4, 4, 1, 2, 3, 4], ageRange: '25–34', gender: null, aiUse: 'Never' },
    },
  },
]

describe('Part 2 export', () => {
  const out = buildPart2Export(part2Raw, 'part2', false, part1)
  const row = out.participants[0]
  const verdict = (id: string) => out.verdicts.find((v) => v.itemId === id)!

  it("reuses the person's Part 1 study code, joined by Prolific ID", () => {
    expect(row).toMatchObject({ studyCode: 'P001', matchedToPart1: true, daysSincePart1: 8 })
    expect(out.idMap).toEqual([{ studyCode: 'P001', prolificPid: 'PID1', uid: 'laptop', sample: 'part2' }])
  })

  it('scores attention, comprehension, recall and the IUIPC subscales', () => {
    expect(row).toMatchObject({ attention_1_passed: true, attention_2_passed: false, attentionPassed: false, comprehensionPassed: true })
    expect(row).toMatchObject({ recall_store_location_correct: true, recall_sam_share_correct: false, recall_data_partners_correct: null })
    expect(row).toMatchObject({ iuipc_control: 6, iuipc_awareness: 4, iuipc_collection: 2.5 })
  })

  it('gives one row per battery item, with the first-asked verdict, the repeat flags and the site verdict', () => {
    expect(out.verdicts).toHaveLength(BATTERY.length)
    // Wording B came first here; the site's "Allow Once" maps to ask.
    expect(verdict('store_location')).toMatchObject({
      verdict: 'ask', wording: 'B', verdict2: 'allow', unstable: true, uncertain: true, siteFirstVerdict: 'ask', sayDoAgree: true,
    })
    expect(verdict('sam_share')).toMatchObject({ verdict: 'block', verdict2: null, unstable: null, siteFirstVerdict: 'block', sayDoAgree: true })
    expect(verdict('ho_loc_named_research')).toMatchObject({ kind: 'held_out', verdict: null, siteFirstVerdict: null })
  })

  it('gives norming people their own codes, with no site columns', () => {
    const norming = buildPart2Export([{ ...part2Raw[0], uid: 'n1', data: { ...part2Raw[0].data, variant: 'norming' } }], 'norming', false, null)
    expect(norming.participants[0]).toMatchObject({ studyCode: 'N001', matchedToPart1: null, daysSincePart1: null })
    expect(norming.verdicts.find((v) => v.itemId === 'store_location')!.siteFirstVerdict).toBeNull()
  })

  it('marks Part 2 records with no Part 1 match', () => {
    const lone = buildPart2Export(part2Raw, 'part2', true, null)
    expect(lone.participants[0]).toMatchObject({ studyCode: 'PX001', matchedToPart1: false })
  })
})

describe('battery codebook', () => {
  it('lists every item with its wording and, for held-out items, the nearest site flow', () => {
    const book = batteryCodebook()
    expect(book).toHaveLength(BATTERY.length)
    expect(book.filter((r) => r.repeated)).toHaveLength(REPEATED_ITEMS.length)
    expect(book.find((r) => r.itemId === 'ho_hl_unpaid_research')).toMatchObject({
      nearestSiteFlow: 'stride_reward_data_partners', distance: 1, differsOn: 'reward', ci_recipient: 'data_partners',
    })
  })
})
