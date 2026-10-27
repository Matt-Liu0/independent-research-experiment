// Part 2 records → analysis tables. Pure functions, like transform.ts.
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
  /** Part 2 study code → Prolific ID. Private, like id-map.csv. */
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
  pilot: boolean,
  part1: Pick<ExportResult, 'idMap' | 'flows' | 'participants'> | null,
): Part2ExportResult {
  const codeOfPid = new Map((part1?.idMap ?? []).map((r) => [r.prolificPid as string, r.studyCode as string]))
  const part1Row = new Map((part1?.participants ?? []).map((r) => [r.studyCode as string, r]))
  const siteRow = new Map((part1?.flows ?? []).map((r) => [`${r.studyCode}|${r.flowId}`, r]))

  // withdrawRequested: ticked on the debrief page; their data is left out like a withdrawal.
  const kept = raw
    .filter((p) => p.data.withdrawn !== true && p.data.withdrawRequested !== true)
    .sort((a, b) => (ms(a.data.createdAt) ?? 0) - (ms(b.data.createdAt) ?? 0) || a.uid.localeCompare(b.uid))

  const result: Part2ExportResult = { participants: [], verdicts: [], idMap: [] }
  let unmatched = 0
  for (const p of kept) {
    const pid = String(p.data.prolificPid ?? '')
    // People keep their Part 1 code; anyone without a Part 1 record gets their own.
    const code = codeOfPid.get(pid) ?? `${pilot ? 'P' : ''}X${String(++unmatched).padStart(3, '0')}`
    result.idMap.push({ studyCode: code, prolificPid: pid, uid: p.uid })

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
      pilot,
      matchedToPart1: p1 !== undefined,
      daysSincePart1: startedAt !== null && part1Done !== null ? Math.round(((startedAt - part1Done) / 86_400_000) * 10) / 10 : null,
      appVersion: (p.data.appVersion as string) ?? null,
      stage: (p.data.stage as string) ?? null,
      completed: p.data.stage === 'done',
      arm: (p.data.arm as string) ?? null,
      ...interviewColumns(p.data),
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
        // The elicitation effect compares arms (RQ1.2, open-ended as the reference).
        arm: (p.data.arm as string) ?? null,
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
        // Say–do: the same person's verdict on the site (site flows only).
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


/** Part 2 only: the interview summary (written by the server), the filler and the debrief. */
function interviewColumns(data: Record<string, unknown>): Row {
  const iv = data.interview as Record<string, unknown> | null | undefined
  const filler = data.filler as Record<string, unknown> | null | undefined
  return {
    interviewDone: (iv?.done as boolean) ?? null,
    interviewMinutes: (iv?.minutes as number) ?? null,
    interviewParticipantTurns: (iv?.participantTurns as number) ?? null,
    interviewParticipantChars: (iv?.participantChars as number) ?? null,
    fillerSolved: (filler?.solved as number) ?? null,
    chatStartedAt: toIso(data.chatStartedAt),
    debriefAt: toIso(data.debriefAt),
  }
}

/** One saved interview, as the function stores it in <col>_interviews/<uid>. */
export interface RawInterview {
  uid: string
  data: Record<string, unknown>
}

/**
 * The transcripts D, one JSON object per line, keyed by study code: the agents' only input in
 * Experiments 3 and 4. People left out of the Part 2 export (withdrawn) are left out here too.
 */
export function buildTranscripts(interviews: RawInterview[], idMap: Row[]): string {
  const codeOfUid = new Map(idMap.map((r) => [r.uid as string, r.studyCode as string]))
  return interviews
    .filter((iv) => codeOfUid.has(iv.uid))
    .map((iv) => {
      const state = iv.data.state as { arm: string; done: boolean; turns: Record<string, unknown>[] }
      return {
        studyCode: codeOfUid.get(iv.uid)!,
        arm: state.arm,
        done: state.done,
        model: iv.data.model ?? null,
        promptsVersion: iv.data.promptsVersion ?? null,
        turns: state.turns.map((t) => ({
          role: t.role,
          text: t.text,
          domain: t.domain,
          at: typeof t.at === 'number' ? new Date(t.at).toISOString() : null,
          source: t.source ?? null,
          model: t.model ?? null,
          caseId: t.caseId ?? null,
        })),
      }
    })
    .sort((a, b) => a.studyCode.localeCompare(b.studyCode))
    .map((t) => JSON.stringify(t))
    .join('\n')
}
