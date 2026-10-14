// Part 2 and norming-survey records → analysis tables. Pure functions, like transform.ts.
// Part 2 runs on a computer under a different anonymous uid from Part 1, so records are joined
// to Part 1 by Prolific ID, and Part 1's study code is reused.
import { ciColumns, toIso, type ExportResult, type RawParticipant, type Row } from './transform'
import { heldOutDistance } from '../src/part2/distance'
import { ATTENTION_ITEMS, BATTERY, REPEATED_ITEMS, SITE_ITEMS } from '../src/part2/items'
import { IUIPC_ITEMS, RECALL_QUESTIONS } from '../src/part2/surveyContent'
import type { ItemAnswer } from '../src/part2/types'

export interface Part2ExportResult {
  participants: Row[]
  verdicts: Row[]
  /** Part 2 / norming study code → Prolific ID. Private, like id-map.csv. */
  idMap: Row[]
}

const ms = (v: unknown): number | null => {
  const iso = toIso(v)
  return iso ? Date.parse(iso) : null
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null)

/** One row per battery item: wording, CI coding and, for held-out items, the nearest site flow. */
export function batteryCodebook(): Row[] {
  return BATTERY.map((item) => {
    const near = item.kind === 'held_out' ? heldOutDistance(item.ci, SITE_ITEMS) : null
    return {
      itemId: item.id,
      kind: item.kind,
      domain: item.domain,
      repeated: REPEATED_ITEMS.includes(item.id),
      textA: item.text.A,
      textB: item.text.B ?? null,
      nearestSiteFlow: near?.nearest ?? null,
      distance: near?.distance ?? null,
      differsOn: near ? near.differs.join(';') : null,
      ...ciColumns(item),
      ci_statement: item.ci.statement,
    }
  })
}

/** Both answers to an item, first-asked first. */
function answersFor(answers: Record<string, ItemAnswer>, itemId: string): ItemAnswer[] {
  return Object.values(answers)
    .filter((a) => a.itemId === itemId && a.wording !== null)
    .sort((a, b) => a.position - b.position)
}

/**
 * Builds the Part 2 tables. `part1` is the Part 1 export (its id map and flow rows), used for
 * study codes, days since Part 1, recall scoring and the site verdict next to each stated one.
 */
export function buildPart2Export(
  raw: RawParticipant[],
  variant: 'part2' | 'norming',
  pilot: boolean,
  part1: Pick<ExportResult, 'idMap' | 'flows' | 'participants'> | null,
): Part2ExportResult {
  const codeOfPid = new Map((part1?.idMap ?? []).map((r) => [r.prolificPid as string, r.studyCode as string]))
  const part1Row = new Map((part1?.participants ?? []).map((r) => [r.studyCode as string, r]))
  const siteRow = new Map((part1?.flows ?? []).map((r) => [`${r.studyCode}|${r.flowId}`, r]))

  const kept = raw
    .filter((p) => p.data.withdrawn !== true)
    .sort((a, b) => (ms(a.data.createdAt) ?? 0) - (ms(b.data.createdAt) ?? 0) || a.uid.localeCompare(b.uid))

  const result: Part2ExportResult = { participants: [], verdicts: [], idMap: [] }
  let unmatched = 0
  for (const [i, p] of kept.entries()) {
    const pid = String(p.data.prolificPid ?? '')
    const prefix = pilot ? 'P' : ''
    // Part 2 people keep their Part 1 code; norming people (and anyone without Part 1) get their own.
    const code =
      variant === 'part2' && codeOfPid.has(pid)
        ? codeOfPid.get(pid)!
        : variant === 'norming'
          ? `${prefix}N${String(i + 1).padStart(3, '0')}`
          : `${prefix}X${String(++unmatched).padStart(3, '0')}`
    result.idMap.push({ studyCode: code, prolificPid: pid, uid: p.uid, sample: variant })

    const answers = (p.data.answers ?? {}) as Record<string, ItemAnswer>
    const all = Object.values(answers)
    const comprehension = p.data.comprehension as { attempts: string[]; passed: boolean } | null
    const background = p.data.background as { iuipc: number[]; ageRange: string; gender: string | null; aiUse: string } | null
    const recall = (p.data.recall ?? {}) as Record<string, string>
    const p1 = part1Row.get(code)
    const startedAt = ms(p.data.startedItemsAt) ?? ms(p.data.createdAt)
    const part1Done = p1 ? ms(p1.completedAt) : null

    const row: Row = {
      studyCode: code,
      sample: variant,
      pilot,
      matchedToPart1: variant === 'part2' ? p1 !== undefined : null,
      daysSincePart1: startedAt !== null && part1Done !== null ? Math.round(((startedAt - part1Done) / 86_400_000) * 10) / 10 : null,
      appVersion: (p.data.appVersion as string) ?? null,
      consentVersion: (p.data.consentVersion as string) ?? null,
      stage: (p.data.stage as string) ?? null,
      completed: p.data.stage === 'done',
      os: ((p.data.device as Record<string, unknown> | null)?.os as string) ?? null,
      resumeCount: (p.data.resumeCount as number) ?? null,
      practiceVerdict: ((p.data.practice as Record<string, unknown> | null)?.verdict as string) ?? null,
      comprehensionAttempts: comprehension ? comprehension.attempts.join(';') : null,
      comprehensionPassed: comprehension?.passed ?? null,
      itemsAnswered: all.length,
      medianItemMs: all.length ? [...all.map((a) => a.ms)].sort((a, b) => a - b)[Math.floor(all.length / 2)] : null,
      minutesOnItems: all.length ? Math.round(all.reduce((s, a) => s + a.ms, 0) / 600) / 100 : null,
      createdAt: toIso(p.data.createdAt),
      startedItemsAt: toIso(p.data.startedItemsAt),
      completedAt: toIso(p.data.completedAt),
    }
    let attentionPassed = true
    for (const a of ATTENTION_ITEMS) {
      const ans = answers[a.id]
      const passed = ans ? ans.verdict === a.verdict && ans.confidence === a.confidence : null
      row[`${a.id}_passed`] = passed
      if (passed !== true) attentionPassed = false
    }
    row.attentionPassed = attentionPassed

    // Recall: what they remember choosing vs. their first choice on the site.
    for (const q of RECALL_QUESTIONS) {
      const value = recall[q.id] ?? null
      const site = siteRow.get(`${code}|${q.flowId}`)?.firstChoice ?? null
      row[q.id] = value
      row[`${q.id}_correct`] = value === null || value === 'dont_remember' || site === null ? null : value === site
    }

    if (background) {
      background.iuipc.forEach((v, j) => (row[`iuipc_${j + 1}`] = v))
      for (const dim of ['control', 'awareness', 'collection'] as const) {
        row[`iuipc_${dim}`] = mean(background.iuipc.filter((_, j) => IUIPC_ITEMS[j].dimension === dim))
      }
      row.ageRange = background.ageRange
      row.gender = background.gender
      row.aiUse = background.aiUse
    }
    result.participants.push(row)

    // One row per person × battery item: the stated verdict S(f), its repeat, and the site's verdict.
    for (const item of BATTERY) {
      const [first, second] = answersFor(answers, item.id)
      const site = item.kind === 'site' ? siteRow.get(`${code}|${item.id}`) : undefined
      const siteFirst = (site?.firstVerdict as string | null | undefined) ?? null
      result.verdicts.push({
        studyCode: code,
        sample: variant,
        itemId: item.id,
        kind: item.kind,
        domain: item.domain,
        repeated: REPEATED_ITEMS.includes(item.id),
        verdict: first?.verdict ?? null,
        confidence: first?.confidence ?? null,
        wording: first?.wording ?? null,
        position: first?.position ?? null,
        ms: first?.ms ?? null,
        changes: first?.changes ?? null,
        verdict2: second?.verdict ?? null,
        confidence2: second?.confidence ?? null,
        position2: second?.position ?? null,
        // Protocol flags, repeated items only: unstable = the two answers differ; uncertain = both rated 1 or 2.
        unstable: second ? first.verdict !== second.verdict : null,
        uncertain: second ? first.confidence <= 2 && second.confidence <= 2 : null,
        // Say–do: the same person's verdict on the site (Part 2 only, site flows only).
        siteFriction: (site?.friction as string | null | undefined) ?? null,
        siteStatus: (site?.status as string | null | undefined) ?? null,
        siteFirstVerdict: siteFirst,
        siteFinalVerdict: (site?.finalVerdict as string | null | undefined) ?? null,
        sayDoAgree: first && siteFirst ? first.verdict === siteFirst : null,
      })
    }
  }
  return result
}

