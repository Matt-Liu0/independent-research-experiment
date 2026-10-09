// Turns raw participant records and event logs into analysis-ready rows.
// Pure functions only, so they can be tested without Firebase.
import { consentForm, verdictOf } from '../src/bramble/ci'
import { FLOWS } from '../src/bramble/flows'
import type { FlowDef, FlowStatus } from '../src/bramble/types'
import { UNIT_SCREENS, frictionOf, parsePattern } from '../src/bramble/units'

export type Row = Record<string, string | number | boolean | null>

export interface RawParticipant {
  uid: string
  data: Record<string, unknown>
  events: Record<string, unknown>[]
}

export interface ExportResult {
  participants: Row[]
  events: Row[]
  flows: Row[]
  idMap: Row[]
}

type Timestampish = { toDate(): Date } | Date | number | string | null | undefined

export function toIso(value: unknown): string | null {
  const v = value as Timestampish
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') return new Date(v).toISOString()
  if (typeof v === 'string') return v
  if (typeof v === 'object' && 'toDate' in v) return v.toDate().toISOString()
  return null
}

function toMs(value: unknown): number | null {
  const iso = toIso(value)
  return iso ? Date.parse(iso) : null
}

/** Standard SUS score (0–100): odd items score − 1, even items 5 − score, sum × 2.5. */
export function susScore(answers: unknown): number | null {
  if (!Array.isArray(answers) || answers.length !== 10) return null
  const sum = answers.reduce((total: number, a: number, i: number) => total + (i % 2 === 0 ? a - 1 : 5 - a), 0)
  return sum * 2.5
}

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, key) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined), obj)

function scalar(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.join(';')
  const iso = toIso(value)
  return iso ?? JSON.stringify(value)
}

/** First settled value of a flow, if any. */
function settledEvent(events: Record<string, unknown>[], flowId: string) {
  return events.find((e) => e.type === 'settled' && e.flowId === flowId)
}

/** The flow's GKC-CI parameters as flat columns (same for everyone; see src/bramble/ci.ts). */
export function ciColumns(flow: FlowDef): Row {
  const tp = flow.ci.transmissionPrinciple
  return {
    ci_sender: flow.ci.sender,
    ci_recipient: flow.ci.recipient,
    ci_recipientType: flow.ci.recipientType,
    ci_subject: flow.ci.subject,
    ci_informationCategory: flow.ci.informationCategory,
    ci_attribute: flow.ci.attribute,
    ci_granularity: flow.ci.granularity,
    ci_temporality: flow.ci.temporality,
    ci_identifiability: flow.ci.identifiability,
    ci_aim: tp.aim,
    ci_condition: tp.condition,
    ci_temporal: tp.temporal,
    ci_points: tp.consideration?.points ?? 0,
  }
}

/** One row per flow: the codebook for joining with Part 2 questionnaire items. */
export function flowCodebook(): Row[] {
  return FLOWS.map((flow) => ({
    flowId: flow.id,
    unit: flow.unit,
    unitScreen: UNIT_SCREENS[flow.unit],
    expectedTask: flow.task,
    screen: flow.screen,
    options: flow.options.join(';'),
    privacyOption: flow.privacyOption,
    dependsOn: flow.dependsOn ? flow.dependsOn.flowId : null,
    consentForm_nudged: consentForm(flow, 'nudged'),
    consentForm_neutral: consentForm(flow, 'neutral'),
    verdictMap: flow.options.map((o) => `${o}=${verdictOf(flow, o)}`).join(';'),
    ...ciColumns(flow),
    ci_statement: flow.ci.statement,
  }))
}

/** Export status of one flow: chosen, not applicable (by the first choice it depends on), shown but never settled, or never shown. */
export function flowStatus(flow: FlowDef, events: Record<string, unknown>[]): FlowStatus {
  if (settledEvent(events, flow.id)) return 'chosen'
  if (flow.dependsOn) {
    const parent = settledEvent(events, flow.dependsOn.flowId)
    const parentValue = parent?.value
    const applies =
      parent !== undefined &&
      (flow.dependsOn.equals !== undefined ? parentValue === flow.dependsOn.equals : parentValue !== flow.dependsOn.notEquals)
    if (!applies) return 'not_applicable'
  }
  return events.some((e) => e.type === 'prompt_shown' && e.flowId === flow.id) ? 'shown_not_settled' : 'not_shown'
}

function flowRows(code: string, data: Record<string, unknown>, events: Record<string, unknown>[]): Row[] {
  const finalFlows = (get(data, 'appState.flows') ?? {}) as Record<string, string | null>
  return FLOWS.map((flow) => {
    const settled = settledEvent(events, flow.id)
    const settledIndex = settled ? events.indexOf(settled) : events.length
    const promptDecisions = events.filter(
      (e, i) => e.type === 'decision' && e.flowId === flow.id && e.source === 'prompt' && i <= settledIndex,
    )
    const shown = events.find((e) => e.type === 'prompt_shown' && e.flowId === flow.id)
    // Friction varies by decision screen within each person: look up this flow's screen.
    const pattern = typeof data.pattern === 'string' ? data.pattern : null
    const friction = pattern === null ? null : frictionOf(flow, parsePattern(pattern))
    return {
      studyCode: code,
      flowId: flow.id,
      unit: flow.unit,
      friction,
      consentForm: friction ? consentForm(flow, friction) : null,
      ...ciColumns(flow),
      expectedTask: flow.task,
      taskId: (settled?.taskId as number) ?? null,
      status: flowStatus(flow, events),
      firstChoice: (settled?.value as string) ?? null,
      finalValue: finalFlows[flow.id] ?? null,
      privacyOption: flow.privacyOption,
      firstChoiceIsPrivacy: settled ? settled.value === flow.privacyOption : null,
      // The pipeline's verdicts, comparable with S(f) and the agent's verdicts.
      firstVerdict: verdictOf(flow, (settled?.value as string) ?? null),
      finalVerdict: verdictOf(flow, finalFlows[flow.id] ?? null),
      defaultShown: (shown?.defaultShown as string) ?? null,
      changedFromDefault: (settled?.changedFromDefault as boolean) ?? null,
      msSincePrompt: (settled?.msSincePrompt as number) ?? null,
      toggleCount: promptDecisions.length,
      // Changed after the first choice was fixed: on the Rewards card (Change) or the Account page.
      changedLater: settled ? events.some((e, i) => i > settledIndex && e.type === 'decision' && e.flowId === flow.id) : false,
      changedOnAccountPage: events.some((e) => e.type === 'decision' && e.flowId === flow.id && e.source === 'account_page'),
    }
  })
}

function participantRow(code: string, collection: string, data: Record<string, unknown>, events: Record<string, unknown>[]): Row {
  const row: Row = {
    studyCode: code,
    pilot: collection.startsWith('pilot_'),
    recruitment: scalar(data.recruitment ?? 'prolific'),
    appVersion: scalar(data.appVersion),
    consentVersion: scalar(data.consentVersion),
    consentDeclined: scalar(data.consentDeclined),
    pattern: scalar(data.pattern),
    nudgedUnits: typeof data.pattern === 'string' ? parsePattern(data.pattern).join(';') : null,
    taskOrder: Array.isArray(data.taskOrder) ? data.taskOrder.join('-') : null,
    stage: scalar(data.stage),
    completed: data.stage === 'done',
    os: scalar(get(data, 'device.os')),
    screenW: scalar(get(data, 'device.screenW')),
    screenH: scalar(get(data, 'device.screenH')),
    passedDeviceCheck: scalar(get(data, 'device.passedCheck')),
    automated: scalar(get(data, 'device.automated')),
    deviceCheckSkipped: scalar(get(data, 'device.checkSkipped') ?? false),
    userAgent: scalar(get(data, 'device.userAgent')),
    tzOffset: scalar(data.tzOffset),
    localStartHour: scalar(data.localStartHour),
    resumeCount: scalar(data.resumeCount),
    createdAt: toIso(data.createdAt),
    consentAt: toIso(data.consentAt),
    completedAt: toIso(data.completedAt),
    minutesToComplete: null,
  }
  const start = toMs(data.consentAt)
  const end = toMs(data.completedAt)
  if (start !== null && end !== null) row.minutesToComplete = Math.round((end - start) / 600) / 100

  for (let t = 1; t <= 6; t++) row[`ease_t${t}`] = scalar(get(data, `ease.t${t}`))
  const sus = Array.isArray(data.sus) ? (data.sus as number[]) : []
  for (let i = 0; i < 10; i++) row[`sus_${i + 1}`] = sus[i] ?? null
  row.susScore = susScore(data.sus)
  row.suspicion = scalar(data.suspicion)
  for (let q = 1; q <= 7; q++) row[`settings_q${q}`] = scalar(get(data, `settingsCheck.q${q}`))

  const outcomes = (data.taskOutcome ?? {}) as Record<string, Record<string, unknown>>
  for (let t = 1; t <= 6; t++) {
    for (const [key, value] of Object.entries(outcomes[`t${t}`] ?? { done: null })) row[`t${t}_${key}`] = scalar(value)
  }

  const points = get(data, 'appState.points')
  row.finalPoints = scalar(points)
  row.bonusUSD = typeof points === 'number' ? Math.round(points / 10) / 100 : null
  row.deliveryRedeemed = scalar(get(data, 'appState.deliveryRedeemed'))
  row.accountPageVisits = scalar(get(data, 'appState.accountPageVisits'))
  row.accountPageMs = scalar(get(data, 'appState.accountPageMs'))
  row.taskCardReopens = events.filter((e) => e.type === 'task' && e.event === 'reopen').length
  const action = (name: string) => events.filter((e) => e.type === 'action' && e.name === name)
  row.mapShown = (action('map_shown')[0]?.kind as string) ?? null
  row.mapMoves = action('map_moved').length
  row.mapRecenters = action('map_recentered').length
  row.timesHidden = events.filter((e) => e.type === 'visibility' && e.state === 'hidden').length
  row.errors = events.filter((e) => e.type === 'error').length
  row.eventCount = events.length
  return row
}

function eventRow(code: string, event: Record<string, unknown>): Row {
  const row: Row = { studyCode: code }
  for (const [key, value] of Object.entries(event)) row[key] = key === 't' ? toIso(value) : scalar(value)
  return row
}

/**
 * Order in which events happened on the phone: page load, then event number. Both come from
 * the phone, so queued offline writes and reloads can't scramble them. Events without them
 * fall back to server time, then ms since page load.
 */
export function compareEvents(a: Record<string, unknown>, b: Record<string, unknown>): number {
  if (typeof a.pageLoadAt === 'number' && typeof b.pageLoadAt === 'number' && typeof a.seq === 'number' && typeof b.seq === 'number') {
    return a.pageLoadAt - b.pageLoadAt || a.seq - b.seq
  }
  return (toMs(a.t) ?? 0) - (toMs(b.t) ?? 0) || (Number(a.clientT) || 0) - (Number(b.clientT) || 0)
}

/** Builds all export tables. Withdrawn participants are left out entirely. */
export function buildExport(collection: string, raw: RawParticipant[]): ExportResult {
  const kept = raw
    .filter((p) => p.data.withdrawn !== true)
    .sort((a, b) => (toMs(a.data.createdAt) ?? 0) - (toMs(b.data.createdAt) ?? 0) || a.uid.localeCompare(b.uid))

  const result: ExportResult = { participants: [], events: [], flows: [], idMap: [] }
  kept.forEach((p, i) => {
    const code = `${collection.startsWith('pilot_') ? 'PL' : 'P'}${String(i + 1).padStart(3, '0')}`
    const events = [...p.events].sort(compareEvents)
    result.idMap.push({ studyCode: code, prolificPid: scalar(p.data.prolificPid), uid: p.uid })
    result.participants.push(participantRow(code, collection, p.data, events))
    result.events.push(...events.map((e) => eventRow(code, e)))
    if (typeof p.data.pattern === 'string') result.flows.push(...flowRows(code, p.data, events))
  })
  return result
}

/** CSV with every column that appears in any row. Guards against spreadsheet formula injection. */
export function toCsv(rows: Row[]): string {
  const columns: string[] = []
  for (const row of rows) for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key)
  const cell = (value: Row[string] | undefined): string => {
    if (value === null || value === undefined) return ''
    let text = String(value)
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [columns.join(','), ...rows.map((row) => columns.map((c) => cell(row[c])).join(','))].join('\n') + '\n'
}
