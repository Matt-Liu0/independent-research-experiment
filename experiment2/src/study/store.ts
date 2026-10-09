import type { TaskNumber } from '../bramble/types'
import type { EventSink, StudyEvent } from '../log/logEvent'
import { pickPattern, shuffleTasks, type PatternCounts } from './randomize'
import type { ParticipantDoc, ProlificParams, StartResult, TimestampField } from './types'
import { newParticipant } from './types'

/** Everything the study shell needs from storage. Firestore in the study; memory in tests and demo mode. */
export interface StudyStore {
  /** Sign in, then load this browser's record or create a new one. */
  start(params: ProlificParams): Promise<StartResult>
  /** Merge fields into the participant record. Fire-and-forget: writes queue while offline. */
  update(fields: Partial<ParticipantDoc>, stamp?: TimestampField[]): void
  /** Balanced assignment of the nudged-screen pattern and task order (once per participant). */
  assign(): Promise<{ pattern: string; taskOrder: TaskNumber[] }>
  sink: EventSink
  /** Resolves once every queued write has reached the server. */
  flush(): Promise<void>
}

/** Keeps everything in memory. Used by tests and by ?demo= links, which save nothing. */
export class MemoryStore implements StudyStore {
  participant: ParticipantDoc | null = null
  events: StudyEvent[] = []
  counts: PatternCounts = {}
  takenPids = new Set<string>()
  /** Demo links fix the pattern instead of balancing. */
  readonly forcedPattern: string | null
  readonly sink: EventSink = { write: (e) => this.events.push(e) }

  private preset: ParticipantDoc | null

  /**
   * existing: a record from an earlier visit (start() resumes it).
   * preset: a fresh record to start with (agent episodes arrive already assigned).
   */
  constructor(options: { pattern?: string; existing?: ParticipantDoc; preset?: ParticipantDoc } = {}) {
    this.forcedPattern = options.pattern ?? null
    this.participant = options.existing ?? null
    this.preset = options.preset ?? null
  }

  async start(params: ProlificParams): Promise<StartResult> {
    if (this.preset && !this.participant) {
      this.participant = { ...this.preset, createdAt: Date.now() }
      this.preset = null
      return { kind: 'new', participant: this.participant }
    }
    if (this.participant) {
      if (this.participant.prolificPid !== params.prolificPid) return { kind: 'pid_mismatch' }
      this.participant = { ...this.participant, resumeCount: this.participant.resumeCount + 1 }
      return { kind: 'resumed', participant: this.participant }
    }
    if (this.takenPids.has(params.prolificPid)) return { kind: 'taken' }
    this.takenPids.add(params.prolificPid)
    this.participant = { ...newParticipant(params), createdAt: Date.now() }
    return { kind: 'new', participant: this.participant }
  }

  update(fields: Partial<ParticipantDoc>, stamp: TimestampField[] = []): void {
    if (!this.participant) throw new Error('update before start')
    const stamps = Object.fromEntries(stamp.map((f) => [f, Date.now()]))
    this.participant = { ...this.participant, ...fields, ...stamps }
  }

  async assign() {
    const p = this.participant
    if (!p) throw new Error('assign before start')
    if (p.pattern !== null && p.taskOrder) return { pattern: p.pattern, taskOrder: p.taskOrder }
    const pattern = this.forcedPattern ?? pickPattern(this.counts)
    this.counts[pattern] = (this.counts[pattern] ?? 0) + 1
    const taskOrder = shuffleTasks()
    this.update({ pattern, taskOrder })
    return { pattern, taskOrder }
  }

  async flush(): Promise<void> {}
}
