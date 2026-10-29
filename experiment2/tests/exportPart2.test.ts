import { describe, expect, it } from 'vitest'
import { buildExport } from '../scripts/transform'
import { batteryCodebook, buildPart2Export, buildTranscripts } from '../scripts/transformPart2'
import { BATTERY, REPEATED_ITEMS } from '../src/part2/items'
import type { ItemAnswer } from '../src/part2/types'

const at = (day: number, minute = 0) => new Date(Date.UTC(2026, 10, day, 12, minute))

const part1 = buildExport('participants', [
  {
    uid: 'phone',
    data: { participantCode: 'PID1', createdAt: at(1), completedAt: at(1, 30), pattern: 'U1U2U3', stage: 'done', withdrawn: false },
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
      participantCode: 'PID1', stage: 'done', withdrawn: false, createdAt: at(8), startedItemsAt: at(9),
      arm: 'structured',
      interview: { done: true, turns: 14, participantTurns: 6, participantChars: 410, startedAt: 1, endedAt: 2, minutes: 12.5 },
      filler: { solved: 7, attempted: 9, ms: 180000 },
      withdrawRequested: false,
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
  const out = buildPart2Export(part2Raw, false, part1)
  const row = out.participants[0]
  const verdict = (id: string) => out.verdicts.find((v) => v.itemId === id)!

  it("reuses the person's Part 1 study code, joined by participant code", () => {
    expect(row).toMatchObject({ studyCode: 'P001', matchedToPart1: true, daysSincePart1: 8 })
    expect(out.idMap).toEqual([{ studyCode: 'P001', participantCode: 'PID1', uid: 'laptop' }])
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

  it('marks Part 2 records with no Part 1 match', () => {
    const lone = buildPart2Export(part2Raw, true, null)
    expect(lone.participants[0]).toMatchObject({ studyCode: 'PX001', matchedToPart1: false })
  })
})

describe('interview data', () => {
  const out = buildPart2Export(part2Raw, false, part1)

  it('adds the arm and interview summary per person, and the arm on each verdict row', () => {
    expect(out.participants[0]).toMatchObject({ arm: 'structured', interviewDone: true, interviewMinutes: 12.5, interviewParticipantTurns: 6, fillerSolved: 7 })
    expect(out.verdicts.every((v) => v.arm === 'structured')).toBe(true)
  })

  it('leaves out people who asked on the debrief for their data to be removed', () => {
    const asked = buildPart2Export([{ ...part2Raw[0], data: { ...part2Raw[0].data, withdrawRequested: true } }], false, part1)
    expect(asked.participants).toHaveLength(0)
    expect(asked.verdicts).toHaveLength(0)
  })

  it('writes one transcript per kept person, under their study code', () => {
    const state = {
      arm: 'structured',
      done: true,
      turns: [
        { role: 'interviewer', text: 'Hi', domain: 'location', at: Date.UTC(2026, 10, 8), source: 'fixed' },
        { role: 'participant', text: 'Only while using', domain: 'location', at: Date.UTC(2026, 10, 8, 0, 1) },
      ],
    }
    const lines = buildTranscripts(
      [
        { uid: 'laptop', data: { state, model: 'claude-sonnet-5-5', promptsVersion: 'v1' } },
        { uid: 'someone-withdrawn', data: { state, model: 'claude-sonnet-5-5', promptsVersion: 'v1' } },
      ],
      out.idMap,
      new Map([['laptop', 'Never sell my location']]),
    ).split('\n')
    expect(lines).toHaveLength(1)
    const t = JSON.parse(lines[0])
    expect(t).toMatchObject({ studyCode: 'P001', arm: 'structured', model: 'claude-sonnet-5-5', writtenInstructions: 'Never sell my location' })
    expect(t.turns[1]).toMatchObject({ role: 'participant', text: 'Only while using', at: '2026-11-08T00:01:00.000Z', source: null })
    expect(JSON.stringify(t)).not.toContain('laptop')
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
