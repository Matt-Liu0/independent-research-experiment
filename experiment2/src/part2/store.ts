import { onAuthStateChanged, signInAnonymously, type Auth, type User } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc, waitForPendingWrites, type Firestore } from 'firebase/firestore'
import type { EventSink, StudyEvent } from '../log/logEvent'
import type { ProlificParams } from '../study/types'
import { newPart2Doc, type Part2Doc, type Part2StartResult, type Part2TimestampField } from './types'

/** Storage for Part 2. Firestore in the study; memory in tests and demo links. */
export interface Part2Store {
  start(params: ProlificParams): Promise<Part2StartResult>
  update(fields: Partial<Part2Doc>, stamp?: Part2TimestampField[]): void
  sink: EventSink
  flush(): Promise<void>
}

/** Collections: part2, its one-per-Prolific-ID claims, and pilot_ copies. */
export function part2Collections(pilot: boolean) {
  const name = `${pilot ? 'pilot_' : ''}part2`
  return { records: name, pids: `${name}_pids` }
}

export class MemoryPart2Store implements Part2Store {
  doc: Part2Doc | null = null
  events: StudyEvent[] = []
  readonly sink: EventSink = { write: (e) => this.events.push(e) }

  constructor(existing?: Part2Doc) {
    this.doc = existing ?? null
  }

  async start(params: ProlificParams): Promise<Part2StartResult> {
    if (this.doc) {
      if (this.doc.prolificPid !== params.prolificPid) return { kind: 'pid_mismatch' }
      this.doc = { ...this.doc, resumeCount: this.doc.resumeCount + 1 }
      return { kind: 'resumed', doc: this.doc }
    }
    this.doc = { ...newPart2Doc(params), createdAt: Date.now() }
    return { kind: 'new', doc: this.doc }
  }

  update(fields: Partial<Part2Doc>, stamp: Part2TimestampField[] = []): void {
    if (!this.doc) throw new Error('update before start')
    const stamps = Object.fromEntries(stamp.map((f) => [f, Date.now()]))
    this.doc = { ...this.doc, ...fields, ...stamps }
  }

  async flush(): Promise<void> {}
}

function currentUser(auth: Auth): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

const isPermissionDenied = (err: unknown) => (err as { code?: string } | null)?.code === 'permission-denied'

/** Same pattern as Part 1's FirestoreStore: anonymous sign-in, one record per Prolific ID, events in a subcollection. */
export class FirestorePart2Store implements Part2Store {
  private uid: string | null = null
  private pending: StudyEvent[] = []
  readonly sink: EventSink
  private readonly db: Firestore
  private readonly auth: Auth
  private readonly names: { records: string; pids: string }

  constructor(db: Firestore, auth: Auth, pilot: boolean) {
    this.db = db
    this.auth = auth
    this.names = part2Collections(pilot)
    this.sink = { write: (event) => this.writeEvent(event) }
  }

  private ref() {
    if (!this.uid) throw new Error('Not started')
    return doc(this.db, this.names.records, this.uid)
  }

  async start(params: ProlificParams): Promise<Part2StartResult> {
    const user = (await currentUser(this.auth)) ?? (await signInAnonymously(this.auth)).user
    this.uid = user.uid
    const existing = await getDoc(this.ref())
    if (existing.exists()) {
      const record = existing.data() as Part2Doc
      if (record.prolificPid !== params.prolificPid) return { kind: 'pid_mismatch' }
      this.flushPending()
      this.update({ resumeCount: increment(1) as unknown as number })
      return { kind: 'resumed', doc: { ...record, resumeCount: record.resumeCount + 1 } }
    }
    const pidRef = doc(this.db, this.names.pids, params.prolificPid)
    try {
      await setDoc(pidRef, { uid: user.uid, createdAt: serverTimestamp() })
    } catch (err) {
      if (!isPermissionDenied(err)) throw err
      try {
        const claim = await getDoc(pidRef)
        if (claim.data()?.uid !== user.uid) return { kind: 'taken' }
      } catch (readErr) {
        if (isPermissionDenied(readErr)) return { kind: 'taken' }
        throw readErr
      }
    }
    const record = newPart2Doc(params)
    await setDoc(this.ref(), { ...record, createdAt: serverTimestamp() })
    this.flushPending()
    return { kind: 'new', doc: record }
  }

  update(fields: Partial<Part2Doc>, stamp: Part2TimestampField[] = []): void {
    const data: Record<string, unknown> = { ...fields }
    for (const field of stamp) data[field] = serverTimestamp()
    setDoc(this.ref(), data, { merge: true }).catch((err) => console.error('update failed', err))
  }

  private writeEvent(event: StudyEvent): void {
    if (!this.uid) {
      this.pending.push(event)
      return
    }
    addDoc(collection(this.db, this.names.records, this.uid, 'events'), { ...event, t: serverTimestamp() }).catch((err) =>
      console.error('event write failed', err),
    )
  }

  private flushPending(): void {
    const queued = this.pending
    this.pending = []
    for (const event of queued) this.writeEvent(event)
  }

  async flush(): Promise<void> {
    await waitForPendingWrites(this.db)
  }
}
