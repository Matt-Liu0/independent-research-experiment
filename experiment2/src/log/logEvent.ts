import { clientT, markHidden, markVisible } from './clock'

export type EventType =
  | 'stage'
  | 'task'
  | 'screen'
  | 'prompt_shown'
  | 'decision'
  | 'settled'
  | 'action'
  | 'points'
  | 'visibility'
  | 'resume'
  | 'error'
  // Part 2 and the norming survey
  | 'item'
  | 'survey'
  | 'chat'

export interface StudyEvent {
  type: EventType
  /** Phone clock (epoch ms) when this page loaded. Goes up with every reload. */
  pageLoadAt: number
  /** Event number within this page load: 1, 2, 3, … Sort by pageLoadAt, then seq. */
  seq: number
  /** Phone clock (epoch ms) when the event happened, even if it reached the server later. */
  clientTime: number
  clientT: number
  taskId: number | null
  /** The practice app the event happened in (bramble or stride), or null outside the apps. */
  app: string | null
  screen: string | null
  [field: string]: unknown
}

/** Where events go: Firestore in the study, an array in tests and demo mode. */
export interface EventSink {
  write(event: StudyEvent): void
}

const pageLoadAt = Date.now()
let seq = 0

const context: { taskId: number | null; app: string | null; screen: string | null } = { taskId: null, app: null, screen: null }
let sink: EventSink = { write: () => {} }

export function setEventSink(next: EventSink): void {
  sink = next
}

/** The current task, app and screen are added to every event. */
export function setLogContext(next: Partial<typeof context>): void {
  Object.assign(context, next)
}

export function getLogContext(): Readonly<typeof context> {
  return context
}

export function logEvent(type: EventType, fields: Record<string, unknown> = {}): StudyEvent {
  seq += 1
  const event: StudyEvent = {
    type,
    pageLoadAt,
    seq,
    clientTime: Date.now(),
    clientT: clientT(),
    taskId: context.taskId,
    app: context.app,
    screen: context.screen,
  }
  // Firestore rejects undefined values, so drop them.
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) event[key] = value
  }
  try {
    sink.write(event)
  } catch (err) {
    console.error('logEvent failed', err)
  }
  return event
}

/** Records app switches and screen locks, and keeps the visible-time clock in step. */
export function installVisibilityLogging(doc: Document = document): () => void {
  const onChange = () => {
    if (doc.visibilityState === 'hidden') markHidden()
    else markVisible()
    logEvent('visibility', { state: doc.visibilityState })
  }
  doc.addEventListener('visibilitychange', onChange)
  return () => doc.removeEventListener('visibilitychange', onChange)
}

export function createMemorySink(): EventSink & { events: StudyEvent[] } {
  const events: StudyEvent[] = []
  return { events, write: (e) => events.push(e) }
}
