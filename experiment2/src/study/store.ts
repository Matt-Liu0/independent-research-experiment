import type { EventSink, StudyEvent } from '../log/logEvent'
import type { AppOrder, TaskNumber } from './apps'
import { buildTaskOrder, cellKey, pickAssignment, type CellCounts } from './randomize'
import type { ParticipantDoc, EntryParams, StartResult, TimestampField } from './types'
import { newParticipant } from './types'

/** Everything the study shell needs from storage. Firestore in the study; memory in tests and demo mode. */
export interface StudyStore {
  /** Sign in, then load this browser's record or create a new one. */
  start(params: EntryParams): Promise<StartResult>
  /** Merge fields into the participant record. Fire-and-forget: writes queue while offline. */
  update(fields: Partial<ParticipantDoc>, stamp?: TimestampField[]): void
  /** Balanced assignment of the nudged-screen pattern, app order and task order (once per participant). */
  assign(): Promise<Assignment>
  sink: EventSink
  /** Resolves once every queued write has reached the server. */
  flush(): Promise<void>
}

export interface Assignment {
  pattern: string
  appOrder: AppOrder
  taskOrder: TaskNumber[]
}

/** Keeps everything in memory. Used by tests and by ?demo= links, which save nothing. */
export class MemoryStore implements StudyStore {
  participant: ParticipantDoc | null = null
  events: StudyEvent[] = []
  counts: CellCounts = {}
  takenPids = new Set<string>()
  /** Demo links can fix the pattern and app order instead of balancing. */
  readonly forcedPattern: string | null
  readonly forcedAppOrder: AppOrder | null
  readonly sink: EventSink = { write: (e) => this.events.push(e) }

  private preset: ParticipantDoc | null

  /**
   * existing: a record from an earlier visit (start() resumes it).
   * preset: a fresh record to start with (agent episodes arrive already assigned).
   */
  constructor(
    options: { pattern?: string; appOrder?: AppOrder; existing?: ParticipantDoc; preset?: ParticipantDoc } = {},
  ) {
    this.forcedPattern = options.pattern ?? null
    this.forcedAppOrder = options.appOrder ?? null
    this.participant = options.existing ?? null
    this.preset = options.preset ?? null
  }

  async start(params: EntryParams): Promise<StartResult> {
    if (this.preset && !this.participant) {
      this.participant = { ...this.preset, createdAt: Date.now() }
      this.preset = null
      return { kind: 'new', participant: this.participant }
    }
    if (this.participant) {
      if (this.participant.participantCode !== params.participantCode) return { kind: 'pid_mismatch' }
      this.participant = { ...this.participant, resumeCount: this.participant.resumeCount + 1 }
      return { kind: 'resumed', participant: this.participant }
    }
    if (this.takenPids.has(params.participantCode)) return { kind: 'taken' }
    this.takenPids.add(params.participantCode)
    this.participant = { ...newParticipant(params), createdAt: Date.now() }
    return { kind: 'new', participant: this.participant }
  }

  update(fields: Partial<ParticipantDoc>, stamp: TimestampField[] = []): void {
    if (!this.participant) throw new Error('update before start')
    const stamps = Object.fromEntries(stamp.map((f) => [f, Date.now()]))
    this.participant = { ...this.participant, ...fields, ...stamps }
  }

  async assign(): Promise<Assignment> {
    const p = this.participant
    if (!p) throw new Error('assign before start')
    if (p.pattern !== null && p.appOrder && p.taskOrder) return { pattern: p.pattern, appOrder: p.appOrder, taskOrder: p.taskOrder }
    const picked = pickAssignment(this.counts)
    const pattern = this.forcedPattern ?? picked.pattern
    const appOrder = this.forcedAppOrder ?? picked.appOrder
    const key = cellKey(pattern, appOrder)
    this.counts[key] = (this.counts[key] ?? 0) + 1
    const taskOrder = buildTaskOrder(appOrder)
    this.update({ pattern, appOrder, taskOrder })
    return { pattern, appOrder, taskOrder }
  }

  async flush(): Promise<void> {}
}
